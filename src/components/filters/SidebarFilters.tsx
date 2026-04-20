"use client";
// Selected-state color for filters is ALWAYS blue across all games (user rule).
const FILTER_ACCENT = "#2563eb";
import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Check } from "lucide-react";
import { LANGUAGE_NAMES } from "@/data/products";
import { LanguageFlag } from "@/components/ui/LanguageFlag";

interface CategoryItem {
  id: string;
  label: string;
  href: string;
}

interface Props {
  availableLanguages: string[];
  minPrice: number;
  maxPrice: number;
  color: string;
  filteredCount?: number;
  // Mobile: controlled externally via MobileFilterButton
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  // Category items for mobile unified drawer
  categoryItems?: CategoryItem[];
  activeCategory?: string;
}

function useFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const langs = params.get("lang")?.split(",").filter(Boolean) ?? [];
  const inStock = params.get("inStock") !== "0";
  const priceMin = params.get("priceMin")
    ? Number(params.get("priceMin"))
    : null;
  const priceMax = params.get("priceMax")
    ? Number(params.get("priceMax"))
    : null;

  const update = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, router, pathname],
  );

  const toggleLang = useCallback(
    (lang: string) => {
      const next = langs.includes(lang)
        ? langs.filter((l) => l !== lang)
        : [...langs, lang];
      update("lang", next.length ? next.join(",") : null);
    },
    [langs, update],
  );

  const setInStock = useCallback(
    (v: boolean) => update("inStock", v ? null : "0"),
    [update],
  );

  const setPriceMin = useCallback(
    (v: number | null) => update("priceMin", v !== null ? String(v) : null),
    [update],
  );

  const setPriceMax = useCallback(
    (v: number | null) => update("priceMax", v !== null ? String(v) : null),
    [update],
  );

  const clearAll = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const activeCount =
    langs.length +
    (!inStock ? 1 : 0) +
    (priceMin !== null ? 1 : 0) +
    (priceMax !== null ? 1 : 0);

  return {
    langs,
    inStock,
    priceMin,
    priceMax,
    toggleLang,
    setInStock,
    setPriceMin,
    setPriceMax,
    clearAll,
    activeCount,
  };
}

