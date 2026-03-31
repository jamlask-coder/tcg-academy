"use client"
import { useState } from "react"
import { Gift, Tag, Clock, Check, X, Percent, Euro } from "lucide-react"
import { MOCK_USER_COUPONS, type Coupon } from "@/data/mockData"

function CouponCard({ coupon }: { coupon: Coupon }) {
  const isActive = coupon.status === "activo"
  const isUsed = coupon.status === "usado"
  const isExpired = coupon.status === "caducado"

  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 transition ${
      isActive
        ? "border-[#1a3a5c] bg-white shadow-sm hover:shadow-md"
        : "border-gray-200 bg-gray-50 opacity-60"
    }`}>
      {/* Left color strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
        isActive ? "bg-[#1a3a5c]" : isUsed ? "bg-gray-400" : "bg-gray-300"
      }`} />

      <div className="pl-6 pr-5 py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Discount amount */}
          <div className={`flex items-center gap-2 ${isActive ? "text-[#1a3a5c]" : "text-gray-500"}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isActive ? "bg-blue-100" : "bg-gray-200"
            }`}>
              {coupon.discountType === "percent" ? (
                <Percent size={22} className={isActive ? "text-[#1a3a5c]" : "text-gray-400"} />
              ) : (
                <Euro size={22} className={isActive ? "text-[#1a3a5c]" : "text-gray-400"} />
              )}
            </div>
            <div>
              <p className={`text-2xl font-black leading-none ${isActive ? "text-[#1a3a5c]" : "text-gray-400"}`}>
                {coupon.discountType === "percent" ? `${coupon.value}%` : `${coupon.value}€`}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">de descuento</p>
            </div>
          </div>

          {/* Status badge */}
          <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
            isActive ? "bg-green-100 text-green-700"
            : isUsed ? "bg-gray-200 text-gray-600"
            : "bg-red-100 text-red-500"
          }`}>
            {isActive && <><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Activo</>}
            {isUsed && <><Check size={11} /> Usado</>}
            {isExpired && <><X size={11} /> Caducado</>}
          </span>
        </div>

        <div className="mt-3 space-y-1.5">
          <p className={`text-sm font-semibold ${isActive ? "text-gray-800" : "text-gray-500"}`}>
            {coupon.description}
          </p>
          {coupon.applicableTo && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Tag size={11} />
              Aplicable solo en: <span className="font-medium capitalize">{coupon.applicableTo}</span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
          {/* Code */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
            isActive ? "border-dashed border-[#1a3a5c] bg-blue-50" : "border-gray-200 bg-gray-100"
          }`}>
            <span className={`font-mono font-bold tracking-wider text-sm ${isActive ? "text-[#1a3a5c]" : "text-gray-400"}`}>
              {coupon.code}
            </span>
            {isActive && (
              <button
                onClick={() => navigator.clipboard?.writeText(coupon.code)}
                className="text-xs text-[#1a3a5c] hover:underline ml-1"
              >
                Copiar
              </button>
            )}
          </div>

          {/* Expiry */}
          <p className={`text-xs flex items-center gap-1 ${isActive ? "text-gray-500" : "text-gray-400"}`}>
            <Clock size={11} />
            {isUsed && coupon.usedAt
              ? `Usado el ${coupon.usedAt}`
              : `Válido hasta ${coupon.expiresAt}`}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CuponesPage() {
  const [inputCode, setInputCode] = useState("")
  const [redeemResult, setRedeemResult] = useState<{ ok: boolean; message: string } | null>(null)

  const activeCoupons = MOCK_USER_COUPONS.filter((c) => c.status === "activo")
  const usedExpiredCoupons = MOCK_USER_COUPONS.filter((c) => c.status !== "activo")

  const handleRedeem = () => {
    const code = inputCode.trim().toUpperCase()
    if (!code) return

    const existing = MOCK_USER_COUPONS.find((c) => c.code === code)
    if (existing) {
      if (existing.status === "activo") {
        setRedeemResult({ ok: false, message: "Este cupón ya está en tu cuenta." })
      } else {
        setRedeemResult({ ok: false, message: "Este cupón ya ha sido usado o ha caducado." })
      }
    } else if (code === "MAGIC5") {
      setRedeemResult({ ok: true, message: "¡Cupón MAGIC5 canjeado! 5% de descuento en Magic. Ya está disponible en tu cuenta." })
      setInputCode("")
    } else {
      setRedeemResult({ ok: false, message: "Código no válido. Comprueba que lo has introducido correctamente." })
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Gift size={22} className="text-[#1a3a5c]" /> Cupones y Descuentos
        </h1>
        <p className="text-gray-500 text-sm mt-1">Gestiona tus cupones y canjea nuevos códigos</p>
      </div>

      {/* Redeem section */}
      <div className="bg-gradient-to-br from-[#1a3a5c] to-[#2d6a9f] rounded-2xl p-6 mb-8 text-white">
        <h2 className="font-bold text-lg mb-1">Canjear código de cupón</h2>
        <p className="text-blue-200 text-sm mb-4">Introduce el código que has recibido por email o en una promoción</p>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => { setInputCode(e.target.value.toUpperCase()); setRedeemResult(null) }}
            onKeyDown={(e) => { if (e.key === "Enter") handleRedeem() }}
            placeholder="Ej: VERANO20"
            className="flex-1 min-w-[200px] h-12 px-4 rounded-xl text-gray-900 font-mono text-sm font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          <button
            onClick={handleRedeem}
            disabled={!inputCode.trim()}
            className="h-12 px-6 bg-white text-[#1a3a5c] font-bold rounded-xl hover:bg-blue-50 transition disabled:opacity-50 text-sm"
          >
            Canjear
          </button>
        </div>
        {redeemResult && (
          <div className={`mt-3 flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl ${
            redeemResult.ok ? "bg-green-500/20 text-green-100" : "bg-red-500/20 text-red-100"
          }`}>
            {redeemResult.ok ? <Check size={16} /> : <X size={16} />}
            {redeemResult.message}
          </div>
        )}
      </div>

      {/* Active coupons */}
      <div className="mb-8">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Cupones activos ({activeCoupons.length})
        </h2>
        {activeCoupons.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-400">
            <Gift size={32} className="mx-auto mb-2" />
            <p>No tienes cupones activos en este momento</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {activeCoupons.map((c) => <CouponCard key={c.code} coupon={c} />)}
          </div>
        )}
      </div>

      {/* Used/expired */}
      {usedExpiredCoupons.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            Historial de cupones
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {usedExpiredCoupons.map((c) => <CouponCard key={c.code} coupon={c} />)}
          </div>
        </div>
      )}
    </div>
  )
}
