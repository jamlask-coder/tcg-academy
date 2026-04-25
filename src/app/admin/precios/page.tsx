"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  ChevronUp,
  ChevronDown,
  Save,
  Trash2,
  RotateCcw,
  CheckSquare,
  Square,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Percent,
  RefreshCw,
  ExternalLink,
  Calendar,
} from "lucide-react";
import {
  GAME_CONFIG,
  CATEGORY_LABELS,
  type LocalProduct,
} from "@/data/products";
import { getMergedProducts } from "@/lib/productStore";
import { persistProductPatch } from "@/lib/productPersist";
import Link from "next/link";
import CompetitorPricesModal from "@/components/admin/CompetitorPricesModal";
import {
  getCachedSnapshot,
  refreshCompetitorPrices,
  subscribeCompetitorPrices,
} from "@/services/competitorPriceService";
import type { CompetitorPriceSnapshot } from "@/types/competitorPrice";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PriceRow {
  id: number;
  name: string;
  game: string;
  category: string;
  slug: string;
  image: string;
  language: string; // EN | ES | JP | ... — ayuda a los rivales a descartar versiones en otro idioma
  price: number; // PV Público
  wholesalePrice: number; // PV Mayorista
  storePrice: number; // PV Tiendas
  costPrice?: number; // Precio de adquisición (admin only)
  comparePrice?: number; // precio tachado original
  discountActive: boolean;
  discountStart?: string; // ISO date string
  discountEnd?: string; // ISO date string
}

type SortField = "name" | "price" | "discount" | "discountEnd";
type SortDir = "asc" | "desc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcDiscountPct(price: number, comparePrice?: number): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round((1 - price / comparePrice) * 100);
}

function isExpired(end?: string): boolean {
  if (!end) return false;
  return new Date(end) < new Date();
}

function isExpiringSoon(end?: string): boolean {
  if (!end) return false;
  const diff = new Date(end).getTime() - Date.now();
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
}


function initRows(): PriceRow[] {
  return getMergedProducts()
    .sort((a: LocalProduct, b: LocalProduct) => b.id - a.id)
    .map((p: LocalProduct) => ({
    id: p.id,
    name: p.name,
    game: p.game,
    category: p.category,
    slug: p.slug,
    image: p.images[0] ?? "",
    language: p.language ?? "EN",
    price: p.price,
    wholesalePrice: p.wholesalePrice,
    storePrice: p.storePrice,
    costPrice: p.costPrice,
    comparePrice: p.comparePrice,
    discountActive: p.comparePrice !== undefined && p.comparePrice > p.price,
    discountStart: undefined,
    discountEnd: undefined,
  }));
}


// ─── Inline cell ──────────────────────────────────────────────────────────────

function NumCell({
  value,
  onChange,
  dirty,
  small,
}: {
  value: number;
  onChange: (v: number) => void;
  dirty?: boolean;
  small?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    const n = parseFloat(draft);
    if (!isNaN(n) && n >= 0) onChange(n);
    else setDraft(String(value));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min="0"
        step="0.01"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        className={`w-full rounded border-2 border-[#2563eb] px-1.5 py-0.5 text-right focus:outline-none ${small ? "text-[11px]" : "text-xs"} font-mono`}
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className={`w-full cursor-text rounded px-1.5 py-0.5 text-right font-mono whitespace-nowrap transition hover:bg-blue-50 ${small ? "text-[11px]" : "text-xs"} ${dirty ? "font-bold text-[#2563eb]" : "text-gray-700"}`}
    >
      {value.toFixed(2)}€
    </button>
  );
}

function DateCell({
  value,
  onChange,
  expiry,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  expiry?: boolean;
}) {
  const expired = expiry && isExpired(value);
  const soon = expiry && isExpiringSoon(value);

  return (
    <>
      <style>{`
        .precios-date::-webkit-calendar-picker-indicator {
          display: none;
          -webkit-appearance: none;
        }
        .precios-date::-webkit-inner-spin-button,
        .precios-date::-webkit-clear-button {
          display: none;
        }
      `}</style>
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={`precios-date w-full rounded border px-1 py-0.5 text-[11px] focus:border-[#2563eb] focus:outline-none ${
          expired
            ? "border-red-400 bg-red-50 text-red-600"
            : soon
              ? "border-orange-400 bg-orange-50 text-orange-600"
              : "border-gray-200"
        }`}
      />
    </>
  );
}

