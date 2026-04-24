"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
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
  MessageSquare,
  Mail,
  StickyNote,
  History,
  Copy,
  ExternalLink,
  Printer,
  Info,
  Ban,
  RotateCcw,
} from "lucide-react";
import {
  ADMIN_ORDERS,
  MOCK_USERS,
  ORDER_STORAGE_KEY,
  type AdminOrder,
  type AdminOrderStatus,
} from "@/data/mockData";
import {
  readAdminOrdersMerged,
  isAdminVisibleOrder,
} from "@/lib/orderAdapter";
import { sendMessage as sendCanonicalMessage } from "@/services/messageService";
import { pushUserNotification } from "@/services/notificationService";
import { sendAppEmail } from "@/services/emailService";
import {
  buildInvoiceFromOrder,
  printInvoiceWithCSV,
  generateInvoiceNumber,
} from "@/utils/invoiceGenerator";
import { logAudit } from "@/services/auditService";
import { getMergedById } from "@/lib/productStore";
import { persistProductPatch } from "@/lib/productPersist";
import { parseFiscalAddress } from "@/lib/fiscalAddress";
import {
  ShipModal,
  buildTrackingUrl,
  type Carrier,
} from "@/components/admin/ShipModal";
import { clickableProps } from "@/lib/a11y";
import { userIdToHandle } from "@/lib/userHandle";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 50;

const STATUS_CFG: Record<
  AdminOrderStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  pendiente_envio: {
    label: "Pendiente de envío",
    color: "#a16207",
    bg: "#fef9c3",
    border: "#fde047",
  },
  enviado: {
    label: "Enviado",
    color: "#15803d",
    bg: "#dcfce7",
    border: "#86efac",
  },
  incidencia: {
    label: "Incidencia",
    color: "#c2410c",
    bg: "#fff7ed",
    border: "#fed7aa",
  },
  cancelado: {
    label: "Cancelado",
    color: "#374151",
    bg: "#f3f4f6",
    border: "#d1d5db",
  },
  devolucion: {
    label: "Devolución",
    color: "#6d28d9",
    bg: "#ede9fe",
    border: "#c4b5fd",
  },
};

const ROLE_CFG = {
  cliente: {
    label: "Cliente",
    color: "#6b7280",
    bg: "#f3f4f6",
    rowBg: "",
    borderClass: "",
  },
  mayorista: {
    label: "Mayorista",
    color: "#1d4ed8",
    bg: "#dbeafe",
    rowBg: "bg-blue-50",
    borderClass: "",
  },
  tienda: {
    label: "Tienda",
    color: "#15803d",
    bg: "#dcfce7",
    rowBg: "bg-green-50",
    borderClass: "",
  },
};

const INCIDENT_TYPES: Record<string, string> = {
  no_recibido: "No recibido",
  producto_defectuoso: "Producto defectuoso",
  producto_incorrecto: "Producto incorrecto",
  falta_producto: "Falta producto",
  otro: "Otro motivo",
};

const STATUS_FLOW: AdminOrderStatus[] = [
  "pendiente_envio",
  "enviado",
];

