"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  Package2,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  Boxes,
} from "lucide-react";
import { checkRateLimit } from "@/utils/sanitize";
import { SITE_CONFIG } from "@/config/siteConfig";
import { addSolicitud } from "@/services/solicitudService";

const schema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(200),
  email: z.string().email("Email no válido"),
  telefono: z.string().regex(/^[+]?[\d\s\-()]{9,15}$/, "Teléfono no válido"),
  ubicacion: z.string().min(2, "Indica ciudad o ubicación").max(300),
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
      : "border-gray-200 focus:border-[#7c3aed]"
  }`;
}

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
      addSolicitud({
        id: crypto.randomUUID(),
        tipo: "vending",
        datos: data,
      });
    } catch {
      // localStorage may be unavailable
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white px-6 py-20">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-purple-100">
            <CheckCircle2 size={40} className="text-purple-600" />
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
            className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-6 py-3 font-semibold text-white transition hover:bg-[#6d28d9]"
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
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[#7c3aed]">
              <Package2 size={22} />
            </div>
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900 md:text-4xl">
                Máquinas Vending TCG
              </h1>
              <p className="max-w-2xl text-base text-gray-600">
                Vendemos máquinas vending pensadas para producto TCG. Si lo
                deseas, también te suministramos el producto desde nuestro
                catálogo. Escríbenos sin compromiso.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Qué ofrecemos */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-[1000px] px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-[#7c3aed]">
                <Package2 size={18} />
              </div>
              <h3 className="mb-2 font-bold text-gray-900">
                Vendemos la máquina
              </h3>
              <p className="text-sm leading-relaxed text-gray-500">
                Máquina vending preparada para producto TCG (sobres, blísters,
                accesorios). Tú la instalas donde quieras y operas a tu ritmo.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-[#7c3aed]">
                <Boxes size={18} />
              </div>
              <h3 className="mb-2 font-bold text-gray-900">
                Suministro de producto (opcional)
              </h3>
              <p className="text-sm leading-relaxed text-gray-500">
                Si lo deseas, te suministramos producto desde nuestro catálogo
                con condiciones de cuenta B2B. Sin obligación: puedes comprar
                solo la máquina.
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
                  Ciudad o ubicación <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("ubicacion")}
                  placeholder="Madrid, Valencia..."
                  className={inputCls(!!errors.ubicacion)}
                />
                <FieldError message={errors.ubicacion?.message} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Mensaje
                </label>
                <textarea
                  {...register("mensaje")}
                  rows={4}
                  placeholder="¿Quieres solo la máquina o también suministro? ¿Alguna duda?"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition focus:border-[#7c3aed] focus:outline-none"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 border-t border-gray-100 pt-4">
              <input
                type="checkbox"
                {...register("aceptaPrivacidad")}
                className="mt-0.5 h-4 w-4 rounded accent-[#7c3aed]"
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
              className="w-full rounded-2xl bg-[#7c3aed] py-3.5 text-base font-bold text-white transition hover:bg-[#6d28d9] disabled:opacity-60"
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
