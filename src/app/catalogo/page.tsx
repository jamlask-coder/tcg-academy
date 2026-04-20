"use client";
import { Suspense, useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, ChevronDown, ArrowLeft, Layers } from "lucide-react";
import { GAME_CONFIG, isNewProduct } from "@/data/products";
import type { LocalProduct } from "@/data/products";
import { getMergedProducts } from "@/lib/productStore";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import Link from "next/link";

// ── Game logo mapping ─────────────────────────────────────────────────────────
const LOGO_MAP: Record<string, string> = {
  magic: "magic-clean.png",
  pokemon: "pokemon.svg",
  "one-piece": "onepiece.svg",
  riftbound: "riftbound-clean.png?v=3",
  lorcana: "lorcana.png",
  "dragon-ball": "dragonball-clean.png?v=2",
  yugioh: "yugioh.png",
  naruto: "naruto.svg",
  digimon: "digimon.svg",
  topps: "topps.svg",
  panini: "panini.png",
};

// Ordered following the desktop nav
const GAMES_ORDER = [
  "magic",
  "pokemon",
  "one-piece",
  "riftbound",
  "lorcana",
  "dragon-ball",
  "yugioh",
  "naruto",
  "digimon",
  "topps",
  "panini",
];

const SORT_OPTIONS = [
  { value: "new", label: "Más recientes primero" },
  { value: "featured", label: "Destacados primero" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
];

const PAGE_SIZE = 24;

export default function CatalogoPageWrapper() {
  return (
    <Suspense>
      <CatalogoPage />
    </Suspense>
  );
}

function CatalogoPage() {
  const searchParams = useSearchParams();
  const [allProducts, setAllProducts] = useState<LocalProduct[]>(() =>
    getMergedProducts(),
  );
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [sort, setSort] = useState("new");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [newOnly, setNewOnly] = useState(false);
  // Mobile: start on game picker screen; go to products after selecting a game
  const [mobilePicker, setMobilePicker] = useState(true);

  // Apply ?filter=nuevo from URL on mount
  useEffect(() => {
    if (searchParams.get("filter") === "nuevo") {
      setNewOnly(true);
      setFiltersOpen(true);
      setMobilePicker(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-load when admin adds/edits products
  useEffect(() => {
    const reload = () =>
       
      setAllProducts(getMergedProducts());
    window.addEventListener("tcga:products:updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("tcga:products:updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const filtered = useMemo(() => {
    let list = [...allProducts];
    if (selectedGame) list = list.filter((p) => p.game === selectedGame);
    if (inStockOnly) list = list.filter((p) => p.inStock);
    if (newOnly) list = list.filter((p) => isNewProduct(p));
    if (sort === "new") {
      // Sort by createdAt descending — most recently added first.
      // Admin products without createdAt fall back to their timestamp-based ID.
      list = [...list].sort((a, b) => {
        const ta = a.createdAt
          ? new Date(a.createdAt).getTime()
          : a.id > 1_700_000_000_000
            ? a.id
            : 0;
        const tb = b.createdAt
          ? new Date(b.createdAt).getTime()
          : b.id > 1_700_000_000_000
            ? b.id
            : 0;
        return tb - ta;
      });
    } else if (sort === "featured") {
      list = [...list].sort(
        (a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0),
      );
    } else if (sort === "price-asc") {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sort === "price-desc") {
      list = [...list].sort((a, b) => b.price - a.price);
    }
    return list;
  }, [allProducts, selectedGame, inStockOnly, newOnly, sort]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  function selectGameMobile(slug: string) {
    setSelectedGame(slug);
    setPage(1);
    setMobilePicker(false);
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6 sm:py-10">

      {/* ── Mobile game picker screen ─────────────────────────── */}
      {mobilePicker && (
        <div className="md:hidden">
          <div className="mb-6">
            <h1 className="mb-1 text-2xl font-black text-gray-900">
              Explorar catálogo
            </h1>
            <p className="text-sm text-gray-500">
              Elige tu juego favorito
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {GAMES_ORDER.filter((slug) => GAME_CONFIG[slug]).map((slug) => {
              const cfg = GAME_CONFIG[slug];
              const logo = LOGO_MAP[slug];
              return (
                <button
                  key={slug}
                  onClick={() => selectGameMobile(slug)}
                  className="group relative overflow-hidden rounded-2xl text-left transition-transform active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${cfg.color}dd 0%, ${cfg.color}99 100%)`,
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {/* Subtle shimmer overlay */}
                  <div className="absolute inset-0 bg-white/5" />
                  <div className="relative flex flex-col items-center justify-center px-3 py-5 gap-3">
                    {/* Logo */}
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/images/logos/${logo}`}
                        alt={cfg.name}
                        className="h-14 w-auto object-contain drop-shadow-lg"
                        style={{ maxWidth: "100%" }}
                        onError={(e) => {
                          const img = e.currentTarget;
                          img.style.display = "none";
                          const span = img.nextElementSibling as HTMLElement | null;
                          if (span) span.style.display = "inline";
                        }}
                      />
                    ) : null}
                    <span
                      className="text-4xl"
                      aria-hidden="true"
                      style={{ display: logo ? "none" : "inline" }}
                    >
                      {cfg.emoji}
                    </span>
                    {/* Name */}
                    <span className="text-center text-xs font-bold leading-tight text-white drop-shadow">
                      {cfg.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Ver todo */}
          <button
            onClick={() => {
              setSelectedGame(null);
              setMobilePicker(false);
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 py-4 text-sm font-semibold text-gray-600 transition active:bg-gray-50"
          >
            <Layers size={16} />
            Ver todo el catálogo
          </button>
        </div>
      )}

      {/* ── Mobile: products view (after picking a game) ─────── */}
      {!mobilePicker && (
        <div className="mb-4 md:hidden">
          <button
            onClick={() => setMobilePicker(true)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition active:bg-gray-50"
          >
            <ArrowLeft size={15} />
            Todos los juegos
          </button>
        </div>
      )}

      {/* ── Rest of page: hidden on mobile picker view ───────── */}
      <div className={mobilePicker ? "hidden md:block" : ""}>

      {/* Header — desktop only (mobile has its own above) */}
      {/* Sort + filters bar */}
      <div className="mb-3 flex gap-3">
        <div className="relative flex-1">
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="h-11 cursor-pointer appearance-none rounded-xl border-2 border-gray-200 bg-white pr-9 pl-4 text-sm font-medium text-gray-700 transition focus:border-[#2563eb] focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-400"
          />
        </div>

        <button
          aria-label="Mostrar filtros"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`flex h-11 items-center gap-2 rounded-xl border-2 px-4 text-sm font-semibold transition ${
            filtersOpen
              ? "border-[#2563eb] bg-[#2563eb] text-white"
              : "border-gray-200 text-gray-700 hover:border-gray-300"
          }`}
        >
          <SlidersHorizontal size={15} /> Filtros
        </button>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="mb-3 flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <label className="flex cursor-pointer items-center gap-2.5 select-none">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${
                inStockOnly
                  ? "border-[#2563eb] bg-[#2563eb]"
                  : "border-gray-300"
              }`}
              onClick={() => {
                setInStockOnly(!inStockOnly);
                setPage(1);
              }}
            >
              {inStockOnly && (
                <svg
                  className="h-3 w-3 text-white"
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
            <span className="text-sm font-medium text-gray-700">
              Solo en stock
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 select-none">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${
                newOnly
                  ? "border-[#2563eb] bg-[#2563eb]"
                  : "border-gray-300"
              }`}
              onClick={() => {
                setNewOnly(!newOnly);
                setPage(1);
              }}
            >
              {newOnly && (
                <svg
                  className="h-3 w-3 text-white"
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
            <span className="text-sm font-medium text-gray-700">
              Solo novedades
            </span>
          </label>
          {(inStockOnly || newOnly) && (
            <button
              aria-label="Limpiar filtros"
              onClick={() => {
                setInStockOnly(false);
                setNewOnly(false);
              }}
              className="flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
            >
              <X size={13} /> Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Game name label (desktop) */}
      {selectedGame && (
        <div className="mb-2 hidden items-center gap-2 text-sm text-gray-500 md:flex">
          Mostrando:{" "}
          <Link
            href={`/${selectedGame}`}
            className="font-semibold text-[#2563eb] hover:underline"
          >
            {GAME_CONFIG[selectedGame]?.name ?? selectedGame}
          </Link>
          <button
            onClick={() => setSelectedGame(null)}
            aria-label="Quitar filtro de juego"
            className="ml-1 text-gray-400 hover:text-gray-600"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Products grid */}
      {filtered.length === 0 ? (
        <div className="py-24 text-center">
          <h2 className="mb-2 text-xl font-bold text-gray-700">
            No se encontraron productos
          </h2>
          <p className="mb-6 text-gray-500">
            Prueba a cambiar los filtros
          </p>
          <button
            onClick={() => {
              setSelectedGame(null);
              setInStockOnly(false);
              setNewOnly(false);
            }}
            className="rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visible.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-10 text-center">
              <button
                onClick={() => setPage((prev) => prev + 1)}
                className="rounded-xl border-2 border-[#2563eb] bg-white px-10 py-3.5 font-bold text-[#2563eb] transition hover:bg-[#2563eb] hover:text-white"
              >
                Cargar más productos
              </button>
            </div>
          )}
        </>
      )}
      </div>{/* end products wrapper */}
    </div>
  );
}
