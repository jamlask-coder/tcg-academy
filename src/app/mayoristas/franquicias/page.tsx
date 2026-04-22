"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Store, CheckCircle2, AlertCircle, Mail, Phone } from "lucide-react";
import { checkRateLimit } from "@/utils/sanitize";
import { SITE_CONFIG } from "@/config/siteConfig";

const SOLICITUDES_KEY = "tcgacademy_solicitudes";

const schema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(200),
  email: z.string().email("Email no válido"),
  telefono: z.string().regex(/^[+]?[\d\s\-()]{9,15}$/, "Teléfono no válido"),
  ciudad: z.string().min(2, "Introduce la ciudad").max(100),
  mensaje: z.string().max(2000).optional(),
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

export default function FranquiciasPage() {
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
    if (!checkRateLimit("franquicia-form", 3, 60_000)) {
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
      <div className="flex min-h-[60vh] items-center justify-center bg-white px-6 py-20">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-teal-100">
            <CheckCircle2 size={40} className="text-teal-600" />
          </div>
          <h1 className="mb-4 text-3xl font-bold text-gray-900">
            Gracias por tu interés
          </h1>
          <p className="mb-8 text-gray-500">
            Hemos recibido tu consulta. Te contestaremos al email que nos has
            dejado.
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
    <div className="bg-white">
      {/* Hero */}
      <section className="border-b border-gray-100 bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-[1400px] px-6">
          <Link
            href="/mayoristas"
            className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
          >
            ← Profesionales
          </Link>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50 text-[#0f766e]">
              <Store size={22} />
            </div>
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900 md:text-4xl">
                Abre tu tienda TCG
              </h1>
              <p className="max-w-2xl text-base text-gray-600">
                Tenemos 4 tiendas físicas propias ({SITE_CONFIG.legalName}) y
                podemos compartir nuestra experiencia si te planteas abrir la
                tuya. Escríbenos sin compromiso y hablamos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple form */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-[680px] px-6">
          <div className="mb-6 text-center">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">
              Cuéntanos brevemente
            </h2>
            <p className="text-sm text-gray-500">
              Sin compromiso. Solo respondemos a tu consulta.
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Nombre <span className="text-red-500">*</span>
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
                  Ciudad <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("ciudad")}
                  placeholder="Madrid, Valencia..."
                  className={inputCls(!!errors.ciudad)}
                />
                <FieldError message={errors.ciudad?.message} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Mensaje
                </label>
                <textarea
                  {...register("mensaje")}
                  rows={4}
                  placeholder="¿Qué te gustaría preguntarnos?"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition focus:border-[#0f766e] focus:outline-none"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 border-t border-gray-100 pt-4">
              <input
                type="checkbox"
                {...register("aceptaPrivacidad")}
                className="mt-0.5 h-4 w-4 rounded accent-[#0f766e]"
              />
              <span className="text-sm text-gray-700">
                Acepto la política de privacidad{" "}
                <span className="text-red-500">*</span>
              </span>
            </label>
            <FieldError message={errors.aceptaPrivacidad?.message} />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-[#0f766e] py-3.5 text-base font-bold text-white transition hover:bg-[#0d6b62] disabled:opacity-60"
            >
              {isSubmitting ? "Enviando..." : "Enviar consulta"}
            </button>
          </form>

          {/* Contacto directo */}
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm text-gray-500">
            <a
              href={`mailto:${SITE_CONFIG.email}`}
              className="inline-flex items-center gap-2 hover:text-gray-900"
            >
              <Mail size={14} /> {SITE_CONFIG.email}
            </a>
            <span className="text-gray-300">·</span>
            <a
              href={`tel:${SITE_CONFIG.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 hover:text-gray-900"
            >
              <Phone size={14} /> {SITE_CONFIG.phone}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
