"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import {
  Store,
  Package,
  Users,
  TrendingUp,
  BookOpen,
  Megaphone,
  Heart,
  Send,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { checkRateLimit } from "@/utils/sanitize";

const schema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100),
  empresa: z.string().max(200).optional(),
  email: z.string().email("Email no válido").max(254),
  telefono: z.string().min(9, "Teléfono requerido").max(20),
  ciudad: z.string().min(2, "Indica tu ciudad").max(100),
  presupuesto: z.string().min(1, "Selecciona un rango").max(10),
  mensaje: z.string().max(2000).optional(),
});

type FormData = z.infer<typeof schema>;

const VENTAJAS = [
  {
    icon: Package,
    title: "Catálogo de +10.000 productos",
    desc: "Todas las marcas líderes TCG con stock garantizado y precios exclusivos de distribuidor.",
  },
  {
    icon: TrendingUp,
    title: "Sector en crecimiento",
    desc: "El mercado TCG crece a doble dígito anual. El mejor momento para abrir tu tienda.",
  },
  {
    icon: BookOpen,
    title: "Formación completa",
    desc: "Formamos a tu equipo en producto, atención al cliente y gestión de torneos.",
  },
  {
    icon: Megaphone,
    title: "Marketing incluido",
    desc: "Incorporación a la red TCG Academy, campañas digitales y presencia en redes sociales.",
  },
  {
    icon: Users,
    title: "Comunidad activa",
    desc: "Red de tiendas TCG Academy con intercambio de experiencias, compras conjuntas y eventos.",
  },
  {
    icon: Heart,
    title: "Soporte continuo",
    desc: "Equipo dedicado para resolver dudas, incidencias y optimizar tu rendimiento día a día.",
  },
];

const PASOS = [
  {
    n: "01",
    title: "Contacta con nosotros",
    desc: "Rellena el formulario de interés. Te llamamos en menos de 24h.",
  },
  {
    n: "02",
    title: "Presentación del modelo",
    desc: "Videollamada con nuestro equipo para explicarte todo en detalle.",
  },
  {
    n: "03",
    title: "Estudio de viabilidad",
    desc: "Analizamos tu mercado local y te presentamos proyección de negocio.",
  },
  {
    n: "04",
    title: "Apertura y formación",
    desc: "Abrimos juntos. Formación, stock inicial y todo el apoyo de la red.",
  },
];

export default function FranquiciasPage() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (_data: FormData) => {
    if (!checkRateLimit("franquicias-form", 3, 60_000)) {
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
          <div className="absolute -bottom-10 left-0 h-96 w-96 rounded-full bg-purple-400 opacity-10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1400px] px-6 py-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-sm font-semibold">
            <Store size={14} className="text-yellow-400" /> Oportunidad de
            negocio
          </div>
          <h1 className="mb-6 text-4xl leading-tight font-bold md:text-6xl">
            Monta tu tienda TCG <br />
            <span className="text-yellow-400">con nosotros</span>
          </h1>
          <p className="mb-8 max-w-2xl text-xl leading-relaxed text-blue-100">
            Únete a la red de tiendas TCG Academy. Tendrás acceso a los mejores
            precios, soporte completo, formación y la fuerza de una marca
            consolidada.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#formulario"
              className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-8 py-4 text-lg font-bold text-[#1a3a5c] shadow-xl transition hover:bg-yellow-300"
            >
              Quiero abrir mi tienda <ArrowRight size={20} />
            </a>
          </div>
          <div className="mt-12 flex flex-wrap gap-8 border-t border-white/20 pt-8">
            {[
              ["4", "Tiendas activas"],
              ["500+", "Mayoristas"],
              ["10.000+", "Referencias"],
              ["100%", "Soporte"],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="text-2xl font-bold text-yellow-400">{n}</div>
                <div className="text-sm text-blue-200">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ventajas */}
      <section className="mx-auto max-w-[1400px] px-6 py-16">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-gray-900">
            Todo lo que necesitas para triunfar
          </h2>
          <p className="mx-auto max-w-xl text-gray-500">
            No empiezas desde cero. Cuentas con el respaldo de una empresa con
            años de experiencia y un modelo probado.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {VENTAJAS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                <Icon size={22} className="text-[#1a3a5c]" />
              </div>
              <h3 className="mb-2 font-bold text-gray-900">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-[1400px] px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
            Cómo funciona
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PASOS.map(({ n, title, desc }) => (
              <div key={n} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1a3a5c]">
                  <span className="text-lg font-black text-yellow-400">
                    {n}
                  </span>
                </div>
                <h3 className="mb-2 font-bold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="formulario" className="mx-auto max-w-[1400px] px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Solicitar información sin compromiso
          </h2>
          <p className="mb-8 text-gray-500">
            Cuéntanos tu proyecto y te presentamos el modelo completo.
          </p>

          {submitted ? (
            <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-12 text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <h3 className="mb-2 text-xl font-bold text-gray-900">
                ¡Solicitud recibida!
              </h3>
              <p className="text-gray-600">
                Nos ponemos en contacto contigo en menos de 24 horas.
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
                      (si aplica)
                    </span>
                  </label>
                  <input
                    {...register("empresa")}
                    type="text"
                    placeholder="Nombre de empresa"
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Ciudad *
                  </label>
                  <input
                    {...register("ciudad")}
                    type="text"
                    placeholder="Tu ciudad"
                    className={`h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none ${errors.ciudad ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                  />
                  {errors.ciudad && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.ciudad.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Presupuesto aproximado *
                  </label>
                  <select
                    {...register("presupuesto")}
                    className={`h-11 w-full rounded-xl border-2 bg-white px-4 text-sm transition focus:outline-none ${errors.presupuesto ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                  >
                    <option value="">Selecciona un rango</option>
                    <option value="<10k">Menos de 10.000 €</option>
                    <option value="10-25k">10.000 – 25.000 €</option>
                    <option value="25-50k">25.000 – 50.000 €</option>
                    <option value=">50k">Más de 50.000 €</option>
                  </select>
                  {errors.presupuesto && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.presupuesto.message}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Cuéntanos tu proyecto{" "}
                  <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <textarea
                  {...register("mensaje")}
                  rows={4}
                  placeholder="¿Tienes local? ¿Experiencia en retail? ¿Tienes clara la ubicación? Cuéntanos..."
                  className="w-full resize-none rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition focus:border-[#1a3a5c] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a3a5c] py-4 text-lg font-bold text-white transition hover:bg-[#15304d] disabled:opacity-60"
              >
                {isSubmitting ? (
                  "Enviando..."
                ) : (
                  <>
                    <Send size={18} /> Solicitar información
                  </>
                )}
              </button>
              <p className="text-center text-xs text-gray-400">
                Sin compromiso. Te respondemos en menos de 24 horas.
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
