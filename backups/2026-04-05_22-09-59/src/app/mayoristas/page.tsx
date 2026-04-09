"use client";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Package,
  Clock,
  Users,
  TrendingUp,
  Headphones,
  ShieldCheck,
  Building2,
  Store,
  Package2,
  ChevronRight,
} from "lucide-react";

const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Precios exclusivos B2B",
    desc: "Tarifas especiales hasta un 30% por debajo del PVP. Cuanto más compras, mejor precio.",
    color: "#2563eb",
  },
  {
    icon: Package,
    title: "Catálogo de +10.000 referencias",
    desc: "Acceso a todos los juegos TCG: Magic, Pokémon, One Piece, Yu-Gi-Oh, Lorcana y más.",
    color: "#7c3aed",
  },
  {
    icon: ShieldCheck,
    title: "Stock garantizado",
    desc: "Almacén propio con reposición constante. Acceso prioritario a novedades y pre-ventas.",
    color: "#16a34a",
  },
  {
    icon: Clock,
    title: "Envío en 24-48h",
    desc: "Logística profesional con GLS. Pedidos antes de las 14:00h salen el mismo día.",
    color: "#0891b2",
  },
  {
    icon: Headphones,
    title: "Gestor de cuenta dedicado",
    desc: "Un gestor exclusivo para ti. Asesoramiento en pedidos, novedades y estrategia.",
    color: "#d97706",
  },
  {
    icon: Users,
    title: "Sin pedido mínimo inicial",
    desc: "Empieza comprando lo que necesitas. Los descuentos por volumen se aplican automáticamente.",
    color: "#dc2626",
  },
];

const SOLUTIONS = [
  {
    icon: Building2,
    title: "Distribución B2B",
    desc: "Para tiendas, distribuidores y empresas que quieren comprar producto TCG a precio profesional.",
    cta: "Solicitar cuenta B2B",
    href: "/mayoristas/b2b",
    color: "#2563eb",
    gradient: "from-[#0f172a] to-[#2563eb]",
  },
  {
    icon: Store,
    title: "Monta tu tienda TCG",
    desc: "Acompañamiento integral para abrir tu propia tienda TCG: catálogo, formación, marketing y soporte.",
    cta: "Saber más",
    href: "/mayoristas/franquicias",
    color: "#0f766e",
    gradient: "from-[#042f2e] to-[#0f766e]",
  },
  {
    icon: Package2,
    title: "Máquinas Vending TCG",
    desc: "Lleva el TCG a centros comerciales, estaciones y zonas de ocio. Ingresos 24/7 sin personal.",
    cta: "Registrar interés",
    href: "/mayoristas/vending",
    color: "#7c3aed",
    gradient: "from-[#2e1065] to-[#7c3aed]",
    badge: "Próximamente",
  },
];

const GAMES = [
  { name: "Magic: The Gathering", abbrev: "MTG", color: "#7c3aed" },
  { name: "Pokémon TCG", abbrev: "PKM", color: "#f59e0b" },
  { name: "One Piece TCG", abbrev: "OP", color: "#dc2626" },
  { name: "Riftbound", abbrev: "RB", color: "#0f766e" },
  { name: "Yu-Gi-Oh!", abbrev: "YGO", color: "#b45309" },
  { name: "Disney Lorcana", abbrev: "LOR", color: "#0891b2" },
  { name: "Dragon Ball SCG", abbrev: "DBS", color: "#d97706" },
  { name: "Naruto Mythos", abbrev: "NAR", color: "#ea580c" },
  { name: "Topps", abbrev: "TPP", color: "#1d4ed8" },
];

const TESTIMONIALS = [
  {
    quote:
      "Llevamos 2 años como distribuidores B2B de TCG Academy. El servicio es impecable y los precios no tienen competencia. Nuestros márgenes han mejorado un 18%.",
    name: "Carlos M.",
    role: "Propietario, La Guarida TCG — Alicante",
    avatar: "CM",
    color: "#2563eb",
  },
  {
    quote:
      "Lo que más valoramos es el gestor de cuenta dedicado. Nos avisa de novedades antes que nadie y siempre tenemos stock de los productos más demandados.",
    name: "Sara P.",
    role: "Gerente, Dragones & Cartas — Barcelona",
    avatar: "SP",
    color: "#7c3aed",
  },
  {
    quote:
      "Empezamos sin pedido mínimo y crecimos poco a poco. Ahora somos clientes Platino con un 30% de descuento. TCG Academy ha sido clave en nuestro crecimiento.",
    name: "Javier L.",
    role: "Director, TCG Universe — Madrid",
    avatar: "JL",
    color: "#16a34a",
  },
];

const TIERS = [
  { name: "Bronce", range: "0 — 499 €/mes", discount: "10%", color: "#cd7f32" },
  {
    name: "Plata",
    range: "500 — 1.999 €/mes",
    discount: "15%",
    color: "#9ca3af",
  },
  {
    name: "Oro",
    range: "2.000 — 9.999 €/mes",
    discount: "20%",
    color: "#f59e0b",
  },
  {
    name: "Platino",
    range: "+10.000 €/mes",
    discount: "30%",
    color: "#7c3aed",
  },
];

