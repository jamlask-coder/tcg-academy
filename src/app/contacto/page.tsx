"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  Phone,
  MapPin,
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
  { name: "TCG Academy Calpe", phone: "+34 965 000 001", id: "calpe" },
  { name: "TCG Academy Béjar", phone: "+34 923 000 002", id: "bejar" },
  { name: "TCG Academy Madrid", phone: "+34 910 000 003", id: "madrid" },
  { name: "TCG Academy Barcelona", phone: "+34 930 000 004", id: "barcelona" },
];

const WHATSAPP_NUMBER = "34600000000";

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
    // Rate limit: máximo 3 mensajes cada 24 horas
    if (!checkRateLimit("contact-form", 3, 86_400_000)) {
      alert("Has enviado demasiados mensajes hoy. Por favor, intenta de nuevo mañana.");
      return;
    }
    await new Promise((r) => setTimeout(r, 600));
    setSubmitted(true);
  };

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#2563eb] to-[#3b82f6] py-16 text-white">
        <div className="mx-auto max-w-[1400px] px-6 text-center">
          <h1 className="mb-4 text-3xl font-bold md:text-5xl">Contacto</h1>
          <p className="mx-auto max-w-lg text-lg text-blue-200">
            Estamos aquí para ayudarte. Escríbenos y te respondemos en menos de
            24 horas.
          </p>
        </div>
      </div>

      {/* Contact cards */}
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <div className="mb-12 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Mail,
              title: "Email",
              value: "info@tcgacademy.es",
              href: "mailto:info@tcgacademy.es",
              color: "#2563eb",
            },
            {
              icon: Phone,
              title: "Teléfono",
              value: "+34 900 123 456",
              href: "tel:+34900123456",
              color: "#16a34a",
            },
            {
              icon: MessageSquare,
              title: "WhatsApp",
              value: "Escríbenos por WhatsApp",
              href: `https://wa.me/${WHATSAPP_NUMBER}`,
              color: "#25d366",
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
              <a
                href={href}
                className="text-sm font-medium hover:underline"
                style={{ color }}
                target={href.startsWith("https") ? "_blank" : undefined}
                rel={href.startsWith("https") ? "noopener noreferrer" : undefined}
              >
                {value}
              </a>
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
                  <MessageSquare size={20} className="text-[#2563eb]" /> Enviar
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
                      className={`h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none ${errors.nombre ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#2563eb]"}`}
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
                      className={`h-11 w-full rounded-xl border-2 px-4 text-sm transition focus:outline-none ${errors.email ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#2563eb]"}`}
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
                      className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Asunto *
                    </label>
                    <select
                      {...register("asunto")}
                      className={`h-11 w-full rounded-xl border-2 bg-white px-4 text-sm transition focus:outline-none ${errors.asunto ? "border-red-400" : "border-gray-200 focus:border-[#2563eb]"}`}
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
                    className={`w-full resize-none rounded-xl border-2 px-4 py-3 text-sm transition focus:outline-none ${errors.mensaje ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#2563eb]"}`}
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
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] py-4 font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
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

          {/* Sidebar: tiendas físicas */}
          <div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
                <MapPin size={16} className="text-[#2563eb]" /> Tiendas físicas
              </h3>
              <div className="space-y-4">
                {STORES_CONTACT.map((s) => (
                  <Link
                    key={s.id}
                    href={`/tiendas/${s.id}`}
                    className="group block"
                  >
                    <div className="text-sm font-semibold text-gray-800 transition group-hover:text-[#2563eb]">
                      {s.name}
                    </div>
                    <div className="text-xs text-gray-500">{s.phone}</div>
                  </Link>
                ))}
              </div>
              <div className="mt-5 border-t border-gray-100 pt-4">
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-[#25d366] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1eb855]"
                >
                  <MessageSquare size={16} />
                  Contactar por WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
