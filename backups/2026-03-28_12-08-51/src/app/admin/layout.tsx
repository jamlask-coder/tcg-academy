"use client"
import { useAuth } from "@/context/AuthContext"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  LayoutDashboard, Package, Tag, ShoppingBag, Users,
  Ticket, Star, Mail, Wrench, BookOpen, LogOut,
  ChevronRight, Menu, X, ArrowLeft,
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  exact?: boolean
}

import React from "react"

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Principal",
    items: [
      { href: "/admin", label: "Panel principal", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/admin/productos", label: "Gestión de precios", icon: Package },
      { href: "/admin/descuentos", label: "Descuentos", icon: Tag },
    ],
  },
  {
    label: "Ventas",
    items: [
      { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
      { href: "/admin/usuarios", label: "Usuarios", icon: Users },
    ],
  },
  {
    label: "Fidelización",
    items: [
      { href: "/admin/cupones", label: "Cupones", icon: Ticket },
      { href: "/admin/bonos", label: "Bonos y puntos", icon: Star },
    ],
  },
  {
    label: "Comunicación",
    items: [
      { href: "/admin/emails", label: "Emails", icon: Mail },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/herramientas", label: "Herramientas", icon: Wrench },
      { href: "/admin/manual", label: "Manual de uso", icon: BookOpen },
    ],
  },
]

function SidebarContent({ pathname, user, onClose }: {
  pathname: string
  user: { name: string; lastName: string }
  onClose?: () => void
}) {
  const router = useRouter()
  const { logout } = useAuth()

  return (
    <div className="h-full flex flex-col">
      {/* Admin badge */}
      <div className="bg-[#1a3a5c] rounded-2xl p-4 mb-4 text-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-300 mb-1">Panel de administración</p>
            <p className="font-bold">{user.name} {user.lastName}</p>
          </div>
          <span className="text-[10px] bg-amber-400 text-[#1a3a5c] font-black px-2 py-0.5 rounded-full uppercase">Admin</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-3 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 mb-1">
              {section.label}
            </p>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {section.items.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-4 py-2.5 text-sm border-b border-gray-100 last:border-0 transition min-h-[44px] ${
                      active ? "bg-[#1a3a5c] text-white" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center gap-3"><Icon size={15} />{label}</span>
                    {active && <ChevronRight size={13} />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-4 space-y-2 flex-shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition min-h-[44px]"
        >
          <ArrowLeft size={15} /> Ver la tienda
        </Link>
        <button
          onClick={() => { logout(); router.push("/") }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg border border-gray-200 transition min-h-[44px]"
        >
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>
    </div>
  )
}

function Breadcrumb({ pathname }: { pathname: string }) {
  const allItems = NAV_SECTIONS.flatMap((s) => s.items)
  const current = allItems.find((i) => i.exact ? pathname === i.href : pathname.startsWith(i.href))
  if (!current || pathname === "/admin") return null

  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
      <Link href="/admin" className="hover:text-[#1a3a5c] transition">Admin</Link>
      <ChevronRight size={14} />
      <span className="text-gray-900 font-medium">{current.label}</span>
    </nav>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!user || user.role !== "admin") router.push("/cuenta/login")
  }, [user, isLoading, router])

  useEffect(() => { setMobileSidebarOpen(false) }, [pathname])

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1a3a5c] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center gap-3 mb-4">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="flex items-center gap-2 bg-[#1a3a5c] text-white px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]"
        >
          {mobileSidebarOpen ? <X size={16} /> : <Menu size={16} />}
          {mobileSidebarOpen ? "Cerrar" : "Menú admin"}
        </button>
        <Breadcrumb pathname={pathname} />
      </div>

      {/* Mobile sidebar */}
      {mobileSidebarOpen && (
        <div className="lg:hidden mb-6 bg-gray-50 rounded-2xl p-4">
          <SidebarContent
            pathname={pathname}
            user={user}
            onClose={() => setMobileSidebarOpen(false)}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <SidebarContent pathname={pathname} user={user} />
        </div>

        {/* Content */}
        <main className="min-w-0">
          <div className="hidden lg:block">
            <Breadcrumb pathname={pathname} />
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
