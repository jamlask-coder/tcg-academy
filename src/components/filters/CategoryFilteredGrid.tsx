"use client";
import { useMemo, useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import Link from "next/link";
import type { LocalProduct } from "@/data/products";
import { CARD_CATEGORIES } from "@/data/products";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import { getMergedByGame, getMergedByGameAndCategory } from "@/lib/productStore";
import {
  SidebarFilters,
  MobileFilterButton,
} from "@/components/filters/SidebarFilters";

interface Props {
  products: LocalProduct[];
  color: string;
  game: string;
  category: string;
}

const PAGE_SIZE = 32;

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

function GridContent({ products, color, game, category }: Props) {
  const isCardGrid = CARD_CATEGORIES.has(category);
  // Card grids: more columns (narrower cards); normal grids: fewer wider cards
  const gridCols = isCardGrid
    ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4";
  const params = useSearchParams();
  const [page, setPage] = useState(1);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, category]);

  const langs = params.get("lang")?.split(",").filter(Boolean) ?? [];
  const inStock = params.get("inStock") === "1";
  const priceMin = params.get("priceMin")
    ? Number(params.get("priceMin"))
    : null;
  const priceMax = params.get("priceMax")
    ? Number(params.get("priceMax"))
    : null;

  // Derive available languages — ordered: ES, EN, JP, KO, then rest alphabetically
  const LANG_ORDER = ["ES", "EN", "JP", "KO"];
  const availableLanguages = useMemo(() => {
    const langs = [...new Set(mergedProducts.map((p) => p.language).filter(Boolean))] as string[];
    return langs.sort((a, b) => {
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
    (inStock ? 1 : 0) +
    (priceMin !== null ? 1 : 0) +
    (priceMax !== null ? 1 : 0);

  const filtered = useMemo(() => {
    let list = [...mergedProducts];
    if (langs.length) list = list.filter((p) => langs.includes(p.language));
    if (inStock) list = list.filter((p) => p.inStock);
    if (priceMin !== null) list = list.filter((p) => p.price >= priceMin);
    if (priceMax !== null) list = list.filter((p) => p.price <= priceMax);
    return list;
  }, [mergedProducts, langs, inStock, priceMin, priceMax]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  return (
    <div className="flex items-start gap-6">
      {/* Sidebar (desktop) */}
      <SidebarFilters
        availableLanguages={availableLanguages}
        minPrice={minPrice}
        maxPrice={maxPrice}
        color={color}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Mobile filter bar */}
        <div className="mb-3 flex items-center justify-end lg:hidden">
          <MobileFilterButton
            onClick={() => setMobileOpen(true)}
            activeCount={activeCount}
            color={color}
          />
        </div>

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
          <>
            <div className={`grid gap-3 ${gridCols}`}>
              {visible.map((p) => (
                <LocalProductCard key={p.id} product={p} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setPage((prev) => prev + 1)}
                  className="rounded-xl border-2 px-10 py-3 font-bold transition hover:text-white"
                  style={{
                    borderColor: color,
                    color,
                  }}
                  onMouseEnter={(e) => {
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.backgroundColor = color;
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "white";
                  }}
                  onMouseLeave={(e) => {
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.backgroundColor = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = color;
                  }}
                >
                  Cargar más productos
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function CategoryFilteredGrid(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
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
