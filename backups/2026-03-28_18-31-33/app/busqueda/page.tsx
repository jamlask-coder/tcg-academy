"use client"
import { useSearchParams } from "next/navigation"
import { useMemo, Suspense } from "react"
import { PRODUCTS, GAME_CONFIG } from "@/data/products"
import { LocalProductCard } from "@/components/product/LocalProductCard"
import { Search } from "lucide-react"
import Link from "next/link"

function SearchPageContent() {
  const params = useSearchParams()
  const q = (params.get("q") ?? "").trim().toLowerCase()

  const results = useMemo(() => {
    if (!q) return []
    return PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        (GAME_CONFIG[p.game]?.name ?? p.game).toLowerCase().includes(q)
    )
  }, [q])

  return (
    <div className="max-w-[1180px] mx-auto px-6 py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
        {q ? (
          <>
            Resultados para <span className="text-[#1a3a5c]">&quot;{q}&quot;</span>
          </>
        ) : (
          "Busqueda"
        )}
      </h1>

      {!q ? (
        <div className="text-center py-16 text-gray-400">
          <Search size={48} className="mx-auto mb-4 text-gray-200" />
          <p>Introduce un termino de busqueda</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <Search size={48} className="mx-auto text-gray-200 mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Sin resultados</h2>
          <p className="text-gray-500 mb-6">No encontramos nada para &quot;{q}&quot;</p>
          <Link
            href="/catalogo"
            className="bg-[#1a3a5c] text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#15304d] transition inline-block"
          >
            Ver todo el catalogo
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-6">
            {results.length} resultado{results.length !== 1 ? "s" : ""} para &quot;{q}&quot;
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {results.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function BusquedaPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[1180px] mx-auto px-6 py-8">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  )
}
