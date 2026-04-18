"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, Users, X, ChevronRight, Clock } from "lucide-react";
import { MOCK_USERS, ADMIN_ORDERS, type AdminUser } from "@/data/mockData";
import type { User } from "@/types/user";
import { readAdminOrdersMerged } from "@/lib/orderAdapter";
import { loadPoints } from "@/services/pointsService";

const ROLE_COLORS = {
  cliente: "bg-gray-100 text-gray-600",
  mayorista: "bg-blue-100 text-blue-700",
  tienda: "bg-green-100 text-green-700",
  admin: "bg-amber-100 text-amber-700",
};

const ROLE_LABELS: Record<string, string> = {
  cliente: "Cliente",
  mayorista: "Mayorista",
  tienda: "Tienda",
  admin: "Administrador",
};

type UserRole = AdminUser["role"];

export default function AdminUsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>(MOCK_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [sortByRecent, setSortByRecent] = useState(true);

  const refreshUsers = () => {
    try {
      // ── Leer usuarios registrados (seed + real) ──
      const stored = localStorage.getItem("tcgacademy_registered");
      const registered = stored
        ? (JSON.parse(stored) as Record<string, { password: string; user: User }>)
        : {};
      const mockEmails = new Set(MOCK_USERS.map((u) => u.email.toLowerCase()));
      const newUsers: AdminUser[] = Object.values(registered)
        .filter((entry) => !mockEmails.has(entry.user.email.toLowerCase()))
        .map((entry) => ({
          id: entry.user.id,
          name: entry.user.name,
          lastName: entry.user.lastName,
          email: entry.user.email,
          role: entry.user.role as AdminUser["role"],
          registeredAt: entry.user.createdAt.slice(0, 10),
          totalOrders: 0,
          totalSpent: 0,
          points: 0,
          active: true,
          phone: entry.user.phone,
        }));

      // ── Cruzar pedidos reales con usuarios para recalcular stats ──
      const merged = readAdminOrdersMerged(ADMIN_ORDERS);
      const statsByKey = new Map<string, { orders: number; spent: number }>();
      for (const o of merged) {
        const keys = [o.userId, o.userEmail?.toLowerCase()].filter(Boolean) as string[];
        for (const k of keys) {
          const prev = statsByKey.get(k) ?? { orders: 0, spent: 0 };
          prev.orders += 1;
          prev.spent += Number(o.total) || 0;
          statsByKey.set(k, prev);
        }
      }
      const recomputeUser = (u: AdminUser): AdminUser => {
        const s = statsByKey.get(u.id) ?? statsByKey.get(u.email.toLowerCase());
        const livePoints = loadPoints(u.id);
        return {
          ...u,
          totalOrders: s ? s.orders : u.totalOrders,
          totalSpent: s ? s.spent : u.totalSpent,
          points: livePoints > 0 ? livePoints : u.points,
        };
      };

      const combined = [...MOCK_USERS, ...newUsers].map(recomputeUser);
      setUsers(combined);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUsers();
    const onUpdate = () => refreshUsers();
    window.addEventListener("tcga:orders:updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("tcga:orders:updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const filtered = useMemo(() => {
    return users
      .filter((u) => {
        if (roleFilter && u.role !== roleFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            u.name.toLowerCase().includes(q) ||
            u.lastName.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortByRecent) {
          return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
        }
        return `${a.name} ${a.lastName}`.localeCompare(`${b.name} ${b.lastName}`, "es");
      });
  }, [users, search, roleFilter, sortByRecent]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Users size={22} className="text-[#2563eb]" /> Usuarios registrados
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {filtered.length} usuarios registrados
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[160px] flex-1">
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="h-10 w-full rounded-xl border border-gray-200 pr-8 pl-8 text-sm transition focus:border-[#2563eb] focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value as UserRole | ""); setSortByRecent(false); }}
            className="h-10 appearance-none rounded-xl border border-gray-200 bg-white pr-8 pl-3 text-sm text-gray-700 focus:border-[#2563eb] focus:outline-none"
          >
            <option value="">Todos los roles</option>
            <option value="cliente">Cliente</option>
            <option value="mayorista">Mayorista</option>
            <option value="tienda">Tienda</option>
            <option value="admin">Admin</option>
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-gray-400"
          />
        </div>
      </div>

      {/* Main layout: table left (3/4) + counters/detail right (1/4) */}
      <div className="grid gap-6 lg:grid-cols-4">

        {/* LEFT: unified table */}
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <Clock size={15} className="text-[#2563eb]" />
                {roleFilter ? `Últimos registrados · ${ROLE_LABELS[roleFilter]}` : "Últimos registrados"}
              </h2>
              <span className="text-xs text-gray-400">{filtered.length} usuarios</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs tracking-wider text-gray-500 uppercase">
                    <th className="px-4 py-3 text-left font-semibold">Usuario</th>
                    <th className="hidden px-3 py-3 text-center font-semibold sm:table-cell">Rol</th>
                    <th className="hidden px-3 py-3 text-right font-semibold md:table-cell">Registrado</th>
                    <th className="hidden px-3 py-3 text-right font-semibold md:table-cell">Pedidos</th>
                    <th className="hidden px-4 py-3 text-right font-semibold md:table-cell">Gasto total</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((user) => (
                    <tr
                      key={user.id}
                      className="cursor-pointer transition hover:bg-gray-50"
                      onClick={() => router.push(`/admin/usuarios/${user.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-xs font-bold text-white">
                            {user.name[0]}{user.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{user.name} {user.lastName}</p>
                            <p className="truncate text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 text-center sm:table-cell">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ROLE_COLORS[user.role]}`}>
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td className="hidden px-3 py-3 text-right text-xs text-gray-500 md:table-cell">{user.registeredAt}</td>
                      <td className="hidden px-3 py-3 text-right font-medium text-gray-700 md:table-cell">{user.totalOrders}</td>
                      <td className="hidden px-4 py-3 text-right font-bold text-gray-900 md:table-cell">{user.totalSpent.toFixed(2)}€</td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight size={16} className="ml-auto text-gray-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">No se encontraron usuarios</p>
            )}
          </div>
        </div>

        {/* RIGHT: counters (vertical) + detail panel */}
        <div className="space-y-4">
          {/* Counters — vertical 1×1 */}
          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3">
              <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">Resumen</p>
            </div>
            <div className="divide-y divide-gray-100">
              {(["cliente", "mayorista", "tienda", "admin"] as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    setRoleFilter(role);
                    setSortByRecent(true);
                  }}
                  className={`flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-gray-50 ${roleFilter === role ? "bg-blue-50" : ""}`}
                >
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ROLE_COLORS[role]}`}>
                    {ROLE_LABELS[role]}
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    {users.filter((u) => u.role === role).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
