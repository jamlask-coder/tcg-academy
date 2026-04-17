"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { LucideIcon } from "lucide-react";
import {
  User as UserIcon,
  FileText,
  Building2,
  Shield,
  Package,
  Receipt,
  RotateCcw,
  Trophy,
  Gift,
  Share2,
} from "lucide-react";

export type TabGroup = "perfil" | "pedidos" | "recompensas";

interface TabDef {
  href: string;
  label: string;
  icon: LucideIcon;
  clientOnly?: boolean;
  b2bOnly?: boolean;
}

const TABS: Record<TabGroup, { title: string; subtitle?: string; items: TabDef[] }> = {
  perfil: {
    title: "Mis datos",
    subtitle: "Gestiona tus datos personales, empresa, facturación y privacidad",
    items: [
      { href: "/cuenta/datos", label: "Datos", icon: UserIcon },
      { href: "/cuenta/empresa", label: "Empresa", icon: Building2, b2bOnly: true },
      { href: "/cuenta/facturacion", label: "Facturación", icon: FileText },
      { href: "/cuenta/privacidad", label: "Privacidad", icon: Shield },
    ],
  },
  pedidos: {
    title: "Pedidos",
    subtitle: "Historial de compras, facturas y devoluciones",
    items: [
      { href: "/cuenta/pedidos", label: "Pedidos", icon: Package },
      { href: "/cuenta/facturas", label: "Facturas", icon: Receipt },
      { href: "/cuenta/devoluciones", label: "Devoluciones", icon: RotateCcw },
    ],
  },
  recompensas: {
    title: "Mis recompensas",
    subtitle: "Puntos, cupones y programa de referidos",
    items: [
      { href: "/cuenta/puntos", label: "Puntos", icon: Trophy, clientOnly: true },
      { href: "/cuenta/cupones", label: "Cupones", icon: Gift },
      { href: "/cuenta/grupo", label: "Mi grupo", icon: Share2, clientOnly: true },
    ],
  },
};

export function AccountTabs({ group }: { group: TabGroup }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isClient = user?.role === "cliente";
  const isB2B = user?.role === "mayorista" || user?.role === "tienda";

  const config = TABS[group];
  const items = config.items.filter((t) => {
    if (t.clientOnly && !isClient) return false;
    if (t.b2bOnly && !isB2B) return false;
    return true;
  });

  return (
    <div className="mb-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
        {config.subtitle && (
          <p className="mt-1 text-sm text-gray-500">{config.subtitle}</p>
        )}
      </div>
      {items.length > 1 && (
        <div
          role="tablist"
          aria-label={config.title}
          className="flex flex-wrap gap-1 overflow-hidden rounded-2xl border border-gray-200 bg-white p-1"
        >
          {items.map((tab) => {
            const active = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                role="tab"
                aria-selected={active}
                className={`flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[#2563eb] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
