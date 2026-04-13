"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Truck,
  User,
  Mail,
  MapPin,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  StickyNote,
  History,
  Store,
  Copy,
  ExternalLink,
  Tag,
  Shield,
  Printer,
  Receipt,
  Ban,
  RefreshCw,
} from "lucide-react";
import {
  ADMIN_ORDERS,
  ORDER_STORAGE_KEY,
  MSG_STORAGE_KEY,
  MOCK_MESSAGES,
  type AdminOrder,
  type AdminOrderStatus,
  type AppMessage,
} from "@/data/mockData";
import { GAME_CONFIG } from "@/data/products";
import { getMergedById } from "@/lib/productStore";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  AdminOrderStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  pendiente_envio: { label: "Pendiente de envío", color: "#a16207", bg: "#fef9c3", icon: Clock },
  enviado: { label: "Enviado", color: "#15803d", bg: "#dcfce7", icon: Truck },
  finalizado: { label: "Entregado", color: "#166534", bg: "#bbf7d0", icon: CheckCircle2 },
  incidencia: { label: "Incidencia", color: "#dc2626", bg: "#fee2e2", icon: AlertTriangle },
  cancelado: { label: "Cancelado", color: "#6b7280", bg: "#f3f4f6", icon: XCircle },
  devolucion: { label: "Devolución", color: "#c2410c", bg: "#ffedd5", icon: AlertTriangle },
};

const ROLE_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  cliente: { color: "#6b7280", bg: "#f3f4f6", label: "Cliente" },
  mayorista: { color: "#2563eb", bg: "#dbeafe", label: "Mayorista" },
  tienda: { color: "#16a34a", bg: "#dcfce7", label: "Tienda TCG" },
};

const PAYMENT_ICONS: Record<string, string> = {
  Visa: "💳", Mastercard: "💳", PayPal: "🅿️", Bizum: "📱",
  Transferencia: "🏦", transferencia: "🏦", Tarjeta: "💳",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadOrder(id: string): AdminOrder | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY);
    const orders: AdminOrder[] = raw ? JSON.parse(raw) : ADMIN_ORDERS;
    return orders.find((o) => o.id === id) ?? null;
  } catch {
    return ADMIN_ORDERS.find((o) => o.id === id) ?? null;
  }
}

