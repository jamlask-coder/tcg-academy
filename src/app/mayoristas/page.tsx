"use client"
import { useState } from "react"
import { CheckCircle, Users, Package, Clock, TrendingUp, ArrowRight } from "lucide-react"
import { checkRateLimit, sanitizeFormData } from "@/utils/sanitize"

const BENEFITS = [
  { icon: TrendingUp, title: "Descuentos por volumen", desc: "Hasta un 30% de descuento segun tu volumen de compra mensual" },
  { icon: Package, title: "Stock prioritario", desc: "Acceso prioritario a novedades y productos limitados antes que el publico" },
  { icon: Clock, title: "Envio express", desc: "Tus pedidos salen el mismo dia si compras antes de las 14:00h" },
  { icon: Users, title: "Gestor dedicado", desc: "Un gestor comercial exclusivo para resolver tus pedidos y consultas" },
  { icon: CheckCircle, title: "Catalogo exclusivo", desc: "Precios mayorista en mas de 10.000 referencias de los 6 juegos" },
  { icon: TrendingUp, title: "Formacion gratuita", desc: "Acceso a formacion sobre productos, novedades y estrategias de venta" },
]

const TIERS = [
  { name: "Bronce", min: 0, max: 499, discount: "10%", color: "#cd7f32" },
  { name: "Plata", min: 500, max: 999, discount: "15%", color: "#9ca3af" },
  { name: "Oro", min: 1000, max: 4999, discount: "20%", color: "#f59e0b" },
  { name: "Platino", min: 5000, max: null, discount: "30%", color: "#7c3aed" },
]

export default function MayoristasPage() {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ empresa: "", nif: "", email: "", telefono: "", volumen: "", mensaje: "", juegos: [] as string[] })

  const GAMES = ["Pokemon", "Magic: The Gathering", "Yu-Gi-Oh!", "Naruto", "Lorcana", "Dragon Ball Super CG"]

  const toggleGame = (g: string) => {
    setForm(f => ({ ...f, juegos: f.juegos.includes(g) ? f.juegos.filter(x => x !== g) : [...f.juegos, g] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkRateLimit("mayoristas-form", 3, 60_000)) {
      alert("Demasiados intentos. Espera un momento.")
      return
    }
    sanitizeFormData(form)
    await new Promise((r) => setTimeout(r, 600))
    setSubmitted(true)
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1a3a5c] via-[#1e4a73] to-[#2d6a9f] text-white py-24">
        <div className="max-w-[1180px] mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/30 rounded-full px-4 py-1.5 text-yellow-300 text-sm font-semibold mb-6">
            Para distribuidores y tiendas
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Zona Mayoristas B2B</h1>
          <p className="text-blue-200 text-xl max-w-2xl mx-auto mb-10">Precios especiales, stock prioritario y atencion personalizada para distribuidores, tiendas y coleccionistas profesionales.</p>
          <div className="flex flex-wrap justify-center gap-8">
            {[["500+","Mayoristas activos"],["10.000+","Referencias"],["30%","Descuento maximo"],["24h","Gestion de pedidos"]].map(([n,l]) => (
              <div key={l} className="text-center">
                <div className="text-3xl font-bold text-yellow-400">{n}</div>
                <div className="text-sm text-blue-200 mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-[1180px] mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-3">Ventajas para mayoristas</h2>
        <p className="text-gray-500 text-center mb-10">Todo lo que necesitas para hacer crecer tu negocio TCG</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                <Icon size={22} className="text-[#1a3a5c]" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Discount tiers */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-[1180px] mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-3">Tarifas por volumen</h2>
          <p className="text-gray-500 text-center mb-10">Cuanto mas compras, mas ahorras</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TIERS.map(tier => (
              <div key={tier.name} className="bg-white border-2 rounded-2xl p-6 text-center hover:shadow-lg transition" style={{ borderColor: tier.color }}>
                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold" style={{ backgroundColor: tier.color }}>
                  {tier.name[0]}
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-1">{tier.name}</h3>
                <p className="text-3xl font-black mb-2" style={{ color: tier.color }}>{tier.discount}</p>
                <p className="text-xs text-gray-500">
                  {tier.max ? `${tier.min}€ — ${tier.max}€/mes` : `+${tier.min}€/mes`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application form */}
      <section className="max-w-[1180px] mx-auto px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-3">Solicitar acceso mayorista</h2>
          <p className="text-gray-500 text-center mb-10">Rellena el formulario y un gestor te contactara en menos de 24h</p>

          {submitted ? (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-10 text-center">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Solicitud recibida</h3>
              <p className="text-gray-600">Nuestro equipo comercial revisara tu solicitud y te contactara en menos de 24 horas.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Empresa *</label>
                  <input required type="text" maxLength={200} value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))}
                    placeholder="Nombre de tu empresa" className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">NIF / CIF *</label>
                  <input required type="text" maxLength={15} value={form.nif} onChange={e => setForm(f => ({ ...f, nif: e.target.value }))}
                    placeholder="B12345678" className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
                  <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="contacto@empresa.com" className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefono</label>
                  <input type="tel" maxLength={20} value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                    placeholder="+34 600 000 000" className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Volumen mensual estimado</label>
                <select value={form.volumen} onChange={e => setForm(f => ({ ...f, volumen: e.target.value }))}
                  className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition bg-white">
                  <option value="">Selecciona un rango</option>
                  <option value="0-500">Menos de 500€/mes</option>
                  <option value="500-1000">500€ - 1.000€/mes</option>
                  <option value="1000-5000">1.000€ - 5.000€/mes</option>
                  <option value="5000+">Mas de 5.000€/mes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Juegos de interes</label>
                <div className="flex flex-wrap gap-2">
                  {GAMES.map(g => (
                    <button key={g} type="button" onClick={() => toggleGame(g)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition ${form.juegos.includes(g) ? "bg-[#1a3a5c] text-white border-[#1a3a5c]" : "border-gray-200 text-gray-600 hover:border-[#1a3a5c]"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mensaje (opcional)</label>
                <textarea value={form.mensaje} onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))}
                  maxLength={2000} rows={3} placeholder="Cuentanos mas sobre tu negocio..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition resize-none" />
              </div>
              <button type="submit" className="w-full bg-[#1a3a5c] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#15304d] transition text-base">
                Enviar solicitud <ArrowRight size={18} />
              </button>
              <p className="text-xs text-gray-400 text-center">Tus datos se tratan conforme a nuestra politica de privacidad. Solo usamos tu informacion para gestionar tu solicitud.</p>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
