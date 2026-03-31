"use client"
import { useState, useMemo } from "react"
import { Search, ChevronDown, Users, X, ChevronRight } from "lucide-react"
import { MOCK_USERS, type AdminUser } from "@/data/mockData"

const ROLE_COLORS = {
  cliente:    "bg-gray-100 text-gray-600",
  mayorista:  "bg-blue-100 text-blue-700",
  tienda:     "bg-purple-100 text-purple-700",
  admin:      "bg-amber-100 text-amber-700",
}

type UserRole = AdminUser["role"]

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<AdminUser[]>(MOCK_USERS)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("")
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          u.name.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [users, search, roleFilter])

  const changeRole = (userId: string, newRole: UserRole) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
    if (selected?.id === userId) setSelected((p) => p ? { ...p, role: newRole } : null)
    showToast(`Rol actualizado correctamente`)
  }

  return (
    <div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a3a5c] text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium">
          ✓ {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users size={22} className="text-[#1a3a5c]" /> Gestión de usuarios
        </h1>
        <p className="text-gray-500 text-sm mt-1">{filtered.length} usuarios registrados</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(["cliente", "mayorista", "tienda", "admin"] as UserRole[]).map((role) => (
          <div key={role} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 capitalize mb-1">{role}s</p>
            <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === role).length}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full h-10 pl-8 pr-8 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition"
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
        </div>
        <div className="relative">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}
            className="h-10 pl-3 pr-8 border border-gray-200 rounded-xl text-sm bg-white appearance-none focus:outline-none focus:border-[#1a3a5c] text-gray-700">
            <option value="">Todos los roles</option>
            <option value="cliente">Cliente</option>
            <option value="mayorista">Mayorista</option>
            <option value="tienda">Tienda</option>
            <option value="admin">Admin</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className={selected ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-semibold">Usuario</th>
                    <th className="text-center px-3 py-3 font-semibold hidden sm:table-cell">Rol</th>
                    <th className="text-right px-3 py-3 font-semibold hidden md:table-cell">Pedidos</th>
                    <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">Gasto total</th>
                    <th className="text-right px-4 py-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((user) => (
                    <tr
                      key={user.id}
                      className={`hover:bg-gray-50 transition cursor-pointer ${selected?.id === user.id ? "bg-blue-50" : ""}`}
                      onClick={() => setSelected(selected?.id === user.id ? null : user)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {user.name[0]}{user.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{user.name} {user.lastName}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center hidden sm:table-cell">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${ROLE_COLORS[user.role]}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-gray-700 hidden md:table-cell">{user.totalOrders}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 hidden md:table-cell">{user.totalSpent.toFixed(2)}€</td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight size={16} className={`ml-auto text-gray-400 transition ${selected?.id === user.id ? "rotate-90" : ""}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">No se encontraron usuarios</p>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {selected.name[0]}{selected.lastName[0]}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{selected.name} {selected.lastName}</p>
                    <p className="text-xs text-gray-500">{selected.email}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 p-1">
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
                  <span className="font-bold text-[#1a3a5c]">{selected.totalSpent.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Puntos</span>
                  <span className="font-medium">{selected.points}</span>
                </div>
              </div>
            </div>

            {/* Change role */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-gray-900 mb-3">Cambiar rol</p>
              <div className="grid grid-cols-2 gap-2">
                {(["cliente", "mayorista", "tienda", "admin"] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => changeRole(selected.id, role)}
                    className={`py-2.5 rounded-xl text-xs font-bold capitalize transition border-2 min-h-[44px] ${
                      selected.role === role
                        ? "border-[#1a3a5c] bg-[#1a3a5c] text-white"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
