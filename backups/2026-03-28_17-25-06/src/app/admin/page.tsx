"use client"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  Package, Tag, ShoppingBag, Users, AlertCircle,
  TrendingUp, Ticket, ArrowRight,
} from "lucide-react"
import { PRODUCTS } from "@/data/products"
import { useDiscounts } from "@/context/DiscountContext"
import { ALL_ORDERS, MOCK_USERS, MOCK_ADMIN_COUPONS, MOCK_SALES_7D } from "@/data/mockData"

const SalesChart = dynamic(
  () => import("@/components/admin/SalesChart").then((m) => m.SalesChart),
  { ssr: false, loading: () => <div className="h-[200px] bg-gray-50 rounded-xl animate-pulse" /> }
)

const STATUS_COLORS: Record<string, string> = {
  pendiente:   "bg-amber-100 text-amber-700",
  procesando:  "bg-blue-100 text-blue-700",
  enviado:     "bg-purple-100 text-purple-700",
  entregado:   "bg-green-100 text-green-700",
  cancelado:   "bg-red-100 text-red-700",
}

export default function AdminDashboard() {
  const { discounts } = useDiscounts()
  const activeDiscounts = Object.values(discounts).filter((d) => d.active).length

  const todayOrders = ALL_ORDERS.filter((o) => o.date === "2025-01-28")
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0)
  const lowStockCount = PRODUCTS.filter((p) => !p.inStock).length
  const weekRevenue = MOCK_SALES_7D.reduce((s, d) => s + d.sales, 0)
  const weekOrders = MOCK_SALES_7D.reduce((s, d) => s + d.orders, 0)

  const expiringCoupons = MOCK_ADMIN_COUPONS.filter(
    (c) => c.active && new Date(c.endsAt) <= new Date("2025-02-28")
  )

  const recentOrders = [...ALL_ORDERS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Panel de administración</h1>
        <p className="text-gray-500 text-sm mt-1">Vista general de TCG Academy</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Ingresos hoy", value: `${todayRevenue.toFixed(2)}€`, sub: `${todayOrders.length} pedidos`, icon: TrendingUp, color: "#1a3a5c" },
          { label: "Productos", value: PRODUCTS.length, sub: `${lowStockCount} sin stock`, icon: Package, color: "#7c3aed" },
          { label: "Usuarios", value: MOCK_USERS.length, sub: `${MOCK_USERS.filter(u => u.active).length} activos`, icon: Users, color: "#0891b2" },
          { label: "Descuentos activos", value: activeDiscounts + MOCK_ADMIN_COUPONS.filter(c => c.active).length, sub: "cupones + descuentos", icon: Tag, color: "#dc2626" },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Sales chart */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900">Ventas últimos 7 días</h2>
              <p className="text-sm text-gray-500">{weekRevenue.toFixed(2)}€ · {weekOrders} pedidos</p>
            </div>
          </div>
          <SalesChart />
        </div>

        {/* Alerts */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle size={17} className="text-amber-500" /> Alertas
          </h2>
          <div className="space-y-3">
            {lowStockCount > 0 && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                <Package size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-700">{lowStockCount} productos sin stock</p>
                  <Link href="/admin/productos" className="text-xs text-amber-600 hover:underline">
                    Revisar →
                  </Link>
                </div>
              </div>
            )}
            {expiringCoupons.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
                <Ticket size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-600">{expiringCoupons.length} cupones caducan pronto</p>
                  <Link href="/admin/cupones" className="text-xs text-red-500 hover:underline">
                    Revisar →
                  </Link>
                </div>
              </div>
            )}
            {ALL_ORDERS.filter(o => o.status === "pendiente").length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                <ShoppingBag size={15} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-700">
                    {ALL_ORDERS.filter(o => o.status === "pendiente").length} pedidos pendientes
                  </p>
                  <Link href="/admin/pedidos" className="text-xs text-blue-600 hover:underline">
                    Gestionar →
                  </Link>
                </div>
              </div>
            )}
            {lowStockCount === 0 && expiringCoupons.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Sin alertas activas ✓</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Últimos pedidos</h2>
          <Link href="/admin/pedidos" className="text-sm font-semibold text-[#1a3a5c] hover:underline flex items-center gap-1">
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-semibold">Pedido</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Fecha</th>
                <th className="text-right px-4 py-3 font-semibold">Total</th>
                <th className="text-center px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-gray-800">{order.id}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell capitalize">
                    {order.userId.replace("demo_", "")}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{order.date}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{order.total.toFixed(2)}€</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Precios", href: "/admin/productos", icon: Package, color: "#1a3a5c" },
          { label: "Descuentos", href: "/admin/descuentos", icon: Tag, color: "#dc2626" },
          { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingBag, color: "#7c3aed" },
          { label: "Usuarios", href: "/admin/usuarios", icon: Users, color: "#0891b2" },
          { label: "Cupones", href: "/admin/cupones", icon: Ticket, color: "#059669" },
          { label: "Herramientas", href: "/admin/herramientas", icon: TrendingUp, color: "#d97706" },
        ].map(({ label, href, icon: Icon, color }) => (
          <Link key={href} href={href}
            className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:shadow-md transition group flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition group-hover:scale-110"
              style={{ backgroundColor: `${color}18` }}>
              <Icon size={20} style={{ color }} />
            </div>
            <span className="text-xs font-semibold text-gray-700">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
