import { wc } from "@/lib/woocommerce/client"
import { ProductCard } from "./ProductCard"
import { ProductGridSkeleton } from "./ProductSkeleton"
import { Suspense } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface Props {
  gameSlug: string
  gameName: string
  color: string
  bg: string
  description: string
}

async function GameProducts({ categorySlug }: { categorySlug: string }) {
  let products: Awaited<ReturnType<typeof wc.getProducts>> = []
  try {
    const cats = await wc.getCategories({ slug: categorySlug })
    if (cats.length) {
      products = await wc.getProducts({ category: cats[0].id, per_page: 24, status: "publish" })
    }
  } catch { products = [] }

  if (!products.length) return (
    <div className="col-span-full text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
      <p className="text-lg font-medium mb-1">Catalogo en construccion</p>
      <p className="text-sm">Los productos apareceran cuando WooCommerce este configurado</p>
    </div>
  )
  return (
    <>
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </>
  )
}

export function CatalogPage({ gameSlug, gameName, color, bg, description }: Props) {
  return (
    <div>
      {/* Game Hero Banner */}
      <div className="relative overflow-hidden" style={{ backgroundColor: bg }}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: color }} />
        </div>
        <div className="relative max-w-[1180px] mx-auto px-6 py-14">
          <nav className="flex items-center gap-2 text-sm mb-6 opacity-70" style={{ color }}>
            <Link href="/" className="hover:opacity-100">Inicio</Link>
            <span>/</span>
            <span className="font-semibold">{gameName}</span>
          </nav>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white mb-4 shadow-lg"
            style={{ backgroundColor: color }}>
            {gameName[0]}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3" style={{ color }}>{gameName}</h1>
          <p className="text-gray-600 max-w-xl text-lg">{description}</p>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-[1180px] mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Catalogo {gameName}</h2>
          <Link href="/catalogo" className="text-sm text-[#1a3a5c] hover:underline flex items-center gap-1">
            Ver todo el catalogo <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <Suspense fallback={<ProductGridSkeleton count={10} />}>
            <GameProducts categorySlug={gameSlug} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
