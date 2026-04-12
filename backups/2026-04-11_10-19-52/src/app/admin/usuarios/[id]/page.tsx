import { MOCK_USERS, MOCK_INVOICES, ADMIN_ORDERS } from "@/data/mockData";

export function generateStaticParams() {
  return MOCK_USERS.map((u) => ({ id: u.id }));
}

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Receipt,
  Euro,
  ShoppingBag,
  Calendar,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { B2BCharts } from "@/components/account/B2BCharts";
import { SendCouponButton } from "@/components/admin/SendCouponModal";

const ROLE_COLORS: Record<string, string> = {
  cliente: "bg-gray-100 text-gray-600",
  mayorista: "bg-blue-100 text-blue-700",
  tienda: "bg-purple-100 text-purple-700",
  admin: "bg-amber-100 text-amber-700",
};


export default async function AdminUsuarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = MOCK_USERS.find((u) => u.id === id);
  if (!user) notFound();

  const userOrders = ADMIN_ORDERS.filter(
    (o) => o.userEmail === user.email,
  ).slice(0, 10);

  const userInvoices = MOCK_INVOICES.filter(
    (inv) =>
      userOrders.some((o) => o.id === inv.orderId) ||
      inv.clientName?.toLowerCase().includes(user.name.toLowerCase()),
  ).slice(0, 5);

  // Monthly spend: last 6 months derived from order dates
  const MONTH_MAP: Record<string, string> = {
    "10": "Oct", "11": "Nov", "12": "Dic",
    "01": "Ene", "02": "Feb", "03": "Mar",
    "04": "Abr", "05": "May", "06": "Jun",
    "07": "Jul", "08": "Ago", "09": "Sep",
  };
  const now = new Date();
  const last6: { month: string; key: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = MONTH_MAP[String(d.getMonth() + 1).padStart(2, "0")] ?? key;
    last6.push({ month: label, key });
  }
  const monthlySpend: Record<string, number> = {};
  for (const { key } of last6) monthlySpend[key] = 0;
  for (const order of userOrders) {
    const key = order.date.slice(0, 7);
    if (key in monthlySpend) monthlySpend[key] += order.total;
  }
  const monthlyData = last6.map(({ month, key }) => ({ month, gasto: monthlySpend[key] }));

  // Spend by game: aggregate item totals across all user orders
  const gameSpend: Record<string, number> = {};
  for (const order of userOrders) {
    for (const item of order.items) {
      if (item.game) {
        gameSpend[item.game] = (gameSpend[item.game] ?? 0) + item.price * item.qty;
      }
    }
  }
  const gameData = Object.entries(gameSpend)
    .map(([game, gasto]) => ({ game, gasto }))
    .sort((a, b) => b.gasto - a.gasto)
    .slice(0, 6);

  const roleColor =
    user.role === "tienda"
      ? "#7c3aed"
      : user.role === "mayorista"
        ? "#2563eb"
        : "#6b7280";

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      {/* Back + actions */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/admin/usuarios"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={16} /> Volver a usuarios
        </Link>
        <div className="ml-auto">
          <SendCouponButton
            userId={user.id}
            userName={user.name}
            userLastName={user.lastName}
            userEmail={user.email}
          />
        </div>
      </div>

      {/* Header card */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#3b82f6] p-6 text-white">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-black">
            {user.name[0]}
            {user.lastName[0]}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">
              {user.name} {user.lastName}
            </h1>
            <p className="text-blue-200">{user.email}</p>
            <span
              className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${ROLE_COLORS[user.role]}`}
            >
              {user.role}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: stats + info */}
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Pedidos", value: user.totalOrders, icon: ShoppingBag, color: "#2563eb" },
              { label: "Gasto total", value: `${user.totalSpent.toFixed(2)}€`, icon: Euro, color: "#16a34a" },
              { label: "Puntos", value: user.points, icon: Receipt, color: "#d97706" },
              { label: "Registrado", value: user.registeredAt, icon: Calendar, color: "#7c3aed" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}15` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="mt-0.5 font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Contact info */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 font-bold text-gray-900">Información de contacto</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail size={14} className="text-gray-400" />
                {user.email}
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={14} className="text-gray-400" />
                  {user.phone}
                </div>
              )}
              {user.address && (
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />
                  {user.address}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: orders + charts */}
        <div className="space-y-4 lg:col-span-2">
          {/* Purchase chart */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 font-bold text-gray-900">Historial de compras</h3>
            <B2BCharts
              monthlyData={monthlyData}
              gameData={gameData}
              roleColor={roleColor}
            />
          </div>

          {/* Recent orders */}
          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="flex items-center gap-2 font-bold text-gray-900">
                <Package size={16} className="text-[#2563eb]" /> Últimos pedidos
              </h3>
            </div>
            {userOrders.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">
                No se encontraron pedidos para este usuario
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {userOrders.map((order) => (
                  <div key={order.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                    <span className="font-mono font-semibold text-gray-800">{order.id}</span>
                    <span className="flex-1 text-gray-400">{order.date}</span>
                    <span className="font-bold text-gray-900">{order.total.toFixed(2)}€</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent invoices */}
          {userInvoices.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-5 py-4">
                <h3 className="flex items-center gap-2 font-bold text-gray-900">
                  <Receipt size={16} className="text-[#2563eb]" /> Facturas
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {userInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                    <span className="font-mono font-semibold text-gray-800">{inv.id}</span>
                    <span className="flex-1 text-gray-400">{inv.date}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${inv.status === "pagada" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                    >
                      {inv.status === "pagada" ? "Pagada" : "Pendiente"}
                    </span>
                    <span className="font-bold text-gray-900">{inv.total.toFixed(2)}€</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
