"use client";
import { useState, useMemo, useRef, useEffect } from "react";
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
  MSG_STORAGE_KEY,
  ORDER_STORAGE_KEY,
  type AdminOrder,
  type AdminOrderStatus,
  type AppMessage,
} from "@/data/mockData";
import {
  buildInvoiceFromOrder,
  printInvoiceWithCSV,
  generateInvoiceNumber,
} from "@/utils/invoiceGenerator";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 50;

const STATUS_CFG: Record<
  AdminOrderStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  pendiente_envio: {
    label: "Pendiente de envío",
    color: "#c2410c",
    bg: "#fff7ed",
    border: "#fed7aa",
  },
  enviado: {
    label: "Enviado",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
  },
  finalizado: {
    label: "Entregado",
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
    label: "Mayoristas",
    color: "#1d4ed8",
    bg: "#dbeafe",
    rowBg: "bg-blue-100",
    borderClass: "border-l-4 border-l-blue-400",
  },
  tienda: {
    label: "Tiendas TCG",
    color: "#15803d",
    bg: "#dcfce7",
    rowBg: "bg-green-100",
    borderClass: "border-l-4 border-l-green-400",
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
  "finalizado",
];
// Terminal states not in main flow
const _TERMINAL_STATES: AdminOrderStatus[] = ["cancelado", "devolucion"];

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
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const cfg = STATUS_CFG[status];

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
    }
    setOpen((o) => !o);
  }

  return (
    <div className="inline-block">
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold transition hover:opacity-75"
        style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
        title="Cambiar estado"
        aria-label={`Estado: ${cfg.label}. Pulsa para cambiar`}
      >
        {cfg.label}
        <ChevronDown
          size={10}
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && coords && (
        <div
          ref={ref}
          className="fixed z-[9999] w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
          style={{ top: coords.top, left: coords.left, transform: "translateX(-50%)" }}
        >
          {(Object.keys(STATUS_CFG) as AdminOrderStatus[]).map((s) => {
            const c = STATUS_CFG[s];
            const active = s === status;
            return (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!active) onUpdate(s);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold transition hover:bg-gray-50 ${active ? "cursor-default opacity-40" : ""}`}
              >
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                {c.label}
                {active && <Check size={10} className="ml-auto text-gray-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: "cliente" | "mayorista" | "tienda" }) {
  const cfg = ROLE_CFG[role];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
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
  const addrParts = order.address ? order.address.split(",").map((s) => s.trim()) : [];
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
        direccion: addrParts[0],
        cp: addrParts[1]?.match(/\d{5}/)?.[0],
        ciudad: addrParts[1]?.replace(/\d{5}\s*/, "").trim() || addrParts[2],
        pais: "España",
      },
    },
    invNum,
  );
  void printInvoiceWithCSV(data);
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
    <div className="border-t-2 border-[#2563eb]/10 bg-white">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-gray-100 px-4">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as typeof tab)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-semibold whitespace-nowrap transition ${tab === id ? "border-[#2563eb] text-[#2563eb]" : "border-transparent text-gray-500 hover:text-gray-700"} ${id === "incidencia" ? "text-red-600" : ""}`}
          >
            <Icon size={13} /> {label}
            {id === "incidencia" && order.incident?.status === "abierta" && (
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 py-2 pl-4">
          <button
            onClick={() => printInvoicePDF(order)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-[#2563eb]"
          >
            <Printer size={13} /> Factura
          </button>
          <button
            onClick={() => printAlbaran(order)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-[#2563eb]"
          >
            <Printer size={13} /> Albarán
          </button>
          <button
            onClick={() => onSendEmail(order)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-[#2563eb]"
          >
            <Mail size={13} /> Email
          </button>
          <button
            onClick={() => onSendMessage(order)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-[#2563eb]"
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
              <p className="mb-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
                Productos
              </p>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 border-b border-gray-50 py-2 last:border-0"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-base">
                      {item.game === "magic"
                        ? "🧙"
                        : item.game === "pokemon"
                          ? "⚡"
                          : item.game === "naruto"
                            ? "🍃"
                            : "🃏"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {item.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="text-xs text-gray-400">
                          {item.qty}× · {item.price.toFixed(2)}€/ud
                        </p>
                        {item.qtyShipped !== undefined &&
                          item.qtyShipped < item.qty && (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                              Enviado: {item.qtyShipped}/{item.qty}
                            </span>
                          )}
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-sm font-bold text-gray-900">
                      {(item.price * item.qty).toFixed(2)}€
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Meta */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 rounded-xl bg-gray-50 p-3 text-xs">
                <p className="mb-1.5 font-bold text-gray-600">
                  Información del cliente
                </p>
                <p>
                  <span className="text-gray-400">Nombre:</span>{" "}
                  <Link
                    href={`/admin/usuarios/${order.userId}`}
                    className="font-medium text-[#2563eb] hover:underline"
                  >
                    {order.userName}
                  </Link>
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
              <div className="space-y-1 rounded-xl bg-gray-50 p-3 text-xs">
                <p className="mb-1.5 font-bold text-gray-600">Pago y envío</p>
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
            <div className="rounded-xl bg-gray-50 p-3 text-xs">
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
                    <span className="rounded bg-green-100 px-1 font-mono font-bold">
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
              <div className="mt-1 flex justify-between border-t border-gray-200 py-1 text-sm font-bold">
                <span>Total</span>
                <span className="text-[#2563eb]">
                  {order.total.toFixed(2)}€
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Envío ── */}
        {tab === "envio" && (
          <div className="space-y-5">
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
              <p className="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
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
            <div className="rounded-xl border border-gray-200 p-4">
              {order.adminStatus === "pendiente_envio" &&
                !order.trackingNumber && (
                  <div className="flex items-center gap-3">
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
                    onClick={() => onUpdateStatus(order.id, "finalizado")}
                    className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700"
                  >
                    <Check size={14} /> Marcar como finalizado (entregado)
                  </button>
                </div>
              )}

              {order.adminStatus === "finalizado" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-green-50 p-3">
                    <Check size={16} className="flex-shrink-0 text-green-600" />
                    <p className="text-sm font-semibold text-green-700">
                      Pedido entregado
                    </p>
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
                <div className="flex items-center gap-3 rounded-xl bg-red-50 p-3">
                  <AlertTriangle
                    size={16}
                    className="flex-shrink-0 text-red-500"
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
              {!["cancelado", "devolucion", "finalizado"].includes(
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
          <div className="space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold text-red-700">
                  {INCIDENT_TYPES[order.incident.type] ?? order.incident.type}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${order.incident.status === "resuelta" ? "bg-green-100 text-green-700" : order.incident.status === "en_revision" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}
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
            <div className="space-y-3">
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
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#2563eb] focus:outline-none"
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
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#2563eb] focus:outline-none"
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
          <div className="space-y-3">
            <p className="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
              Log de cambios de estado
            </p>
            <div className="space-y-2">
              {[...order.statusHistory].reverse().map((entry, i) => {
                const cfg = STATUS_CFG[entry.status];
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 border-b border-gray-50 py-2 last:border-0"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
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
  const [page, setPage] = useState(1);

  // Reset page when any filter changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [statusFilter, roleFilter, urgentOnly, search]);

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
      pendientes: orders.filter((o) => o.adminStatus === "pendiente_envio")
        .length,
      enviados: orders.filter((o) => o.adminStatus === "enviado").length,
      incidencias: orders.filter((o) => o.adminStatus === "incidencia").length,
      cancelados: orders.filter((o) => o.adminStatus === "cancelado").length,
      devoluciones: orders.filter((o) => o.adminStatus === "devolucion").length,
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

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      pendiente_envio: "Pendiente de envío",
      enviado: "Enviado",
      finalizado: "Entregado",
      incidencia: "Incidencia",
      cancelado: "Cancelado",
      devolucion: "Devolución",
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

      {/* Summary bar */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          {
            label: "Pendientes",
            value: counts.pendientes,
            color: "#c2410c",
            bg: "#fff7ed",
            filter: "pendiente_envio" as const,
          },
          {
            label: "Enviados",
            value: counts.enviados,
            color: "#7c3aed",
            bg: "#f5f3ff",
            filter: "enviado" as const,
          },
          {
            label: "Incidencias",
            value: counts.incidencias,
            color: "#dc2626",
            bg: "#fff1f2",
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
            label: "Urgentes (+48h)",
            value: counts.urgentes,
            color: "#92400e",
            bg: "#fef3c7",
            filter: null,
          },
        ].map(({ label, value, color, bg, filter }) => (
          <button
            key={label}
            onClick={() => {
              if (filter) {
                const next = statusFilter === filter ? "" : filter;
                setStatusFilter(next);
                if (next) { setSortField("date"); setSortDir("desc"); }
              } else {
                setUrgentOnly((u) => !u);
              }
              setPage(1);
            }}
            className={`rounded-xl border-2 p-3 text-left transition ${(filter ? statusFilter === filter : urgentOnly) ? "border-current" : "border-transparent"}`}
            style={{ backgroundColor: bg, color }}
          >
            <p className="text-2xl font-bold">{value}</p>
            <p className="mt-0.5 text-xs font-semibold">{label}</p>
          </button>
        ))}
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
          className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:border-[#2563eb] focus:outline-none"
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
              <tr className="border-b border-gray-100 bg-gray-50 text-xs tracking-wider text-gray-500 uppercase">
                <th className="px-4 py-3 text-left font-semibold">
                  <button
                    className="flex items-center gap-1 hover:text-gray-700"
                    onClick={() => toggleSort("date")}
                  >
                    Pedido{" "}
                    <SortIcon
                      field="date"
                      sortField={sortField}
                      sortDir={sortDir}
                    />
                  </button>
                </th>
                <th className="hidden px-3 py-3 text-left font-semibold md:table-cell">
                  Cliente
                </th>
                <th className="hidden px-3 py-3 text-left font-semibold sm:table-cell">
                  Fecha
                </th>
                <th className="px-3 py-3 text-right font-semibold">
                  <button
                    className="ml-auto flex items-center gap-1 hover:text-gray-700"
                    onClick={() => toggleSort("total")}
                  >
                    Total{" "}
                    <SortIcon
                      field="total"
                      sortField={sortField}
                      sortDir={sortDir}
                    />
                  </button>
                </th>
                <th className="px-3 py-3 text-center font-semibold">
                  <button
                    className="mx-auto flex items-center gap-1 hover:text-gray-700"
                    onClick={() => toggleSort("status")}
                  >
                    Estado{" "}
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
                      className={`cursor-pointer transition ${roleCfg.rowBg} ${roleCfg.borderClass} hover:brightness-95 ${isOpen ? "ring-1 ring-blue-200 ring-inset" : ""} ${urgent ? "border-l-[6px] border-l-amber-400" : ""}`}
                      onClick={() => setExpanded(isOpen ? null : order.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-bold text-[#2563eb]">
                          {order.id}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1">
                          {urgent && (
                            <span className="flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">
                              <Clock size={8} /> +48h sin procesar
                            </span>
                          )}
                          {order.incident && (
                            <span className="flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-600">
                              <AlertTriangle size={8} /> Incidencia
                            </span>
                          )}
                          {order.couponCode && (
                            <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[9px] font-bold text-green-700">
                              Cupón {order.couponCode}
                            </span>
                          )}
                          {order.items.some(
                            (i) =>
                              i.qtyShipped !== undefined &&
                              i.qtyShipped < i.qty,
                          ) && (
                            <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                              Envío parcial
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 md:table-cell">
                        <Link
                          href={`/admin/usuarios/${order.userId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-medium text-[#2563eb] hover:underline"
                        >
                          {order.userName}
                        </Link>
                        <RoleBadge role={order.userRole} />
                      </td>
                      <td className="hidden px-3 py-3 text-xs whitespace-nowrap text-gray-500 sm:table-cell">
                        {fmtDate(order.date)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold whitespace-nowrap text-gray-900">
                        {order.total.toFixed(2)}€
                      </td>
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <StatusDropdown
                          status={order.adminStatus}
                          onUpdate={(s) => handleUpdateStatus(order.id, s)}
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
