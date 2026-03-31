"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  Package2,
  CheckCircle2,
  MapPin,
  Clock,
  ShieldCheck,
  Zap,
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
  ubicacion: z.string().min(5, "Describe la ubicación").max(300),
  mensaje: z.string().max(1000).optional(),
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


const HOW_IT_WORKS = [
  {
    icon: ShieldCheck,
    title: "Nosotros ponemos la máquina",
    desc: "TCG Academy proporciona y mantiene la máquina vending. Tú solo necesitas el espacio.",
  },
  {
    icon: MapPin,
    title: "Tú eliges la ubicación",
    desc: "Centro comercial, estación, universidad, zona de ocio... Evaluamos la viabilidad juntos.",
  },
  {
    icon: Package2,
    title: "Producto siempre disponible",
    desc: "TCG Academy gestiona la reposición del stock. Nunca quedará vacía.",
  },
  {
    icon: Zap,
    title: "Ingresos 24/7",
    desc: "La máquina vende las 24 horas, los 7 días de la semana, sin necesitar personal.",
  },
];

const PRODUCTS = [
  { cat: "Sobres sueltos", items: ["Magic", "Pokémon", "One Piece", "Yu-Gi-Oh!"] },
  { cat: "Blisters y packs", items: ["Pokémon ETB mini", "Lorcana starter", "DBS packs"] },
  { cat: "Accesorios", items: ["Sleeves surtidos", "Deck boxes", "Toploaders"] },
];

const LOCATIONS = [
  { icon: "🛍️", name: "Centros comerciales" },
  { icon: "🚉", name: "Estaciones de tren y metro" },
  { icon: "🎮", name: "Zonas de ocio y gaming" },
  { icon: "🎓", name: "Universidades y colegios" },
  { icon: "📚", name: "Tiendas de cómics y entretenimiento" },
  { icon: "🏨", name: "Hoteles y áreas de descanso" },
];

