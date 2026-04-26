"use client";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Users,
  LogOut,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  ArrowLeft,
  Inbox,
  BarChart2,
  PackagePlus,
  UserCircle,
  Layers,
  Ticket,
  Wrench,
  MessageSquare,
  Mail,
  Star,
  Euro,
  Boxes,
  ShieldCheck,
  AlertTriangle,
  Gift,
  Bell,
  Send,
  FilePlus,
  FileText,
  BookOpen,
  Calendar,
  Landmark,
  BookMarked,
} from "lucide-react";

import { countPendingOrdersToShip } from "@/lib/orderAdapter";
import { countNewIncidents } from "@/services/incidentService";
import { countNuevasSolicitudes } from "@/services/solicitudService";
import { DataHub } from "@/lib/dataHub";
import { AdminFiscalGuard } from "@/components/AdminFiscalGuard";
import { runAutoBackupIfDue } from "@/lib/backupScheduler";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  exact?: boolean;
  sub?: NavItem[];
  excludePathPrefixes?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/admin/pedidos", label: "Pedidos", icon: Package },
  { href: "/admin/precios", label: "Precios", icon: Euro },
  {
    href: "/admin/productos/nuevo",
    label: "Productos",
    icon: PackagePlus,
    sub: [
      { href: "/admin/productos/nuevo", label: "Añadir producto", icon: PackagePlus },
      { href: "/admin/stock", label: "Control de Stock", icon: Boxes },
    ],
  },
  {
    href: "/admin/usuarios",
    label: "Usuarios",
    icon: Users,
    sub: [
      { href: "/admin/usuarios", label: "Registrados", icon: Users },
      { href: "/admin/solicitudes", label: "Solicitudes B2B", icon: Inbox },
    ],
  },
  {
    href: "/admin/fiscal",
    label: "Fiscalidad",
    icon: Landmark,
    sub: [
      { href: "/admin/fiscal", label: "Panel fiscal", icon: LayoutDashboard, exact: true },
      { href: "/admin/fiscal/nueva-factura", label: "Emitir factura", icon: FilePlus },
      { href: "/admin/fiscal/facturas", label: "Libro de facturas", icon: BookOpen },
      { href: "/admin/fiscal/trimestral", label: "Modelo 303 (IVA)", icon: BarChart2 },
      { href: "/admin/fiscal/anual", label: "Modelo 390 (anual)", icon: BarChart2 },
      { href: "/admin/fiscal/intracomunitario", label: "Modelo 349 (UE)", icon: BarChart2 },
      { href: "/admin/fiscal/verifactu", label: "VeriFactu", icon: ShieldCheck },
      { href: "/admin/fiscal/calendario", label: "Calendario fiscal", icon: Calendar },
      { href: "/admin/fiscal/contabilidad", label: "Contabilidad", icon: BookMarked },
      { href: "/admin/fiscal/control", label: "Control fiscal", icon: AlertTriangle },
      { href: "/admin/fiscal/editor-factura", label: "Editor plantilla", icon: Wrench },
      { href: "/admin/fiscal/documentacion", label: "Documentación", icon: FileText },
    ],
  },
  { href: "/admin/categorias", label: "Categorías", icon: Layers },
  {
    href: "/admin/bonos",
    label: "Bonificaciones",
    icon: Gift,
    sub: [
      { href: "/admin/bonos", label: "Sistema de puntos", icon: Star },
      { href: "/admin/cupones", label: "Cupones", icon: Ticket },
    ],
  },
  { href: "/admin/mensajes", label: "Mensajes", icon: MessageSquare },
  {
    href: "/admin/emails",
    label: "Emails",
    icon: Mail,
    sub: [
      { href: "/admin/emails", label: "Datos emails", icon: Bell, exact: true },
      { href: "/admin/emails/automaticos", label: "Emails automáticos", icon: Send },
    ],
  },
  { href: "/admin/estadisticas", label: "Estadísticas", icon: BarChart2 },
  {
    href: "/admin/herramientas",
    label: "Herramientas",
    icon: Wrench,
    sub: [
      { href: "/admin/herramientas", label: "Diagnóstico", icon: Wrench },
      { href: "/admin/errores", label: "Errores runtime", icon: AlertTriangle },
      { href: "/admin/copias", label: "Copias de seguridad", icon: ShieldCheck },
    ],
  },
  { href: "/cuenta/datos", label: "Mis datos", icon: UserCircle },
];

