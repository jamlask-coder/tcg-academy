"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Star,
} from "lucide-react";
import {
  MOCK_USERS,
  MOCK_INVOICES,
  ADMIN_ORDERS,
  type AdminUser,
  type AdminOrder,
} from "@/data/mockData";
import type { User } from "@/types/user";
import {
  readAdminOrdersMerged,
  readAdminOrdersMergedAsync,
  isCountableOrder,
} from "@/lib/orderAdapter";
import { loadPoints } from "@/services/pointsService";
import { findUserByHandle } from "@/lib/userHandle";
import { B2BCharts } from "@/components/account/B2BCharts";
import { SendCouponButton } from "@/components/admin/SendCouponModal";
import { UserRoleManager } from "@/components/admin/UserRoleManager";
import { VisitChart } from "@/components/account/VisitChart";
import { UserPersonalDataPanel } from "@/components/admin/UserPersonalDataPanel";
import { UserBlockPanel } from "@/components/admin/UserBlockPanel";

const ROLE_COLORS: Record<string, string> = {
  cliente: "bg-gray-100 text-gray-600",
  mayorista: "bg-blue-100 text-blue-700",
  tienda: "bg-green-100 text-green-700",
  admin: "bg-amber-100 text-amber-700",
};

function userToAdminUser(u: User): AdminUser {
  const addr = u.addresses?.[0];
  return {
    id: u.id,
    name: u.name,
    lastName: u.lastName,
    email: u.email,
    role: u.role as AdminUser["role"],
    registeredAt: u.createdAt.slice(0, 10),
    totalOrders: 0,
    totalSpent: 0,
    points: 0,
    active: true,
    phone: u.phone,
    address: addr
      ? `${addr.calle} ${addr.numero}${addr.piso ? ", " + addr.piso : ""}, ${addr.cp} ${addr.ciudad}`
      : undefined,
  };
}

