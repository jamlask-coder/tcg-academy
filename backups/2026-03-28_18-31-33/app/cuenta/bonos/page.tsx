"use client"
import { useState } from "react"
import { Star, TrendingUp, TrendingDown, Gift, X, Check } from "lucide-react"
import {
  MOCK_POINTS_HISTORY,
  MOCK_POINTS_BALANCE,
  POINTS_REDEMPTION_TABLE,
  type PointsTransaction,
} from "@/data/mockData"

const TYPE_CONFIG: Record<PointsTransaction["type"], { label: string; color: string; bg: string }> = {
  compra:    { label: "Compra", color: "text-green-700", bg: "bg-green-100" },
  canje:     { label: "Canje", color: "text-red-600", bg: "bg-red-100" },
  bonus:     { label: "Bonus", color: "text-amber-700", bg: "bg-amber-100" },
  devolucion:{ label: "Devolución", color: "text-gray-600", bg: "bg-gray-100" },
}

function RedeemModal({
  balance,
  onClose,
}: {
  balance: number
  onClose: () => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const available = POINTS_REDEMPTION_TABLE.filter((r) => r.points <= balance)

  if (confirmed) {
    const option = POINTS_REDEMPTION_TABLE.find((r) => r.points === selected)!
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">¡Puntos canjeados!</h3>
          <p className="text-gray-600 mb-1">
            Has canjeado <strong>{option.points} puntos</strong> por un descuento de{" "}
            <strong className="text-[#1a3a5c]">{option.euros.toFixed(2)}€</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-6">El cupón se ha aplicado automáticamente a tu próxima compra.</p>
          <button
            onClick={onClose}
            className="w-full bg-[#1a3a5c] text-white font-bold py-3 rounded-xl hover:bg-[#15304d] transition"
          >
            Aceptar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Canjear puntos</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Saldo disponible: <strong className="text-[#1a3a5c] text-base">{balance} puntos</strong>
        </p>
        <div className="space-y-2 mb-5">
          {POINTS_REDEMPTION_TABLE.map((option) => {
            const canRedeem = option.points <= balance
            return (
              <button
                key={option.points}
                onClick={() => canRedeem && setSelected(option.points)}
                disabled={!canRedeem}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition text-left ${
                  selected === option.points
                    ? "border-[#1a3a5c] bg-blue-50"
                    : canRedeem
                    ? "border-gray-200 hover:border-gray-300"
                    : "border-gray-100 opacity-40 cursor-not-allowed"
                }`}
              >
                <span className="font-bold text-gray-900">{option.points} puntos</span>
                <span className={`text-lg font-black ${canRedeem ? "text-[#1a3a5c]" : "text-gray-300"}`}>
                  = {option.euros.toFixed(2)}€
                </span>
              </button>
            )
          })}
        </div>
        <button
          onClick={() => selected && setConfirmed(true)}
          disabled={!selected}
          className="w-full bg-[#1a3a5c] text-white font-bold py-3.5 rounded-xl hover:bg-[#15304d] transition disabled:opacity-40 text-sm"
        >
          Canjear {selected ? `${selected} puntos` : "puntos"}
        </button>
        {available.length === 0 && (
          <p className="text-center text-sm text-gray-400 mt-3">
            Necesitas al menos 100 puntos para canjear.
          </p>
        )}
      </div>
    </div>
  )
}

export default function BonosPage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <div>
      {showModal && <RedeemModal balance={MOCK_POINTS_BALANCE} onClose={() => setShowModal(false)} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Star size={22} className="text-amber-500" /> Bonos y Puntos
        </h1>
        <p className="text-gray-500 text-sm mt-1">Acumula puntos con cada compra y canjéalos por descuentos</p>
      </div>

      {/* Points balance card */}
      <div className="bg-gradient-to-br from-amber-500 to-amber-400 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-amber-100 text-sm font-medium mb-1">Tus puntos acumulados</p>
            <div className="flex items-end gap-2">
              <span className="text-6xl font-black leading-none">{MOCK_POINTS_BALANCE}</span>
              <span className="text-amber-200 text-lg font-bold mb-1">puntos</span>
            </div>
            <p className="text-amber-100 text-sm mt-2">
              Equivalen a <strong className="text-white">{(MOCK_POINTS_BALANCE / 100).toFixed(2)}€</strong> de descuento
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-white text-amber-600 font-bold px-6 py-3 rounded-xl hover:bg-amber-50 transition text-sm min-h-[44px]"
          >
            <Gift size={16} className="inline mr-1.5 -mt-0.5" />
            Canjear puntos
          </button>
        </div>
      </div>

      {/* How to earn */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">🛍️</div>
          <p className="font-bold text-gray-900 text-sm">Compra</p>
          <p className="text-xs text-gray-500 mt-1">1€ gastado = 1 punto</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">🎁</div>
          <p className="font-bold text-gray-900 text-sm">Bonus especiales</p>
          <p className="text-xs text-gray-500 mt-1">Eventos y promociones</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">⭐</div>
          <p className="font-bold text-gray-900 text-sm">Bienvenida</p>
          <p className="text-xs text-gray-500 mt-1">50 puntos al registrarte</p>
        </div>
      </div>

      {/* Redemption table */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-8">
        <h2 className="font-bold text-gray-900 mb-4">Tabla de canje</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 rounded-l-xl">Puntos necesarios</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600 rounded-r-xl">Descuento obtenido</th>
              </tr>
            </thead>
            <tbody>
              {POINTS_REDEMPTION_TABLE.map((row) => (
                <tr key={row.points} className={`border-t border-gray-100 ${row.points <= MOCK_POINTS_BALANCE ? "" : "opacity-50"}`}>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <Star size={14} className="text-amber-400 flex-shrink-0" />
                    <span className="font-semibold text-gray-900">{row.points} puntos</span>
                    {row.points <= MOCK_POINTS_BALANCE && (
                      <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">Disponible</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#1a3a5c] text-base">{row.euros.toFixed(2)}€</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* History */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Historial de puntos</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {MOCK_POINTS_HISTORY.map((tx) => {
            const config = TYPE_CONFIG[tx.type]
            return (
              <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                  {tx.points > 0 ? (
                    <TrendingUp size={16} className={config.color} />
                  ) : (
                    <TrendingDown size={16} className={config.color} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{tx.concept}</p>
                  <p className="text-xs text-gray-500">{tx.date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold text-sm ${tx.points > 0 ? "text-green-600" : "text-red-500"}`}>
                    {tx.points > 0 ? "+" : ""}{tx.points} pts
                  </p>
                  <p className="text-xs text-gray-400">Saldo: {tx.balance}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
