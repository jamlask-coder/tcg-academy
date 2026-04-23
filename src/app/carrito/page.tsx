"use client";
import { useCart } from "@/context/CartContext";
import { SITE_CONFIG } from "@/config/siteConfig";
import { calculateShipping } from "@/lib/priceVerification";
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
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getMergedById, getProductUrl } from "@/lib/productStore";
import { validateCoupon, calcCouponDiscount, type AppliedCoupon } from "@/services/couponService";
import { useAuth } from "@/context/AuthContext";
import { ensureReferralCode } from "@/services/pointsService";


export default function CartPage() {
  const router = useRouter();
  const { items, count, total, removeItem, updateQty, clearCart, getLimitForItem } = useCart();
  const { user } = useAuth();

  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(
    null,
  );
  // Mapa key → mensaje efímero ("sólo quedan 3 uds") que aparece si el
  // usuario intenta subir cantidad por encima del tope. Se autolimpia a 3s.
  const [limitNotices, setLimitNotices] = useState<Record<string, string>>({});
  // Mapa key → borrador del input de cantidad en edición (commit on blur).
  // Patrón anti-feedback-loop (ver memoria feedback_controlled_input_loop).
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});

  const flashNotice = (key: string, msg: string) => {
    setLimitNotices((m) => ({ ...m, [key]: msg }));
    setTimeout(() => {
      setLimitNotices((m) => {
        const { [key]: _removed, ...rest } = m;
        void _removed;
        return rest;
      });
    }, 3000);
  };

  const handleQtyStep = (key: string, nextQty: number) => {
    const result = updateQty(key, nextQty);
    if (result.capped && result.reason) flashNotice(key, result.reason);
  };

  const handleQtyCommit = (key: string, raw: string) => {
    // Limpia el draft siempre; el valor real lo determina updateQty.
    setQtyDrafts((d) => {
      const { [key]: _removed, ...rest } = d;
      void _removed;
      return rest;
    });
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    const result = updateQty(key, Math.max(0, n));
    if (result.capped && result.reason) flashNotice(key, result.reason);
  };

  useEffect(() => {
    if (user?.role === "cliente") {
      ensureReferralCode(user.id);
    }
  }, [user]);

  const shipping = calculateShipping("estandar", total, {
    freeShippingCoupon: appliedCoupon?.discountType === "shipping",
  });
  const _hasFreeShipping = shipping === 0;

  const couponDiscount = appliedCoupon
    ? calcCouponDiscount(appliedCoupon, total)
    : 0;

  const finalTotal = Math.max(0, total - couponDiscount + shipping);

  const applyCoupon = () => {
    setCouponError("");
    const code = couponInput.trim();
    if (!code) return;

    const result = validateCoupon(code, user?.email);
    if (!result.valid || !result.coupon) {
      setCouponError(result.error ?? "Código no válido o caducado");
      return;
    }

    setAppliedCoupon(result.coupon);
    setCouponInput("");
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  const handleCheckout = () => {
    localStorage.setItem(
      "tcgacademy_pending_checkout",
      JSON.stringify({
        appliedCoupon,
        couponDiscount,
        freeShippingCoupon: appliedCoupon?.discountType === "shipping",
      }),
    );
    router.push("/finalizar-compra");
  };

  if (!count)
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 sm:py-24 text-center">
        <ShoppingCart size={64} className="mx-auto mb-6 text-gray-200" />
        <h1 className="mb-2 text-2xl font-bold text-gray-700">
          Tu carrito está vacío
        </h1>
        <p className="mb-8 text-gray-500">
          Explora nuestro catálogo y encuentra tus cartas favoritas
        </p>
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-8 py-4 font-bold text-white transition hover:bg-[#1d4ed8]"
        >
          Ir al catálogo <ArrowRight size={18} />
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
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
            // SSOT: leer siempre del merged (PRODUCTS + overrides admin) para
            // que el slug/juego/categoría/precio/linked refleje la edición
            // más reciente. Incidente 2026-04-22: se mostraba PRODUCTS estático
            // → nombre/imagen/enlace obsoletos tras editar.
            const prod = getMergedById(item.product_id);
            // getProductUrl cubre tanto rutas estáticas SEO como productos
            // creados por admin (/producto/[slug]).
            const productHref = prod ? getProductUrl(prod) : null;
            // Ahorro vs comprar los sobres sueltos (solo cajas con linkedPackId)
            const packSavings = (() => {
              if (!prod || prod.category !== "booster-box" || !prod.packsPerBox) return null;
              const packId = prod.linkedPackId;
              if (!packId) return null;
              const pack = getMergedById(packId);
              if (!pack) return null;
              const packTotal = pack.price * prod.packsPerBox;
              const saved = packTotal - prod.price;
              if (saved <= 0) return null;
              const pct = Math.round((saved / packTotal) * 100);
              return { saved, pct };
            })();
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
                  {productHref ? (
                    <Link
                      href={productHref}
                      className="mb-1 block line-clamp-2 text-sm leading-tight font-semibold text-gray-900 transition hover:text-[#2563eb]"
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <h3 className="mb-1 line-clamp-2 text-sm leading-tight font-semibold text-gray-900">
                      {item.name}
                    </h3>
                  )}
                  <p className="text-base font-bold text-[#2563eb]">
                    {item.price.toFixed(2)}€/ud
                  </p>
                  {packSavings && (
                    <p className="mt-1 text-xs font-semibold text-green-600">
                      Ahorras {packSavings.saved.toFixed(2)}€ ({packSavings.pct}%) vs comprar los sobres sueltos
                    </p>
                  )}
                  {limitNotices[item.key] && (
                    <p className="mt-1 text-xs font-medium text-amber-600">
                      {limitNotices[item.key]}
                    </p>
                  )}
                </div>
                {(() => {
                  const limit = getLimitForItem(item.product_id);
                  const atCap = item.quantity >= limit.max;
                  const draft = qtyDrafts[item.key];
                  return (
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
                          onClick={() => handleQtyStep(item.key, item.quantity - 1)}
                          className="flex h-9 w-9 items-center justify-center transition hover:bg-gray-50"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          aria-label={`Cantidad de ${item.name}`}
                          value={draft !== undefined ? draft : String(item.quantity)}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9]/g, "");
                            setQtyDrafts((d) => ({ ...d, [item.key]: v }));
                          }}
                          onBlur={(e) => handleQtyCommit(item.key, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            if (e.key === "Escape") {
                              setQtyDrafts((d) => {
                                const { [item.key]: _r, ...rest } = d;
                                void _r;
                                return rest;
                              });
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="w-12 text-center text-sm font-bold outline-none focus:bg-blue-50"
                        />
                        <button
                          aria-label={`Aumentar cantidad de ${item.name}`}
                          disabled={atCap}
                          onClick={() => handleQtyStep(item.key, item.quantity + 1)}
                          className="flex h-9 w-9 items-center justify-center transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {(item.price * item.quantity).toFixed(2)}€
                      </span>
                    </div>
                  );
                })()}
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
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Envío</span>
                <span className="font-semibold text-green-600">
                  {shipping === 0
                    ? appliedCoupon?.discountType === "shipping"
                      ? `Gratis · ${appliedCoupon.code}`
                      : "Gratis"
                    : `${shipping.toFixed(2)}€`}
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
                        className="h-10 w-full rounded-lg border border-gray-200 pr-3 pl-8 text-sm uppercase focus:border-[#2563eb] focus:outline-none"
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


            {/* Total */}
            <div className="mb-5 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-[#2563eb]">
                  {finalTotal.toFixed(2)}€
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400">IVA incluido</p>
            </div>

            <button
              onClick={handleCheckout}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] py-4 text-base font-bold text-white transition hover:bg-[#1d4ed8]"
            >
              Finalizar compra <ArrowRight size={18} />
            </button>

            <div className="mt-4 flex items-center justify-center gap-2">
              {[
                { src: "/images/payment/visa.svg", alt: "Visa", w: 38, h: 13 },
                { src: "/images/payment/mastercard.svg", alt: "Mastercard", w: 30, h: 19 },
                { src: "/images/payment/paypal.svg", alt: "PayPal", w: 54, h: 14 },
                { src: "/images/payment/bizum.svg", alt: "Bizum", w: 48, h: 14 },
              ].map(({ src, alt, w, h }) => (
                <span key={alt} className="flex items-center justify-center rounded border border-gray-200 bg-white px-1.5 py-1">
                  <Image src={src} alt={alt} width={w} height={h} className="object-contain" />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
