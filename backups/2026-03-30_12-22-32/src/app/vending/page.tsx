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
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1a3a5c] via-[#1e4a73] to-[#2d6a9f] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-10 right-10 h-80 w-80 rounded-full bg-yellow-400 opacity-10 blur-3xl" />
          <div className="absolute bottom-0 left-10 h-64 w-64 rounded-full bg-purple-500 opacity-10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1180px] px-6 py-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-1.5 text-sm font-black tracking-wider text-[#1a3a5c] uppercase">
            <Zap size={14} /> Próximamente
          </div>
          <h1 className="mb-6 text-4xl leading-tight font-bold md:text-6xl">
            Máquinas Vending <br />
            <span className="text-yellow-400">TCG Academy</span>
          </h1>
          <p className="mb-8 max-w-2xl text-xl leading-relaxed text-blue-100">
            Lleva la experiencia TCG a cualquier lugar con nuestras máquinas
            vending de cartas coleccionables. Sobres, packs y accesorios
            disponibles 24/7 sin personal ni infraestructura.
          </p>
          <a
            href="#interes"
            className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-8 py-4 text-lg font-bold text-[#1a3a5c] shadow-xl transition hover:bg-yellow-300"
          >
            Quiero una máquina en mi local <Send size={18} />
          </a>
        </div>
      </div>

      {/* Ventajas */}
      <section className="mx-auto max-w-[1180px] px-6 py-16">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-gray-900">
            ¿Por qué apostar por el vending TCG?
          </h2>
          <p className="mx-auto max-w-xl text-gray-500">
            El coleccionismo de cartas es uno de los sectores con mayor
            crecimiento en España. Una máquina en el lugar correcto genera
            ingresos pasivos constantes.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {VENTAJAS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                <Icon size={22} className="text-[#1a3a5c]" />
              </div>
              <h3 className="mb-2 font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-[1180px] px-6">
          <div className="max-w-2xl">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              TCG Academy, empresa líder en el sector
            </h2>
            <p className="mb-4 leading-relaxed text-gray-600">
              TCG Academy es una empresa española en pleno crecimiento,
              referente en el sector TCG con más de 10.000 referencias y 4
              tiendas físicas distribuidas por la geografía española. Con años
              de experiencia en distribución de cartas coleccionables, somos
              el socio ideal para un proyecto de vending TCG.
            </p>
            <p className="leading-relaxed text-gray-600">
              Únete a la revolución del coleccionismo accesible. Nuestras
              máquinas dispensarán los últimos lanzamientos de Pokémon, Magic,
              One Piece y más, con reposición y mantenimiento totalmente
              cubiertos por nuestro equipo.
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="interes" className="mx-auto max-w-[1180px] px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Solicitar información
          </h2>
          <p className="mb-8 text-gray-500">
            Rellena el formulario y te contactaremos en menos de 24 horas.
          </p>

          {submitted ? (
            <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-12 text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <h3 className="mb-2 text-xl font-bold text-gray-900">
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
              className="space-y-5 rounded-2xl border border-gray-200 bg-white p-8"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Nombre *
                  </label>
                  <input
                    {...register("nombre")}
                    type="text"
                    placeholder="Tu nombre"
                    className={`h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none ${errors.nombre ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                  />
                  {errors.nombre && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.nombre.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Empresa{" "}
                    <span className="font-normal text-gray-400">
                      (opcional)
                    </span>
                  </label>
                  <input
                    {...register("empresa")}
                    type="text"
                    placeholder="Tu empresa"
                    className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#1a3a5c] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Email *
                  </label>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="tu@email.com"
                    className={`h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none ${errors.email ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Teléfono *
                  </label>
                  <input
                    {...register("telefono")}
                    type="tel"
                    placeholder="+34 600 000 000"
                    className={`h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none ${errors.telefono ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                  />
                  {errors.telefono && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.telefono.message}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Ubicación deseada *
                </label>
                <input
                  {...register("ubicacion")}
                  type="text"
                  placeholder="Ej: Centro comercial en Valencia, tienda de juegos en Madrid..."
                  className={`h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none ${errors.ubicacion ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                />
                {errors.ubicacion && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.ubicacion.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Comentarios{" "}
                  <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <textarea
                  {...register("mensaje")}
                  rows={3}
                  placeholder="Cuéntanos más sobre tu proyecto..."
                  className="w-full resize-none rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition focus:border-[#1a3a5c] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a3a5c] py-4 font-bold text-white transition hover:bg-[#15304d] disabled:opacity-60"
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
