"use client";
import Link from "next/link";
import {
  ArrowRight,
  Star,
  Truck,
  Shield,
  Users,
  ShoppingBag,
  Store,
  Zap,
  Package,
} from "lucide-react";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import {
  getFeaturedProducts,
  getNewProducts,
  GAME_CONFIG,
} from "@/data/products";

const STORES = [
  { name: "Calpe", city: "Alicante", href: "/tiendas/calpe", color: "#1a3a5c" },
  {
    name: "Bejar",
    city: "Salamanca",
    href: "/tiendas/bejar",
    color: "#2d6a9f",
  },
  { name: "Madrid", city: "Madrid", href: "/tiendas/madrid", color: "#dc2626" },
  {
    name: "Barcelona",
    city: "Barcelona",
    href: "/tiendas/barcelona",
    color: "#7c3aed",
  },
];

export default function HomePage() {
  const newProducts = getNewProducts(8);
  const featuredProducts = getFeaturedProducts(10);
  const games = Object.entries(GAME_CONFIG);

  return (
    <div>
      {/* HERO */}
      <section className="relative flex min-h-[500px] items-center overflow-hidden bg-[#0f172a] text-white md:min-h-[580px]">
        {/* Multi-layer gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a3a5c] via-[#0f172a] to-[#1e1b4b]" />
        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute top-0 left-0 h-[600px] w-[600px] rounded-full opacity-30 blur-[100px]"
            style={{
              background:
                "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full opacity-20 blur-[80px]"
            style={{
              background:
                "radial-gradient(circle, #a855f7 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-1/2 left-1/3 h-[300px] w-[300px] rounded-full opacity-15 blur-[60px]"
            style={{
              background:
                "radial-gradient(circle, #f59e0b 0%, transparent 70%)",
            }}
          />
        </div>
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative mx-auto w-full max-w-[1180px] px-6 py-16 md:py-24">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-1.5 text-sm font-medium text-yellow-300">
              <Star size={13} className="fill-yellow-400 text-yellow-400" />
              La tienda TCG líder en España — +10.000 referencias
            </div>

            {/* Headline */}
            <h1 className="mb-6 text-4xl leading-[1.08] font-black tracking-tight sm:text-5xl md:text-6xl">
              El mayor catálogo TCG
              <br />
              <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
                de España
              </span>
            </h1>

            <p className="mb-10 max-w-xl text-lg leading-relaxed text-blue-200/80 md:text-xl">
              Pokémon, Magic, One Piece, Riftbound y más.
              <br className="hidden md:block" />
              Envío en menos de 24 horas. 4 tiendas físicas.
            </p>

            {/* CTAs */}
            <div className="mb-14 flex flex-wrap gap-3">
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-7 py-4 font-black text-[#0f172a] shadow-[0_0_40px_rgba(251,191,36,0.25)] transition-all hover:bg-yellow-300 active:scale-[0.98]"
              >
                Explorar catálogo <ArrowRight size={18} />
              </Link>
              <Link
                href="/catalogo?filter=nuevo"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-7 py-4 font-semibold text-white transition-all hover:bg-white/14 active:scale-[0.98]"
              >
                <Zap size={16} className="text-yellow-400" /> Novedades de la
                semana
              </Link>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6 border-t border-white/10 pt-8 md:gap-10">
              {[
                ["10.000+", "Productos"],
                ["4", "Tiendas físicas"],
                ["500+", "Mayoristas"],
                ["24h", "Envío express"],
              ].map(([n, l]) => (
                <div key={l} className="flex flex-col gap-0.5">
                  <span className="text-2xl leading-none font-black text-yellow-400">
                    {n}
                  </span>
                  <span className="text-xs font-medium tracking-wide text-blue-300/70 uppercase">
                    {l}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR — staggered fade-in on scroll */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[1180px] px-6 py-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              [Truck, "Envío gratis", "En pedidos desde 149€", "#3b82f6"],
              [Shield, "Compra segura", "Pago 100% protegido", "#16a34a"],
              [
                Package,
                "+10.000 productos",
                "Solo distribuidores ofic.",
                "#7c3aed",
              ],
              [Users, "Atención 24h", "Chat, teléfono y tienda", "#ea580c"],
            ].map(([Icon, title, sub, color], i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-100"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${color}14` }}
                >
                  <Icon size={18} style={{ color: color as string }} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm leading-tight font-bold text-gray-800">
                    {title as string}
                  </div>
                  <div className="mt-0.5 text-xs leading-tight text-gray-500">
                    {sub as string}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GAMES GRID */}
      <section className="mx-auto max-w-[1180px] px-6 py-16">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
              Juegos TCG
            </h2>
            <p className="mt-1 text-gray-500">Explora cada universo</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-9">
          {games.map(([slug, { name, color, bgColor, emoji }]) => (
            <Link
              key={slug}
              href={`/${slug}`}
              className="group flex flex-col items-center rounded-2xl border-2 border-transparent p-3 text-center transition-all hover:shadow-lg"
              style={{ backgroundColor: bgColor }}
            >
              <div
                className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl text-xl shadow-md transition-transform group-hover:scale-110"
                style={{ backgroundColor: color }}
              >
                {emoji}
              </div>
              <span
                className="text-center text-[10px] leading-tight font-bold"
                style={{ color }}
              >
                {name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* NOVEDADES */}
      {newProducts.length > 0 && (
        <section className="mx-auto max-w-[1180px] px-6 pb-16">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
                Novedades
              </h2>
              <p className="mt-1 text-gray-500">Los ultimos lanzamientos</p>
            </div>
            <Link
              href="/catalogo"
              className="flex items-center gap-1 text-sm font-semibold text-[#1a3a5c] hover:underline"
            >
              Ver todo <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {newProducts.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* FEATURED PRODUCTS */}
      <section className="mx-auto max-w-[1180px] px-6 pb-16">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
              Productos Destacados
            </h2>
            <p className="mt-1 text-gray-500">
              Los mas populares de cada juego
            </p>
          </div>
          <Link
            href="/catalogo"
            className="flex items-center gap-1 text-sm font-semibold text-[#1a3a5c] hover:underline"
          >
            Ver catalogo <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {featuredProducts.map((p) => (
            <LocalProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* STORES */}
      <section className="bg-gray-900 py-16 text-white">
        <div className="mx-auto max-w-[1180px] px-6">
          <div className="mb-10 text-center">
            <h2 className="mb-2 text-2xl font-bold md:text-3xl">
              Nuestras Tiendas Fisicas
            </h2>
            <p className="text-gray-400">
              Visitanos en persona — eventos, torneos y atencion personalizada
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STORES.map(({ name, city, href, color }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-2xl border border-gray-700 bg-gray-800 p-6 transition hover:border-gray-500"
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {name[0]}
                </div>
                <div className="font-bold text-white">{name}</div>
                <div className="mt-0.5 text-sm text-gray-400">{city}</div>
                <div className="mt-3 flex items-center gap-1 text-xs text-gray-500 transition group-hover:text-gray-300">
                  Ver tienda <ArrowRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* BUSINESS OPPORTUNITIES */}
      <section className="mx-auto max-w-[1180px] px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
            ¿Quieres emprender en el mundo TCG?
          </h2>
          <p className="text-gray-500">
            Dos formas de crecer con nosotros, sin experiencia previa necesaria
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/vending"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a3a5c] to-[#2d6a9f] p-8 text-white transition-all hover:-translate-y-1 hover:shadow-2xl"
          >
            <div className="pointer-events-none absolute inset-0 opacity-10">
              <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-yellow-400 blur-2xl" />
            </div>
            <div className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <ShoppingBag size={24} className="text-yellow-400" />
              </div>
              <span className="mb-3 inline-block rounded-full bg-yellow-400 px-2.5 py-0.5 text-xs font-bold tracking-wider text-[#1a3a5c] uppercase">
                Próximamente
              </span>
              <h3 className="mb-2 text-xl font-bold">Máquinas Vending TCG</h3>
              <p className="mb-4 text-sm leading-relaxed text-blue-200">
                Ingresos pasivos 24/7 con nuestras máquinas de cartas
                coleccionables. Sin personal ni horarios.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-yellow-400 transition-all group-hover:gap-2">
                Saber más <ArrowRight size={14} />
              </span>
            </div>
          </Link>

          <Link
            href="/franquicias"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f766e] to-[#0d9488] p-8 text-white transition-all hover:-translate-y-1 hover:shadow-2xl"
          >
            <div className="pointer-events-none absolute inset-0 opacity-10">
              <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white blur-2xl" />
            </div>
            <div className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <Store size={24} className="text-white" />
              </div>
              <span className="mb-3 inline-block rounded-full bg-white px-2.5 py-0.5 text-xs font-bold tracking-wider text-[#0f766e] uppercase">
                Oportunidad de negocio
              </span>
              <h3 className="mb-2 text-xl font-bold">Monta tu tienda TCG</h3>
              <p className="mb-4 text-sm leading-relaxed text-teal-100">
                Abre tu propia tienda TCG con todo el respaldo de TCG Academy:
                stock, formación, marketing y soporte.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-white transition-all group-hover:gap-2">
                Ver el modelo <ArrowRight size={14} />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* B2B BANNER */}
      <section className="bg-gradient-to-r from-[#1a3a5c] to-[#2d6a9f] py-16">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-8 px-6 md:flex-row">
          <div>
            <div className="mb-2 text-sm font-bold tracking-wider text-yellow-400 uppercase">
              Para profesionales
            </div>
            <h2 className="mb-3 text-2xl font-bold text-white md:text-3xl">
              Zona Mayoristas B2B
            </h2>
            <p className="max-w-lg text-blue-200">
              Precios especiales para distribuidores y tiendas. Descuentos por
              volumen hasta el 30%. Mas de 500 mayoristas ya confian en
              nosotros.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link
              href="/mayoristas"
              className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-8 py-4 text-lg font-bold text-[#1a3a5c] shadow-xl transition hover:bg-yellow-300"
            >
              Solicitar acceso B2B <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
