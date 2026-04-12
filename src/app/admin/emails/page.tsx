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
  AlertCircle,
  ExternalLink,
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

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES: { label: string; ids: string[] }[] = [
  {
    label: "📦 Pedidos",
    ids: ["confirmacion_pedido", "pedido_enviado", "pedido_entregado"],
  },
  { label: "🧾 Fiscal", ids: ["factura_disponible"] },
  { label: "🎁 Comercial", ids: ["nuevo_cupon", "carrito_abandonado"] },
  { label: "⭐ Puntos", ids: ["puntos_anadidos"] },
  { label: "👤 Cuenta", ids: ["bienvenida", "recuperar_contrasena"] },
  { label: "↩️ Devoluciones", ids: ["devolucion_aceptada"] },
  { label: "🤝 Asociaciones", ids: ["asociacion_invitacion"] },
];

// ─── Default preview variable values ─────────────────────────────────────────

const DEFAULT_VARS: Record<string, Record<string, string>> = {
  bienvenida: {
    nombre: "María García",
    email: "maria@ejemplo.com",
    unsubscribe_link: "#",
  },
  confirmacion_pedido: {
    nombre: "María García",
    order_id: "TCG-20260412-001",
    order_date: "12 de abril de 2026",
    items_html: `<tr><td style="padding:10px 0;font-size:14px">Pokémon EVS Booster Box ×1</td><td align="right" style="font-size:14px;font-weight:700;white-space:nowrap">€89.95</td></tr>`,
    subtotal: "89.95",
    shipping: "0.00",
    total: "89.95",
    address: "Calle Mayor 1, 28013 Madrid",
    payment_method: "Tarjeta bancaria",
    unsubscribe_link: "#",
  },
  pedido_enviado: {
    nombre: "María García",
    order_id: "TCG-20260412-001",
    tracking_number: "ES2026041200001",
    carrier: "Correos Express",
    estimated_date: "14 de abril de 2026",
    tracking_url: "#",
    unsubscribe_link: "#",
  },
  pedido_entregado: {
    nombre: "María García",
    order_id: "TCG-20260412-001",
    points_earned: "90",
    current_balance: "350",
    review_url: "#",
    unsubscribe_link: "#",
  },
  factura_disponible: {
    nombre: "Carlos López",
    invoice_id: "FAC-2026-0042",
    order_id: "TCG-20260412-001",
    invoice_date: "12 de abril de 2026",
    total: "89.95",
    download_url: "#",
    unsubscribe_link: "#",
  },
  nuevo_cupon: {
    nombre: "María García",
    coupon_code: "PRIMAVERA15",
    coupon_description: "Descuento especial de primavera en todos los productos",
    coupon_value: "15%",
    expires_at: "30 de abril de 2026",
    shop_url: "https://tcgacademy.es",
    unsubscribe_link: "#",
  },
  puntos_anadidos: {
    nombre: "María García",
    points: "90",
    reason: "Compra #TCG-20260412-001",
    current_balance: "350",
    redeem_url: "https://tcgacademy.es/cuenta/puntos",
    unsubscribe_link: "#",
  },
  devolucion_aceptada: {
    nombre: "María García",
    return_id: "DEV-2026-0012",
    order_id: "TCG-20260412-001",
    refund_amount: "89.95",
    refund_method: "Tarjeta bancaria original",
    refund_days: "3–5 días hábiles",
    unsubscribe_link: "#",
  },
  recuperar_contrasena: {
    nombre: "María García",
    reset_url: "#",
    expires_in: "2 horas",
    unsubscribe_link: "#",
  },
  carrito_abandonado: {
    nombre: "María García",
    items_html: `<tr><td style="padding:10px 0;font-size:14px">Pokémon EVS Booster Box ×1</td><td align="right" style="font-size:14px;font-weight:700">€89.95</td></tr>`,
    cart_total: "89.95",
    cart_url: "#",
    coupon_code: "VUELVE10",
    unsubscribe_link: "#",
  },
  asociacion_invitacion: {
    toName: "Carlos",
    fromName: "María García",
    fromInitial: "M",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fillVars(
  template: string,
  vars: Record<string, string>,
): string {
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

// ─── Sidebar template list ────────────────────────────────────────────────────

function TemplateSidebar({
  templates,
  selectedId,
  onSelect,
}: {
  templates: EmailTemplate[];
  selectedId: string;
  onSelect: (t: EmailTemplate) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const byId = useMemo(
    () => Object.fromEntries(templates.map((t) => [t.id, t])),
    [templates],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">
          Plantillas ({templates.length})
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {CATEGORIES.map((cat) => {
          const catTemplates = cat.ids
            .map((id) => byId[id])
            .filter(Boolean) as EmailTemplate[];
          if (catTemplates.length === 0) return null;
          const open = !collapsed[cat.label];
          return (
            <div key={cat.label}>
              <button
                onClick={() =>
                  setCollapsed((prev) => ({ ...prev, [cat.label]: open }))
                }
                className="flex w-full items-center justify-between bg-gray-50 px-4 py-2.5 text-left"
              >
                <span className="text-[11px] font-bold tracking-wide text-gray-500 uppercase">
                  {cat.label}
                </span>
                {open ? (
                  <ChevronDown size={12} className="text-gray-400" />
                ) : (
                  <ChevronRight size={12} className="text-gray-400" />
                )}
              </button>
              {open &&
                catTemplates.map((t) => {
                  const custom = isCustomized(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => onSelect(byId[t.id] ?? t)}
                      className={`flex min-h-[52px] w-full items-start gap-2 px-4 py-2.5 text-left transition ${
                        selectedId === t.id
                          ? "bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={`flex items-center gap-1.5 truncate text-sm font-semibold ${
                            selectedId === t.id
                              ? "text-[#2563eb]"
                              : "text-gray-800"
                          }`}
                        >
                          {t.name}
                          {custom && (
                            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                          )}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-gray-400">
                          {t.description}
                        </p>
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

// ─── Variable inputs ──────────────────────────────────────────────────────────

function VarInputs({
  variables,
  values,
  onChange,
}: {
  variables: string[];
  values: Record<string, string>;
  onChange: (key: string, val: string) => void;
}) {
  if (variables.length === 0) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {variables.map((v) => (
        <div key={v}>
          <label className="mb-1 block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
            {`{{${v}}}`}
          </label>
          <input
            value={values[v] ?? ""}
            onChange={(e) => onChange(v, e.target.value)}
            placeholder={`valor de ${v}`}
            className="h-8 w-full rounded-lg border border-gray-200 px-2.5 text-xs text-gray-700 focus:border-[#2563eb] focus:outline-none"
          />
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminEmailsPage() {
  const [allTemplates, setAllTemplates] = useState<EmailTemplate[]>(() =>
    getEffectiveTemplates(),
  );
  const [selected, setSelected] = useState<EmailTemplate>(
    () => getEffectiveTemplates()[0],
  );
  const [tab, setTab] = useState<"preview" | "edit" | "log">("preview");

  // Edit state
  const [editSubject, setEditSubject] = useState(selected.subject);
  const [editHtml, setEditHtml] = useState(selected.html);
  const [isDirty, setIsDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Preview variable values
  const [previewVars, setPreviewVars] = useState<Record<string, string>>(
    () => DEFAULT_VARS[selected.id] ?? {},
  );

  // Log
  const [sentLog, setSentLog] = useState<SentEmailLog[]>([]);
  useEffect(() => {
    setSentLog(loadSentEmails());
  }, [tab]);

  // KPIs
  const today = new Date().toISOString().slice(0, 10);
  const sentToday = sentLog.filter((l) => l.sentAt.slice(0, 10) === today).length;
  const sentMonth = sentLog.filter(
    (l) => l.sentAt.slice(0, 7) === today.slice(0, 7),
  ).length;
  const customCount = allTemplates.filter((t) => isCustomized(t.id)).length;

  const selectTemplate = useCallback((t: EmailTemplate) => {
    setSelected(t);
    setEditSubject(t.subject);
    setEditHtml(t.html);
    setIsDirty(false);
    setPreviewVars(DEFAULT_VARS[t.id] ?? {});
    setSaveMsg(null);
  }, []);

  const handleSave = () => {
    saveCustomTemplate(selected.id, editSubject, editHtml);
    setAllTemplates(getEffectiveTemplates());
    setSelected((s) => ({ ...s, subject: editSubject, html: editHtml }));
    setIsDirty(false);
    setSaveMsg("Plantilla guardada");
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const handleDiscard = () => {
    setEditSubject(selected.subject);
    setEditHtml(selected.html);
    setIsDirty(false);
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
    setSaveMsg("Plantilla restablecida al original");
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const handleTestSend = () => {
    const html = fillVars(editHtml, previewVars);
    openHtmlInNewTab(html);
  };

  // Live preview HTML (filled with current vars)
  const livePreviewHtml = useMemo(
    () => fillVars(tab === "edit" ? editHtml : selected.html, previewVars),
    [editHtml, selected.html, previewVars, tab],
  );
  const liveSubject = useMemo(
    () => fillVars(tab === "edit" ? editSubject : selected.subject, previewVars),
    [editSubject, selected.subject, previewVars, tab],
  );

  // Template name map for log
  const nameById = useMemo(
    () => Object.fromEntries(EMAIL_TEMPLATES.map((t) => [t.id, t.name])),
    [],
  );

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
            Personaliza el contenido y diseño de todos los correos que se envían automáticamente
          </p>
        </div>
        <button
          onClick={handleTestSend}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#2563eb] hover:text-[#2563eb]"
        >
          <ExternalLink size={14} /> Ver email en nueva pestaña
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Plantillas totales",
            value: allTemplates.length,
            color: "text-[#2563eb]",
          },
          {
            label: "Enviados hoy",
            value: sentToday,
            color: "text-green-600",
          },
          {
            label: "Este mes",
            value: sentMonth,
            color: "text-purple-600",
          },
          {
            label: "Personalizadas",
            value: customCount,
            color: "text-amber-600",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-200 bg-white p-4 text-center"
          >
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="mt-0.5 text-xs font-semibold text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <TemplateSidebar
            templates={allTemplates}
            selectedId={selected.id}
            onSelect={selectTemplate}
          />
          {customCount > 0 && (
            <p className="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-amber-600">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Puntos naranjas = plantilla personalizada
            </p>
          )}
        </div>

        {/* Editor panel */}
        <div className="space-y-4">
          {/* Template header */}
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-900">{selected.name}</h2>
                  {isCustomized(selected.id) && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      Personalizada
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-gray-500">
                  {selected.description}
                </p>
              </div>
              <div className="flex gap-2">
                {(["preview", "edit", "log"] as const).map((t) => {
                  const labels: Record<typeof t, string> = {
                    preview: "Vista previa",
                    edit: "Editar",
                    log: "Registro",
                  };
                  const Icons = {
                    preview: Eye,
                    edit: Edit3,
                    log: Clock,
                  };
                  const Icon = Icons[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        tab === t
                          ? "bg-[#2563eb] text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <Icon size={14} /> {labels[t]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Preview tab ── */}
          {tab === "preview" && (
            <div className="space-y-4">
              {/* Variable inputs */}
              {selected.variables.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="mb-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Variables de prueba
                  </p>
                  <VarInputs
                    variables={selected.variables}
                    values={previewVars}
                    onChange={(k, v) =>
                      setPreviewVars((prev) => ({ ...prev, [k]: v }))
                    }
                  />
                </div>
              )}

              {/* Subject preview */}
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-3">
                <span className="text-xs font-bold text-gray-500">Asunto: </span>
                <span className="text-sm text-gray-800">{liveSubject}</span>
              </div>

              {/* Email iframe */}
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
              {/* Info */}
              {selected.variables.length > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                  <span>
                    Variables disponibles:{" "}
                    {selected.variables.map((v) => (
                      <code key={v} className="mx-0.5 rounded bg-blue-100 px-1 py-0.5 text-[11px] font-bold">
                        {`{{${v}}}`}
                      </code>
                    ))}
                  </span>
                </div>
              )}

              {/* Split: editor left + live preview right */}
              <div className="grid gap-4 xl:grid-cols-2">
                {/* Editor */}
                <div className="space-y-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wide">
                      Asunto del email
                    </label>
                    <input
                      value={editSubject}
                      onChange={(e) => {
                        setEditSubject(e.target.value);
                        setIsDirty(true);
                      }}
                      className="h-10 w-full rounded-xl border-2 border-gray-200 px-3 text-sm transition focus:border-[#2563eb] focus:outline-none"
                    />
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wide">
                      Código HTML
                    </label>
                    <textarea
                      value={editHtml}
                      onChange={(e) => {
                        setEditHtml(e.target.value);
                        setIsDirty(true);
                      }}
                      rows={28}
                      spellCheck={false}
                      className="w-full resize-y rounded-xl border-2 border-gray-200 px-3 py-2.5 font-mono text-xs leading-relaxed transition focus:border-[#2563eb] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live preview */}
                <div className="space-y-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="mb-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Variables de prueba (vista previa en vivo)
                    </p>
                    <VarInputs
                      variables={selected.variables}
                      values={previewVars}
                      onChange={(k, v) =>
                        setPreviewVars((prev) => ({ ...prev, [k]: v }))
                      }
                    />
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-100 bg-gray-50 px-4 py-2">
                      <p className="text-[11px] font-semibold text-gray-500">
                        Asunto: {liveSubject}
                      </p>
                    </div>
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
                  onClick={handleDiscard}
                  disabled={!isDirty}
                  className="flex items-center gap-1.5 rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                >
                  <X size={14} /> Descartar cambios
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
                  <Send size={14} /> Ver en nueva pestaña
                </button>
                <div className="flex-1" />
                {isCustomized(selected.id) && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 rounded-xl border-2 border-amber-200 px-4 py-2.5 text-sm font-bold text-amber-600 transition hover:bg-amber-50"
                  >
                    <RotateCcw size={14} /> Restablecer original
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Log tab ── */}
          {tab === "log" && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <h2 className="font-bold text-gray-900">
                  Registro de envíos
                </h2>
                <span className="text-xs text-gray-400">
                  {sentLog.length} registros en localStorage
                </span>
              </div>

              {sentLog.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Sparkles size={32} className="mx-auto mb-3 text-gray-200" />
                  <p className="font-semibold text-gray-400">
                    Aún no hay emails enviados desde este navegador
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    Los registros aparecerán aquí cuando se envíen cupones o emails automáticos
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-xs tracking-wider text-gray-500 uppercase">
                        <th className="px-5 py-3 text-left font-semibold">
                          Cuándo
                        </th>
                        <th className="hidden px-4 py-3 text-left font-semibold sm:table-cell">
                          Destinatario
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Plantilla
                        </th>
                        <th className="hidden px-4 py-3 text-left font-semibold lg:table-cell">
                          Resumen
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sentLog.map((entry) => (
                        <tr
                          key={entry.id}
                          className="transition hover:bg-gray-50"
                        >
                          <td className="px-5 py-3 text-xs text-gray-500">
                            {timeAgo(entry.sentAt)}
                          </td>
                          <td className="hidden px-4 py-3 text-xs text-gray-700 sm:table-cell">
                            <p className="font-semibold">{entry.toName}</p>
                            <p className="text-gray-400">{entry.to}</p>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">
                            {nameById[entry.templateId] ?? entry.templateId}
                          </td>
                          <td className="hidden px-4 py-3 text-xs text-gray-500 lg:table-cell">
                            {entry.preview}
                          </td>
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
