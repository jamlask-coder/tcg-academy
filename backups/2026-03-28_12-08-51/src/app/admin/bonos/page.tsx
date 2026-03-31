"use client"
import { useState } from "react"
import { Star, Settings, TrendingUp, Plus, Check } from "lucide-react"
import { MOCK_USERS, POINTS_REDEMPTION_TABLE } from "@/data/mockData"

const TOP_USERS = [...MOCK_USERS].sort((a, b) => b.points - a.points).slice(0, 5)

export default function AdminBonosPage() {
  const [pointsPerEuro, setPointsPerEuro] = useState(1)
  const [redeemTable, setRedeemTable] = useState(POINTS_REDEMPTION_TABLE)
  const [addPointsUser, setAddPointsUser] = useState("")
  const [addPointsAmount, setAddPointsAmount] = useState("")
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
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
          <Star size={22} className="text-amber-500" /> Gestión de bonos y puntos
        </h1>
        <p className="text-gray-500 text-sm mt-1">Configura el programa de fidelidad y gestiona los puntos de los clientes</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Points ratio */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings size={17} className="text-gray-400" /> Configuración de puntos
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Puntos por cada euro gastado
              </label>
              <div className="flex items-center gap-3">
                <input type="number" value={pointsPerEuro} min="1" max="10"
                  onChange={(e) => setPointsPerEuro(parseInt(e.target.value) || 1)}
                  className="w-24 h-11 px-3 border-2 border-gray-200 rounded-xl text-center text-xl font-bold focus:outline-none focus:border-[#1a3a5c]" />
                <span className="text-sm text-gray-500">puntos / €</span>
              </div>
            </div>
            <button
              onClick={() => showToast("Configuración guardada")}
              className="flex items-center gap-2 bg-[#1a3a5c] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-[#15304d] transition min-h-[44px]"
            >
              <Check size={15} /> Guardar configuración
            </button>
          </div>
        </div>

        {/* Redemption table */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={17} className="text-gray-400" /> Tabla de canje
          </h2>
          <div className="space-y-2">
            {redeemTable.map((row, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 flex-1">
                  <Star size={12} className="text-amber-400 flex-shrink-0" />
                  <input type="number" value={row.points} min="1"
                    onChange={(e) => setRedeemTable(prev => prev.map((r, j) => j === i ? { ...r, points: parseInt(e.target.value) || 0 } : r))}
                    className="w-20 h-9 px-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-[#1a3a5c]" />
                  <span className="text-xs text-gray-500">pts =</span>
                  <input type="number" value={row.euros} min="0.01" step="0.01"
                    onChange={(e) => setRedeemTable(prev => prev.map((r, j) => j === i ? { ...r, euros: parseFloat(e.target.value) || 0 } : r))}
                    className="w-20 h-9 px-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-[#1a3a5c]" />
                  <span className="text-xs text-gray-500">€</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => showToast("Tabla de canje actualizada")}
            className="mt-4 flex items-center gap-2 bg-[#1a3a5c] text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-[#15304d] transition min-h-[44px]"
          >
            <Check size={14} /> Guardar tabla
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top users */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Ranking de puntos</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {TOP_USERS.map((user, i) => (
              <div key={user.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
                  i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-gray-300 text-white" : i === 2 ? "bg-amber-700 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user.name} {user.lastName}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star size={14} className="fill-current" />
                  <span className="font-bold text-gray-900 text-sm">{user.points}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add points manually */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Plus size={17} className="text-gray-400" /> Añadir puntos manualmente
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Usuario</label>
              <select value={addPointsUser} onChange={(e) => setAddPointsUser(e.target.value)}
                className="w-full h-11 px-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] bg-white">
                <option value="">Seleccionar usuario...</option>
                {MOCK_USERS.filter(u => u.role !== "admin").map(u => (
                  <option key={u.id} value={u.id}>{u.name} {u.lastName} ({u.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cantidad de puntos</label>
              <input type="number" value={addPointsAmount} min="1"
                onChange={(e) => setAddPointsAmount(e.target.value)}
                placeholder="Ej: 50"
                className="w-full h-11 px-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c]" />
            </div>
            <button
              onClick={() => {
                if (!addPointsUser || !addPointsAmount) return
                const user = MOCK_USERS.find(u => u.id === addPointsUser)
                showToast(`${addPointsAmount} puntos añadidos a ${user?.name} ${user?.lastName}`)
                setAddPointsUser("")
                setAddPointsAmount("")
              }}
              disabled={!addPointsUser || !addPointsAmount}
              className="w-full bg-amber-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-amber-600 transition disabled:opacity-40 min-h-[44px]"
            >
              <Star size={14} className="inline mr-1.5 -mt-0.5" />
              Añadir puntos
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
