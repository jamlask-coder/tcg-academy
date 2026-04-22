"use client";
import { useMemo, useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import Link from "next/link";
import type { LocalProduct } from "@/data/products";
import { CARD_CATEGORIES } from "@/data/products";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import { getMergedByGame, getMergedByGameAndCategory } from "@/lib/productStore";
import {
  SidebarFilters,
  MobileFilterButton,
} from "@/components/filters/SidebarFilters";

// Idiomas ordenados para el filtro (estable top-level).
const LANG_ORDER = ["ES", "EN", "JP", "KO", "FR", "DE", "IT", "PT", "ZH"];

interface CategoryItem {
  id: string;
  label: string;
  href: string;
}

interface Props {
  products: LocalProduct[];
  color: string;
  game: string;
  category: string;
  categoryItems?: CategoryItem[];
}

function byDateDesc(a: LocalProduct, b: LocalProduct): number {
  // Admin products without createdAt fall back to their timestamp-based ID.
  const getTime = (p: LocalProduct) =>
    p.createdAt
      ? new Date(p.createdAt).getTime()
      : p.id > 1_700_000_000_000
        ? p.id
        : 0;
  return getTime(b) - getTime(a);
}

function GridContent({ products, color, game, category, categoryItems }: Props) {
  const isCardGrid = CARD_CATEGORIES.has(category);
  // Card grids: more columns (narrower cards); normal grids: fewer wider cards
  const gridCols = isCardGrid
    ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
  const params = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Merge static (SSG) products with admin-created products from localStorage,
  // sorted newest first so newly added products always appear at the top.
  const [mergedProducts, setMergedProducts] = useState<LocalProduct[]>(products);

  useEffect(() => {
    const load = () => {
      const all =
        category === "todo"
          ? getMergedByGame(game).filter((p) => !CARD_CATEGORIES.has(p.category))
          : getMergedByGameAndCategory(game, category);
      setMergedProducts([...all].sort(byDateDesc));
    };
    load();
    window.addEventListener("tcga:products:updated", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("tcga:products:updated", load);
      window.removeEventListener("storage", load);
    };
   
  }, [game, category]);

  const router = useRouter();
  const pathname = usePathname();
  const langs = useMemo(
    () => params.get("lang")?.split(",").filter(Boolean) ?? [],
    [params],
  );
  const inStock = params.get("inStock") !== "0";
  const priceMin = params.get("priceMin")
    ? Number(params.get("priceMin"))
    : null;
  const priceMax = params.get("priceMax")
    ? Number(params.get("priceMax"))
    : null;
  const query = (params.get("q") ?? "").trim();

  const clearQuery = () => {
    const next = new URLSearchParams(params.toString());
    next.delete("q");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  // Derive available languages from ACTUAL products. No banderas "phantom":
  // si no hay productos chinos, no aparece el flag ZH (regla del usuario).
  const availableLanguages = useMemo(() => {
    const fromProducts = new Set(
      mergedProducts.map((p) => p.language).filter(Boolean) as string[],
    );
    return [...fromProducts].sort((a, b) => {
      const ai = LANG_ORDER.indexOf(a.toUpperCase());
      const bi = LANG_ORDER.indexOf(b.toUpperCase());
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [mergedProducts]);

  const { minPrice, maxPrice } = useMemo(() => {
    if (!mergedProducts.length) return { minPrice: 0, maxPrice: 100 };
    const prices = mergedProducts.map((p) => p.price);
    return {
      minPrice: Math.floor(Math.min(...prices)),
      maxPrice: Math.ceil(Math.max(...prices)),
    };
  }, [mergedProducts]);

  const activeCount =
    langs.length +
    (!inStock ? 1 : 0) +
    (priceMin !== null ? 1 : 0) +
    (priceMax !== null ? 1 : 0) +
    (query ? 1 : 0);

  const filtered = useMemo(() => {
    let list = [...mergedProducts];
    if (langs.length) list = list.filter((p) => langs.includes(p.language));
    if (inStock) list = list.filter((p) => p.inStock);
    if (priceMin !== null) list = list.filter((p) => p.price >= priceMin);
    if (priceMax !== null) list = list.filter((p) => p.price <= priceMax);
    if (query) {
      // Multi-token AND search (accent-insensitive) over name + description + category.
      // Works for cross-language queries: "Teenage Mutant Ninja Turtles"
      // matches products whose descripción en español los cita textualmente.
      const norm = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const tokens = norm(query).split(/\s+/).filter(Boolean);
      list = list.filter((p) => {
        const hay = norm(`${p.name} ${p.description ?? ""} ${p.category ?? ""}`);
        return tokens.every((t) => hay.includes(t));
      });
    }
    return list;
  }, [mergedProducts, langs, inStock, priceMin, priceMax, query]);

  const visible = filtered;

  return (
    <div className="flex items-start gap-6">
      {/* Sidebar (desktop) */}
      <SidebarFilters
        availableLanguages={availableLanguages}
        minPrice={minPrice}
        maxPrice={maxPrice}
        color={color}
        filteredCount={filtered.length}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        categoryItems={categoryItems}
        activeCategory={category}
      />

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Mobile filter bar */}
        <div className="mb-3 lg:hidden">
          <MobileFilterButton
            onClick={() => setMobileOpen(true)}
            activeCount={activeCount}
            color={color}
            categoryLabel={categoryItems?.find((c) => c.id === category)?.label}
          />
        </div>

        {/* Active search chip (visible on all breakpoints) */}
        {query && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>Buscando:</span>
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700"
            >
              “{query}”
              <button
                onClick={clearQuery}
                aria-label="Quitar búsqueda"
                className="text-amber-700/70 hover:text-amber-700"
              >
                <X size={12} />
              </button>
            </span>
            <span className="text-gray-400">{filtered.length} resultados</span>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
            <Search size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="mb-2 font-medium text-gray-400">
              No hay productos con estos filtros
            </p>
            <Link
              href={`/${game}`}
              className="mt-1 text-sm hover:underline"
              style={{ color }}
            >
              Ver todo el catálogo de este juego
            </Link>
          </div>
        ) : (
          <div className={`grid gap-3 ${gridCols}`}>
            {visible.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CategoryFilteredGrid(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] animate-pulse rounded-2xl bg-gray-200"
            />
          ))}
        </div>
      }
    >
      <GridContent {...props} />
    </Suspense>
  );
}