function FilterContent({
  availableLanguages,
  minPrice,
  maxPrice,
  color: _color,
  filteredCount,
}: {
  availableLanguages: string[];
  minPrice: number;
  maxPrice: number;
  color: string;
  filteredCount?: number;
}) {
  const {
    langs,
    inStock,
    priceMin,
    priceMax,
    toggleLang,
    setInStock,
    setPriceMin,
    setPriceMax,
    clearAll,
    activeCount,
  } = useFilters();

  const [priceOpen, setPriceOpen] = useState(true);
  const [langOpen, setLangOpen] = useState(true);

  const currentMin = priceMin ?? minPrice;
  const currentMax = priceMax ?? maxPrice;

  const [inputMin, setInputMin] = useState(String(currentMin));
  const [inputMax, setInputMax] = useState(String(currentMax));

  // Sync inputs when slider moves
  useEffect(() => { setInputMin(String(currentMin)); }, [currentMin]);
  useEffect(() => { setInputMax(String(currentMax)); }, [currentMax]);

  function commitMin() {
    const v = Math.round(Number(inputMin));
    if (!isNaN(v) && v >= minPrice && v <= currentMax) {
      setPriceMin(v === minPrice ? null : v);
    } else {
      setInputMin(String(currentMin));
    }
  }

  function commitMax() {
    const v = Math.round(Number(inputMax));
    if (!isNaN(v) && v >= currentMin && v <= maxPrice) {
      setPriceMax(v === maxPrice ? null : v);
    } else {
      setInputMax(String(currentMax));
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
          Filtros
          {filteredCount !== undefined && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
              {filteredCount}
            </span>
          )}
        </span>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600"
          >
            <X size={11} /> Limpiar
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {activeCount}
            </span>
          </button>
        )}
      </div>

      {/* 1 — Language filter */}
      {availableLanguages.length > 0 && (
        <>
          <div>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-gray-700"
            >
              Idioma
              {langOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {langOpen && (
              <div className="flex flex-col gap-0.5 px-3 pb-3">
                {availableLanguages.map((lang) => {
                  const active = langs.includes(lang);
                  return (
                    <label
                      key={lang}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 select-none hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleLang(lang)}
                        className="sr-only"
                      />
                      <div
                        aria-hidden="true"
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition ${
                          active
                            ? "border-[var(--filter-color)] bg-[var(--filter-color)]"
                            : "border-gray-300"
                        }`}
                        style={
                          { "--filter-color": FILTER_ACCENT } as React.CSSProperties
                        }
                      >
                        {active && (
                          <svg
                            className="h-2.5 w-2.5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="mr-1 leading-none">
                        <LanguageFlag language={lang} />
                      </span>
                      <span className="text-sm text-gray-700">
                        {LANGUAGE_NAMES[lang] ?? lang}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <div className="my-1 h-px bg-gray-100" />
        </>
      )}

      {/* 2 — Price range */}
      <div>
        <button
          onClick={() => setPriceOpen(!priceOpen)}
          className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-gray-700"
        >
          Precio
          {priceOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {priceOpen && (
          <div className="px-3 pb-3">
            <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
              <span>{currentMin.toFixed(0)}€</span>
              <span>{currentMax.toFixed(0)}€</span>
            </div>
            <div className="relative h-5">
              {/* Track */}
              <div className="absolute top-1/2 right-0 left-0 h-1.5 -translate-y-1/2 rounded-full bg-gray-200" />
              {/* Filled track */}
              <div
                className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
                style={{
                  backgroundColor: FILTER_ACCENT,
                  left: `${((currentMin - minPrice) / (maxPrice - minPrice || 1)) * 100}%`,
                  right: `${((maxPrice - currentMax) / (maxPrice - minPrice || 1)) * 100}%`,
                }}
              />
              {/* Min thumb */}
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                step={1}
                value={currentMin}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v <= currentMax) setPriceMin(v === minPrice ? null : v);
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                style={{ zIndex: currentMin > maxPrice - 10 ? 5 : 3 }}
                aria-label="Precio mínimo"
              />
              {/* Max thumb */}
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                step={1}
                value={currentMax}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= currentMin) setPriceMax(v === maxPrice ? null : v);
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                style={{ zIndex: 4 }}
                aria-label="Precio máximo"
              />
              {/* Visual thumbs */}
              <div
                className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
                style={{
                  left: `${((currentMin - minPrice) / (maxPrice - minPrice || 1)) * 100}%`,
                  backgroundColor: FILTER_ACCENT,
                }}
              />
              <div
                className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
                style={{
                  left: `${((currentMax - minPrice) / (maxPrice - minPrice || 1)) * 100}%`,
                  backgroundColor: FILTER_ACCENT,
                }}
              />
            </div>
            {/* Inputs numéricos */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={minPrice}
                max={currentMax}
                value={inputMin}
                onChange={(e) => setInputMin(e.target.value)}
                onBlur={commitMin}
                onKeyDown={(e) => e.key === "Enter" && commitMin()}
                className="w-full rounded-lg border border-gray-200 px-2 py-1 text-center text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
                aria-label="Precio mínimo"
              />
              <span className="shrink-0 text-xs text-gray-400">—</span>
              <input
                type="number"
                min={currentMin}
                max={maxPrice}
                value={inputMax}
                onChange={(e) => setInputMax(e.target.value)}
                onBlur={commitMax}
                onKeyDown={(e) => e.key === "Enter" && commitMax()}
                className="w-full rounded-lg border border-gray-200 px-2 py-1 text-center text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
                aria-label="Precio máximo"
              />
            </div>
          </div>
        )}
      </div>

      <div className="my-1 h-px bg-gray-100" />

      {/* 3 — In stock toggle */}
      <label className="flex cursor-pointer items-center justify-between rounded-xl p-3 select-none hover:bg-gray-50">
        <span className="text-sm font-medium text-gray-700">Solo en stock</span>
        <button
          role="switch"
          aria-checked={inStock}
          aria-label="Solo en stock"
          onClick={() => setInStock(!inStock)}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            inStock ? "bg-[var(--filter-color)]" : "bg-gray-200"
          }`}
          style={{ "--filter-color": FILTER_ACCENT } as React.CSSProperties}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              inStock ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </label>
    </div>
  );
}

export function SidebarFilters({
  availableLanguages,
  minPrice,
  maxPrice,
  color,
  filteredCount,
  mobileOpen = false,
  onMobileClose,
  categoryItems,
  activeCategory,
}: Props) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-[calc(var(--header-h)+var(--cat-bar-h)+0.75rem)] hidden w-[240px] flex-shrink-0 lg:block">
        <div className="max-h-[calc(100vh-var(--header-h)-var(--cat-bar-h)-1.5rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4">
          <FilterContent
            availableLanguages={availableLanguages}
            minPrice={minPrice}
            maxPrice={maxPrice}
            color={color}
            filteredCount={filteredCount}
          />
        </div>
      </aside>

      {/* Mobile bottom sheet */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Bottom sheet panel */}
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[83vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl lg:hidden">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 pb-3">
              <div className="flex items-center gap-2 text-base font-bold text-gray-900">
                <SlidersHorizontal size={16} />
                Filtros
                {filteredCount !== undefined && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">
                    {filteredCount}
                  </span>
                )}
              </div>
              <button
                onClick={onMobileClose}
                aria-label="Cerrar filtros"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto px-5 pt-4 pb-6" style={{ maxHeight: "calc(83vh - 80px)" }}>
              {/* Categories section — 2 rows horizontal scroll on mobile */}
              {categoryItems && categoryItems.length > 0 && (
                <div className="mb-5 -mx-5">
                  <p className="mb-2.5 px-5 text-xs font-bold tracking-wide text-gray-400 uppercase">Categorías</p>
                  <div
                    className="scrollbar-hide grid grid-flow-col auto-cols-max gap-x-2 gap-y-2 overflow-x-auto px-5 pb-1"
                    style={{
                      gridTemplateRows: "repeat(2, auto)",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                      WebkitOverflowScrolling: "touch",
                    }}
                  >
                    <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}`}</style>
                    {categoryItems.map((item) => {
                      const isActive = item.id === activeCategory;
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={onMobileClose}
                          className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                            isActive
                              ? "text-white shadow-sm"
                              : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                          style={isActive ? { backgroundColor: FILTER_ACCENT } : undefined}
                        >
                          {isActive && <Check size={13} strokeWidth={3} />}
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Divider */}
              {categoryItems && categoryItems.length > 0 && <div className="mb-4 h-px bg-gray-100" />}

              {/* Filters */}
              <FilterContent
                availableLanguages={availableLanguages}
                minPrice={minPrice}
                maxPrice={maxPrice}
                color={color}
              />
            </div>

            {/* Sticky bottom button */}
            <div className="border-t border-gray-100 px-5 py-3" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
              <button
                onClick={onMobileClose}
                className="w-full rounded-xl py-3 text-sm font-bold text-white transition active:scale-[0.98]"
                style={{ backgroundColor: FILTER_ACCENT }}
              >
                Ver {filteredCount ?? 0} productos
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// Standalone mobile filter button
export function MobileFilterButton({
  onClick,
  activeCount,
  color,
  categoryLabel,
}: {
  onClick: () => void;
  activeCount: number;
  color: string;
  categoryLabel?: string;
}) {
  const totalActive = activeCount + (categoryLabel && categoryLabel !== "Todo" ? 1 : 0);
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition active:scale-[0.98] lg:hidden"
      aria-label="Mostrar filtros y categorías"
    >
      <SlidersHorizontal size={15} />
      <span>Filtros{categoryLabel && categoryLabel !== "Todo" ? ` · ${categoryLabel}` : ""}</span>
      {totalActive > 0 && (
        <span
          className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {totalActive}
        </span>
      )}
    </button>
  );
}
