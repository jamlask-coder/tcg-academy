"use client"
import { useState } from "react"
import { useCart } from "@/context/CartContext"
import { Shield, Truck, CheckCircle, CreditCard, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

type Step = "datos" | "envio" | "pago" | "confirmado"

export default function CheckoutPage() {
  const { items, total, count, clearCart } = useCart()
  const [step, setStep] = useState<Step>("datos")
  const [form, setForm] = useState({
    nombre: "", apellidos: "", email: "", telefono: "",
    direccion: "", ciudad: "", cp: "", provincia: "", pais: "ES",
    envio: "estandar", pago: "tarjeta",
  })

  const shipping = total >= 149 ? 0 : 3.99
  const finalTotal = total + shipping

  const handleOrder = async () => {
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ form, items, total: finalTotal }),
    }).catch(() => {})
    clearCart()
    setStep("confirmado")
  }

  if (!count && step !== "confirmado") return (
    <div className="max-w-[600px] mx-auto px-6 py-24 text-center">
      <h1 className="text-2xl font-bold text-gray-700 mb-4">Tu carrito esta vacio</h1>
      <Link href="/catalogo" className="text-[#1a3a5c] hover:underline font-semibold">Volver al catalogo</Link>
    </div>
  )

  if (step === "confirmado") return (
    <div className="max-w-[600px] mx-auto px-6 py-24 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={40} className="text-green-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Pedido confirmado</h1>
      <p className="text-gray-600 mb-2">Gracias por tu compra. Te hemos enviado un email de confirmacion.</p>
      <p className="text-sm text-gray-500 mb-8">Numero de pedido: <span className="font-bold text-gray-800">TCG-{Date.now().toString().slice(-6)}</span></p>
      <Link href="/" className="bg-[#1a3a5c] text-white font-bold px-8 py-4 rounded-xl inline-block hover:bg-[#15304d] transition">
        Volver al inicio
      </Link>
    </div>
  )

  return (
    <div className="max-w-[1180px] mx-auto px-6 py-8">
      <Link href="/carrito" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1a3a5c] transition mb-8">
        <ArrowLeft size={14} /> Volver al carrito
      </Link>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-10">
        {(["datos", "envio", "pago"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${step === s ? "bg-[#1a3a5c] text-white" : (["datos", "envio", "pago"].indexOf(step) > i ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500")}`}>
              {["datos", "envio", "pago"].indexOf(step) > i ? "✓" : i + 1}
            </div>
            <span className={`text-sm font-medium capitalize ${step === s ? "text-[#1a3a5c]" : "text-gray-400"}`}>{s}</span>
            {i < 2 && <div className="w-8 h-0.5 bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          {step === "datos" && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Datos personales</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {([["nombre", "Nombre *", "text", true], ["apellidos", "Apellidos *", "text", true], ["email", "Email *", "email", true], ["telefono", "Telefono", "tel", false]] as [keyof typeof form, string, string, boolean][]).map(([key, label, type, req]) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                    <input required={req} type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition" />
                  </div>
                ))}
              </div>
              <h2 className="font-bold text-gray-900 text-lg pt-4">Direccion de envio</h2>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Direccion *</label>
                <input required value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
                  placeholder="Calle, numero, piso..." className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition" />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">CP *</label>
                  <input required value={form.cp} onChange={e => setForm(f => ({ ...f, cp: e.target.value }))}
                    placeholder="28001" className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ciudad *</label>
                  <input required value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))}
                    className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Provincia</label>
                  <input value={form.provincia} onChange={e => setForm(f => ({ ...f, provincia: e.target.value }))}
                    className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition" />
                </div>
              </div>
              <button onClick={() => setStep("envio")}
                className="w-full bg-[#1a3a5c] text-white font-bold py-4 rounded-xl hover:bg-[#15304d] transition">
                Continuar
              </button>
            </div>
          )}

          {step === "envio" && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
              <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2"><Truck size={20} /> Metodo de envio</h2>
              {[
                { id: "estandar", label: "Envio estandar", sub: "3-5 dias habiles", price: shipping === 0 ? "Gratis" : "3,99€" },
                { id: "express", label: "Envio express", sub: "24-48h", price: "6,99€" },
                { id: "tienda", label: "Recogida en tienda", sub: "Gratis — disponible en 2h", price: "Gratis" },
              ].map(opt => (
                <label key={opt.id} className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${form.envio === opt.id ? "border-[#1a3a5c] bg-blue-50/40" : "border-gray-200 hover:border-gray-300"}`}>
                  <input type="radio" name="envio" value={opt.id} checked={form.envio === opt.id} onChange={e => setForm(f => ({ ...f, envio: e.target.value }))} className="accent-[#1a3a5c]" />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.sub}</div>
                  </div>
                  <span className="font-bold text-gray-900 text-sm">{opt.price}</span>
                </label>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep("datos")} className="flex-1 border-2 border-gray-200 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition text-sm">
                  Atras
                </button>
                <button onClick={() => setStep("pago")} className="flex-1 bg-[#1a3a5c] text-white font-bold py-3.5 rounded-xl hover:bg-[#15304d] transition text-sm">
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === "pago" && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
              <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2"><CreditCard size={20} /> Metodo de pago</h2>
              {[
                { id: "tarjeta", label: "Tarjeta de credito/debito", sub: "Visa, Mastercard, Amex" },
                { id: "paypal", label: "PayPal", sub: "Pago rapido con tu cuenta PayPal" },
                { id: "bizum", label: "Bizum", sub: "Solo para clientes de bancos espanoles" },
                { id: "transferencia", label: "Transferencia bancaria", sub: "Plazo adicional de 1-2 dias" },
              ].map(opt => (
                <label key={opt.id} className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${form.pago === opt.id ? "border-[#1a3a5c] bg-blue-50/40" : "border-gray-200 hover:border-gray-300"}`}>
                  <input type="radio" name="pago" value={opt.id} checked={form.pago === opt.id} onChange={e => setForm(f => ({ ...f, pago: e.target.value }))} className="accent-[#1a3a5c]" />
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.sub}</div>
                  </div>
                </label>
              ))}
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                <Shield size={14} className="text-green-500 flex-shrink-0" />
                Pago 100% seguro con cifrado SSL. Tus datos bancarios nunca se almacenan en nuestros servidores.
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep("envio")} className="flex-1 border-2 border-gray-200 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition text-sm">
                  Atras
                </button>
                <button onClick={handleOrder} className="flex-1 bg-[#1a3a5c] text-white font-bold py-3.5 rounded-xl hover:bg-[#15304d] transition text-sm">
                  Confirmar pedido — {finalTotal.toFixed(2)}€
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 h-fit sticky top-36">
          <h3 className="font-bold text-gray-900 mb-4">Tu pedido ({count})</h3>
          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
            {items.map(item => (
              <div key={item.key} className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                  <Image src={item.image || "/placeholder-card.jpg"} alt={item.name} fill className="object-cover" sizes="48px" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 line-clamp-1">{item.name}</p>
                  <p className="text-xs text-gray-500">x{item.quantity}</p>
                </div>
                <span className="text-sm font-bold text-gray-900 flex-shrink-0">{(item.price * item.quantity).toFixed(2)}€</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-semibold">{total.toFixed(2)}€</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Envio</span>
              <span className={shipping === 0 ? "text-green-600 font-semibold" : "font-semibold"}>{shipping === 0 ? "Gratis" : `${shipping.toFixed(2)}€`}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
              <span>Total</span><span className="text-[#1a3a5c]">{finalTotal.toFixed(2)}€</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
