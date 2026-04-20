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
} from "lucide-react";

function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" fill="#25D366" width="22" height="22" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
import Link from "next/link";
import { checkRateLimit } from "@/utils/sanitize";
import { SITE_CONFIG } from "@/config/siteConfig";
import { STORES } from "@/data/stores";

const schema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100),
  email: z.string().email("Email no válido").max(254),
  telefono: z.string().max(20).optional(),
  asunto: z.string().min(1, "Selecciona un asunto").max(50),
  mensaje: z.string().min(10, "Mínimo 10 caracteres").max(2000),
});

type FormData = z.infer<typeof schema>;

// Lista de contacto por tienda — derivada del registro central (src/data/stores.ts).
// La tienda `calpe` se marca como "Sede" porque coincide con el domicilio operativo.
const STORES_CONTACT = Object.values(STORES).map((s) => ({
  name: s.id === "calpe" ? "Sede (Calpe)" : s.city.split(",")[0]?.trim() ?? s.name,
  phone: s.phone,
  id: s.id,
}));

const WHATSAPP_NUMBER = SITE_CONFIG.phone.replace(/\D/g, "");
const CONTACT_EMAIL = SITE_CONFIG.email;
const CONTACT_PHONE = SITE_CONFIG.phone;

export default function ContactoPage() {
  const [submitted, setSubmitted] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!checkRateLimit("contact-form", 3, 86_400_000)) {
      setRateLimited(true);
      return;
    }
    setRateLimited(false);
    await new Promise((r) => setTimeout(r, 600));
    // Open mailto with form data (static site — no server)
    const subject = encodeURIComponent("Nuevo mensaje a través de la página web");
    const body = encodeURIComponent(
      `Nombre: ${data.nombre}\nEmail: ${data.email}\nTeléfono: ${data.telefono ?? "—"}\nAsunto: ${data.asunto}\n\n${data.mensaje}`,
    );
    window.open(`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`);
    setSubmitted(true);
  };

  return (
    <div>
      {/* Hero */}
      <div className="border-b border-gray-100 bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-[1400px] px-6 text-center">
          <h1 className="mb-3 text-3xl font-bold text-gray-900 md:text-5xl">Contacto</h1>
          <p className="mx-auto max-w-lg text-base text-gray-600 sm:text-lg">
            Estamos aquí para ayudarte. Escríbenos y te respondemos en menos de
            24 horas.
          </p>
        </div>
      </div>

      {/* Contact cards */}
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <div className="mb-12 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center transition hover:shadow-md">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "#25d36615" }}>
              <IconWhatsApp />
            </div>
            <p className="mb-1 font-bold text-gray-900">WhatsApp</p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:underline"
              style={{ color: "#25d366" }}
            >
              Escríbenos por WhatsApp
            </a>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center transition hover:shadow-md">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "#16a34a15" }}>
              <Phone size={22} style={{ color: "#16a34a" }} />
            </div>
            <p className="mb-1 font-bold text-gray-900">Teléfono</p>
            <a href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`} className="text-sm font-medium hover:underline" style={{ color: "#16a34a" }}>
              {CONTACT_PHONE}
            </a>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center transition hover:shadow-md">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "#2563eb15" }}>
              <Mail size={22} style={{ color: "#2563eb" }} />
            </div>
            <p className="mb-1 font-bold text-gray-900">Email</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm font-medium hover:underline" style={{ color: "#2563eb" }}>
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-12 text-center">
                <CheckCircle size={56} className="mx-auto mb-4 text-green-500" />
                <h2 className="mb-2 text-2xl font-bold text-gray-900">
                  Tu mensaje se ha enviado correctamente
                </h2>
                <p className="text-gray-600">
                  Pronto recibirás una respuesta.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5 rounded-2xl border border-gray-200 bg-white p-8"
              >
                <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                  <Send size={20} className="text-[#2563eb]" /> Enviar
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

                {rateLimited && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    Has alcanzado el límite de mensajes. Inténtalo de nuevo mañana.
                  </p>
                )}
                {/* GDPR notice — Art. 13 RGPD */}
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-[11px] leading-relaxed text-blue-700">
                  <p>
                    <span className="font-semibold">Protección de datos:</span>{" "}
                    Tus datos serán tratados por TCG HOBBY, S.L. con la
                    finalidad de responder a tu consulta (base legal: interés
                    legítimo, art. 6.1.f RGPD). No se cederán a terceros. Puedes
                    ejercer tus derechos en{" "}
                    <Link
                      href="/privacidad"
                      className="font-medium underline"
                    >
                      política de privacidad
                    </Link>
                    .
                  </p>
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
                  <IconWhatsApp />
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