const EMAIL_TEMPLATES = [
  {
    id: "preparando",
    label: "Pedido en preparación",
    subject: "Tu pedido está siendo preparado",
    body: "Hola,\n\nTu pedido está pendiente de envío y lo estamos preparando. En breve recibirás el número de seguimiento.\n\nGracias por confiar en TCG Academy.",
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
  if (order.adminStatus !== "pendiente_envio") return false;
  const entry = order.statusHistory.find((h) => h.status === "pendiente_envio");
  return entry ? hoursAgo(entry.date) >= 48 : false;
}

// ─── Small components ─────────────────────────────────────────────────────────

function _StatusBadge({ status }: { status: AdminOrderStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold"
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

function StatusDropdown({
  status,
  onUpdate,
}: {
  status: AdminOrderStatus;
  onUpdate: (s: AdminOrderStatus) => void;
}) {
  const cfg = STATUS_CFG[status];
  return (
    <span className="relative inline-block">
      <select
        value={status}
        onChange={(e) => onUpdate(e.target.value as AdminOrderStatus)}
        onClick={(e) => e.stopPropagation()}
        className="cursor-pointer appearance-none rounded-full border pr-7 pl-2.5 py-0.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-offset-1"
        style={{
          color: cfg.color,
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
        }}
        aria-label={`Estado del pedido: ${cfg.label}`}
      >
        {(Object.keys(STATUS_CFG) as AdminOrderStatus[]).map((s) => (
          <option key={s} value={s}>
            {STATUS_CFG[s].label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2"
        style={{ color: cfg.color }}
        aria-hidden="true"
      />
    </span>
  );
}

function RoleBadge({ role }: { role: "cliente" | "mayorista" | "tienda" }) {
  if (role === "cliente") return null;
  const cfg = ROLE_CFG[role];
  return (
    <span
      className="ml-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}


function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="animate-fade-in fixed right-6 bottom-6 z-50 flex max-w-sm items-center gap-3 rounded-2xl bg-[#2563eb] px-5 py-3 text-white shadow-xl">
      <Check size={16} className="flex-shrink-0 text-green-300" />
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
      {...clickableProps(onClose)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        {...clickableProps((e) => e?.stopPropagation())}
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <Mail size={16} className="text-[#2563eb]" /> Enviar email a{" "}
            {order.userName}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-6 py-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Plantilla
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EMAIL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTpl(t.id)}
                  className={`rounded-lg border px-2.5 py-1 text-xs transition ${tplId === t.id ? "border-[#2563eb] bg-[#2563eb] text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Para
            </label>
            <div className="rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm text-gray-600">
              {order.userEmail}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Asunto
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Mensaje
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSend(subject, body)}
            disabled={!subject || !body}
            className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3b82f6] disabled:opacity-50"
          >
            <Mail size={14} /> Enviar email
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Invoice PDF (shared generator — identical to client-side invoice) ────────

function printInvoicePDF(order: AdminOrder) {
  const invNum = generateInvoiceNumber(order.id);
  const parsed = order.address ? parseFiscalAddress(order.address) : null;
  const data = buildInvoiceFromOrder(
    {
      id: order.id,
      date: order.date,
      items: order.items.map((i) => ({ name: i.name, quantity: i.qty, price: i.price })),
      shipping: order.shipping,
      total: order.total,
      paymentMethod: order.paymentMethod,
      clientName: order.userName,
      shippingAddress: {
        nombre: order.userName,
        email: order.userEmail,
        direccion: parsed?.street,
        cp: parsed?.postalCode || undefined,
        ciudad: parsed?.city,
        pais: parsed?.country ?? "España",
      },
    },
    invNum,
  );
  void printInvoiceWithCSV(data);
}

// ─── Albarán print ────────────────────────────────────────────────────────────

// ─── Expanded order panel ─────────────────────────────────────────────────────

function OrderPanel({
  order,
  onUpdateStatus,
  onSaveNotes,
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
    <div className="border-t-2 border-[#2563eb]/10 bg-white">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-gray-100 px-3">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as typeof tab)}
            className={`flex items-center gap-1 border-b-2 px-2.5 py-2 text-xs font-semibold whitespace-nowrap transition ${tab === id ? "border-[#2563eb] text-[#2563eb]" : "border-transparent text-gray-500 hover:text-gray-700"} ${id === "incidencia" ? "text-orange-700" : ""}`}
          >
            <Icon size={12} /> {label}
            {id === "incidencia" && order.incident?.status === "abierta" && (
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 py-1.5 pl-3">
          <button
            onClick={() => printInvoicePDF(order)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-[#2563eb]"
          >
            <Printer size={13} /> Factura
          </button>
          <button
            onClick={() => onSendMessage(order)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-[#2563eb]"
          >
            <MessageSquare size={13} /> Mensaje
          </button>
        </div>
      </div>

      <div className="p-3">
        {/* ── Tab: Detalle ── */}
        {tab === "detalle" && (
          <div className="space-y-2">
            {/* Items */}
            <div>
              <p className="mb-1 text-xs font-bold tracking-wider text-gray-400 uppercase">
                Productos
              </p>
              <div className="space-y-0">
                {order.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 border-b border-gray-50 py-1.5 last:border-0"
                  >
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-gray-100 text-sm">
                      {item.game === "magic"
                        ? "🧙"
                        : item.game === "pokemon"
                          ? "⚡"
                          : item.game === "naruto"
                            ? "🍃"
                            : "🃏"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-800">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {item.qty}× · {item.price.toFixed(2)}€/ud
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold text-gray-900">
                      {(item.price * item.qty).toFixed(2)}€
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Meta + Totals */}
            <div className="grid gap-1.5 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs leading-snug">
                <p className="mb-0.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">Cliente</p>
                <p><Link href={`/admin/usuarios/${userIdToHandle(order.userId, MOCK_USERS)}`} className="font-medium text-[#2563eb] hover:underline">{order.userName}</Link></p>
                <p className="truncate font-mono text-[10px] text-gray-500">{order.userEmail}</p>
                <p className="mt-0.5"><RoleBadge role={order.userRole} /></p>
              </div>
              <div className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs leading-snug">
                <p className="mb-0.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">Pago y envío</p>
                <p className="font-medium">{order.paymentMethod}</p>
                <p className="truncate text-[10px] text-gray-500">{order.address}</p>
                {order.trackingNumber && (
                  <p className="mt-0.5 font-mono text-[10px] text-purple-600">{order.trackingNumber}</p>
                )}
              </div>
              <div className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs leading-snug">
                <p className="mb-0.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">Totales</p>
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">{order.subtotal.toFixed(2)}€</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Envío</span><span className="font-medium">{order.shipping === 0 ? "Gratis" : order.shipping.toFixed(2) + "€"}</span></div>
                <div className="mt-0.5 flex justify-between border-t border-gray-200 pt-0.5 font-bold"><span>Total</span><span className="text-[#2563eb]">{order.total.toFixed(2)}€</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Envío ── */}
        {tab === "envio" && (
          <div className="space-y-3">
            {/* Terminal state banner */}
            {(order.adminStatus === "cancelado" ||
              order.adminStatus === "devolucion") && (
              <div
                className={`flex items-center gap-3 rounded-xl p-3 ${order.adminStatus === "cancelado" ? "bg-gray-100" : "bg-purple-50"}`}
              >
                {order.adminStatus === "cancelado" ? (
                  <Ban size={16} className="flex-shrink-0 text-gray-500" />
                ) : (
                  <RotateCcw
                    size={16}
                    className="flex-shrink-0 text-purple-500"
                  />
                )}
                <p
                  className={`text-sm font-semibold ${order.adminStatus === "cancelado" ? "text-gray-600" : "text-purple-700"}`}
                >
                  {order.adminStatus === "cancelado"
                    ? "Pedido cancelado"
                    : "Devolución en proceso"}
                </p>
              </div>
            )}
            {/* Timeline */}
            <div>
              <p className="mb-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
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
                      className="flex flex-1 items-start last:flex-none"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{
                            backgroundColor: done ? cfg.color : "#e5e7eb",
                          }}
                        >
                          {done ? (
                            <Check size={12} />
                          ) : (
                            <span className="text-xs text-gray-400">
                              {i + 1}
                            </span>
                          )}
                        </div>
                        <p
                          className="mt-1 text-center text-[10px] font-semibold whitespace-nowrap"
                          style={{ color: active ? cfg.color : "#9ca3af" }}
                        >
                          {cfg.label}
                        </p>
                        {entry && (
                          <p className="text-center text-[9px] text-gray-400">
                            {fmtDateTime(entry.date)}
                          </p>
                        )}
                      </div>
                      {i < STATUS_FLOW.length - 1 && (
                        <div
                          className="mx-1 mt-3.5 h-0.5 flex-1"
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
            <div className="rounded-lg border border-gray-200 p-3">
              {order.adminStatus === "pendiente_envio" &&
                !order.trackingNumber && (
                  <div className="flex items-center gap-2">
                    <Package
                      size={16}
                      className="flex-shrink-0 text-orange-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">
                        Pendiente de envío — en preparación
                      </p>
                      <p className="text-xs text-gray-500">
                        Introduce el número de seguimiento cuando lo envíes.
                      </p>
                    </div>
                  </div>
                )}

              {order.adminStatus === "pendiente_envio" && (
                <div className="space-y-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Truck size={16} className="text-blue-500" />
                    <p className="text-sm font-semibold text-gray-800">
                      Marcar como enviado
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">
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
                      className={`h-10 w-full rounded-xl border-2 px-3 font-mono text-sm transition focus:outline-none ${trackingError ? "border-red-400" : "border-gray-200 focus:border-[#2563eb]"}`}
                    />
                    {trackingError && (
                      <p className="mt-1 text-xs text-red-500">
                        {trackingError}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleMarkEnviado}
                    className="flex items-center gap-1.5 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#3b82f6]"
                  >
                    <Truck size={14} /> Confirmar envío con GLS
                  </button>
                </div>
              )}

              {order.adminStatus === "enviado" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-purple-50 p-3">
                    <Truck
                      size={16}
                      className="flex-shrink-0 text-purple-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-purple-700">
                        Enviado con GLS
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-sm text-purple-600">
                          {order.trackingNumber}
                        </span>
                        <button
                          onClick={copyTracking}
                          className="text-purple-400 transition hover:text-purple-600"
                        >
                          <Copy size={12} />
                        </button>
                        <a
                          href={`https://www.gls-spain.es/es/seguimiento-envios/?match=${order.trackingNumber}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-400 transition hover:text-purple-600"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateStatus(order.id, "devolucion")}
                    className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-100"
                  >
                    <RotateCcw size={14} /> Registrar devolución
                  </button>
                </div>
              )}

              {order.adminStatus === "incidencia" && (
                <div className="flex items-center gap-3 rounded-xl bg-orange-50 p-3">
                  <AlertTriangle
                    size={16}
                    className="flex-shrink-0 text-orange-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-orange-800">
                      Hay una incidencia abierta
                    </p>
                    <button
                      onClick={() => setTab("incidencia")}
                      className="text-xs text-orange-600 hover:underline"
                    >
                      Ver incidencia →
                    </button>
                  </div>
                </div>
              )}

              {order.adminStatus === "cancelado" && (
                <div className="flex items-center gap-3 rounded-xl bg-gray-100 p-3">
                  <Ban size={16} className="flex-shrink-0 text-gray-500" />
                  <p className="text-sm font-semibold text-gray-600">
                    Pedido cancelado
                  </p>
                </div>
              )}

              {order.adminStatus === "devolucion" && (
                <div className="flex items-center gap-3 rounded-xl bg-purple-50 p-3">
                  <RotateCcw
                    size={16}
                    className="flex-shrink-0 text-purple-500"
                  />
                  <p className="text-sm font-semibold text-purple-700">
                    Devolución en proceso
                  </p>
                </div>
              )}

              {/* Cancel button — available for all active (non-terminal) states */}
              {!["cancelado", "devolucion"].includes(
                order.adminStatus,
              ) && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => onUpdateStatus(order.id, "cancelado")}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Ban size={12} /> Cancelar pedido
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Incidencia ── */}
        {tab === "incidencia" && order.incident && (
          <div className="space-y-2">
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-bold text-orange-800">
                  {INCIDENT_TYPES[order.incident.type] ?? order.incident.type}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${order.incident.status === "resuelta" ? "bg-green-100 text-green-700" : order.incident.status === "en_revision" ? "bg-orange-100 text-orange-700" : "bg-orange-100 text-orange-800"}`}
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
              <p className="mt-1 text-xs text-gray-400">
                {fmtDateTime(order.incident.date)}
              </p>
            </div>

            {/* Message thread */}
            <div className="space-y-2">
              <p className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                Historial de mensajes
              </p>
              {order.incident.messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${m.from === "admin" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${m.from === "admin" ? "bg-[#2563eb] text-white" : "bg-gray-200 text-gray-600"}`}
                  >
                    {m.from === "admin" ? "A" : order.userName[0]}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${m.from === "admin" ? "bg-[#2563eb] text-white" : "bg-gray-100 text-gray-700"}`}
                  >
                    <p>{m.text}</p>
                    <p
                      className={`mt-1 text-[10px] ${m.from === "admin" ? "text-blue-200" : "text-gray-400"}`}
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
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => onResolveIncident(order.id, incidentReply)}
                    disabled={!incidentReply.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
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
          <div className="space-y-2">
            <p className="text-xs text-gray-400">
              Notas internas — solo visibles para el admin. No las ve el
              cliente.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade notas sobre este pedido..."
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none"
            />
            <button
              onClick={() => onSaveNotes(order.id, notes)}
              className="flex items-center gap-1.5 rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#3b82f6]"
            >
              <Check size={13} /> Guardar notas
            </button>
          </div>
        )}

        {/* ── Tab: Historial ── */}
        {tab === "historial" && (
          <div className="space-y-2">
            <p className="mb-1 text-xs font-bold tracking-wider text-gray-400 uppercase">
              Log de cambios de estado
            </p>
            <div className="space-y-0">
              {[...order.statusHistory].reverse().map((entry, i) => {
                const cfg = STATUS_CFG[entry.status];
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2 border-b border-gray-50 py-1.5 last:border-0"
                  >
                    <div
                      className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full"
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
      {...clickableProps(onClose)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        {...clickableProps((e) => e?.stopPropagation())}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <MessageSquare size={16} className="text-[#2563eb]" /> Mensaje a{" "}
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
          <p className="mb-2 text-xs text-gray-400">
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
            className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#2563eb] focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSend(body)}
            disabled={!body.trim()}
            className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3b82f6] disabled:opacity-50"
          >
            <Send size={13} /> Enviar mensaje
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type PedidoSortField = "date" | "total" | "status";

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: PedidoSortField;
  sortField: PedidoSortField;
  sortDir: "asc" | "desc";
}) {
  if (sortField !== field) return null;
  return sortDir === "asc" ? (
    <ChevronUp size={11} />
  ) : (
    <ChevronDown size={11} />
  );
}

const DEMO_BANNER_KEY = "tcgacademy_demo_pedidos_dismissed";

export default function AdminPedidosPage() {
  const [showDemoBanner, setShowDemoBanner] = useState(() => {
    try {
      return typeof window !== "undefined"
        ? !localStorage.getItem(DEMO_BANNER_KEY)
        : false;
    } catch {
      return true;
    }
  });

  const dismissDemoBanner = () => {
    try {
      localStorage.setItem(DEMO_BANNER_KEY, "1");
    } catch {}
    setShowDemoBanner(false);
  };

  // Merge robusto: lee `tcgacademy_admin_orders` + recupera cualquier pedido
  // huérfano que el checkout escribió sólo en `tcgacademy_orders`. Así NINGÚN
  // pedido real puede quedar invisible para el admin, ni aunque falle el
  // mirror al inbox (ej. quota llena durante el checkout).
  //
  // Regla 2026-04-18: los pagos DIFERIDOS sin confirmar cobro (recogida en
  // tienda, transferencia, contrarreembolso) NO son pedidos — son intenciones
  // gestionadas por email. Se filtran aquí para que no aparezcan ni en la
  // tabla ni en los contadores. Si alguna vez alguien marca paymentStatus =
  // "cobrado" sobre uno de estos (flujo heredado), entonces sí entra.
  // `isAdminVisibleOrder` vive en orderAdapter.ts y es el SSOT de visibilidad.
  // Tanto esta tabla como `countPendingOrdersToShip` (badge cabecera/sidebar)
  // lo usan, así que los contadores no pueden desfasarse.
  const [orders, setOrders] = useState<AdminOrder[]>(() => {
    if (typeof window === "undefined") return ADMIN_ORDERS.filter(isAdminVisibleOrder);
    return readAdminOrdersMerged(ADMIN_ORDERS).filter(isAdminVisibleOrder);
  });

  // Refresca al volver del background (ej. completar un pedido en otra pestaña).
  useEffect(() => {
    const onFocus = () =>
      setOrders(readAdminOrdersMerged(ADMIN_ORDERS).filter(isAdminVisibleOrder));
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onFocus);
    window.addEventListener("tcga:orders:updated", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onFocus);
      window.removeEventListener("tcga:orders:updated", onFocus);
    };
  }, []);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminOrderStatus | "">("");
  const [roleFilter, setRoleFilter] = useState<
    "cliente" | "mayorista" | "tienda" | ""
  >("");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [timeRange, setTimeRange] = useState<
    "1d" | "1w" | "1m" | "3m" | "1y" | "all"
  >("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState<AdminOrder | null>(null);
  const [messageModal, setMessageModal] = useState<AdminOrder | null>(null);
  const [shipModal, setShipModal] = useState<AdminOrder | null>(null);
  const [sortField, setSortField] = useState<"date" | "total" | "status">(
    "date",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  // Reset page when any filter changes
  useEffect(() => {

    setPage(1);
  }, [statusFilter, roleFilter, urgentOnly, search, timeRange]);

  const persistOrders = (next: AdminOrder[]) => {
    setOrders(next);
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next));
      // Notifica al sidebar/badge/dashboard para que reflejen el cambio sin refrescar.
      window.dispatchEvent(new Event("tcga:orders:updated"));
    } catch {}
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // ── Time-range filter ──
  // Rango seleccionado por el admin. Los contadores y la lista se filtran
  // por `date` del pedido (YYYY-MM-DD). "all" = sin filtrar.
  const timeRangeDays: Record<typeof timeRange, number | null> = {
    "1d": 1,
    "1w": 7,
    "1m": 30,
    "3m": 90,
    "1y": 365,
    all: null,
  };
  const ordersInRange = useMemo(() => {
    const days = timeRangeDays[timeRange];
    if (days == null) return orders;
    const cutoff = Date.now() - days * 86_400_000;
    return orders.filter((o) => {
      const t = new Date(o.date).getTime();
      return !Number.isNaN(t) && t >= cutoff;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, timeRange]);

  // ── Summary counts (respetan el time range) ──
  const counts = useMemo(
    () => ({
      pendientes: ordersInRange.filter((o) => o.adminStatus === "pendiente_envio")
        .length,
      enviados: ordersInRange.filter((o) => o.adminStatus === "enviado").length,
      incidencias: ordersInRange.filter((o) => o.adminStatus === "incidencia").length,
      cancelados: ordersInRange.filter((o) => o.adminStatus === "cancelado").length,
      devoluciones: ordersInRange.filter((o) => o.adminStatus === "devolucion").length,
      urgentes: ordersInRange.filter(isUrgent).length,
    }),
    [ordersInRange],
  );

  // ── Filtered + sorted ──
  const filtered = useMemo(() => {
    let list = ordersInRange.filter((o) => {
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
    ordersInRange,
    search,
    statusFilter,
    roleFilter,
    urgentOnly,
    sortField,
    sortDir,
  ]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Handlers ──

  const handleUpdateStatus = async (
    id: string,
    status: AdminOrderStatus,
    tracking?: string,
    carrier: Carrier = "GLS",
  ) => {
    const now = new Date().toISOString();
    const previousOrder = orders.find((o) => o.id === id);
    const previousStatus = previousOrder?.adminStatus ?? "unknown";

    // Skip if status hasn't changed
    if (previousStatus === status) return;

    // Build the history note inline so state + note persist in ONE write.
    // (Llamar a persistOrders dos veces en el mismo handler reutilizaba el
    // closure stale de `orders` y revertía el cambio de estado — bug 2026-04-18.)
    const isStockRestoring =
      status === "cancelado" || status === "devolucion";
    const historyNote = tracking
      ? `${carrier} ${tracking}`
      : status === "cancelado"
        ? "Stock restaurado por cancelación"
        : status === "devolucion"
          ? "Stock restaurado por devolución"
          : undefined;

    persistOrders(
      orders.map((o) => {
        if (o.id !== id) return o;
        // Don't register if status hasn't changed
        if (o.adminStatus === status) return o;
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
              ...(historyNote ? { note: historyNote } : {}),
            },
          ],
        };
      }),
    );

    // Audit trail — log status change
    logAudit({
      entityType: "order",
      entityId: id,
      action: "status_change",
      field: "status",
      oldValue: previousStatus,
      newValue: status,
      performedBy: "admin",
    });

    // Audit trail — log tracking number if provided
    if (tracking) {
      logAudit({
        entityType: "order",
        entityId: id,
        action: "tracking_added",
        field: "trackingNumber",
        oldValue: previousOrder?.trackingNumber ?? "",
        newValue: tracking,
        performedBy: "admin",
      });
    }

    // Restore stock when order is cancelled or returned.
    // Usa persistProductPatch para que la restauración llegue a la colección
    // correcta (admin-created → tcgacademy_new_products; estático →
    // tcgacademy_product_overrides). Antes se escribía siempre a overrides y
    // los productos admin-created cancelados no recuperaban stock. GOTCHA 5.
    if (isStockRestoring && previousOrder) {
      try {
        for (const item of previousOrder.items) {
          const merged = getMergedById(item.id);
          const currentStock =
            typeof merged?.stock === "number" ? merged.stock : undefined;
          if (currentStock !== undefined) {
            persistProductPatch(item.id, {
              stock: currentStock + item.qty,
              inStock: true,
            });
          }
        }
        window.dispatchEvent(new Event("tcga:products:updated"));
      } catch {
        /* ignore */
      }
    }

    const labels: Record<AdminOrderStatus, string> = {
      pendiente_envio: "Pendiente de envío",
      enviado: "Enviado",
      incidencia: "Incidencia",
      cancelado: "Cancelado",
      devolucion: "Devolución",
    };
    showToast(
      `Pedido ${id} → ${labels[status]}${tracking ? ` · Tracking: ${tracking}` : ""}`,
    );

    // Auto-notify customer on relevant status changes
    const emailSubjects: Partial<Record<AdminOrderStatus, string>> = {
      enviado: `Tu pedido ${id} ha sido enviado`,
      cancelado: `Tu pedido ${id} ha sido cancelado`,
      incidencia: `Incidencia con tu pedido ${id}`,
    };
    const emailBodies: Partial<Record<AdminOrderStatus, string>> = {
      enviado: `Hola, tu pedido ${id} ha sido enviado.${tracking ? ` Número de seguimiento: ${tracking}` : ""} Gracias por confiar en TCG Academy.`,
      cancelado: `Hola, tu pedido ${id} ha sido cancelado. Si tienes alguna duda, no dudes en contactarnos.`,
      incidencia: `Hola, hemos registrado una incidencia en tu pedido ${id}. Nuestro equipo se pondrá en contacto contigo para resolverla.`,
    };

    const subject = emailSubjects[status];
    if (subject) {
      const order = orders.find((o) => o.id === id);
      if (order) {
        // Map admin status → template id (si existe). sendAppEmail() renderiza
        // la plantilla admin-editable y además envía vía Resend en server mode.
        const TEMPLATE_BY_STATUS: Partial<Record<AdminOrderStatus, string>> = {
          enviado: "pedido_enviado",
        };
        const templateId = TEMPLATE_BY_STATUS[status];
        let finalSubject = subject;
        const preview = emailBodies[status] ?? "";

        if (templateId === "pedido_enviado") {
          const effectiveTracking = tracking ?? order.trackingNumber ?? "";
          const res = await sendAppEmail({
            toEmail: order.userEmail,
            toName: order.userName,
            templateId,
            vars: {
              nombre: order.userName.split(" ")[0] ?? order.userName,
              order_id: id,
              tracking_number: effectiveTracking,
              carrier,
              tracking_url: effectiveTracking
                ? buildTrackingUrl(carrier, effectiveTracking)
                : "",
              unsubscribe_link: "#",
            },
            preview: `Pedido enviado · ${carrier} ${tracking ?? "pendiente"}`,
          });
          if (res.ok) {
            // Mantener finalSubject alineado con el asunto de la plantilla
            // (para la notificación in-app coherente con el email enviado).
            finalSubject = `Tu pedido ${id} ha sido enviado`;
          }
        } else {
          // Sin plantilla dedicada (cancelado / incidencia) — usamos la
          // plantilla genérica que exista; si no, sendAppEmail devuelve ok=false
          // y el log queda vacío. Mejor un template dedicado en el futuro.
          const fallbackTemplate =
            status === "cancelado" ? "pedido_cancelado" : null;
          if (fallbackTemplate) {
            await sendAppEmail({
              toEmail: order.userEmail,
              toName: order.userName,
              templateId: fallbackTemplate,
              vars: {
                nombre: order.userName.split(" ")[0] ?? order.userName,
                order_id: id,
                unsubscribe_link: "#",
              },
              preview,
            });
          }
        }

        // Create in-app notification via canonical service
        // (writes to `tcgacademy_notif_dynamic` as `Record<userId, Notification[]>`
        //  y emite DataHub("notifications")).
        pushUserNotification(order.userId, {
          type: status === "enviado" ? "envio" : "pedido",
          title: finalSubject,
          message: preview,
          date: now,
          link: `/cuenta/pedidos`,
        });
      }
    }
  };

  // Wrapper: cambiar a "enviado" abre el ShipModal (pide tracking + carrier)
  // salvo que la llamada ya traiga tracking (p. ej. desde el tab de Envío del
  // panel expandido, donde el admin ya lo tecleó inline). El resto de
  // transiciones van directas a handleUpdateStatus.
  const requestStatusChange = (
    id: string,
    next: AdminOrderStatus,
    tracking?: string,
  ) => {
    if (next === "enviado" && !tracking) {
      const order = orders.find((o) => o.id === id);
      if (order && order.adminStatus !== "enviado") {
        setShipModal(order);
        return;
      }
    }
    handleUpdateStatus(id, next, tracking);
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
    _body: string,
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
    // Escritura canónica: messageService asigna id/date/read y emite
    // `tcga:messages:updated` para que admin/mensajes, cuenta/mensajes y el
    // panel de notificaciones se refresquen sin más lógica.
    sendCanonicalMessage({
      fromUserId: "admin",
      toUserId: order.userId,
      fromName: "TCG Academy",
      toName: order.userName,
      subject: `Re: Pedido ${order.id}`,
      body,
      orderId: order.id,
    });
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
      {shipModal && (
        <ShipModal
          order={shipModal}
          onClose={() => setShipModal(null)}
          onConfirm={(tracking, carrier) => {
            handleUpdateStatus(shipModal.id, "enviado", tracking, carrier);
            setShipModal(null);
          }}
        />
      )}

      {showDemoBanner && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Info size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
          <p className="flex-1 text-sm text-amber-800">
            <strong>Modo demo:</strong> estos pedidos son datos de ejemplo para
            demostración. En producción se conectarán con el sistema real de
            pedidos.
          </p>
          <button
            onClick={dismissDemoBanner}
            className="flex-shrink-0 text-amber-400 transition hover:text-amber-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de pedidos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Todos los pedidos de clientes
        </p>
      </div>

      {/* Time range selector */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">Periodo:</span>
        {([
          { id: "1d", label: "1 día" },
          { id: "1w", label: "1 semana" },
          { id: "1m", label: "1 mes" },
          { id: "3m", label: "3 meses" },
          { id: "1y", label: "1 año" },
          { id: "all", label: "Todo" },
        ] as const).map((r) => {
          const active = timeRange === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setTimeRange(r.id)}
              className={`h-8 rounded-lg border px-3 text-xs font-semibold transition ${
                active
                  ? "border-[#2563eb] bg-[#2563eb] text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {/* Summary bar — sólo estados de ENVÍO (dimensión adminStatus) */}
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          {
            label: "Urgentes (+48h)",
            value: counts.urgentes,
            color: "#dc2626",
            bg: "#fff1f2",
            filter: null,
            kind: "urgent" as const,
          },
          {
            label: "Pendientes",
            value: counts.pendientes,
            color: "#a16207",
            bg: "#fef9c3",
            filter: "pendiente_envio" as const,
            kind: "status" as const,
          },
          {
            label: "Incidencias",
            value: counts.incidencias,
            color: "#c2410c",
            bg: "#fff7ed",
            filter: "incidencia" as const,
          },
          {
            label: "Cancelados",
            value: counts.cancelados,
            color: "#374151",
            bg: "#f3f4f6",
            filter: "cancelado" as const,
          },
          {
            label: "Devoluciones",
            value: counts.devoluciones,
            color: "#6d28d9",
            bg: "#ede9fe",
            filter: "devolucion" as const,
          },
          {
            label: "Enviados",
            value: counts.enviados,
            color: "#15803d",
            bg: "#dcfce7",
            filter: "enviado" as const,
          },
        ].map((entry) => {
          const { label, value, color, bg, filter } = entry;
          const kind = "kind" in entry ? entry.kind : "status";
          const isActive =
            kind === "urgent"
              ? urgentOnly
              : filter
                ? statusFilter === filter
                : false;
          return (
          <button
            key={label}
            onClick={() => {
              if (kind === "urgent") {
                setUrgentOnly((u) => !u);
              } else if (filter) {
                const next = statusFilter === filter ? "" : filter;
                setStatusFilter(next);
                if (next) { setSortField("date"); setSortDir("desc"); }
              }
              setPage(1);
            }}
            className={`rounded-xl border-2 p-3 text-left transition ${isActive ? "border-current" : "border-transparent"}`}
            style={{ backgroundColor: bg, color }}
          >
            <p className="text-2xl font-bold">{value}</p>
            <p className="mt-0.5 text-xs font-semibold">{label}</p>
          </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pedido, cliente, email..."
            className="h-9 w-full rounded-xl border border-gray-200 pr-3 pl-8 text-sm focus:border-[#2563eb] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as AdminOrderStatus | "")
          }
          className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:border-[#2563eb] focus:outline-none"
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
          className="h-9 rounded-xl border px-3 text-sm font-semibold focus:outline-none transition"
          style={
            roleFilter && ROLE_CFG[roleFilter as "cliente" | "mayorista" | "tienda"]
              ? {
                  color: ROLE_CFG[roleFilter as "cliente" | "mayorista" | "tienda"].color,
                  backgroundColor: ROLE_CFG[roleFilter as "cliente" | "mayorista" | "tienda"].bg,
                  borderColor: ROLE_CFG[roleFilter as "cliente" | "mayorista" | "tienda"].color + "55",
                }
              : { backgroundColor: "white", borderColor: "#e5e7eb", color: "#374151" }
          }
        >
          <option value="">Todos los tipos</option>
          <option value="cliente">Cliente</option>
          <option value="mayorista">Mayorista</option>
          <option value="tienda">Tienda</option>
        </select>
        {(search || statusFilter || roleFilter || urgentOnly) && (
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setRoleFilter("");
              setUrgentOnly(false);
            }}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          >
            <X size={11} /> Limpiar filtros
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">
          {filtered.length} pedidos
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[11px] tracking-widest text-gray-500 uppercase">
                <th className="px-4 py-3 text-left font-bold">
                  <button
                    className="flex items-center gap-1 hover:text-gray-700"
                    onClick={() => toggleSort("date")}
                  >
                    PEDIDO{" "}
                    <SortIcon
                      field="date"
                      sortField={sortField}
                      sortDir={sortDir}
                    />
                  </button>
                </th>
                <th className="hidden px-3 py-3 text-left font-bold md:table-cell">
                  CLIENTE
                </th>
                <th className="hidden px-3 py-3 text-left font-bold sm:table-cell">
                  FECHA
                </th>
                <th className="px-3 py-3 text-right font-bold">
                  <button
                    className="ml-auto flex items-center gap-1 hover:text-gray-700"
                    onClick={() => toggleSort("total")}
                  >
                    TOTAL{" "}
                    <SortIcon
                      field="total"
                      sortField={sortField}
                      sortDir={sortDir}
                    />
                  </button>
                </th>
                <th className="px-3 py-3 text-center font-bold">
                  <button
                    className="mx-auto flex items-center gap-1 hover:text-gray-700"
                    onClick={() => toggleSort("status")}
                  >
                    ESTADO{" "}
                    <SortIcon
                      field="status"
                      sortField={sortField}
                      sortDir={sortDir}
                    />
                  </button>
                </th>
                <th className="w-6 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map((order) => {
                const isOpen = expanded === order.id;
                const urgent = isUrgent(order);
                const roleCfg = ROLE_CFG[order.userRole];
                return (
                  <>
                    <tr
                      key={order.id}
                      className={`cursor-pointer transition ${roleCfg.rowBg} ${roleCfg.borderClass} hover:brightness-95 ${isOpen ? "ring-1 ring-blue-200 ring-inset" : ""} ${urgent ? "border-l-[3px] border-l-red-500" : ""}`}
                      onClick={() => setExpanded(isOpen ? null : order.id)}
                    >
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/admin/pedidos/${order.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[#2563eb] no-underline hover:no-underline"
                        >
                          {order.id}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1">
                          {urgent && (
                            <span className="flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-600">
                              <Clock size={8} /> +48h sin procesar
                            </span>
                          )}
                          {order.incident && (
                            <span className="flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-600">
                              <AlertTriangle size={8} /> Incidencia
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 text-sm md:table-cell">
                        <Link
                          href={`/admin/usuarios/${userIdToHandle(order.userId, MOCK_USERS)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#2563eb] no-underline hover:no-underline"
                        >
                          {order.userName}
                        </Link>
                        <RoleBadge role={order.userRole} />
                      </td>
                      <td className="hidden px-3 py-3 text-sm whitespace-nowrap text-gray-500 sm:table-cell">
                        {fmtDate(order.date)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm whitespace-nowrap text-gray-900">
                        {order.total.toFixed(2)}€
                      </td>
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <StatusDropdown
                          status={order.adminStatus}
                          onUpdate={(s) => requestStatusChange(order.id, s)}
                        />
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
                            onUpdateStatus={requestStatusChange}
                            onSaveNotes={handleSaveNotes}
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
          <div className="py-16 text-center text-gray-400">
            <Package size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              No se encontraron pedidos con los filtros aplicados
            </p>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} pedidos
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-40"
              >
                ← Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (arr[idx - 1] as number) < p - 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`min-w-[28px] rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${page === p ? "border-[#2563eb] bg-[#2563eb] text-white" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
                    >
                      {p}
                    </button>
                  ),
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
