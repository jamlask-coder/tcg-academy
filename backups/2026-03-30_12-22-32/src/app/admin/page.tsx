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
} from "lucide-react";
import { PRODUCTS } from "@/data/products";
import { useDiscounts } from "@/context/DiscountContext";
import {
  ALL_ORDERS,
  MOCK_USERS,
  MOCK_ADMIN_COUPONS,
  MOCK_SALES_7D,
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

const STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  procesando: "bg-blue-100 text-blue-700",
  enviado: "bg-purple-100 text-purple-700",
  entregado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
};

export default function AdminDashboard() {
  const { discounts } = useDiscounts();
  const activeDiscounts = Object.values(discounts).filter(
    (d) => d.active,
  ).length;

  const todayOrders = ALL_ORDERS.filter((o) => o.date === "2025-01-28");
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
  const lowStockCount = PRODUCTS.filter((p) => !p.inStock).length;
  const weekRevenue = MOCK_SALES_7D.reduce((s, d) => s + d.sales, 0);
  const weekOrders = MOCK_SALES_7D.reduce((s, d) => s + d.orders, 0);

  const expiringCoupons = MOCK_ADMIN_COUPONS.filter(
    (c) => c.active && new Date(c.endsAt) <= new Date("2025-02-28"),
  );

  const recentOrders = [...ALL_ORDERS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

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

      {/* KPI cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Ingresos hoy",
            value: `${todayRevenue.toFixed(2)}€`,
            sub: `${todayOrders.length} pedidos`,
            icon: TrendingUp,
            color: "#1a3a5c",
          },
          {
            label: "Productos",
            value: PRODUCTS.length,
            sub: `${lowStockCount} sin stock`,
            icon: Package,
            color: "#7c3aed",
          },
          {
            label: "Usuarios",
            value: MOCK_USERS.length,
            sub: `${MOCK_USERS.filter((u) => u.active).length} activos`,
            icon: Users,
            color: "#0891b2",
          },
          {
            label: "Descuentos activos",
            value:
              activeDiscounts +
              MOCK_ADMIN_COUPONS.filter((c) => c.active).length,
            sub: "cupones + descuentos",
            icon: Tag,
            color: "#dc2626",
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

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Sales chart */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">Ventas últimos 7 días</h2>
              <p className="text-sm text-gray-500">
                {weekRevenue.toFixed(2)}€ · {weekOrders} pedidos
              </p>
            </div>
          </div>
          <SalesChart />
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

      {/* Recent orders */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-900">Últimos pedidos</h2>
          <Link
            href="/admin/pedidos"
            className="flex items-center gap-1 text-sm font-semibold text-[#1a3a5c] hover:underline"
          >
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs tracking-wider text-gray-500 uppercase">
                <th className="px-5 py-3 text-left font-semibold">Pedido</th>
                <th className="hidden px-4 py-3 text-left font-semibold md:table-cell">
                  Cliente
                </th>
                <th className="hidden px-4 py-3 text-left font-semibold sm:table-cell">
                  Fecha
                </th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-center font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <tr key={order.id} className="transition hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-gray-800">
                    {order.id}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-600 capitalize md:table-cell">
                    {order.userId.replace("demo_", "")}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">
                    {order.date}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    {order.total.toFixed(2)}€
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          {
            label: "Precios",
            href: "/admin/productos",
            icon: Package,
            color: "#1a3a5c",
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
            label: "Herramientas",
            href: "/admin/herramientas",
            icon: TrendingUp,
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
