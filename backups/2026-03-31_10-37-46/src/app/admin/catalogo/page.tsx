"use client";
import { useState, useMemo } from "react";
import {
  Search,
  ArrowLeft,
  Plus,
  ChevronDown,
  X,
  SlidersHorizontal,
} from "lucide-react";
import {
  PRODUCTS,
  GAME_CONFIG,
  type LocalProduct,
} from "@/data/products";
import { GameSelector } from "@/components/admin/GameSelector";
import { ProductAdminCard } from "@/components/admin/ProductAdminCard";
import { ProductEditModal } from "@/components/admin/ProductEditModal";
import { ProductDeleteModal } from "@/components/admin/ProductDeleteModal";

// ─── localStorage keys ────────────────────────────────────────────────────────
const OVERRIDES_KEY = "tcgacademy_product_overrides";
const NEW_PRODUCTS_KEY = "tcgacademy_new_products";
const DELETED_KEY = "tcgacademy_deleted_products";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadProducts(): LocalProduct[] {
  try {
    const overrides = JSON.parse(
      localStorage.getItem(OVERRIDES_KEY) ?? "{}",
    ) as Record<string, Partial<LocalProduct>>;
    const deleted = JSON.parse(
      localStorage.getItem(DELETED_KEY) ?? "[]",
    ) as number[];
    const newProds = JSON.parse(
      localStorage.getItem(NEW_PRODUCTS_KEY) ?? "[]",
    ) as LocalProduct[];

    const base = PRODUCTS.filter((p) => !deleted.includes(p.id)).map((p) =>
      overrides[p.id] ? { ...p, ...overrides[p.id] } : p,
    );
    const extra = newProds.filter((p) => !deleted.includes(p.id));
    return [...base, ...extra];
  } catch {
    return PRODUCTS;
  }
}

function saveOverride(id: number, data: Partial<LocalProduct>) {
  try {
    const overrides = JSON.parse(
      localStorage.getItem(OVERRIDES_KEY) ?? "{}",
    ) as Record<string, Partial<LocalProduct>>;
    overrides[id] = { ...overrides[id], ...data };
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    /* ignore */
  }
}

function markDeleted(id: number) {
  try {
    const deleted = JSON.parse(
      localStorage.getItem(DELETED_KEY) ?? "[]",
    ) as number[];
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem(DELETED_KEY, JSON.stringify(deleted));
    }
  } catch {
    /* ignore */
  }
}

