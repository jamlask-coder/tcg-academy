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
      <section className="relative min-h-[500px] md:min-h-[580px] bg-[#0f172a] text-white overflow-hidden flex items-center">
        {/* Multi-layer gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a3a5c] via-[#0f172a] to-[#1e1b4b]" />
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full blur-[100px] opacity-30"
            style={{
              background:
                "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[80px] opacity-20"
            style={{
              background:
                "radial-gradient(circle, #a855f7 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full blur-[60px] opacity-15"
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

        <div className="relative w-full max-w-[1180px] mx-auto px-6 py-16 md:py-24">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
              <Star size={13} className="fill-yellow-400 text-yellow-400" />
              La tienda TCG líder en España — +10.000 referencias
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.08] tracking-tight mb-6">
              El mayor catálogo TCG
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-300">
                de España
              </span>
            </h1>

            <p className="text-lg md:text-xl text-blue-200/80 mb-10 leading-relaxed max-w-xl">
              Pokémon, Magic, One Piece, Riftbound y más.
              <br className="hidden md:block" />
              Envío en menos de 24 horas. 4 tiendas físicas.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-14">
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-2 bg-yellow-400 text-[#0f172a] font-black px-7 py-4 rounded-2xl hover:bg-yellow-300 active:scale-[0.98] transition-all shadow-[0_0_40px_rgba(251,191,36,0.25)]"
              >
                Explorar catálogo <ArrowRight size={18} />
              </Link>
              <Link
                href="/catalogo?filter=nuevo"
                className="inline-flex items-center gap-2 bg-white/8 border border-white/15 text-white font-semibold px-7 py-4 rounded-2xl hover:bg-white/14 active:scale-[0.98] transition-all"
              >
                <Zap size={16} className="text-yellow-400" /> Novedades de la
                semana
              </Link>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6 md:gap-10 pt-8 border-t border-white/10">
              {[
                ["10.000+", "Productos"],
                ["4", "Tiendas físicas"],
                ["500+", "Mayoristas"],
                ["24h", "Envío express"],
              ].map(([n, l]) => (
                <div key={l} className="flex flex-col gap-0.5">
                  <span className="text-2xl font-black text-yellow-400 leading-none">
                    {n}
                  </span>
                  <span className="text-xs text-blue-300/70 font-medium uppercase tracking-wide">
                    {l}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR — staggered fade-in on scroll */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-[1180px] mx-auto px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}14` }}
                >
                  <Icon size={18} style={{ color: color as string }} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-800 leading-tight">
                    {title as string}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-tight">
                    {sub as string}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GAMES GRID */}
      <section className="max-w-[1180px] mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Juegos TCG
            </h2>
            <p className="text-gray-500 mt-1">Explora cada universo</p>
          </div>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
          {games.map(([slug, { name, color, bgColor, emoji }]) => (
            <Link
              key={slug}
              href={`/${slug}`}
              className="group flex flex-col items-center text-center p-3 rounded-2xl border-2 border-transparent hover:shadow-lg transition-all"
              style={{ backgroundColor: bgColor }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-2 shadow-md group-hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              >
                {emoji}
              </div>
              <span
                className="font-bold text-[10px] leading-tight text-center"
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
        <section className="max-w-[1180px] mx-auto px-6 pb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Novedades
              </h2>
              <p className="text-gray-500 mt-1">Los ultimos lanzamientos</p>
            </div>
            <Link
              href="/catalogo"
              className="text-sm font-semibold text-[#1a3a5c] hover:underline flex items-center gap-1"
            >
              Ver todo <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {newProducts.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* FEATURED PRODUCTS */}
      <section className="max-w-[1180px] mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Productos Destacados
            </h2>
            <p className="text-gray-500 mt-1">
              Los mas populares de cada juego
            </p>
          </div>
          <Link
            href="/catalogo"
            className="text-sm font-semibold text-[#1a3a5c] hover:underline flex items-center gap-1"
          >
            Ver catalogo <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {featuredProducts.map((p) => (
            <LocalProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* STORES */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Nuestras Tiendas Fisicas
            </h2>
            <p className="text-gray-400">
              Visitanos en persona — eventos, torneos y atencion personalizada
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STORES.map(({ name, city, href, color }) => (
              <Link
                key={href}
                href={href}
                className="group p-6 rounded-2xl border border-gray-700 hover:border-gray-500 transition bg-gray-800"
              >
                <div
                  className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: color }}
                >
                  {name[0]}
                </div>
                <div className="font-bold text-white">{name}</div>
                <div className="text-sm text-gray-400 mt-0.5">{city}</div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-3 group-hover:text-gray-300 transition">
                  Ver tienda <ArrowRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* BUSINESS OPPORTUNITIES */}
      <section className="max-w-[1180px] mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            ¿Quieres emprender en el mundo TCG?
          </h2>
          <p className="text-gray-500">
            Dos formas de crecer con nosotros, sin experiencia previa necesaria
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/vending"
            className="group relative bg-gradient-to-br from-[#1a3a5c] to-[#2d6a9f] rounded-2xl p-8 text-white overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1"
          >
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-yellow-400 blur-2xl" />
            </div>
            <div className="relative">
              <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center mb-4">
                <ShoppingBag size={24} className="text-yellow-400" />
              </div>
              <span className="text-xs font-bold bg-yellow-400 text-[#1a3a5c] px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-3 inline-block">
                Próximamente
              </span>
              <h3 className="text-xl font-bold mb-2">Máquinas Vending TCG</h3>
              <p className="text-blue-200 text-sm leading-relaxed mb-4">
                Ingresos pasivos 24/7 con nuestras máquinas de cartas
                coleccionables. Sin personal ni horarios.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-yellow-400 group-hover:gap-2 transition-all">
                Saber más <ArrowRight size={14} />
              </span>
            </div>
          </Link>

          <Link
            href="/franquicias"
            className="group relative bg-gradient-to-br from-[#0f766e] to-[#0d9488] rounded-2xl p-8 text-white overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1"
          >
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white blur-2xl" />
            </div>
            <div className="relative">
              <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center mb-4">
                <Store size={24} className="text-white" />
              </div>
              <span className="text-xs font-bold bg-white text-[#0f766e] px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-3 inline-block">
                Oportunidad de negocio
              </span>
              <h3 className="text-xl font-bold mb-2">Monta tu tienda TCG</h3>
              <p className="text-teal-100 text-sm leading-relaxed mb-4">
                Abre tu propia tienda TCG con todo el respaldo de TCG Academy:
                stock, formación, marketing y soporte.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-white group-hover:gap-2 transition-all">
                Ver el modelo <ArrowRight size={14} />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* B2B BANNER */}
      <section className="bg-gradient-to-r from-[#1a3a5c] to-[#2d6a9f] py-16">
        <div className="max-w-[1180px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="text-yellow-400 font-bold text-sm uppercase tracking-wider mb-2">
              Para profesionales
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Zona Mayoristas B2B
            </h2>
            <p className="text-blue-200 max-w-lg">
              Precios especiales para distribuidores y tiendas. Descuentos por
              volumen hasta el 30%. Mas de 500 mayoristas ya confian en
              nosotros.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link
              href="/mayoristas"
              className="inline-flex items-center gap-2 bg-yellow-400 text-[#1a3a5c] font-bold px-8 py-4 rounded-xl hover:bg-yellow-300 transition shadow-xl text-lg"
            >
              Solicitar acceso B2B <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
