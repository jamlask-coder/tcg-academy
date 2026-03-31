"use client";
import { useState } from "react";
import {
  CheckCircle,
  Users,
  Package,
  Clock,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { checkRateLimit, sanitizeFormData } from "@/utils/sanitize";

const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Descuentos por volumen",
    desc: "Hasta un 30% de descuento segun tu volumen de compra mensual",
  },
  {
    icon: Package,
    title: "Stock prioritario",
    desc: "Acceso prioritario a novedades y productos limitados antes que el publico",
  },
  {
    icon: Clock,
    title: "Envio express",
    desc: "Tus pedidos salen el mismo dia si compras antes de las 14:00h",
  },
  {
    icon: Users,
    title: "Gestor dedicado",
    desc: "Un gestor comercial exclusivo para resolver tus pedidos y consultas",
  },
  {
    icon: CheckCircle,
    title: "Catalogo exclusivo",
    desc: "Precios mayorista en mas de 10.000 referencias de los 6 juegos",
  },
  {
    icon: TrendingUp,
    title: "Formacion gratuita",
    desc: "Acceso a formacion sobre productos, novedades y estrategias de venta",
  },
];

const TIERS = [
  { name: "Bronce", min: 0, max: 499, discount: "10%", color: "#cd7f32" },
  { name: "Plata", min: 500, max: 999, discount: "15%", color: "#9ca3af" },
  { name: "Oro", min: 1000, max: 4999, discount: "20%", color: "#f59e0b" },
  { name: "Platino", min: 5000, max: null, discount: "30%", color: "#7c3aed" },
];