export default function AdminUsuarioDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";
  const [resolved, setResolved] = useState<{
    user: AdminUser;
    orders: AdminOrder[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const isServerMode =
      typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_BACKEND_MODE === "server";

    const finalize = async (baseUser: AdminUser | null) => {
      if (cancelled) return;
      if (!baseUser) {
        setResolved(null);
        setLoading(false);
        return;
      }
      // Cruzar con pedidos reales por userId o email. En server-mode tiramos
      // de la BD vía readAdminOrdersMergedAsync — el sync no ve nada si los
      // pedidos están en Supabase y no en localStorage del navegador admin.
      const mergedOrders = isServerMode
        ? await readAdminOrdersMergedAsync(ADMIN_ORDERS)
        : readAdminOrdersMerged(ADMIN_ORDERS);
      if (cancelled) return;
      const emailLower = baseUser.email.toLowerCase();
      const userOrders = mergedOrders.filter(
        (o) =>
          o.userId === baseUser.id ||
          (o.userEmail && o.userEmail.toLowerCase() === emailLower),
      );
      // Los pedidos heredados (carry-over) se MUESTRAN en la lista pero NO
      // contabilizan en totalOrders/totalSpent: son histórico SL anterior.
      const countable = userOrders.filter(isCountableOrder);
      const totalOrders = countable.length;
      const totalSpent = countable.reduce((s, o) => s + (o.total || 0), 0);
      const livePoints = loadPoints(baseUser.id);
      setResolved({
        user: {
          ...baseUser,
          totalOrders: totalOrders || baseUser.totalOrders,
          totalSpent: totalSpent || baseUser.totalSpent,
          points: livePoints > 0 ? livePoints : baseUser.points,
        },
        orders: userOrders,
      });
      setLoading(false);
    };

    const resolve = async () => {
      try {
        // En server-mode los MOCK_USERS son demos heredados — saltamos directo
        // a la BD. En local-mode mantenemos el comportamiento histórico para
        // que /demo siga funcionando sin Supabase.
        if (!isServerMode) {
          const fromMock = findUserByHandle(MOCK_USERS, id) ?? null;
          if (fromMock) {
            await finalize(fromMock);
            return;
          }
        }

        if (isServerMode) {
          // 2. Server-mode: BD vía endpoint admin (no localStorage)
          const res = await fetch(
            `/api/admin/users/${encodeURIComponent(id)}`,
            { credentials: "include" },
          );
          if (res.ok) {
            const data = (await res.json()) as {
              ok: boolean;
              user?: {
                id: string;
                email: string;
                username?: string;
                name: string;
                lastName: string;
                phone?: string;
                role: AdminUser["role"];
                registeredAt: string;
                nif?: string;
                nifType?: "DNI" | "NIE" | "CIF";
                birthDate?: string;
              };
            };
            if (data.ok && data.user) {
              const u = data.user;
              const isB2B = u.role === "mayorista" || u.role === "tienda";
              await finalize({
                id: u.id,
                username: u.username,
                name: u.name,
                lastName: u.lastName,
                email: u.email,
                role: u.role,
                registeredAt: u.registeredAt,
                totalOrders: 0,
                totalSpent: 0,
                points: 0,
                active: true,
                phone: u.phone,
                birthDate: u.birthDate,
                cif: isB2B ? u.nif : undefined,
              });
              return;
            }
          }
          await finalize(null);
          return;
        }

        // 3. Local-mode: tcgacademy_registered (dev)
        const raw = localStorage.getItem("tcgacademy_registered");
        if (raw) {
          const registered = JSON.parse(raw) as Record<
            string,
            { password: string; user: User }
          >;
          const users = Object.values(registered).map((e) => e.user);
          const match = findUserByHandle(users, id);
          if (match) {
            await finalize(userToAdminUser(match));
            return;
          }
        }
        await finalize(null);
      } catch {
        await finalize(null);
      }
    };

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Pre-computed month labels (outside render so it's stable)
  const MONTH_MAP: Record<string, string> = useMemo(
    () => ({
      "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
      "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
      "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
    }),
    [],
  );

  const derived = useMemo(() => {
    if (!resolved) return null;
    const { user, orders } = resolved;
    const now = new Date();

    // Last 6 months spend
    const last6: { month: string; key: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = MONTH_MAP[String(d.getMonth() + 1).padStart(2, "0")] ?? key;
      last6.push({ month: label, key });
    }
    const monthlySpend: Record<string, number> = {};
    for (const { key } of last6) monthlySpend[key] = 0;
    for (const order of orders) {
      const key = order.date.slice(0, 7);
      if (key in monthlySpend) monthlySpend[key] += order.total;
    }
    const monthlyData = last6.map(({ month, key }) => ({
      month,
      gasto: monthlySpend[key],
    }));

    // Spend by game
    const gameSpend: Record<string, number> = {};
    for (const order of orders) {
      for (const item of order.items) {
        if (item.game) {
          gameSpend[item.game] =
            (gameSpend[item.game] ?? 0) + item.price * item.qty;
        }
      }
    }
    const gameData = Object.entries(gameSpend)
      .map(([game, gasto]) => ({ game, gasto }))
      .sort((a, b) => b.gasto - a.gasto)
      .slice(0, 6);

    // Simulated visit data (deterministic per user)
    const seed = user.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const visitData: { month: string; visitas: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label =
        MONTH_MAP[String(d.getMonth() + 1).padStart(2, "0")] ??
        String(d.getMonth() + 1);
      const base =
        user.role === "mayorista"
          ? 18
          : user.role === "tienda"
            ? 25
            : 8;
      const visits = Math.max(1, base + ((seed * (i + 3) * 7) % 15) - 5);
      visitData.push({ month: label, visitas: visits });
    }
    const totalVisits = visitData.reduce((s, d) => s + d.visitas, 0);
    const avgVisits = Math.round(totalVisits / visitData.length);
    const pageViews = Math.round(totalVisits * (2.5 + (seed % 30) / 10));

    // Invoices shown (keep original mock lookup logic)
    const invoices = MOCK_INVOICES.filter(
      (inv) =>
        orders.some((o) => o.id === inv.orderId) ||
        inv.clientName?.toLowerCase().includes(user.name.toLowerCase()),
    ).slice(0, 5);

    return {
      monthlyData,
      gameData,
      visitData,
      totalVisits,
      avgVisits,
      pageViews,
      invoices,
    };
  }, [resolved, MONTH_MAP]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <p className="text-sm text-gray-500">Cargando usuario…</p>
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <Link
          href="/admin/usuarios"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={16} /> Volver a usuarios
        </Link>
        <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-800">
          <p className="font-bold">Usuario no encontrado</p>
          <p className="mt-1 text-red-600">
            El usuario con ID <span className="font-mono">{id}</span> no existe
            en MOCK_USERS ni en localStorage (<code>tcgacademy_registered</code>).
            Si esperabas verlo tras cargar el simulacro, vuelve a{" "}
            <button
              className="underline"
              onClick={() => router.push("/admin/herramientas")}
            >
              /admin/herramientas
            </button>{" "}
            y pulsa &ldquo;Cargar simulacro&rdquo;.
          </p>
        </div>
      </div>
    );
  }

  const { user, orders: userOrders } = resolved;
  const { monthlyData, gameData, visitData, totalVisits, avgVisits, pageViews, invoices } = derived!;

  const roleColor =
    user.role === "tienda"
      ? "#7c3aed"
      : user.role === "mayorista"
        ? "#2563eb"
        : "#6b7280";

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      {/* Back */}
      <div className="mb-4">
        <Link
          href="/admin/usuarios"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={16} /> Volver a usuarios
        </Link>
      </div>

      {/* Header card con acciones integradas */}
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SendCouponButton
              userId={user.id}
              userName={user.name}
              userLastName={user.lastName}
              userEmail={user.email}
            />
            <Link
              href="/admin/bonos"
              className="flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/25"
            >
              <Star size={14} /> Enviar puntos
            </Link>
          </div>
        </div>
      </div>

      {/* Panel de datos personales editables (admin) */}
      <div className="mb-6">
        <UserPersonalDataPanel userId={user.id} />
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

          {/* Role manager */}
          {user.role !== "admin" && (
            <UserRoleManager
              userId={user.id}
              defaultRole={user.role as "cliente" | "mayorista" | "tienda"}
            />
          )}

          {/* Bloqueo de cuenta — solo admins ven este panel */}
          {user.role !== "admin" && <UserBlockPanel userId={user.id} />}
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
              orders={userOrders}
            />
          </div>

          {/* Visits chart */}
          <VisitChart
            visitData={visitData}
            totalVisits={totalVisits}
            avgVisits={avgVisits}
            pageViews={pageViews}
            roleColor={roleColor}
          />

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
                {userOrders.slice(0, 10).map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/pedidos/${order.id}`}
                    className="flex items-center gap-4 px-5 py-3 text-sm transition hover:bg-blue-50"
                  >
                    <span className="font-mono font-semibold text-[#2563eb]">{order.id}</span>
                    <span className="flex-1 text-gray-400">{order.date}</span>
                    <span className="font-bold text-gray-900">{order.total.toFixed(2)}€</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent invoices */}
          {invoices.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-5 py-4">
                <h3 className="flex items-center gap-2 font-bold text-gray-900">
                  <Receipt size={16} className="text-[#2563eb]" /> Facturas
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {invoices.map((inv) => (
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
