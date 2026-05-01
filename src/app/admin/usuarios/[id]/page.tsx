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
  KeyRound,
  CheckCircle2,
  XCircle,
  Building2,
  Users as UsersIcon,
  Cake,
  Hash,
} from "lucide-react";
import {
  type AdminUser,
  type AdminOrder,
  type Invoice,
} from "@/data/mockData";
// Modo real: MOCK_USERS/MOCK_INVOICES/ADMIN_ORDERS ya no existen. La ficha
// de admin usuarios resuelve contra BD vía /api/admin/users/[id] y los
// pedidos vivos vía readAdminOrdersMerged*. Mantenemos placeholders vacíos
// solo para que las firmas que esperan arrays sigan compilando.
const MOCK_USERS: User[] = [];
const MOCK_INVOICES: Invoice[] = [];
const ADMIN_ORDERS: AdminOrder[] = [];
import type { User } from "@/types/user";
import {
  readAdminOrdersMerged,
  readAdminOrdersMergedAsync,
} from "@/lib/orderAdapter";
import { loadPoints } from "@/services/pointsService";
import { getRefundedAmountForUser } from "@/services/returnService";
import { findUserByHandle } from "@/lib/userHandle";
import { B2BCharts } from "@/components/account/B2BCharts";
import { SendCouponButton } from "@/components/admin/SendCouponModal";
import { SendMessageButton } from "@/components/admin/SendMessageModal";
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

// ─── Tipos extras (lo que devuelve /api/admin/users/[handle] tras el ampliado) ─
interface ProfileAddress {
  id: string;
  alias?: string;
  calle: string;
  numero?: string;
  piso?: string;
  cp: string;
  ciudad: string;
  provincia?: string;
  pais: string;
  telefono?: string;
  predeterminada: boolean;
}

interface ProfileCompany {
  cif?: string;
  razonSocial?: string;
  direccionFiscal?: string;
  contactoNombre?: string;
  companyPhone?: string;
  billingEmail?: string;
}

