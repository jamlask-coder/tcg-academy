"use client";
import Link from "next/link";
import {
  Package,
  MapPin,
  Heart,
  FileText,
  Building2,
  ChevronRight,
  User,
  TrendingUp,
  Euro,
  ShoppingBag,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const B2BCharts = dynamic(
  () => import("@/components/account/B2BCharts").then((m) => m.B2BCharts),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
    ),
  },
);

const MOCK_LAST_ORDER = {
  id: "TCG-20240128-001",
  date: "28 Enero 2025",
  status: "Enviado",
  total: 109.95,
  items: 2,
};

// Months for the chart labels
const MONTH_LABELS = ["Oct", "Nov", "Dic", "Ene", "Feb", "Mar"];

interface B2BStats {
  totalSpent: number;
  orderCount: number;
  monthlyData: { month: string; gasto: number }[];
  gameData: { game: string; gasto: number }[];
}

function buildMonthlyData(orders: Array<{ total: number; date: string }>) {
  const now = new Date();
  return MONTH_LABELS.map((month, i) => {
    const targetMonth = new Date(
      now.getFullYear(),
      now.getMonth() - (5 - i),
      1,
    );
    const total = orders
      .filter((o) => {
        const d = new Date(o.date);
        return (
          d.getMonth() === targetMonth.getMonth() &&
          d.getFullYear() === targetMonth.getFullYear()
        );
      })
      .reduce((s, o) => s + o.total, 0);
    return { month, gasto: Math.round(total * 100) / 100 };
  });
}

function buildGameData(
  orders: Array<{
    items?: Array<{ game: string; price: number; qty: number }>;
  }>,
) {
  const totals: Record<string, number> = {};
  for (const o of orders) {
    for (const item of o.items ?? []) {
      totals[item.game] = (totals[item.game] ?? 0) + item.price * item.qty;
    }
  }
  return Object.entries(totals)
    .map(([game, gasto]) => ({
      game: game.charAt(0).toUpperCase() + game.slice(1),
      gasto: Math.round(gasto * 100) / 100,
    }))
    .sort((a, b) => b.gasto - a.gasto)
    .slice(0, 6);
}

export default function CuentaPage() {
  const { user } = useAuth();
  const [b2bStats, setB2bStats] = useState<B2BStats | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "mayorista" && user.role !== "tienda") return;
    try {
      const orders = JSON.parse(
        localStorage.getItem("tcgacademy_orders") ?? "[]",
      ) as Array<{
        total: number;
        date: string;
        items?: Array<{ game: string; price: number; qty: number }>;
      }>;
      const total = orders.reduce((s, o) => s + o.total, 0);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setB2bStats({
        totalSpent: total,
        orderCount: orders.length,
        monthlyData: buildMonthlyData(orders),
        gameData: buildGameData(orders),
      });
    } catch {}
  }, [user]);

  if (!user) return null;

  const isB2B = user.role === "mayorista" || user.role === "tienda";
  const roleColor = user.role === "tienda" ? "#7c3aed" : "#1a3a5c";

  const QUICK_LINKS = [
    {
      href: "/cuenta/pedidos",
      label: "Mis pedidos",
      icon: Package,
      desc: "Historial y seguimiento",
      color: "#1a3a5c",
    },
    {
      href: "/cuenta/datos",
      label: "Mis datos",
      icon: User,
      desc: "Perfil y contraseña",
      color: "#7c3aed",
    },
    ...(isB2B
      ? [
          {
            href: "/cuenta/empresa",
            label: "Empresa",
            icon: Building2,
            desc: "Datos de empresa",
            color: "#0f766e",
          },
        ]
      : [
          {
            href: "/cuenta/direcciones",
            label: "Direcciones",
            icon: MapPin,
            desc: "Gestionar envíos",
            color: "#0891b2",
          },
        ]),
    {
      href: "/cuenta/favoritos",
      label: "Favoritos",
      icon: Heart,
      desc: "Lista de deseos",
      color: "#dc2626",
    },
    {
      href: "/cuenta/facturacion",
      label: "Facturación",
      icon: FileText,
      desc: "Datos fiscales",
      color: "#d97706",
    },
    {
      href: "/cuenta/mensajes",
      label: "Mensajes",
      icon: MessageSquare,
      desc: "Mensajes de TCG Academy",
      color: "#7c3aed",
    },
  ];

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8 rounded-2xl bg-gradient-to-br from-[#1a3a5c] to-[#2d6a9f] p-8 text-white">
        <p className="mb-1 text-sm text-blue-200">Bienvenido de nuevo</p>
        <h1 className="mb-1 text-2xl font-bold">Hola, {user.name} 👋</h1>
        <p className="text-sm text-blue-200">
          {user.role === "mayorista" &&
            "Estás viendo precios PVP Mayoristas en todo el catálogo."}
          {user.role === "tienda" &&
            "Estás viendo precios PVP Tiendas TCG en todo el catálogo."}
          {user.role === "cliente" &&
            "Explora el catálogo y gestiona tus pedidos desde aquí."}
          {user.role === "admin" &&
            "Panel de administración — acceso completo."}
        </p>
      </div>

      {/* Last order */}
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Último pedido</h2>
          <Link
            href="/cuenta/pedidos"
            className="flex items-center gap-1 text-sm text-[#1a3a5c] hover:underline"
          >
            Ver todos <ChevronRight size={14} />
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {MOCK_LAST_ORDER.id}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {MOCK_LAST_ORDER.date} · {MOCK_LAST_ORDER.items} productos
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
              {MOCK_LAST_ORDER.status}
            </span>
            <span className="font-bold text-gray-900">
              {MOCK_LAST_ORDER.total.toFixed(2)}€
            </span>
            <Link
              href={`/cuenta/pedidos/${MOCK_LAST_ORDER.id}`}
              className="text-sm text-[#1a3a5c] hover:underline"
            >
              Ver detalle
            </Link>
          </div>
        </div>
      </div>

      {/* B2B Stats section */}
      {isB2B && (
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <TrendingUp size={18} className="text-[#1a3a5c]" />
            Estadísticas de compra
          </h2>

          {/* KPI cards */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            {[
              {
                label: "Total gastado",
                value: `${(b2bStats?.totalSpent ?? 0).toFixed(2)} €`,
                icon: Euro,
                color: "#1a3a5c",
              },
              {
                label: "Nº pedidos",
                value: String(b2bStats?.orderCount ?? 0),
                icon: ShoppingBag,
                color: "#7c3aed",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="rounded-2xl border border-gray-200 bg-white p-5"
              >
                <div
                  className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${color}18` }}
                >
                  <Icon size={16} style={{ color }} />
                </div>
                <p className="mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  {label}
                </p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <B2BCharts
            monthlyData={
              b2bStats?.monthlyData ??
              MONTH_LABELS.map((m) => ({ month: m, gasto: 0 }))
            }
            gameData={b2bStats?.gameData ?? []}
            roleColor={roleColor}
          />
        </div>
      )}

      {/* Quick links grid */}
      <h2 className="mb-4 font-bold text-gray-900">Accesos rápidos</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {QUICK_LINKS.map(({ href, label, icon: Icon, desc, color }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${color}18` }}
            >
              <Icon size={20} style={{ color }} />
            </div>
            <p className="text-sm font-bold text-gray-900">{label}</p>
            <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
