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
import { useState, useEffect, useMemo } from "react";
import { getMergedProducts } from "@/lib/productStore";
import type { KpiMode, PeriodOverride } from "@/components/admin/SalesChart";
import { countNewIncidents } from "@/services/incidentService";
import {
  getOrderMetrics,
  getRevenueSummary,
  getTopProducts,
  getLiveUserStats,
  countPendingAdminOrders,
  buildSalesSeries,
  buildUsersSeries,
  buildProductsSeries,
} from "@/services/analyticsService";
import type { OrderMetrics, TopProduct } from "@/services/analyticsService";
import { readAdminOrdersMerged } from "@/lib/orderAdapter";
import { ADMIN_ORDERS } from "@/data/mockData";
import { loadAdminCoupons } from "@/services/couponService";
import type { AdminCoupon } from "@/data/mockData";
import { clickableProps } from "@/lib/a11y";

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

  // ── Analytics from real order data (fuente única: readAdminOrdersMerged) ──
  const [metrics, setMetrics] = useState<OrderMetrics>(() => getOrderMetrics());
  const [totalRevFromOrders, setTotalRevFromOrders] = useState(() => getRevenueSummary().total);
  const [topProducts, setTopProducts] = useState<TopProduct[]>(() => getTopProducts(5, "revenue"));
  const [topProductsByQty, setTopProductsByQty] = useState<TopProduct[]>(() => getTopProducts(5, "qty"));
  const [userStats, setUserStats] = useState(() => getLiveUserStats());
  const [pendingOrdersCount, setPendingOrdersCount] = useState(() => countPendingAdminOrders());
  const [allOrders, setAllOrders] = useState(() => readAdminOrdersMerged(ADMIN_ORDERS));
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [salesSeries, setSalesSeries] = useState(() => ({
    "7d": buildSalesSeries("7d"),
    "30d": buildSalesSeries("30d"),
    "3m": buildSalesSeries("3m"),
    "1a": buildSalesSeries("1a"),
    "todo": buildSalesSeries("todo"),
  }));
  const [usersSeries, setUsersSeries] = useState(() => ({
    "7d": buildUsersSeries("7d"),
    "30d": buildUsersSeries("30d"),
    "3m": buildUsersSeries("3m"),
    "1a": buildUsersSeries("1a"),
    "todo": buildUsersSeries("todo"),
  }));
  const [productsSeries, setProductsSeries] = useState(() => ({
    "7d": buildProductsSeries("7d"),
    "30d": buildProductsSeries("30d"),
    "3m": buildProductsSeries("3m"),
    "1a": buildProductsSeries("1a"),
    "todo": buildProductsSeries("todo"),
  }));

  useEffect(() => {
    const refresh = () => {
      setMetrics(getOrderMetrics());
      setTotalRevFromOrders(getRevenueSummary().total);
      setTopProducts(getTopProducts(5, "revenue"));
      setTopProductsByQty(getTopProducts(5, "qty"));
      setUserStats(getLiveUserStats());
      setPendingOrdersCount(countPendingAdminOrders());
      setAllOrders(readAdminOrdersMerged(ADMIN_ORDERS));
      setSalesSeries({
        "7d": buildSalesSeries("7d"),
        "30d": buildSalesSeries("30d"),
        "3m": buildSalesSeries("3m"),
        "1a": buildSalesSeries("1a"),
        "todo": buildSalesSeries("todo"),
      });
      setUsersSeries({
        "7d": buildUsersSeries("7d"),
        "30d": buildUsersSeries("30d"),
        "3m": buildUsersSeries("3m"),
        "1a": buildUsersSeries("1a"),
        "todo": buildUsersSeries("todo"),
      });
      setProductsSeries({
        "7d": buildProductsSeries("7d"),
        "30d": buildProductsSeries("30d"),
        "3m": buildProductsSeries("3m"),
        "1a": buildProductsSeries("1a"),
        "todo": buildProductsSeries("todo"),
      });
    };
    window.addEventListener("storage", refresh);
    window.addEventListener("tcga:orders:updated", refresh);
    window.addEventListener("tcga:products:updated", refresh);
    window.addEventListener("tcga:users:updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("tcga:orders:updated", refresh);
      window.removeEventListener("tcga:products:updated", refresh);
      window.removeEventListener("tcga:users:updated", refresh);
    };
  }, []);

  // Cupones admin: SSOT vía couponService (localStorage + evento canónico).
  useEffect(() => {
    const reload = () => setCoupons(loadAdminCoupons());
    reload();
    window.addEventListener("tcga:coupons:updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("tcga:coupons:updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const [revPeriod, setRevPeriod] = useState<"hoy"|"7d"|"30d"|"3m"|"1a"|"todo">("hoy");

  // Ingresos por periodo — derivados de los MISMOS pedidos que todo el admin.
  const REV_PERIODS = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayOrders = allOrders.filter((o) => o.date.slice(0, 10) === todayKey);
    const sum = (s: { sales: number; orders: number }[]) => ({
      value: s.reduce((a, d) => a + d.sales, 0),
      orders: s.reduce((a, d) => a + d.orders, 0),
    });
    const s7 = sum(salesSeries["7d"]);
    const s30 = sum(salesSeries["30d"]);
    const s3m = sum(salesSeries["3m"]);
    const s1a = sum(salesSeries["1a"]);
    const sAll = sum(salesSeries["todo"]);
    return {
      hoy:  { value: todayOrders.reduce((a, o) => a + o.total, 0), orders: todayOrders.length, label: "Ingresos hoy" },
      "7d": { value: s7.value,  orders: s7.orders,  label: "Ingresos 7 días" },
      "30d":{ value: s30.value, orders: s30.orders, label: "Ingresos 30 días" },
      "3m": { value: s3m.value, orders: s3m.orders, label: "Ingresos 3 meses" },
      "1a": { value: s1a.value, orders: s1a.orders, label: "Ingresos 1 año" },
      todo: { value: sAll.value, orders: sAll.orders, label: "Ingresos totales" },
    } as const;
  }, [allOrders, salesSeries]);
  const currentRev = REV_PERIODS[revPeriod];

  // Cupones activos y próximos a caducar (calculado contra hoy, no fecha fija).
  const now = new Date();
  const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const expiringCoupons = coupons.filter(
    (c) => c.active && new Date(c.endsAt) <= inTwoWeeks,
  );
  const activeCouponsCount = coupons.filter((c) => c.active).length;

  // Mapa de overrides para SalesChart: cada mode lleva sus series vivas.
  const salesOverride: PeriodOverride = useMemo(() => {
    const prev = (arr: { sales: number }[]) => arr.reduce((s, d) => s + d.sales, 0);
    return {
      "7d":  { data: salesSeries["7d"],  prev: prev(salesSeries["7d"]) },
      "30d": { data: salesSeries["30d"], prev: prev(salesSeries["30d"]) },
      "3m":  { data: salesSeries["3m"],  prev: prev(salesSeries["3m"]) },
      "1a":  { data: salesSeries["1a"],  prev: prev(salesSeries["1a"]) },
      "todo": { data: salesSeries["todo"], prev: 0 },
    };
  }, [salesSeries]);

  const usersOverride: PeriodOverride = useMemo(() => {
    const last = (arr: { totalUsers: number }[]) => arr[arr.length - 1]?.totalUsers ?? 0;
    return {
      "7d":  { data: usersSeries["7d"],  prev: last(usersSeries["7d"]) },
      "30d": { data: usersSeries["30d"], prev: last(usersSeries["30d"]) },
      "3m":  { data: usersSeries["3m"],  prev: last(usersSeries["3m"]) },
      "1a":  { data: usersSeries["1a"],  prev: last(usersSeries["1a"]) },
      "todo": { data: usersSeries["todo"], prev: 0 },
    };
  }, [usersSeries]);

  const productsOverride: PeriodOverride = useMemo(() => {
    const last = (arr: { totalProducts: number }[]) => arr[arr.length - 1]?.totalProducts ?? 0;
    return {
      "7d":  { data: productsSeries["7d"],  prev: last(productsSeries["7d"]) },
      "30d": { data: productsSeries["30d"], prev: last(productsSeries["30d"]) },
      "3m":  { data: productsSeries["3m"],  prev: last(productsSeries["3m"]) },
      "1a":  { data: productsSeries["1a"],  prev: last(productsSeries["1a"]) },
      "todo": { data: productsSeries["todo"], prev: 0 },
    };
  }, [productsSeries]);

  const activeOverride =
    activeKpi === "ventas" ? salesOverride :
    activeKpi === "usuarios" ? usersOverride :
    activeKpi === "productos" ? productsOverride :
    undefined; // descuentos sigue usando mock hasta tener log real

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
              value: userStats.total,
              sub: `${userStats.active} activos`,
              icon: Users,
              color: "#0891b2",
            },
            {
              kpi: "descuentos" as KpiMode,
              label: "Cupones activos",
              value: activeCouponsCount,
              sub: "cupones vigentes",
              icon: Tag,
              color: "#dc2626",
            },
          ] as const
        ).map(({ kpi, label, value, sub, icon: Icon, color }) => {
          const isActive = activeKpi === kpi;
          return (
            <div
              key={kpi}
              role="button"
              tabIndex={0}
              onClick={() => kpi === "descuentos" ? router.push("/admin/cupones") : setActiveKpi(kpi)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (kpi === "descuentos") router.push("/admin/cupones");
                  else setActiveKpi(kpi);
                }
              }}
              className="cursor-pointer rounded-2xl border bg-white p-5 text-left transition hover:shadow-md"
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
                  {...clickableProps((e) => e?.stopPropagation())}
                  className="mt-3 flex flex-wrap gap-1"
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
            </div>
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
          <SalesChart mode={activeKpi} livePeriods={activeOverride} />
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
            {pendingOrdersCount > 0 && (
              <div className="flex items-start gap-3 rounded-xl bg-red-50 p-3">
                <ShoppingBag
                  size={15}
                  className="mt-0.5 flex-shrink-0 text-red-500"
                />
                <div>
                  <p className="text-sm font-semibold text-red-600">
                    {pendingOrdersCount}{" "}
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-bold text-gray-900">Top productos (por ingresos)</h2>
          {topProducts.length > 0 ? (
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
          ) : (
            <p className="text-sm text-gray-400">Aún no hay ventas registradas.</p>
          )}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-bold text-gray-900">Top productos (por unidades)</h2>
          {topProductsByQty.length > 0 ? (
            <div className="space-y-2">
              {topProductsByQty.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#2563eb]/10 text-xs font-bold text-[#2563eb]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400">
                      {p.totalRevenue.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€ facturados
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-sm font-bold text-gray-900">
                    {p.totalQty} uds
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Aún no hay ventas registradas.</p>
          )}
        </div>
      </div>

    </div>
  );
}
