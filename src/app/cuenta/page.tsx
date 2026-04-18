"use client";
import Link from "next/link";
import {
  Package,
  Heart,
  ChevronRight,
  User,
  TrendingUp,
  Gift,
  Share2,
  Trophy,
  Receipt,
  Search,
  ChevronDown,
  CheckCircle,
  Truck,
  AlertTriangle,
  Ban,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  ADMIN_ORDERS,
  ORDER_STORAGE_KEY,
  MOCK_ORDERS,
  type AdminOrder,
  type AdminOrderStatus,
} from "@/data/mockData";

const B2BCharts = dynamic(
  () => import("@/components/account/B2BCharts").then((m) => m.B2BCharts),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
    ),
  },
);


// Months for the chart labels
const MONTH_LABELS = ["Oct", "Nov", "Dic", "Ene", "Feb", "Mar"];

interface B2BStats {
  totalSpent: number;
  orderCount: number;
  monthlyData: { month: string; gasto: number }[];
  gameData: { game: string; gasto: number }[];
  orders: Array<{
    date: string;
    total: number;
    items: { game: string; price: number; qty: number }[];
  }>;
}

function buildMonthlyData(orders: Array<{ total: number; date: string }>) {
  const now = new Date();
  return MONTH_LABELS.map((month, i) => {
    const targetMonth = new Date(
      now.getFullYear(),
      now.getMonth() - (5 - i),
      1,
    );
    const total = orders
      .filter((o) => {
        const d = new Date(o.date);
        return (
          d.getMonth() === targetMonth.getMonth() &&
          d.getFullYear() === targetMonth.getFullYear()
        );
      })
      .reduce((s, o) => s + o.total, 0);
    return { month, gasto: Math.round(total * 100) / 100 };
  });
}

function buildGameData(
  orders: Array<{
    items?: Array<{ game: string; price: number; qty: number }>;
  }>,
) {
  const totals: Record<string, number> = {};
  for (const o of orders) {
    for (const item of o.items ?? []) {
      totals[item.game] = (totals[item.game] ?? 0) + item.price * item.qty;
    }
  }
  return Object.entries(totals)
    .map(([game, gasto]) => ({
      game: game.charAt(0).toUpperCase() + game.slice(1),
      gasto: Math.round(gasto * 100) / 100,
    }))
    .sort((a, b) => b.gasto - a.gasto)
    .slice(0, 6);
}

// ─── Admin role config ─────────────────────────────────────────────────────────
const ROLE_CFG = {
  cliente: {
    label: "Cliente",
    color: "#6b7280",
    bg: "#f3f4f6",
    rowBg: "bg-white",
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
} as const;

// ─── Admin status config ───────────────────────────────────────────────────────
const STATUS_CFG: Record<
  AdminOrderStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  pendiente_envio: {
    label: "Pendiente de envío",
    color: "#c2410c",
    bg: "#fff7ed",
    icon: Package,
  },
  enviado: { label: "Enviado", color: "#7c3aed", bg: "#f5f3ff", icon: Truck },
  incidencia: {
    label: "Incidencia",
    color: "#dc2626",
    bg: "#fee2e2",
    icon: AlertTriangle,
  },
  cancelado: { label: "Cancelado", color: "#374151", bg: "#f3f4f6", icon: Ban },
  devolucion: {
    label: "Devolución",
    color: "#6d28d9",
    bg: "#ede9fe",
    icon: RotateCcw,
  },
};

type AdminFilterTab = "todos" | AdminOrderStatus;

