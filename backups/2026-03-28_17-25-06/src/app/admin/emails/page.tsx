"use client"
import { useState } from "react"
import { Mail, Eye, Edit3, Send, Check, Clock, X } from "lucide-react"
import { EMAIL_TEMPLATES, type EmailTemplate } from "@/data/emailTemplates"

interface MockLog {
  id: number
  date: string
  to: string
  template: string
  status: "enviado" | "error" | "pendiente"
}

const MOCK_LOG: MockLog[] = [
  { id: 1, date: "2025-01-28 14:32", to: "maria.garcia@email.com", template: "Confirmación de pedido", status: "enviado" },
  { id: 2, date: "2025-01-28 11:05", to: "pedro.romero@email.com", template: "Pedido enviado", status: "enviado" },
  { id: 3, date: "2025-01-27 18:44", to: "carlos.lopez@email.com", template: "Bienvenida", status: "enviado" },
  { id: 4, date: "2025-01-27 16:20", to: "ana.martinez@email.com", template: "Nuevo cupón", status: "enviado" },
  { id: 5, date: "2025-01-27 10:11", to: "laura.perez@email.com", template: "Pedido entregado", status: "enviado" },
  { id: 6, date: "2025-01-26 20:03", to: "jorge.san@email.com", template: "Puntos añadidos", status: "error" },
  { id: 7, date: "2025-01-26 09:30", to: "sofia.gil@email.com", template: "Recuperar contraseña", status: "enviado" },
]

const STATUS_COLORS: Record<MockLog["status"], string> = {
  enviado:   "bg-green-100 text-green-700",
  error:     "bg-red-100 text-red-600",
  pendiente: "bg-amber-100 text-amber-700",
}

export default function AdminEmailsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(EMAIL_TEMPLATES)
  const [selected, setSelected] = useState<EmailTemplate>(EMAIL_TEMPLATES[0])
  const [editing, setEditing] = useState(false)
  const [editHtml, setEditHtml] = useState(EMAIL_TEMPLATES[0].html)
  const [editSubject, setEditSubject] = useState(EMAIL_TEMPLATES[0].subject)
  const [toast, setToast] = useState<string | null>(null)
  const [tab, setTab] = useState<"preview" | "edit" | "log">("preview")

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const selectTemplate = (t: EmailTemplate) => {
    setSelected(t)
    setEditHtml(t.html)
    setEditSubject(t.subject)
    setEditing(false)
    setTab("preview")
  }

  const saveChanges = () => {
    setTemplates((prev) =>
      prev.map((t) => t.id === selected.id ? { ...t, html: editHtml, subject: editSubject } : t)
    )
    setSelected((s) => ({ ...s, html: editHtml, subject: editSubject }))
    setEditing(false)
    showToast("Plantilla guardada correctamente")
  }

  return (
    <div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a3a5c] text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium">
          ✓ {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Mail size={22} className="text-[#1a3a5c]" /> Plantillas de email
        </h1>
        <p className="text-gray-500 text-sm mt-1">{templates.length} plantillas configuradas</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Template list */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Plantillas</p>
            </div>
            <div className="divide-y divide-gray-100">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className={`w-full text-left px-4 py-3 transition min-h-[56px] ${selected.id === t.id ? "bg-blue-50" : "hover:bg-gray-50"}`}
                >
                  <p className={`text-sm font-semibold truncate ${selected.id === t.id ? "text-[#1a3a5c]" : "text-gray-800"}`}>
                    {t.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{t.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main panel */}
        <div className="lg:col-span-3 space-y-4">
          {/* Tabs */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-3">
            <div className="flex gap-1">
              {([["preview", Eye, "Vista previa"], ["edit", Edit3, "Editar"], ["log", Clock, "Log de envíos"]] as [typeof tab, typeof Eye, string][]).map(([id, Icon, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition min-h-[36px] ${tab === id ? "bg-[#1a3a5c] text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
            {tab !== "log" && (
              <button
                onClick={() => showToast(`Correo de prueba enviado a hola@tcgacademy.es`)}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#1a3a5c] border border-gray-200 px-3 py-1.5 rounded-lg hover:border-[#1a3a5c] transition min-h-[36px]"
              >
                <Send size={13} /> Enviar prueba
              </button>
            )}
          </div>

          {/* Preview tab */}
          {tab === "preview" && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">
                  <span className="font-semibold">Asunto:</span> {selected.subject}
                </p>
                {selected.variables.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Variables: {selected.variables.map((v) => `{{${v}}}`).join(", ")}
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
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Asunto</label>
                <input
                  value={editSubject}
                  onChange={(e) => { setEditSubject(e.target.value); setEditing(true) }}
                  className="w-full h-10 px-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">HTML de la plantilla</label>
                <textarea
                  value={editHtml}
                  onChange={(e) => { setEditHtml(e.target.value); setEditing(true) }}
                  rows={20}
                  spellCheck={false}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:border-[#1a3a5c] transition resize-y"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setEditHtml(selected.html); setEditSubject(selected.subject); setEditing(false) }}
                  className="flex items-center gap-2 border-2 border-gray-200 font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition min-h-[44px]"
                >
                  <X size={14} /> Descartar
                </button>
                <button
                  onClick={saveChanges}
                  disabled={!editing}
                  className="flex items-center gap-2 bg-[#1a3a5c] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-[#15304d] transition disabled:opacity-40 min-h-[44px]"
                >
                  <Check size={14} /> Guardar cambios
                </button>
              </div>
            </div>
          )}

          {/* Log tab */}
          {tab === "log" && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Últimos emails enviados</h2>
                <span className="text-xs text-gray-400">{MOCK_LOG.length} registros</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="text-left px-5 py-3 font-semibold">Fecha</th>
                      <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Destinatario</th>
                      <th className="text-left px-4 py-3 font-semibold">Plantilla</th>
                      <th className="text-center px-4 py-3 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {MOCK_LOG.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3 text-xs text-gray-500 font-mono">{entry.date}</td>
                        <td className="px-4 py-3 text-gray-700 text-xs hidden sm:table-cell">{entry.to}</td>
                        <td className="px-4 py-3 text-gray-700 text-sm">{entry.template}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[entry.status]}`}>
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
  )
}
