"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState } from "react"
import { Store, Package, Users, TrendingUp, BookOpen, Megaphone, Heart, Send, CheckCircle, ArrowRight } from "lucide-react"

const schema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres"),
  empresa: z.string().optional(),
  email: z.string().email("Email no válido"),
  telefono: z.string().min(9, "Teléfono requerido"),
  ciudad: z.string().min(2, "Indica tu ciudad"),
  presupuesto: z.string().min(1, "Selecciona un rango"),
  mensaje: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const VENTAJAS = [
  { icon: Package, title: "Catálogo de +10.000 productos", desc: "Todas las marcas líderes TCG con stock garantizado y precios exclusivos de distribuidor." },
  { icon: TrendingUp, title: "Sector en crecimiento", desc: "El mercado TCG crece a doble dígito anual. El mejor momento para abrir tu tienda." },
  { icon: BookOpen, title: "Formación completa", desc: "Formamos a tu equipo en producto, atención al cliente y gestión de torneos." },
  { icon: Megaphone, title: "Marketing incluido", desc: "Incorporación a la red TCG Academy, campañas digitales y presencia en redes sociales." },
  { icon: Users, title: "Comunidad activa", desc: "Red de tiendas TCG Academy con intercambio de experiencias, compras conjuntas y eventos." },
  { icon: Heart, title: "Soporte continuo", desc: "Equipo dedicado para resolver dudas, incidencias y optimizar tu rendimiento día a día." },
]

const PASOS = [
  { n: "01", title: "Contacta con nosotros", desc: "Rellena el formulario de interés. Te llamamos en menos de 24h." },
  { n: "02", title: "Presentación del modelo", desc: "Videollamada con nuestro equipo para explicarte todo en detalle." },
  { n: "03", title: "Estudio de viabilidad", desc: "Analizamos tu mercado local y te presentamos proyección de negocio." },
  { n: "04", title: "Apertura y formación", desc: "Abrimos juntos. Formación, stock inicial y todo el apoyo de la red." },
]

export default function FranquiciasPage() {
  const [submitted, setSubmitted] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (_data: FormData) => {
    await new Promise((r) => setTimeout(r, 600))
    setSubmitted(true)
  }

  return (
    <div>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#1a3a5c] via-[#1e4a73] to-[#2d6a9f] text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 right-10 w-80 h-80 rounded-full bg-yellow-400 blur-3xl opacity-10" />
          <div className="absolute -bottom-10 left-0 w-96 h-96 rounded-full bg-purple-400 blur-3xl opacity-10" />
        </div>
        <div className="relative max-w-[1180px] mx-auto px-6 py-20">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/30 rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
            <Store size={14} className="text-yellow-400" /> Oportunidad de negocio
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            Monta tu tienda TCG <br /><span className="text-yellow-400">con nosotros</span>
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl leading-relaxed mb-8">
            Únete a la red de tiendas TCG Academy. Tendrás acceso a los mejores precios,
            soporte completo, formación y la fuerza de una marca consolidada.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#formulario" className="inline-flex items-center gap-2 bg-yellow-400 text-[#1a3a5c] font-bold px-8 py-4 rounded-xl hover:bg-yellow-300 transition shadow-xl text-lg">
              Quiero abrir mi tienda <ArrowRight size={20} />
            </a>
          </div>
          <div className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-white/20">
            {[["4", "Tiendas activas"], ["500+", "Mayoristas"], ["10.000+", "Referencias"], ["100%", "Soporte"]].map(([n, l]) => (
              <div key={l}>
                <div className="text-2xl font-bold text-yellow-400">{n}</div>
                <div className="text-sm text-blue-200">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ventajas */}
      <section className="max-w-[1180px] mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Todo lo que necesitas para triunfar</h2>
          <p className="text-gray-500 max-w-xl mx-auto">No empiezas desde cero. Cuentas con el respaldo de una empresa con años de experiencia y un modelo probado.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {VENTAJAS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition hover:-translate-y-0.5">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                <Icon size={22} className="text-[#1a3a5c]" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-[1180px] mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Cómo funciona</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PASOS.map(({ n, title, desc }) => (
              <div key={n} className="text-center">
                <div className="w-14 h-14 bg-[#1a3a5c] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-yellow-400 font-black text-lg">{n}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="formulario" className="max-w-[1180px] mx-auto px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Solicitar información sin compromiso</h2>
          <p className="text-gray-500 mb-8">Cuéntanos tu proyecto y te presentamos el modelo completo.</p>

          {submitted ? (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-12 text-center">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">¡Solicitud recibida!</h3>
              <p className="text-gray-600">Nos ponemos en contacto contigo en menos de 24 horas.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-2xl p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre *</label>
                  <input {...register("nombre")} type="text" placeholder="Tu nombre"
                    className={`w-full h-11 px-4 border-2 rounded-xl text-sm focus:outline-none transition ${errors.nombre ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`} />
                  {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Empresa <span className="font-normal text-gray-400">(si aplica)</span></label>
                  <input {...register("empresa")} type="text" placeholder="Nombre de empresa"
                    className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
                  <input {...register("email")} type="email" placeholder="tu@email.com"
                    className={`w-full h-11 px-4 border-2 rounded-xl text-sm focus:outline-none transition ${errors.email ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`} />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Teléfono *</label>
                  <input {...register("telefono")} type="tel" placeholder="+34 600 000 000"
                    className={`w-full h-11 px-4 border-2 rounded-xl text-sm focus:outline-none transition ${errors.telefono ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`} />
                  {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono.message}</p>}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ciudad *</label>
                  <input {...register("ciudad")} type="text" placeholder="Tu ciudad"
                    className={`w-full h-11 px-4 border-2 rounded-xl text-sm focus:outline-none transition ${errors.ciudad ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`} />
                  {errors.ciudad && <p className="text-red-500 text-xs mt-1">{errors.ciudad.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Presupuesto aproximado *</label>
                  <select {...register("presupuesto")}
                    className={`w-full h-11 px-4 border-2 rounded-xl text-sm focus:outline-none transition bg-white ${errors.presupuesto ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`}>
                    <option value="">Selecciona un rango</option>
                    <option value="<10k">Menos de 10.000 €</option>
                    <option value="10-25k">10.000 – 25.000 €</option>
                    <option value="25-50k">25.000 – 50.000 €</option>
                    <option value=">50k">Más de 50.000 €</option>
                  </select>
                  {errors.presupuesto && <p className="text-red-500 text-xs mt-1">{errors.presupuesto.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cuéntanos tu proyecto <span className="font-normal text-gray-400">(opcional)</span></label>
                <textarea {...register("mensaje")} rows={4} placeholder="¿Tienes local? ¿Experiencia en retail? ¿Tienes clara la ubicación? Cuéntanos..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition resize-none" />
              </div>
              <button type="submit" disabled={isSubmitting}
                className="w-full bg-[#1a3a5c] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#15304d] transition disabled:opacity-60 text-lg">
                {isSubmitting ? "Enviando..." : <><Send size={18} /> Solicitar información</>}
              </button>
              <p className="text-xs text-gray-400 text-center">Sin compromiso. Te respondemos en menos de 24 horas.</p>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
