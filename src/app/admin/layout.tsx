"use client";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingBag,
  Users,
  LogOut,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  ArrowLeft,
  Receipt,
  Inbox,
  BarChart2,
  PackagePlus,
  BadgeDollarSign,
  UserCircle,
  Layers,
  Ticket,
  Wrench,
  FilePlus,
  AlertTriangle,
  MessageSquare,
  Mail,
  BookOpen,
  Bell,
} from "lucide-react";

const SOLICITUDES_KEY = "tcgacademy_solicitudes";
import { countPendingOrders } from "@/data/mockData";
import { countNewIncidents } from "@/services/incidentService";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  exact?: boolean;
  sub?: NavItem[];
  excludePathPrefixes?: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/admin",
    label: "Panel principal",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/productos/nuevo",
    label: "Añadir producto",
    icon: PackagePlus,
  },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  {
    href: "/admin/precios",
    label: "Precios",
    icon: BadgeDollarSign,
    sub: [
      { href: "/admin/productos", label: "Gestión de precios", icon: Package, excludePathPrefixes: ["/admin/productos/nuevo"] },
      { href: "/admin/descuentos", label: "Descuentos", icon: Tag },
    ],
  },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/categorias", label: "Subcategorías", icon: Layers },
  { href: "/admin/solicitudes", label: "Solicitudes B2B", icon: Inbox },
  { href: "/admin/estadisticas", label: "Estadísticas", icon: BarChart2 },
  {
    href: "/admin/fiscal",
    label: "Facturas",
    icon: Receipt,
    sub: [
      { href: "/admin/fiscal/facturas", label: "Todas las facturas", icon: Receipt },
      { href: "/admin/fiscal/nueva-factura", label: "Emitir factura manual", icon: FilePlus },
    ],
  },
  { href: "/admin/incidencias", label: "Incidencias", icon: AlertTriangle },
  { href: "/admin/cupones", label: "Cupones", icon: Ticket },
  { href: "/admin/notificaciones", label: "Notificaciones", icon: Bell },
  { href: "/admin/mensajes", label: "Mensajes", icon: MessageSquare },
  { href: "/admin/emails", label: "Emails", icon: Mail },
  {
    href: "/admin/herramientas",
    label: "Herramientas",
    icon: Wrench,
    sub: [
      { href: "/admin/herramientas", label: "Herramientas", icon: Wrench, exact: true },
      { href: "/admin/manual", label: "Manual", icon: BookOpen },
    ],
  },
  { href: "/cuenta/datos", label: "Mis datos", icon: UserCircle },
];

// Flat list of all items (including sub-items) for breadcrumb lookup
const ALL_NAV_ITEMS: NavItem[] = NAV_ITEMS.flatMap((i) =>
  i.sub ? [i, ...i.sub] : [i],
);

function useSidebarBadges() {
  const [newOrders, setNewOrders] = useState(0);
  const [newSolicitudes, setNewSolicitudes] = useState(0);
  const [newIncidents, setNewIncidents] = useState(0);

  useEffect(() => {
    const calc = () => {
      try {
        setNewOrders(countPendingOrders());
        const sols = JSON.parse(localStorage.getItem(SOLICITUDES_KEY) ?? "[]");
        setNewSolicitudes(
          (sols as { estado: string }[]).filter((s) => s.estado === "nueva")
            .length,
        );
        setNewIncidents(countNewIncidents());
      } catch {}
    };
    calc();
    const id = setInterval(calc, 5000);
    return () => clearInterval(id);
  }, []);

  return { newOrders, newSolicitudes, newIncidents };
}

