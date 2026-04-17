"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  Tag,
  ShoppingBag,
  Users,
  AlertCircle,
  TrendingUp,
  Ticket,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getMergedProducts } from "@/lib/productStore";
import type { KpiMode } from "@/components/admin/SalesChart";
import { countNewIncidents } from "@/services/incidentService";
import {
  getOrderMetrics,
  getRevenueSummary,
  getTopProducts,
} from "@/services/analyticsService";
import type { OrderMetrics, TopProduct } from "@/services/analyticsService";
import {
  ALL_ORDERS,
  MOCK_USERS,
  MOCK_ADMIN_COUPONS,
  MOCK_SALES_7D,
  MOCK_SALES_30D,
  MOCK_SALES_3M,
  MOCK_SALES_1Y,
  MOCK_SALES_ALL,
} from "@/data/mockData";

const SalesChart = dynamic(
  () => import("@/components/admin/SalesChart").then((m) => m.SalesChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] animate-pulse rounded-xl bg-gray-50" />
    ),
  },
);


export default function AdminDashboard() {
  const router = useRouter();
  const [activeKpi, setActiveKpi] = useState<KpiMode>("ventas");

  const [productCount, setProductCount] = useState(() => getMergedProducts().length);
  const [lowStockCount, setLowStockCount] = useState(
    () => getMergedProducts().filter((p) => !p.inStock).length,
  );
  useEffect(() => {
    const reload = () => {
      const merged = getMergedProducts();
      setProductCount(merged.length);
      setLowStockCount(merged.filter((p) => !p.inStock).length);
    };
    window.addEventListener("tcga:products:updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("tcga:products:updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const [newIncidents, setNewIncidents] = useState(0);
  useEffect(() => {
    const update = () => setNewIncidents(countNewIncidents());
    update();
    window.addEventListener("tcga:incidents:updated", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("tcga:incidents:updated", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  // ── Analytics from real order data ──
  const [metrics, setMetrics] = useState<OrderMetrics>(() => getOrderMetrics());
  const [totalRevFromOrders, setTotalRevFromOrders] = useState(() => getRevenueSummary().total);
  const [topProducts, setTopProducts] = useState<TopProduct[]>(() => getTopProducts(5));
  useEffect(() => {
    const refresh = () => {
      setMetrics(getOrderMetrics());
      setTotalRevFromOrders(getRevenueSummary().total);
      setTopProducts(getTopProducts(5));
    };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  const [revPeriod, setRevPeriod] = useState<"hoy"|"7d"|"30d"|"3m"|"1a"|"todo">("hoy");

  const todayOrders = ALL_ORDERS.filter((o) => o.date === "2025-01-28");
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);

  const REV_PERIODS = {
    hoy:  { value: todayRevenue,  orders: todayOrders.length,  label: "Ingresos hoy" },
    "7d": { value: MOCK_SALES_7D.reduce((s,d)=>s+d.sales,0),  orders: MOCK_SALES_7D.reduce((s,d)=>s+d.orders,0),  label: "Ingresos 7 días" },
    "30d":{ value: MOCK_SALES_30D.reduce((s,d)=>s+d.sales,0), orders: MOCK_SALES_30D.reduce((s,d)=>s+d.orders,0), label: "Ingresos 30 días" },
    "3m": { value: MOCK_SALES_3M.reduce((s,d)=>s+d.sales,0),  orders: MOCK_SALES_3M.reduce((s,d)=>s+d.orders,0),  label: "Ingresos 3 meses" },
    "1a": { value: MOCK_SALES_1Y.reduce((s,d)=>s+d.sales,0),  orders: MOCK_SALES_1Y.reduce((s,d)=>s+d.orders,0),  label: "Ingresos 1 año" },
    todo: { value: MOCK_SALES_ALL.reduce((s,d)=>s+d.sales,0), orders: MOCK_SALES_ALL.reduce((s,d)=>s+d.orders,0), label: "Ingresos totales" },
  } as const;
  const currentRev = REV_PERIODS[revPeriod];

  const expiringCoupons = MOCK_ADMIN_COUPONS.filter(
    (c) => c.active && new Date(c.endsAt) <= new Date("2025-02-28"),
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Panel de administración
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Vista general de TCG Academy
        </p>
      </div>

      {/* KPI cards — clickables para cambiar el gráfico */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(
          [
            {
              kpi: "ventas" as KpiMode,
              label: currentRev.label,
              value: `${currentRev.value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`,
              sub: `${currentRev.orders} pedidos`,
              icon: TrendingUp,
              color: "#2563eb",
            },
            {
              kpi: "productos" as KpiMode,
              label: "Productos",
              value: productCount,
              sub: `${lowStockCount} sin stock`,
              icon: Package,
              color: "#7c3aed",
            },
            {
              kpi: "usuarios" as KpiMode,
              label: "Usuarios registrados",
              value: MOCK_USERS.length,
              sub: `${MOCK_USERS.filter((u) => u.active).length} activos`,
              icon: Users,
              color: "#0891b2",
            },
            {
              kpi: "descuentos" as KpiMode,
              label: "Cupones activos",
              value: MOCK_ADMIN_COUPONS.filter((c) => c.active).length,
              sub: "cupones vigentes",
              icon: Tag,
              color: "#dc2626",
            },
          ] as const
        ).map(({ kpi, label, value, sub, icon: Icon, color }) => {
          const isActive = activeKpi === kpi;
          return (
            <button
              key={kpi}
              onClick={() => kpi === "descuentos" ? router.push("/admin/cupones") : setActiveKpi(kpi)}
              className="rounded-2xl border bg-white p-5 text-left transition hover:shadow-md"
              style={{
                borderColor: isActive ? color : "#e5e7eb",
                boxShadow: isActive ? `0 0 0 2px ${color}30` : undefined,
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${color}${isActive ? "28" : "18"}` }}
                >
                  <Icon size={16} style={{ color }} />
                </div>
              </div>
              <p className="text-2xl leading-none font-bold text-gray-900">
                {value}
              </p>
              <p className="mt-1 text-xs text-gray-400">{sub}</p>
              {kpi === "ventas" && (
                <div
                  className="mt-3 flex flex-wrap gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(["hoy","7d","30d","3m","1a","todo"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setRevPeriod(p); }}
                      className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition"
                      style={{
                        background: revPeriod === p ? color : "#f3f4f6",
                        color: revPeriod === p ? "#fff" : "#6b7280",
                      }}
                    >
                      {p === "hoy" ? "Hoy" : p === "7d" ? "Sem" : p === "30d" ? "Mes" : p === "3m" ? "3M" : p === "1a" ? "Año" : "Todo"}
                    </button>
                  ))}
                </div>
              )}
              {isActive && kpi !== "ventas" && (
                <p className="mt-2 text-xs font-semibold" style={{ color }}>
                  Ver evolución ↓
                </p>
              )}
            </button>
          );
        })}
      </div>

      {newIncidents > 0 && (
        <Link
          href="/admin/incidencias"
          className="mb-6 flex items-center gap-4 rounded-2xl border-2 border-red-200 bg-red-50 px-5 py-4 transition hover:border-red-300"
        >
          <AlertCircle size={22} className="flex-shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="font-bold text-red-700">
              {newIncidents} incidencia{newIncidents > 1 ? "s" : ""} nueva{newIncidents > 1 ? "s" : ""} sin atender
            </p>
            <p className="text-sm text-red-500">Haz clic para ver y responder</p>
          </div>
          <span className="flex-shrink-0 rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-white">
            {newIncidents}
          </span>
        </Link>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Chart — adapta según KPI activo */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <div className="mb-1">
            <h2 className="font-bold text-gray-900">
              {activeKpi === "ventas" && "Evolución de ventas"}
              {activeKpi === "productos" && "Evolución del catálogo"}
              {activeKpi === "usuarios" && "Evolución de usuarios"}
              {activeKpi === "descuentos" && "Uso de cupones"}
            </h2>
          </div>
          <SalesChart mode={activeKpi} />
        </div>

        {/* Alerts */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <AlertCircle size={17} className="text-amber-500" /> Alertas
          </h2>
          <div className="space-y-3">
            {lowStockCount > 0 && (
              <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3">
                <Package
                  size={15}
                  className="mt-0.5 flex-shrink-0 text-amber-600"
                />
                <div>
                  <p className="text-sm font-semibold text-amber-700">
                    {lowStockCount} productos sin stock
                  </p>
                  <Link
                    href="/admin/stock"
                    className="text-xs text-amber-600 hover:underline"
                  >
                    Revisar →
                  </Link>
                </div>
              </div>
            )}
            {expiringCoupons.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl bg-red-50 p-3">
                <Ticket
                  size={15}
                  className="mt-0.5 flex-shrink-0 text-red-500"
                />
                <div>
                  <p className="text-sm font-semibold text-red-600">
                    {expiringCoupons.length} cupones caducan pronto
                  </p>
                  <Link
                    href="/admin/cupones"
                    className="text-xs text-red-500 hover:underline"
                  >
                    Revisar →
                  </Link>
                </div>
              </div>
            )}
            {ALL_ORDERS.filter((o) => o.status === "pedido").length > 0 && (
              <div className="flex items-start gap-3 rounded-xl bg-red-50 p-3">
                <ShoppingBag
                  size={15}
                  className="mt-0.5 flex-shrink-0 text-red-500"
                />
                <div>
                  <p className="text-sm font-semibold text-red-600">
                    {ALL_ORDERS.filter((o) => o.status === "pedido").length}{" "}
                    pedidos pendientes
                  </p>
                  <Link
                    href="/admin/pedidos"
                    className="text-xs text-red-500 hover:underline"
                  >
                    Gestionar →
                  </Link>
                </div>
              </div>
            )}
            {lowStockCount === 0 && expiringCoupons.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">
                Sin alertas activas ✓
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Analytics KPIs from real order data */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Ingresos totales (pedidos)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {totalRevFromOrders.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
          </p>
          <p className="mt-1 text-xs text-gray-400">{metrics.totalOrders} pedidos</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Valor medio pedido</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {metrics.avgOrderValue.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
          </p>
          <p className="mt-1 text-xs text-gray-400">{metrics.avgItemsPerOrder} items/pedido</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Tasa devoluciones</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{metrics.returnRate}%</p>
          <p className="mt-1 text-xs text-gray-400">Sobre total de pedidos</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Tasa incidencias</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{metrics.incidentRate}%</p>
          <p className="mt-1 text-xs text-gray-400">Sobre total de pedidos</p>
        </div>
      </div>

      {/* Top products */}
      {topProducts.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-bold text-gray-900">Top productos (por ingresos)</h2>
          <div className="space-y-2">
            {topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#2563eb]/10 text-xs font-bold text-[#2563eb]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.totalQty} uds vendidas</p>
                </div>
                <span className="flex-shrink-0 text-sm font-bold text-gray-900">
                  {p.totalRevenue.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
