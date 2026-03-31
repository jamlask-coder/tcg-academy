"use client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, MessageSquare } from "lucide-react"
import Link from "next/link"
import { checkRateLimit } from "@/utils/sanitize"

const schema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email no válido"),
  telefono: z.string().optional(),
  asunto: z.string().min(1, "Selecciona un asunto"),
  mensaje: z.string().min(10, "Mínimo 10 caracteres"),
})

type FormData = z.infer<typeof schema>

const STORES_CONTACT = [
  { name: "Calpe", phone: "+34 965 000 001", id: "calpe" },
  { name: "Béjar", phone: "+34 923 000 002", id: "bejar" },
  { name: "Madrid", phone: "+34 910 000 003", id: "madrid" },
  { name: "Barcelona", phone: "+34 930 000 004", id: "barcelona" },
]

export default function ContactoPage() {
  const [submitted, setSubmitted] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (_data: FormData) => {
    if (!checkRateLimit("contact-form", 3, 60_000)) {
      alert("Demasiados intentos. Espera un momento antes de enviar de nuevo.")
      return
    }
    await new Promise((r) => setTimeout(r, 600))
    setSubmitted(true)
  }

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a3a5c] to-[#2d6a9f] text-white py-16">
        <div className="max-w-[1180px] mx-auto px-6 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Contacto</h1>
          <p className="text-blue-200 text-lg max-w-lg mx-auto">
            Estamos aquí para ayudarte. Escríbenos y te respondemos en menos de 24 horas.
          </p>
        </div>
      </div>

      {/* Contact cards */}
      <div className="max-w-[1180px] mx-auto px-6 py-10">
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          {[
            {
              icon: Mail,
              title: "Email",
              value: "info@tcgacademy.es",
              href: "mailto:info@tcgacademy.es",
              color: "#1a3a5c",
            },
            {
              icon: Phone,
              title: "Teléfono",
              value: "+34 900 123 456",
              href: "tel:+34900123456",
              color: "#16a34a",
            },
            {
              icon: Clock,
              title: "Horario",
              value: "Lun–Vie 10:00–19:00",
              href: null,
              color: "#d97706",
            },
          ].map(({ icon: Icon, title, value, href, color }) => (
            <div key={title} className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: `${color}15` }}>
                <Icon size={22} style={{ color }} />
              </div>
              <p className="font-bold text-gray-900 mb-1">{title}</p>
              {href ? (
                <a href={href} className="text-sm font-medium hover:underline" style={{ color }}>{value}</a>
              ) : (
                <p className="text-sm text-gray-600">{value}</p>
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-12 text-center">
                <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">¡Mensaje enviado!</h2>
                <p className="text-gray-600">Te responderemos en menos de 24 horas en el email indicado.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-2xl p-8 space-y-5">
                <h2 className="font-bold text-gray-900 text-xl flex items-center gap-2">
                  <MessageSquare size={20} className="text-[#1a3a5c]" /> Enviar mensaje
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre *</label>
                    <input
                      {...register("nombre")}
                      type="text"
                      placeholder="Tu nombre"
                      className={`w-full h-11 px-4 border-2 rounded-xl text-sm focus:outline-none transition ${errors.nombre ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                    />
                    {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
                    <input
                      {...register("email")}
                      type="email"
                      placeholder="tu@email.com"
                      className={`w-full h-11 px-4 border-2 rounded-xl text-sm focus:outline-none transition ${errors.email ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Teléfono <span className="font-normal text-gray-400">(opcional)</span></label>
                    <input
                      {...register("telefono")}
                      type="tel"
                      placeholder="+34 600 000 000"
                      className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Asunto *</label>
                    <select
                      {...register("asunto")}
                      className={`w-full h-11 px-4 border-2 rounded-xl text-sm focus:outline-none transition bg-white ${errors.asunto ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                    >
                      <option value="">Selecciona un asunto</option>
                      <option value="consulta">Consulta general</option>
                      <option value="pedido">Sobre mi pedido</option>
                      <option value="mayoristas">Información mayoristas</option>
                      <option value="tiendas">Sobre nuestras tiendas</option>
                      <option value="otro">Otro</option>
                    </select>
                    {errors.asunto && <p className="text-red-500 text-xs mt-1">{errors.asunto.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mensaje *</label>
                  <textarea
                    {...register("mensaje")}
                    rows={5}
                    placeholder="Cuéntanos en qué podemos ayudarte..."
                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition resize-none ${errors.mensaje ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                  />
                  {errors.mensaje && <p className="text-red-500 text-xs mt-1">{errors.mensaje.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#1a3a5c] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#15304d] transition disabled:opacity-60"
                >
                  {isSubmitting ? "Enviando..." : <><Send size={18} /> Enviar mensaje</>}
                </button>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-[#1a3a5c]" /> Tiendas físicas
              </h3>
              <div className="space-y-3">
                {STORES_CONTACT.map((s) => (
                  <Link key={s.id} href={`/tiendas/${s.id}`} className="block group">
                    <div className="font-semibold text-sm text-gray-800 group-hover:text-[#1a3a5c] transition">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.phone}</div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Store map placeholder */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-3">Dónde estamos</h3>
              <div className="bg-gray-100 rounded-xl h-48 flex items-center justify-center">
                <div className="text-center">
                  <MapPin size={28} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs text-gray-400 font-medium">Calpe · Béjar · Madrid · Barcelona</p>
                  <p className="text-xs text-gray-300 mt-1">Mapa interactivo próximamente</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Clock size={16} className="text-gray-400" /> Horario de atención
              </h3>
              <div className="space-y-2 text-sm">
                {[["Lunes – Viernes", "10:00 – 19:00"], ["Sábado", "10:00 – 14:00"], ["Domingo", "Cerrado"]].map(([day, hours]) => (
                  <div key={day} className="flex justify-between">
                    <span className="text-gray-600">{day}</span>
                    <span className={`font-semibold ${hours === "Cerrado" ? "text-red-400" : ""}`}>{hours}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
