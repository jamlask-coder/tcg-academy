"use client";

import { useState } from "react";
import Link from "next/link";
import { SITE_CONFIG } from "@/config/siteConfig";
import { Send, CheckCircle } from "lucide-react";

export default function ReclamacionesPage() {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    pedido: "",
    tipo: "",
    descripcion: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Log the complaint
    try {
      const complaints = JSON.parse(
        localStorage.getItem("tcgacademy_complaints") ?? "[]",
      ) as Array<Record<string, unknown>>;
      complaints.unshift({
        id: `REC-${Date.now()}`,
        ...form,
        status: "recibida",
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("tcgacademy_complaints", JSON.stringify(complaints));
    } catch { /* ignore */ }

    setLoading(false);
    setSubmitted(true);
  };

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="bg-gray-50 py-10 sm:py-12">
      <div className="mx-auto max-w-3xl px-6">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-[#2563eb] hover:underline"
        >
          ← Volver al inicio
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 md:p-12">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Reclamaciones
          </h1>
          <p className="mb-10 text-sm text-gray-400">
            Hojas de reclamaciones y procedimiento de quejas
          </p>

          {/* Info section */}
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-bold text-gray-800">
              Tu derecho a reclamar
            </h2>
            <div className="space-y-3 text-sm leading-relaxed text-gray-600">
              <p>
                En cumplimiento de la legislación española de defensa de los
                consumidores y usuarios (
                <strong>Real Decreto Legislativo 1/2007</strong> — TRLGDCU),{" "}
                {SITE_CONFIG.name} pone a tu disposición este procedimiento de
                reclamaciones.
              </p>
              <p>
                Tienes derecho a presentar una reclamación si consideras que se
                han vulnerado tus derechos como consumidor en relación con
                cualquier compra o servicio prestado por {SITE_CONFIG.name}.
              </p>
            </div>
          </section>

          {/* Process */}
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-bold text-gray-800">
              Procedimiento
            </h2>
            <div className="space-y-3 text-sm leading-relaxed text-gray-600">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="space-y-3">
                  {[
                    { step: "1", text: "Rellena el formulario de reclamación con todos los datos solicitados." },
                    { step: "2", text: "Recibirás un acuse de recibo por email en un plazo máximo de 24 horas." },
                    { step: "3", text: "Estudiaremos tu reclamación y te daremos una respuesta en un plazo máximo de 15 días hábiles." },
                    { step: "4", text: "Si no estás satisfecho con la resolución, puedes acudir a los organismos de consumo o a la plataforma ODR." },
                  ].map((s) => (
                    <div key={s.step} className="flex gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-[10px] font-bold text-white">
                        {s.step}
                      </div>
                      <p className="text-gray-600">{s.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Form */}
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-bold text-gray-800">
              Formulario de reclamación
            </h2>

            {submitted ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
                <CheckCircle size={40} className="mx-auto mb-3 text-green-500" />
                <h3 className="mb-2 text-lg font-bold text-gray-900">
                  Reclamación registrada
                </h3>
                <p className="mb-4 text-sm text-gray-600">
                  Hemos recibido tu reclamación. Recibirás un acuse de recibo
                  por email y una respuesta en un plazo máximo de 15 días
                  hábiles.
                </p>
                <Link
                  href="/"
                  className="text-sm font-semibold text-[#2563eb] hover:underline"
                >
                  Volver al inicio
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Nombre completo *
                    </label>
                    <input
                      required
                      maxLength={200}
                      value={form.nombre}
                      onChange={set("nombre")}
                      className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      maxLength={254}
                      value={form.email}
                      onChange={set("email")}
                      className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Número de pedido
                    </label>
                    <input
                      maxLength={30}
                      value={form.pedido}
                      onChange={set("pedido")}
                      placeholder="TCG-XXXXXX-XXXXXX"
                      className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Tipo de reclamación *
                    </label>
                    <select
                      required
                      value={form.tipo}
                      onChange={set("tipo")}
                      className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#2563eb] focus:outline-none"
                    >
                      <option value="">Seleccionar</option>
                      <option value="producto_defectuoso">Producto defectuoso</option>
                      <option value="error_envio">Error en el envío</option>
                      <option value="retraso_entrega">Retraso en la entrega</option>
                      <option value="cobro_incorrecto">Cobro incorrecto</option>
                      <option value="atencion_cliente">Atención al cliente</option>
                      <option value="proteccion_datos">Protección de datos</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Descripción detallada de la reclamación *
                  </label>
                  <textarea
                    required
                    maxLength={2000}
                    rows={5}
                    value={form.descripcion}
                    onChange={set("descripcion")}
                    placeholder="Describe con detalle el motivo de tu reclamación, incluyendo fechas, importes y cualquier información relevante."
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition focus:border-[#2563eb] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-6 font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
                >
                  {loading ? (
                    "Enviando..."
                  ) : (
                    <>
                      <Send size={16} /> Enviar reclamación
                    </>
                  )}
                </button>
              </form>
            )}
          </section>

          {/* External bodies */}
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-bold text-gray-800">
              Organismos de consumo
            </h2>
            <div className="space-y-3 text-sm leading-relaxed text-gray-600">
              <p>
                Si no estás satisfecho con la resolución de tu reclamación,
                puedes acudir a los siguientes organismos:
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <strong>
                    Oficina Municipal de Información al Consumidor (OMIC)
                  </strong>{" "}
                  de tu municipio.
                </li>
                <li>
                  <strong>
                    Dirección General de Consumo
                  </strong>{" "}
                  de tu Comunidad Autónoma.
                </li>
                <li>
                  <strong>
                    Sistema Arbitral de Consumo
                  </strong>{" "}
                  — resolución extrajudicial de conflictos, gratuita y
                  vinculante.
                </li>
                <li>
                  <strong>Plataforma ODR de la Unión Europea</strong> — para
                  resolución de litigios en línea:{" "}
                  <a
                    href="https://ec.europa.eu/consumers/odr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2563eb] hover:underline"
                  >
                    https://ec.europa.eu/consumers/odr
                  </a>
                </li>
              </ul>
            </div>
          </section>

          {/* Contact */}
          <section className="mb-2">
            <h2 className="mb-3 text-lg font-bold text-gray-800">
              Contacto directo
            </h2>
            <div className="space-y-3 text-sm leading-relaxed text-gray-600">
              <p>
                También puedes contactarnos directamente para resolver cualquier
                incidencia antes de formalizar una reclamación:
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Email:</strong>{" "}
                  <a
                    href={`mailto:${SITE_CONFIG.email}`}
                    className="text-[#2563eb] hover:underline"
                  >
                    {SITE_CONFIG.email}
                  </a>
                </li>
                <li>
                  <strong>Teléfono:</strong> {SITE_CONFIG.phone}
                </li>
                <li>
                  <strong>Formulario general:</strong>{" "}
                  <Link
                    href="/contacto"
                    className="text-[#2563eb] hover:underline"
                  >
                    Página de contacto
                  </Link>
                </li>
              </ul>
            </div>
          </section>

          <div className="mt-10 border-t border-gray-100 pt-6 text-sm text-gray-400">
            ¿Necesitas ayuda?{" "}
            <Link href="/contacto" className="text-[#2563eb] hover:underline">
              Contacta con nosotros
            </Link>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
