"use client"
import Link from "next/link"
import { Package, MapPin, Heart, FileText, Tag, Building2, ChevronRight, User } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

const MOCK_LAST_ORDER = {
  id: "TCG-20240128-001",
  date: "28 Enero 2025",
  status: "Enviado",
  total: 109.95,
  items: 2,
}

export default function CuentaPage() {
  const { user } = useAuth()
  if (!user) return null

  const isB2B = user.role === "mayorista" || user.role === "tienda"

  const QUICK_LINKS = [
    { href: "/cuenta/pedidos", label: "Mis pedidos", icon: Package, desc: "Historial y seguimiento", color: "#1a3a5c" },
    { href: "/cuenta/datos", label: "Mis datos", icon: User, desc: "Perfil y contrasena", color: "#7c3aed" },
    { href: "/cuenta/direcciones", label: "Direcciones", icon: MapPin, desc: "Gestionar envios", color: "#0891b2" },
    { href: "/cuenta/favoritos", label: "Favoritos", icon: Heart, desc: "Lista de deseos", color: "#dc2626" },
    { href: "/cuenta/facturacion", label: "Facturacion", icon: FileText, desc: "Datos fiscales", color: "#d97706" },
    ...(isB2B
      ? [
          { href: "/cuenta/precios", label: "Mis precios", icon: Tag, desc: "Ver descuentos activos", color: "#16a34a" },
          { href: "/cuenta/empresa", label: "Empresa", icon: Building2, desc: "Datos de empresa", color: "#0f766e" },
        ]
      : []),
  ]

  return (
    <div>
      {/* Welcome */}
      <div className="bg-gradient-to-br from-[#1a3a5c] to-[#2d6a9f] rounded-2xl p-8 text-white mb-8">
        <p className="text-blue-200 text-sm mb-1">Bienvenido de nuevo</p>
        <h1 className="text-2xl font-bold mb-1">Hola, {user.name} 👋</h1>
        <p className="text-blue-200 text-sm">
          {user.role === "mayorista" && "Estas viendo precios PVP Mayorista en todo el catalogo."}
          {user.role === "tienda" && "Estas viendo precios PVP Tienda en todo el catalogo."}
          {user.role === "cliente" && "Explora el catalogo y gestiona tus pedidos desde aqui."}
        </p>
        {isB2B && (
          <Link
            href="/cuenta/precios"
            className="inline-flex items-center gap-2 mt-4 bg-white/20 border border-white/30 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-white/30 transition"
          >
            <Tag size={14} /> Ver mis precios especiales <ChevronRight size={14} />
          </Link>
        )}
      </div>

      {/* Last order */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Ultimo pedido</h2>
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

      {/* Quick links grid */}
      <h2 className="font-bold text-gray-900 mb-4">Accesos rapidos</h2>
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
