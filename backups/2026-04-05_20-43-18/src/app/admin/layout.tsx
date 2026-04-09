"use client";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  LayoutGrid,
  Package,
  Tag,
  ShoppingBag,
  Users,
  Ticket,
  Star,
  Mail,
  Wrench,
  BookOpen,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ArrowLeft,
  Receipt,
  Percent,
  MessageSquare,
  Inbox,
} from "lucide-react";

const SOLICITUDES_KEY = "tcgacademy_solicitudes";
import {
  ADMIN_ORDERS,
  MOCK_MESSAGES,
  MSG_STORAGE_KEY,
  ORDER_STORAGE_KEY,
} from "@/data/mockData";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  exact?: boolean;
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Principal",
    items: [
      {
        href: "/admin",
        label: "Panel principal",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/admin/catalogo", label: "Catálogo visual", icon: LayoutGrid },
      { href: "/admin/productos", label: "Gestión de precios", icon: Package },
      { href: "/admin/precios", label: "Precios", icon: Percent },
      { href: "/admin/descuentos", label: "Descuentos", icon: Tag },
    ],
  },
  {
    label: "Clientes",
    items: [
      { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
      { href: "/admin/mensajes", label: "Mensajes", icon: MessageSquare },
      { href: "/admin/solicitudes", label: "Solicitudes B2B", icon: Inbox },
    ],
  },
  {
    label: "Ventas",
    items: [
      { href: "/admin/usuarios", label: "Usuarios", icon: Users },
      { href: "/admin/fiscal", label: "Gestión Fiscal", icon: Receipt },
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
    items: [{ href: "/admin/emails", label: "Emails", icon: Mail }],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/herramientas", label: "Herramientas", icon: Wrench },
      { href: "/admin/manual", label: "Manual de uso", icon: BookOpen },
    ],
  },
];

function useSidebarBadges() {
  const [newOrders, setNewOrders] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [newSolicitudes, setNewSolicitudes] = useState(0);

  useEffect(() => {
    const calc = () => {
      try {
        const orders =
          JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) ?? "null") ??
          ADMIN_ORDERS;
        setNewOrders(
          (orders as { adminStatus: string }[]).filter(
            (o) => o.adminStatus === "pendiente_envio",
          ).length,
        );
        const saved = JSON.parse(
          localStorage.getItem(MSG_STORAGE_KEY) ?? "null",
        );
        const msgs = saved ?? MOCK_MESSAGES;
        setUnreadMsgs(
          (msgs as { toUserId: string; read: boolean }[]).filter(
            (m) => m.toUserId === "admin" && !m.read,
          ).length,
        );
        const sols = JSON.parse(localStorage.getItem(SOLICITUDES_KEY) ?? "[]");
        setNewSolicitudes(
          (sols as { estado: string }[]).filter((s) => s.estado === "nueva")
            .length,
        );
      } catch {}
    };
    calc();
    const id = setInterval(calc, 5000);
    return () => clearInterval(id);
  }, []);

  return { newOrders, unreadMsgs, newSolicitudes };
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
  const { newOrders, unreadMsgs, newSolicitudes } = useSidebarBadges();

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
      <nav className="flex-1 space-y-3 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="mb-1 px-3 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
              {section.label}
            </p>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {section.items.map(({ href, label, icon: Icon, exact }) => {
                const active = exact
                  ? pathname === href
                  : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={`flex min-h-[44px] items-center justify-between border-b border-gray-100 px-4 py-2.5 text-sm transition last:border-0 ${
                      active
                        ? "bg-[#2563eb] text-white"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={15} />
                      {label}
                      {href === "/admin/pedidos" && newOrders > 0 && (
                        <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] leading-none font-bold text-white">
                          {newOrders}
                        </span>
                      )}
                      {href === "/admin/mensajes" && unreadMsgs > 0 && (
                        <span className="ml-auto rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] leading-none font-bold text-white">
                          {unreadMsgs}
                        </span>
                      )}
                      {href === "/admin/solicitudes" && newSolicitudes > 0 && (
                        <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] leading-none font-bold text-white">
                          {newSolicitudes}
                        </span>
                      )}
                    </span>
                    {active && <ChevronRight size={13} />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
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
  const allItems = NAV_SECTIONS.flatMap((s) => s.items);
  const current = allItems.find((i) =>
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