export default function VendingPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { aceptaPrivacidad: false },
  });

  const onSubmit = async (data: FormData) => {
    if (!checkRateLimit("vending-form", 3, 60_000)) {
      alert("Demasiados intentos. Espera un momento.");
      return;
    }
    await new Promise((r) => setTimeout(r, 600));

    try {
      const saved = JSON.parse(
        localStorage.getItem(SOLICITUDES_KEY) ?? "[]",
      ) as unknown[];
      saved.push({
        id: crypto.randomUUID(),
        tipo: "vending",
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
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-purple-100">
            <CheckCircle2 size={40} className="text-purple-600" />
          </div>
          <h1 className="mb-4 text-3xl font-bold text-gray-900">
            ¡Apuntado a la lista!
          </h1>
          <p className="mb-8 text-gray-500">
            Cuando lancemos el programa de vending TCG, serás de los primeros en
            saberlo. Te contactaremos en cuanto esté disponible.
          </p>
          <Link
            href="/mayoristas"
            className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-6 py-3 font-semibold text-white transition hover:bg-[#6d28d9]"
          >
            Volver a Mayoristas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2e1065] to-[#7c3aed] py-20 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1180px] px-6">
          <Link
            href="/mayoristas"
            className="mb-6 inline-flex items-center gap-1 text-sm text-purple-300 hover:text-white"
          >
            ← Mayoristas
          </Link>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-1.5 text-xs font-bold tracking-wide text-yellow-300 uppercase">
            <Clock size={12} />
            Próximamente
          </div>
          <h1 className="mb-4 text-3xl font-bold md:text-5xl">
            Máquinas Vending TCG
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-purple-200">
            Lleva la experiencia TCG a centros comerciales, estaciones,
            colegios y más. 24 horas al día, 7 días a la semana. Sin personal,
            sin horarios.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-[1180px] px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-gray-900">
            ¿Cómo funciona?
          </h2>
          <p className="text-gray-500">
            Un modelo simple: tú aportas el espacio, nosotros el resto.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200 bg-white p-6 text-center transition hover:shadow-md"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50">
                <Icon size={22} className="text-[#7c3aed]" />
              </div>
              <h3 className="mb-2 font-bold text-gray-900">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-[1180px] px-6">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-2xl font-bold text-gray-900">
              Productos disponibles en vending
            </h2>
            <p className="text-gray-500">
              Selección optimizada para venta de impulso.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {PRODUCTS.map(({ cat, items }) => (
              <div
                key={cat}
                className="rounded-2xl border border-gray-200 bg-white p-6"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                  <Package2 size={18} className="text-[#7c3aed]" />
                </div>
                <h3 className="mb-3 font-bold text-gray-900">{cat}</h3>
                <ul className="space-y-1.5">
                  {items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-gray-500"
                    >
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Locations */}
      <section className="mx-auto max-w-[1180px] px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-2xl font-bold text-gray-900">
            Ubicaciones ideales
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {LOCATIONS.map(({ icon, name }) => (
            <div
              key={name}
              className="rounded-2xl border border-gray-200 bg-white p-4 text-center transition hover:shadow-sm"
            >
              <div className="mb-2 text-3xl">{icon}</div>
              <p className="text-xs font-semibold leading-tight text-gray-600">
                {name}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section className="bg-gradient-to-br from-[#2e1065] to-[#7c3aed] py-20">
        <div className="mx-auto max-w-[600px] px-6">
          <div className="mb-8 text-center text-white">
            <h2 className="mb-3 text-2xl font-bold">
              ¿Tienes una ubicación en mente?
            </h2>
            <p className="text-purple-200">
              Déjanos tus datos y te contactaremos cuando el programa esté
              disponible. Estarás entre los primeros.
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 rounded-2xl border border-white/10 bg-white/10 p-8 backdrop-blur-sm"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-white">
                  Nombre <span className="text-yellow-300">*</span>
                </label>
                <input
                  {...register("nombre")}
                  placeholder="Tu nombre"
                  className="h-11 w-full rounded-xl border-2 border-white/20 bg-white/10 px-4 text-sm text-white placeholder-white/40 focus:border-white/60 focus:outline-none"
                />
                <FieldError message={errors.nombre?.message} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-white">
                  Teléfono <span className="text-yellow-300">*</span>
                </label>
                <input
                  {...register("telefono")}
                  type="tel"
                  placeholder="+34 600 000 000"
                  className="h-11 w-full rounded-xl border-2 border-white/20 bg-white/10 px-4 text-sm text-white placeholder-white/40 focus:border-white/60 focus:outline-none"
                />
                <FieldError message={errors.telefono?.message} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-white">
                  Email <span className="text-yellow-300">*</span>
                </label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="tu@email.com"
                  className="h-11 w-full rounded-xl border-2 border-white/20 bg-white/10 px-4 text-sm text-white placeholder-white/40 focus:border-white/60 focus:outline-none"
                />
                <FieldError message={errors.email?.message} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-white">
                  Ubicación propuesta{" "}
                  <span className="text-yellow-300">*</span>
                </label>
                <input
                  {...register("ubicacion")}
                  placeholder="Ej: Centro Comercial Gran Vía, Madrid — zona de ocio"
                  className="h-11 w-full rounded-xl border-2 border-white/20 bg-white/10 px-4 text-sm text-white placeholder-white/40 focus:border-white/60 focus:outline-none"
                />
                <FieldError message={errors.ubicacion?.message} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-white">
                  Mensaje (opcional)
                </label>
                <textarea
                  {...register("mensaje")}
                  rows={3}
                  placeholder="Cuéntanos más sobre el espacio o tu idea..."
                  className="w-full rounded-xl border-2 border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-white/60 focus:outline-none"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                {...register("aceptaPrivacidad")}
                className="mt-0.5 h-4 w-4 rounded accent-purple-400"
              />
              <span className="text-sm text-purple-200">
                Acepto la política de privacidad{" "}
                <span className="text-yellow-300">*</span>
              </span>
            </label>
            {errors.aceptaPrivacidad && (
              <FieldError message={errors.aceptaPrivacidad.message} />
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-yellow-400 py-4 text-base font-black text-[#2e1065] shadow-lg transition hover:bg-yellow-300 disabled:opacity-60"
            >
              {isSubmitting
                ? "Enviando..."
                : "Registrar interés →"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
