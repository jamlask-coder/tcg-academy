"use client";
import { useCart } from "@/context/CartContext";
import { SITE_CONFIG } from "@/config/siteConfig";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  ArrowRight,
  Tag,
  Star,
  X,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import {
  MOCK_ADMIN_COUPONS,
  MOCK_POINTS_BALANCE,
  POINTS_REDEMPTION_TABLE,
} from "@/data/mockData";
import { PRODUCTS } from "@/data/products";

interface AppliedCoupon {
  code: string;
  discountType: "percent" | "fixed";
  value: number;
  description: string;
}

interface AppliedPoints {
  points: number;
  euros: number;
}

export default function CartPage() {
  const router = useRouter();
  const { items, count, total, removeItem, updateQty, clearCart } = useCart();

  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(
    null,
  );

  const [showPointsPanel, setShowPointsPanel] = useState(false);
  const [appliedPoints, setAppliedPoints] = useState<AppliedPoints | null>(
    null,
  );

  const shipping = total >= SITE_CONFIG.shippingThreshold ? 0 : 3.99;

  const couponDiscount = appliedCoupon
    ? appliedCoupon.discountType === "percent"
      ? total * (appliedCoupon.value / 100)
      : Math.min(appliedCoupon.value, total)
    : 0;

  const pointsDiscount = appliedPoints?.euros ?? 0;

  const finalTotal = Math.max(
    0,
    total - couponDiscount - pointsDiscount + shipping,
  );

  const applyCoupon = () => {
    setCouponError("");
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    const found = MOCK_ADMIN_COUPONS.find(
      (c) => c.code === code && c.active && new Date(c.endsAt) >= new Date(),
    );

    if (!found) {
      setCouponError("Código no válido o caducado");
      return;
    }

    setAppliedCoupon({
      code: found.code,
      discountType: found.discountType,
      value: found.value,
      description: found.description,
    });
    setCouponInput("");
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  const applyPoints = (tier: (typeof POINTS_REDEMPTION_TABLE)[number]) => {
    if (tier.points > MOCK_POINTS_BALANCE) return;
    setAppliedPoints({ points: tier.points, euros: tier.euros });
    setShowPointsPanel(false);
  };

  const removePoints = () => setAppliedPoints(null);

  const handleCheckout = () => {
    localStorage.setItem(
      "tcgacademy_pending_checkout",
      JSON.stringify({
        appliedCoupon,
        couponDiscount,
        appliedPoints,
        pointsDiscount,
        finalTotal,
      }),
    );
    router.push("/finalizar-compra");
  };

  if (!count)
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-24 text-center">
        <ShoppingCart size={64} className="mx-auto mb-6 text-gray-200" />
        <h1 className="mb-2 text-2xl font-bold text-gray-700">
          Tu carrito está vacío
        </h1>
        <p className="mb-8 text-gray-500">
          Explora nuestro catálogo y encuentra tus cartas favoritas
        </p>
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-2 rounded-xl bg-[#1a3a5c] px-8 py-4 font-bold text-white transition hover:bg-[#15304d]"
        >
          Ir al catálogo <ArrowRight size={18} />
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 md:text-3xl">
        Carrito{" "}
        <span className="text-lg font-normal text-gray-400">
          ({count} {count === 1 ? "producto" : "productos"})
        </span>
      </h1>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Items */}
        <div className="space-y-3 lg:col-span-2">
          {items.map((item) => {
            const prod = PRODUCTS.find((p) => p.id === item.product_id);
            const productHref = prod
              ? `/${prod.game}/${prod.category}/${prod.slug}`
              : null;
            return (
              <div
                key={item.key}
                className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4"
              >
                {productHref ? (
                  <Link
                    href={productHref}
                    className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
                  >
                    <Image
                      src={item.image || "/placeholder-card.jpg"}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </Link>
                ) : (
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                    <Image
                      src={item.image || "/placeholder-card.jpg"}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="mb-1 line-clamp-2 text-sm leading-tight font-semibold text-gray-900">
                    {item.name}
                  </h3>
                  <p className="text-base font-bold text-[#1a3a5c]">
                    {item.price.toFixed(2)}€/ud
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <button
                    aria-label={`Eliminar ${item.name}`}
                    onClick={() => removeItem(item.key)}
                    className="flex min-h-[32px] min-w-[32px] items-center justify-center text-gray-300 transition hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="flex items-center overflow-hidden rounded-lg border border-gray-200">
                    <button
                      aria-label={`Reducir cantidad de ${item.name}`}
                      onClick={() => updateQty(item.key, item.quantity - 1)}
                      className="flex h-9 w-9 items-center justify-center transition hover:bg-gray-50"
                    >
                      <Minus size={12} />
                    </button>
                    <span
                      className="w-8 text-center text-sm font-bold"
                      aria-label={`Cantidad: ${item.quantity}`}
                    >
                      {item.quantity}
                    </span>
                    <button
                      aria-label={`Aumentar cantidad de ${item.name}`}
                      onClick={() => updateQty(item.key, item.quantity + 1)}
                      className="flex h-9 w-9 items-center justify-center transition hover:bg-gray-50"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {(item.price * item.quantity).toFixed(2)}€
                  </span>
                </div>
              </div>
            );
          })}
          <button
            aria-label="Vaciar carrito"
            onClick={clearCart}
            className="mt-2 flex min-h-[36px] items-center gap-1 text-sm text-gray-400 transition hover:text-red-400"
          >
            <Trash2 size={14} /> Vaciar carrito
          </button>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-36 rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-5 text-lg font-bold text-gray-900">
              Resumen del pedido
            </h2>

            {/* Subtotal + lines */}
            <div className="mb-5 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Subtotal ({count} productos)
                </span>
                <span className="font-semibold">{total.toFixed(2)}€</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1 font-medium text-green-600">
                    <Tag size={12} /> {appliedCoupon.code}
                    <button
                      onClick={removeCoupon}
                      className="ml-1 text-gray-300 hover:text-red-400"
                    >
                      <X size={11} />
                    </button>
                  </span>
                  <span className="font-semibold text-green-600">
                    -
                    {appliedCoupon.discountType === "percent"
                      ? `${appliedCoupon.value}% (${couponDiscount.toFixed(2)}€)`
                      : `${couponDiscount.toFixed(2)}€`}
                  </span>
                </div>
              )}
              {appliedPoints && (
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1 font-medium text-amber-600">
                    <Star size={12} /> {appliedPoints.points} puntos
                    <button
                      onClick={removePoints}
                      className="ml-1 text-gray-300 hover:text-red-400"
                    >
                      <X size={11} />
                    </button>
                  </span>
                  <span className="font-semibold text-amber-600">
                    -{appliedPoints.euros.toFixed(2)}€
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Envío</span>
                <span
                  className={
                    shipping === 0
                      ? "font-semibold text-green-600"
                      : "font-semibold"
                  }
                >
                  {shipping === 0 ? "Gratis" : `${shipping.toFixed(2)}€`}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-gray-400">
                  Te faltan{" "}
                  <strong>
                    {(SITE_CONFIG.shippingThreshold - total).toFixed(2)}€
                  </strong>{" "}
                  para envío gratis
                </p>
              )}
            </div>

            {/* Coupon input */}
            <div className="mb-4 border-t border-gray-100 pt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <Tag size={12} /> Código de descuento
              </p>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-3 py-2.5">
                  <div>
                    <p className="font-mono text-sm font-bold text-green-700">
                      {appliedCoupon.code}
                    </p>
                    <p className="mt-0.5 text-xs text-green-600">
                      {appliedCoupon.description}
                    </p>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="ml-2 flex min-h-[32px] min-w-[32px] items-center justify-center text-gray-400 transition hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag
                        size={14}
                        className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        placeholder="Ej: BIENVENIDA15"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value);
                          setCouponError("");
                        }}
                        onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                        className="h-10 w-full rounded-lg border border-gray-200 pr-3 pl-8 text-sm uppercase focus:border-[#1a3a5c] focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={applyCoupon}
                      className="h-10 rounded-lg bg-gray-100 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                    >
                      Aplicar
                    </button>
                  </div>
                  {couponError && (
                    <p className="mt-1.5 text-xs font-medium text-red-500">
                      {couponError}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Points redemption */}
            <div className="mb-5 border-t border-gray-100 pt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <Star size={12} className="text-amber-500" /> Canjear puntos
                <span className="ml-auto font-bold text-amber-600">
                  {MOCK_POINTS_BALANCE} pts disponibles
                </span>
              </p>
              {appliedPoints ? (
                <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-sm font-bold text-amber-700">
                    {appliedPoints.points} pts ={" "}
                    {appliedPoints.euros.toFixed(2)}€
                  </p>
                  <button
                    onClick={removePoints}
                    className="flex min-h-[32px] min-w-[32px] items-center justify-center text-gray-400 transition hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setShowPointsPanel(!showPointsPanel)}
                    className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 px-3 text-sm text-gray-700 transition hover:border-[#1a3a5c]"
                  >
                    <span>Seleccionar cantidad...</span>
                    <ChevronDown
                      size={14}
                      className={`transition ${showPointsPanel ? "rotate-180" : ""}`}
                    />
                  </button>
                  {showPointsPanel && (
                    <div className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                      {POINTS_REDEMPTION_TABLE.map((tier) => {
                        const canUse = tier.points <= MOCK_POINTS_BALANCE;
                        return (
                          <button
                            key={tier.points}
                            onClick={() => canUse && applyPoints(tier)}
                            disabled={!canUse}
                            className={`flex w-full items-center justify-between px-3 py-2.5 text-sm transition ${canUse ? "text-gray-800 hover:bg-amber-50" : "cursor-not-allowed text-gray-500 opacity-40"}`}
                          >
                            <span className="flex items-center gap-1.5">
                              <Star size={12} className="text-amber-400" />
                              {tier.points} puntos
                            </span>
                            <span className="font-bold text-amber-600">
                              {tier.euros.toFixed(2)}€
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="mb-5 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-[#1a3a5c]">
                  {finalTotal.toFixed(2)}€
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400">IVA incluido</p>
            </div>

            <button
              onClick={handleCheckout}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#1a3a5c] py-4 text-base font-bold text-white transition hover:bg-[#15304d]"
            >
              Finalizar compra <ArrowRight size={18} />
            </button>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
              {["Visa", "Mastercard", "PayPal", "Bizum"].map((p) => (
                <span key={p} className="font-medium">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