export default function MayoristasPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    empresa: "",
    nif: "",
    email: "",
    telefono: "",
    volumen: "",
    mensaje: "",
    juegos: [] as string[],
  });

  const GAMES = [
    "Pokemon",
    "Magic: The Gathering",
    "Yu-Gi-Oh!",
    "Naruto",
    "Lorcana",
    "Dragon Ball Super CG",
  ];

  const toggleGame = (g: string) => {
    setForm((f) => ({
      ...f,
      juegos: f.juegos.includes(g)
        ? f.juegos.filter((x) => x !== g)
        : [...f.juegos, g],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkRateLimit("mayoristas-form", 3, 60_000)) {
      alert("Demasiados intentos. Espera un momento.");
      return;
    }
    sanitizeFormData(form);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitted(true);
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1a3a5c] via-[#1e4a73] to-[#2d6a9f] py-24 text-white">
        <div className="mx-auto max-w-[1180px] px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/20 px-4 py-1.5 text-sm font-semibold text-yellow-300">
            Para distribuidores y tiendas
          </div>
          <h1 className="mb-4 text-4xl font-bold md:text-6xl">
            Zona Mayoristas B2B
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-xl text-blue-200">
            Precios especiales, stock prioritario y atencion personalizada para
            distribuidores, tiendas y coleccionistas profesionales.
          </p>
          <div className="flex flex-wrap justify-center gap-8">
            {[
              ["500+", "Mayoristas activos"],
              ["10.000+", "Referencias"],
              ["30%", "Descuento maximo"],
              ["24h", "Gestion de pedidos"],
            ].map(([n, l]) => (
              <div key={l} className="text-center">
                <div className="text-3xl font-bold text-yellow-400">{n}</div>
                <div className="mt-1 text-sm text-blue-200">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-[1180px] px-6 py-16">
        <h2 className="mb-3 text-center text-2xl font-bold text-gray-900 md:text-3xl">
          Ventajas para mayoristas
        </h2>
        <p className="mb-10 text-center text-gray-500">
          Todo lo que necesitas para hacer crecer tu negocio TCG
        </p>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                <Icon size={22} className="text-[#1a3a5c]" />
              </div>
              <h3 className="mb-2 font-bold text-gray-900">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Discount tiers */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-[1180px] px-6">
          <h2 className="mb-3 text-center text-2xl font-bold text-gray-900 md:text-3xl">
            Tarifas por volumen
          </h2>
          <p className="mb-10 text-center text-gray-500">
            Cuanto mas compras, mas ahorras
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className="rounded-2xl border-2 bg-white p-6 text-center transition hover:shadow-lg"
                style={{ borderColor: tier.color }}
              >
                <div
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full font-bold text-white"
                  style={{ backgroundColor: tier.color }}
                >
                  {tier.name[0]}
                </div>
                <h3 className="mb-1 text-lg font-bold text-gray-900">
                  {tier.name}
                </h3>
                <p
                  className="mb-2 text-3xl font-black"
                  style={{ color: tier.color }}
                >
                  {tier.discount}
                </p>
                <p className="text-xs text-gray-500">
                  {tier.max
                    ? `${tier.min}€ — ${tier.max}€/mes`
                    : `+${tier.min}€/mes`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application form */}
      <section className="mx-auto max-w-[1180px] px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-3 text-center text-2xl font-bold text-gray-900 md:text-3xl">
            Solicitar acceso mayorista
          </h2>
          <p className="mb-10 text-center text-gray-500">
            Rellena el formulario y un gestor te contactara en menos de 24h
          </p>

          {submitted ? (
            <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-10 text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <h3 className="mb-2 text-xl font-bold text-gray-900">
                Solicitud recibida
              </h3>
              <p className="text-gray-600">
                Nuestro equipo comercial revisara tu solicitud y te contactara
                en menos de 24 horas.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-2xl border border-gray-200 bg-white p-8"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Empresa *
                  </label>
                  <input
                    required
                    type="text"
                    maxLength={200}
                    value={form.empresa}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, empresa: e.target.value }))
                    }
                    placeholder="Nombre de tu empresa"
                    className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#1a3a5c] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    NIF / CIF *
                  </label>
                  <input
                    required
                    type="text"
                    maxLength={15}
                    value={form.nif}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nif: e.target.value }))
                    }
                    placeholder="B12345678"
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
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="contacto@empresa.com"
                    className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#1a3a5c] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Telefono
                  </label>
                  <input
                    type="tel"
                    maxLength={20}
                    value={form.telefono}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, telefono: e.target.value }))
                    }
                    placeholder="+34 600 000 000"
                    className="h-11 w-full rounded-xl border-2 border-gray-200 px-4 text-sm transition focus:border-[#1a3a5c] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Volumen mensual estimado
                </label>
                <select
                  value={form.volumen}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, volumen: e.target.value }))
                  }
                  className="h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 text-sm transition focus:border-[#1a3a5c] focus:outline-none"
                >
                  <option value="">Selecciona un rango</option>
                  <option value="0-500">Menos de 500€/mes</option>
                  <option value="500-1000">500€ - 1.000€/mes</option>
                  <option value="1000-5000">1.000€ - 5.000€/mes</option>
                  <option value="5000+">Mas de 5.000€/mes</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Juegos de interes
                </label>
                <div className="flex flex-wrap gap-2">
                  {GAMES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGame(g)}
                      className={`rounded-xl border-2 px-3 py-1.5 text-sm font-medium transition ${form.juegos.includes(g) ? "border-[#1a3a5c] bg-[#1a3a5c] text-white" : "border-gray-200 text-gray-600 hover:border-[#1a3a5c]"}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Mensaje (opcional)
                </label>
                <textarea
                  value={form.mensaje}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mensaje: e.target.value }))
                  }
                  maxLength={2000}
                  rows={3}
                  placeholder="Cuentanos mas sobre tu negocio..."
                  className="w-full resize-none rounded-xl border-2 border-gray-200 px-4 py-3 text-sm transition focus:border-[#1a3a5c] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a3a5c] py-4 text-base font-bold text-white transition hover:bg-[#15304d]"
              >
                Enviar solicitud <ArrowRight size={18} />
              </button>
              <p className="text-center text-xs text-gray-400">
                Tus datos se tratan conforme a nuestra politica de privacidad.
                Solo usamos tu informacion para gestionar tu solicitud.
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
