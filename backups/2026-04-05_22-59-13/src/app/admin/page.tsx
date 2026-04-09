"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Package,
  Tag,
  ShoppingBag,
  Users,
  AlertCircle,
  TrendingUp,
  Ticket,
  ArrowRight,
  BarChart2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { PRODUCTS } from "@/data/products";
import { getMergedProducts } from "@/lib/productStore";
import { useDiscounts } from "@/context/DiscountContext";
import {
  ALL_ORDERS,
  MOCK_USERS,
  MOCK_ADMIN_COUPONS,
  MOCK_TOP_PRODUCTS,
  MOCK_REVENUE_BY_GAME,
} from "@/data/mockData";


const SalesChart = dynamic(
  () => import("@/components/admin/SalesChart").then((m) => m.SalesChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] animate-pulse rounded-xl bg-gray-50" />
    ),
  },
);


const GAME_EMOJI: Record<string, string> = {
  pokemon: "🎴",
  magic: "✨",
  "one-piece": "⚓",
  yugioh: "👁️",
  naruto: "🍃",
  dragonball: "🐉",
  lorcana: "🏰",
};

export default function AdminDashboard() {
  const { discounts } = useDiscounts();
  const activeDiscounts = Object.values(discounts).filter(
    (d) => d.active,
  ).length;

  const [productCount, setProductCount] = useState(PRODUCTS.length);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProductCount(getMergedProducts().length);
  }, []);

  const todayOrders = ALL_ORDERS.filter((o) => o.date === "2025-01-28");
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
  const lowStockCount = PRODUCTS.filter((p) => !p.inStock).length;
  const weekRevenue = 6110;
  const weekOrders = 58;
  const avgTicket = (weekRevenue / weekOrders).toFixed(2);

  const expiringCoupons = MOCK_ADMIN_COUPONS.filter(
    (c) => c.active && new Date(c.endsAt) <= new Date("2025-02-28"),
  );

  const newUsersThisWeek = MOCK_USERS.filter((u) => {
    const d = new Date(u.registeredAt);
    return d >= new Date("2025-01-22");
  }).length;

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

      {/* KPI cards — row 1 */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Ingresos hoy",
            value: `${todayRevenue.toFixed(2)}€`,
            sub: `${todayOrders.length} pedidos`,
            icon: TrendingUp,
            color: "#2563eb",
            href: "/admin/pedidos",
          },
          {
            label: "Productos",
            value: productCount,
            sub: `${lowStockCount} sin stock`,
            icon: Package,
            color: "#7c3aed",
            href: "/admin/productos",
          },
          {
            label: "Usuarios",
            value: MOCK_USERS.length,
            sub: `+${newUsersThisWeek} esta semana`,
            icon: Users,
            color: "#0891b2",
            href: "/admin/usuarios",
          },
          {
            label: "Ticket medio",
            value: `${avgTicket}€`,
            sub: `${weekOrders} pedidos/semana`,
            icon: BarChart2,
            color: "#059669",
            href: "/admin/estadisticas",
          },
        ].map(({ label, value, sub, icon: Icon, color, href }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${color}18` }}
              >
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl leading-none font-bold text-gray-900">
              {value}
            </p>
            <p className="mt-1 text-xs text-gray-400">{sub}</p>
          </Link>
        ))}
      </div>

      {/* KPI cards — row 2 */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Descuentos activos",
            value:
              activeDiscounts +
              MOCK_ADMIN_COUPONS.filter((c) => c.active).length,
            sub: "cupones + descuentos",
            icon: Tag,
            color: "#dc2626",
          },
          {
            label: "Pedidos pendientes",
            value: ALL_ORDERS.filter((o) => o.status === "pedido").length,
            sub: "esperan confirmación",
            icon: ShoppingBag,
            color: "#d97706",
          },
          {
            label: "Mayoristas activos",
            value: MOCK_USERS.filter((u) => u.role === "mayorista" && u.active)
              .length,
            sub: "cuentas B2B",
            icon: Users,
            color: "#7c3aed",
          },
          {
            label: "Tiendas TCG",
            value: MOCK_USERS.filter((u) => u.role === "tienda").length,
            sub: "socios distribución",
            icon: Package,
            color: "#0891b2",
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-200 bg-white p-5"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${color}18` }}
              >
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl leading-none font-bold text-gray-900">
              {value}
            </p>
            <p className="mt-1 text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Chart + Alerts */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-1 font-bold text-gray-900">Ventas</h2>
          <SalesChart height={220} />
        </div>

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
                    href="/admin/productos"
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
              <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-3">
                <ShoppingBag
                  size={15}
                  className="mt-0.5 flex-shrink-0 text-blue-600"
                />
                <div>
                  <p className="text-sm font-semibold text-blue-700">
                    {ALL_ORDERS.filter((o) => o.status === "pedido").length}{" "}
                    pedidos pendientes
                  </p>
                  <Link
                    href="/admin/pedidos"
                    className="text-xs text-blue-600 hover:underline"
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

      {/* Top products + Revenue by game */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Top products */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="font-bold text-gray-900">Productos más vendidos</h2>
            <Link
              href="/admin/productos"
              className="flex items-center gap-1 text-sm font-semibold text-[#2563eb] hover:underline"
            >
              Ver catálogo <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {MOCK_TOP_PRODUCTS.slice(0, 5).map((product, i) => (
              <div
                key={product.id}
                className="flex items-center gap-3 px-5 py-3"
              >
                <span className="w-5 flex-shrink-0 text-xs font-bold text-gray-300">
                  {i + 1}
                </span>
                <span className="flex-shrink-0 text-base">
                  {GAME_EMOJI[product.game] ?? "🃏"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">
                    {product.game}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {product.revenue.toLocaleString("es-ES", {
                      minimumFractionDigits: 0,
                    })}
                    €
                  </p>
                  <p className="text-xs text-gray-400">{product.units} ud.</p>
                </div>
                <span
                  className={`w-12 flex-shrink-0 text-right text-xs font-bold ${
                    product.trend >= 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {product.trend >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(product.trend)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by game */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-bold text-gray-900">Ingresos por juego</h2>
          <div className="space-y-3">
            {MOCK_REVENUE_BY_GAME.map((item) => (
              <div key={item.game}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700">
                    {item.game}
                  </span>
                  <span className="text-gray-500">
                    {item.revenue.toLocaleString("es-ES")}€{" "}
                    <span className="text-gray-400">({item.pct}%)</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${item.pct}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-gray-100 pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-gray-900">
                {MOCK_REVENUE_BY_GAME.reduce(
                  (s, i) => s + i.revenue,
                  0,
                ).toLocaleString("es-ES")}
                €
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          {
            label: "Catálogo",
            href: "/admin/productos",
            icon: Package,
            color: "#2563eb",
          },
          {
            label: "Descuentos",
            href: "/admin/descuentos",
            icon: Tag,
            color: "#dc2626",
          },
          {
            label: "Pedidos",
            href: "/admin/pedidos",
            icon: ShoppingBag,
            color: "#7c3aed",
          },
          {
            label: "Usuarios",
            href: "/admin/usuarios",
            icon: Users,
            color: "#0891b2",
          },
          {
            label: "Cupones",
            href: "/admin/cupones",
            icon: Ticket,
            color: "#059669",
          },
          {
            label: "Estadísticas",
            href: "/admin/estadisticas",
            icon: BarChart2,
            color: "#d97706",
          },
        ].map(({ label, href, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-center transition hover:shadow-md"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl transition group-hover:scale-110"
              style={{ backgroundColor: `${color}18` }}
            >
              <Icon size={20} style={{ color }} />
            </div>
            <span className="text-xs font-semibold text-gray-700">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
