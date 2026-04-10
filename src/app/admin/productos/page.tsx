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
  Download,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { calcVAT, IVA_GENERAL } from "@/hooks/usePrice";

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
};
type QuickForm = typeof EMPTY_FORM;

type PriceRow = {
  productId: number;
  price: number;
  wholesalePrice: number;
  storePrice: number;
  costPrice: number;
};

const PAGE_SIZE = 20;

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
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [bulkPct, setBulkPct] = useState("");
  const [bulkField, setBulkField] = useState<
    "price" | "wholesalePrice" | "storePrice"
  >("price");
  const [bulkScope, setBulkScope] = useState<"all" | "game" | "category">(
    "all",
  );
  const [bulkConfirm, setBulkConfirm] = useState<{
    previews: { id: number; name: string; before: number; after: number }[];
  } | null>(null);

  const applyBulkPreview = () => {
    const pct = parseFloat(bulkPct);
    if (isNaN(pct) || pct === 0) return;
    const multiplier = 1 + pct / 100;
    const scope =
      bulkScope === "game" && gameFilter
        ? filtered
        : bulkScope === "category" && catFilter
          ? filtered
          : allProducts.filter((p) => !deletedIds.has(p.id));
    const previews = scope.slice(0, 20).map((p) => {
      const before = getPrice(p, bulkField);
      const after = Math.round(before * multiplier * 100) / 100;
      return { id: p.id, name: p.name, before, after };
    });
    setBulkConfirm({ previews });
  };

  const confirmBulkApply = () => {
    const pct = parseFloat(bulkPct);
    if (isNaN(pct) || pct === 0 || !bulkConfirm) return;
    const multiplier = 1 + pct / 100;
    const scope =
      bulkScope === "game" && gameFilter
        ? filtered
        : bulkScope === "category" && catFilter
          ? filtered
          : allProducts.filter((p) => !deletedIds.has(p.id));
    const newEdits: Record<number, Partial<PriceRow>> = { ...edits };
    for (const p of scope) {
      const before = getPrice(p, bulkField);
      const after = Math.round(before * multiplier * 100) / 100;
      newEdits[p.id] = { ...newEdits[p.id], [bulkField]: after };
    }
    setEdits(newEdits);
    setBulkConfirm(null);
    setBulkPct("");
  };
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

  const exportCSV = () => {
    const rows = [
      [
        "ID",
        "Nombre",
        "Juego",
        "Categoria",
        "PVP c/IVA",
        "PVP s/IVA",
        "PV Mayorista",
        "PV Tiendas TCG Academy",
        "IVA%",
        "Stock",
        "Idioma",
        "Tags",
      ],
    ];
    for (const p of filtered) {
      const price = getPrice(p, "price");
      const { priceWithoutVAT } = calcVAT(price, IVA_GENERAL);
      rows.push([
        String(p.id),
        p.name,
        p.game,
        p.category,
        price.toFixed(2),
        priceWithoutVAT.toFixed(2),
        getPrice(p, "wholesalePrice").toFixed(2),
        getPrice(p, "storePrice").toFixed(2),
        String(IVA_GENERAL),
        p.inStock ? "Sí" : "No",
        p.language,
        p.tags.join("|"),
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "productos.csv";
    a.click();
    URL.revokeObjectURL(url);
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

  const handleSaveAll = () => {
    for (const [id, changes] of Object.entries(edits)) {
      setPriceOverride(Number(id), changes);
    }
    saveToStorage();
    setEdits({});
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputCls =
    "w-24 h-8 px-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-[#2563eb] transition";

  return (
    <div>
      {bulkConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setBulkConfirm(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-bold text-gray-900">
              Confirmar cambio masivo
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Aplicar <strong>{bulkPct}%</strong> a{" "}
              <strong>
                {bulkField === "price"
                  ? "PV Público"
                  : bulkField === "wholesalePrice"
                    ? "mayorista"
                    : "tienda"}
              </strong>
              {" · "}
              <strong>
                {bulkScope === "all"
                  ? "todos los productos"
                  : bulkScope === "game"
                    ? `juego: ${gameFilter}`
                    : `categoría: ${catFilter}`}
              </strong>
            </p>
            <p className="mb-3 text-xs text-gray-400">
              Primeros 20 afectados (muestra):
            </p>
            <div className="mb-4 max-h-52 space-y-1 overflow-y-auto">
              {bulkConfirm.previews.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between border-b border-gray-50 py-1 text-sm"
                >
                  <span className="mr-3 line-clamp-1 flex-1 text-gray-700">
                    {p.name}
                  </span>
                  <span className="mr-2 text-xs text-gray-400 line-through">
                    {p.before.toFixed(2)}€
                  </span>
                  <span className="text-xs font-bold text-[#2563eb]">
                    {p.after.toFixed(2)}€
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setBulkConfirm(null)}
                className="flex-1 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmBulkApply}
                className="flex-1 rounded-xl bg-[#2563eb] py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
              >
                Confirmar y aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestion de precios
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {filtered.length} productos · Edicion inline
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
          <button
            onClick={exportCSV}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-200"
          >
            <Download size={15} /> Exportar CSV
          </button>
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
            disabled={Object.keys(edits).length === 0}
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
                PV Mayoristas (€)
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
                PV Tiendas TCG Academy (€)
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
            <option value="">Todas las categorias</option>
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

      {/* Bulk price toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <span className="text-xs font-bold tracking-wide text-amber-700 uppercase">
          Cambio masivo de precios
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={bulkField}
              onChange={(e) => setBulkField(e.target.value as typeof bulkField)}
              className="h-9 appearance-none rounded-lg border border-amber-300 bg-white pr-8 pl-3 text-xs text-gray-700 focus:border-amber-500 focus:outline-none"
            >
              <option value="price">PV Público</option>
              <option value="wholesalePrice">Mayorista</option>
              <option value="storePrice">Tienda</option>
            </select>
            <ChevronDown
              size={11}
              className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-gray-400"
            />
          </div>
          <div className="relative">
            <select
              value={bulkScope}
              onChange={(e) => setBulkScope(e.target.value as typeof bulkScope)}
              className="h-9 appearance-none rounded-lg border border-amber-300 bg-white pr-8 pl-3 text-xs text-gray-700 focus:border-amber-500 focus:outline-none"
            >
              <option value="all">Todos los productos</option>
              {gameFilter && (
                <option value="game">Solo juego actual ({gameFilter})</option>
              )}
              {catFilter && (
                <option value="category">Solo categoría actual</option>
              )}
            </select>
            <ChevronDown
              size={11}
              className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-gray-400"
            />
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.5"
              value={bulkPct}
              onChange={(e) => setBulkPct(e.target.value)}
              placeholder="+5 o -10"
              className="h-9 w-24 rounded-lg border border-amber-300 bg-white px-3 text-center text-sm focus:border-amber-500 focus:outline-none"
            />
            <span className="text-sm font-bold text-gray-600">%</span>
          </div>
          <button
            onClick={applyBulkPreview}
            disabled={!bulkPct || isNaN(parseFloat(bulkPct))}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-600 disabled:opacity-40"
          >
            <Save size={12} /> Previsualizar y aplicar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-10 px-4 py-3 text-left font-semibold text-gray-600">
                  #
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600">
                  Producto
                </th>
                <th className="px-3 py-3 text-center font-semibold whitespace-nowrap text-gray-600">
                  Juego
                </th>
                <th className="px-3 py-3 text-center font-semibold whitespace-nowrap text-gray-600">
                  Categoria
                </th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap text-[#2563eb]">
                  PV Público
                </th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap text-blue-600">
                  PV Mayorista
                </th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap text-purple-600">
                  PV Tiendas TCG Academy
                </th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap text-violet-600">
                  Precio Adquisición
                </th>
                <th className="hidden px-4 py-3 text-center font-semibold text-gray-500 sm:table-cell">
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
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {(page - 1) * PAGE_SIZE + i + 1}
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
                        <span className="line-clamp-1 max-w-[280px] font-medium text-gray-800">
                          {p.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-semibold text-gray-500 capitalize">
                        {p.game}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs text-gray-400">
                        {CATEGORY_LABELS[p.category] ?? p.category}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center">
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
                    </td>
                    <td className="px-3 py-3 text-right">
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
