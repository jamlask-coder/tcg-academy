"use client"
import { useState, useMemo } from "react"
import { PRODUCTS, GAME_CONFIG, CATEGORY_LABELS, type LocalProduct } from "@/data/products"
import { useDiscounts } from "@/context/DiscountContext"
import { Search, Save, X, ChevronDown, ChevronLeft, ChevronRight, Plus, Pencil, Copy, Trash2, Download } from "lucide-react"
import Link from "next/link"
import { calcVAT, IVA_GENERAL } from "@/hooks/usePrice"

type PriceRow = {
  productId: number
  price: number
  wholesalePrice: number
  storePrice: number
}

const PAGE_SIZE = 20

export default function AdminProductosPage() {
  const { priceOverrides, setPriceOverride, saveToStorage } = useDiscounts()

  // Local edits (not yet saved)
  const [edits, setEdits] = useState<Record<number, Partial<PriceRow>>>({})
  const [search, setSearch] = useState("")
  const [gameFilter, setGameFilter] = useState("")
  const [catFilter, setCatFilter] = useState("")
  const [page, setPage] = useState(1)
  const [saved, setSaved] = useState(false)
  const [deletedIds, setDeletedIds] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("tcgacademy_deleted_products") ?? "[]")) } catch { return new Set() }
  })
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const handleDuplicate = (p: LocalProduct) => {
    try {
      const existing = JSON.parse(localStorage.getItem("tcgacademy_new_products") ?? "[]")
      const newId = Date.now()
      existing.push({ ...p, id: newId, name: `${p.name} (copia)`, slug: `${p.slug}-copia-${newId}` })
      localStorage.setItem("tcgacademy_new_products", JSON.stringify(existing))
      alert(`Duplicado: "${p.name} (copia)" — visible en localStorage`)
    } catch {}
  }

  const handleDelete = (id: number) => {
    const next = new Set(deletedIds)
    next.add(id)
    setDeletedIds(next)
    localStorage.setItem("tcgacademy_deleted_products", JSON.stringify([...next]))
    setConfirmDelete(null)
  }

  const exportCSV = () => {
    const rows = [["ID", "Nombre", "Juego", "Categoria", "PVP c/IVA", "PVP s/IVA", "PVP Mayorista", "PVP Tienda", "IVA%", "Stock", "Idioma", "Tags"]]
    for (const p of filtered) {
      const price = getPrice(p, "price")
      const { priceWithoutVAT } = calcVAT(price, IVA_GENERAL)
      rows.push([
        String(p.id), p.name, p.game, p.category,
        price.toFixed(2), priceWithoutVAT.toFixed(2),
        getPrice(p, "wholesalePrice").toFixed(2),
        getPrice(p, "storePrice").toFixed(2),
        String(IVA_GENERAL),
        p.inStock ? "Sí" : "No",
        p.language, p.tags.join("|"),
      ])
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(";")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "productos.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const games = Object.entries(GAME_CONFIG)

  const allCats = useMemo(() => {
    const src = gameFilter ? PRODUCTS.filter((p) => p.game === gameFilter) : PRODUCTS
    return [...new Set(src.map((p) => p.category))].sort()
  }, [gameFilter])

  const filtered = useMemo(() => {
    let list = PRODUCTS.filter(p => !deletedIds.has(p.id))
    if (gameFilter) list = list.filter((p) => p.game === gameFilter)
    if (catFilter) list = list.filter((p) => p.category === catFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q))
    }
    return list
  }, [gameFilter, catFilter, search, deletedIds])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const getPrice = (p: LocalProduct, field: "price" | "wholesalePrice" | "storePrice") => {
    return edits[p.id]?.[field] ?? priceOverrides[p.id]?.[field] ?? p[field]
  }

  const handleChange = (productId: number, field: "price" | "wholesalePrice" | "storePrice", val: string) => {
    const n = parseFloat(val)
    if (isNaN(n)) return
    setEdits((prev) => ({ ...prev, [productId]: { ...prev[productId], [field]: n } }))
  }

  const handleSaveAll = () => {
    for (const [id, changes] of Object.entries(edits)) {
      setPriceOverride(Number(id), changes)
    }
    saveToStorage()
    setEdits({})
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inputCls = "w-24 h-8 px-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-[#1a3a5c] transition"

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion de precios</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} productos · Edicion inline</p>
        </div>
        <div className="flex items-center gap-3">
          {Object.keys(edits).length > 0 && (
            <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-3 py-1.5 rounded-lg">
              {Object.keys(edits).length} cambio{Object.keys(edits).length !== 1 ? "s" : ""} sin guardar
            </span>
          )}
          {saved && (
            <span className="text-xs text-green-600 font-semibold bg-green-50 px-3 py-1.5 rounded-lg">
              ✓ Guardado
            </span>
          )}
          <button onClick={exportCSV}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-gray-200 transition min-h-[44px]">
            <Download size={15} /> Exportar CSV
          </button>
          <Link href="/admin/productos/nuevo"
            className="flex items-center gap-2 bg-green-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-green-700 transition min-h-[44px]">
            <Plus size={16} /> Nuevo producto
          </Link>
          <button
            onClick={handleSaveAll}
            disabled={Object.keys(edits).length === 0}
            className="flex items-center gap-2 bg-[#1a3a5c] text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-[#15304d] transition disabled:opacity-40 min-h-[44px]"
          >
            <Save size={16} /> Guardar cambios
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar producto..."
            className="w-full h-9 pl-8 pr-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition"
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
        </div>
        <div className="relative">
          <select value={gameFilter} onChange={(e) => { setGameFilter(e.target.value); setCatFilter(""); setPage(1) }}
            className="h-9 pl-3 pr-8 border border-gray-200 rounded-xl text-sm bg-white appearance-none focus:outline-none focus:border-[#1a3a5c] text-gray-700">
            <option value="">Todos los juegos</option>
            {games.map(([slug, { name }]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1) }}
            className="h-9 pl-3 pr-8 border border-gray-200 rounded-xl text-sm bg-white appearance-none focus:outline-none focus:border-[#1a3a5c] text-gray-700">
            <option value="">Todas las categorias</option>
            {allCats.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-10">#</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Producto</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600 whitespace-nowrap">Juego</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600 whitespace-nowrap">Categoria</th>
                <th className="text-right px-3 py-3 font-semibold text-[#1a3a5c] whitespace-nowrap">PVP General</th>
                <th className="text-right px-3 py-3 font-semibold text-blue-600 whitespace-nowrap">PVP Mayorista</th>
                <th className="text-right px-3 py-3 font-semibold text-purple-600 whitespace-nowrap">PVP Tienda</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-500 hidden sm:table-cell">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p, i) => {
                const hasEdit = !!edits[p.id]
                const rowPrice = getPrice(p, "price")
                const rowWholesale = getPrice(p, "wholesalePrice")
                const rowStore = getPrice(p, "storePrice")
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition ${hasEdit ? "bg-amber-50" : ""}`}
                  >
                    <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        {p.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0]} alt={p.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-base"
                            style={{ backgroundColor: `${GAME_CONFIG[p.game]?.color ?? "#1a3a5c"}18` }}>
                            {GAME_CONFIG[p.game]?.emoji ?? "🃏"}
                          </div>
                        )}
                        <span className="font-medium text-gray-800 line-clamp-1 max-w-[280px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-semibold text-gray-500 capitalize">{p.game}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs text-gray-400">{CATEGORY_LABELS[p.category] ?? p.category}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={rowPrice}
                            onChange={(e) => handleChange(p.id, "price", e.target.value)}
                            className={inputCls}
                          />
                          <span className="text-gray-400 ml-0.5 text-xs">€</span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          s/IVA: {calcVAT(rowPrice, IVA_GENERAL).priceWithoutVAT.toFixed(2)}€
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={rowWholesale}
                        onChange={(e) => handleChange(p.id, "wholesalePrice", e.target.value)}
                        className={`${inputCls} border-blue-200 focus:border-blue-500`}
                      />
                      <span className="text-gray-400 ml-0.5 text-xs">€</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={rowStore}
                        onChange={(e) => handleChange(p.id, "storePrice", e.target.value)}
                        className={`${inputCls} border-purple-200 focus:border-purple-500`}
                      />
                      <span className="text-gray-400 ml-0.5 text-xs">€</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/admin/productos/editar/${p.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#1a3a5c] border border-gray-200 px-2 py-1.5 rounded-lg hover:border-[#1a3a5c] transition"
                          title="Editar">
                          <Pencil size={11} />
                        </Link>
                        <button onClick={() => handleDuplicate(p)}
                          className="inline-flex items-center text-xs font-semibold text-gray-400 hover:text-blue-600 border border-gray-200 px-2 py-1.5 rounded-lg hover:border-blue-300 transition"
                          title="Duplicar">
                          <Copy size={11} />
                        </button>
                        {confirmDelete === p.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(p.id)}
                              className="text-xs font-bold text-white bg-red-500 px-2 py-1 rounded-lg">Sí</button>
                            <button onClick={() => setConfirmDelete(null)}
                              className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(p.id)}
                            className="inline-flex items-center text-xs font-semibold text-gray-400 hover:text-red-500 border border-gray-200 px-2 py-1.5 rounded-lg hover:border-red-300 transition"
                            title="Eliminar">
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 py-1 text-xs font-semibold text-gray-700">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
