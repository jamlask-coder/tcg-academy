"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Package,
  Clock,
  Truck,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  MapPin,
  CreditCard,
  Hash,
  AlertCircle,
  Copy,
  ExternalLink,
  Info,
  X,
  RefreshCw,
} from "lucide-react";
import { AccountTabs } from "@/components/cuenta/AccountTabs";
import { PaymentInfo, type PaymentStatus } from "@/components/cuenta/PaymentInfo";
import { useToast } from "@/context/ToastContext";
import {
  printInvoiceWithCSV,
  buildInvoiceFromOrder,
  generateInvoiceNumber,
} from "@/utils/invoiceGenerator";
import { formatDate } from "@/lib/format";
import { clickableProps } from "@/lib/a11y";

// Estados customer (2026-04-20). Flujo lineal: pedido → pagado → pendiente_envio → enviado.
// "entregado" eliminado (depende del transportista). Admin tiene su propio set.
type OrderStatus =
  | "pedido"
  | "pagado"
  | "pendiente_envio"
  | "enviado"
  | "incidencia"
  | "cancelado"
  | "devolucion";

interface OrderItem {
  name: string;
  qty?: number;
  quantity?: number;
  price: number;
  image?: string;
  game?: string;
  qtyShipped?: number;
}

interface StoredOrder {
  id: string;
  userId?: string;
  date: string;
  status: string;
  total: number;
  items: OrderItem[];
  shippingAddress?: {
    nombre?: string;
    apellidos?: string;
    direccion?: string;
    ciudad?: string;
    cp?: string;
    provincia?: string;
  };
  address?: string;
  paymentMethod?: string;
  paymentStatus?: PaymentStatus;
  pago?: string;
  trackingNumber?: string;
  envio?: string;
  tiendaRecogida?: string | null;
}

interface Order extends StoredOrder {
  status: OrderStatus;
  dateFormatted: string;
}

// Flujo normal: un único azul (#2563eb, el del menú principal) para los 4
// estados. Excepciones (incidencia/cancelado/devolucion) mantienen semántica.
const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  pedido: {
    label: "Pedido",
    color: "#2563eb",
    bg: "#dbeafe",
    icon: Package,
  },
  pagado: {
    label: "Pagado",
    color: "#2563eb",
    bg: "#dbeafe",
    icon: CheckCircle,
  },
  pendiente_envio: {
    label: "Pendiente de envío",
    color: "#2563eb",
    bg: "#dbeafe",
    icon: Clock,
  },
  enviado: {
    label: "Enviado",
    color: "#2563eb",
    bg: "#dbeafe",
    icon: Truck,
  },
  incidencia: {
    label: "Incidencia",
    color: "#dc2626",
    bg: "#fee2e2",
    icon: AlertTriangle,
  },
  cancelado: {
    label: "Cancelado",
    color: "#374151",
    bg: "#f3f4f6",
    icon: X,
  },
  devolucion: {
    label: "Devolución",
    color: "#6d28d9",
    bg: "#ede9fe",
    icon: RefreshCw,
  },
};

const MOCK_ORDERS: Order[] = [
  {
    id: "TCG-20250128-001",
    date: "2025-01-28",
    dateFormatted: "28 enero 2025",
    status: "enviado",
    total: 109.85,
    trackingNumber: "ES2025012800001",
    address: "Calle Mayor 15, 2ºB, 28001 Madrid",
    paymentMethod: "Tarjeta Visa ****4242",
    paymentStatus: "paid",
    envio: "estandar",
    items: [
      {
        name: "Naruto Mythos: Konoha Shido Booster Box (24 sobres)",
        qty: 1,
        price: 79.95,
        game: "naruto",
      },
      {
        name: "Naruto Starter Pack — Naruto Uzumaki",
        qty: 2,
        price: 14.95,
        game: "naruto",
      },
    ],
  },
  {
    id: "TCG-20250115-002",
    date: "2025-01-15",
    dateFormatted: "15 enero 2025",
    status: "enviado",
    total: 174.9,
    trackingNumber: "ES2025011500002",
    address: "Calle Mayor 15, 2ºB, 28001 Madrid",
    paymentMethod: "PayPal",
    paymentStatus: "paid",
    envio: "estandar",
    items: [
      {
        name: "Magic The Gathering: Bloomburrow Draft Booster Box",
        qty: 1,
        price: 129.95,
        game: "magic",
      },
      { name: "MTG Bloomburrow Bundle", qty: 1, price: 44.95, game: "magic" },
    ],
  },
  {
    id: "TCG-20241230-003",
    date: "2024-12-30",
    dateFormatted: "30 diciembre 2024",
    status: "enviado",
    total: 109.9,
    trackingNumber: "ES2024123000003",
    address: "Calle Mayor 15, 2ºB, 28001 Madrid",
    paymentMethod: "Bizum",
    paymentStatus: "refunded",
    envio: "estandar",
    items: [
      {
        name: "Pokémon: Prismatic Evolutions Elite Trainer Box",
        qty: 2,
        price: 54.95,
        game: "pokemon",
      },
    ],
  },
  {
    id: "TCG-20241201-004",
    date: "2024-12-01",
    dateFormatted: "01 diciembre 2024",
    status: "enviado",
    total: 104.9,
    address: "Calle Mayor 15, 2ºB, 28001 Madrid",
    paymentMethod: "Tarjeta Visa ****4242",
    paymentStatus: "failed",
    envio: "estandar",
    items: [
      {
        name: "One Piece OP-07 500 Years in the Future Booster Box",
        qty: 1,
        price: 89.95,
        game: "one-piece",
      },
      {
        name: "One Piece Starter Deck ST-21 Land of Wano",
        qty: 1,
        price: 14.95,
        game: "one-piece",
      },
    ],
  },
];