function NavLink({
  item,
  pathname,
  onClose,
  badges,
  isSub = false,
}: {
  item: NavItem;
  pathname: string;
  onClose?: () => void;
  badges: { newOrders: number; newSolicitudes: number; newIncidents: number };
  isSub?: boolean;
}) {
  const { href, label, icon: Icon, exact, excludePathPrefixes } = item;
  const excluded = (excludePathPrefixes ?? []).some((p) => pathname.startsWith(p));
  const active = !excluded && (exact ? pathname === href : pathname.startsWith(href));
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex min-h-[44px] items-center justify-between border-b border-gray-100 px-4 py-2.5 text-sm transition last:border-0 ${
        isSub ? "pl-10" : ""
      } ${active ? "bg-[#2563eb] text-white" : "text-gray-700 hover:bg-gray-50"}`}
    >
      <span className="flex items-center gap-3">
        <Icon size={isSub ? 13 : 15} />
        {label}
        {href === "/admin/pedidos" && badges.newOrders > 0 && (
          <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] leading-none font-bold text-white">
            {badges.newOrders}
          </span>
        )}
        {href === "/admin/solicitudes" && badges.newSolicitudes > 0 && (
          <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] leading-none font-bold text-white">
            {badges.newSolicitudes}
          </span>
        )}
        {href === "/admin/incidencias" && badges.newIncidents > 0 && (
          <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] leading-none font-bold text-white">
            {badges.newIncidents}
          </span>
        )}
      </span>
      {active && <ChevronRight size={13} />}
    </Link>
  );
}

function SidebarContent({
  pathname,
  user,
  onClose,
}: {
  pathname: string;
  user: { name: string; lastName: string };
  onClose?: () => void;
}) {
  const router = useRouter();
  const { logout } = useAuth();
  const badges = useSidebarBadges();
  // Track which submenu groups are open by their parent href
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const item of NAV_ITEMS) {
      if (item.sub) {
        const subActive = item.sub.some((s) => pathname.startsWith(s.href));
        init[item.href] = pathname.startsWith(item.href) || subActive;
      }
    }
    return init;
  });

  function toggleGroup(href: string) {
    setOpenGroups((prev) => ({ ...prev, [href]: !prev[href] }));
  }

  return (
    <div className="flex h-full flex-col">
      {/* Admin badge */}
      <div className="mb-4 flex-shrink-0 rounded-2xl bg-[#2563eb] p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="mb-1 text-xs text-blue-300">
              Panel de administración
            </p>
            <p className="font-bold">
              {user.name} {user.lastName}
            </p>
          </div>
          <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-[#2563eb] uppercase">
            Admin
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {NAV_ITEMS.map((item) => {
            if (item.sub) {
              const subActive = (s: NavItem) => {
                const exc = (s.excludePathPrefixes ?? []).some((p) => pathname.startsWith(p));
                return !exc && pathname.startsWith(s.href);
              };
              const parentActive =
                pathname.startsWith(item.href) ||
                item.sub.some(subActive);
              return (
                <div key={item.href} className="border-b border-gray-100 last:border-0">
                  <button
                    onClick={() => toggleGroup(item.href)}
                    className={`flex min-h-[44px] w-full items-center justify-between px-4 py-2.5 text-sm transition ${
                      parentActive
                        ? "bg-[#2563eb] text-white"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon size={15} />
                      {item.label}
                    </span>
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-200 ${openGroups[item.href] ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openGroups[item.href] && (
                    <div className="border-t border-gray-100 bg-gray-50">
                      {item.sub.map((sub) => (
                        <NavLink
                          key={sub.href}
                          item={sub}
                          pathname={pathname}
                          onClose={onClose}
                          badges={badges}
                          isSub
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onClose={onClose}
                badges={badges}
              />
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="mt-4 flex-shrink-0 space-y-2">
        <Link
          href="/"
          className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <ArrowLeft size={15} /> Ver la tienda
        </Link>
        <button
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="flex min-h-[44px] w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-red-500 transition hover:bg-red-50"
        >
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function Breadcrumb({ pathname }: { pathname: string }) {
  const current = ALL_NAV_ITEMS.find((i) =>
    i.exact ? pathname === i.href : pathname.startsWith(i.href),
  );
  if (!current || pathname === "/admin") return null;

  return (
    <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
      <Link href="/admin" className="transition hover:text-[#2563eb]">
        Admin
      </Link>
      <ChevronRight size={14} />
      <span className="font-medium text-gray-900">{current.label}</span>
    </nav>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== "admin") router.push("/login");
  }, [user, isLoading, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileSidebarOpen(false);
  }, [pathname]);

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2563eb] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      {/* Mobile header */}
      <div className="mb-4 flex items-center gap-3 lg:hidden">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white"
        >
          {mobileSidebarOpen ? <X size={16} /> : <Menu size={16} />}
          {mobileSidebarOpen ? "Cerrar" : "Menú admin"}
        </button>
        <Breadcrumb pathname={pathname} />
      </div>

      {/* Mobile sidebar */}
      {mobileSidebarOpen && (
        <div className="mb-6 rounded-2xl bg-gray-50 p-4 lg:hidden">
          <SidebarContent
            pathname={pathname}
            user={user}
            onClose={() => setMobileSidebarOpen(false)}
          />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Desktop sidebar — sticky */}
        <div className="hidden lg:block">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <SidebarContent pathname={pathname} user={user} />
          </div>
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
  );
}
