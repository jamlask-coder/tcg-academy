"use client";
import { useState } from "react";
import { Mail, Eye, Edit3, Send, Check, Clock, X } from "lucide-react";
import { EMAIL_TEMPLATES, type EmailTemplate } from "@/data/emailTemplates";

interface MockLog {
  id: number;
  date: string;
  to: string;
  template: string;
  status: "enviado" | "error" | "pendiente";
}

const MOCK_LOG: MockLog[] = [
  {
    id: 1,
    date: "2025-01-28 14:32",
    to: "maria.garcia@email.com",
    template: "Confirmación de pedido",
    status: "enviado",
  },
  {
    id: 2,
    date: "2025-01-28 11:05",
    to: "pedro.romero@email.com",
    template: "Pedido enviado",
    status: "enviado",
  },
  {
    id: 3,
    date: "2025-01-27 18:44",
    to: "carlos.lopez@email.com",
    template: "Bienvenida",
    status: "enviado",
  },
  {
    id: 4,
    date: "2025-01-27 16:20",
    to: "ana.martinez@email.com",
    template: "Nuevo cupón",
    status: "enviado",
  },
  {
    id: 5,
    date: "2025-01-27 10:11",
    to: "laura.perez@email.com",
    template: "Pedido entregado",
    status: "enviado",
  },
  {
    id: 6,
    date: "2025-01-26 20:03",
    to: "jorge.san@email.com",
    template: "Puntos añadidos",
    status: "error",
  },
  {
    id: 7,
    date: "2025-01-26 09:30",
    to: "sofia.gil@email.com",
    template: "Recuperar contraseña",
    status: "enviado",
  },
];

const STATUS_COLORS: Record<MockLog["status"], string> = {
  enviado: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-600",
  pendiente: "bg-amber-100 text-amber-700",
};

export default function AdminEmailsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(EMAIL_TEMPLATES);
  const [selected, setSelected] = useState<EmailTemplate>(EMAIL_TEMPLATES[0]);
  const [editing, setEditing] = useState(false);
  const [editHtml, setEditHtml] = useState(EMAIL_TEMPLATES[0].html);
  const [editSubject, setEditSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<"preview" | "edit" | "log">("preview");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const selectTemplate = (t: EmailTemplate) => {
    setSelected(t);
    setEditHtml(t.html);
    setEditSubject(t.subject);
    setEditing(false);
    setTab("preview");
  };

  const saveChanges = () => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === selected.id
          ? { ...t, html: editHtml, subject: editSubject }
          : t,
      ),
    );
    setSelected((s) => ({ ...s, html: editHtml, subject: editSubject }));
    setEditing(false);
    showToast("Plantilla guardada correctamente");
  };

  return (
    <div>
      {toast && (
        <div className="fixed right-6 bottom-6 z-50 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-medium text-white shadow-xl">
          ✓ {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Mail size={22} className="text-[#2563eb]" /> Plantillas de email
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {templates.length} plantillas configuradas
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Template list */}
        <div className="lg:col-span-1">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Plantillas
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className={`min-h-[56px] w-full px-4 py-3 text-left transition ${selected.id === t.id ? "bg-blue-50" : "hover:bg-gray-50"}`}
                >
                  <p
                    className={`truncate text-sm font-semibold ${selected.id === t.id ? "text-[#2563eb]" : "text-gray-800"}`}
                  >
                    {t.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {t.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main panel */}
        <div className="space-y-4 lg:col-span-3">
          {/* Tabs */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
            <div className="flex gap-1">
              {(
                [
                  ["preview", Eye, "Vista previa"],
                  ["edit", Edit3, "Editar"],
                  ["log", Clock, "Log de envíos"],
                ] as [typeof tab, typeof Eye, string][]
              ).map(([id, Icon, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === id ? "bg-[#2563eb] text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
            {tab !== "log" && (
              <button
                onClick={() =>
                  showToast(`Correo de prueba enviado a hola@tcgacademy.es`)
                }
                className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-[#2563eb] hover:text-[#2563eb]"
              >
                <Send size={13} /> Enviar prueba
              </button>
            )}
          </div>

          {/* Preview tab */}
          {tab === "preview" && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
                <p className="text-xs text-gray-500">
                  <span className="font-semibold">Asunto:</span>{" "}
                  {selected.subject}
                </p>
                {selected.variables.length > 0 && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    Variables:{" "}
                    {selected.variables.map((v) => `{{${v}}}`).join(", ")}
                  </p>
                )}
              </div>
              <iframe
                srcDoc={selected.html}
                className="w-full border-0"
                style={{ height: "600px" }}
                title={selected.name}
                sandbox="allow-same-origin"
              />
            </div>
          )}

          {/* Edit tab */}
          {tab === "edit" && (
            <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                  Asunto
                </label>
                <input
                  value={editSubject}
                  onChange={(e) => {
                    setEditSubject(e.target.value);
                    setEditing(true);
                  }}
                  className="h-10 w-full rounded-xl border-2 border-gray-200 px-3 text-sm transition focus:border-[#2563eb] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                  HTML de la plantilla
                </label>
                <textarea
                  value={editHtml}
                  onChange={(e) => {
                    setEditHtml(e.target.value);
                    setEditing(true);
                  }}
                  rows={20}
                  spellCheck={false}
                  className="w-full resize-y rounded-xl border-2 border-gray-200 px-3 py-2 font-mono text-xs transition focus:border-[#2563eb] focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditHtml(selected.html);
                    setEditSubject(selected.subject);
                    setEditing(false);
                  }}
                  className="flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-bold transition hover:bg-gray-50"
                >
                  <X size={14} /> Descartar
                </button>
                <button
                  onClick={saveChanges}
                  disabled={!editing}
                  className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-40"
                >
                  <Check size={14} /> Guardar cambios
                </button>
              </div>
            </div>
          )}

          {/* Log tab */}
          {tab === "log" && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <h2 className="font-bold text-gray-900">
                  Últimos emails enviados
                </h2>
                <span className="text-xs text-gray-400">
                  {MOCK_LOG.length} registros
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs tracking-wider text-gray-500 uppercase">
                      <th className="px-5 py-3 text-left font-semibold">
                        Fecha
                      </th>
                      <th className="hidden px-4 py-3 text-left font-semibold sm:table-cell">
                        Destinatario
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Plantilla
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {MOCK_LOG.map((entry) => (
                      <tr
                        key={entry.id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-3 font-mono text-xs text-gray-500">
                          {entry.date}
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-gray-700 sm:table-cell">
                          {entry.to}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {entry.template}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_COLORS[entry.status]}`}
                          >
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