// ─── Confirmation modal ───────────────────────────────────────────────────────

function Modal({
  title,
  children,
  onConfirm,
  onCancel,
  confirmLabel = "Confirmar",
  danger = false,
}: {
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 text-sm text-gray-600">{children}</div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${danger ? "bg-red-500 hover:bg-red-600" : "bg-[#2563eb] hover:bg-[#3b82f6]"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
}) {
  if (sortField !== field)
    return <ChevronUp size={11} className="text-gray-300" />;
  return sortDir === "asc" ? (
    <ChevronUp size={11} className="text-[#2563eb]" />
  ) : (
    <ChevronDown size={11} className="text-[#2563eb]" />
  );
}

// Sin paginación: el admin prefiere ver todos los productos de un tirón.
// Número arbitrariamente grande para que `Math.ceil(n/PAGE_SIZE) === 1` siempre
// y la UI de paginación quede oculta.
const PAGE_SIZE = Number.MAX_SAFE_INTEGER;

export default function PreciosPage() {
  const [rows, setRows] = useState<PriceRow[]>(initRows);
  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // SSOT: si el admin edita precio/nombre desde ProductDetailClient o
  // /admin/stock mientras esta página está abierta, recargamos respetando
  // las filas con cambios pendientes (no las pisamos).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reload = () => {
      setRows((prev) => {
        const fresh = initRows();
        // Conserva las filas con cambios pendientes sin guardar.
        return fresh.map((r) => {
          const pending = prev.find(
            (p) => p.id === r.id && dirtyIds.has(p.id),
          );
          return pending ?? r;
        });
      });
    };
    window.addEventListener("tcga:products:updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("tcga:products:updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, [dirtyIds]);

  // Filters
  const [search, setSearch] = useState("");
  const [filterGame, setFilterGame] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDiscount, setFilterDiscount] = useState<"" | "with" | "without">(
    "",
  );
  const [filterLanguage, setFilterLanguage] = useState("");

  // Sort
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Pagination
  const [page, setPage] = useState(1);

  // Modals
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<
    "discount" | "raise" | "lower" | "remove" | null
  >(null);
  const [bulkPct, setBulkPct] = useState("");

  // Competencia
  const [competitorProduct, setCompetitorProduct] = useState<PriceRow | null>(null);
  // Tick para forzar re-render cuando el cache de competencia cambia
  // (guardar/refresh dispara el evento y refleja el rango en la columna).
  const [compTick, setCompTick] = useState(0);
  useEffect(() => subscribeCompetitorPrices(() => setCompTick((t) => t + 1)), []);

  // Fila expandida para descuentos + refresco rival (ids de PriceRow)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  // Rows en curso de refresco rival — para mostrar spinner.
  const [fetchingIds, setFetchingIds] = useState<Set<number>>(new Set());

  const toggleExpanded = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }, []);

  const clearDiscount = useCallback((id: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              comparePrice: undefined,
              discountActive: false,
              discountStart: undefined,
              discountEnd: undefined,
            }
          : r,
      ),
    );
    setDirtyIds((prev) => new Set(prev).add(id));
  }, []);

  /**
   * Persiste los cambios de una fila al SSOT (localStorage).
   * - Productos del catálogo estático (PRODUCTS) → `tcgacademy_product_overrides[id]`
   * - Productos creados por admin → `tcgacademy_new_products` (mutados in-place)
   * Emite `tcga:products:updated` para que catálogo/carrito/etc. refresquen.
   *
   * Incidente 2026-04-22: `saveRow` y `handleSave` sólo limpiaban `dirtyIds`
   * sin escribir nada → el admin veía "Guardado" pero el precio editado nunca
   * llegaba al catálogo ni al carrito → factura con precio obsoleto.
   */
  const persistRows = useCallback((rowIds: number[]) => {
    if (typeof window === "undefined") return;
    try {
      for (const id of rowIds) {
        const row = rows.find((r) => r.id === id);
        if (!row) continue;
        persistProductPatch(id, {
          price: row.price,
          wholesalePrice: row.wholesalePrice,
          storePrice: row.storePrice,
          costPrice: row.costPrice,
          comparePrice: row.comparePrice,
        });
      }
      // persistProductPatch ya emite DataHub("products") por iteración.
    } catch {
      // non-fatal: el admin puede reintentar
    }
  }, [rows]);

  const saveRow = useCallback(
    (id: number) => {
      persistRows([id]);
      setDirtyIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    },
    [persistRows],
  );

  const handleRefreshCompetitors = useCallback(async (row: PriceRow) => {
    setFetchingIds((prev) => new Set(prev).add(row.id));
    try {
      await refreshCompetitorPrices(row.id, row.name, {
        productImage: row.image,
        productGame: row.game,
        productLanguage: row.language,
        storeIds: ["cardzone", "pokemillon", "manavortex", "cardmarket"],
      });
    } catch {
      // El servicio ya marca la snapshot; el error se refleja en las celdas.
    } finally {
      setFetchingIds((prev) => {
        const s = new Set(prev);
        s.delete(row.id);
        return s;
      });
    }
  }, []);

  // ── Update helper ──────────────────────────────────────────────────────────

  const update = useCallback((id: number, patch: Partial<PriceRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirtyIds((prev) => new Set(prev).add(id));
  }, []);

  // ── Discount pct cell ──────────────────────────────────────────────────────

  const updateDiscount = useCallback((id: number, pct: string) => {
    const n = parseInt(pct, 10);
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (!isNaN(n) && n > 0 && n < 100) {
          const cp = parseFloat((r.price / (1 - n / 100)).toFixed(2));
          return { ...r, comparePrice: cp, discountActive: true };
        }
        return { ...r, comparePrice: undefined, discountActive: false };
      }),
    );
    setDirtyIds((prev) => new Set(prev).add(id));
  }, []);

  // ── Filtered + sorted rows ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = rows.filter((r) => {
      if (search && !r.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (filterGame && r.game !== filterGame) return false;
      if (filterCategory && r.category !== filterCategory) return false;
      if (filterLanguage && r.language !== filterLanguage) return false;
      if (filterDiscount === "with" && !r.comparePrice) return false;
      if (filterDiscount === "without" && r.comparePrice) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      let av = 0,
        bv = 0;
      if (sortField === "name")
        return sortDir === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      if (sortField === "price") {
        av = a.price;
        bv = b.price;
      }
      if (sortField === "discount") {
        av = calcDiscountPct(a.price, a.comparePrice);
        bv = calcDiscountPct(b.price, b.comparePrice);
      }
      if (sortField === "discountEnd") {
        av = a.discountEnd ? new Date(a.discountEnd).getTime() : 0;
        bv = b.discountEnd ? new Date(b.discountEnd).getTime() : 0;
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });

    return list;
  }, [
    rows,
    search,
    filterGame,
    filterCategory,
    filterLanguage,
    filterDiscount,
    sortField,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  // ── Selection ──────────────────────────────────────────────────────────────

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  const toggleAll = () => {
    if (allPageSelected) {
      setSelected((prev) => {
        const s = new Set(prev);
        pageRows.forEach((r) => s.delete(r.id));
        return s;
      });
    } else {
      setSelected((prev) => {
        const s = new Set(prev);
        pageRows.forEach((r) => s.add(r.id));
        return s;
      });
    }
  };

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  // ── Bulk actions ───────────────────────────────────────────────────────────

  const applyBulk = () => {
    const pct = parseFloat(bulkPct);
    setRows((prev) =>
      prev.map((r) => {
        if (!selected.has(r.id)) return r;
        if (bulkAction === "remove")
          return { ...r, comparePrice: undefined, discountActive: false };
        if (bulkAction === "discount") {
          if (isNaN(pct) || pct <= 0 || pct >= 100) return r;
          const cp = parseFloat((r.price / (1 - pct / 100)).toFixed(2));
          return { ...r, comparePrice: cp, discountActive: true };
        }
        if (bulkAction === "raise") {
          if (isNaN(pct) || pct <= 0) return r;
          const factor = 1 + pct / 100;
          return {
            ...r,
            price: parseFloat((r.price * factor).toFixed(2)),
            wholesalePrice: parseFloat((r.wholesalePrice * factor).toFixed(2)),
            storePrice: parseFloat((r.storePrice * factor).toFixed(2)),
          };
        }
        if (bulkAction === "lower") {
          if (isNaN(pct) || pct <= 0 || pct >= 100) return r;
          const factor = 1 - pct / 100;
          return {
            ...r,
            price: parseFloat((r.price * factor).toFixed(2)),
            wholesalePrice: parseFloat((r.wholesalePrice * factor).toFixed(2)),
            storePrice: parseFloat((r.storePrice * factor).toFixed(2)),
          };
        }
        return r;
      }),
    );
    setDirtyIds((prev) => {
      const s = new Set(prev);
      selected.forEach((id) => s.add(id));
      return s;
    });
    setBulkAction(null);
    setBulkPct("");
    setSelected(new Set());
  };

  const handleDiscard = () => {
    setRows(initRows());
    setDirtyIds(new Set());
    setSelected(new Set());
    setShowDiscardModal(false);
  };

  const handleSave = () => {
    // Persiste TODAS las filas con cambios pendientes al SSOT.
    persistRows([...dirtyIds]);
    setDirtyIds(new Set());
    setShowSaveModal(false);
  };

  // ── Save summary ───────────────────────────────────────────────────────────

  const dirtySummary = rows.filter((r) => dirtyIds.has(r.id));

  const uniqueGames = [...new Set(rows.map((r) => r.game))].sort();
  const uniqueCategories = filterGame
    ? [
        ...new Set(
          rows.filter((r) => r.game === filterGame).map((r) => r.category),
        ),
      ].sort()
    : [...new Set(rows.map((r) => r.category))].sort();
  // Idiomas únicos filtrados por el juego seleccionado (si lo hay) para no
  // mostrar opciones que no existen dentro del subconjunto. Mismo patrón que
  // uniqueCategories — mantiene la UX coherente entre stock y precios.
  const uniqueLanguages = filterGame
    ? [
        ...new Set(
          rows.filter((r) => r.game === filterGame).map((r) => r.language),
        ),
      ].sort()
    : [...new Set(rows.map((r) => r.language))].sort();

  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Gestión de Precios
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            {rows.length} productos ·{" "}
            {dirtyIds.size > 0 ? (
              <span className="font-semibold text-amber-600">
                {dirtyIds.size} sin guardar
              </span>
            ) : (
              "Todo guardado"
            )}
          </p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
        {/* Buscador con ancho limitado para dejar sitio al nuevo select de
            idioma (2026-04-22). Mismo tratamiento que en /admin/stock. */}
        <div className="relative min-w-[180px] max-w-[360px] flex-1">
          <Search
            size={13}
            className="absolute top-1/2 left-2.5 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            maxLength={100}
            className="w-full rounded-lg border border-gray-200 py-2 pr-3 pl-8 text-xs focus:border-[#2563eb] focus:outline-none"
          />
        </div>
        <select
          value={filterGame}
          onChange={(e) => {
            setFilterGame(e.target.value);
            setFilterCategory("");
            setFilterLanguage("");
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:border-[#2563eb] focus:outline-none"
        >
          <option value="">Todos los juegos</option>
          {uniqueGames.map((g) => (
            <option key={g} value={g}>
              {GAME_CONFIG[g]?.name ?? g}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:border-[#2563eb] focus:outline-none"
        >
          <option value="">Todas las categorías</option>
          {uniqueCategories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c] ?? c}
            </option>
          ))}
        </select>
        <select
          value={filterLanguage}
          onChange={(e) => {
            setFilterLanguage(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:border-[#2563eb] focus:outline-none"
          aria-label="Filtrar por idioma"
        >
          <option value="">Todos los idiomas</option>
          {uniqueLanguages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={filterDiscount}
          onChange={(e) => {
            setFilterDiscount(e.target.value as typeof filterDiscount);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:border-[#2563eb] focus:outline-none"
        >
          <option value="">Todos</option>
          <option value="with">Con descuento</option>
          <option value="without">Sin descuento</option>
        </select>
        {(search || filterGame || filterCategory || filterLanguage || filterDiscount) && (
          <button
            onClick={() => {
              setSearch("");
              setFilterGame("");
              setFilterCategory("");
              setFilterLanguage("");
              setFilterDiscount("");
              setPage(1);
            }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <X size={12} /> Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">
          {filtered.length} resultados
        </span>
      </div>

      {/* ── Bulk toolbar ── */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl bg-[#2563eb] px-4 py-2.5 text-xs text-white">
          <span className="font-semibold">{selected.size} seleccionados</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              onClick={() => {
                setBulkAction("discount");
                setBulkPct("");
              }}
              className="flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1.5 transition hover:bg-white/30"
            >
              <Percent size={11} /> Aplicar dto%
            </button>
            <button
              onClick={() => {
                setBulkAction("raise");
                setBulkPct("");
              }}
              className="flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1.5 transition hover:bg-white/30"
            >
              <ChevronUp size={11} /> Subir precio%
            </button>
            <button
              onClick={() => {
                setBulkAction("lower");
                setBulkPct("");
              }}
              className="flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1.5 transition hover:bg-white/30"
            >
              <ChevronDown size={11} /> Bajar precio%
            </button>
            <button
              onClick={() => setBulkAction("remove")}
              className="flex items-center gap-1 rounded-lg bg-red-400/70 px-2.5 py-1.5 transition hover:bg-red-400"
            >
              <Trash2 size={11} /> Quitar descuentos
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-2 py-1.5 text-white/60 transition hover:text-white"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-xs">
            <colgroup>
              <col className="w-10" />
              <col />
              <col className="w-[80px]" />
              <col className="w-[80px]" />
              <col className="w-[74px]" />
              <col className="w-[74px]" />
              <col className="w-[74px]" />
              <col className="w-[74px]" />
              <col className="w-[80px]" />
              <col className="w-[80px]" />
              <col className="w-[40px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-2 py-2.5">
                  <button
                    onClick={toggleAll}
                    className="text-gray-400 hover:text-[#2563eb]"
                  >
                    {allPageSelected ? (
                      <CheckSquare size={14} className="text-[#2563eb]" />
                    ) : (
                      <Square size={14} />
                    )}
                  </button>
                </th>
                <th className="px-2 py-2.5 text-left">
                  <button
                    className="flex items-center gap-1 font-semibold text-gray-600 hover:text-[#2563eb]"
                    onClick={() => setSort("name")}
                  >
                    Producto{" "}
                    <SortIcon
                      field="name"
                      sortField={sortField}
                      sortDir={sortDir}
                    />
                  </button>
                </th>
                <th className="px-1 py-2.5 text-right">
                  <button
                    className="ml-auto flex items-center gap-0.5 font-semibold text-gray-600 hover:text-[#2563eb]"
                    onClick={() => setSort("price")}
                  >
                    PV Público{" "}
                    <SortIcon
                      field="price"
                      sortField={sortField}
                      sortDir={sortDir}
                    />
                  </button>
                </th>
                <th className="px-1 py-2.5 text-right font-semibold leading-tight text-gray-600">
                  PV Mayorista
                </th>
                <th className="px-1 py-2.5 text-right font-semibold leading-tight text-gray-600">
                  PV Tiendas
                </th>
                <th className="px-1 py-2.5 text-right font-semibold leading-tight text-purple-600">
                  P Adquisición
                </th>
                <th
                  className="px-1 py-2.5 text-right font-semibold leading-tight text-orange-600"
                  title="Precio del mismo producto en cardzone.es"
                >
                  CardZone
                </th>
                <th
                  className="px-1 py-2.5 text-right font-semibold leading-tight text-yellow-700"
                  title="Precio del mismo producto en pokemillon.com"
                >
                  Pokémillon
                </th>
                <th
                  className="px-1 py-2.5 text-right font-semibold leading-tight text-indigo-600"
                  title="Precio del mismo producto en manavortex.es"
                >
                  Manavortex
                </th>
                <th
                  className="px-1 py-2.5 text-right font-semibold leading-tight text-purple-600"
                  title="Cardmarket — precio más bajo de vendedor profesional"
                >
                  Cardmarket
                </th>
                <th className="px-1 py-2.5" aria-label="Desplegar descuento" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const isDirty = dirtyIds.has(row.id);
                const pct = calcDiscountPct(row.price, row.comparePrice);
                const _soon = isExpiringSoon(row.discountEnd);
                const gameColor = GAME_CONFIG[row.game]?.color ?? "#2563eb";

                return [
                  <tr
                    key={row.id}
                    className={`border-b border-gray-50 transition-colors last:border-0 ${
                      isDirty
                        ? "bg-amber-50"
                        : selected.has(row.id)
                          ? "bg-blue-50"
                          : "hover:bg-gray-50/60"
                    }`}
                  >
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => toggleRow(row.id)}
                        className="text-gray-400 hover:text-[#2563eb]"
                      >
                        {selected.has(row.id) ? (
                          <CheckSquare size={14} className="text-[#2563eb]" />
                        ) : (
                          <Square size={14} />
                        )}
                      </button>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        {row.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.image}
                            alt=""
                            loading="lazy"
                            className="h-10 w-8 flex-shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-10 w-8 flex-shrink-0 items-center justify-center rounded text-lg"
                            style={{ background: `${gameColor}18` }}
                          >
                            {GAME_CONFIG[row.game]?.emoji ?? "🃏"}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/${row.game}/${row.category}/${row.slug}`}
                            target="_blank"
                            title={row.name}
                            className="block truncate leading-tight font-medium text-gray-800 no-underline hover:text-[#2563eb] hover:no-underline"
                          >
                            {row.name}
                          </Link>
                          <p className="truncate text-[10px] text-gray-400">
                            {GAME_CONFIG[row.game]?.name ?? row.game}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-1 py-1.5">
                      <NumCell
                        value={row.price}
                        onChange={(v) => update(row.id, { price: v })}
                        dirty={isDirty}
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      <NumCell
                        value={row.wholesalePrice}
                        onChange={(v) => update(row.id, { wholesalePrice: v })}
                        dirty={isDirty}
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      <NumCell
                        value={row.storePrice}
                        onChange={(v) => update(row.id, { storePrice: v })}
                        dirty={isDirty}
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      <NumCell
                        value={row.costPrice ?? 0}
                        onChange={(v) => update(row.id, { costPrice: v })}
                        dirty={isDirty}
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      <StorePriceCell row={row} storeId="cardzone" tick={compTick} />
                    </td>
                    <td className="px-1 py-1.5">
                      <StorePriceCell row={row} storeId="pokemillon" tick={compTick} />
                    </td>
                    <td className="px-1 py-1.5">
                      <StorePriceCell row={row} storeId="manavortex" tick={compTick} />
                    </td>
                    <td className="px-1 py-1.5">
                      <StorePriceCell row={row} storeId="cardmarket" tick={compTick} />
                    </td>
                    <td className="px-1 py-1.5">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(row.id)}
                        aria-expanded={expandedIds.has(row.id)}
                        aria-label={
                          expandedIds.has(row.id)
                            ? "Ocultar descuento"
                            : "Ajustar descuento y rival"
                        }
                        title={pct > 0 ? `Descuento -${pct}%` : "Ajustar descuento"}
                        className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
                          expandedIds.has(row.id)
                            ? "bg-[#2563eb] text-white"
                            : pct > 0
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "text-gray-400 hover:bg-gray-100 hover:text-[#2563eb]"
                        }`}
                      >
                        {expandedIds.has(row.id) ? (
                          <ChevronUp size={13} />
                        ) : (
                          <ChevronDown size={13} />
                        )}
                      </button>
                    </td>
                  </tr>,
                  expandedIds.has(row.id) ? (
                    <tr
                      key={`${row.id}-expand`}
                      className="border-b border-gray-100 bg-gray-50/80"
                    >
                      <td colSpan={11} className="px-4 py-4">
                        <div className="flex flex-wrap items-end gap-5">
                          <div className="min-w-[120px]">
                            <label className="mb-1 flex items-center gap-1 text-[10px] font-bold tracking-wide text-gray-500 uppercase">
                              <Percent size={10} /> Descuento
                            </label>
                            <DiscountPctCell
                              value={pct}
                              onChange={(v) => updateDiscount(row.id, v)}
                              dirty={isDirty}
                            />
                          </div>
                          <div className="min-w-[160px]">
                            <label className="mb-1 flex items-center gap-1 text-[10px] font-bold tracking-wide text-gray-500 uppercase">
                              <Calendar size={10} /> Fin del descuento
                            </label>
                            {row.comparePrice !== undefined ? (
                              <DateCell
                                value={row.discountEnd}
                                onChange={(v) => update(row.id, { discountEnd: v })}
                                expiry
                              />
                            ) : (
                              <p className="text-[11px] text-gray-400">
                                Aplica un % primero.
                              </p>
                            )}
                          </div>
                          <div className="ml-auto flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => clearDiscount(row.id)}
                              disabled={row.comparePrice === undefined}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 disabled:hover:bg-white"
                            >
                              <Trash2 size={11} /> Borrar descuento
                            </button>
                            <button
                              type="button"
                              onClick={() => saveRow(row.id)}
                              disabled={!isDirty}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#3b82f6] disabled:cursor-not-allowed disabled:bg-gray-300"
                            >
                              <Save size={11} />
                              {isDirty ? "Guardar" : "Guardado"}
                            </button>
                            <span className="mx-1 h-5 w-px bg-gray-200" />
                            <button
                              type="button"
                              onClick={() => handleRefreshCompetitors(row)}
                              disabled={fetchingIds.has(row.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition hover:border-[#2563eb] hover:text-[#2563eb] disabled:opacity-60"
                            >
                              <RefreshCw
                                size={11}
                                className={fetchingIds.has(row.id) ? "animate-spin" : ""}
                              />
                              {fetchingIds.has(row.id)
                                ? "Consultando…"
                                : "Refrescar rivales"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setCompetitorProduct(row)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-[#2563eb] transition hover:bg-blue-50"
                            >
                              <ExternalLink size={11} /> Ver detalle
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null,
                ];
              })}
              {pageRows.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    No se encontraron productos con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-3">
            <span className="text-xs text-gray-500">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 transition hover:bg-white disabled:opacity-30"
              >
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pg =
                  totalPages <= 7
                    ? i + 1
                    : page <= 4
                      ? i + 1
                      : page >= totalPages - 3
                        ? totalPages - 6 + i
                        : page - 3 + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs transition ${pg === page ? "bg-[#2563eb] text-white" : "border border-gray-200 hover:bg-white"}`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 transition hover:bg-white disabled:opacity-30"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Fixed bottom save bar ── */}
      {dirtyIds.size > 0 && (
        <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 rounded-t-2xl border-t border-gray-200 bg-white px-4 py-3 shadow-lg sm:-mx-6">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle size={15} className="text-amber-500" />
            <span className="font-semibold text-gray-800">
              {dirtyIds.size} producto{dirtyIds.size !== 1 ? "s" : ""} con
              cambios sin guardar
            </span>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setShowDiscardModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
            >
              <RotateCcw size={13} /> Descartar
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3b82f6]"
            >
              <Save size={13} /> Guardar todos los cambios
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ── */}

      {showSaveModal && (
        <Modal
          title="Confirmar cambios"
          onConfirm={handleSave}
          onCancel={() => setShowSaveModal(false)}
          confirmLabel="Guardar cambios"
        >
          <p className="mb-3">
            Se guardarán los cambios en{" "}
            <strong>
              {dirtySummary.length} producto
              {dirtySummary.length !== 1 ? "s" : ""}
            </strong>
            :
          </p>
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-gray-50 p-3 text-xs">
            {dirtySummary.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate text-gray-700">{r.name}</span>
                <span className="flex-shrink-0 font-mono font-bold text-[#2563eb]">
                  {r.price.toFixed(2)}€
                </span>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {showDiscardModal && (
        <Modal
          title="Descartar cambios"
          onConfirm={handleDiscard}
          onCancel={() => setShowDiscardModal(false)}
          confirmLabel="Descartar todo"
          danger
        >
          <p>
            Se perderán todos los cambios no guardados en{" "}
            <strong>
              {dirtyIds.size} producto{dirtyIds.size !== 1 ? "s" : ""}
            </strong>
            . Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}

      {competitorProduct && (
        <CompetitorPricesModal
          productId={competitorProduct.id}
          productName={competitorProduct.name}
          productImage={competitorProduct.image}
          productGame={competitorProduct.game}
          ourPrice={competitorProduct.price}
          onClose={() => setCompetitorProduct(null)}
        />
      )}

      {bulkAction && (
        <Modal
          title={
            bulkAction === "discount"
              ? "Aplicar descuento"
              : bulkAction === "raise"
                ? "Subir precios"
                : bulkAction === "lower"
                  ? "Bajar precios"
                  : "Quitar descuentos"
          }
          onConfirm={applyBulk}
          onCancel={() => {
            setBulkAction(null);
            setBulkPct("");
          }}
          confirmLabel="Aplicar"
          danger={bulkAction === "remove"}
        >
          <p className="mb-4">
            {bulkAction === "discount" &&
              `Aplicar un descuento a ${selected.size} productos seleccionados.`}
            {bulkAction === "raise" &&
              `Subir el precio de ${selected.size} productos seleccionados.`}
            {bulkAction === "lower" &&
              `Bajar el precio de ${selected.size} productos seleccionados.`}
            {bulkAction === "remove" &&
              `Se eliminará el descuento de ${selected.size} productos seleccionados.`}
          </p>
          {bulkAction !== "remove" && (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="number"
                min="1"
                max="99"
                value={bulkPct}
                onChange={(e) => setBulkPct(e.target.value)}
                placeholder="0"
                className="w-24 rounded-lg border-2 border-[#2563eb] px-3 py-2 text-center text-sm font-bold focus:outline-none"
              />
              <span className="text-sm font-bold text-gray-500">%</span>
              {bulkAction === "discount" && bulkPct && (
                <span className="text-xs text-gray-400">
                  → precios originales se subirán {bulkPct}% encima del precio
                  actual
                </span>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── Discount Pct Cell (standalone to avoid recreating on each render) ────────

function DiscountPctCell({
  value,
  onChange,
  dirty,
}: {
  value: number;
  onChange: (v: string) => void;
  dirty?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value || ""));

  const commit = () => {
    onChange(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-0.5">
        <input
          autoFocus
          type="number"
          min="0"
          max="99"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(String(value || ""));
              setEditing(false);
            }
          }}
          className="w-10 rounded border-2 border-[#2563eb] bg-white px-1 py-0.5 text-center text-[11px] font-bold focus:outline-none"
        />
        <span className="text-[11px] font-bold text-red-500">%</span>
      </span>
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(String(value || ""));
        setEditing(true);
      }}
      className={`w-full cursor-text rounded px-1.5 py-0.5 text-right font-mono text-[11px] transition hover:bg-blue-50 ${
        value > 0
          ? dirty
            ? "font-bold text-red-600"
            : "font-bold text-red-500"
          : "text-gray-300"
      }`}
    >
      {value > 0 ? `-${value}%` : "—"}
    </button>
  );
}

// ─── Per-store price cell ─────────────────────────────────────────────────────
// Muestra el precio del producto en una tienda rival concreta, leído del cache
// 24h de `competitorPriceService`. Fuzzy match ya aplicado por el adapter en
// la API (`/api/competitor-prices` → genericAdapter + nameNormalize). Para
// disparar el fetch, el admin pulsa "Refrescar rivales" en la fila expandida.

function StorePriceCell({
  row,
  storeId,
  tick: _tick,
}: {
  row: PriceRow;
  storeId: "cardzone" | "pokemillon" | "manavortex" | "cardmarket";
  /** Re-render tras evento del servicio. */
  tick: number;
}) {
  const snapshot: CompetitorPriceSnapshot | null = getCachedSnapshot(row.id);
  const entry = snapshot?.prices.find((p) => p.storeId === storeId) ?? null;
  const price = entry?.price ?? null;
  const cheaper = price !== null && row.price > 0 && price < row.price;

  if (!snapshot) {
    return (
      <span
        className="block text-right font-mono text-[10.5px] text-gray-300"
        title="Aún sin consultar — pulsa el ▼ de la fila para refrescar"
      >
        —
      </span>
    );
  }

  if (price === null) {
    return (
      <span
        className="block text-right font-mono text-[10.5px] text-gray-300"
        title={entry?.errorMessage ?? "No localizado en esta tienda"}
      >
        —
      </span>
    );
  }

  const cell = (
    <span
      className={`block text-right font-mono text-[11px] whitespace-nowrap ${
        cheaper ? "font-semibold text-red-600" : "text-gray-700"
      }`}
      title={entry?.matchedTitle ?? "Precio detectado"}
    >
      {price.toFixed(2)}€
    </span>
  );

  return entry?.url ? (
    <a
      href={entry.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block transition hover:opacity-70"
      aria-label={`Abrir ${row.name} en ${storeId}`}
    >
      {cell}
    </a>
  ) : (
    cell
  );
}
