"use client";
import { useState } from "react";
import { SITE_CONFIG } from "@/config/siteConfig";
import { useCart } from "@/context/CartContext";
import {
  Shield,
  Truck,
  CheckCircle,
  CreditCard,
  ArrowLeft,
  Tag,
  Star,
  Store,
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
    discountType: "percent" | "fixed";
    value: number;
    description: string;
  } | null;
  couponDiscount: number;
  appliedPoints: { points: number; euros: number } | null;
  pointsDiscount: number;
  finalTotal: number;
}

export default function CheckoutPage() {
  const { items, total, count, clearCart } = useCart();
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

  const shipping = isStorePickup
    ? 0
    : total >= SITE_CONFIG.shippingThreshold
      ? 0
      : 3.99;
  const couponDiscount = pending?.couponDiscount ?? 0;
  const pointsDiscount = pending?.pointsDiscount ?? 0;
  const finalTotal = Math.max(
    0,
    total - couponDiscount - pointsDiscount + shipping,
  );

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
      points: pending?.appliedPoints ?? null,
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

    clearCart();
    setStep("confirmado");
  };

  if (!count && step !== "confirmado")
    return (
      <div className="mx-auto max-w-[600px] px-6 py-24 text-center">
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
      <div className="mx-auto max-w-[600px] px-6 py-24 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          Pedido confirmado
        </h1>
        <p className="mb-2 text-gray-600">
          Gracias por tu compra. Te hemos enviado un email de confirmacion.
        </p>
        <p className="mb-8 text-sm text-gray-500">
          Numero de pedido:{" "}
          <span className="font-bold text-gray-800">{orderId}</span>
        </p>
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
    <div className="mx-auto max-w-[1400px] px-6 py-8">
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
                      },
                    ]
                  : []),
                ...(!isStorePickup
                  ? [
                      {
                        id: "tarjeta",
                        label: "Tarjeta de credito/debito",
                        sub: "Visa, Mastercard, Amex",
                      },
                      {
                        id: "paypal",
                        label: "PayPal",
                        sub: "Pago rapido con tu cuenta PayPal",
                      },
                      {
                        id: "bizum",
                        label: "Bizum",
                        sub: "Solo para clientes de bancos espanoles",
                      },
                      {
                        id: "transferencia",
                        label: "Transferencia bancaria",
                        sub: "Plazo adicional de 1-2 dias",
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
                  <div>
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
                </label>
              ))}
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
            {pending?.appliedCoupon && (
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 font-medium text-green-600">
                  <Tag size={12} /> {pending.appliedCoupon.code}
                </span>
                <span className="font-semibold text-green-600">
                  -{couponDiscount.toFixed(2)}€
                </span>
              </div>
            )}
            {pending?.appliedPoints && (
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 font-medium text-amber-600">
                  <Star size={12} /> {pending.appliedPoints.points} puntos
                </span>
                <span className="font-semibold text-amber-600">
                  -{pointsDiscount.toFixed(2)}€
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Envio</span>
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