// Flat list for breadcrumb lookup — subs come first so more-specific labels
// win over the parent group header when pathnames overlap (e.g. /admin/usuarios
// is a sub under the "Usuarios" parent).
const ALL_NAV_ITEMS: NavItem[] = NAV_ITEMS.flatMap((i) =>
  i.sub ? [...i.sub, i] : [i],
);

function useSidebarBadges() {
  const [newOrders, setNewOrders] = useState(0);
  const [newSolicitudes, setNewSolicitudes] = useState(0);
  const [newIncidents, setNewIncidents] = useState(0);

  useEffect(() => {
    const calc = () => {
      try {
        setNewOrders(countPendingOrdersToShip());
        setNewSolicitudes(countNuevasSolicitudes());
        setNewIncidents(countNewIncidents());
      } catch {}
    };
    calc();
    // Reacción event-driven via DataHub (canónico). Fallback poll cada 15s por seguridad.
    const offOrders = DataHub.on("orders", calc);
    const offIncidents = DataHub.on("incidents", calc);
    const offSolicitudes = DataHub.on("solicitudes", calc);
    const id = setInterval(calc, 15000);
    return () => {
      offOrders?.();
      offIncidents?.();
      offSolicitudes?.();
      clearInterval(id);
    };
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
          <span className="ml-auto flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold leading-none text-white">
            {badges.newOrders}
          </span>
        )}
        {href === "/admin/solicitudes" && badges.newSolicitudes > 0 && (
          <span className="ml-auto flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold leading-none text-white">
            {badges.newSolicitudes}
          </span>
        )}
        {href === "/admin/incidencias" && badges.newIncidents > 0 && (
          <span className="ml-auto flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold leading-none text-white">
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
      {/* Admin badge — el "ADMIN" pill está alineado con la línea del nombre,
          no con todo el bloque; el relleno es ámbar con texto negro para que
          coincida con el pill del header. */}
      <div className="mb-4 flex-shrink-0 rounded-2xl bg-[#2563eb] p-4 text-white">
        <p className="mb-1 text-xs text-blue-300">Panel de administración</p>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-bold">
            {user.name}
            {user.lastName ? ` ${user.lastName}` : ""}
          </p>
          <span className="flex-shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-gray-900 uppercase">
            Admin
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden">
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
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex-shrink-0"><item.icon size={15} /></span>
                      <span className="truncate">{item.label}</span>
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
    <nav className="flex items-center gap-1.5 text-sm text-gray-500">
      <Link href="/admin" className="transition hover:text-[#2563eb]">
        Admin
      </Link>
      <ChevronRight size={14} />
      <span className="font-medium text-gray-900">{current.label}</span>
    </nav>
  );
}

export default function AdminShell({
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

  // Auto-snapshot diario: al cargar el layout admin, el scheduler comprueba
  // si toca y crea uno si han pasado >= 24h. Silencioso (no bloquea UI).
  useEffect(() => {
    if (isLoading || !user || user.role !== "admin") return;
    runAutoBackupIfDue().catch(() => {
      /* el scheduler ya registra el error internamente */
    });
  }, [isLoading, user]);

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
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden">
            <SidebarContent pathname={pathname} user={user} />
          </div>
        </div>

        {/* Content */}
        <main className="min-w-0 [&_a]:text-black [&_a]:no-underline [&_a:hover]:text-[#2563eb]">
          <div className="mb-4 hidden lg:block">
            <Breadcrumb pathname={pathname} />
          </div>
          {children}
          <AdminFiscalGuard />
        </main>
      </div>
    </div>
  );
}
