import { notFound } from "next/navigation"
import Link from "next/link"
import {
  GAME_CONFIG,
  CATEGORY_LABELS,
  PRODUCTS,
  getProductsByGameAndCategory,
  getAllCategories,
} from "@/data/products"
import { LocalProductCard } from "@/components/product/LocalProductCard"
import type { Metadata } from "next"

export function generateStaticParams() {
  const params: { game: string; category: string }[] = []
  const gameKeys = Object.keys(GAME_CONFIG)
  for (const game of gameKeys) {
    const cats = [...new Set(PRODUCTS.filter((p) => p.game === game).map((p) => p.category))]
    for (const category of cats) {
      params.push({ game, category })
    }
  }
  return params
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string; category: string }>
}): Promise<Metadata> {
  const { game, category } = await params
  const config = GAME_CONFIG[game]
  const catLabel = CATEGORY_LABELS[category] ?? category
  return {
    title: config ? `${catLabel} — ${config.name} | TCG Academy` : "TCG Academy",
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ game: string; category: string }>
}) {
  const { game, category } = await params
  const config = GAME_CONFIG[game]
  if (!config) notFound()

  const { name, color, bgColor } = config
  const products = getProductsByGameAndCategory(game, category)
  const allCategories = getAllCategories(game)
  const catLabel = CATEGORY_LABELS[category] ?? category

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ backgroundColor: bgColor }}>
        <div className="relative max-w-[1180px] mx-auto px-6 py-10">
          <nav className="flex items-center gap-2 text-sm mb-4 opacity-70" style={{ color }}>
            <Link href="/" className="hover:opacity-100">Inicio</Link>
            <span>/</span>
            <Link href={`/${game}`} className="hover:opacity-100">{name}</Link>
            <span>/</span>
            <span className="font-semibold">{catLabel}</span>
          </nav>
          <h1 className="text-2xl md:text-4xl font-bold" style={{ color }}>{catLabel}</h1>
          <p className="text-gray-600 mt-2">{name} — {products.length} productos</p>
        </div>
      </div>

      {/* Category nav */}
      <div className="bg-white border-b border-gray-100 sticky-under-nav">
        <div className="max-w-[1180px] mx-auto px-6">
          <div className="flex items-center gap-1 overflow-x-auto py-3">
            <Link
              href={`/${game}`}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:border-gray-300 transition whitespace-nowrap"
            >
              Todo
            </Link>
            {allCategories.map((cat) => (
              <Link
                key={cat}
                href={`/${game}/${cat}`}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition whitespace-nowrap ${
                  cat === category
                    ? "border-transparent text-white"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
                style={cat === category ? { backgroundColor: color, borderColor: color } : undefined}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-[1180px] mx-auto px-6 py-10">
        {products.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-gray-400 font-medium">No hay productos en esta categoria</p>
            <Link href={`/${game}`} className="text-sm mt-2 hover:underline" style={{ color }}>
              Ver todo {name}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
