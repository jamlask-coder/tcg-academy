"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  Store,
  CheckCircle2,
  Package,
  Users,
  TrendingUp,
  Calendar,
  Megaphone,
  Wrench,
  AlertCircle,
} from "lucide-react";
import { checkRateLimit } from "@/utils/sanitize";

const SOLICITUDES_KEY = "tcgacademy_solicitudes";

const schema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(200),
  email: z.string().email("Email no válido"),
  telefono: z
    .string()
    .regex(/^[+]?[\d\s\-()]{9,15}$/, "Teléfono no válido"),
  ciudad: z.string().min(2, "Introduce la ciudad").max(100),
  tieneLocal: z.enum(["si", "no", "buscando"]),
  presupuesto: z.enum(["<10000", "10000-25000", "25000-50000", ">50000"]),
  experiencia: z.string().max(1000).optional(),
  comoConociste: z.enum(["google", "redes", "recomendacion", "feria", "otro"]),
  mensaje: z.string().max(2000).optional(),
  aceptaTerminos: z
    .boolean()
    .refine((v) => v === true, "Debes aceptar los términos"),
  aceptaPrivacidad: z
    .boolean()
    .refine((v) => v === true, "Debes aceptar la política de privacidad"),
});

type FormData = z.infer<typeof schema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
      <AlertCircle size={11} />
      {message}
    </p>
  );
}

function inputCls(hasError: boolean) {
  return `h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none ${
    hasError
      ? "border-red-300 focus:border-red-400"
      : "border-gray-200 focus:border-[#0f766e]"
  }`;
}

const OFFERING = [
  {
    icon: Package,
    title: "Catálogo completo",
    desc: "+10.000 productos de todos los juegos TCG a precios exclusivos de tienda.",
  },
  {
    icon: TrendingUp,
    title: "Formación inicial y continua",
    desc: "Te formamos en los juegos, las tendencias y cómo gestionar tu tienda con éxito.",
  },
  {
    icon: Megaphone,
    title: "Material de marketing",
    desc: "Decoración, material POP, cartelería y acceso a nuestras campañas digitales.",
  },
  {
    icon: Calendar,
    title: "Soporte para eventos y torneos",
    desc: "Organizamos contigo los primeros torneos y te damos todas las herramientas.",
  },
  {
    icon: Wrench,
    title: "Asesoramiento en montaje",
    desc: "Te ayudamos con la distribución del espacio, iluminación y exposición de producto.",
  },
  {
    icon: Users,
    title: "Acceso a preventas y exclusivas",
    desc: "Sé el primero en tu zona en tener los lanzamientos más esperados.",
  },
];

