"use client";
import { Suspense, useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { X, ChevronDown, ArrowLeft, Layers } from "lucide-react";
import { GAME_CONFIG, isNewProduct } from "@/data/products";
import type { LocalProduct } from "@/data/products";
import { getMergedProducts } from "@/lib/productStore";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import Link from "next/link";
import {
  SidebarFilters,
  MobileFilterButton,
} from "@/components/filters/SidebarFilters";

// Idiomas ordenados para mostrar en el filtro (estable top-level).
const LANG_ORDER = ["ES", "EN", "JP", "KO", "FR", "DE", "IT", "PT", "ZH"];

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
  const router = useRouter();
  const pathname = usePathname();
  const [allProducts, setAllProducts] = useState<LocalProduct[]>(() =>
    getMergedProducts(),
  );
  const [sort, setSort] = useState("new");
  const [page, setPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [newOnly, setNewOnly] = useState(false);
  // Mobile: start on game picker screen; go to products after selecting a game
  const [mobilePicker, setMobilePicker] = useState(true);

  // Filters that live in URL (consistent with /[game] + SidebarFilters):
  //   ?game=<slug> · ?q=<text> · ?lang=EN,ES · ?inStock=0 · ?priceMin/Max · ?filter=nuevo
  const selectedGame = searchParams.get("game");
  const query = (searchParams.get("q") ?? "").trim();
  const langs = useMemo(
    () => searchParams.get("lang")?.split(",").filter(Boolean) ?? [],
    [searchParams],
  );
  const inStockOnly = searchParams.get("inStock") !== "0"; // default on
  const priceMin = searchParams.get("priceMin") ? Number(searchParams.get("priceMin")) : null;
  const priceMax = searchParams.get("priceMax") ? Number(searchParams.get("priceMax")) : null;

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Apply ?filter=nuevo, ?game=<slug>, ?q=<text> from URL on mount — leave mobile picker
  useEffect(() => {
    if (searchParams.get("filter") === "nuevo") setNewOnly(true);
    if (searchParams.get("game") || (searchParams.get("q") ?? "").trim()) {
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
    if (langs.length) list = list.filter((p) => langs.includes(p.language));
    if (priceMin !== null) list = list.filter((p) => p.price >= priceMin);
    if (priceMax !== null) list = list.filter((p) => p.price <= priceMax);
    if (query) {
      // Multi-token AND search over name + description + category.
      // Splits query into tokens so "Teenage Mutant Ninja Turtles" matches
      // products that contain all those words (e.g., "Tortugas Ninja" won't,
      // but "Ninja Turtles" variants will). Accent-insensitive.
      const norm = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const tokens = norm(query).split(/\s+/).filter(Boolean);
      list = list.filter((p) => {
        const hay = norm(`${p.name} ${p.description ?? ""} ${p.category ?? ""}`);
        return tokens.every((t) => hay.includes(t));
      });
    }
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
  }, [allProducts, selectedGame, inStockOnly, newOnly, sort, query, langs, priceMin, priceMax]);

  // Derive available languages + price bounds from the current scope
  // (all products, optionally restricted by selected game) so the sidebar
  // shows coherent options even before any filter is applied.
  const scopeForSidebar = useMemo(
    () =>
      selectedGame
        ? allProducts.filter((p) => p.game === selectedGame)
        : allProducts,
    [allProducts, selectedGame],
  );
  const availableLanguages = useMemo(() => {
    const set = new Set(scopeForSidebar.map((p) => p.language).filter(Boolean));
    set.add("ZH");
    return [...set].sort((a, b) => {
      const ai = LANG_ORDER.indexOf(a.toUpperCase());
      const bi = LANG_ORDER.indexOf(b.toUpperCase());
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [scopeForSidebar]);
  const { minPrice, maxPrice } = useMemo(() => {
    if (!scopeForSidebar.length) return { minPrice: 0, maxPrice: 100 };
    const prices = scopeForSidebar.map((p) => p.price);
    return {
      minPrice: Math.floor(Math.min(...prices)),
      maxPrice: Math.ceil(Math.max(...prices)),
    };
  }, [scopeForSidebar]);

  // Sidebar accent: blue on "Todos", game color when a game is picked
  const sidebarColor = selectedGame
    ? (GAME_CONFIG[selectedGame]?.color ?? "#2563eb")
    : "#2563eb";

  const activeFilterCount =
    langs.length +
    (!inStockOnly ? 1 : 0) +
    (priceMin !== null ? 1 : 0) +
    (priceMax !== null ? 1 : 0) +
    (newOnly ? 1 : 0);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  function selectGameMobile(slug: string) {
    updateParam("game", slug);
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
              updateParam("game", null);
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

      <div className="flex items-start gap-6">
        {/* ── Left sidebar (desktop) + mobile drawer ─────────── */}
        <SidebarFilters
          availableLanguages={availableLanguages}
          minPrice={minPrice}
          maxPrice={maxPrice}
          color={sidebarColor}
          filteredCount={filtered.length}
          mobileOpen={mobileFilterOpen}
          onMobileClose={() => setMobileFilterOpen(false)}
        />

        {/* ── Main column ─────────────────────────────────────── */}
        <div className="min-w-0 flex-1">
          {/* Sort + mobile filter button */}
          <div className="mb-3 flex gap-3">
            <div className="relative flex-1">
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                aria-label="Ordenar productos"
                className="h-11 w-full cursor-pointer appearance-none rounded-xl border-2 border-gray-200 bg-white pr-9 pl-4 text-sm font-medium text-gray-700 transition focus:border-[#2563eb] focus:outline-none"
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

            {/* Mobile filter button (opens drawer) */}
            <div className="lg:hidden">
              <MobileFilterButton
                onClick={() => setMobileFilterOpen(true)}
                activeCount={activeFilterCount}
                color={sidebarColor}
              />
            </div>
          </div>

          {/* "Solo novedades" toggle — extra filter that is not in SidebarFilters */}
          <label className="mb-3 flex w-fit cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2 select-none hover:border-gray-300">
            <input
              type="checkbox"
              checked={newOnly}
              onChange={(e) => {
                setNewOnly(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 accent-[#2563eb]"
            />
            <span className="text-sm font-medium text-gray-700">Solo novedades</span>
          </label>

          {/* Active filter chips (game + query) */}
          {(selectedGame || query) && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span>Mostrando:</span>
              {selectedGame && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-[#2563eb]">
                  <Link href={`/${selectedGame}`} className="hover:underline">
                    {GAME_CONFIG[selectedGame]?.name ?? selectedGame}
                  </Link>
                  <button
                    onClick={() => updateParam("game", null)}
                    aria-label="Quitar filtro de juego"
                    className="text-[#2563eb]/70 hover:text-[#2563eb]"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {query && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                  “{query}”
                  <button
                    onClick={() => updateParam("q", null)}
                    aria-label="Quitar búsqueda"
                    className="text-amber-700/70 hover:text-amber-700"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Products grid */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
              <h2 className="mb-2 text-xl font-bold text-gray-700">
                No se encontraron productos
              </h2>
              <p className="mb-6 text-gray-500">Prueba a cambiar los filtros</p>
              <button
                onClick={() => {
                  router.replace(pathname, { scroll: false });
                  setNewOnly(false);
                }}
                className="rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
        </div>{/* end main column */}
      </div>{/* end flex layout */}
      </div>{/* end products wrapper */}
    </div>
  );
}
