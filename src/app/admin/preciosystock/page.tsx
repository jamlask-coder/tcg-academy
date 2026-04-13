"use client";
import { useState, useMemo, useEffect } from "react";
import {
  PRODUCTS,
  GAME_CONFIG,
  CATEGORY_LABELS,
  type LocalProduct,
} from "@/data/products";
import { getMergedProducts } from "@/lib/productStore";
import { useDiscounts } from "@/context/DiscountContext";
import { getStockInfo } from "@/utils/stockStatus";
import {
  Search,
  Save,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Copy,
  Trash2,

  ChevronUp,
  Tag,
} from "lucide-react";
import Link from "next/link";

const EMPTY_FORM = {
  name: "",
  game: "",
  category: "",
  price: "",
  wholesalePrice: "",
  storePrice: "",
  description: "",
  language: "es",
  inStock: true,
  isNew: true,
  tags: "",
  stock: "",
  maxPerUser: "",
};
type QuickForm = typeof EMPTY_FORM;

type PriceRow = {
  productId: number;
  price: number;
  wholesalePrice: number;
  storePrice: number;
  costPrice: number;
};

const PAGE_SIZE = 50;

export default function AdminProductosPage() {
  const { priceOverrides, setPriceOverride, saveToStorage } = useDiscounts();

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
  const [edits, setEdits] = useState<Record<number, Partial<PriceRow>>>({});
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
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
  const [stockEdits, setStockEdits] = useState<Record<number, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickForm, setQuickForm] = useState<QuickForm>(EMPTY_FORM);
  const [quickSaved, setQuickSaved] = useState(false);

  const qf = (field: keyof QuickForm, val: string | boolean) =>
    setQuickForm((f) => ({ ...f, [field]: val }));

  const saveQuickProduct = (andAnother: boolean) => {
    const price = parseFloat(quickForm.price) || 0;
    const newProduct = {
      id: Date.now(),
      name: quickForm.name.trim(),
      game: quickForm.game,
      category: quickForm.category,
      price,
      wholesalePrice: parseFloat(quickForm.wholesalePrice) || price * 0.8,
      storePrice: parseFloat(quickForm.storePrice) || price * 0.9,
      description: quickForm.description.trim(),
      language: quickForm.language,
      inStock: quickForm.inStock,
      stock: quickForm.stock ? parseInt(quickForm.stock) : undefined,
      maxPerUser: quickForm.maxPerUser ? parseInt(quickForm.maxPerUser) : undefined,
      isNew: quickForm.isNew,
      tags: quickForm.tags
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean),
      images: [] as string[],
      slug:
        quickForm.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") +
        "-" +
        Date.now(),
    };
    try {
      const existing = JSON.parse(
        localStorage.getItem("tcgacademy_new_products") ?? "[]",
      );
      existing.unshift(newProduct);
      localStorage.setItem("tcgacademy_new_products", JSON.stringify(existing));
      window.dispatchEvent(new Event("tcga:products:updated"));
    } catch {}
    setQuickSaved(true);
    setTimeout(() => setQuickSaved(false), 2000);
    if (andAnother) {
      setQuickForm((f) => ({
        ...EMPTY_FORM,
        game: f.game,
        category: f.category,
      }));
    } else {
      setShowQuickAdd(false);
      setQuickForm(EMPTY_FORM);
    }
  };

  const handleDuplicate = (p: LocalProduct) => {
    try {
      const existing = JSON.parse(
        localStorage.getItem("tcgacademy_new_products") ?? "[]",
      );
      const newId = Date.now();
      existing.push({
        ...p,
        id: newId,
        name: `${p.name} (copia)`,
        slug: `${p.slug}-copia-${newId}`,
      });
      localStorage.setItem("tcgacademy_new_products", JSON.stringify(existing));
      window.dispatchEvent(new Event("tcga:products:updated"));
      alert(`Duplicado: "${p.name} (copia)" — visible en localStorage`);
    } catch {}
  };

  const handleDelete = (id: number) => {
    const next = new Set(deletedIds);
    next.add(id);
    setDeletedIds(next);
    localStorage.setItem(
      "tcgacademy_deleted_products",
      JSON.stringify([...next]),
    );
    setConfirmDelete(null);
  };

  const games = Object.entries(GAME_CONFIG);

  const allCats = useMemo(() => {
    const src = gameFilter
      ? allProducts.filter((p) => p.game === gameFilter)
      : allProducts;
    return [...new Set(src.map((p) => p.category))].sort();
  }, [gameFilter, allProducts]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const filtered = useMemo(() => {
    let list = allProducts.filter((p) => !deletedIds.has(p.id));
    if (gameFilter) list = list.filter((p) => p.game === gameFilter);
    if (catFilter) list = list.filter((p) => p.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [gameFilter, catFilter, search, deletedIds, allProducts]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const getPrice = (
    p: LocalProduct,
    field: "price" | "wholesalePrice" | "storePrice" | "costPrice",
  ) => {
    return edits[p.id]?.[field] ?? priceOverrides[p.id]?.[field] ?? (p[field] ?? 0);
  };

  const handleChange = (
    productId: number,
    field: "price" | "wholesalePrice" | "storePrice" | "costPrice",
    val: string,
  ) => {
    const n = parseFloat(val);
    if (isNaN(n)) return;
    setEdits((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: n },
    }));
  };

  const handleStockChange = (productId: number, val: string) => {
    setStockEdits((prev) => ({ ...prev, [productId]: val }));
  };

  const getStock = (p: LocalProduct): string => {
    if (stockEdits[p.id] !== undefined) return stockEdits[p.id];
    return p.stock !== undefined ? String(p.stock) : "";
  };

  const handleSaveAll = () => {
    for (const [id, changes] of Object.entries(edits)) {
      setPriceOverride(Number(id), changes);
    }
    saveToStorage();
    // Save stock edits to products in localStorage
    if (Object.keys(stockEdits).length > 0) {
      const stored = JSON.parse(localStorage.getItem("tcgacademy_new_products") ?? "[]") as LocalProduct[];
      const stockOverrides = JSON.parse(localStorage.getItem("tcgacademy_stock_overrides") ?? "{}") as Record<string, number | null>;
      for (const [id, val] of Object.entries(stockEdits)) {
        const numId = Number(id);
        const stockVal = val.trim() === "" ? null : parseInt(val);
        // Update in new products if exists there
        const idx = stored.findIndex((sp: LocalProduct) => sp.id === numId);
        if (idx >= 0) {
          stored[idx].stock = stockVal ?? undefined;
          stored[idx].inStock = stockVal === null || stockVal > 0;
        }
        // Always save as override for static products
        stockOverrides[id] = stockVal;
      }
      localStorage.setItem("tcgacademy_new_products", JSON.stringify(stored));
      localStorage.setItem("tcgacademy_stock_overrides", JSON.stringify(stockOverrides));
      window.dispatchEvent(new Event("tcga:products:updated"));
      setStockEdits({});
    }
    setEdits({});
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputCls =
    "w-[70px] h-7 px-1.5 border border-gray-200 rounded-md text-xs text-right focus:outline-none focus:border-[#2563eb] transition";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Precios y Stock
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {filtered.length} productos
          </p>
        </div>
        <div className="flex items-center gap-3">
          {Object.keys(edits).length > 0 && (
            <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-600">
              {Object.keys(edits).length} cambio
              {Object.keys(edits).length !== 1 ? "s" : ""} sin guardar
            </span>
          )}
          {saved && (
            <span className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600">
              ✓ Guardado
            </span>
          )}
          <Link
            href="/admin/descuentos"
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-[#2563eb]/20 px-4 py-2.5 text-sm font-bold text-[#2563eb] transition hover:bg-blue-50"
          >
            <Tag size={15} /> Descuentos
          </Link>
          <button
            onClick={() => setShowQuickAdd((v) => !v)}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-700"
          >
            {showQuickAdd ? (
              <>
                <ChevronUp size={16} /> Cerrar formulario
              </>
            ) : (
              <>
                <Plus size={16} /> Añadir producto
              </>
            )}
          </button>
          <button
            onClick={handleSaveAll}
            disabled={Object.keys(edits).length === 0 && Object.keys(stockEdits).length === 0}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-40"
          >
            <Save size={16} /> Guardar cambios
          </button>
        </div>
      </div>

      {/* Quick add form */}
      {showQuickAdd && (
        <div className="mb-5 rounded-2xl border-2 border-green-200 bg-green-50 p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <Plus size={16} className="text-green-600" /> Añadir producto rápido
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Nombre *
              </label>
              <input
                value={quickForm.name}
                onChange={(e) => qf("name", e.target.value)}
                placeholder="Ej: Pokémon Prismatic Evolutions Booster Box"
                className="h-10 w-full rounded-xl border-2 border-gray-200 bg-white px-3 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Juego *
              </label>
              <div className="relative">
                <select
                  value={quickForm.game}
                  onChange={(e) => qf("game", e.target.value)}
                  className="h-10 w-full appearance-none rounded-xl border-2 border-gray-200 bg-white pr-8 pl-3 text-sm focus:border-green-500 focus:outline-none"
                >
                  <option value="">Selecciona...</option>
                  {Object.entries(GAME_CONFIG).map(([slug, { name }]) => (
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
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Categoría *
              </label>
              <input
                value={quickForm.category}
                onChange={(e) => qf("category", e.target.value)}
                placeholder="booster-box, singles, sleeves..."
                className="h-10 w-full rounded-xl border-2 border-gray-200 bg-white px-3 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                PV Público (€) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={quickForm.price}
                onChange={(e) => qf("price", e.target.value)}
                placeholder="0.00"
                className="h-10 w-full rounded-xl border-2 border-gray-200 bg-white px-3 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                PV Mayorista (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={quickForm.wholesalePrice}
                onChange={(e) => qf("wholesalePrice", e.target.value)}
                placeholder="Auto (80% PVP)"
                className="h-10 w-full rounded-xl border-2 border-gray-200 bg-white px-3 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                PV Tiendas (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={quickForm.storePrice}
                onChange={(e) => qf("storePrice", e.target.value)}
                placeholder="Auto (90% PVP)"
                className="h-10 w-full rounded-xl border-2 border-gray-200 bg-white px-3 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Idioma
              </label>
              <div className="relative">
                <select
                  value={quickForm.language}
                  onChange={(e) => qf("language", e.target.value)}
                  className="h-10 w-full appearance-none rounded-xl border-2 border-gray-200 bg-white pr-8 pl-3 text-sm focus:border-green-500 focus:outline-none"
                >
                  {[
                    ["es", "Español"],
                    ["en", "Inglés"],
                    ["jp", "Japonés"],
                    ["fr", "Francés"],
                    ["de", "Alemán"],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Tags (separados por coma)
              </label>
              <input
                value={quickForm.tags}
                onChange={(e) => qf("tags", e.target.value)}
                placeholder="nuevo, sellado, popular..."
                className="h-10 w-full rounded-xl border-2 border-gray-200 bg-white px-3 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Descripción
              </label>
              <textarea
                value={quickForm.description}
                onChange={(e) => qf("description", e.target.value)}
                rows={2}
                placeholder="Descripción breve del producto..."
                className="w-full resize-none rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Stock (unidades)
              </label>
              <input
                type="number"
                min="0"
                value={quickForm.stock}
                onChange={(e) => qf("stock", e.target.value)}
                placeholder="Ilimitado"
                className="h-10 w-full rounded-xl border-2 border-gray-200 bg-white px-3 text-sm focus:border-green-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-gray-400">Dejar vacío = sin límite de stock</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Máx. por usuario
              </label>
              <input
                type="number"
                min="1"
                value={quickForm.maxPerUser}
                onChange={(e) => qf("maxPerUser", e.target.value)}
                placeholder="Sin límite"
                className="h-10 w-full rounded-xl border-2 border-gray-200 bg-white px-3 text-sm focus:border-green-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-gray-400">Dejar vacío = sin límite por usuario</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
                <input
                  type="checkbox"
                  checked={quickForm.inStock}
                  onChange={(e) => qf("inStock", e.target.checked)}
                  className="h-4 w-4 accent-green-600"
                />
                <span className="font-medium text-gray-700">En stock</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
                <input
                  type="checkbox"
                  checked={quickForm.isNew}
                  onChange={(e) => qf("isNew", e.target.checked)}
                  className="h-4 w-4 accent-green-600"
                />
                <span className="font-medium text-gray-700">Novedad</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3">
              {quickSaved && (
                <span className="text-xs font-semibold text-green-600">
                  ✓ Guardado
                </span>
              )}
              <button
                onClick={() => saveQuickProduct(true)}
                disabled={
                  !quickForm.name.trim() || !quickForm.game || !quickForm.price
                }
                className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-40"
              >
                <Save size={14} /> Guardar y añadir otro
              </button>
              <button
                onClick={() => saveQuickProduct(false)}
                disabled={
                  !quickForm.name.trim() || !quickForm.game || !quickForm.price
                }
                className="flex items-center gap-1.5 rounded-xl bg-[#2563eb] px-3 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-40"
              >
                <Save size={14} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[180px] flex-1">
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
      </div>




      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-3 py-3 text-left font-semibold text-gray-600">
                  Producto
                </th>
                <th className="px-3 py-3 text-center font-semibold whitespace-nowrap text-gray-600">
                  Juego
                </th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap text-gray-600">
                  PV Público
                </th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap text-gray-600">
                  PV Mayorista
                </th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap text-gray-600">
                  PV Tiendas
                </th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap text-gray-600">
                  P. Adquisición
                </th>
                <th className="px-3 py-3 text-center font-semibold whitespace-nowrap text-gray-600">
                  Stock
                </th>
                <th className="hidden px-4 py-3 text-center font-semibold text-gray-600 sm:table-cell">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p, i) => {
                const hasEdit = !!edits[p.id];
                const rowPrice = getPrice(p, "price");
                const rowWholesale = getPrice(p, "wholesalePrice");
                const rowStore = getPrice(p, "storePrice");
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-100 transition hover:bg-gray-50 ${hasEdit ? "bg-amber-50" : ""}`}
                  >
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
                          href={`/producto?id=${p.id}`}
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
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={rowPrice}
                          onChange={(e) =>
                            handleChange(p.id, "price", e.target.value)
                          }
                          className={inputCls}
                        />
                        <span className="ml-0.5 text-xs text-gray-400">€</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={rowWholesale}
                          onChange={(e) =>
                            handleChange(p.id, "wholesalePrice", e.target.value)
                          }
                          className={`${inputCls} border-blue-200 focus:border-blue-500`}
                        />
                        <span className="ml-0.5 text-xs text-gray-400">€</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={rowStore}
                          onChange={(e) =>
                            handleChange(p.id, "storePrice", e.target.value)
                          }
                          className={`${inputCls} border-purple-200 focus:border-purple-500`}
                        />
                        <span className="ml-0.5 text-xs text-gray-400">€</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={getPrice(p, "costPrice") || ""}
                          placeholder="—"
                          onChange={(e) =>
                            handleChange(p.id, "costPrice", e.target.value)
                          }
                          className={`${inputCls} border-violet-200 focus:border-violet-500`}
                        />
                        <span className="ml-0.5 text-xs text-gray-400">€</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {(() => {
                        const val = getStock(p);
                        const numVal = val.trim() === "" ? undefined : parseInt(val);
                        const si = getStockInfo(numVal);
                        const borderCls = si.level === "out" ? "border-red-400 bg-red-50 text-red-600" : si.level === "last" ? "border-red-300 bg-red-50 text-red-600" : si.level === "low" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-gray-200";
                        return (
                          <input
                            type="number"
                            min="0"
                            value={val}
                            placeholder="∞"
                            title={si.label}
                            onChange={(e) => handleStockChange(p.id, e.target.value)}
                            className={`${inputCls} w-16 text-center focus:border-orange-500 ${borderCls}`}
                          />
                        );
                      })()}
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
                        <button
                          onClick={() => handleDuplicate(p)}
                          className="inline-flex items-center rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-400 transition hover:border-blue-300 hover:text-blue-600"
                          title="Duplicar"
                        >
                          <Copy size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">
              {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 transition hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 py-1 text-xs font-semibold text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 transition hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