function saveNewProduct(product: LocalProduct) {
  try {
    const list = JSON.parse(
      localStorage.getItem(NEW_PRODUCTS_KEY) ?? "[]",
    ) as LocalProduct[];
    list.push(product);
    localStorage.setItem(NEW_PRODUCTS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function updateNewProduct(product: LocalProduct) {
  try {
    const list = JSON.parse(
      localStorage.getItem(NEW_PRODUCTS_KEY) ?? "[]",
    ) as LocalProduct[];
    const idx = list.findIndex((p) => p.id === product.id);
    if (idx !== -1) {
      list[idx] = product;
      localStorage.setItem(NEW_PRODUCTS_KEY, JSON.stringify(list));
    }
  } catch {
    /* ignore */
  }
}

function getNextId(products: LocalProduct[]): number {
  return products.reduce((max, p) => Math.max(max, p.id), 0) + 1;
}

type SortOption = "name" | "price" | "stock" | "discount";

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function AdminCatalogoPage() {
  const [allProducts, setAllProducts] = useState<LocalProduct[]>(() => loadProducts());
  const [view, setView] = useState<"games" | "products">("games");
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterNoStock, setFilterNoStock] = useState(false);
  const [filterDiscount, setFilterDiscount] = useState(false);
  const [filterNew, setFilterNew] = useState(false);
  const [editProduct, setEditProduct] = useState<LocalProduct | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<LocalProduct | null>(
    null,
  );
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [createForGame, setCreateForGame] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleGameSelect = (game: string | null) => {
    setSelectedGame(game);
    setView("products");
    setSearch("");
    setFilterNoStock(false);
    setFilterDiscount(false);
    setFilterNew(false);
  };

  const handleBack = () => {
    setView("games");
    setSelectedGame(null);
    setSearch("");
  };

  // ── Filtered + sorted product list ──────────────────────────────────────────
  const displayProducts = useMemo(() => {
    let list =
      selectedGame === null
        ? allProducts
        : allProducts.filter((p) => p.game === selectedGame);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (filterNoStock) list = list.filter((p) => !p.inStock);
    if (filterDiscount)
      list = list.filter(
        (p) => p.comparePrice && p.comparePrice > p.price,
      );
    if (filterNew) list = list.filter((p) => p.isNew);

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name, "es");
        case "price":
          return b.price - a.price;
        case "stock":
          return (b.inStock ? 1 : 0) - (a.inStock ? 1 : 0);
        case "discount": {
          const dA = a.comparePrice
            ? 1 - a.price / a.comparePrice
            : 0;
          const dB = b.comparePrice
            ? 1 - b.price / b.comparePrice
            : 0;
          return dB - dA;
        }
        default:
          return 0;
      }
    });
  }, [
    allProducts,
    selectedGame,
    search,
    sortBy,
    filterNoStock,
    filterDiscount,
    filterNew,
  ]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handlePriceChange = (
    id: number,
    field: keyof LocalProduct,
    value: number,
  ) => {
    saveOverride(id, { [field]: value } as Partial<LocalProduct>);
    setAllProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const handleEditSave = (updated: LocalProduct) => {
    const isExisting = allProducts.some((p) => p.id === updated.id);
    if (isExisting) {
      // Could be from PRODUCTS (override) or from new products (direct update)
      const isOriginal = PRODUCTS.some((p) => p.id === updated.id);
      if (isOriginal) {
        saveOverride(updated.id, updated as Partial<LocalProduct>);
      } else {
        updateNewProduct(updated);
      }
      setAllProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
      showToast("Producto actualizado correctamente");
    } else {
      saveNewProduct(updated);
      setAllProducts((prev) => [...prev, updated]);
      showToast("Producto creado correctamente");
    }
    setEditProduct(null);
    setIsCreateMode(false);
  };

  const handleDeleteConfirm = () => {
    if (!deleteProduct) return;
    markDeleted(deleteProduct.id);
    setAllProducts((prev) => prev.filter((p) => p.id !== deleteProduct.id));
    setDeleteProduct(null);
    showToast("Producto eliminado");
  };

  const handleAddProduct = (game?: string) => {
    setCreateForGame(game ?? selectedGame);
    setEditProduct(null);
    setIsCreateMode(true);
  };

  const gameCfg = selectedGame ? GAME_CONFIG[selectedGame] : undefined;
  const activeFiltersCount = [
    filterNoStock,
    filterDiscount,
    filterNew,
  ].filter(Boolean).length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed right-6 bottom-6 z-50 rounded-2xl bg-[#1a3a5c] px-5 py-3 text-sm font-medium text-white shadow-xl">
          ✓ {toast}
        </div>
      )}

      {/* Modals */}
      {(isCreateMode || editProduct !== null) && (
        <ProductEditModal
          key={editProduct?.id ?? "new"}
          product={editProduct}
          defaultGame={createForGame ?? undefined}
          nextId={getNextId(allProducts)}
          onSave={handleEditSave}
          onCancel={() => {
            setEditProduct(null);
            setIsCreateMode(false);
          }}
        />
      )}

      {deleteProduct && (
        <ProductDeleteModal
          product={deleteProduct}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteProduct(null)}
        />
      )}

      {/* ── Games view ─────────────────────────────────────────────────────── */}
      {view === "games" ? (
        <GameSelector
          products={allProducts}
          onSelect={handleGameSelect}
          onAddProduct={() => handleAddProduct()}
        />
      ) : (
        /* ── Products view ───────────────────────────────────────────────── */
        <div>
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                aria-label="Volver a juegos"
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:border-[#1a3a5c] hover:text-[#1a3a5c]"
              >
                <ArrowLeft size={14} /> Juegos
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {gameCfg ? (
                    <>
                      <span className="mr-1">{gameCfg.emoji}</span>
                      {gameCfg.name}
                    </>
                  ) : (
                    "Todos los juegos"
                  )}
                </h1>
                <p className="text-xs text-gray-500">
                  {displayProducts.length} producto
                  {displayProducts.length !== 1 ? "s" : ""}
                  {selectedGame && ` de ${gameCfg?.name}`}
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                handleAddProduct(selectedGame ?? undefined)
              }
              className="flex items-center gap-2 rounded-xl bg-[#1a3a5c] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#15304d]"
            >
              <Plus size={15} />
              {selectedGame
                ? `Añadir a ${gameCfg?.name ?? selectedGame}`
                : "Añadir producto"}
            </button>
          </div>

          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative min-w-0 flex-1">
              <Search
                size={15}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre..."
                className="h-10 w-full rounded-xl border-2 border-gray-200 pr-8 pl-9 text-sm transition focus:border-[#1a3a5c] focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-10 cursor-pointer appearance-none rounded-xl border-2 border-gray-200 bg-white pr-8 pl-3 text-sm font-medium text-gray-700 transition focus:border-[#1a3a5c] focus:outline-none"
              >
                <option value="name">Nombre A→Z</option>
                <option value="price">Precio ↓</option>
                <option value="stock">Stock primero</option>
                <option value="discount">Descuento ↓</option>
              </select>
              <ChevronDown
                size={13}
                className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400"
              />
            </div>

            {/* Filters toggle */}
            <button
              aria-label="Filtros"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex h-10 items-center gap-1.5 rounded-xl border-2 px-3 text-sm font-semibold transition ${
                filtersOpen || activeFiltersCount > 0
                  ? "border-[#1a3a5c] bg-[#1a3a5c] text-white"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              <SlidersHorizontal size={14} />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#1a3a5c]">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter panel */}
          {filtersOpen && (
            <div className="mb-4 flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              {(
                [
                  {
                    label: "Sin stock",
                    active: filterNoStock,
                    toggle: () => setFilterNoStock(!filterNoStock),
                  },
                  {
                    label: "Con descuento",
                    active: filterDiscount,
                    toggle: () => setFilterDiscount(!filterDiscount),
                  },
                  {
                    label: "Novedades",
                    active: filterNew,
                    toggle: () => setFilterNew(!filterNew),
                  },
                ] as { label: string; active: boolean; toggle: () => void }[]
              ).map(({ label, active, toggle }) => (
                <button
                  key={label}
                  onClick={toggle}
                  className={`rounded-full border-2 px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? "border-[#1a3a5c] bg-[#1a3a5c] text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => {
                    setFilterNoStock(false);
                    setFilterDiscount(false);
                    setFilterNew(false);
                  }}
                  className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600"
                >
                  <X size={12} /> Limpiar
                </button>
              )}
            </div>
          )}

          {/* Products grid */}
          {displayProducts.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
              <p className="font-medium text-gray-400">
                {search
                  ? `Sin resultados para "${search}"`
                  : "No hay productos"}
              </p>
              <button
                onClick={() => handleAddProduct(selectedGame ?? undefined)}
                className="mt-4 flex items-center gap-1.5 mx-auto rounded-xl bg-[#1a3a5c] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#15304d]"
              >
                <Plus size={14} /> Añadir el primero
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {displayProducts.map((p) => (
                <ProductAdminCard
                  key={p.id}
                  product={p}
                  onEdit={setEditProduct}
                  onDelete={setDeleteProduct}
                  onPriceChange={handlePriceChange}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
