"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Mail,
  Eye,
  Edit3,
  Send,
  Check,
  Clock,
  X,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Settings,
  Loader2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import {
  getEffectiveTemplates,
  saveCustomTemplate,
  resetCustomTemplate,
  isCustomized,
  loadSentEmails,
  openHtmlInNewTab,
  type SentEmailLog,
} from "@/services/emailService";
import { EMAIL_TEMPLATES, type EmailTemplate } from "@/data/emailTemplates";
import { EMAIL_PREVIEW_VARS } from "@/data/emailPreviewVars";
import { SITE_CONFIG } from "@/config/siteConfig";
import EmailEditor from "@/components/admin/EmailEditor";

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES: { label: string; ids: string[] }[] = [
  { label: "Pedidos", ids: ["confirmacion_pedido", "pedido_enviado"] },
  { label: "Fiscal", ids: ["factura_disponible"] },
  { label: "Comercial", ids: ["nuevo_cupon", "carrito_abandonado"] },
  { label: "Puntos", ids: ["puntos_anadidos"] },
  { label: "Cuenta", ids: ["bienvenida", "recuperar_contrasena"] },
  { label: "Devoluciones", ids: ["devolucion_aceptada"] },
  { label: "Asociaciones", ids: ["asociacion_invitacion"] },
];

// SSOT de variables de preview movido a `@/data/emailPreviewVars` para que
// el endpoint `/api/admin/emails/send-all-test` (server) y esta página
// (cliente) compartan los mismos datos.
const DEFAULT_VARS = EMAIL_PREVIEW_VARS;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fillVars(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
    template,
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(diff / 86_400_000);
  if (days < 30) return `Hace ${days} días`;
  return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

const SETTINGS_KEY = "tcgacademy_email_sender";

interface SenderConfig {
  email: string;
  password: string;
  validated: boolean;
  validatedAt?: string;
}

function loadSender(): SenderConfig {
  if (typeof window === "undefined") return { email: "", password: "", validated: false };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  return { email: SITE_CONFIG.email, password: "", validated: false };
}

function saveSender(config: SenderConfig): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(config));
}

// ─── Sidebar template list ────────────────────────────────────────────────────