const GAME_EMOJI: Record<string, string> = {
  magic: "🧙",
  pokemon: "⚡",
  "one-piece": "☠️",
  naruto: "🍃",
  yugioh: "⭐",
  lorcana: "✨",
  riftbound: "🌀",
  topps: "⚽",
  "dragon-ball": "🐉",
};

// Regla de negocio: "sin pago no hay pedido" → cualquier pedido existente
// arranca mínimo en "pagado". "pedido"/"pendiente" legacy colapsan a "pagado".
function normalizeStatus(s: string): OrderStatus {
  const map: Record<string, OrderStatus> = {
    pedido: "pagado",
    pendiente: "pagado",
    pagado: "pagado",
    procesando: "pendiente_envio",
    pendiente_envio: "pendiente_envio",
    preparado: "pendiente_envio",
    enviado: "enviado",
    entregado: "enviado", // legacy → el flujo actual termina en "enviado"
    incidencia: "incidencia",
    cancelado: "cancelado",
    devuelto: "devolucion",
    devolucion: "devolucion",
  };
  return map[s.toLowerCase()] ?? "pagado";
}

// Timeline del flujo normal — 4 pasos progresivos.
const TIMELINE: OrderStatus[] = [
  "pedido",
  "pagado",
  "pendiente_envio",
  "enviado",
];

// Labels compactos para móvil (no caben en 4 pasos).
const TIMELINE_LABELS_SHORT: Record<OrderStatus, string> = {
  pedido: "Pedido",
  pagado: "Pagado",
  pendiente_envio: "Preparando",
  enviado: "Enviado",
  incidencia: "Incidencia",
  cancelado: "Cancelado",
  devolucion: "Devolución",
};

interface IncidentModalProps {
  orderId: string;
  onClose: () => void;
  onSubmit: (orderId: string, type: string, description: string) => void;
}