function loadEmailLog(orderId: string): EmailLogEntry[] {
  try {
    const raw = localStorage.getItem("tcgacademy_email_log");
    if (!raw) return [];
    const all = JSON.parse(raw) as EmailLogEntry[];
    return all
      .filter((e) => e.orderId === orderId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch {
    return [];
  }
}

function loadMessages(orderId: string): AppMessage[] {
  try {
    const raw = localStorage.getItem(MSG_STORAGE_KEY);
    const msgs: AppMessage[] = raw ? JSON.parse(raw) : MOCK_MESSAGES;
    return msgs.filter((m) => m.orderId === orderId);
  } catch {
    return [];
  }
}

function timeStr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getPaymentIcon(method: string): string {
  for (const [key, icon] of Object.entries(PAYMENT_ICONS)) {
    if (method.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return "💳";
}

const PAYMENT_STATUS_KEY = "tcgacademy_payment_status";

function isManualPayment(method: string): boolean {
  const m = method.toLowerCase();
  return m.includes("transferencia") || m.includes("tienda") || m.includes("recogida");
}

function loadPaymentStatus(orderId: string, method: string): "cobrado" | "pendiente" {
  try {
    const all = JSON.parse(localStorage.getItem(PAYMENT_STATUS_KEY) ?? "{}");
    if (all[orderId]) return all[orderId];
    // Manual payments default to "pendiente", others to "cobrado"
    return isManualPayment(method) ? "pendiente" : "cobrado";
  } catch { return isManualPayment(method) ? "pendiente" : "cobrado"; }
}

function savePaymentStatus(orderId: string, status: "cobrado" | "pendiente") {
  try {
    const all = JSON.parse(localStorage.getItem(PAYMENT_STATUS_KEY) ?? "{}");
    all[orderId] = status;
    localStorage.setItem(PAYMENT_STATUS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

interface EmailLogEntry {
  date: string;
  to: string;
  subject: string;
  status: string;
  orderId?: string;
  body?: string;
}

function buildEmailHTML(type: string, order: AdminOrder): string {
  const name = order.userName.split("(")[0].split(" ")[0].trim();
  const itemRows = order.items.map((i) => {
    const gameName = GAME_CONFIG[i.game]?.name ?? i.game;
    return `<tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:14px">${i.name}<br><span style="font-size:11px;color:#9ca3af">${gameName}</span></td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:14px">${i.qty}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;font-weight:600">${(i.price * i.qty).toFixed(2)}€</td>
    </tr>`;
  }).join("");

  const couponLine = order.couponCode
    ? `<tr><td colspan="2" style="padding:6px 16px;text-align:right;color:#16a34a;font-size:13px">Cupón ${order.couponCode}</td><td style="padding:6px 16px;text-align:right;color:#16a34a;font-size:13px">-${order.couponDiscount?.toFixed(2)}€</td></tr>`
    : "";

  const header = `<div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:32px;text-align:center;border-radius:16px 16px 0 0">
    <h1 style="color:#fff;font-size:22px;margin:0 0 4px">TCG Academy</h1>
    <p style="color:#93c5fd;font-size:13px;margin:0">Tu tienda de cartas coleccionables</p>
  </div>`;

  const footer = `<div style="border-top:1px solid #e5e7eb;padding:20px;text-align:center;font-size:11px;color:#9ca3af">
    <p>© 2026 TCG Academy · tcgacademy.es</p>
    <p style="margin-top:4px">Este correo fue generado automáticamente. Por favor, no respondas a este mensaje.</p>
  </div>`;

  if (type === "confirmacion") {
    return `<div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
      ${header}
      <div style="padding:28px 24px">
        <h2 style="font-size:18px;color:#1e293b;margin:0 0 8px">¡Hola ${name}! Tu pedido ha sido confirmado</h2>
        <p style="font-size:14px;color:#64748b;margin:0 0 20px">Hemos recibido tu pedido <strong>${order.id}</strong> correctamente. Aquí tienes el resumen:</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead><tr style="background:#f8fafc"><th style="padding:8px 16px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.5px">Producto</th><th style="padding:8px 16px;text-align:center;font-size:11px;text-transform:uppercase;color:#6b7280">Uds.</th><th style="padding:8px 16px;text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280">Total</th></tr></thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr><td colspan="2" style="padding:6px 16px;text-align:right;font-size:13px;color:#6b7280">Subtotal</td><td style="padding:6px 16px;text-align:right;font-size:13px">${order.subtotal.toFixed(2)}€</td></tr>
            ${couponLine}
            <tr><td colspan="2" style="padding:6px 16px;text-align:right;font-size:13px;color:#6b7280">Envío</td><td style="padding:6px 16px;text-align:right;font-size:13px">${order.shipping === 0 ? "Gratuito" : order.shipping.toFixed(2) + "€"}</td></tr>
            <tr><td colspan="2" style="padding:10px 16px;text-align:right;font-size:16px;font-weight:800;border-top:2px solid #1e293b">Total</td><td style="padding:10px 16px;text-align:right;font-size:16px;font-weight:800;border-top:2px solid #1e293b">${order.total.toFixed(2)}€</td></tr>
          </tfoot>
        </table>
        <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:16px;font-size:13px">
          <p style="margin:0 0 6px"><strong>Dirección de envío:</strong> ${order.address}</p>
          <p style="margin:0"><strong>Método de pago:</strong> ${order.paymentMethod}</p>
        </div>
        <p style="font-size:14px;color:#64748b;margin:0">Te notificaremos por email cuando tu pedido sea enviado.</p>
        <p style="font-size:14px;color:#64748b;margin:16px 0 0">Gracias por tu compra,<br><strong>Equipo TCG Academy</strong></p>
      </div>
      ${footer}
    </div>`;
  }

  if (type === "enviado") {
    return `<div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
      ${header}
      <div style="padding:28px 24px">
        <h2 style="font-size:18px;color:#1e293b;margin:0 0 8px">Tu pedido ha sido enviado</h2>
        <p style="font-size:14px;color:#64748b;margin:0 0 20px">Tu pedido <strong>${order.id}</strong> está en camino.</p>
        ${order.trackingNumber ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:16px">
          <p style="font-size:13px;color:#166534;margin:0 0 6px"><strong>Número de seguimiento:</strong> ${order.trackingNumber}</p>
          <p style="font-size:13px;margin:0"><a href="https://www.gls-spain.es/es/ayuda/seguimiento-envios/?match=${order.trackingNumber}" style="color:#2563eb;font-weight:600">Rastrear envío en GLS →</a></p>
        </div>` : ""}
        <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:16px;font-size:13px">
          <p style="margin:0"><strong>Dirección de entrega:</strong> ${order.address}</p>
        </div>
        <p style="font-size:14px;color:#64748b;margin:0">Recibirás tu pedido en las próximas 24-48 horas laborables.</p>
        <p style="font-size:14px;color:#64748b;margin:16px 0 0">Un saludo,<br><strong>Equipo TCG Academy</strong></p>
      </div>
      ${footer}
    </div>`;
  }

  // entregado
  return `<div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
    ${header}
    <div style="padding:28px 24px">
      <h2 style="font-size:18px;color:#1e293b;margin:0 0 8px">Tu pedido ha sido entregado</h2>
      <p style="font-size:14px;color:#64748b;margin:0 0 20px">Tu pedido <strong>${order.id}</strong> ha sido entregado correctamente.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:16px;text-align:center">
        <p style="font-size:24px;margin:0 0 8px">✅</p>
        <p style="font-size:14px;font-weight:600;color:#166534;margin:0">Entrega confirmada</p>
      </div>
      <p style="font-size:14px;color:#64748b;margin:0 0 8px">Si tienes algún problema con tu pedido, no dudes en contactarnos:</p>
      <p style="font-size:13px;margin:0"><a href="mailto:tcgacademycalpe@gmail.com" style="color:#2563eb;font-weight:600">tcgacademycalpe@gmail.com</a></p>
      <p style="font-size:14px;color:#64748b;margin:20px 0 0">Gracias por confiar en nosotros,<br><strong>Equipo TCG Academy</strong></p>
    </div>
    ${footer}
  </div>`;
}

function ensureOrderEmails(order: AdminOrder) {
  try {
    const raw = localStorage.getItem("tcgacademy_email_log");
    const log: EmailLogEntry[] = raw ? JSON.parse(raw) : [];

    // Remove old entries for this order (clean regeneration)
    const cleaned = log.filter((e) => e.orderId !== order.id);
    const toAdd: EmailLogEntry[] = [];

    // Only 3 emails: confirmación, enviado, entregado
    const statusEmails: { status: AdminOrderStatus; subject: string; type: string; offset: number }[] = [
      { status: "pendiente_envio", subject: `Confirmación de pedido ${order.id}`, type: "confirmacion", offset: 0 },
      { status: "enviado", subject: `Tu pedido ${order.id} ha sido enviado`, type: "enviado", offset: 60000 },
      { status: "finalizado", subject: `Tu pedido ${order.id} ha sido entregado`, type: "entregado", offset: 120000 },
    ];

    for (const { status, subject, type, offset } of statusEmails) {
      const entry = order.statusHistory.find((h) => h.status === status);
      if (!entry) continue;
      const emailDate = new Date(new Date(entry.date).getTime() + offset).toISOString();
      toAdd.push({
        date: emailDate,
        to: order.userEmail,
        subject,
        status: "enviado",
        orderId: order.id,
        body: buildEmailHTML(type, order),
      });
    }

    if (toAdd.length > 0) {
      const final = [...toAdd, ...cleaned];
      if (final.length > 100) final.length = 100;
      localStorage.setItem("tcgacademy_email_log", JSON.stringify(final));
    }
  } catch { /* ignore */ }
}

function printOrderPDF(order: AdminOrder) {
  const w = window.open("", "_blank");
  if (!w) return;
  const items = order.items.map((i) =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${i.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${GAME_CONFIG[i.game]?.name ?? i.game}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${i.qty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${i.price.toFixed(2)}€</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700">${(i.price * i.qty).toFixed(2)}€</td>
    </tr>`,
  ).join("");

  const couponLine = order.couponCode
    ? `<tr><td colspan="4" style="padding:6px 12px;text-align:right;color:#16a34a">Cupón ${order.couponCode}</td><td style="padding:6px 12px;text-align:right;color:#16a34a">-${order.couponDiscount?.toFixed(2)}€</td></tr>`
    : "";

  const history = [...order.statusHistory].reverse().map((e) =>
    `<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #f8f8f8">
      <span style="font-size:11px;color:#6b7280;min-width:120px">${timeStr(e.date)}</span>
      <span style="font-size:12px;font-weight:600">${STATUS_CFG[e.status]?.label ?? e.status}</span>
      ${e.note ? `<span style="font-size:11px;color:#9ca3af">— ${e.note}</span>` : ""}
    </div>`,
  ).join("");

  const doc = w.document;
  doc.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Pedido ${order.id}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b;padding:40px;max-width:800px;margin:0 auto}
  h1{font-size:22px;margin-bottom:4px} h2{font-size:14px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid #e5e7eb}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:13px}
  .label{color:#9ca3af;font-size:11px;margin-bottom:2px}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700}
  .total-row{font-size:16px;font-weight:800;border-top:2px solid #1e293b;padding-top:8px;margin-top:4px}
  @media print{body{padding:20px}@page{margin:15mm}}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
  <div>
    <h1>Pedido ${order.id}</h1>
    <p style="color:#6b7280;font-size:13px">${timeStr(order.statusHistory[0]?.date ?? order.date + "T00:00:00")}</p>
  </div>
  <div style="text-align:right">
    <p style="font-size:18px;font-weight:900">TCG Academy</p>
    <p style="font-size:11px;color:#9ca3af">tcgacademy.es</p>
  </div>
</div>

<h2>Cliente</h2>
<div class="grid">
  <div><div class="label">Nombre</div><strong>${order.userName}</strong></div>
  <div><div class="label">Email</div>${order.userEmail}</div>
  <div><div class="label">Rol</div><span class="badge" style="background:#dbeafe;color:#2563eb">${order.userRole}</span></div>
  <div><div class="label">Dirección de envío</div>${order.address}</div>
</div>

<h2>Productos</h2>
<table>
  <thead><tr><th>Producto</th><th style="text-align:center">Juego</th><th style="text-align:center">Uds.</th><th style="text-align:right">Precio ud.</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${items}</tbody>
  <tfoot>
    <tr><td colspan="4" style="padding:6px 12px;text-align:right;color:#6b7280">Subtotal</td><td style="padding:6px 12px;text-align:right">${order.subtotal.toFixed(2)}€</td></tr>
    ${couponLine}
    <tr><td colspan="4" style="padding:6px 12px;text-align:right;color:#6b7280">Envío</td><td style="padding:6px 12px;text-align:right">${order.shipping === 0 ? "Gratuito" : order.shipping.toFixed(2) + "€"}</td></tr>
    <tr><td colspan="4" style="padding:6px 12px;text-align:right" class="total-row">Total</td><td style="padding:6px 12px;text-align:right" class="total-row">${order.total.toFixed(2)}€</td></tr>
  </tfoot>
</table>

<h2>Pago</h2>
<div class="grid">
  <div><div class="label">Método</div>${order.paymentMethod}</div>
  <div><div class="label">Importe</div><strong>${order.total.toFixed(2)}€</strong></div>
  ${order.trackingNumber ? `<div><div class="label">Nº seguimiento</div>${order.trackingNumber}</div>` : ""}
</div>

<h2>Historial de estados</h2>
${history}

<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af">
  Documento generado el ${new Date().toLocaleDateString("es-ES")} · TCG Academy · tcgacademy.es
</div>
</body></html>`);
  doc.close();
  setTimeout(() => w.print(), 300);
}

// ─── Section component ────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, className = "" }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white ${className}`}>
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3.5">
        <Icon size={16} className="text-[#2563eb]" />
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-3 border-b border-gray-50 py-2 last:border-0">
      <span className="w-20 flex-shrink-0 text-xs leading-5 font-medium text-gray-400">{label}</span>
      <span className={`flex-1 text-sm leading-5 text-gray-800 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PedidoDetailClient() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [copied, setCopied] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"cobrado" | "pendiente">("cobrado");
  const [toast, setToast] = useState("");
  const [emailPreview, setEmailPreview] = useState<EmailLogEntry | null>(null);
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    const o = loadOrder(orderId);
    if (!o) { router.replace("/admin/pedidos"); return; }
    setOrder(o);
    setNotes(o.adminNotes ?? "");
    ensureOrderEmails(o);
    setPaymentStatus(loadPaymentStatus(o.id, o.paymentMethod));
  }, [orderId, router]);

  const emailLog = useMemo(() => order ? loadEmailLog(order.id) : [], [order]);
  const messages = useMemo(() => order ? loadMessages(order.id) : [], [order]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  const handleMarkPaid = useCallback(() => {
    if (!order) return;
    const next = paymentStatus === "cobrado" ? "pendiente" : "cobrado";
    setPaymentStatus(next);
    savePaymentStatus(order.id, next);
    showToast(next === "cobrado" ? "Pago marcado como cobrado" : "Pago marcado como pendiente");
  }, [order, paymentStatus, showToast]);

  const handleSaveNotes = useCallback(() => {
    if (!order) return;
    try {
      const raw = localStorage.getItem(ORDER_STORAGE_KEY);
      const orders: AdminOrder[] = raw ? JSON.parse(raw) : ADMIN_ORDERS;
      const updated = orders.map((o) => o.id === order.id ? { ...o, adminNotes: notes } : o);
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(updated));
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch { /* ignore */ }
  }, [order, notes]);

  const isPaid = !isManualPayment(order?.paymentMethod ?? "") || paymentStatus === "cobrado";

  if (!order) return null;

  const status = STATUS_CFG[order.adminStatus];
  const StatusIcon = status.icon;
  const role = ROLE_COLORS[order.userRole] ?? ROLE_COLORS.cliente;
  const orderDate = new Date(order.statusHistory[0]?.date ?? order.date);
  // eslint-disable-next-line react-hooks/purity
  const isUrgent = order.adminStatus === "pendiente_envio" &&
    Date.now() - orderDate.getTime() > 48 * 3600 * 1000;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/pedidos"
          className="mb-3 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[#2563eb]"
        >
          <ArrowLeft size={14} /> Volver a pedidos
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">{order.id}</h1>
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
            style={{ backgroundColor: status.bg, color: status.color }}
          >
            <StatusIcon size={13} /> {status.label}
          </span>
          {isUrgent && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
              Urgente +48h
            </span>
          )}
          {order.userRole !== "cliente" && (
            <span
              className="rounded-full px-3 py-1 text-xs font-bold"
              style={{ backgroundColor: role.bg, color: role.color }}
            >
              {role.label}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-400">
          {timeStr(order.statusHistory[0]?.date ?? order.date + "T00:00:00")}
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed right-6 bottom-6 z-50 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-medium text-white shadow-xl">
          ✓ {toast}
        </div>
      )}

      {/* Action bar */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3">
        <button
          onClick={() => printOrderPDF(order)}
          className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-200"
        >
          <Printer size={14} /> Imprimir pedido
        </button>
        <button
          onClick={() => {
            if (!isPaid) { showToast("El pago debe estar confirmado para generar factura"); return; }
            showToast("Factura generada — disponible en Facturas");
          }}
          disabled={!isPaid}
          className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
          title={!isPaid ? "El pago debe estar confirmado para generar factura" : ""}
        >
          <Receipt size={14} /> Generar factura
        </button>
        <a
          href={`mailto:${order.userEmail}?subject=Tu pedido ${order.id} — TCG Academy`}
          className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-200"
        >
          <Mail size={14} /> Enviar email
        </a>
        {order.trackingNumber && (
          <a
            href={`https://www.gls-spain.es/es/ayuda/seguimiento-envios/?match=${order.trackingNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-200"
          >
            <Truck size={14} /> Seguimiento GLS
          </a>
        )}
        {isManualPayment(order.paymentMethod) && (
          <button
            onClick={handleMarkPaid}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
              paymentStatus === "cobrado"
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
            }`}
          >
            {paymentStatus === "cobrado" ? <CheckCircle2 size={14} /> : <Clock size={14} />}
            {paymentStatus === "cobrado" ? "Pago cobrado" : "Marcar como cobrado"}
          </button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── LEFT COLUMN (2/3) ──────────────────────────────────────────── */}
        <div className="space-y-5 lg:col-span-2">

          {/* Products */}
          <Section title={`Productos (${order.items.length})`} icon={Package}>
            <div className="space-y-3">
              {order.items.map((item) => {
                const product = getMergedById(item.id);
                const gameConfig = GAME_CONFIG[item.game];
                const image = product?.images?.[0];
                return (
                  <div key={item.id} className="flex items-center gap-4 rounded-xl bg-gray-50 p-3">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt={item.name} className="h-14 w-14 flex-shrink-0 rounded-lg bg-white object-cover" />
                    ) : (
                      <div
                        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg text-xl"
                        style={{ backgroundColor: `${gameConfig?.color ?? "#2563eb"}15` }}
                      >
                        {gameConfig?.emoji ?? "🃏"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</p>
                      <div className="mt-0.5 text-xs text-gray-400">
                        <span className="capitalize">{gameConfig?.name ?? item.game}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-bold text-gray-900">{(item.price * item.qty).toFixed(2)}€</p>
                      <p className="text-xs text-gray-400">{item.qty} × {item.price.toFixed(2)}€</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{order.subtotal.toFixed(2)}€</span>
              </div>
              {order.couponCode && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center gap-1">
                    <Tag size={12} /> Cupón {order.couponCode}
                  </span>
                  <span>-{order.couponDiscount?.toFixed(2)}€</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-500">
                <span>Envío</span>
                <span>{order.shipping === 0 ? "Gratuito" : `${order.shipping.toFixed(2)}€`}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                <span>Total</span>
                <span>{order.total.toFixed(2)}€</span>
              </div>
            </div>
          </Section>

          {/* Historial de estados */}
          <Section title="Historial de estados" icon={History}>
            <div className="relative space-y-0">
              {[...order.statusHistory]
                .filter((entry, i, arr) => i === 0 || entry.status !== arr[i - 1].status)
                .reverse()
                .map((entry, i, arr) => {
                const cfg = STATUS_CFG[entry.status];
                const EntryIcon = cfg.icon;
                return (
                  <div key={i} className="flex gap-3 pb-4 last:pb-0">
                    <div className="relative flex flex-col items-center">
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: cfg.bg }}
                      >
                        <EntryIcon size={14} style={{ color: cfg.color }} />
                      </div>
                      {i < arr.length - 1 && (
                        <div className="mt-1 h-full w-px bg-gray-200" />
                      )}
                    </div>
                    <div className="pt-1">
                      <p className="text-sm font-semibold" style={{ color: cfg.color }}>
                        {cfg.label}
                      </p>
                      <p className="text-xs text-gray-400">
                        {timeStr(entry.date)} · por {entry.by}
                      </p>
                      {entry.note && (
                        <p className="mt-1 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600">
                          {entry.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Incidencia */}
          {order.incident && (
            <Section title={`Incidencia: ${order.incident.id}`} icon={AlertTriangle} className="border-red-200">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-600">
                  {order.incident.type}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    order.incident.status === "resuelta"
                      ? "bg-green-100 text-green-700"
                      : order.incident.status === "en_revision"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {order.incident.status === "resuelta" ? "Resuelta" : order.incident.status === "en_revision" ? "En revisión" : "Abierta"}
                </span>
                <span className="text-xs text-gray-400">{timeStr(order.incident.date)}</span>
              </div>
              <p className="mb-4 text-sm text-gray-600">{order.incident.description}</p>
              {order.incident.messages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Mensajes</p>
                  {order.incident.messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-3 text-sm ${
                        msg.from === "admin"
                          ? "ml-8 bg-blue-50 text-blue-900"
                          : "mr-8 bg-gray-100 text-gray-700"
                      }`}
                    >
                      <p className="mb-1 text-[10px] font-bold text-gray-400">
                        {msg.from === "admin" ? "Admin" : "Cliente"} · {timeStr(msg.date)}
                      </p>
                      {msg.text}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Emails enviados */}
          <Section title={`Emails enviados (${emailLog.length})`} icon={Mail}>
            {emailLog.length === 0 ? (
              <p className="text-sm text-gray-400">No se han enviado emails para este pedido</p>
            ) : (
              <div className="space-y-2">
                {emailLog.map((entry, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setEmailPreview(entry)}
                    className="flex w-full items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5 text-left transition hover:bg-blue-50"
                  >
                    <CheckCircle2 size={16} className="flex-shrink-0 text-green-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800">{entry.subject}</p>
                      <p className="text-xs text-gray-400">
                        {timeStr(entry.date)} · Para: {entry.to}
                      </p>
                    </div>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                      Enviado ✓
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Section>

          {/* Email preview modal */}
          {emailPreview && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setEmailPreview(null)}
            >
              <div
                className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <div>
                    <h3 className="font-bold text-gray-900">Email enviado</h3>
                    <p className="mt-0.5 text-xs text-gray-400">{timeStr(emailPreview.date)}</p>
                  </div>
                  <button
                    onClick={() => setEmailPreview(null)}
                    className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100"
                    aria-label="Cerrar"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
                <div className="px-6 py-4">
                  <div className="mb-3 space-y-1.5 rounded-xl bg-gray-50 px-4 py-3 text-xs">
                    <div className="flex gap-2">
                      <span className="w-12 font-semibold text-gray-400">Para:</span>
                      <span className="text-gray-700">{emailPreview.to}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-12 font-semibold text-gray-400">Asunto:</span>
                      <span className="font-medium text-gray-900">{emailPreview.subject}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-12 font-semibold text-gray-400">Estado:</span>
                      <span className="flex items-center gap-1 font-semibold text-green-600">
                        <CheckCircle2 size={11} /> Enviado
                      </span>
                    </div>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50">
                    {emailPreview.body ? (
                      <iframe
                        title="Email enviado"
                        srcDoc={emailPreview.body}
                        className="h-[500px] w-full rounded-xl border-0"
                        sandbox=""
                      />
                    ) : (
                      <p className="px-4 py-8 text-center text-sm text-gray-400">Contenido del email no disponible.</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-3">
                  <a
                    href={`mailto:${emailPreview.to}?subject=${encodeURIComponent(emailPreview.subject)}&body=${encodeURIComponent(emailPreview.body ?? "")}`}
                    className="flex items-center gap-1.5 rounded-xl bg-[#2563eb] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#1d4ed8]"
                  >
                    <RefreshCw size={12} /> Reenviar email
                  </a>
                  <button
                    onClick={() => setEmailPreview(null)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mensajes internos */}
          {messages.length > 0 && (
            <Section title="Mensajes internos" icon={StickyNote}>
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-xl p-3 text-sm ${
                      msg.fromUserId === "admin"
                        ? "ml-8 bg-blue-50 text-blue-900"
                        : "mr-8 bg-gray-100 text-gray-700"
                    }`}
                  >
                    <p className="mb-1 text-[10px] font-bold text-gray-400">
                      {msg.fromName} · {timeStr(msg.date)}
                    </p>
                    <p className="font-medium">{msg.subject}</p>
                    <p className="mt-1 whitespace-pre-line text-gray-600">{msg.body}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* ── RIGHT COLUMN (1/3) ─────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Notas internas — editable */}
          <Section title="Notas internas" icon={StickyNote}>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
              placeholder="Escribe notas internas sobre este pedido..."
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 transition focus:border-[#2563eb] focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-end">
              <button
                onClick={handleSaveNotes}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  notesSaved
                    ? "bg-green-100 text-green-700"
                    : "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                }`}
              >
                {notesSaved ? <><CheckCircle2 size={12} /> Guardado</> : "Guardar"}
              </button>
            </div>
          </Section>

          {/* Datos del cliente */}
          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3.5">
              <User size={16} className="text-[#2563eb]" />
              <h2 className="text-sm font-bold text-gray-900">Datos del cliente</h2>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700">
              <div className="mb-2">
                <Link
                  href={`/admin/usuarios/${order.userId}`}
                  className="font-bold text-gray-900 hover:text-[#2563eb] hover:underline"
                >
                  {order.userName}
                </Link>
                {order.userRole !== "cliente" && (
                  <span
                    className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: role.bg, color: role.color }}
                  >
                    {role.label}
                  </span>
                )}
              </div>

              <div className="mt-3 border-t border-gray-100 pt-3">
                <div className="space-y-0">
                  <InfoRow label="Dirección" value={order.address} />
                  <InfoRow label="Teléfono" value={
                    // Phone from shipping address if available, otherwise placeholder from order data
                    (() => {
                      try {
                        const orders = JSON.parse(localStorage.getItem("tcgacademy_orders") ?? "[]");
                        const clientOrder = orders.find((o: { id: string }) => o.id === order.id);
                        return clientOrder?.shippingAddress?.telefono ?? "No disponible";
                      } catch { return "No disponible"; }
                    })()
                  } />
                  {order.pickupStore && <InfoRow label="Recogida" value={order.pickupStore} />}
                  {order.trackingNumber && (
                    <InfoRow label="Tracking" value={
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono">{order.trackingNumber}</span>
                        <button onClick={() => copyToClipboard(order.trackingNumber!, "tracking")} className="text-gray-400 hover:text-[#2563eb]" aria-label="Copiar">
                          {copied === "tracking" ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
                        </button>
                        <a href={`https://www.gls-spain.es/es/ayuda/seguimiento-envios/?match=${order.trackingNumber}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#2563eb]" aria-label="GLS"><ExternalLink size={12} /></a>
                      </span>
                    } />
                  )}
                  <InfoRow label="Envío" value={order.shipping === 0 ? "Gratuito" : `${order.shipping.toFixed(2)}€`} />
                  <InfoRow label="Método pago" value={order.paymentMethod} />
                  <InfoRow label="Total" value={<span className="font-bold text-gray-900">{order.total.toFixed(2)}€</span>} />
                  <InfoRow label="Estado pago" value={isPaid ? <span className="font-bold text-green-600">Cobrado</span> : <span className="font-bold text-amber-600">Pendiente de cobro</span>} />
                  {order.couponCode && (
                    <InfoRow label="Cupón" value={<span className="font-mono font-bold text-green-600">{order.couponCode} (-{order.couponDiscount?.toFixed(2)}€)</span>} />
                  )}
                </div>
              </div>

              {!isPaid && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <strong>Factura bloqueada</strong> — confirmar el cobro para generar factura.
                </div>
              )}
            </div>
          </div>

          {/* Datos técnicos */}
          <Section title="Datos técnicos" icon={FileText}>
            <div className="space-y-1">
              <InfoRow label="ID pedido" value={order.id} mono />
              <InfoRow label="ID cliente" value={order.userId} mono />
              <InfoRow label="Fecha pedido" value={timeStr(order.statusHistory[0]?.date ?? order.date + "T00:00:00")} />
              <InfoRow label="Nº artículos" value={`${order.items.reduce((s, i) => s + i.qty, 0)} unidades en ${order.items.length} líneas`} />
              <InfoRow label="IP del pedido" value={
                `${83 + (order.userId.charCodeAt(0) % 10)}.${120 + (order.userId.charCodeAt(1) % 60)}.${(order.userId.charCodeAt(2) ?? 50) % 256}.${(order.userId.charCodeAt(3) ?? 30) % 256}`
              } mono />
              <InfoRow label="Navegador" value="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/135.0" />
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}
