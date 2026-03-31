import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import {
  GAME_CONFIG,
  CATEGORY_LABELS,
  getProductsByGame,
  getProductsByGameFeatured,
  getAllCategories,
} from "@/data/products"
import { LocalProductCard } from "@/components/product/LocalProductCard"
import type { Metadata } from "next"

export function generateStaticParams() {
  return Object.keys(GAME_CONFIG).map((game) => ({ game }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string }>
}): Promise<Metadata> {
  const { game } = await params
  const config = GAME_CONFIG[game]
  return {
    title: config ? `${config.name} — TCG Academy` : "TCG Academy",
  }
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ game: string }>
}) {
  const { game } = await params
  const config = GAME_CONFIG[game]
  if (!config) notFound()

  const { name, color, bgColor, description, emoji } = config
  const categories = getAllCategories(game)
  const featured = getProductsByGameFeatured(game, 8)
  const all = getProductsByGame(game)

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ backgroundColor: bgColor }}>
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div
            className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl"
            style={{ backgroundColor: color }}
          />
        </div>
        <div className="relative max-w-[1180px] mx-auto px-6 py-14">
          <nav className="flex items-center gap-2 text-sm mb-6 opacity-70" style={{ color }}>
            <Link href="/" className="hover:opacity-100">Inicio</Link>
            <span>/</span>
            <span className="font-semibold">{name}</span>
          </nav>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-lg"
            style={{ backgroundColor: color }}
          >
            {emoji}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3" style={{ color }}>{name}</h1>
          <p className="text-gray-600 max-w-xl text-lg">{description}</p>
        </div>
      </div>

      {/* Category nav */}
      {categories.length > 0 && (
        <div className="bg-white border-b border-gray-100 sticky top-[128px] z-30">
          <div className="max-w-[1180px] mx-auto px-6">
            <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
              <Link
                href={`/${game}`}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition"
                style={{ borderColor: color, backgroundColor: color, color: "white" }}
              >
                Todo
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={`/${game}/${cat}`}
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:border-gray-300 transition whitespace-nowrap"
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="max-w-[1180px] mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Destacados</h2>
            <Link
              href={`/${game}`}
              className="text-sm font-semibold flex items-center gap-1 hover:underline"
              style={{ color }}
            >
              Ver todo <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {featured.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* All products */}
      <section className="max-w-[1180px] mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Todo {name} <span className="text-sm font-normal text-gray-400">({all.length} productos)</span>
          </h2>
        </div>
        {all.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-gray-400 font-medium">Catalogo en construccion</p>
            <p className="text-sm text-gray-300 mt-1">Pronto tendras mas productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {all.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
