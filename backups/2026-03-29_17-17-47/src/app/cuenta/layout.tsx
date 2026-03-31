"use client";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@/types/user";
import {
  User as UserIcon,
  Package,
  MapPin,
  Heart,
  FileText,
  Building2,
  LogOut,
  ChevronRight,
  Receipt,
  Gift,
  Star,
  Bell,
  RefreshCw,
  Menu,
  X,
} from "lucide-react";

const PUBLIC_PATHS = ["/cuenta/login", "/cuenta/registro", "/cuenta/recuperar"];

const NAV_ITEMS_BASE = [
  { href: "/cuenta", label: "Mi cuenta", icon: UserIcon, exact: true },
  { href: "/cuenta/pedidos", label: "Mis pedidos", icon: Package },
  { href: "/cuenta/facturas", label: "Mis facturas", icon: Receipt },
  { href: "/cuenta/cupones", label: "Cupones y descuentos", icon: Gift },
  { href: "/cuenta/bonos", label: "Bonos y puntos", icon: Star },
  {
    href: "/cuenta/notificaciones",
    label: "Notificaciones",
    icon: Bell,
    badge: true,
  },
  { href: "/cuenta/devoluciones", label: "Devoluciones", icon: RefreshCw },
  { href: "/cuenta/datos", label: "Mis datos", icon: UserIcon },
  { href: "/cuenta/favoritos", label: "Favoritos", icon: Heart },
  { href: "/cuenta/facturacion", label: "Facturación", icon: FileText },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
  unreadCount,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  badge?: boolean;
  unreadCount?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[44px] items-center justify-between border-b border-gray-100 px-4 py-3 text-sm transition last:border-0 ${
        active ? "bg-[#1a3a5c] text-white" : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon size={16} />
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        {badge && unreadCount && unreadCount > 0 ? (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}
          >
            {unreadCount}
          </span>
        ) : null}
        {active && <ChevronRight size={14} />}
      </span>
    </Link>
  );
}

type NavItemConfig = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: boolean;
};

function CuentaSidebar({
  user,
  navItems,
  pathname,
  unreadCount,
  onLogout,
}: {
  user: User;
  navItems: NavItemConfig[];
  pathname: string;
  unreadCount: number;
  onLogout: () => void;
}) {
  return (
    <aside>
      {/* User card */}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#1a3a5c] text-lg font-bold text-white">
            {user.name[0]}
            {user.lastName[0]}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-gray-900">
              {user.name} {user.lastName}
            </p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                user.role === "tienda"
                  ? "bg-purple-100 text-purple-700"
                  : user.role === "mayorista"
                    ? "bg-blue-100 text-blue-700"
                    : user.role === "admin"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-600"
              }`}
            >
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {navItems.map(({ href, label, icon, exact, badge }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
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
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="flex min-h-[44px] w-full items-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-red-500 transition hover:bg-red-50"
      >
        <LogOut size={16} /> Cerrar sesión
      </button>
    </aside>
  );
}

export default function CuentaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p);

  useEffect(() => {
    if (isLoading) return;
    if (!user && !isPublicPath) router.push("/cuenta/login");
  }, [user, isLoading, isPublicPath, router]);

  // Close mobile nav on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileNavOpen(false);
  }, [pathname]);

  if (isPublicPath) return <>{children}</>;

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1a3a5c] border-t-transparent" />
      </div>
    );
  }

  const isB2B = user.role === "mayorista" || user.role === "tienda";

  const navItems = [
    ...NAV_ITEMS_BASE,
    ...(isB2B
      ? [
          {
            href: "/cuenta/empresa",
            label: "Datos de empresa",
            icon: Building2,
            badge: false,
            exact: false,
          },
        ]
      : [
          {
            href: "/cuenta/direcciones",
            label: "Direcciones",
            icon: MapPin,
            badge: false,
            exact: false,
          },
        ]),
  ];

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 md:py-10">
      {/* Mobile nav toggle */}
      <button
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        className="mb-4 flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#1a3a5c] lg:hidden"
      >
        {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
        {mobileNavOpen ? "Cerrar menú" : "Menú de cuenta"}
        {unreadCount > 0 && !mobileNavOpen && (
          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Mobile sidebar (collapsible) */}
      {mobileNavOpen && (
        <div className="mb-6 lg:hidden">
          <CuentaSidebar
            user={user}
            navItems={navItems}
            pathname={pathname}
            unreadCount={unreadCount}
            onLogout={handleLogout}
          />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <CuentaSidebar
            user={user}
            navItems={navItems}
            pathname={pathname}
            unreadCount={unreadCount}
            onLogout={handleLogout}
          />
        </div>

        {/* Content */}
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
