"use client"
import { useState, useMemo } from "react"
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react"
import { PRODUCTS, GAME_CONFIG } from "@/data/products"
import { LocalProductCard } from "@/components/product/LocalProductCard"
import Link from "next/link"

const SORT_OPTIONS = [
  { value: "featured", label: "Destacados primero" },
  { value: "new", label: "Mas recientes" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
]

const PAGE_SIZE = 24

export default function CatalogoPage() {
  const [search, setSearch] = useState("")
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [sort, setSort] = useState("featured")
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [inStockOnly, setInStockOnly] = useState(false)

  const games = Object.entries(GAME_CONFIG)

  const filtered = useMemo(() => {
    let list = [...PRODUCTS]
    if (selectedGame) list = list.filter((p) => p.game === selectedGame)
    if (inStockOnly) list = list.filter((p) => p.inStock)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    if (sort === "new") list = [...list].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0))
    else if (sort === "featured") list = [...list].sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0))
    else if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price)
    else if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price)
    return list
  }, [selectedGame, inStockOnly, search, sort])

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < filtered.length

  return (
    <div className="max-w-[1180px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Catalogo completo</h1>
        <p className="text-gray-500">{PRODUCTS.length} referencias de los mejores juegos TCG</p>
      </div>

      {/* Game filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => { setSelectedGame(null); setPage(1) }}
          className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition ${
            !selectedGame ? "bg-[#1a3a5c] text-white border-[#1a3a5c]" : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          Todos
        </button>
        {games.map(([slug, { name, color }]) => (
          <button
            key={slug}
            onClick={() => { setSelectedGame(selectedGame === slug ? null : slug); setPage(1) }}
            className="px-4 py-2 rounded-full text-sm font-semibold border-2 transition"
            style={
              selectedGame === slug
                ? { backgroundColor: color, color: "white", borderColor: color }
                : { borderColor: "#e5e7eb", color: "#4b5563" }
            }
          >
            {name}
          </button>
        ))}
      </div>

      {/* Search + sort + filters bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar cartas, sobres, mazos..."
            className="w-full h-11 pl-10 pr-4 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1) }}
            className="h-11 pl-4 pr-9 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition bg-white appearance-none cursor-pointer font-medium text-gray-700"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`h-11 px-4 border-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition ${
            filtersOpen ? "border-[#1a3a5c] bg-[#1a3a5c] text-white" : "border-gray-200 text-gray-700 hover:border-gray-300"
          }`}
        >
          <SlidersHorizontal size={15} /> Filtros
        </button>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6 flex flex-wrap gap-4 items-center">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                inStockOnly ? "bg-[#1a3a5c] border-[#1a3a5c]" : "border-gray-300"
              }`}
              onClick={() => { setInStockOnly(!inStockOnly); setPage(1) }}
            >
              {inStockOnly && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium text-gray-700">Solo en stock</span>
          </label>
          {inStockOnly && (
            <button
              onClick={() => setInStockOnly(false)}
              className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
            >
              <X size={13} /> Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Active game filter label */}
      {selectedGame && (
        <div className="mb-4 text-sm text-gray-500">
          Mostrando:{" "}
          <Link href={`/${selectedGame}`} className="font-semibold text-[#1a3a5c] hover:underline">
            {GAME_CONFIG[selectedGame]?.name ?? selectedGame}
          </Link>
          <button onClick={() => setSelectedGame(null)} className="ml-2 text-gray-400 hover:text-gray-600">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Products grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24">
          <Search size={48} className="mx-auto text-gray-200 mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">No se encontraron productos</h2>
          <p className="text-gray-500 mb-6">Prueba con otros terminos o elimina los filtros</p>
          <button
            onClick={() => { setSearch(""); setSelectedGame(null); setInStockOnly(false) }}
            className="bg-[#1a3a5c] text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#15304d] transition"
          >
            Limpiar todo
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{filtered.length} productos</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {visible.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-10 text-center">
              <button
                onClick={() => setPage((prev) => prev + 1)}
                className="bg-white border-2 border-[#1a3a5c] text-[#1a3a5c] font-bold px-10 py-3.5 rounded-xl hover:bg-[#1a3a5c] hover:text-white transition"
              >
                Cargar mas productos
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
