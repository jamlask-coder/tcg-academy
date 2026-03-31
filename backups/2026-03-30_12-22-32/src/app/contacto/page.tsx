"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { checkRateLimit } from "@/utils/sanitize";

const schema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100),
  email: z.string().email("Email no válido").max(254),
  telefono: z.string().max(20).optional(),
  asunto: z.string().min(1, "Selecciona un asunto").max(50),
  mensaje: z.string().min(10, "Mínimo 10 caracteres").max(2000),
});

type FormData = z.infer<typeof schema>;

const STORES_CONTACT = [
  { name: "Calpe", phone: "+34 965 000 001", id: "calpe" },
  { name: "Béjar", phone: "+34 923 000 002", id: "bejar" },
  { name: "Madrid", phone: "+34 910 000 003", id: "madrid" },
  { name: "Barcelona", phone: "+34 930 000 004", id: "barcelona" },
];

export default function ContactoPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (_data: FormData) => {
    if (!checkRateLimit("contact-form", 3, 60_000)) {
      alert("Demasiados intentos. Espera un momento antes de enviar de nuevo.");
      return;
    }
    await new Promise((r) => setTimeout(r, 600));
    setSubmitted(true);
  };

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a3a5c] to-[#2d6a9f] py-16 text-white">
        <div className="mx-auto max-w-[1180px] px-6 text-center">
          <h1 className="mb-4 text-3xl font-bold md:text-5xl">Contacto</h1>
          <p className="mx-auto max-w-lg text-lg text-blue-200">
            Estamos aquí para ayudarte. Escríbenos y te respondemos en menos de
            24 horas.
          </p>
        </div>
      </div>

      {/* Contact cards */}
      <div className="mx-auto max-w-[1180px] px-6 py-10">
        <div className="mb-12 grid gap-4 sm:grid-cols-3">
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
            <div
              key={title}
              className="rounded-2xl border border-gray-200 bg-white p-6 text-center transition hover:shadow-md"
            >
              <div
                className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${color}15` }}
              >
                <Icon size={22} style={{ color }} />
              </div>
              <p className="mb-1 font-bold text-gray-900">{title}</p>
              {href ? (
                <a
                  href={href}
                  className="text-sm font-medium hover:underline"
                  style={{ color }}
                >
                  {value}
                </a>
              ) : (
                <p className="text-sm text-gray-600">{value}</p>
              )}
            </div>
          ))}
        </div>

        <div className="grid gap-10 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-12 text-center">
                <CheckCircle
                  size={48}
                  className="mx-auto mb-4 text-green-500"
                />
                <h2 className="mb-2 text-xl font-bold text-gray-900">
                  ¡Mensaje enviado!
                </h2>
                <p className="text-gray-600">
                  Te responderemos en menos de 24 horas en el email indicado.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5 rounded-2xl border border-gray-200 bg-white p-8"
              >
                <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                  <MessageSquare size={20} className="text-[#1a3a5c]" /> Enviar
                  mensaje
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Nombre *
                    </label>
                    <input
                      {...register("nombre")}
                      type="text"
                      placeholder="Tu nombre"
                      className={`h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none ${errors.nombre ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                    />
                    {errors.nombre && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.nombre.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Email *
                    </label>
                    <input
                      {...register("email")}
                      type="email"
                      placeholder="tu@email.com"
                      className={`h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none ${errors.email ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Teléfono{" "}
                      <span className="font-normal text-gray-400">
                        (opcional)
                      </span>
                    </label>
                    <input
                      {...register("telefono")}
                      type="tel"
                      placeholder="+34 600 000 000"
                      className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#1a3a5c] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Asunto *
                    </label>
                    <select
                      {...register("asunto")}
                      className={`h-11 w-full rounded-xl border-2 bg-white px-4 text-sm transition focus:outline-none ${errors.asunto ? "border-red-400" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                    >
                      <option value="">Selecciona un asunto</option>
                      <option value="consulta">Consulta general</option>
                      <option value="pedido">Sobre mi pedido</option>
                      <option value="mayoristas">Información mayoristas</option>
                      <option value="tiendas">Sobre nuestras tiendas</option>
                      <option value="otro">Otro</option>
                    </select>
                    {errors.asunto && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.asunto.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Mensaje *
                  </label>
                  <textarea
                    {...register("mensaje")}
                    rows={5}
                    placeholder="Cuéntanos en qué podemos ayudarte..."
                    className={`w-full resize-none rounded-xl border-2 px-4 py-3 text-sm transition focus:outline-none ${errors.mensaje ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#1a3a5c]"}`}
                  />
                  {errors.mensaje && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.mensaje.message}
                    </p>
                  )}
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
                      <Send size={18} /> Enviar mensaje
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
                <MapPin size={16} className="text-[#1a3a5c]" /> Tiendas físicas
              </h3>
              <div className="space-y-3">
                {STORES_CONTACT.map((s) => (
                  <Link
                    key={s.id}
                    href={`/tiendas/${s.id}`}
                    className="group block"
                  >
                    <div className="text-sm font-semibold text-gray-800 transition group-hover:text-[#1a3a5c]">
                      {s.name}
                    </div>
                    <div className="text-xs text-gray-500">{s.phone}</div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Store map placeholder */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="mb-3 font-bold text-gray-900">Dónde estamos</h3>
              <div className="flex h-48 items-center justify-center rounded-xl bg-gray-100">
                <div className="text-center">
                  <MapPin size={28} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-xs font-medium text-gray-400">
                    Calpe · Béjar · Madrid · Barcelona
                  </p>
                  <p className="mt-1 text-xs text-gray-300">
                    Mapa interactivo próximamente
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
                <Clock size={16} className="text-gray-400" /> Horario de
                atención
              </h3>
              <div className="space-y-2 text-sm">
                {[
                  ["Lunes – Viernes", "10:00 – 19:00"],
                  ["Sábado", "10:00 – 14:00"],
                  ["Domingo", "Cerrado"],
                ].map(([day, hours]) => (
                  <div key={day} className="flex justify-between">
                    <span className="text-gray-600">{day}</span>
                    <span
                      className={`font-semibold ${hours === "Cerrado" ? "text-red-400" : ""}`}
                    >
                      {hours}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
