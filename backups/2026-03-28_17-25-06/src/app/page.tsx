import Link from "next/link"
import { ArrowRight, Star, Truck, Shield, Users } from "lucide-react"
import { LocalProductCard } from "@/components/product/LocalProductCard"
import { getFeaturedProducts, getNewProducts, GAME_CONFIG } from "@/data/products"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "TCG Academy — La mejor tienda TCG de Espana",
}

const STORES = [
  { name: "Calpe", city: "Alicante", href: "/tiendas/calpe", color: "#1a3a5c" },
  { name: "Bejar", city: "Salamanca", href: "/tiendas/bejar", color: "#2d6a9f" },
  { name: "Madrid", city: "Madrid", href: "/tiendas/madrid", color: "#dc2626" },
  { name: "Barcelona", city: "Barcelona", href: "/tiendas/barcelona", color: "#7c3aed" },
]

export default function HomePage() {
  const newProducts = getNewProducts(8)
  const featuredProducts = getFeaturedProducts(10)
  const games = Object.entries(GAME_CONFIG)

  return (
    <div>
      {/* HERO */}
      <section className="relative bg-gradient-to-br from-[#1a3a5c] via-[#1e4a73] to-[#2d6a9f] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-yellow-400 blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-purple-500 blur-3xl" />
        </div>
        <div className="relative max-w-[1180px] mx-auto px-6 py-24 md:py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
              <span>La tienda TCG mejor valorada de Espana</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Tu tienda TCG<br /><span className="text-yellow-400">de confianza</span>
            </h1>
            <p className="text-lg text-blue-100 mb-8 leading-relaxed">
              Pokemon, Magic, One Piece, Riftbound, Topps y muchos mas. Miles de referencias, 4 tiendas fisicas y envio en 24h.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/catalogo" className="inline-flex items-center gap-2 bg-yellow-400 text-[#1a3a5c] font-bold px-6 py-3.5 rounded-xl hover:bg-yellow-300 transition shadow-lg">
                Ver catalogo completo <ArrowRight size={18} />
              </Link>
              <Link href="/mayoristas" className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/20 transition">
                Zona Mayoristas B2B
              </Link>
            </div>
            <div className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-white/20">
              {[["10.000+", "Productos"], ["4", "Tiendas fisicas"], ["500+", "Mayoristas"], ["24h", "Envio"]].map(([n, l]) => (
                <div key={l}>
                  <div className="text-2xl font-bold text-yellow-400">{n}</div>
                  <div className="text-sm text-blue-200">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-[1180px] mx-auto px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              [Truck, "Envio gratis +49EUR", "Entrega en 24-48h"],
              [Shield, "Compra segura", "Pago 100% protegido"],
              [Star, "Productos oficiales", "Solo distribuidores oficiales"],
              [Users, "Atencion personalizada", "Chat, telefono y tienda"],
            ].map(([Icon, title, sub], i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon size={20} className="text-[#1a3a5c]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-800 leading-tight">{title as string}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{sub as string}</div>
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
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Juegos TCG</h2>
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
              <span className="font-bold text-[10px] leading-tight text-center" style={{ color }}>{name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* NOVEDADES */}
      {newProducts.length > 0 && (
        <section className="max-w-[1180px] mx-auto px-6 pb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Novedades</h2>
              <p className="text-gray-500 mt-1">Los ultimos lanzamientos</p>
            </div>
            <Link href="/catalogo" className="text-sm font-semibold text-[#1a3a5c] hover:underline flex items-center gap-1">
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
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Productos Destacados</h2>
            <p className="text-gray-500 mt-1">Los mas populares de cada juego</p>
          </div>
          <Link href="/catalogo" className="text-sm font-semibold text-[#1a3a5c] hover:underline flex items-center gap-1">
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
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Nuestras Tiendas Fisicas</h2>
            <p className="text-gray-400">Visitanos en persona — eventos, torneos y atencion personalizada</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STORES.map(({ name, city, href, color }) => (
              <Link key={href} href={href} className="group p-6 rounded-2xl border border-gray-700 hover:border-gray-500 transition bg-gray-800">
                <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: color }}>{name[0]}</div>
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

      {/* B2B BANNER */}
      <section className="bg-gradient-to-r from-[#1a3a5c] to-[#2d6a9f] py-16">
        <div className="max-w-[1180px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="text-yellow-400 font-bold text-sm uppercase tracking-wider mb-2">Para profesionales</div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Zona Mayoristas B2B</h2>
            <p className="text-blue-200 max-w-lg">Precios especiales para distribuidores y tiendas. Descuentos por volumen hasta el 30%. Mas de 500 mayoristas ya confian en nosotros.</p>
          </div>
          <div className="flex-shrink-0">
            <Link href="/mayoristas" className="inline-flex items-center gap-2 bg-yellow-400 text-[#1a3a5c] font-bold px-8 py-4 rounded-xl hover:bg-yellow-300 transition shadow-xl text-lg">
              Solicitar acceso B2B <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
