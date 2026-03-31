"use client"
import { useState } from "react"
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, MessageSquare } from "lucide-react"
import Link from "next/link"

const STORES_CONTACT = [
  { name: "Calpe", phone: "+34 965 000 001", email: "calpe@tcgacademy.es", id: "calpe" },
  { name: "Bejar", phone: "+34 923 000 002", email: "bejar@tcgacademy.es", id: "bejar" },
  { name: "Madrid", phone: "+34 910 000 003", email: "madrid@tcgacademy.es", id: "madrid" },
  { name: "Barcelona", phone: "+34 930 000 004", email: "barcelona@tcgacademy.es", id: "barcelona" },
]

export default function ContactoPage() {
  const [form, setForm] = useState({ nombre: "", email: "", asunto: "", mensaje: "" })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => {})
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a3a5c] to-[#2d6a9f] text-white py-16">
        <div className="max-w-[1180px] mx-auto px-6 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Contacto</h1>
          <p className="text-blue-200 text-lg max-w-lg mx-auto">Estamos aqui para ayudarte. Escribenos y te respondemos en menos de 24h.</p>
        </div>
      </div>

      <div className="max-w-[1180px] mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Contact form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-12 text-center">
                <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Mensaje enviado</h2>
                <p className="text-gray-600">Te responderemos en menos de 24 horas en el email indicado.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 space-y-5">
                <h2 className="font-bold text-gray-900 text-xl mb-6 flex items-center gap-2">
                  <MessageSquare size={20} className="text-[#1a3a5c]" /> Enviar mensaje
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre *</label>
                    <input required type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                      placeholder="Tu nombre" className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
                    <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="tu@email.com" className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Asunto</label>
                  <select value={form.asunto} onChange={e => setForm(f => ({ ...f, asunto: e.target.value }))}
                    className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition bg-white">
                    <option value="">Selecciona un asunto</option>
                    <option value="pedido">Consulta sobre pedido</option>
                    <option value="producto">Consulta sobre producto</option>
                    <option value="mayorista">Informacion mayorista</option>
                    <option value="evento">Eventos y torneos</option>
                    <option value="devolucion">Devoluciones</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mensaje *</label>
                  <textarea required value={form.mensaje} onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))}
                    rows={5} placeholder="Cuentanos en que podemos ayudarte..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition resize-none" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-[#1a3a5c] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#15304d] transition disabled:opacity-60">
                  {loading ? "Enviando..." : <><Send size={18} /> Enviar mensaje</>}
                </button>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-4">Contacto directo</h3>
              <div className="space-y-3">
                <a href="mailto:info@tcgacademy.es" className="flex items-center gap-3 text-sm text-gray-700 hover:text-[#1a3a5c] transition">
                  <Mail size={16} className="text-gray-400 flex-shrink-0" /> info@tcgacademy.es
                </a>
                <a href="tel:+34965000001" className="flex items-center gap-3 text-sm text-gray-700 hover:text-[#1a3a5c] transition">
                  <Phone size={16} className="text-gray-400 flex-shrink-0" /> +34 965 000 001
                </a>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Clock size={16} className="text-gray-400" /> Horario de atencion
              </h3>
              <p className="text-sm text-gray-500 mb-3">Soporte por email y telefono</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Lunes - Viernes</span><span className="font-semibold">10:00 - 19:00</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Sabado</span><span className="font-semibold">10:00 - 14:00</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Domingo</span><span className="font-semibold text-red-400">Cerrado</span></div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-gray-400" /> Tiendas fisicas
              </h3>
              <div className="space-y-3">
                {STORES_CONTACT.map(s => (
                  <Link key={s.id} href={`/tiendas/${s.id}`} className="block group">
                    <div className="font-semibold text-sm text-gray-800 group-hover:text-[#1a3a5c] transition">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.phone}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
