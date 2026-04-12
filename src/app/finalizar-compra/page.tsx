"use client";
import { useState, useEffect } from "react";
import { SITE_CONFIG } from "@/config/siteConfig";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  awardPurchasePoints,
  deductPoints,
  loadPoints,
  buildRedemptionTiers,
  POINTS_PER_EURO,
  POINTS_MAX_DISCOUNT_PCT,
} from "@/services/pointsService";
import {
  Shield,
  Truck,
  CheckCircle,
  CreditCard,
  ArrowLeft,
  Tag,
  Star,
  Store,
  Trophy,
  ChevronDown,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const TIENDAS = [
  { id: "calpe", name: "TCG Academy Calpe", address: "Calpe, Alicante" },
  { id: "bejar", name: "TCG Academy Béjar", address: "Béjar, Salamanca" },
  { id: "madrid", name: "TCG Academy Madrid", address: "Madrid" },
  { id: "barcelona", name: "TCG Academy Barcelona", address: "Barcelona" },
];

type Step = "datos" | "envio" | "pago" | "confirmado";

interface PendingCheckout {
  appliedCoupon: {
    code: string;
    discountType: "percent" | "fixed" | "shipping";
    value: number;
    description: string;
  } | null;
  couponDiscount: number;
  freeShippingCoupon?: boolean;
}

export default function CheckoutPage() {
  const { items, total, count, clearCart } = useCart();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("datos");
  const [pending] = useState<PendingCheckout | null>(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem("tcgacademy_pending_checkout")
          : null;
      return raw ? (JSON.parse(raw) as PendingCheckout) : null;
    } catch {
      return null;
    }
  });
  const [orderId, setOrderId] = useState("");
  const [appliedPoints, setAppliedPoints] = useState<{ points: number; euros: number } | null>(null);
  const [showPointsPanel, setShowPointsPanel] = useState(false);
  const [userPoints, setUserPoints] = useState(0);

  useEffect(() => {
    if (user?.role === "cliente") setUserPoints(loadPoints(user.id));
  }, [user]);

  const [form, setForm] = useState({
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
    direccion: "",
    ciudad: "",
    cp: "",
    provincia: "",
    pais: "ES",
    envio: "estandar",
    pago: "tarjeta",
    tiendaRecogida: "",
  });

  const isStorePickup = form.envio === "tienda";
  const hasFreeShippingCoupon = pending?.freeShippingCoupon === true;

  const shipping =
    isStorePickup || hasFreeShippingCoupon
      ? 0
      : total >= SITE_CONFIG.shippingThreshold
        ? 0
        : 3.99;
  const couponDiscount = pending?.couponDiscount ?? 0;
  const pointsDiscount = appliedPoints?.euros ?? 0;
  const maxPointsDiscount = Math.floor(total * POINTS_MAX_DISCOUNT_PCT * 100) / 100;
  const pointsTiers = buildRedemptionTiers(userPoints).filter((t) => t.euros <= maxPointsDiscount);
  const finalTotal = Math.max(0, total - couponDiscount - pointsDiscount + shipping);
  // Points are awarded on products only — shipping excluded
  const pointsBase = Math.max(0, total - couponDiscount - pointsDiscount);

  const handleOrder = () => {
    const id = `TCG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Date.now()).slice(-4)}`;
    setOrderId(id);

    const order = {
      id,
      date: new Date().toISOString(),
      status: "procesando",
      items: items.map((i) => ({
        id: i.key,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        image: i.image,
      })),
      subtotal: total,
      coupon: pending?.appliedCoupon ?? null,
      couponDiscount,
      points: appliedPoints,
      pointsDiscount,
      shipping,
      total: finalTotal,
      shippingAddress: {
        nombre: form.nombre,
        apellidos: form.apellidos,
        email: form.email,
        telefono: form.telefono,
        direccion: form.direccion,
        ciudad: form.ciudad,
        cp: form.cp,
        provincia: form.provincia,
        pais: form.pais,
      },
      envio: form.envio,
      tiendaRecogida: form.tiendaRecogida || null,
      pago: form.pago,
    };

    try {
      const existing = JSON.parse(
        localStorage.getItem("tcgacademy_orders") ?? "[]",
      );
      existing.unshift(order);
      localStorage.setItem("tcgacademy_orders", JSON.stringify(existing));
      localStorage.removeItem("tcgacademy_pending_checkout");
    } catch {}

    // Award purchase points and propagate to referral chain (cliente only)
    if (user?.role === "cliente") {
      if (appliedPoints?.points) {
        deductPoints(user.id, appliedPoints.points);
      }
      awardPurchasePoints(user.id, pointsBase);
    }

    clearCart();
    setStep("confirmado");
  };

  if (!count && step !== "confirmado")
    return (
      <div className="mx-auto max-w-[600px] px-4 py-12 sm:px-6 sm:py-24 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-700">
          Tu carrito esta vacio
        </h1>
        <Link
          href="/catalogo"
          className="font-semibold text-[#2563eb] hover:underline"
        >
          Volver al catalogo
        </Link>
      </div>
    );

  if (step === "confirmado")
    return (
      <div className="mx-auto max-w-[600px] px-4 py-12 sm:px-6 sm:py-24 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          Pedido confirmado
        </h1>
        <p className="mb-2 text-gray-600">
          Gracias por tu compra. Te hemos enviado un email de confirmacion.
        </p>
        <p className="mb-4 text-sm text-gray-500">
          Numero de pedido:{" "}
          <span className="font-bold text-gray-800">{orderId}</span>
        </p>
        {user?.role === "cliente" && finalTotal > 0 && (
          <div className="mx-auto mb-6 flex max-w-xs items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <Trophy size={16} className="flex-shrink-0 text-amber-500" />
            <span>
              Has ganado{" "}
              <strong>+{Math.floor(pointsBase * POINTS_PER_EURO)} puntos</strong>{" "}
              por esta compra
            </span>
          </div>
        )}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/cuenta/pedidos"
            className="inline-block rounded-xl bg-[#2563eb] px-8 py-4 font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            Ver mis pedidos
          </Link>
          <Link
            href="/"
            className="inline-block rounded-xl border-2 border-gray-200 px-8 py-4 font-bold text-gray-700 transition hover:bg-gray-50"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/carrito"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#2563eb]"
      >
        <ArrowLeft size={14} /> Volver al carrito
      </Link>

      {/* Steps */}
      <div className="mb-10 flex items-center gap-2">
        {(["datos", "envio", "pago"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition ${step === s ? "bg-[#2563eb] text-white" : ["datos", "envio", "pago"].indexOf(step) > i ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}
            >
              {["datos", "envio", "pago"].indexOf(step) > i ? "✓" : i + 1}
            </div>
            <span
              className={`text-sm font-medium capitalize ${step === s ? "text-[#2563eb]" : "text-gray-400"}`}
            >
              {s}
            </span>
            {i < 2 && <div className="mx-1 h-0.5 w-8 bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-2">
          {step === "datos" && (
            <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-bold text-gray-900">
                Datos personales
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["nombre", "Nombre *", "text", true],
                    ["apellidos", "Apellidos *", "text", true],
                    ["email", "Email *", "email", true],
                    ["telefono", "Telefono", "tel", false],
                  ] as [keyof typeof form, string, string, boolean][]
                ).map(([key, label, type, req]) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      {label}
                    </label>
                    <input
                      required={req}
                      type={type}
                      value={form[key]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <h2 className="pt-4 text-lg font-bold text-gray-900">
                Direccion de envio
              </h2>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Direccion *
                </label>
                <input
                  required
                  value={form.direccion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, direccion: e.target.value }))
                  }
                  placeholder="Calle, numero, piso..."
                  className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    CP *
                  </label>
                  <input
                    required
                    value={form.cp}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cp: e.target.value }))
                    }
                    placeholder="28001"
                    className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Ciudad *
                  </label>
                  <input
                    required
                    value={form.ciudad}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ciudad: e.target.value }))
                    }
                    className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Provincia
                  </label>
                  <input
                    value={form.provincia}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, provincia: e.target.value }))
                    }
                    className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => setStep("envio")}
                className="w-full rounded-xl bg-[#2563eb] py-4 font-bold text-white transition hover:bg-[#1d4ed8]"
              >
                Continuar
              </button>
            </div>
          )}

          {step === "envio" && (
            <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                <Truck size={20} /> Metodo de envio
              </h2>
              {[
                {
                  id: "estandar",
                  label: "Envío estándar con GLS",
                  sub: "Entrega en menos de 24h",
                  price:
                    total >= SITE_CONFIG.shippingThreshold ? "Gratis" : "3,99€",
                },
                {
                  id: "express",
                  label: "Envío express con GLS",
                  sub: "Mismo día en península (pedido antes de las 12h)",
                  price: "6,99€",
                },
                {
                  id: "tienda",
                  label: "Recogida en tienda",
                  sub: "Gratis — disponible en 2h",
                  price: "Gratis",
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${form.envio === opt.id ? "border-[#2563eb] bg-blue-50/40" : "border-gray-200 hover:border-gray-300"}`}
                >
                  <input
                    type="radio"
                    name="envio"
                    value={opt.id}
                    checked={form.envio === opt.id}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        envio: e.target.value,
                        pago:
                          e.target.value === "tienda"
                            ? "tienda"
                            : f.pago === "tienda"
                              ? "tarjeta"
                              : f.pago,
                      }))
                    }
                    className="accent-[#2563eb]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      {opt.id === "tienda" && (
                        <Store size={14} className="text-[#2563eb]" />
                      )}
                      {opt.label}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {opt.sub}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {opt.price}
                  </span>
                </label>
              ))}

              {/* Store selector — only when pickup is chosen */}
              {isStorePickup && (
                <div className="space-y-2 rounded-xl border-2 border-[#2563eb]/20 bg-blue-50/30 p-4">
                  <p className="mb-3 text-sm font-semibold text-gray-800">
                    Selecciona la tienda de recogida:
                  </p>
                  {TIENDAS.map((t) => (
                    <label
                      key={t.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition ${form.tiendaRecogida === t.id ? "border-[#2563eb] bg-white" : "border-gray-200 bg-white hover:border-gray-300"}`}
                    >
                      <input
                        type="radio"
                        name="tiendaRecogida"
                        value={t.id}
                        checked={form.tiendaRecogida === t.id}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            tiendaRecogida: e.target.value,
                          }))
                        }
                        className="accent-[#2563eb]"
                      />
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {t.name}
                        </div>
                        <div className="text-xs text-gray-500">{t.address}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("datos")}
                  className="flex-1 rounded-xl border-2 border-gray-200 py-3.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                >
                  Atras
                </button>
                <button
                  onClick={() => setStep("pago")}
                  disabled={isStorePickup && !form.tiendaRecogida}
                  className="flex-1 rounded-xl bg-[#2563eb] py-3.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === "pago" && (
            <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                <CreditCard size={20} /> Metodo de pago
              </h2>
              {[
                ...(isStorePickup
                  ? [
                      {
                        id: "tienda",
                        label: "Pago en tienda",
                        sub: "Paga al recoger tu pedido en la tienda",
                        logos: null,
                      },
                    ]
                  : []),
                ...(!isStorePickup
                  ? [
                      {
                        id: "tarjeta",
                        label: "Tarjeta de crédito/débito",
                        sub: "Visa, Mastercard, Amex",
                        logos: [
                          { src: "/images/payment/visa.svg", alt: "Visa", w: 36, h: 12 },
                          { src: "/images/payment/mastercard.svg", alt: "Mastercard", w: 28, h: 18 },
                        ],
                      },
                      {
                        id: "paypal",
                        label: "PayPal",
                        sub: "Pago rápido con tu cuenta PayPal",
                        logos: [
                          { src: "/images/payment/paypal.svg", alt: "PayPal", w: 56, h: 15 },
                        ],
                      },
                      {
                        id: "bizum",
                        label: "Bizum",
                        sub: "Solo para clientes de bancos españoles",
                        logos: [
                          { src: "/images/payment/bizum.svg", alt: "Bizum", w: 48, h: 14 },
                        ],
                      },
                      {
                        id: "transferencia",
                        label: "Transferencia SEPA",
                        sub: "Plazo adicional de 1–2 días hábiles",
                        logos: [
                          { src: "/images/payment/sepa.svg", alt: "SEPA Credit Transfer", w: 52, h: 18 },
                        ],
                      },
                    ]
                  : []),
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${form.pago === opt.id ? "border-[#2563eb] bg-blue-50/40" : "border-gray-200 hover:border-gray-300"}`}
                >
                  <input
                    type="radio"
                    name="pago"
                    value={opt.id}
                    checked={form.pago === opt.id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, pago: e.target.value }))
                    }
                    className="accent-[#2563eb]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      {opt.id === "tienda" && (
                        <Store size={14} className="text-[#2563eb]" />
                      )}
                      {opt.label}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {opt.sub}
                    </div>
                  </div>
                  {opt.logos && (
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {opt.logos.map((logo) => (
                        <span key={logo.alt} className="flex items-center justify-center rounded border border-gray-200 bg-white px-1.5 py-0.5">
                          <Image src={logo.src} alt={logo.alt} width={logo.w} height={logo.h} className="object-contain" />
                        </span>
                      ))}
                    </div>
                  )}
                </label>
              ))}
              {/* Points redemption — only for clientes */}
              {user?.role === "cliente" && userPoints > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-amber-700">
                      <Star size={14} className="text-amber-500" />
                      Usar mis puntos
                    </p>
                    <span className="text-xs font-semibold text-amber-600">
                      {userPoints.toLocaleString("es-ES")} pts disponibles
                    </span>
                  </div>
                  <p className="mb-3 text-xs text-amber-600">
                    Máximo {(POINTS_MAX_DISCOUNT_PCT * 100).toFixed(0)}% del subtotal — hasta{" "}
                    <strong>{maxPointsDiscount.toFixed(2)}€</strong> de descuento en esta compra.
                  </p>
                  {appliedPoints ? (
                    <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-white px-3 py-2.5">
                      <p className="text-sm font-bold text-amber-700">
                        <Star size={12} className="mr-1 inline text-amber-400" />
                        {appliedPoints.points.toLocaleString("es-ES")} pts = <strong>-{appliedPoints.euros.toFixed(2)}€</strong>
                      </p>
                      <button
                        onClick={() => setAppliedPoints(null)}
                        aria-label="Quitar puntos"
                        className="flex min-h-[28px] min-w-[28px] items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : pointsTiers.length === 0 ? (
                    <p className="text-xs text-amber-600">
                      Con tu saldo actual no puedes aplicar puntos a este pedido.
                    </p>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={() => setShowPointsPanel(!showPointsPanel)}
                        className="flex h-10 w-full items-center justify-between rounded-lg border border-amber-300 bg-white px-3 text-sm text-gray-700 transition hover:border-amber-400"
                      >
                        <span className="text-amber-700">Seleccionar cantidad a descontar...</span>
                        <ChevronDown size={14} className={`text-amber-500 transition ${showPointsPanel ? "rotate-180" : ""}`} />
                      </button>
                      {showPointsPanel && (
                        <div className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg">
                          {pointsTiers.map((tier) => (
                            <button
                              key={tier.points}
                              onClick={() => { setAppliedPoints({ points: tier.points, euros: tier.euros }); setShowPointsPanel(false); }}
                              className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-gray-800 transition hover:bg-amber-50"
                            >
                              <span className="flex items-center gap-1.5">
                                <Star size={12} className="text-amber-400" />
                                {tier.points.toLocaleString("es-ES")} puntos
                              </span>
                              <span className="font-bold text-amber-600">-{tier.euros.toFixed(2)}€</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
                <Shield size={14} className="flex-shrink-0 text-green-500" />
                Pago 100% seguro con cifrado SSL. Tus datos bancarios nunca se
                almacenan en nuestros servidores.
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("envio")}
                  className="flex-1 rounded-xl border-2 border-gray-200 py-3.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                >
                  Atras
                </button>
                <button
                  onClick={handleOrder}
                  className="flex-1 rounded-xl bg-[#2563eb] py-3.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
                >
                  Confirmar pedido — {finalTotal.toFixed(2)}€
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="sticky top-36 h-fit rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 font-bold text-gray-900">Tu pedido ({count})</h3>
          <div className="mb-4 max-h-60 space-y-3 overflow-y-auto">
            {items.map((item) => (
              <div key={item.key} className="flex items-center gap-3">
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
                  <Image
                    src={item.image || "/placeholder-card.jpg"}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-xs font-semibold text-gray-800">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500">x{item.quantity}</p>
                </div>
                <span className="flex-shrink-0 text-sm font-bold text-gray-900">
                  {(item.price * item.quantity).toFixed(2)}€
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">{total.toFixed(2)}€</span>
            </div>
            {pending?.appliedCoupon && pending.appliedCoupon.discountType !== "shipping" && (
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 font-medium text-green-600">
                  <Tag size={12} /> {pending.appliedCoupon.code}
                </span>
                <span className="font-semibold text-green-600">
                  -{couponDiscount.toFixed(2)}€
                </span>
              </div>
            )}
            {appliedPoints && (
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 font-medium text-amber-600">
                  <Star size={12} /> {appliedPoints.points.toLocaleString("es-ES")} puntos
                </span>
                <span className="font-semibold text-amber-600">
                  -{pointsDiscount.toFixed(2)}€
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Envío</span>
              <span className="font-semibold text-green-600">
                {shipping === 0
                  ? hasFreeShippingCoupon
                    ? `Gratis · ${pending!.appliedCoupon!.code}`
                    : "Gratis"
                  : `${shipping.toFixed(2)}€`}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold">
              <span>Total</span>
              <span className="text-[#2563eb]">{finalTotal.toFixed(2)}€</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
