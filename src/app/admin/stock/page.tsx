"use client";
import { useState, useMemo, useEffect } from "react";
import {
  PRODUCTS,
  GAME_CONFIG,
  CATEGORY_LABELS,
  type LocalProduct,
} from "@/data/products";
import {
  getMergedProducts,
  getProductUrl,
  softDeleteProduct,
  generateLocalProductId,
} from "@/lib/productStore";
import { persistProductPatch, persistNewProduct } from "@/lib/productPersist";
import { getStockInfo } from "@/utils/stockStatus";
import {
  Search,
  Save,
  X,
  ChevronDown,
  Pencil,
  Copy,
  Trash2,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Square,
} from "lucide-react";
import Link from "next/link";

// Sin paginación: el admin prefiere ver todos los productos de un tirón.
// Constante arbitrariamente grande para que `Math.ceil(n/PAGE_SIZE) === 1` siempre.
const PAGE_SIZE = Number.MAX_SAFE_INTEGER;

type StockEdit = {
  stock?: string; // raw input; "" = ilimitado
  maxPerClient?: string;
  maxPerWholesaler?: string;
  maxPerStore?: string;
};

export default function AdminStockPage() {
  // All products: static + admin-created from localStorage
  const [allProducts, setAllProducts] = useState<LocalProduct[]>(PRODUCTS);
  useEffect(() => {
    const load = () => setAllProducts(getMergedProducts());
    load();
    window.addEventListener("tcga:products:updated", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("tcga:products:updated", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  // Local edits (not yet saved)
  const [edits, setEdits] = useState<Record<number, StockEdit>>({});
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<"" | "out" | "low" | "ok">("");
  const [langFilter, setLangFilter] = useState("");
  const [page, setPage] = useState(1);
  const [saved, setSaved] = useState(false);

  const [deletedIds, setDeletedIds] = useState<Set<number>>(() => {
    try {
      return new Set(
        JSON.parse(localStorage.getItem("tcgacademy_deleted_products") ?? "[]"),
      );
    } catch {
      return new Set();
    }
  });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const handleDuplicate = (p: LocalProduct) => {
    try {
      const newId = generateLocalProductId();
      persistNewProduct({
        ...p,
        id: newId,
        name: `${p.name} (copia)`,
        slug: `${p.slug}-copia-${newId}`,
      });
      alert(`Duplicado: "${p.name} (copia)"`);
    } catch {}
  };

  const handleDelete = (id: number) => {
    softDeleteProduct(id);
    setDeletedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setConfirmDelete(null);
    setSelected((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  };

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    selected.forEach((id) => softDeleteProduct(id));
    setDeletedIds((prev) => {
      const next = new Set(prev);
      selected.forEach((id) => next.add(id));
      return next;
    });
    setSelected(new Set());
    setConfirmBulkDelete(false);
  };

  const games = Object.entries(GAME_CONFIG);

  const allCats = useMemo(() => {
    const src = gameFilter
      ? allProducts.filter((p) => p.game === gameFilter)
      : allProducts;
    return [...new Set(src.map((p) => p.category))].sort();
  }, [gameFilter, allProducts]);

  // Idiomas únicos presentes en el catálogo (respetando filtro de juego si lo hay,
  // para no ofrecer idiomas que no existen dentro del juego seleccionado).
  const allLangs = useMemo(() => {
    const src = gameFilter
      ? allProducts.filter((p) => p.game === gameFilter)
      : allProducts;
    return [...new Set(src.map((p) => p.language).filter((l): l is string => !!l))].sort();
  }, [gameFilter, allProducts]);


  const filtered = useMemo(() => {
    let list = allProducts.filter((p) => !deletedIds.has(p.id));
    if (gameFilter) list = list.filter((p) => p.game === gameFilter);
    if (catFilter) list = list.filter((p) => p.category === catFilter);
    if (langFilter) list = list.filter((p) => p.language === langFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (stockFilter) {
      list = list.filter((p) => {
        const s = p.stock;
        if (stockFilter === "out") return s !== undefined && s <= 0;
        if (stockFilter === "low") return s !== undefined && s > 0 && s <= 5;
        if (stockFilter === "ok") return s === undefined || s > 5;
        return true;
      });
    }
    return list;
  }, [gameFilter, catFilter, langFilter, search, deletedIds, allProducts, stockFilter]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allPageSelected =
    paginated.length > 0 && paginated.every((p) => selected.has(p.id));
  const toggleAll = () => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (allPageSelected) paginated.forEach((p) => s.delete(p.id));
      else paginated.forEach((p) => s.add(p.id));
      return s;
    });
  };

  const getStock = (p: LocalProduct): string => {
    if (edits[p.id]?.stock !== undefined) return edits[p.id]!.stock!;
    return p.stock !== undefined ? String(p.stock) : "";
  };

  const getLimit = (p: LocalProduct, field: "maxPerClient" | "maxPerWholesaler" | "maxPerStore"): string => {
    const edit = edits[p.id]?.[field];
    if (edit !== undefined) return edit;
    const val = p[field];
    return val !== undefined ? String(val) : "";
  };

  const updateField = (id: number, field: keyof StockEdit, val: string) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: val },
    }));
  };

  const dirtyCount = Object.keys(edits).length;

  const handleSaveAll = () => {
    if (dirtyCount === 0) return;
    // SSOT: delegamos en `persistProductPatch` — distingue admin-created vs
    // estático y escribe en la colección correcta. La antigua clave
    // `tcgacademy_stock_overrides` queda deprecada.
    for (const [idStr, changes] of Object.entries(edits)) {
      const id = Number(idStr);
      const patch: Partial<LocalProduct> = {};

      if (changes.stock !== undefined) {
        const raw = changes.stock.trim();
        const stockVal = raw === "" ? undefined : parseInt(raw);
        patch.stock = stockVal;
        patch.inStock = stockVal === undefined || stockVal > 0;
      }
      for (const field of ["maxPerClient", "maxPerWholesaler", "maxPerStore"] as const) {
        if (changes[field] === undefined) continue;
        const raw = changes[field]!.trim();
        const val = raw === "" ? undefined : parseInt(raw);
        patch[field] = val;
      }

      if (Object.keys(patch).length > 0) {
        persistProductPatch(id, patch);
      }
    }

    setEdits({});
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDiscard = () => {
    setEdits({});
  };

  const inputCls =
    "w-[80px] h-8 px-1.5 border border-gray-200 rounded-md text-xs text-center focus:outline-none focus:border-[#2563eb] transition";

  // Stats
  const stats = useMemo(() => {
    let out = 0,
      low = 0,
      ok = 0;
    for (const p of allProducts.filter((p) => !deletedIds.has(p.id))) {
      if (p.stock === undefined) ok++;
      else if (p.stock <= 0) out++;
      else if (p.stock <= 5) low++;
      else ok++;
    }
    return { out, low, ok };
  }, [allProducts, deletedIds]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Stock</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filtered.length} productos · solo inventario (sin precios)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirtyCount > 0 && (
            <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-600">
              {dirtyCount} cambio{dirtyCount !== 1 ? "s" : ""} sin guardar
            </span>
          )}
          {saved && (
            <span className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600">
              ✓ Guardado
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          onClick={() => setStockFilter(stockFilter === "out" ? "" : "out")}
          className={`rounded-xl border p-3 text-left transition ${stockFilter === "out" ? "border-red-500 bg-red-50" : "border-gray-200 bg-white hover:border-red-300"}`}
        >
          <p className="text-xs font-semibold text-red-600">Sin stock</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{stats.out}</p>
        </button>
        <button
          onClick={() => setStockFilter(stockFilter === "low" ? "" : "low")}
          className={`rounded-xl border p-3 text-left transition ${stockFilter === "low" ? "border-amber-500 bg-amber-50" : "border-gray-200 bg-white hover:border-amber-300"}`}
        >
          <p className="text-xs font-semibold text-amber-600">Stock bajo (≤5)</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{stats.low}</p>
        </button>
        <button
          onClick={() => setStockFilter(stockFilter === "ok" ? "" : "ok")}
          className={`rounded-xl border p-3 text-left transition ${stockFilter === "ok" ? "border-green-500 bg-green-50" : "border-gray-200 bg-white hover:border-green-300"}`}
        >
          <p className="text-xs font-semibold text-green-600">Con stock</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{stats.ok}</p>
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        {/* Buscador con ancho reducido — al añadir el filtro de idioma ocupaba
            demasiado (2026-04-22). max-w limita su expansión manteniendo grow
            controlado para que no pise a los selects en pantallas estrechas. */}
        <div className="relative min-w-[180px] max-w-[360px] flex-1">
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar producto..."
            className="h-9 w-full rounded-xl border border-gray-200 pr-3 pl-8 text-sm transition focus:border-[#2563eb] focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400"
              aria-label="Limpiar búsqueda"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={gameFilter}
            onChange={(e) => {
              setGameFilter(e.target.value);
              setCatFilter("");
              setLangFilter("");
              setPage(1);
            }}
            className="h-9 appearance-none rounded-xl border border-gray-200 bg-white pr-8 pl-3 text-sm text-gray-700 focus:border-[#2563eb] focus:outline-none"
          >
            <option value="">Todos los juegos</option>
            {games.map(([slug, { name }]) => (
              <option key={slug} value={slug}>
                {name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-gray-400"
          />
        </div>
        <div className="relative">
          <select
            value={catFilter}
            onChange={(e) => {
              setCatFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 appearance-none rounded-xl border border-gray-200 bg-white pr-8 pl-3 text-sm text-gray-700 focus:border-[#2563eb] focus:outline-none"
          >
            <option value="">Todas las categorías</option>
            {allCats.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c] ?? c}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-gray-400"
          />
        </div>
        <div className="relative">
          <select
            value={langFilter}
            onChange={(e) => {
              setLangFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 appearance-none rounded-xl border border-gray-200 bg-white pr-8 pl-3 text-sm text-gray-700 focus:border-[#2563eb] focus:outline-none"
            aria-label="Filtrar por idioma"
          >
            <option value="">Todos los idiomas</option>
            {allLangs.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-gray-400"
          />
        </div>
        {(search || gameFilter || catFilter || langFilter || stockFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setGameFilter("");
              setCatFilter("");
              setLangFilter("");
              setStockFilter("");
              setPage(1);
            }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <X size={12} /> Limpiar
          </button>
        )}
      </div>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl bg-[#2563eb] px-4 py-2.5 text-xs text-white">
          <span className="font-semibold">{selected.size} seleccionados</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              onClick={() => setConfirmBulkDelete(true)}
              className="flex items-center gap-1 rounded-lg bg-red-400/70 px-2.5 py-1.5 transition hover:bg-red-400"
            >
              <Trash2 size={11} /> Eliminar seleccionados
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-2 py-1.5 text-white/60 transition hover:text-white"
              aria-label="Limpiar selección"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-10 px-2 py-3">
                  <button
                    onClick={toggleAll}
                    className="text-gray-400 hover:text-[#2563eb]"
                    aria-label={allPageSelected ? "Deseleccionar todo" : "Seleccionar todo"}
                  >
                    {allPageSelected ? (
                      <CheckSquare size={14} className="text-[#2563eb]" />
                    ) : (
                      <Square size={14} />
                    )}
                  </button>
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600">
                  Producto
                </th>
                <th className="px-3 py-3 text-center font-semibold whitespace-nowrap text-gray-600">
                  Juego
                </th>
                <th className="px-3 py-3 text-center font-semibold whitespace-nowrap text-gray-600">
                  Stock
                </th>
                <th
                  className="px-3 py-3 text-center font-semibold whitespace-nowrap text-gray-600"
                  title="Máximo acumulado (de por vida) de unidades que un cliente puede comprar. Incluye todos sus pedidos, no solo uno."
                >
                  Máx / clientes
                </th>
                <th
                  className="px-3 py-3 text-center font-semibold whitespace-nowrap text-gray-600"
                  title="Máximo acumulado por mayorista (suma todas sus compras históricas)."
                >
                  Máx / mayoristas
                </th>
                <th
                  className="px-3 py-3 text-center font-semibold whitespace-nowrap text-gray-600"
                  title="Máximo acumulado por tienda (suma todas sus compras históricas)."
                >
                  Máx / tiendas
                </th>
                <th className="hidden px-4 py-3 text-center font-semibold text-gray-600 sm:table-cell">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => {
                const hasEdit = !!edits[p.id];
                const val = getStock(p);
                const numVal = val.trim() === "" ? undefined : parseInt(val);
                const si = getStockInfo(numVal);
                const borderCls =
                  si.level === "out"
                    ? "border-red-400 bg-red-50 text-red-600"
                    : si.level === "last"
                      ? "border-red-300 bg-red-50 text-red-600"
                      : si.level === "low"
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-gray-200";
                const isSelected = selected.has(p.id);
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-100 transition ${
                      hasEdit
                        ? "bg-amber-50"
                        : isSelected
                          ? "bg-blue-50"
                          : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-2 py-3">
                      <button
                        onClick={() => toggleRow(p.id)}
                        className="text-gray-400 hover:text-[#2563eb]"
                        aria-label={isSelected ? "Deseleccionar" : "Seleccionar"}
                      >
                        {isSelected ? (
                          <CheckSquare size={14} className="text-[#2563eb]" />
                        ) : (
                          <Square size={14} />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        {p.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            loading="lazy"
                            className="h-9 w-9 flex-shrink-0 rounded-lg bg-gray-100 object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-base"
                            style={{
                              backgroundColor: `${GAME_CONFIG[p.game]?.color ?? "#2563eb"}18`,
                            }}
                          >
                            {GAME_CONFIG[p.game]?.emoji ?? "🃏"}
                          </div>
                        )}
                        <Link
                          href={getProductUrl(p)}
                          className="line-clamp-1 max-w-[280px] font-medium text-gray-800 hover:text-[#2563eb] hover:underline"
                        >
                          {p.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-semibold text-gray-500">
                        {GAME_CONFIG[p.game]?.name ?? p.game}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={val}
                        placeholder="∞"
                        title={si.label}
                        onChange={(e) =>
                          updateField(p.id, "stock", e.target.value)
                        }
                        className={`${inputCls} ${borderCls}`}
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={getLimit(p, "maxPerClient")}
                        placeholder="∞"
                        title="Unidades máx. por cliente (acumulado histórico)"
                        onChange={(e) =>
                          updateField(p.id, "maxPerClient", e.target.value)
                        }
                        className={inputCls}
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={getLimit(p, "maxPerWholesaler")}
                        placeholder="∞"
                        title="Unidades máx. por mayorista (acumulado histórico)"
                        onChange={(e) =>
                          updateField(p.id, "maxPerWholesaler", e.target.value)
                        }
                        className={inputCls}
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={getLimit(p, "maxPerStore")}
                        placeholder="∞"
                        title="Unidades máx. por tienda (acumulado histórico)"
                        onChange={(e) =>
                          updateField(p.id, "maxPerStore", e.target.value)
                        }
                        className={inputCls}
                      />
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/admin/productos/editar/${p.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-500 transition hover:border-[#2563eb] hover:text-[#2563eb]"
                          title="Editar"
                        >
                          <Pencil size={11} />
                        </Link>
                        <button
                          onClick={() => handleDuplicate(p)}
                          className="inline-flex items-center rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-400 transition hover:border-blue-300 hover:text-blue-600"
                          title="Duplicar"
                        >
                          <Copy size={11} />
                        </button>
                        {confirmDelete === p.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="rounded-lg bg-red-500 px-2 py-1 text-xs font-bold text-white"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(p.id)}
                            className="inline-flex items-center rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-400 transition hover:border-red-300 hover:text-red-500"
                            title="Eliminar"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    No se encontraron productos con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk delete confirmation */}
      {confirmBulkDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setConfirmBulkDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              <h3 className="text-base font-bold text-gray-900">
                Eliminar {selected.size} producto{selected.size !== 1 ? "s" : ""}
              </h3>
            </div>
            <p className="mb-5 text-sm text-gray-600">
              Se marcarán como eliminados y dejarán de aparecer en el catálogo. Se puede revertir borrando <code className="rounded bg-gray-100 px-1">tcgacademy_deleted_products</code> de localStorage.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmBulkDelete(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                <Trash2 size={13} /> Eliminar {selected.size}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed bottom save bar */}
      {dirtyCount > 0 && (
        <div className="sticky bottom-0 z-20 mt-4 flex flex-wrap items-center gap-3 rounded-t-2xl border-t border-gray-200 bg-white px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle size={15} className="text-amber-500" />
            <span className="font-semibold text-gray-800">
              {dirtyCount} producto{dirtyCount !== 1 ? "s" : ""} con cambios sin
              guardar
            </span>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleDiscard}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
            >
              <RotateCcw size={13} /> Descartar
            </button>
            <button
              onClick={handleSaveAll}
              className="flex items-center gap-1.5 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3b82f6]"
            >
              <Save size={13} /> Guardar cambios
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