function IncidentModal({ orderId, onClose, onSubmit }: IncidentModalProps) {
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  return (
    <div
      {...clickableProps(onClose)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        {...clickableProps((e) => e?.stopPropagation())}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
          <AlertCircle size={20} className="text-red-500" /> Abrir incidencia
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Pedido:{" "}
          <span className="font-mono font-bold text-gray-700">{orderId}</span>
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Tipo de incidencia *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 text-sm focus:border-[#2563eb] focus:outline-none"
            >
              <option value="">Selecciona el tipo...</option>
              <option value="no_recibido">No he recibido el pedido</option>
              <option value="producto_defectuoso">
                Producto defectuoso o dañado
              </option>
              <option value="producto_incorrecto">Producto incorrecto</option>
              <option value="falta_producto">
                Falta un producto en el pedido
              </option>
              <option value="otro">Otro motivo</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Descripción *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el problema con el mayor detalle posible..."
              rows={4}
              className="w-full resize-none rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-[#2563eb] focus:outline-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              disabled={!type || description.length < 10}
              onClick={() => onSubmit(orderId, type, description)}
              className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enviar incidencia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const DEMO_BANNER_KEY = "tcgacademy_demo_pedidos_dismissed";

export default function PedidosPage() {
  const { user } = useAuth();
  const isDemoUser = !!user?.id?.startsWith("demo-");
  const [showDemoBanner, setShowDemoBanner] = useState(() => {
    try {
      return typeof window !== "undefined"
        ? !localStorage.getItem(DEMO_BANNER_KEY)
        : false;
    } catch {
      return true;
    }
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem("tcgacademy_orders")
          : null;
      const seed = isDemoUser ? MOCK_ORDERS : [];
      if (!raw || !user?.id) return seed;
      const local = JSON.parse(raw) as StoredOrder[];
      // Filtro ESTRICTO: solo pedidos con userId === user.id. Pedidos sin userId
      // (guest checkout legacy) NUNCA se muestran a usuarios autenticados, o
      // fugan entre cuentas.
      const mine = local.filter((o) => o.userId === user.id);
      const normalized: Order[] = mine.map((o) => ({
        ...o,
        status: normalizeStatus(o.status),
        dateFormatted: formatDate(o.date),
      }));
      return [...normalized, ...seed];
    } catch {
      return isDemoUser ? MOCK_ORDERS : [];
    }
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [incidentModal, setIncidentModal] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleIncidentSubmit = (
    orderId: string,
    type: string,
    _desc: string,
  ) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: "incidencia" as OrderStatus } : o,
      ),
    );
    setIncidentModal(null);
    showToast(
      `Incidencia registrada para el pedido ${orderId}. Nos pondremos en contacto contigo en menos de 24h.`,
      "success",
    );
    void type;
  };

  const downloadFakturame = async (order: Order) => {
    const invoiceNumber = generateInvoiceNumber(order.id);
    const data = buildInvoiceFromOrder(
      {
        id: order.id,
        date: order.date,
        items: order.items.map((i) => ({
          name: i.name,
          quantity: i.qty ?? i.quantity ?? 1,
          price: i.price,
        })),
        total: order.total,
        shippingAddress: order.shippingAddress,
        pago: order.pago,
        paymentMethod: order.paymentMethod,
      },
      invoiceNumber,
    );
    await printInvoiceWithCSV(data);
  };

  return (
    <div className="overflow-x-hidden">
      <AccountTabs group="pedidos" />
      {incidentModal && (
        <IncidentModal
          orderId={incidentModal}
          onClose={() => setIncidentModal(null)}
          onSubmit={handleIncidentSubmit}
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
            onClick={() => {
              try {
                localStorage.setItem(DEMO_BANNER_KEY, "1");
              } catch {}
              setShowDemoBanner(false);
            }}
            className="flex-shrink-0 text-amber-400 transition hover:text-amber-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm text-gray-500">
          {orders.length} pedidos realizados
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center">
          <Package size={48} className="mx-auto mb-4 text-gray-200" />
          <p className="mb-2 font-bold text-gray-700">
            No tienes pedidos todavía
          </p>
          <p className="mb-6 text-sm text-gray-500">
            Explora el catálogo y haz tu primer pedido
          </p>
          <Link
            href="/catalogo"
            className="rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            Ver catálogo
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const {
              label,
              color,
              bg,
              icon: Icon,
            } = STATUS_CONFIG[order.status];
            const isOpen = expanded === order.id;
            const isPartial = order.items.some(
              (i) =>
                i.qtyShipped !== undefined &&
                i.qtyShipped < (i.qty ?? i.quantity ?? 1),
            );
            const timelineStep = TIMELINE.indexOf(order.status as OrderStatus);

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
              >
                {/* Header row — always visible */}
                <button
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-gray-50/60"
                >
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: bg }}
                  >
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gray-900">
                        {order.id}
                      </span>
                      {isPartial && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                          Suministro parcial
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {order.dateFormatted} · {order.items.length} producto
                      {order.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-4">
                    <div className="hidden text-right sm:block">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                        style={{ color, backgroundColor: bg }}
                      >
                        <Icon size={11} /> {label}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {order.total.toFixed(2)}€
                    </span>
                    {isOpen ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-5 pb-5">
                    {/* Progress timeline — sólo para estados del flujo normal */}
                    {(
                      [
                        "pedido",
                        "pagado",
                        "pendiente_envio",
                        "enviado",
                      ] as OrderStatus[]
                    ).includes(order.status) && (
                      <div className="my-5 flex items-center gap-0">
                        {TIMELINE.map((step, i) => {
                          const cfg = STATUS_CONFIG[step];
                          const done = timelineStep >= i;
                          return (
                            <div
                              key={step}
                              className="flex min-w-0 flex-1 items-center last:flex-none"
                            >
                              <div className="flex min-w-0 flex-col items-center gap-1">
                                <div
                                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white transition-all"
                                  style={{
                                    backgroundColor: done
                                      ? cfg.color
                                      : "#e5e7eb",
                                  }}
                                >
                                  {done ? (
                                    <cfg.icon size={13} />
                                  ) : (
                                    <span className="text-xs text-gray-400">
                                      {i + 1}
                                    </span>
                                  )}
                                </div>
                                <span
                                  className="max-w-full truncate text-[10px] font-semibold"
                                  style={{
                                    color: done ? cfg.color : "#9ca3af",
                                  }}
                                >
                                  <span className="sm:hidden">
                                    {TIMELINE_LABELS_SHORT[step]}
                                  </span>
                                  <span className="hidden sm:inline">
                                    {cfg.label}
                                  </span>
                                </span>
                              </div>
                              {i < TIMELINE.length - 1 && (
                                <div
                                  className="mx-1 mb-4 h-0.5 flex-1"
                                  style={{
                                    backgroundColor:
                                      timelineStep > i ? cfg.color : "#e5e7eb",
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Incidencia badge */}
                    {order.status === "incidencia" && (
                      <div className="my-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <AlertTriangle
                          size={16}
                          className="flex-shrink-0 text-red-500"
                        />
                        <span className="text-sm font-semibold text-red-700">
                          Incidencia abierta — en revisión por nuestro equipo
                        </span>
                      </div>
                    )}

                    {/* Products */}
                    <div className="mb-4 space-y-2">
                      <p className="mb-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
                        Productos
                      </p>
                      {order.items.map((item, i) => {
                        const qty = item.qty ?? item.quantity ?? 1;
                        const shipped = item.qtyShipped ?? qty;
                        const emoji = GAME_EMOJI[item.game ?? ""] ?? "🃏";
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-xl">
                              {emoji}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-sm leading-tight font-medium text-gray-800">
                                {item.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {qty}× · {(item.price * qty).toFixed(2)}€
                                {item.qtyShipped !== undefined &&
                                  shipped < qty && (
                                    <span className="ml-2 font-semibold text-amber-600">
                                      {shipped}/{qty} enviados
                                    </span>
                                  )}
                              </p>
                            </div>
                            <span className="flex-shrink-0 text-sm font-bold text-gray-900">
                              {(item.price * qty).toFixed(2)}€
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Meta info */}
                    <div className="mb-4 grid gap-3 text-xs text-gray-600 sm:grid-cols-2">
                      {(order.address || order.shippingAddress) && (
                        <div className="flex items-start gap-2 rounded-xl bg-gray-50 p-3">
                          <MapPin
                            size={13}
                            className="mt-0.5 flex-shrink-0 text-gray-400"
                          />
                          <div>
                            <p className="mb-0.5 font-semibold text-gray-700">
                              Dirección de envío
                            </p>
                            {order.shippingAddress ? (
                              <p className="leading-relaxed text-gray-500">
                                {[
                                  order.shippingAddress.nombre,
                                  order.shippingAddress.apellidos,
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                <br />
                                {order.shippingAddress.direccion}
                                <br />
                                {[
                                  order.shippingAddress.cp,
                                  order.shippingAddress.ciudad,
                                  order.shippingAddress.provincia,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            ) : (
                              <p className="text-gray-500">{order.address}</p>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-2 rounded-xl bg-gray-50 p-3">
                        <CreditCard
                          size={13}
                          className="mt-0.5 flex-shrink-0 text-gray-400"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 font-semibold text-gray-700">
                            Pago
                          </p>
                          <PaymentInfo
                            method={order.paymentMethod ?? order.pago}
                            status={order.paymentStatus ?? "paid"}
                          />
                        </div>
                      </div>
                      {order.trackingNumber && (
                        <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 sm:col-span-2">
                          <Hash
                            size={13}
                            className="mt-0.5 flex-shrink-0 text-blue-400"
                          />
                          <div className="flex-1">
                            <p className="mb-0.5 font-semibold text-[#2563eb]">
                              Número de seguimiento GLS
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[#2563eb]">
                                {order.trackingNumber}
                              </span>
                              <button
                                onClick={() =>
                                  navigator.clipboard.writeText(
                                    order.trackingNumber!,
                                  )
                                }
                                className="flex items-center gap-1 rounded border border-blue-200 px-1.5 py-0.5 text-[11px] text-[#2563eb] transition hover:text-[#1d4ed8]"
                                title="Copiar número"
                              >
                                <Copy size={10} /> Copiar
                              </button>
                              <a
                                href={`https://www.gls-spain.es/es/seguimiento-envios/?match=${order.trackingNumber}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[11px] font-semibold text-[#2563eb] hover:text-[#1d4ed8]"
                              >
                                <ExternalLink size={10} /> Seguir mi pedido
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-2">
                      <button
                        onClick={() => downloadFakturame(order)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#2563eb]/30 px-3 py-2 text-xs font-semibold text-[#2563eb] transition hover:bg-blue-50"
                      >
                        <Download size={13} /> Descargar factura
                      </button>
                      {order.status !== "incidencia" && (
                        <button
                          onClick={() => setIncidentModal(order.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          <AlertCircle size={13} /> Abrir incidencia
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