function AdminStatusBadge({ status }: { status: AdminOrderStatus }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function AdminDashboard() {
  const [orders, setOrders] = useState<AdminOrder[]>(() => {
    try {
      const stored = localStorage.getItem(ORDER_STORAGE_KEY);
      if (stored) return JSON.parse(stored) as AdminOrder[];
    } catch {}
    return ADMIN_ORDERS;
  });
  const [filter, setFilter] = useState<AdminFilterTab>("todos");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>(
    {},
  );

  // eslint-disable-next-line react-hooks/purity
  const THIRTY_DAYS_AGO = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentOrders = orders.filter(
    (o) => new Date(o.date).getTime() >= THIRTY_DAYS_AGO,
  );

  const filtered = orders
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20)
    .filter((o) => {
      if (filter !== "todos" && o.adminStatus !== filter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          o.id.toLowerCase().includes(q) ||
          o.userName.toLowerCase().includes(q) ||
          o.userEmail.toLowerCase().includes(q)
        );
      }
      return true;
    });

  function updateStatus(id: string, status: AdminOrderStatus) {
    const updated = orders.map((o) =>
      o.id === id ? { ...o, adminStatus: status } : o,
    );
    setOrders(updated);
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  function saveTracking(id: string) {
    const tracking = (trackingInputs[id] ?? "").trim();
    if (!tracking) return;
    const updated = orders.map((o) =>
      o.id === id
        ? {
            ...o,
            trackingNumber: tracking,
            adminStatus: "enviado" as AdminOrderStatus,
          }
        : o,
    );
    setOrders(updated);
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    setTrackingInputs((prev) => ({ ...prev, [id]: "" }));
  }

  const tabs: { key: AdminFilterTab; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "pendiente_envio", label: "Pendientes" },
    { key: "enviado", label: "Enviados" },
    { key: "incidencia", label: "Incidencias" },
    { key: "cancelado", label: "Cancelados" },
    { key: "devolucion", label: "Devoluciones" },
  ];

  return (
    <div>
      {/* KPI strip — últimos 30 días */}
      <div className="mb-2 flex items-center gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Últimos 30 días</p>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">
          {recentOrders.length} pedido{recentOrders.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {(
          [
            "todos",
            "pendiente_envio",
            "enviado",
            "incidencia",
            "cancelado",
            "devolucion",
          ] as const
        ).map((key) => {
          const count =
            key === "todos"
              ? recentOrders.length
              : recentOrders.filter((o) => o.adminStatus === key).length;
          const cfg = key === "todos" ? null : STATUS_CFG[key];
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-2xl border p-4 text-left transition ${
                filter === key
                  ? "border-[#2563eb] bg-[#2563eb] text-white"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p
                className={`text-2xl font-bold ${filter === key ? "text-white" : "text-gray-900"}`}
              >
                {count}
              </p>
              <p
                className={`mt-0.5 text-xs ${filter === key ? "text-blue-200" : "text-gray-500"}`}
              >
                {cfg ? cfg.label : "Total pedidos"}
              </p>
            </button>
          );
        })}
      </div>

      {/* Search + filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por ID, nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 py-2 pr-3 pl-8 text-sm outline-none focus:border-[#2563eb]"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === key
                  ? "bg-[#2563eb] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200">
        {filtered.length === 0 ? (
          <p className="bg-white px-6 py-10 text-center text-sm text-gray-400">
            No hay pedidos para este filtro.
          </p>
        ) : (
          filtered.map((order) => {
            const isExpanded = expanded === order.id;
            const roleCfg = ROLE_CFG[order.userRole];
            return (
              <div
                key={order.id}
                className={`border-b border-gray-100 last:border-0 ${roleCfg.rowBg} ${roleCfg.borderClass}`}
              >
                {/* Row — columns: expand | nº pedido + nombre | total | estado | acciones */}
                <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : order.id)}
                    aria-label={
                      isExpanded ? "Contraer pedido" : "Expandir pedido"
                    }
                    className="flex-shrink-0"
                  >
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Nº pedido + nombre */}
                  <div className="min-w-[130px] flex-1">
                    <p className="text-xs font-bold text-gray-900">
                      {order.id}
                    </p>
                    <Link
                      href={`/admin/usuarios/${order.userId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-[#2563eb] hover:underline"
                    >
                      {order.userName}
                    </Link>
                  </div>

                  {/* Total */}
                  <span className="text-sm font-bold text-gray-900 tabular-nums">
                    {order.total.toFixed(2)} €
                  </span>

                  {/* Estado */}
                  <AdminStatusBadge status={order.adminStatus} />

                  {/* Status changer */}
                  <select
                    value={order.adminStatus}
                    onChange={(e) =>
                      updateStatus(order.id, e.target.value as AdminOrderStatus)
                    }
                    aria-label={`Cambiar estado del pedido ${order.id}`}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#2563eb]"
                  >
                    {(Object.keys(STATUS_CFG) as AdminOrderStatus[]).map(
                      (s) => (
                        <option key={s} value={s}>
                          {STATUS_CFG[s].label}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-white px-4 py-4">
                    {/* Meta grid */}
                    <div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-gray-600 sm:grid-cols-3">
                      <div>
                        <span className="font-semibold">
                          Dirección completa:
                        </span>
                        <br />
                        {order.address}
                      </div>
                      <div>
                        <span className="font-semibold">Forma de pago:</span>{" "}
                        {order.paymentMethod}
                      </div>
                      <div>
                        <span className="font-semibold">Tipo de cliente:</span>{" "}
                        <span
                          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                          style={{
                            color: roleCfg.color,
                            backgroundColor: roleCfg.bg,
                          }}
                        >
                          {roleCfg.label}
                        </span>
                      </div>
                      {order.trackingNumber && (
                        <div>
                          <span className="font-semibold">Nº seguimiento:</span>{" "}
                          <span className="font-mono">
                            {order.trackingNumber}
                          </span>
                        </div>
                      )}
                      {order.couponCode && (
                        <div>
                          <span className="font-semibold">Cupón:</span>{" "}
                          {order.couponCode} (-
                          {order.couponDiscount?.toFixed(2)}€)
                        </div>
                      )}
                      {order.adminNotes && (
                        <div className="col-span-2 sm:col-span-3">
                          <span className="font-semibold">Notas internas:</span>{" "}
                          {order.adminNotes}
                        </div>
                      )}
                    </div>

                    {/* Items list */}
                    <div className="mb-3 overflow-hidden rounded-lg border border-gray-100">
                      {order.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 border-b border-gray-100 px-3 py-2 last:border-0"
                        >
                          <div className="flex-1 text-xs">
                            <span className="font-semibold">{item.name}</span>
                            <span className="ml-2 text-gray-400">
                              ×{item.qty}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {item.price.toFixed(2)} € / u
                          </span>
                          <span className="min-w-[50px] text-right text-xs font-bold text-gray-900">
                            {(item.price * item.qty).toFixed(2)} €
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Incident */}
                    {order.incident && (
                      <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        <p className="font-bold">
                          Incidencia: {order.incident.type}
                        </p>
                        <p className="mt-0.5 text-red-600">
                          {order.incident.description}
                        </p>
                      </div>
                    )}

                    {/* Tracking input — se oculta solo para estados terminales
                        (cancelado/devolucion). "Entregado" se eliminó del
                        flujo el 2026-04-18; "enviado" es ahora el estado final
                        pero aún se permite editar el tracking para corregir. */}
                    {order.adminStatus !== "cancelado" &&
                      order.adminStatus !== "devolucion" && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Número de seguimiento…"
                          value={trackingInputs[order.id] ?? ""}
                          onChange={(e) =>
                            setTrackingInputs((prev) => ({
                              ...prev,
                              [order.id]: e.target.value,
                            }))
                          }
                          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-[#2563eb]"
                        />
                        <button
                          onClick={() => saveTracking(order.id)}
                          className="rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1e40af]"
                        >
                          Guardar y marcar enviado
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="mt-3 text-center text-xs text-gray-400">
        Mostrando últimos {Math.min(20, orders.length)} pedidos ·{" "}
        <Link href="/admin/pedidos" className="underline hover:text-gray-600">
          Ver todos en panel completo
        </Link>
      </p>
    </div>
  );
}

export default function CuentaPage() {
  const { user } = useAuth();
  const [b2bStats, setB2bStats] = useState<B2BStats | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "mayorista" && user.role !== "tienda") return;
    try {
      const raw = localStorage.getItem("tcgacademy_orders");
      const stored = raw
        ? (JSON.parse(raw) as Array<{
            total: number;
            date: string;
            items?: Array<{
              game?: string;
              price: number;
              qty?: number;
              quantity?: number;
            }>;
          }>)
        : [];
      // Fallback to MOCK_ORDERS (same source as /cuenta/pedidos) so stats
      // reflect what the user actually sees in their order history.
      const raw_orders: Array<{
        total: number;
        date: string;
        items?: Array<{
          game?: string;
          price: number;
          qty?: number;
          quantity?: number;
        }>;
      }> =
        stored.length > 0
          ? stored
          : MOCK_ORDERS.map((o) => ({
              total: o.total,
              date: o.date,
              items: o.items.map((it) => ({
                game: it.game,
                price: it.price,
                qty: it.qty,
              })),
            }));
      // Normalize items: real checkout orders use `quantity`, mock uses `qty`.
      const orders = raw_orders.map((o) => ({
        total: o.total,
        date: o.date,
        items: (o.items ?? []).map((it) => ({
          game: it.game ?? "otros",
          price: it.price,
          qty: it.qty ?? it.quantity ?? 1,
        })),
      }));
      const total = orders.reduce((s, o) => s + o.total, 0);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setB2bStats({
        totalSpent: total,
        orderCount: orders.length,
        monthlyData: buildMonthlyData(orders),
        gameData: buildGameData(orders),
        orders,
      });
    } catch {}
  }, [user]);

  if (!user) return null;

  if (user.role === "admin") {
    return (
      <div>
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#3b82f6] p-6 text-white">
          <p className="mb-1 text-sm text-blue-200">Panel de administración</p>
          <h1 className="text-xl font-bold">Hola, {user.name} 👋</h1>
          <p className="text-sm text-blue-200">
            Últimos 20 pedidos — gestión rápida de estado y envíos.
          </p>
        </div>
        <AdminDashboard />
      </div>
    );
  }

  const isB2B = user.role === "mayorista" || user.role === "tienda";
  const roleColor = user.role === "tienda" ? "#7c3aed" : "#2563eb";

  const QUICK_LINKS = [
    ...(!isB2B
      ? [
          {
            href: "/cuenta/pedidos",
            label: "Mis pedidos",
            icon: Package,
            desc: "Historial de compras",
            color: "#2563eb",
          },
        ]
      : []),
    {
      href: "/cuenta/puntos",
      label: "Mis puntos",
      icon: Trophy,
      desc: "Puntos acumulados",
      color: "#f59e0b",
    },
    ...(!isB2B
      ? [
          {
            href: "/cuenta/grupo",
            label: "Mi grupo",
            icon: Share2,
            desc: "Comprad juntos y todos ganáis puntos",
            color: "#0891b2",
          },
        ]
      : []),
    {
      href: "/cuenta/cupones",
      label: "Cupones y descuentos",
      icon: Gift,
      desc: "Tus cupones activos",
      color: "#16a34a",
    },
    {
      href: "/cuenta/datos",
      label: "Mis datos",
      icon: User,
      desc: "Perfil y contraseña",
      color: "#7c3aed",
    },
    {
      href: "/cuenta/favoritos",
      label: "Favoritos",
      icon: Heart,
      desc: "Lista de deseos",
      color: "#dc2626",
    },
    ...(isB2B
      ? [
          {
            href: "/cuenta/facturas",
            label: "Mis facturas",
            icon: Receipt,
            desc: "Descarga tus facturas",
            color: "#0f766e",
          },
        ]
      : []),
  ];

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8 rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#3b82f6] p-8 text-white">
        <p className="mb-1 text-sm text-blue-200">Bienvenido de nuevo</p>
        <h1 className="mb-1 text-2xl font-bold">Hola, {user.name} 👋</h1>
        <p className="text-sm text-blue-200">
          {user.role === "mayorista" &&
            "Estás viendo precios PV Mayorista en todo el catálogo."}
          {user.role === "tienda" &&
            "Estás viendo precios PV Tiendas en todo el catálogo."}
          {user.role === "cliente" &&
            "Explora el catálogo y gestiona tus pedidos desde aquí."}
        </p>
        {user.birthDate && (
          <p className="mt-2 text-xs text-blue-300">
            🎂{" "}
            {new Date(user.birthDate + "T12:00:00").toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      {/* Last order — hidden for B2B (mayoristas/tiendas) */}
      {!isB2B && (() => {
        const lastOrder = MOCK_ORDERS[0];
        if (!lastOrder) return null;
        const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
          pedido:     { label: "Pendiente de envío", color: "#c2410c", bg: "#fff7ed" },
          enviado:    { label: "Enviado",             color: "#7c3aed", bg: "#ede9fe" },
          entregado:  { label: "Entregado",           color: "#16a34a", bg: "#dcfce7" },
          incidencia: { label: "Incidencia",          color: "#dc2626", bg: "#fee2e2" },
        };
        const st = statusLabels[lastOrder.status] ?? statusLabels.pedido;
        const dateStr = new Date(lastOrder.date + "T12:00:00").toLocaleDateString("es-ES", {
          day: "numeric", month: "long", year: "numeric",
        });
        return (
          <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Último pedido</h2>
              <Link
                href="/cuenta/pedidos"
                className="flex items-center gap-1 text-sm text-[#2563eb] hover:underline"
              >
                Ver todos <ChevronRight size={14} />
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-mono text-sm font-semibold text-gray-800">
                  {lastOrder.id}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {dateStr} · {lastOrder.items.length} producto{lastOrder.items.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold"
                  style={{ color: st.color, backgroundColor: st.bg }}
                >
                  {st.label}
                </span>
                <span className="font-bold text-gray-900">
                  {lastOrder.total.toFixed(2)}€
                </span>
                <Link
                  href={`/cuenta/pedidos/${lastOrder.id}`}
                  className="text-sm font-semibold text-[#2563eb] hover:underline"
                >
                  Ver detalle
                </Link>
              </div>
            </div>
          </div>
        );
      })()}

      {/* B2B Stats section */}
      {isB2B && (
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <TrendingUp size={18} className="text-[#2563eb]" />
            Estadísticas de compra
          </h2>

          {/* Interactive stats + charts (KPIs live inside and respond to the period selector) */}
          <B2BCharts
            monthlyData={
              b2bStats?.monthlyData ??
              MONTH_LABELS.map((m) => ({ month: m, gasto: 0 }))
            }
            gameData={b2bStats?.gameData ?? []}
            orders={b2bStats?.orders}
            roleColor={roleColor}
          />
        </div>
      )}

      {/* Quick links grid */}
      <h2 className="mb-4 font-bold text-gray-900">Accesos rápidos</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {QUICK_LINKS.map(({ href, label, icon: Icon, desc, color }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${color}18` }}
            >
              <Icon size={20} style={{ color }} />
            </div>
            <p className="text-sm font-bold text-gray-900">{label}</p>
            <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
