"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Truck,
  AlertTriangle,
  Clock,
  Package,
  Send,
  FileText,
  MessageSquare,
  Mail,
  StickyNote,
  History,
  Copy,
  ExternalLink,
  Printer,
  ChevronRight,
  Filter,
  Info,
} from "lucide-react";
import {
  ADMIN_ORDERS,
  MOCK_MESSAGES,
  MSG_STORAGE_KEY,
  ORDER_STORAGE_KEY,
  type AdminOrder,
  type AdminOrderStatus,
  type AppMessage,
  type OrderIncident,
} from "@/data/mockData";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  AdminOrderStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  pagado: {
    label: "Pagado",
    color: "#d97706",
    bg: "#fef9c3",
    border: "#fde68a",
  },
  pendiente_envio: {
    label: "Pdte. de envío",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  enviado: {
    label: "Enviado",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
  },
  finalizado: {
    label: "Finalizado",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  incidencia: {
    label: "Incidencia",
    color: "#dc2626",
    bg: "#fff1f2",
    border: "#fecdd3",
  },
};

const ROLE_CFG = {
  cliente: { label: "Cliente", color: "#6b7280", bg: "#f3f4f6" },
  mayorista: { label: "Mayorista", color: "#1d4ed8", bg: "#dbeafe" },
  tienda: { label: "Tienda TCG", color: "#7c3aed", bg: "#ede9fe" },
};

const INCIDENT_TYPES: Record<string, string> = {
  no_recibido: "No recibido",
  producto_defectuoso: "Producto defectuoso",
  producto_incorrecto: "Producto incorrecto",
  falta_producto: "Falta producto",
  otro: "Otro motivo",
};

const STATUS_FLOW: AdminOrderStatus[] = [
  "pagado",
  "pendiente_envio",
  "enviado",
  "finalizado",
];

const EMAIL_TEMPLATES = [
  {
    id: "preparando",
    label: "Pedido en preparación",
    subject: "Tu pedido está siendo preparado",
    body: "Hola,\n\nHemos recibido tu pedido y lo estamos preparando. En breve recibirás el número de seguimiento.\n\nGracias por confiar en TCG Academy.",
  },
  {
    id: "enviado",
    label: "Pedido enviado",
    subject: "Tu pedido ha sido enviado",
    body: "Hola,\n\nTu pedido ha sido enviado hoy con GLS. Número de seguimiento: {{tracking}}\n\nPuedes seguirlo en: https://www.gls-spain.es\n\nGracias!",
  },
  {
    id: "incidencia",
    label: "Respuesta a incidencia",
    subject: "Actualización sobre tu incidencia",
    body: "Hola,\n\nHemos revisado tu incidencia y nos ponemos en contacto contigo para resolverla.\n\n",
  },
  {
    id: "stock",
    label: "Información de stock",
    subject: "Actualización de stock",
    body: "Hola,\n\nTe informamos sobre la disponibilidad de los productos de tu pedido.\n\n",
  },
  {
    id: "personalizado",
    label: "Mensaje personalizado",
    subject: "",
    body: "",
  },
];

// ─── Utils ────────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function hoursAgo(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function isUrgent(order: AdminOrder) {
  if (order.adminStatus !== "pagado") return false;
  const entry = order.statusHistory.find((h) => h.status === "pagado");
  return entry ? hoursAgo(entry.date) >= 48 : false;
}

// ─── Small components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AdminOrderStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border"
      style={{
        color: cfg.color,
        backgroundColor: cfg.bg,
        borderColor: cfg.border,
      }}
    >
      {cfg.label}
    </span>
  );
}

