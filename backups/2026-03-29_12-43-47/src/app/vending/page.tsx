"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import {
  ShoppingBag,
  Clock,
  MapPin,
  Send,
  CheckCircle,
  Zap,
  TrendingUp,
  Shield,
} from "lucide-react";
import { checkRateLimit } from "@/utils/sanitize";

const schema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100),
  empresa: z.string().max(200).optional(),
  email: z.string().email("Email no válido").max(254),
  telefono: z.string().min(9, "Teléfono requerido").max(20),
  ubicacion: z.string().min(5, "Indica la ubicación deseada").max(300),
  mensaje: z.string().max(2000).optional(),
});

type FormData = z.infer<typeof schema>;

const VENTAJAS = [
  {
    icon: Clock,
    title: "Disponible 24/7",
    desc: "Sin horarios ni personal necesario. La máquina vende por ti.",
  },
  {
    icon: Zap,
    title: "Alta rotación",
    desc: "Sobres y accesorios TCG con alta demanda garantizada.",
  },
  {
    icon: TrendingUp,
    title: "Rentabilidad probada",
    desc: "Márgenes superiores al vending tradicional.",
  },
  {
    icon: Shield,
    title: "Soporte completo",
    desc: "Gestión de stock, mantenimiento y reposición incluidos.",
  },
  {
    icon: MapPin,
    title: "Ubicación estratégica",
    desc: "Centros comerciales, tiendas de juegos, colegios, ocio.",
  },
  {
    icon: ShoppingBag,
    title: "Catálogo TCG Academy",
    desc: "+10.000 referencias con reposición automática.",
  },
];

export default function VendingPage() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (_data: FormData) => {
    if (!checkRateLimit("vending-form", 3, 60_000)) {
      alert("Demasiados intentos. Espera un momento.");
      return;
    }
    await new Promise((r) => setTimeout(r, 600));
    setSubmitted(true);
  };

  return (
    <div>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#1a3a5c] via-[#1e4a73] to-[#2d6a9f] text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 right-10 w-80 h-80 rounded-full bg-yellow-400 blur-3xl opacity-10" />
          <div className="absolute bottom-0 left-10 w-64 h-64 rounded-full bg-purple-500 blur-3xl opacity-10" />
        </div>
        <div className="relative max-w-[1180px] mx-auto px-6 py-20">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-[#1a3a5c] font-black px-4 py-1.5 rounded-full text-sm uppercase tracking-wider mb-6">
            <Zap size={14} /> Próximamente
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            Máquinas Vending <br />
            <span className="text-yellow-400">TCG Academy</span>
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl leading-relaxed mb-8">
            Lleva la experiencia TCG a cualquier lugar con nuestras máquinas
            vending de cartas coleccionables. Sobres, packs y accesorios
            disponibles 24/7 sin personal ni infraestructura.
          </p>
          <a
            href="#interes"
            className="inline-flex items-center gap-2 bg-yellow-400 text-[#1a3a5c] font-bold px-8 py-4 rounded-xl hover:bg-yellow-300 transition shadow-xl text-lg"
          >
            Quiero una máquina en mi local <Send size={18} />
          </a>
        </div>
      </div>

      {/* Ventajas */}
      <section className="max-w-[1180px] mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            ¿Por qué apostar por el vending TCG?
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            El coleccionismo de cartas es uno de los sectores con mayor
            crecimiento en España. Una máquina en el lugar correcto genera
            ingresos pasivos constantes.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {VENTAJAS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                <Icon size={22} className="text-[#1a3a5c]" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              TCG Academy, empresa líder en el sector
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              TCG Academy es una empresa española en pleno crecimiento,
              referente en el sector TCG con más de 10.000 referencias y 4
              tiendas físicas distribuidas por la geografía española. Con más de
              500 mayoristas activos y años de experiencia en distribución de
              cartas coleccionables, somos el socio ideal para un proyecto de
              vending TCG.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Únete a la revolución del coleccionismo accesible. Nuestras
              máquinas dispensarán los últimos lanzamientos de Pokémon, Magic,
              One Piece y más, con reposición y mantenimiento totalmente
              cubiertos por nuestro equipo.
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="interes" className="max-w-[1180px] mx-auto px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Solicitar información
          </h2>
          <p className="text-gray-500 mb-8">
            Rellena el formulario y te contactaremos en menos de 24 horas.
          </p>

          {submitted ? (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-12 text-center">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                ¡Solicitud recibida!
              </h3>
              <p className="text-gray-600">
                Te contactaremos en menos de 24 horas para darte toda la
                información.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="bg-white border border-gray-200 rounded-2xl p-8 space-y-5"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Nombre *
                  </label>
                  <input
                    {...register("nombre")}
                    type="text"
                    placeholder="Tu nombre"
                    className={`w-full h-11 px-4 border-2 rounded-xl text-sm focus:outline-none transition ${errors.nombre ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                  />
                  {errors.nombre && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.nombre.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Empresa{" "}
                    <span className="font-normal text-gray-400">
                      (opcional)
                    </span>
                  </label>
                  <input
                    {...register("empresa")}
                    type="text"
                    placeholder="Tu empresa"
                    className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Email *
                  </label>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="tu@email.com"
                    className={`w-full h-11 px-4 border-2 rounded-xl text-sm focus:outline-none transition ${errors.email ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Teléfono *
                  </label>
                  <input
                    {...register("telefono")}
                    type="tel"
                    placeholder="+34 600 000 000"
                    className={`w-full h-11 px-4 border-2 rounded-xl text-sm focus:outline-none transition ${errors.telefono ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                  />
                  {errors.telefono && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.telefono.message}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Ubicación deseada *
                </label>
                <input
                  {...register("ubicacion")}
                  type="text"
                  placeholder="Ej: Centro comercial en Valencia, tienda de juegos en Madrid..."
                  className={`w-full h-11 px-4 border-2 rounded-xl text-sm focus:outline-none transition ${errors.ubicacion ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                />
                {errors.ubicacion && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.ubicacion.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Comentarios{" "}
                  <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <textarea
                  {...register("mensaje")}
                  rows={3}
                  placeholder="Cuéntanos más sobre tu proyecto..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#1a3a5c] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#15304d] transition disabled:opacity-60"
              >
                {isSubmitting ? (
                  "Enviando..."
                ) : (
                  <>
                    <Send size={18} /> Solicitar información
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