export default function MayoristasPage() {
  return (
    <div>
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0f172a] text-white">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
        {/* Glows */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-20 -left-20 h-[500px] w-[500px] rounded-full opacity-20 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, #2563eb 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute -right-20 bottom-0 h-[400px] w-[400px] rounded-full opacity-15 blur-[100px]"
            style={{
              background:
                "radial-gradient(circle, #7c3aed 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-[1400px] px-6 py-24 md:py-32">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-300 uppercase">
            <Building2 size={12} />
            Distribución profesional TCG
          </div>
          <h1 className="mb-6 max-w-3xl text-4xl leading-[1.06] font-black tracking-tight md:text-6xl">
            Distribuidor TCG
            <br />
            <span className="bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent">
              para profesionales
            </span>
          </h1>
          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-slate-300 md:text-xl">
            Precios exclusivos para empresas, tiendas y emprendedores. El mayor
            catálogo TCG de España a tu alcance, con soporte dedicado y envío en
            24h.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/mayoristas/b2b"
              className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-8 py-4 text-base font-black text-[#0f172a] shadow-[0_0_40px_rgba(251,191,36,0.2)] transition hover:bg-yellow-300 active:scale-[0.98]"
            >
              Solicitar cuenta B2B <ArrowRight size={18} />
            </Link>
            <a
              href="mailto:b2b@tcgacademy.es"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/14"
            >
              Hablar con un asesor
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-6 border-t border-white/10 pt-10 sm:grid-cols-4">
            {[
              ["500+", "Distribuidores activos"],
              ["+10.000", "Referencias en catálogo"],
              ["30%", "Descuento máximo"],
              ["24h", "Tiempo de envío"],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="text-3xl font-black text-yellow-400">{n}</div>
                <div className="mt-1 text-sm text-slate-400">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1400px] px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-gray-900 md:text-4xl">
            ¿Por qué elegirnos?
          </h2>
          <p className="mx-auto max-w-xl text-gray-500">
            Somos el socio de distribución TCG más completo de España. Estas son
            nuestras ventajas clave.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:shadow-md"
            >
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${color}14` }}
              >
                <Icon size={22} style={{ color }} />
              </div>
              <h3 className="mb-2 font-bold text-gray-900">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing tiers ─────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-gray-900">
              Descuentos por volumen
            </h2>
            <p className="text-gray-500">
              Cuanto más compras, mayor es tu descuento. Sin compromisos de
              permanencia.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS.map(({ name, range, discount, color }) => (
              <div
                key={name}
                className="overflow-hidden rounded-2xl border-2 bg-white"
                style={{ borderColor: color }}
              >
                <div
                  className="px-6 py-4"
                  style={{ backgroundColor: `${color}14` }}
                >
                  <div
                    className="text-xs font-bold tracking-widest uppercase"
                    style={{ color }}
                  >
                    {name}
                  </div>
                  <div className="mt-1 text-3xl font-black text-gray-900">
                    {discount}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    de descuento
                  </div>
                </div>
                <div className="px-6 py-4">
                  <p className="text-sm text-gray-600">{range}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                    <CheckCircle2 size={13} style={{ color }} />
                    Aplicado automáticamente
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solutions ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1400px] px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-gray-900 md:text-4xl">
            Nuestras soluciones
          </h2>
          <p className="text-gray-500">
            Elige el modelo que mejor se adapta a tu proyecto.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {SOLUTIONS.map(
            ({ icon: Icon, title, desc, cta, href, gradient, badge }) => (
              <Link
                key={href}
                href={href}
                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-8 text-white transition-all hover:-translate-y-1 hover:shadow-2xl`}
              >
                {badge && (
                  <span className="absolute top-4 right-4 rounded-full bg-yellow-400 px-2.5 py-0.5 text-[10px] font-black text-[#0f172a] uppercase">
                    {badge}
                  </span>
                )}
                <div className="pointer-events-none absolute inset-0 opacity-10">
                  <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white blur-3xl" />
                </div>
                <div className="relative">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                    <Icon size={22} />
                  </div>
                  <h3 className="mb-3 text-xl font-bold">{title}</h3>
                  <p className="mb-6 text-sm leading-relaxed text-white/80">
                    {desc}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-yellow-400 transition-all group-hover:gap-2">
                    {cta} <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ),
          )}
        </div>
      </section>

      {/* ── Brands ───────────────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-white py-16">
        <div className="mx-auto max-w-[1400px] px-6">
          <p className="mb-8 text-center text-[11px] font-bold tracking-widest text-gray-400 uppercase">
            Marcas que distribuimos
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {GAMES.map(({ name, abbrev, color }) => (
              <div
                key={name}
                className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-5 py-3 transition hover:border-gray-200"
              >
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[9px] font-black text-white"
                  style={{ backgroundColor: color }}
                >
                  {abbrev}
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-gray-900">
              Más de 500 tiendas confían en nosotros
            </h2>
            <p className="text-gray-500">
              Distribuidores que ya crecen con TCG Academy.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {TESTIMONIALS.map(({ quote, name, role, avatar, color }) => (
              <div
                key={name}
                className="rounded-2xl border border-gray-200 bg-white p-6"
              >
                <div className="mb-4 text-2xl text-gray-200">&ldquo;</div>
                <p className="mb-6 text-sm leading-relaxed text-gray-600">
                  {quote}
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                    style={{ backgroundColor: color }}
                  >
                    {avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{name}</p>
                    <p className="text-xs text-gray-500">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="bg-[#0f172a] py-20 text-white">
        <div className="mx-auto max-w-[1400px] px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            ¿Listo para crecer con nosotros?
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-slate-400">
            Solicita tu cuenta B2B hoy. Activación en 24-48h tras verificación
            de datos.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/mayoristas/b2b"
              className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-8 py-4 text-base font-black text-[#0f172a] transition hover:bg-yellow-300"
            >
              Solicitar cuenta B2B <ChevronRight size={18} />
            </Link>
            <a
              href="mailto:b2b@tcgacademy.es"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/8"
            >
              b2b@tcgacademy.es
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