function RoleBadge({ role }: { role: "cliente" | "mayorista" | "tienda" }) {
  const cfg = ROLE_CFG[role];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-[#1a3a5c] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 max-w-sm animate-fade-in">
      <Check size={16} className="text-green-300 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-white/60 hover:text-white">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Email modal ──────────────────────────────────────────────────────────────

function EmailModal({
  order,
  onClose,
  onSend,
}: {
  order: AdminOrder;
  onClose: () => void;
  onSend: (subject: string, body: string) => void;
}) {
  const [tplId, setTplId] = useState("preparando");
  const tpl = EMAIL_TEMPLATES.find((t) => t.id === tplId)!;
  const [subject, setSubject] = useState(tpl.subject);
  const [body, setBody] = useState(
    tpl.body.replace("{{tracking}}", order.trackingNumber ?? ""),
  );

  const applyTpl = (id: string) => {
    setTplId(id);
    const t = EMAIL_TEMPLATES.find((x) => x.id === id)!;
    setSubject(t.subject);
    setBody(t.body.replace("{{tracking}}", order.trackingNumber ?? ""));
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <Mail size={16} className="text-[#1a3a5c]" /> Enviar email a{" "}
            {order.userName}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Plantilla
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EMAIL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTpl(t.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition ${tplId === t.id ? "bg-[#1a3a5c] text-white border-[#1a3a5c]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Para
            </label>
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 font-mono">
              {order.userEmail}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Asunto
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Mensaje
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c] resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSend(subject, body)}
            disabled={!subject || !body}
            className="px-4 py-2 rounded-lg bg-[#1a3a5c] text-white text-sm font-semibold hover:bg-[#2d6a9f] disabled:opacity-50 flex items-center gap-2"
          >
            <Mail size={14} /> Enviar email
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Albarán print ────────────────────────────────────────────────────────────

function printAlbaran(order: AdminOrder) {
  const lines = order.items
    .map((i) => `${i.qty}x ${i.name} — ${(i.price * i.qty).toFixed(2)}€`)
    .join("\n");
  const content = [
    "ALBARÁN DE ENVÍO — TCG Academy",
    "================================",
    `Pedido: ${order.id}`,
    `Fecha: ${fmtDate(order.date)}`,
    `Cliente: ${order.userName} (${order.userEmail})`,
    "",
    "DIRECCIÓN DE ENTREGA:",
    order.address,
    "",
    "PRODUCTOS:",
    lines,
    "",
    `SUBTOTAL: ${order.subtotal.toFixed(2)}€`,
    `ENVÍO: ${order.shipping === 0 ? "Gratuito" : order.shipping.toFixed(2) + "€"}`,
    `TOTAL: ${order.total.toFixed(2)}€`,
    order.trackingNumber ? `\nTracking GLS: ${order.trackingNumber}` : "",
    "\n================================",
    "TCG Academy — www.tcgacademy.es",
  ].join("\n");
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(
      `<pre style="font-family:monospace;font-size:14px;padding:24px">${content}</pre>`,
    );
    win.print();
  }
}

// ─── Expanded order panel ─────────────────────────────────────────────────────

function OrderPanel({
  order,
  onUpdateStatus,
  onSaveNotes,
  onSendEmail,
  onSendMessage,
  onResolveIncident,
}: {
  order: AdminOrder;
  onUpdateStatus: (
    id: string,
    status: AdminOrderStatus,
    tracking?: string,
  ) => void;
  onSaveNotes: (id: string, notes: string) => void;
  onSendEmail: (order: AdminOrder) => void;
  onSendMessage: (order: AdminOrder) => void;
  onResolveIncident: (id: string, response: string) => void;
}) {
  const [tab, setTab] = useState<
    "detalle" | "envio" | "incidencia" | "notas" | "historial"
  >("detalle");
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [trackingError, setTrackingError] = useState("");
  const [notes, setNotes] = useState(order.adminNotes ?? "");
  const [incidentReply, setIncidentReply] = useState("");

  const tabs = [
    { id: "detalle", label: "Detalle", icon: Package },
    { id: "envio", label: "Envío", icon: Truck },
    ...(order.incident
      ? [{ id: "incidencia", label: "Incidencia", icon: AlertTriangle }]
      : []),
    { id: "notas", label: "Notas internas", icon: StickyNote },
    { id: "historial", label: "Historial", icon: History },
  ] as const;

  const currentStep = STATUS_FLOW.indexOf(order.adminStatus);

  const handleMarkEnviado = () => {
    if (!tracking.trim()) {
      setTrackingError("El número de seguimiento es obligatorio");
      return;
    }
    setTrackingError("");
    onUpdateStatus(order.id, "enviado", tracking.trim());
  };

  const copyTracking = () => {
    if (order.trackingNumber)
      navigator.clipboard.writeText(order.trackingNumber);
  };

  return (
    <div className="border-t-2 border-[#1a3a5c]/10 bg-white">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-gray-100 px-4">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as typeof tab)}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition ${tab === id ? "border-[#1a3a5c] text-[#1a3a5c]" : "border-transparent text-gray-500 hover:text-gray-700"} ${id === "incidencia" ? "text-red-600" : ""}`}
          >
            <Icon size={13} /> {label}
            {id === "incidencia" && order.incident?.status === "abierta" && (
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 py-2 pl-4">
          <button
            onClick={() => printAlbaran(order)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#1a3a5c] px-2 py-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <Printer size={13} /> Albarán
          </button>
          <button
            onClick={() => onSendEmail(order)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#1a3a5c] px-2 py-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <Mail size={13} /> Email
          </button>
          <button
            onClick={() => onSendMessage(order)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#1a3a5c] px-2 py-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <MessageSquare size={13} /> Mensaje
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* ── Tab: Detalle ── */}
        {tab === "detalle" && (
          <div className="space-y-4">
            {/* Items */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Productos
              </p>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-base flex-shrink-0">
                      {item.game === "magic"
                        ? "🧙"
                        : item.game === "pokemon"
                          ? "⚡"
                          : item.game === "naruto"
                            ? "🍃"
                            : "🃏"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">
                          {item.qty}× · {item.price.toFixed(2)}€/ud
                        </p>
                        {item.qtyShipped !== undefined &&
                          item.qtyShipped < item.qty && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">
                              Enviado: {item.qtyShipped}/{item.qty}
                            </span>
                          )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 flex-shrink-0">
                      {(item.price * item.qty).toFixed(2)}€
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Meta */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                <p className="font-bold text-gray-600 mb-1.5">
                  Información del cliente
                </p>
                <p>
                  <span className="text-gray-400">Nombre:</span>{" "}
                  <span className="font-medium">{order.userName}</span>
                </p>
                <p>
                  <span className="text-gray-400">Email:</span>{" "}
                  <span className="font-mono">{order.userEmail}</span>
                </p>
                <p>
                  <span className="text-gray-400">Tipo:</span>{" "}
                  <RoleBadge role={order.userRole} />
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                <p className="font-bold text-gray-600 mb-1.5">Pago y envío</p>
                <p>
                  <span className="text-gray-400">Método:</span>{" "}
                  <span className="font-medium">{order.paymentMethod}</span>
                </p>
                <p>
                  <span className="text-gray-400">Dirección:</span>{" "}
                  <span className="font-medium">{order.address}</span>
                </p>
                {order.trackingNumber && (
                  <p>
                    <span className="text-gray-400">Tracking:</span>{" "}
                    <span className="font-mono text-purple-600">
                      {order.trackingNumber}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-xl p-3 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">
                  {order.subtotal.toFixed(2)}€
                </span>
              </div>
              {order.couponCode && order.couponDiscount && (
                <div className="flex justify-between py-1 text-green-700">
                  <span>
                    Cupón{" "}
                    <span className="font-mono font-bold bg-green-100 px-1 rounded">
                      {order.couponCode}
                    </span>
                  </span>
                  <span className="font-medium">
                    -{order.couponDiscount.toFixed(2)}€
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Envío</span>
                <span className="font-medium">
                  {order.shipping === 0
                    ? "Gratuito"
                    : order.shipping.toFixed(2) + "€"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-t border-gray-200 font-bold text-sm mt-1">
                <span>Total</span>
                <span className="text-[#1a3a5c]">
                  {order.total.toFixed(2)}€
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Envío ── */}
        {tab === "envio" && (
          <div className="space-y-5">
            {/* Timeline */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                Estado del pedido
              </p>
              <div className="flex items-start gap-0">
                {STATUS_FLOW.map((s, i) => {
                  const cfg = STATUS_CFG[s];
                  const done = s === "incidencia" ? false : currentStep >= i;
                  const active = order.adminStatus === s;
                  const entry = order.statusHistory.find((h) => h.status === s);
                  return (
                    <div
                      key={s}
                      className="flex items-start flex-1 last:flex-none"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{
                            backgroundColor: done ? cfg.color : "#e5e7eb",
                          }}
                        >
                          {done ? (
                            <Check size={12} />
                          ) : (
                            <span className="text-gray-400 text-xs">
                              {i + 1}
                            </span>
                          )}
                        </div>
                        <p
                          className="text-[10px] font-semibold mt-1 text-center whitespace-nowrap"
                          style={{ color: active ? cfg.color : "#9ca3af" }}
                        >
                          {cfg.label}
                        </p>
                        {entry && (
                          <p className="text-[9px] text-gray-400 text-center">
                            {fmtDateTime(entry.date)}
                          </p>
                        )}
                      </div>
                      {i < STATUS_FLOW.length - 1 && (
                        <div
                          className="flex-1 h-0.5 mt-3.5 mx-1"
                          style={{
                            backgroundColor:
                              done && currentStep > i ? cfg.color : "#e5e7eb",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action based on status */}
            <div className="border border-gray-200 rounded-xl p-4">
              {order.adminStatus === "pagado" && (
                <div className="flex items-center gap-3">
                  <Package size={16} className="text-amber-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">
                      Pedido pagado — en espera de procesado
                    </p>
                    <p className="text-xs text-gray-500">
                      Revisa el pedido y márcalo como pendiente de envío cuando
                      empieces a prepararlo.
                    </p>
                  </div>
                  <button
                    onClick={() => onUpdateStatus(order.id, "pendiente_envio")}
                    className="flex items-center gap-1.5 bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-amber-600 transition whitespace-nowrap"
                  >
                    <ChevronRight size={14} /> Preparar pedido
                  </button>
                </div>
              )}

              {order.adminStatus === "pendiente_envio" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck size={16} className="text-blue-500" />
                    <p className="text-sm font-semibold text-gray-800">
                      Marcar como enviado
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">
                      Número de seguimiento GLS{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={tracking}
                      onChange={(e) => {
                        setTracking(e.target.value);
                        setTrackingError("");
                      }}
                      placeholder="Ej: ES2026032800001"
                      className={`w-full h-10 px-3 border-2 rounded-xl text-sm font-mono focus:outline-none transition ${trackingError ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                    />
                    {trackingError && (
                      <p className="text-xs text-red-500 mt-1">
                        {trackingError}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleMarkEnviado}
                    className="flex items-center gap-1.5 bg-[#1a3a5c] text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-[#2d6a9f] transition"
                  >
                    <Truck size={14} /> Confirmar envío con GLS
                  </button>
                </div>
              )}

              {order.adminStatus === "enviado" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                    <Truck
                      size={16}
                      className="text-purple-500 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-purple-700">
                        Enviado con GLS
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-sm text-purple-600">
                          {order.trackingNumber}
                        </span>
                        <button
                          onClick={copyTracking}
                          className="text-purple-400 hover:text-purple-600 transition"
                        >
                          <Copy size={12} />
                        </button>
                        <a
                          href={`https://www.gls-spain.es/es/seguimiento-envios/?match=${order.trackingNumber}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-400 hover:text-purple-600 transition"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateStatus(order.id, "finalizado")}
                    className="flex items-center gap-1.5 bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-green-700 transition"
                  >
                    <Check size={14} /> Marcar como finalizado (entregado)
                  </button>
                </div>
              )}

              {order.adminStatus === "finalizado" && (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                  <Check size={16} className="text-green-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-green-700">
                    Pedido finalizado y entregado
                  </p>
                </div>
              )}

              {order.adminStatus === "incidencia" && (
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                  <AlertTriangle
                    size={16}
                    className="text-red-500 flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold text-red-700">
                      Hay una incidencia abierta
                    </p>
                    <button
                      onClick={() => setTab("incidencia")}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Ver incidencia →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Incidencia ── */}
        {tab === "incidencia" && order.incident && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-red-700">
                  {INCIDENT_TYPES[order.incident.type] ?? order.incident.type}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${order.incident.status === "resuelta" ? "bg-green-100 text-green-700" : order.incident.status === "en_revision" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}
                >
                  {order.incident.status === "abierta"
                    ? "Abierta"
                    : order.incident.status === "en_revision"
                      ? "En revisión"
                      : "Resuelta"}
                </span>
              </div>
              <p className="text-sm text-gray-700">
                {order.incident.description}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {fmtDateTime(order.incident.date)}
              </p>
            </div>

            {/* Message thread */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Historial de mensajes
              </p>
              {order.incident.messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${m.from === "admin" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${m.from === "admin" ? "bg-[#1a3a5c] text-white" : "bg-gray-200 text-gray-600"}`}
                  >
                    {m.from === "admin" ? "A" : order.userName[0]}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${m.from === "admin" ? "bg-[#1a3a5c] text-white" : "bg-gray-100 text-gray-700"}`}
                  >
                    <p>{m.text}</p>
                    <p
                      className={`text-[10px] mt-1 ${m.from === "admin" ? "text-blue-200" : "text-gray-400"}`}
                    >
                      {fmtDateTime(m.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {order.incident.status !== "resuelta" && (
              <div className="space-y-2">
                <textarea
                  value={incidentReply}
                  onChange={(e) => setIncidentReply(e.target.value)}
                  placeholder="Escribe una respuesta al cliente..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c] resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => onResolveIncident(order.id, incidentReply)}
                    disabled={!incidentReply.trim()}
                    className="flex items-center gap-1.5 bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-green-700 transition disabled:opacity-50"
                  >
                    <Check size={13} /> Resolver incidencia
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Notas ── */}
        {tab === "notas" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              Notas internas — solo visibles para el admin. No las ve el
              cliente.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade notas sobre este pedido..."
              rows={5}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a3a5c] resize-none"
            />
            <button
              onClick={() => onSaveNotes(order.id, notes)}
              className="flex items-center gap-1.5 bg-[#1a3a5c] text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-[#2d6a9f] transition"
            >
              <Check size={13} /> Guardar notas
            </button>
          </div>
        )}

        {/* ── Tab: Historial ── */}
        {tab === "historial" && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Log de cambios de estado
            </p>
            <div className="space-y-2">
              {[...order.statusHistory].reverse().map((entry, i) => {
                const cfg = STATUS_CFG[entry.status];
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0"
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          por {entry.by}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-xs text-gray-500">{entry.note}</p>
                      )}
                      <p className="text-[10px] text-gray-400">
                        {fmtDateTime(entry.date)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Message modal ────────────────────────────────────────────────────────────

function MessageModal({
  order,
  onClose,
  onSend,
}: {
  order: AdminOrder;
  onClose: () => void;
  onSend: (body: string) => void;
}) {
  const [body, setBody] = useState("");
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <MessageSquare size={16} className="text-[#1a3a5c]" /> Mensaje a{" "}
            {order.userName}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs text-gray-400 mb-2">
            Ref. pedido:{" "}
            <span className="font-mono font-bold text-gray-600">
              {order.id}
            </span>
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escribe tu mensaje al cliente..."
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a3a5c] resize-none"
          />
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSend(body)}
            disabled={!body.trim()}
            className="px-4 py-2 rounded-lg bg-[#1a3a5c] text-white text-sm font-semibold hover:bg-[#2d6a9f] disabled:opacity-50 flex items-center gap-2"
          >
            <Send size={13} /> Enviar mensaje
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const DEMO_BANNER_KEY = "tcgacademy_demo_pedidos_dismissed";

export default function AdminPedidosPage() {
  const [showDemoBanner, setShowDemoBanner] = useState(false);

  useEffect(() => {
    try {
      setShowDemoBanner(!localStorage.getItem(DEMO_BANNER_KEY));
    } catch {
      setShowDemoBanner(true);
    }
  }, []);

  const dismissDemoBanner = () => {
    try {
      localStorage.setItem(DEMO_BANNER_KEY, "1");
    } catch {}
    setShowDemoBanner(false);
  };

  const [orders, setOrders] = useState<AdminOrder[]>(() => {
    if (typeof window === "undefined") return ADMIN_ORDERS;
    try {
      const saved = localStorage.getItem(ORDER_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as AdminOrder[]) : ADMIN_ORDERS;
    } catch {
      return ADMIN_ORDERS;
    }
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminOrderStatus | "">("");
  const [roleFilter, setRoleFilter] = useState<
    "cliente" | "mayorista" | "tienda" | ""
  >("");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState<AdminOrder | null>(null);
  const [messageModal, setMessageModal] = useState<AdminOrder | null>(null);
  const [sortField, setSortField] = useState<"date" | "total" | "status">(
    "date",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const persistOrders = (next: AdminOrder[]) => {
    setOrders(next);
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // ── Summary counts ──
  const counts = useMemo(
    () => ({
      pagados: orders.filter((o) => o.adminStatus === "pagado").length,
      pendientes: orders.filter((o) => o.adminStatus === "pendiente_envio")
        .length,
      incidencias: orders.filter((o) => o.adminStatus === "incidencia").length,
      urgentes: orders.filter(isUrgent).length,
    }),
    [orders],
  );

  // ── Filtered + sorted ──
  const filtered = useMemo(() => {
    let list = orders.filter((o) => {
      if (statusFilter && o.adminStatus !== statusFilter) return false;
      if (roleFilter && o.userRole !== roleFilter) return false;
      if (urgentOnly && !isUrgent(o)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !o.id.toLowerCase().includes(q) &&
          !o.userName.toLowerCase().includes(q) &&
          !o.userEmail.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      let av: string | number = 0,
        bv: string | number = 0;
      if (sortField === "date") {
        av = a.date;
        bv = b.date;
      }
      if (sortField === "total") {
        av = a.total;
        bv = b.total;
      }
      if (sortField === "status") {
        av = STATUS_FLOW.indexOf(a.adminStatus);
        bv = STATUS_FLOW.indexOf(b.adminStatus);
      }
      if (typeof av === "string")
        return sortDir === "asc"
          ? av.localeCompare(bv as string)
          : (bv as string).localeCompare(av);
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
    return list;
  }, [
    orders,
    search,
    statusFilter,
    roleFilter,
    urgentOnly,
    sortField,
    sortDir,
  ]);

  // ── Handlers ──

  const handleUpdateStatus = (
    id: string,
    status: AdminOrderStatus,
    tracking?: string,
  ) => {
    const now = new Date().toISOString();
    persistOrders(
      orders.map((o) => {
        if (o.id !== id) return o;
        return {
          ...o,
          adminStatus: status,
          ...(tracking ? { trackingNumber: tracking } : {}),
          statusHistory: [
            ...o.statusHistory,
            {
              status,
              date: now,
              by: "admin",
              ...(tracking ? { note: `GLS ${tracking}` } : {}),
            },
          ],
        };
      }),
    );
    const labels: Record<AdminOrderStatus, string> = {
      pagado: "Pagado",
      pendiente_envio: "Pendiente de envío",
      enviado: "Enviado",
      finalizado: "Finalizado",
      incidencia: "Incidencia",
    };
    showToast(
      `Pedido ${id} → ${labels[status]}${tracking ? ` · Tracking: ${tracking}` : ""}`,
    );
  };

  const handleSaveNotes = (id: string, notes: string) => {
    persistOrders(
      orders.map((o) => (o.id === id ? { ...o, adminNotes: notes } : o)),
    );
    showToast("Notas guardadas");
  };

  const handleResolveIncident = (id: string, response: string) => {
    const now = new Date().toISOString();
    persistOrders(
      orders.map((o) => {
        if (o.id !== id || !o.incident) return o;
        return {
          ...o,
          adminStatus: "enviado" as AdminOrderStatus,
          incident: {
            ...o.incident,
            status: "resuelta",
            messages: [
              ...o.incident.messages,
              { from: "admin", text: response, date: now },
            ],
          },
          statusHistory: [
            ...o.statusHistory,
            {
              status: "enviado",
              date: now,
              by: "admin",
              note: "Incidencia resuelta",
            },
          ],
        };
      }),
    );
    showToast("Incidencia resuelta");
  };

  const handleSendEmail = (
    order: AdminOrder,
    subject: string,
    body: string,
  ) => {
    const log = JSON.parse(
      localStorage.getItem("tcgacademy_email_log") ?? "[]",
    );
    log.unshift({
      date: new Date().toISOString(),
      to: order.userEmail,
      subject,
      status: "enviado",
    });
    localStorage.setItem(
      "tcgacademy_email_log",
      JSON.stringify(log.slice(0, 50)),
    );
    showToast(`Email enviado a ${order.userEmail}`);
    setEmailModal(null);
  };

  const handleSendMessage = (order: AdminOrder, body: string) => {
    const msgs: AppMessage[] = JSON.parse(
      localStorage.getItem(MSG_STORAGE_KEY) ?? "[]",
    );
    const newMsg: AppMessage = {
      id: `msg-${Date.now()}`,
      fromUserId: "admin",
      toUserId: order.userId,
      fromName: "TCG Academy",
      toName: order.userName,
      subject: `Re: Pedido ${order.id}`,
      body,
      date: new Date().toISOString(),
      read: false,
      orderId: order.id,
    };
    localStorage.setItem(MSG_STORAGE_KEY, JSON.stringify([newMsg, ...msgs]));
    showToast(`Mensaje enviado a ${order.userName}`);
    setMessageModal(null);
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField !== field ? null : sortDir === "asc" ? (
      <ChevronUp size={11} />
    ) : (
      <ChevronDown size={11} />
    );

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {emailModal && (
        <EmailModal
          order={emailModal}
          onClose={() => setEmailModal(null)}
          onSend={(s, b) => handleSendEmail(emailModal, s, b)}
        />
      )}
      {messageModal && (
        <MessageModal
          order={messageModal}
          onClose={() => setMessageModal(null)}
          onSend={(b) => handleSendMessage(messageModal, b)}
        />
      )}

      {showDemoBanner && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <Info size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 flex-1">
            <strong>Modo demo:</strong> estos pedidos son datos de ejemplo para
            demostración. En producción se conectarán con el sistema real de
            pedidos.
          </p>
          <button
            onClick={dismissDemoBanner}
            className="text-amber-400 hover:text-amber-600 transition flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de pedidos</h1>
        <p className="text-gray-500 text-sm mt-1">
          Pedidos pagados de todos los clientes
        </p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          {
            label: "Nuevos (Pagados)",
            value: counts.pagados,
            color: "#d97706",
            bg: "#fef9c3",
            filter: "pagado" as const,
          },
          {
            label: "Pdte. de envío",
            value: counts.pendientes,
            color: "#2563eb",
            bg: "#eff6ff",
            filter: "pendiente_envio" as const,
          },
          {
            label: "Incidencias abiertas",
            value: counts.incidencias,
            color: "#dc2626",
            bg: "#fff1f2",
            filter: "incidencia" as const,
          },
          {
            label: "Urgentes (+48h)",
            value: counts.urgentes,
            color: "#92400e",
            bg: "#fef3c7",
            filter: null,
          },
        ].map(({ label, value, color, bg, filter }) => (
          <button
            key={label}
            onClick={() =>
              filter
                ? setStatusFilter(statusFilter === filter ? "" : filter)
                : setUrgentOnly(!urgentOnly)
            }
            className={`rounded-xl p-3 text-left border-2 transition ${(filter ? statusFilter === filter : urgentOnly) ? "border-current" : "border-transparent"}`}
            style={{ backgroundColor: bg, color }}
          >
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-semibold mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pedido, cliente, email..."
            className="w-full h-9 pl-8 pr-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as AdminOrderStatus | "")
          }
          className="h-9 px-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#1a3a5c]"
        >
          <option value="">Todos los estados</option>
          {(Object.keys(STATUS_CFG) as AdminOrderStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_CFG[s].label}
            </option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          className="h-9 px-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#1a3a5c]"
        >
          <option value="">Todos los tipos</option>
          <option value="cliente">Cliente</option>
          <option value="mayorista">Mayorista</option>
          <option value="tienda">Tienda TCG</option>
        </select>
        {(search || statusFilter || roleFilter || urgentOnly) && (
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setRoleFilter("");
              setUrgentOnly(false);
            }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <X size={11} /> Limpiar filtros
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {filtered.length} pedidos
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold">
                  <button
                    className="flex items-center gap-1 hover:text-gray-700"
                    onClick={() => toggleSort("date")}
                  >
                    Pedido <SortIcon field="date" />
                  </button>
                </th>
                <th className="text-left px-3 py-3 font-semibold hidden md:table-cell">
                  Cliente
                </th>
                <th className="text-left px-3 py-3 font-semibold hidden sm:table-cell">
                  Fecha
                </th>
                <th className="text-right px-3 py-3 font-semibold">
                  <button
                    className="flex items-center gap-1 hover:text-gray-700 ml-auto"
                    onClick={() => toggleSort("total")}
                  >
                    Total <SortIcon field="total" />
                  </button>
                </th>
                <th className="text-center px-3 py-3 font-semibold">
                  <button
                    className="flex items-center gap-1 hover:text-gray-700 mx-auto"
                    onClick={() => toggleSort("status")}
                  >
                    Estado <SortIcon field="status" />
                  </button>
                </th>
                <th className="w-6 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((order) => {
                const isOpen = expanded === order.id;
                const urgent = isUrgent(order);
                return (
                  <>
                    <tr
                      key={order.id}
                      className={`hover:bg-gray-50/70 transition cursor-pointer ${isOpen ? "bg-blue-50/30" : ""} ${urgent ? "border-l-4 border-l-amber-400" : ""}`}
                      onClick={() => setExpanded(isOpen ? null : order.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-bold text-[#1a3a5c]">
                          {order.id}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {urgent && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                              <Clock size={8} /> +48h sin procesar
                            </span>
                          )}
                          {order.incident && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                              <AlertTriangle size={8} /> Incidencia
                            </span>
                          )}
                          {order.couponCode && (
                            <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
                              Cupón {order.couponCode}
                            </span>
                          )}
                          {order.items.some(
                            (i) =>
                              i.qtyShipped !== undefined &&
                              i.qtyShipped < i.qty,
                          ) && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                              Envío parcial
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <p className="text-sm font-medium text-gray-800">
                          {order.userName}
                        </p>
                        <RoleBadge role={order.userRole} />
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs hidden sm:table-cell whitespace-nowrap">
                        {fmtDate(order.date)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                        {order.total.toFixed(2)}€
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={order.adminStatus} />
                      </td>
                      <td className="px-3 py-3 text-gray-400">
                        {isOpen ? (
                          <ChevronUp size={15} />
                        ) : (
                          <ChevronDown size={15} />
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${order.id}-panel`}>
                        <td colSpan={6} className="p-0">
                          <OrderPanel
                            order={order}
                            onUpdateStatus={handleUpdateStatus}
                            onSaveNotes={handleSaveNotes}
                            onSendEmail={(o) => setEmailModal(o)}
                            onSendMessage={(o) => setMessageModal(o)}
                            onResolveIncident={handleResolveIncident}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Package size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              No se encontraron pedidos con los filtros aplicados
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