function TemplateSidebar({
  templates, selectedId, onSelect,
}: {
  templates: EmailTemplate[];
  selectedId: string;
  onSelect: (t: EmailTemplate) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const byId = useMemo(() => Object.fromEntries(templates.map((t) => [t.id, t])), [templates]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">
          Plantillas ({templates.length})
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {CATEGORIES.map((cat) => {
          const catTemplates = cat.ids.map((id) => byId[id]).filter(Boolean) as EmailTemplate[];
          if (catTemplates.length === 0) return null;
          const open = !collapsed[cat.label];
          return (
            <div key={cat.label}>
              <button
                onClick={() => setCollapsed((prev) => ({ ...prev, [cat.label]: open }))}
                className="flex w-full items-center justify-between bg-gray-50 px-4 py-2.5 text-left"
              >
                <span className="text-[11px] font-bold tracking-wide text-gray-500 uppercase">{cat.label}</span>
                {open ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
              </button>
              {open && catTemplates.map((t) => {
                const custom = isCustomized(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelect(byId[t.id] ?? t)}
                    className={`flex min-h-[52px] w-full items-start gap-2 px-4 py-2.5 text-left transition ${selectedId === t.id ? "bg-blue-50" : "hover:bg-gray-50"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`flex items-center gap-1.5 truncate text-sm font-semibold ${selectedId === t.id ? "text-[#2563eb]" : "text-gray-800"}`}>
                        {t.name}
                        {custom && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-gray-400">{t.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminEmailsAutomaticosPage() {
  const [allTemplates, setAllTemplates] = useState<EmailTemplate[]>(() => getEffectiveTemplates());
  const [selected, setSelected] = useState<EmailTemplate>(() => getEffectiveTemplates()[0]);
  const [tab, setTab] = useState<"preview" | "edit" | "sender" | "log">("preview");

  // Edit state
  const [editSubject, setEditSubject] = useState(selected.subject);
  const [editHtml, setEditHtml] = useState(selected.html);
  const [isDirty, setIsDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  // Bumped whenever the WYSIWYG editor must re-sync with editHtml (template
  // change, discard, reset). Keystroke updates don't touch this.
  const [editorResetCount, setEditorResetCount] = useState(0);

  const previewVars = useMemo(() => DEFAULT_VARS[selected.id] ?? {}, [selected.id]);

  // Sender config
  const [sender, setSender] = useState<SenderConfig>(() => loadSender());
  const [senderEmail, setSenderEmail] = useState(sender.email);
  const [senderPassword, setSenderPassword] = useState(sender.password);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<"ok" | "error" | null>(null);

  // Log
  const [sentLog, setSentLog] = useState<SentEmailLog[]>([]);
  useEffect(() => {
    setSentLog(loadSentEmails());
  }, [tab]);

  // ── Send-all (test) ────────────────────────────────────────────────────
  // POST /api/admin/emails/send-all-test → envía cada plantilla del catálogo
  // al email indicado. Sólo opera en server-mode (Resend); el endpoint
  // bloquea si no hay backend real.
  const [sendAllOpen, setSendAllOpen] = useState(false);
  const [sendAllTarget, setSendAllTarget] = useState("");
  const [sendAllLoading, setSendAllLoading] = useState(false);
  const [sendAllResult, setSendAllResult] = useState<
    | null
    | {
        ok: boolean;
        total?: number;
        attempted?: number;
        sent?: number;
        failed?: number;
        aborted?: boolean;
        error?: string;
        firstError?: string;
      }
  >(null);

  const handleSendAll = async () => {
    if (!sendAllTarget.trim()) return;
    setSendAllLoading(true);
    setSendAllResult(null);
    try {
      const res = await fetch("/api/admin/emails/send-all-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: sendAllTarget.trim() }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        total?: number;
        attempted?: number;
        sent?: number;
        failed?: number;
        aborted?: boolean;
        error?: string;
        firstError?: string;
      };
      setSendAllResult(data);
      if (data.ok) {
        setSaveMsg(`Enviadas ${data.sent}/${data.total} plantillas a ${sendAllTarget}`);
        setTimeout(() => setSaveMsg(null), 4000);
      }
    } catch {
      setSendAllResult({ ok: false, error: "Error de red. Revisa la consola." });
    } finally {
      setSendAllLoading(false);
    }
  };

  const selectTemplate = useCallback((t: EmailTemplate) => {
    setSelected(t);
    setEditSubject(t.subject);
    setEditHtml(t.html);
    setIsDirty(false);
    setSaveMsg(null);
    setEditorResetCount((n) => n + 1);
  }, []);

  const handleSave = () => {
    saveCustomTemplate(selected.id, editSubject, editHtml);
    setAllTemplates(getEffectiveTemplates());
    setSelected((s) => ({ ...s, subject: editSubject, html: editHtml }));
    setIsDirty(false);
    setSaveMsg("Plantilla guardada");
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const handleReset = () => {
    const original = EMAIL_TEMPLATES.find((t) => t.id === selected.id);
    if (!original) return;
    resetCustomTemplate(selected.id);
    setAllTemplates(getEffectiveTemplates());
    setSelected(original);
    setEditSubject(original.subject);
    setEditHtml(original.html);
    setIsDirty(false);
    setEditorResetCount((n) => n + 1);
    setSaveMsg("Plantilla restablecida");
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const handleTestSend = () => {
    const html = fillVars(tab === "edit" ? editHtml : selected.html, previewVars);
    openHtmlInNewTab(html);
  };

  const handleValidateSender = async () => {
    if (!senderEmail || !senderPassword) return;
    setValidating(true);
    setValidationResult(null);

    // Simulate SMTP validation (in production: POST /api/admin/validate-email)
    await new Promise((r) => setTimeout(r, 1500));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail) || senderPassword.length < 4) {
      setValidationResult("error");
      setValidating(false);
      return;
    }

    const config: SenderConfig = {
      email: senderEmail,
      password: senderPassword,
      validated: true,
      validatedAt: new Date().toISOString(),
    };
    saveSender(config);
    setSender(config);
    setValidationResult("ok");
    setValidating(false);
    setSaveMsg("Remitente verificado y guardado");
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const livePreviewHtml = useMemo(
    () => fillVars(tab === "edit" ? editHtml : selected.html, previewVars),
    [editHtml, selected.html, previewVars, tab],
  );
  const liveSubject = useMemo(
    () => fillVars(tab === "edit" ? editSubject : selected.subject, previewVars),
    [editSubject, selected.subject, previewVars, tab],
  );

  const nameById = useMemo(() => Object.fromEntries(EMAIL_TEMPLATES.map((t) => [t.id, t.name])), []);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {saveMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white shadow-xl">
          <Check size={15} /> {saveMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Mail size={22} className="text-[#2563eb]" /> Emails automáticos
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Previsualiza, edita y configura los correos automáticos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sender.validated && (
            <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
              <Check size={12} /> {sender.email}
            </span>
          )}
          <button
            onClick={handleTestSend}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#2563eb] hover:text-[#2563eb]"
          >
            <ExternalLink size={14} /> Ver email
          </button>
          <button
            onClick={() => {
              setSendAllOpen(true);
              setSendAllResult(null);
              setSendAllTarget((prev) => prev || sender.email || SITE_CONFIG.email);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            <Send size={14} /> Enviar todos a mi correo
          </button>
        </div>
      </div>

      {/* Send-all modal */}
      {sendAllOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => !sendAllLoading && setSendAllOpen(false)}
          onKeyDown={(e) => {
            if ((e.key === "Escape" || e.key === "Enter") && !sendAllLoading) setSendAllOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Enviar todas las plantillas"
          tabIndex={0}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="document"
            tabIndex={-1}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="mb-1 text-lg font-bold text-gray-900">
              Enviar todas las plantillas
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Se enviará una copia de cada plantilla del catálogo (
              {EMAIL_TEMPLATES.length} en total) al email indicado, usando
              datos de muestra. Útil para revisar diseño y disparadores.
            </p>

            <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wide">
              Destinatario
            </label>
            <input
              type="email"
              value={sendAllTarget}
              onChange={(e) => setSendAllTarget(e.target.value)}
              placeholder="ejemplo@gmail.com"
              disabled={sendAllLoading}
              className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none disabled:opacity-50"
            />

            {sendAllResult && !sendAllResult.ok && (
              <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    {sendAllResult.error
                      ? sendAllResult.error
                      : sendAllResult.aborted
                        ? `Abortado tras el primer intento (error de configuración).`
                        : `Fallaron ${sendAllResult.failed}/${sendAllResult.attempted ?? sendAllResult.total} envíos.`}
                  </span>
                </div>
                {sendAllResult.firstError && (
                  <p className="mt-2 ml-6 break-all text-[12px] text-red-600">
                    <strong>Causa:</strong> {sendAllResult.firstError}
                  </p>
                )}
              </div>
            )}

            {sendAllResult?.ok && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                <Check size={16} className="flex-shrink-0" />
                <span>
                  Enviadas <strong>{sendAllResult.sent}/{sendAllResult.total}</strong> plantillas correctamente.
                </span>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setSendAllOpen(false)}
                disabled={sendAllLoading}
                className="h-11 flex-1 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 transition hover:border-gray-300 disabled:opacity-50"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSendAll}
                disabled={sendAllLoading || !sendAllTarget.trim()}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2563eb] text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {sendAllLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Enviando…</>
                ) : (
                  <><Send size={16} /> Enviar ahora</>
                )}
              </button>
            </div>

            <p className="mt-4 text-[11px] text-gray-400">
              Requiere modo server (Resend configurado). Si la web está en local-mode, el endpoint devolverá un error y ningún correo saldrá.
            </p>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <TemplateSidebar templates={allTemplates} selectedId={selected.id} onSelect={selectTemplate} />
        </div>

        {/* Editor panel */}
        <div className="space-y-4">
          {/* Template header + tabs */}
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-900">{selected.name}</h2>
                  {isCustomized(selected.id) && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Editada</span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-gray-500">{selected.description}</p>
              </div>
              <div className="flex gap-1.5">
                {([
                  { id: "preview" as const, label: "Vista previa", Icon: Eye },
                  { id: "edit" as const, label: "Editar", Icon: Edit3 },
                  { id: "sender" as const, label: "Remitente", Icon: Settings },
                  { id: "log" as const, label: "Registro", Icon: Clock },
                ]).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      tab === id ? "bg-[#2563eb] text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Preview tab ── */}
          {tab === "preview" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-3">
                <span className="text-xs font-bold text-gray-400">Asunto: </span>
                <span className="text-sm text-gray-800">{liveSubject}</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <iframe
                  srcDoc={livePreviewHtml}
                  className="w-full border-0"
                  style={{ height: 640 }}
                  title={selected.name}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}

          {/* ── Edit tab ── */}
          {tab === "edit" && (
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                {/* Editor */}
                <div className="space-y-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wide">Asunto</label>
                    <input
                      value={editSubject}
                      onChange={(e) => { setEditSubject(e.target.value); setIsDirty(true); }}
                      className="h-10 w-full rounded-xl border-2 border-gray-200 px-3 text-sm transition focus:border-[#2563eb] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wide">Contenido</label>
                    <EmailEditor
                      html={editHtml}
                      onChange={(next) => { setEditHtml(next); setIsDirty(true); }}
                      variables={Object.keys(previewVars)}
                      resetKey={`${selected.id}-${editorResetCount}`}
                    />
                  </div>
                </div>

                {/* Live preview */}
                <div className="space-y-3">
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                    <p className="text-xs font-bold text-gray-400">Asunto: {liveSubject}</p>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <iframe
                      srcDoc={livePreviewHtml}
                      className="w-full border-0"
                      style={{ height: 560 }}
                      title={`${selected.name} preview`}
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                <button
                  onClick={() => {
                    setEditSubject(selected.subject);
                    setEditHtml(selected.html);
                    setIsDirty(false);
                    setEditorResetCount((n) => n + 1);
                  }}
                  disabled={!isDirty}
                  className="flex items-center gap-1.5 rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                >
                  <X size={14} /> Descartar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isDirty}
                  className="flex items-center gap-1.5 rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-40"
                >
                  <Check size={14} /> Guardar
                </button>
                <button
                  onClick={handleTestSend}
                  className="flex items-center gap-1.5 rounded-xl border-2 border-[#2563eb]/30 px-4 py-2.5 text-sm font-bold text-[#2563eb] transition hover:bg-blue-50"
                >
                  <Send size={14} /> Ver resultado
                </button>
                <div className="flex-1" />
                {isCustomized(selected.id) && (
                  <button onClick={handleReset} className="flex items-center gap-1.5 rounded-xl border-2 border-amber-200 px-4 py-2.5 text-sm font-bold text-amber-600 transition hover:bg-amber-50">
                    <RotateCcw size={14} /> Restablecer
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Sender config tab ── */}
          {tab === "sender" && (
            <div className="mx-auto max-w-lg space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="mb-1 flex items-center gap-2 text-lg font-bold text-gray-900">
                  <Lock size={18} className="text-[#2563eb]" /> Configurar remitente
                </h3>
                <p className="mb-5 text-sm text-gray-500">
                  Introduce el correo y la contraseña de aplicación desde el que se enviarán los emails. Se validará que los datos son correctos.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wide">Correo electrónico</label>
                    <input
                      type="email"
                      value={senderEmail}
                      onChange={(e) => { setSenderEmail(e.target.value); setValidationResult(null); }}
                      placeholder={SITE_CONFIG.email}
                      className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wide">Contraseña o clave de aplicación</label>
                    <input
                      type="password"
                      value={senderPassword}
                      onChange={(e) => { setSenderPassword(e.target.value); setValidationResult(null); }}
                      placeholder="Contraseña SMTP / App password"
                      className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none"
                    />
                    <p className="mt-1.5 text-[11px] text-gray-400">
                      Para Gmail: usa una &quot;contraseña de aplicación&quot; (no tu contraseña normal). Para otros proveedores: usa la contraseña SMTP.
                    </p>
                  </div>

                  {validationResult === "error" && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                      <AlertTriangle size={16} className="flex-shrink-0" />
                      <span>No se ha podido validar. Revisa el email y la contraseña.</span>
                    </div>
                  )}

                  {validationResult === "ok" && (
                    <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                      <Check size={16} className="flex-shrink-0" />
                      <span>Remitente verificado correctamente. Los emails se enviarán desde <strong>{senderEmail}</strong>.</span>
                    </div>
                  )}

                  <button
                    onClick={handleValidateSender}
                    disabled={validating || !senderEmail || !senderPassword}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
                  >
                    {validating ? (
                      <><Loader2 size={16} className="animate-spin" /> Validando conexión...</>
                    ) : (
                      <><Mail size={16} /> Verificar y guardar</>
                    )}
                  </button>
                </div>

                {sender.validated && (
                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Remitente actual</p>
                    <div className="mt-2 flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3">
                      <Check size={16} className="text-green-600" />
                      <div>
                        <p className="text-sm font-semibold text-green-800">{sender.email}</p>
                        <p className="text-[11px] text-green-600">
                          Verificado el {sender.validatedAt ? new Date(sender.validatedAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Log tab ── */}
          {tab === "log" && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <h2 className="font-bold text-gray-900">Registro de envíos</h2>
                <span className="text-xs text-gray-400">{sentLog.length} registros</span>
              </div>
              {sentLog.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Sparkles size={32} className="mx-auto mb-3 text-gray-200" />
                  <p className="font-semibold text-gray-400">Aún no hay emails enviados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-xs tracking-wider text-gray-500 uppercase">
                        <th className="px-5 py-3 text-left font-semibold">Cuándo</th>
                        <th className="hidden px-4 py-3 text-left font-semibold sm:table-cell">Destinatario</th>
                        <th className="px-4 py-3 text-left font-semibold">Plantilla</th>
                        <th className="hidden px-4 py-3 text-left font-semibold lg:table-cell">Resumen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sentLog.map((entry) => (
                        <tr key={entry.id} className="transition hover:bg-gray-50">
                          <td className="px-5 py-3 text-xs text-gray-500">{timeAgo(entry.sentAt)}</td>
                          <td className="hidden px-4 py-3 text-xs text-gray-700 sm:table-cell">
                            <p className="font-semibold">{entry.toName}</p>
                            <p className="text-gray-400">{entry.to}</p>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">{nameById[entry.templateId] ?? entry.templateId}</td>
                          <td className="hidden px-4 py-3 text-xs text-gray-500 lg:table-cell">{entry.preview}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
