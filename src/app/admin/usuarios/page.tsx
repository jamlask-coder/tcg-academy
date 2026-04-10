"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ChevronDown, Users, X, ChevronRight, ShieldCheck, Clock, ArrowRight } from "lucide-react";
import { MOCK_USERS, type AdminUser } from "@/data/mockData";

const ROLE_COLORS = {
  cliente: "bg-gray-100 text-gray-600",
  mayorista: "bg-blue-100 text-blue-700",
  tienda: "bg-purple-100 text-purple-700",
  admin: "bg-amber-100 text-amber-700",
};

const ROLE_LABELS: Record<string, string> = {
  cliente: "Cliente estándar",
  mayorista: "Mayorista",
  tienda: "Tienda TCG",
  admin: "Administrador",
};

type UserRole = AdminUser["role"];

interface PendingChange {
  userId: string;
  userName: string;
  currentRole: UserRole;
  newRole: UserRole;
}

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<AdminUser[]>(MOCK_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingChange | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

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
      .sort((a, b) =>
        `${a.name} ${a.lastName}`.localeCompare(`${b.name} ${b.lastName}`, "es"),
      );
  }, [users, search, roleFilter]);

  const requestRoleChange = (user: AdminUser, newRole: UserRole) => {
    if (user.role === newRole) return;
    setPending({
      userId: user.id,
      userName: `${user.name} ${user.lastName}`,
      currentRole: user.role,
      newRole,
    });
  };

  const confirmRoleChange = () => {
    if (!pending) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === pending.userId ? { ...u, role: pending.newRole } : u)),
    );
    if (selected?.id === pending.userId)
      setSelected((p) => (p ? { ...p, role: pending.newRole } : null));
    showToast(`Rol de ${pending.userName} actualizado a ${ROLE_LABELS[pending.newRole]}`);
    setPending(null);
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed right-6 bottom-6 z-50 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-medium text-white shadow-xl">
          ✓ {toast}
        </div>
      )}

      {/* Confirmation modal */}
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setPending(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <ShieldCheck size={22} className="text-amber-600" />
            </div>
            <h2 className="mb-1 text-lg font-bold text-gray-900">
              Cambiar rol de usuario
            </h2>
            <p className="mb-5 text-sm text-gray-500">
              ¿Confirmas el cambio de rol para{" "}
              <span className="font-semibold text-gray-800">{pending.userName}</span>?
            </p>
            <div className="mb-5 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${ROLE_COLORS[pending.currentRole]}`}>
                {ROLE_LABELS[pending.currentRole]}
              </span>
              <ChevronRight size={14} className="flex-shrink-0 text-gray-400" />
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${ROLE_COLORS[pending.newRole]}`}>
                {ROLE_LABELS[pending.newRole]}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPending(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRoleChange}
                className="flex-1 rounded-xl bg-[#2563eb] py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Users size={22} className="text-[#2563eb]" /> Gestión de usuarios
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
            onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}
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

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["cliente", "mayorista", "tienda", "admin"] as UserRole[]).map(
          (role) => (
            <div
              key={role}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <p className="mb-1 text-xs text-gray-500 capitalize">{role}s</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter((u) => u.role === role).length}
              </p>
            </div>
          ),
        )}
      </div>

      {/* Recent registrations */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Clock size={15} className="text-[#2563eb]" /> Últimos registrados
          </h2>
          <span className="text-xs text-gray-400">Mostrando los 5 más recientes</span>
        </div>
        <div className="divide-y divide-gray-50">
          {[...users]
            .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())
            .slice(0, 5)
            .map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-5 py-3 transition hover:bg-gray-50"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-xs font-bold text-white">
                  {u.name[0]}{u.lastName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {u.name} {u.lastName}
                  </p>
                  <p className="truncate text-xs text-gray-400">{u.email}</p>
                </div>
                <span className={`hidden flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold sm:inline-block ${ROLE_COLORS[u.role]}`}>
                  {ROLE_LABELS[u.role]}
                </span>
                <span className="flex-shrink-0 text-xs text-gray-400">{u.registeredAt}</span>
                <button
                  onClick={() => setSelected(selected?.id === u.id ? null : u)}
                  className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-[#2563eb]"
                  aria-label="Ver opciones"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Table */}
        <div className={selected ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs tracking-wider text-gray-500 uppercase">
                    <th className="px-4 py-3 text-left font-semibold">
                      Usuario
                    </th>
                    <th className="hidden px-3 py-3 text-center font-semibold sm:table-cell">
                      Rol
                    </th>
                    <th className="hidden px-3 py-3 text-right font-semibold md:table-cell">
                      Pedidos
                    </th>
                    <th className="hidden px-4 py-3 text-right font-semibold md:table-cell">
                      Gasto total
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((user) => (
                    <tr
                      key={user.id}
                      className={`cursor-pointer transition hover:bg-gray-50 ${selected?.id === user.id ? "bg-blue-50" : ""}`}
                      onClick={() =>
                        setSelected(selected?.id === user.id ? null : user)
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-xs font-bold text-white">
                            {user.name[0]}
                            {user.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {user.name} {user.lastName}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 text-center sm:table-cell">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${ROLE_COLORS[user.role]}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="hidden px-3 py-3 text-right font-medium text-gray-700 md:table-cell">
                        {user.totalOrders}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-bold text-gray-900 md:table-cell">
                        {user.totalSpent.toFixed(2)}€
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight
                          size={16}
                          className={`ml-auto text-gray-400 transition ${selected?.id === user.id ? "rotate-90" : ""}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">
                No se encontraron usuarios
              </p>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-lg font-bold text-white">
                    {selected.name[0]}
                    {selected.lastName[0]}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">
                      {selected.name} {selected.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{selected.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Registrado</span>
                  <span className="font-medium">{selected.registeredAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pedidos</span>
                  <span className="font-medium">{selected.totalOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Gasto total</span>
                  <span className="font-bold text-[#2563eb]">
                    {selected.totalSpent.toFixed(2)}€
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Puntos</span>
                  <span className="font-medium">{selected.points}</span>
                </div>
              </div>
              <Link
                href={`/admin/usuarios/${selected.id}`}
                className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#2563eb] py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Ver perfil completo <ArrowRight size={14} />
              </Link>
            </div>

            {/* Change role */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="mb-3 text-sm font-bold text-gray-900">
                Cambiar rol
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  ["cliente", "mayorista", "tienda", "admin"] as UserRole[]
                ).map((role) => (
                  <button
                    key={role}
                    onClick={() => requestRoleChange(selected, role)}
                    disabled={selected.role === role}
                    className={`min-h-[44px] rounded-xl border-2 py-2.5 text-xs font-bold transition ${
                      selected.role === role
                        ? "cursor-default border-[#2563eb] bg-[#2563eb] text-white"
                        : "border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700"
                    }`}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
