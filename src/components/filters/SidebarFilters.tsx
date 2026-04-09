"use client";
import { useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import { LANGUAGE_NAMES } from "@/data/products";
import { LanguageFlag } from "@/components/ui/LanguageFlag";

interface Props {
  availableLanguages: string[];
  minPrice: number;
  maxPrice: number;
  color: string;
  // Mobile: controlled externally via MobileFilterButton
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function useFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const langs = params.get("lang")?.split(",").filter(Boolean) ?? [];
  const inStock = params.get("inStock") === "1";
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
    (v: boolean) => update("inStock", v ? "1" : null),
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
    (inStock ? 1 : 0) +
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
  color,
}: {
  availableLanguages: string[];
  minPrice: number;
  maxPrice: number;
  color: string;
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

  return (
    <div className="flex flex-col gap-1">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-800">Filtros</span>
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
                          { "--filter-color": color } as React.CSSProperties
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
                  backgroundColor: color,
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
                  backgroundColor: color,
                }}
              />
              <div
                className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
                style={{
                  left: `${((currentMax - minPrice) / (maxPrice - minPrice || 1)) * 100}%`,
                  backgroundColor: color,
                }}
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
          style={{ "--filter-color": color } as React.CSSProperties}
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
  mobileOpen = false,
  onMobileClose,
}: Props) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-[240px] flex-shrink-0 lg:block">
        <div className="sticky top-[80px] rounded-2xl border border-gray-200 bg-white p-4">
          <FilterContent
            availableLanguages={availableLanguages}
            minPrice={minPrice}
            maxPrice={maxPrice}
            color={color}
          />
        </div>
      </aside>

      {/* Mobile slide-in */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Panel */}
          <div className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-white p-5 shadow-2xl lg:hidden">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <SlidersHorizontal size={15} /> Filtros
              </div>
              <button
                onClick={onMobileClose}
                aria-label="Cerrar filtros"
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <FilterContent
              availableLanguages={availableLanguages}
              minPrice={minPrice}
              maxPrice={maxPrice}
              color={color}
            />
          </div>
        </>
      )}
    </>
  );
}

// Standalone mobile filter button to place in the category page header
export function MobileFilterButton({
  onClick,
  activeCount,
  color,
}: {
  onClick: () => void;
  activeCount: number;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition lg:hidden ${
        activeCount > 0
          ? "border-transparent text-white"
          : "border-gray-200 text-gray-700"
      }`}
      style={
        activeCount > 0 ? { backgroundColor: color, borderColor: color } : {}
      }
      aria-label="Mostrar filtros"
    >
      <SlidersHorizontal size={14} />
      Filtros
      {activeCount > 0 && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/30 text-[11px] font-bold">
          {activeCount}
        </span>
      )}
    </button>
  );
}
