"use client"
import { useAuth } from "@/context/AuthContext"
import { useNotifications } from "@/context/NotificationContext"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  User, Package, MapPin, Heart, FileText, Building2,
  Tag, LogOut, ChevronRight, Receipt, Gift, Star,
  Bell, RefreshCw, Menu, X,
} from "lucide-react"

const PUBLIC_PATHS = ["/cuenta/login", "/cuenta/registro", "/cuenta/recuperar"]

const NAV_ITEMS = [
  { href: "/cuenta", label: "Mi cuenta", icon: User, exact: true },
  { href: "/cuenta/pedidos", label: "Mis pedidos", icon: Package },
  { href: "/cuenta/facturas", label: "Mis facturas", icon: Receipt },
  { href: "/cuenta/cupones", label: "Cupones y descuentos", icon: Gift },
  { href: "/cuenta/bonos", label: "Bonos y puntos", icon: Star },
  { href: "/cuenta/notificaciones", label: "Notificaciones", icon: Bell, badge: true },
  { href: "/cuenta/devoluciones", label: "Devoluciones", icon: RefreshCw },
  { href: "/cuenta/datos", label: "Mis datos", icon: User },
  { href: "/cuenta/direcciones", label: "Direcciones", icon: MapPin },
  { href: "/cuenta/favoritos", label: "Favoritos", icon: Heart },
  { href: "/cuenta/facturacion", label: "Facturación", icon: FileText },
]

const B2B_ITEMS = [
  { href: "/cuenta/precios", label: "Mis precios especiales", icon: Tag },
  { href: "/cuenta/empresa", label: "Datos de empresa", icon: Building2 },
]

function NavItem({
  href, label, icon: Icon, active, badge, unreadCount,
}: {
  href: string; label: string; icon: React.ElementType
  active: boolean; badge?: boolean; unreadCount?: number
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between px-4 py-3 text-sm border-b border-gray-100 last:border-0 transition min-h-[44px] ${
        active ? "bg-[#1a3a5c] text-white" : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon size={16} />
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        {badge && unreadCount && unreadCount > 0 ? (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>
            {unreadCount}
          </span>
        ) : null}
        {active && <ChevronRight size={14} />}
      </span>
    </Link>
  )
}

export default function CuentaLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p)

  useEffect(() => {
    if (isLoading) return
    if (!user && !isPublicPath) router.push("/cuenta/login")
  }, [user, isLoading, isPublicPath, router])

  // Close mobile nav on route change
  useEffect(() => { setMobileNavOpen(false) }, [pathname])

  if (isPublicPath) return <>{children}</>

  if (isLoading || !user) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1a3a5c] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isB2B = user.role === "mayorista" || user.role === "tienda"

  const Sidebar = () => (
    <aside>
      {/* User card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-[#1a3a5c] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {user.name[0]}{user.lastName[0]}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 truncate">{user.name} {user.lastName}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              user.role === "tienda" ? "bg-purple-100 text-purple-700"
              : user.role === "mayorista" ? "bg-blue-100 text-blue-700"
              : user.role === "admin" ? "bg-amber-100 text-amber-700"
              : "bg-gray-100 text-gray-600"
            }`}>
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-4">
        {NAV_ITEMS.map(({ href, label, icon, exact, badge }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={active}
              badge={badge}
              unreadCount={unreadCount}
            />
          )
        })}
      </nav>

      {/* B2B section */}
      {isB2B && (
        <nav className="bg-white border border-blue-200 rounded-2xl overflow-hidden mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 px-4 py-2 border-b border-blue-100">
            Zona Profesional
          </p>
          {B2B_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center justify-between px-4 py-3 text-sm border-b border-gray-100 last:border-0 transition min-h-[44px] ${
                  active ? "bg-[#1a3a5c] text-white" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-3"><Icon size={16} />{label}</span>
                {active && <ChevronRight size={14} />}
              </Link>
            )
          })}
        </nav>
      )}

      {/* Logout */}
      <button
        onClick={() => { logout(); router.push("/") }}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-2xl border border-gray-200 transition min-h-[44px]"
      >
        <LogOut size={16} /> Cerrar sesión
      </button>
    </aside>
  )

  return (
    <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8 md:py-10">
      {/* Mobile nav toggle */}
      <button
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        className="lg:hidden flex items-center gap-2 mb-4 text-sm font-semibold text-[#1a3a5c] bg-white border border-gray-200 rounded-xl px-4 py-2.5 min-h-[44px]"
      >
        {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
        {mobileNavOpen ? "Cerrar menú" : "Menú de cuenta"}
        {unreadCount > 0 && !mobileNavOpen && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
        )}
      </button>

      {/* Mobile sidebar (collapsible) */}
      {mobileNavOpen && (
        <div className="lg:hidden mb-6">
          <Sidebar />
        </div>
      )}

      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Content */}
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