interface UserActivity {
  monthly: { month: string; visitas: number }[];
  totalVisits: number;
  pageViews: number;
  avgVisitsPerMonth: number;
  uniqueSessions: number;
  firstVisit: string | null;
  lastVisit: string | null;
  topPaths: { path: string; visits: number }[];
}

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
  // Presencia "online" — separada de `resolved.user` para no contaminar el
  // tipo AdminUser (que se reusa en otras vistas) con un campo dinámico.
  // Refresca cada 30s en server-mode para que el punto verde/rojo refleje
  // el último heartbeat del usuario sin tener que recargar la página.
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  // Datos extra del perfil que el endpoint detalle ahora devuelve junto al
  // user (direcciones, datos B2B, referidos, verificación). Los guardamos
  // por separado para no inflar AdminUser que se reusa en otras vistas.
  const [profileExtras, setProfileExtras] = useState<{
    addresses: ProfileAddress[];
    company?: ProfileCompany;
    referralCode?: string;
    referredBy?: string;
    referralsCount: number;
    emailVerified?: boolean;
    emailVerifiedAt?: string;
    birthDate?: string;
    nif?: string;
    nifType?: "DNI" | "NIE" | "CIF";
    registeredAtIso?: string;
    username?: string;
  } | null>(null);

  // Actividad REAL del usuario (sustituye al seed determinista anterior).
  // null = cargando, el componente muestra empty state si totalVisits=0.
  const [activity, setActivity] = useState<UserActivity | null>(null);

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
      // Contamos TODOS los pedidos del usuario (incluidos los heredados
      // fiscalCarryOver). El admin necesita ver el histórico real del
      // cliente — son pedidos de verdad, sólo que no facturamos sobre
      // ellos. La exclusión de carry-over vive únicamente en el módulo
      // fiscal (303/390/libro de facturas), nunca en stats de usuario.
      const totalOrders = userOrders.length;
      const grossSpent = userOrders.reduce((s, o) => s + (o.total || 0), 0);
      // Restamos las RMAs reembolsadas — un cliente que devolvió no debe
      // seguir contabilizando ese importe en su gasto total.
      const refunded = getRefundedAmountForUser(baseUser.id, baseUser.email);
      const totalSpent = Math.max(0, grossSpent - refunded);
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
            await finalize(userToAdminUser(fromMock as User));
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
                registeredAtIso?: string;
                nif?: string;
                nifType?: "DNI" | "NIE" | "CIF";
                birthDate?: string;
                lastSeenAt?: string;
                emailVerified?: boolean;
                emailVerifiedAt?: string;
                referralCode?: string;
                referredBy?: string;
                addresses?: ProfileAddress[];
                company?: ProfileCompany;
                referralsCount?: number;
              };
            };
            if (data.ok && data.user) {
              const u = data.user;
              const isB2B = u.role === "mayorista" || u.role === "tienda";
              if (!cancelled) {
                setLastSeenAt(u.lastSeenAt ?? null);
                setProfileExtras({
                  addresses: u.addresses ?? [],
                  company: u.company,
                  referralCode: u.referralCode,
                  referredBy: u.referredBy,
                  referralsCount: u.referralsCount ?? 0,
                  emailVerified: u.emailVerified,
                  emailVerifiedAt: u.emailVerifiedAt,
                  birthDate: u.birthDate,
                  nif: u.nif,
                  nifType: u.nifType,
                  registeredAtIso: u.registeredAtIso,
                  username: u.username,
                });
              }
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
                cif: isB2B ? (u.company?.cif ?? u.nif) : undefined,
              });

              // Disparar fetch de actividad real en paralelo (no bloquea
              // el render de las stats principales).
              void fetch(
                `/api/admin/users/${encodeURIComponent(id)}/activity`,
                { credentials: "include" },
              )
                .then(async (r) => (r.ok ? ((await r.json()) as { ok: boolean } & UserActivity) : null))
                .then((act) => {
                  if (cancelled || !act?.ok) return;
                  setActivity({
                    monthly: act.monthly,
                    totalVisits: act.totalVisits,
                    pageViews: act.pageViews,
                    avgVisitsPerMonth: act.avgVisitsPerMonth,
                    uniqueSessions: act.uniqueSessions,
                    firstVisit: act.firstVisit,
                    lastVisit: act.lastVisit,
                    topPaths: act.topPaths,
                  });
                })
                .catch(() => {
                  // Silenciosamente: el chart muestra empty state si activity es null/0
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

  // Refresca lastSeenAt cada 30s en server-mode mientras la pestaña está
  // visible, para que el punto verde/rojo no se quede congelado en el
  // momento de la carga inicial. El admin sólo ve cambios al recargar de
  // otro modo, y queremos que vea "se desconectó" sin pulsar F5.
  useEffect(() => {
    const isServerMode =
      typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
    if (!isServerMode) return;
    if (!id) return;
    let cancelled = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(
          `/api/admin/users/${encodeURIComponent(id)}`,
          { credentials: "include", cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { ok: boolean; user?: { lastSeenAt?: string } };
        if (cancelled) return;
        if (data.ok && data.user) {
          setLastSeenAt(data.user.lastSeenAt ?? null);
        }
      } catch { /* ignore — el dot simplemente no actualizará este tick */ }
    };
    const intervalId = window.setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
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

    // Datos REALES de actividad (vienen de /api/admin/users/[id]/activity).
    // Si todavía no han llegado (fetch en curso) o el usuario nunca navegó
    // autenticado, devolvemos serie de 12 meses a 0 — VisitChart muestra
    // empty state explícito.
    const visitData: { month: string; visitas: number }[] = activity?.monthly ??
      (() => {
        const empty: { month: string; visitas: number }[] = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const label =
            MONTH_MAP[String(d.getMonth() + 1).padStart(2, "0")] ??
            String(d.getMonth() + 1);
          empty.push({ month: label, visitas: 0 });
        }
        return empty;
      })();
    const totalVisits = activity?.totalVisits ?? 0;
    const avgVisits = activity?.avgVisitsPerMonth ?? 0;
    const pageViews = activity?.pageViews ?? 0;

    // Invoices shown (keep original mock lookup logic)
    const invoices = MOCK_INVOICES.filter(
      (inv: Invoice) =>
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
  }, [resolved, MONTH_MAP, activity]);

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
            No hemos podido resolver el handle{" "}
            <span className="font-mono">{id}</span> en la base de datos. Esto
            suele indicar un enlace antiguo o un usuario cuya cuenta fue
            eliminada. Vuelve a{" "}
            <button
              className="underline"
              onClick={() => router.push("/admin/usuarios")}
            >
              /admin/usuarios
            </button>{" "}
            y entra desde la lista para usar el handle actualizado.
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
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="whitespace-nowrap text-2xl font-bold">
                {user.name} {user.lastName}
              </h1>
              <UserPresenceDot lastSeenAt={lastSeenAt} />
            </div>
            <p className="text-blue-200">{user.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${ROLE_COLORS[user.role]}`}
              >
                {user.role}
              </span>
              <UserLastSeen lastSeenAt={lastSeenAt} />
            </div>
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
              className="flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-[#0a1628] shadow-md transition hover:bg-amber-300 active:scale-95"
            >
              <Star size={16} /> Enviar puntos
            </Link>
            <SendMessageButton
              userId={user.id}
              userName={user.name}
              userLastName={user.lastName}
              userEmail={user.email}
            />
            <SendResetPasswordButton email={user.email} />
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
                <span className="flex-1">{user.email}</span>
                {profileExtras?.emailVerified ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700"
                    title={
                      profileExtras.emailVerifiedAt
                        ? `Verificado el ${profileExtras.emailVerifiedAt.slice(0, 10)}`
                        : "Email verificado"
                    }
                  >
                    <CheckCircle2 size={10} /> verificado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    <XCircle size={10} /> sin verificar
                  </span>
                )}
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={14} className="text-gray-400" />
                  {user.phone}
                </div>
              )}
              {profileExtras?.username && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Hash size={14} className="text-gray-400" />
                  <span className="font-mono text-xs">@{profileExtras.username}</span>
                </div>
              )}
              {profileExtras?.birthDate && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Cake size={14} className="text-gray-400" />
                  {profileExtras.birthDate}
                </div>
              )}
              {profileExtras?.nif && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Receipt size={14} className="text-gray-400" />
                  <span className="font-mono text-xs">{profileExtras.nif}</span>
                  {profileExtras.nifType && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-600">
                      {profileExtras.nifType}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Direcciones de envío — todas las que tiene el usuario en BD */}
          {profileExtras && profileExtras.addresses.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
                <MapPin size={16} className="text-[#2563eb]" /> Direcciones ({profileExtras.addresses.length})
              </h3>
              <div className="space-y-3">
                {profileExtras.addresses.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {a.alias && <span className="font-bold text-gray-900">{a.alias}</span>}
                      {a.predeterminada && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700">
                          predeterminada
                        </span>
                      )}
                    </div>
                    <p>
                      {a.calle}
                      {a.numero ? ` ${a.numero}` : ""}
                      {a.piso ? `, ${a.piso}` : ""}
                    </p>
                    <p>
                      {a.cp} {a.ciudad}
                      {a.provincia ? `, ${a.provincia}` : ""}
                    </p>
                    <p className="text-gray-500">{a.pais}</p>
                    {a.telefono && (
                      <p className="mt-1 flex items-center gap-1 text-gray-500">
                        <Phone size={10} /> {a.telefono}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Datos B2B — empresa (sólo mayorista/tienda) */}
          {profileExtras?.company && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
                <Building2 size={16} className="text-[#2563eb]" /> Datos de empresa
              </h3>
              <div className="space-y-1.5 text-xs text-gray-700">
                {profileExtras.company.razonSocial && (
                  <p className="font-bold text-gray-900">{profileExtras.company.razonSocial}</p>
                )}
                {profileExtras.company.cif && (
                  <p className="font-mono">{profileExtras.company.cif}</p>
                )}
                {profileExtras.company.direccionFiscal && (
                  <p>{profileExtras.company.direccionFiscal}</p>
                )}
                {profileExtras.company.contactoNombre && (
                  <p>
                    Contacto: <span className="font-medium">{profileExtras.company.contactoNombre}</span>
                  </p>
                )}
                {profileExtras.company.companyPhone && (
                  <p className="flex items-center gap-1 text-gray-500">
                    <Phone size={10} /> {profileExtras.company.companyPhone}
                  </p>
                )}
                {profileExtras.company.billingEmail && (
                  <p className="flex items-center gap-1 text-gray-500">
                    <Mail size={10} /> {profileExtras.company.billingEmail}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Programa de referidos — código + count de referidos directos */}
          {(profileExtras?.referralCode || profileExtras?.referredBy) && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
                <UsersIcon size={16} className="text-[#2563eb]" /> Referidos
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                {profileExtras.referralCode && (
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <div>
                      <p className="text-[10px] uppercase text-gray-400">Su código</p>
                      <p className="font-mono font-bold">{profileExtras.referralCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-gray-400">Referidos</p>
                      <p className="font-bold">{profileExtras.referralsCount}</p>
                    </div>
                  </div>
                )}
                {profileExtras.referredBy && (
                  <p className="text-xs text-gray-500">
                    Referido por:{" "}
                    <span className="font-mono font-bold text-gray-700">
                      {profileExtras.referredBy}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

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

          {/* Visits chart — datos REALES desde /api/admin/users/[id]/activity */}
          <VisitChart
            visitData={visitData}
            totalVisits={totalVisits}
            avgVisits={avgVisits}
            pageViews={pageViews}
            roleColor={roleColor}
            isRealData
            firstVisit={activity?.firstVisit ?? null}
            lastVisit={activity?.lastVisit ?? null}
          />

          {/* Top rutas visitadas — sólo si hay actividad real */}
          {activity && activity.topPaths.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
                <Hash size={16} className="text-[#2563eb]" /> Páginas más visitadas
              </h3>
              <div className="space-y-1.5">
                {activity.topPaths.map((p) => {
                  const max = activity.topPaths[0]?.visits ?? 1;
                  const pct = Math.round((p.visits / max) * 100);
                  return (
                    <div key={p.path} className="flex items-center gap-3 text-sm">
                      <code className="flex-1 truncate font-mono text-xs text-gray-600">{p.path}</code>
                      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full bg-[#2563eb]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs font-bold text-gray-700">{p.visits}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[10px] text-gray-400">
                Top 10 rutas por visitas. {activity.uniqueSessions} sesiones únicas detectadas.
              </p>
            </div>
          )}

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
                {invoices.map((inv: Invoice) => (
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

/**
 * Botón admin: dispara el flujo /api/auth reset-password para el email indicado.
 * Anti-enumeración: el endpoint siempre responde 200, así que aquí sólo
 * mostramos "Email enviado" si la respuesta es ok. El correo real lo envía
 * el adapter Resend en background (after()).
 */
function SendResetPasswordButton({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleClick() {
    if (state === "sending" || state === "sent") return;
    setState("sending");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-password", email }),
      });
      if (res.ok) {
        setState("sent");
        setTimeout(() => setState("idle"), 4000);
      } else {
        setState("error");
        setTimeout(() => setState("idle"), 4000);
      }
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  const label =
    state === "sending"
      ? "Enviando…"
      : state === "sent"
        ? "Email enviado ✓"
        : state === "error"
          ? "Error — reintentar"
          : "Restablecer contraseña";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "sending" || state === "sent"}
      className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#0a1628] shadow-md transition hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
      aria-label="Enviar email de restablecer contraseña al usuario"
    >
      <KeyRound size={14} /> {label}
    </button>
  );
}

/**
 * Punto de presencia del usuario, similar a indicadores de chat.
 *   - Verde con animación pulse → último heartbeat hace < 3 min (online).
 *   - Rojo estático → sin heartbeat reciente (offline).
 *   - Gris si nunca ha hecho heartbeat (cuenta nueva o BD sin migrar).
 *
 * Umbral 3 min = 3× el periodo del heartbeat (60s) para tolerar fallos de red
 * sin marcar a alguien como offline al primer ping perdido.
 *
 * `now` vive en estado y se refresca cada 30s — leer `Date.now()` durante
 * render rompe react-hooks/purity (resultado no determinista entre renders).
 */
/**
 * Texto explícito con la fecha+hora de última conexión, junto al rol del
 * usuario. Complementa al pulse dot de UserPresenceDot — el dot solo dice
 * "online/offline", esto da el contexto temporal exacto que el admin
 * necesita para juzgar si un usuario está activo o lleva meses sin entrar.
 */
function UserLastSeen({ lastSeenAt }: { lastSeenAt: string | null }) {
  if (!lastSeenAt) {
    return (
      <span className="text-[11px] font-medium text-blue-100/80">
        Última conexión: aún no registrada
      </span>
    );
  }
  const ts = Date.parse(lastSeenAt);
  if (!Number.isFinite(ts)) return null;
  const formatted = new Date(ts).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <span className="text-[11px] font-medium text-blue-100/90">
      Última conexión: {formatted}
    </span>
  );
}

function UserPresenceDot({ lastSeenAt }: { lastSeenAt: string | null }) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!lastSeenAt) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white/80" title="Sin actividad registrada">
        <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
        Sin actividad
      </span>
    );
  }
  const ts = Date.parse(lastSeenAt);
  const isOnline = Number.isFinite(ts) && now - ts < 3 * 60 * 1000;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        isOnline ? "bg-green-500/25 text-green-100" : "bg-red-500/25 text-red-100"
      }`}
      title={isOnline ? "En línea ahora" : `Última vez: ${new Date(ts).toLocaleString("es-ES")}`}
    >
      <span className="relative inline-flex h-2.5 w-2.5">
        {isOnline && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
            isOnline ? "bg-green-400" : "bg-red-500"
          }`}
        />
      </span>
      {isOnline ? "En línea" : "Desconectado"}
    </span>
  );
}