const TIMELINE = [
  {
    n: "01",
    title: "Contacta con nosotros",
    desc: "Rellena el formulario o escríbenos. Nos ponemos en contacto contigo en 48h.",
  },
  {
    n: "02",
    title: "Estudio de viabilidad",
    desc: "Analizamos tu proyecto, la zona y el presupuesto juntos. Sin compromiso.",
  },
  {
    n: "03",
    title: "Montaje y equipamiento",
    desc: "Te ayudamos a acondicionar el local, la imagen y el primer pedido de stock.",
  },
  {
    n: "04",
    title: "Formación de tu equipo",
    desc: "Formamos a ti y a tu equipo en producto, atención al cliente y gestión.",
  },
  {
    n: "05",
    title: "Inauguración",
    desc: "Organizamos un evento especial de apertura para generar comunidad desde el día 1.",
  },
  {
    n: "06",
    title: "Soporte continuo",
    desc: "Gestor de cuenta dedicado, novedades anticipadas y soporte permanente.",
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
    defaultValues: {
      tieneLocal: "buscando",
      aceptaTerminos: false,
      aceptaPrivacidad: false,
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!checkRateLimit("franquicia-form", 3, 60_000)) {
      alert("Demasiados intentos. Espera un momento.");
      return;
    }
    await new Promise((r) => setTimeout(r, 700));

    try {
      const saved = JSON.parse(
        localStorage.getItem(SOLICITUDES_KEY) ?? "[]",
      ) as unknown[];
      saved.push({
        id: crypto.randomUUID(),
        tipo: "franquicia",
        estado: "nueva",
        fechaSolicitud: new Date().toISOString(),
        datos: data,
      });
      localStorage.setItem(SOLICITUDES_KEY, JSON.stringify(saved));
    } catch {
      // localStorage may be unavailable
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 py-20">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-teal-100">
            <CheckCircle2 size={40} className="text-teal-600" />
          </div>
          <h1 className="mb-4 text-3xl font-bold text-gray-900">
            ¡Nos ponemos en contacto!
          </h1>
          <p className="mb-8 text-gray-500">
            Hemos recibido tu solicitud. Nuestro equipo estudiará tu proyecto y
            te contactará en <strong>48 horas</strong> para dar los primeros
            pasos juntos.
          </p>
          <Link
            href="/mayoristas"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-6 py-3 font-semibold text-white transition hover:bg-[#0d6b62]"
          >
            Volver a Profesionales
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#042f2e] to-[#0f766e] py-20 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1400px] px-6">
          <Link
            href="/mayoristas"
            className="mb-6 inline-flex items-center gap-1 text-sm text-teal-300 hover:text-white"
          >
            ← Profesionales
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Store size={22} />
            </div>
            <h1 className="text-3xl font-bold md:text-4xl">
              Monta tu tienda TCG
            </h1>
          </div>
          <p className="max-w-2xl text-lg leading-relaxed text-teal-100">
            Te acompañamos en cada paso. Experiencia, catálogo y soporte para
            que tu negocio TCG sea un éxito desde el primer día.
          </p>
        </div>
      </section>

      {/* What we offer */}
      <section className="mx-auto max-w-[1400px] px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-gray-900">
            ¿Qué te ofrecemos?
          </h2>
          <p className="text-gray-500">
            Todo lo que necesitas para abrir y gestionar tu tienda TCG con éxito.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {OFFERING.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:shadow-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50">
                <Icon size={20} className="text-[#0f766e]" />
              </div>
              <h3 className="mb-2 font-bold text-gray-900">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-gray-900">El proceso</h2>
            <p className="text-gray-500">
              Desde el primer contacto hasta la apertura de tu tienda.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TIMELINE.map(({ n, title, desc }) => (
              <div
                key={n}
                className="relative rounded-2xl border border-gray-200 bg-white p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f766e] text-sm font-black text-white">
                  {n}
                </div>
                <h3 className="mb-2 font-bold text-gray-900">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Investment */}
      <section className="mx-auto max-w-[1400px] px-6 py-16">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#1a3a5c] p-8 text-white md:p-12">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-bold tracking-widest text-teal-400 uppercase">
                Orientativo
              </div>
              <h2 className="mb-4 text-2xl font-bold md:text-3xl">
                Inversión estimada
              </h2>
              <div className="mb-6 flex items-end gap-2">
                <span className="text-5xl font-black text-yellow-400">
                  desde 15.000€
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-300">
                Dependiendo del tamaño del local, la ciudad y el tipo de
                apertura. Incluye primer stock, equipamiento básico, branding y
                formación inicial.
              </p>
            </div>
            <div>
              <h3 className="mb-4 font-bold text-slate-200">Qué incluye</h3>
              <ul className="space-y-2.5">
                {[
                  "Stock inicial seleccionado por nuestros expertos",
                  "Imagen corporativa y branding",
                  "Módulo de exposición y mobiliario básico",
                  "Formación completa del equipo (3 días)",
                  "Evento de inauguración con soporte",
                  "Acceso al portal B2B y gestor dedicado",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-slate-300"
                  >
                    <CheckCircle2
                      size={14}
                      className="mt-0.5 flex-shrink-0 text-teal-400"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-[700px] px-6">
          <div className="mb-8 text-center">
            <h2 className="mb-3 text-2xl font-bold text-gray-900">
              Cuéntanos tu proyecto
            </h2>
            <p className="text-gray-500">
              Sin compromiso. Te respondemos en 48 horas.
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("nombre")}
                  placeholder="Tu nombre"
                  className={inputCls(!!errors.nombre)}
                />
                <FieldError message={errors.nombre?.message} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("telefono")}
                  type="tel"
                  placeholder="+34 600 000 000"
                  className={inputCls(!!errors.telefono)}
                />
                <FieldError message={errors.telefono?.message} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="tu@email.com"
                  className={inputCls(!!errors.email)}
                />
                <FieldError message={errors.email?.message} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Ciudad donde quieres montar la tienda{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("ciudad")}
                  placeholder="Madrid, Barcelona..."
                  className={inputCls(!!errors.ciudad)}
                />
                <FieldError message={errors.ciudad?.message} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  ¿Tienes local? <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("tieneLocal")}
                  className={inputCls(!!errors.tieneLocal)}
                >
                  <option value="si">Sí, ya tengo local</option>
                  <option value="no">No tengo local</option>
                  <option value="buscando">Estoy buscando</option>
                </select>
                <FieldError message={errors.tieneLocal?.message} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Presupuesto aproximado <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("presupuesto")}
                  className={inputCls(!!errors.presupuesto)}
                >
                  <option value="">Seleccionar</option>
                  <option value="<10000">Menos de 10.000 €</option>
                  <option value="10000-25000">10.000 — 25.000 €</option>
                  <option value="25000-50000">25.000 — 50.000 €</option>
                  <option value=">50000">Más de 50.000 €</option>
                </select>
                <FieldError message={errors.presupuesto?.message} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Experiencia en TCG o retail
                </label>
                <textarea
                  {...register("experiencia")}
                  rows={3}
                  placeholder="Cuéntanos brevemente tu experiencia con el mundo TCG o con negocios de retail..."
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition focus:border-[#0f766e] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  ¿Cómo nos has conocido? <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("comoConociste")}
                  className={inputCls(!!errors.comoConociste)}
                >
                  <option value="">Seleccionar</option>
                  <option value="google">Google</option>
                  <option value="redes">Redes sociales</option>
                  <option value="recomendacion">Recomendación</option>
                  <option value="feria">Feria o evento</option>
                  <option value="otro">Otro</option>
                </select>
                <FieldError message={errors.comoConociste?.message} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Mensaje adicional
                </label>
                <textarea
                  {...register("mensaje")}
                  rows={3}
                  placeholder="¿Algo más que quieras contarnos sobre tu proyecto?"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition focus:border-[#0f766e] focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-4">
              {[
                {
                  field: "aceptaTerminos" as const,
                  label: "He leído y acepto los términos y condiciones",
                  required: true,
                  error: errors.aceptaTerminos?.message,
                },
                {
                  field: "aceptaPrivacidad" as const,
                  label: "Acepto la política de privacidad",
                  required: true,
                  error: errors.aceptaPrivacidad?.message,
                },
              ].map(({ field, label, required, error }) => (
                <div key={field}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      {...register(field)}
                      className="mt-0.5 h-4 w-4 rounded accent-[#0f766e]"
                    />
                    <span className="text-sm text-gray-700">
                      {label}
                      {required && (
                        <span className="ml-0.5 text-red-500">*</span>
                      )}
                    </span>
                  </label>
                  {error && <FieldError message={error} />}
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-[#0f766e] py-4 text-base font-bold text-white shadow-lg transition hover:bg-[#0d6b62] disabled:opacity-60"
            >
              {isSubmitting ? "Enviando..." : "Enviar solicitud →"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
