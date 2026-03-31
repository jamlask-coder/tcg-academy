"use client"
import { useCart } from "@/context/CartContext"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, Tag, Star, X, ChevronDown } from "lucide-react"
import { useState } from "react"
import { MOCK_ADMIN_COUPONS, MOCK_POINTS_BALANCE, POINTS_REDEMPTION_TABLE } from "@/data/mockData"
import { PRODUCTS } from "@/data/products"

interface AppliedCoupon {
  code: string
  discountType: "percent" | "fixed"
  value: number
  description: string
}

interface AppliedPoints {
  points: number
  euros: number
}

export default function CartPage() {
  const router = useRouter()
  const { items, count, total, removeItem, updateQty, clearCart } = useCart()

  const [couponInput, setCouponInput] = useState("")
  const [couponError, setCouponError] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)

  const [showPointsPanel, setShowPointsPanel] = useState(false)
  const [appliedPoints, setAppliedPoints] = useState<AppliedPoints | null>(null)

  const shipping = total >= 149 ? 0 : 3.99

  const couponDiscount = appliedCoupon
    ? appliedCoupon.discountType === "percent"
      ? total * (appliedCoupon.value / 100)
      : Math.min(appliedCoupon.value, total)
    : 0

  const pointsDiscount = appliedPoints?.euros ?? 0

  const finalTotal = Math.max(0, total - couponDiscount - pointsDiscount + shipping)

  const applyCoupon = () => {
    setCouponError("")
    const code = couponInput.trim().toUpperCase()
    if (!code) return

    const found = MOCK_ADMIN_COUPONS.find(
      (c) => c.code === code && c.active && new Date(c.endsAt) >= new Date()
    )

    if (!found) {
      setCouponError("Código no válido o caducado")
      return
    }

    setAppliedCoupon({
      code: found.code,
      discountType: found.discountType,
      value: found.value,
      description: found.description,
    })
    setCouponInput("")
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput("")
    setCouponError("")
  }

  const applyPoints = (tier: typeof POINTS_REDEMPTION_TABLE[number]) => {
    if (tier.points > MOCK_POINTS_BALANCE) return
    setAppliedPoints({ points: tier.points, euros: tier.euros })
    setShowPointsPanel(false)
  }

  const removePoints = () => setAppliedPoints(null)

  const handleCheckout = () => {
    localStorage.setItem("tcgacademy_pending_checkout", JSON.stringify({
      appliedCoupon,
      couponDiscount,
      appliedPoints,
      pointsDiscount,
      finalTotal,
    }))
    router.push("/finalizar-compra")
  }

  if (!count) return (
    <div className="max-w-[1180px] mx-auto px-6 py-24 text-center">
      <ShoppingCart size={64} className="mx-auto text-gray-200 mb-6" />
      <h1 className="text-2xl font-bold text-gray-700 mb-2">Tu carrito está vacío</h1>
      <p className="text-gray-500 mb-8">Explora nuestro catálogo y encuentra tus cartas favoritas</p>
      <Link href="/catalogo"
        className="inline-flex items-center gap-2 bg-[#1a3a5c] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#15304d] transition">
        Ir al catálogo <ArrowRight size={18} />
      </Link>
    </div>
  )

  return (
    <div className="max-w-[1180px] mx-auto px-6 py-10">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
        Carrito{" "}
        <span className="text-gray-400 font-normal text-lg">
          ({count} {count === 1 ? "producto" : "productos"})
        </span>
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const prod = PRODUCTS.find(p => p.id === item.product_id)
            const productHref = prod ? `/${prod.game}/${prod.category}/${prod.slug}` : null
            return (
              <div key={item.key} className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-4">
                {productHref ? (
                  <Link href={productHref} className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                    <Image src={item.image || "/placeholder-card.jpg"} alt={item.name} fill className="object-cover" sizes="80px" />
                  </Link>
                ) : (
                  <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                    <Image src={item.image || "/placeholder-card.jpg"} alt={item.name} fill className="object-cover" sizes="80px" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 mb-1">
                    {item.name}
                  </h3>
                  <p className="text-[#1a3a5c] font-bold text-base">{item.price.toFixed(2)}€/ud</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <button
                    onClick={() => removeItem(item.key)}
                    className="text-gray-300 hover:text-red-400 transition min-w-[32px] min-h-[32px] flex items-center justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQty(item.key, item.quantity - 1)}
                      className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 transition"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.key, item.quantity + 1)}
                      className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 transition"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {(item.price * item.quantity).toFixed(2)}€
                  </span>
                </div>
              </div>
            )
          })}
          <button
            onClick={clearCart}
            className="text-sm text-gray-400 hover:text-red-400 transition flex items-center gap-1 mt-2 min-h-[36px]"
          >
            <Trash2 size={14} /> Vaciar carrito
          </button>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sticky top-36">
            <h2 className="font-bold text-gray-900 text-lg mb-5">Resumen del pedido</h2>

            {/* Subtotal + lines */}
            <div className="space-y-2.5 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal ({count} productos)</span>
                <span className="font-semibold">{total.toFixed(2)}€</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <Tag size={12} /> {appliedCoupon.code}
                    <button onClick={removeCoupon} className="ml-1 text-gray-300 hover:text-red-400">
                      <X size={11} />
                    </button>
                  </span>
                  <span className="text-green-600 font-semibold">
                    -{appliedCoupon.discountType === "percent"
                      ? `${appliedCoupon.value}% (${couponDiscount.toFixed(2)}€)`
                      : `${couponDiscount.toFixed(2)}€`}
                  </span>
                </div>
              )}
              {appliedPoints && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-600 font-medium flex items-center gap-1">
                    <Star size={12} /> {appliedPoints.points} puntos
                    <button onClick={removePoints} className="ml-1 text-gray-300 hover:text-red-400">
                      <X size={11} />
                    </button>
                  </span>
                  <span className="text-amber-600 font-semibold">-{appliedPoints.euros.toFixed(2)}€</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Envío</span>
                <span className={shipping === 0 ? "text-green-600 font-semibold" : "font-semibold"}>
                  {shipping === 0 ? "Gratis" : `${shipping.toFixed(2)}€`}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-gray-400">
                  Te faltan <strong>{(149 - total).toFixed(2)}€</strong> para envío gratis
                </p>
              )}
            </div>

            {/* Coupon input */}
            <div className="border-t border-gray-100 pt-4 mb-4">
              <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                <Tag size={12} /> Código de descuento
              </p>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-sm font-bold text-green-700 font-mono">{appliedCoupon.code}</p>
                    <p className="text-xs text-green-600 mt-0.5">{appliedCoupon.description}</p>
                  </div>
                  <button onClick={removeCoupon} className="text-gray-400 hover:text-red-400 transition ml-2 min-w-[32px] min-h-[32px] flex items-center justify-center">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Ej: BIENVENIDA15"
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value); setCouponError("") }}
                        onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                        className="w-full h-10 pl-8 pr-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a3a5c] uppercase"
                      />
                    </div>
                    <button
                      onClick={applyCoupon}
                      className="h-10 px-4 bg-gray-100 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-200 transition"
                    >
                      Aplicar
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">{couponError}</p>
                  )}
                </>
              )}
            </div>

            {/* Points redemption */}
            <div className="border-t border-gray-100 pt-4 mb-5">
              <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                <Star size={12} className="text-amber-500" /> Canjear puntos
                <span className="ml-auto text-amber-600 font-bold">{MOCK_POINTS_BALANCE} pts disponibles</span>
              </p>
              {appliedPoints ? (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <p className="text-sm font-bold text-amber-700">
                    {appliedPoints.points} pts = {appliedPoints.euros.toFixed(2)}€
                  </p>
                  <button onClick={removePoints} className="text-gray-400 hover:text-red-400 transition min-w-[32px] min-h-[32px] flex items-center justify-center">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setShowPointsPanel(!showPointsPanel)}
                    className="w-full flex items-center justify-between h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-[#1a3a5c] transition"
                  >
                    <span>Seleccionar cantidad...</span>
                    <ChevronDown size={14} className={`transition ${showPointsPanel ? "rotate-180" : ""}`} />
                  </button>
                  {showPointsPanel && (
                    <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {POINTS_REDEMPTION_TABLE.map((tier) => {
                        const canUse = tier.points <= MOCK_POINTS_BALANCE
                        return (
                          <button
                            key={tier.points}
                            onClick={() => canUse && applyPoints(tier)}
                            disabled={!canUse}
                            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition ${canUse ? "hover:bg-amber-50 text-gray-800" : "opacity-40 cursor-not-allowed text-gray-500"}`}
                          >
                            <span className="flex items-center gap-1.5">
                              <Star size={12} className="text-amber-400" />
                              {tier.points} puntos
                            </span>
                            <span className="font-bold text-amber-600">{tier.euros.toFixed(2)}€</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="border-t border-gray-100 pt-4 mb-5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-[#1a3a5c]">{finalTotal.toFixed(2)}€</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">IVA incluido</p>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full bg-[#1a3a5c] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#15304d] transition text-base min-h-[52px]"
            >
              Finalizar compra <ArrowRight size={18} />
            </button>

            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
              {["Visa", "Mastercard", "PayPal", "Bizum"].map((p) => (
                <span key={p} className="font-medium">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
