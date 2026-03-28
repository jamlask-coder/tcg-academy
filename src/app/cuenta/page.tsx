"use client"
import Link from "next/link"
import { Package, MapPin, Heart, FileText, Building2, ChevronRight, User, TrendingUp, Euro, ShoppingBag } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

const B2BCharts = dynamic(
  () => import("@/components/account/B2BCharts").then((m) => m.B2BCharts),
  { ssr: false, loading: () => <div className="h-40 animate-pulse bg-gray-100 rounded-2xl" /> }
)

const MOCK_LAST_ORDER = {
  id: "TCG-20240128-001",
  date: "28 Enero 2025",
  status: "Enviado",
  total: 109.95,
  items: 2,
}

// Months for the chart labels
const MONTH_LABELS = ["Oct", "Nov", "Dic", "Ene", "Feb", "Mar"]

interface B2BStats {
  totalSpent: number
  orderCount: number
  monthlyData: { month: string; gasto: number }[]
  gameData: { game: string; gasto: number }[]
}

function buildMonthlyData(orders: Array<{ total: number; date: string }>) {
  const now = new Date()
  return MONTH_LABELS.map((month, i) => {
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const total = orders
      .filter((o) => {
        const d = new Date(o.date)
        return d.getMonth() === targetMonth.getMonth() && d.getFullYear() === targetMonth.getFullYear()
      })
      .reduce((s, o) => s + o.total, 0)
    return { month, gasto: Math.round(total * 100) / 100 }
  })
}

function buildGameData(orders: Array<{ items?: Array<{ game: string; price: number; qty: number }> }>) {
  const totals: Record<string, number> = {}
  for (const o of orders) {
    for (const item of o.items ?? []) {
      totals[item.game] = (totals[item.game] ?? 0) + item.price * item.qty
    }
  }
  return Object.entries(totals)
    .map(([game, gasto]) => ({ game: game.charAt(0).toUpperCase() + game.slice(1), gasto: Math.round(gasto * 100) / 100 }))
    .sort((a, b) => b.gasto - a.gasto)
    .slice(0, 6)
}

export default function CuentaPage() {
  const { user } = useAuth()
  const [b2bStats, setB2bStats] = useState<B2BStats | null>(null)

  useEffect(() => {
    if (!user) return
    if (user.role !== "mayorista" && user.role !== "tienda") return
    try {
      const orders = JSON.parse(localStorage.getItem("tcgacademy_orders") ?? "[]") as Array<{
        total: number; date: string; items?: Array<{ game: string; price: number; qty: number }>
      }>
      const total = orders.reduce((s, o) => s + o.total, 0)
      setB2bStats({
        totalSpent: total,
        orderCount: orders.length,
        monthlyData: buildMonthlyData(orders),
        gameData: buildGameData(orders),
      })
    } catch {}
  }, [user])

  if (!user) return null

  const isB2B = user.role === "mayorista" || user.role === "tienda"
  const roleColor = user.role === "tienda" ? "#7c3aed" : "#1a3a5c"

  const QUICK_LINKS = [
    { href: "/cuenta/pedidos", label: "Mis pedidos", icon: Package, desc: "Historial y seguimiento", color: "#1a3a5c" },
    { href: "/cuenta/datos", label: "Mis datos", icon: User, desc: "Perfil y contraseña", color: "#7c3aed" },
    ...(isB2B
      ? [{ href: "/cuenta/empresa", label: "Empresa", icon: Building2, desc: "Datos de empresa", color: "#0f766e" }]
      : [{ href: "/cuenta/direcciones", label: "Direcciones", icon: MapPin, desc: "Gestionar envíos", color: "#0891b2" }]
    ),
    { href: "/cuenta/favoritos", label: "Favoritos", icon: Heart, desc: "Lista de deseos", color: "#dc2626" },
    { href: "/cuenta/facturacion", label: "Facturación", icon: FileText, desc: "Datos fiscales", color: "#d97706" },
  ]

  return (
    <div>
      {/* Welcome */}
      <div className="bg-gradient-to-br from-[#1a3a5c] to-[#2d6a9f] rounded-2xl p-8 text-white mb-8">
        <p className="text-blue-200 text-sm mb-1">Bienvenido de nuevo</p>
        <h1 className="text-2xl font-bold mb-1">Hola, {user.name} 👋</h1>
        <p className="text-blue-200 text-sm">
          {user.role === "mayorista" && "Estás viendo precios PVP Mayorista en todo el catálogo."}
          {user.role === "tienda" && "Estás viendo precios PVP Tienda en todo el catálogo."}
          {user.role === "cliente" && "Explora el catálogo y gestiona tus pedidos desde aquí."}
          {user.role === "admin" && "Panel de administración — acceso completo."}
        </p>
      </div>

      {/* Last order */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Último pedido</h2>
          <Link href="/cuenta/pedidos" className="text-sm text-[#1a3a5c] hover:underline flex items-center gap-1">
            Ver todos <ChevronRight size={14} />
          </Link>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">{MOCK_LAST_ORDER.id}</p>
            <p className="text-xs text-gray-500 mt-0.5">{MOCK_LAST_ORDER.date} · {MOCK_LAST_ORDER.items} productos</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
              {MOCK_LAST_ORDER.status}
            </span>
            <span className="font-bold text-gray-900">{MOCK_LAST_ORDER.total.toFixed(2)}€</span>
            <Link href={`/cuenta/pedidos/${MOCK_LAST_ORDER.id}`}
              className="text-sm text-[#1a3a5c] hover:underline">Ver detalle</Link>
          </div>
        </div>
      </div>

      {/* B2B Stats section */}
      {isB2B && (
        <div className="mb-8">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-[#1a3a5c]" />
            Estadísticas de compra
          </h2>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { label: "Total gastado", value: `${(b2bStats?.totalSpent ?? 0).toFixed(2)} €`, icon: Euro, color: "#1a3a5c" },
              { label: "Nº pedidos", value: String(b2bStats?.orderCount ?? 0), icon: ShoppingBag, color: "#7c3aed" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${color}18` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <B2BCharts
            monthlyData={b2bStats?.monthlyData ?? MONTH_LABELS.map((m) => ({ month: m, gasto: 0 }))}
            gameData={b2bStats?.gameData ?? []}
            roleColor={roleColor}
          />
        </div>
      )}

      {/* Quick links grid */}
      <h2 className="font-bold text-gray-900 mb-4">Accesos rápidos</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {QUICK_LINKS.map(({ href, label, icon: Icon, desc, color }) => (
          <Link
            key={href}
            href={href}
            className="group bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${color}18` }}
            >
              <Icon size={20} style={{ color }} />
            </div>
            <p className="font-bold text-gray-900 text-sm">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
