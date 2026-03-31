"use client";
import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import Link from "next/link";
import type { LocalProduct } from "@/data/products";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import {
  SidebarFilters,
  MobileFilterButton,
} from "@/components/filters/SidebarFilters";

// Card categories get portrait aspect + more columns
const CARD_CATEGORIES = new Set([
  "singles", "foil", "enchanted", "starlight", "prize-cards",
  "alternate-art", "secret-lair", "gradeadas", "scr", "field-centers",
]);

interface Props {
  products: LocalProduct[];
  color: string;
  game: string;
  category: string;
}

const PAGE_SIZE = 32;

function GridContent({ products, color, game, category }: Props) {
  const isCardGrid = CARD_CATEGORIES.has(category);
  // Card grids: more columns (narrower cards); normal grids: fewer wider cards
  const gridCols = isCardGrid
    ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4";
  const params = useSearchParams();
  const [page, setPage] = useState(1);
  const [mobileOpen, setMobileOpen] = useState(false);

  const langs = params.get("lang")?.split(",").filter(Boolean) ?? [];
  const inStock = params.get("inStock") === "1";
  const priceMin = params.get("priceMin") ? Number(params.get("priceMin")) : null;
  const priceMax = params.get("priceMax") ? Number(params.get("priceMax")) : null;

  // Derive available languages and price bounds from all products
  const availableLanguages = useMemo(
    () =>
      [...new Set(products.map((p) => p.language).filter(Boolean))] as string[],
    [products],
  );

  const { minPrice, maxPrice } = useMemo(() => {
    if (!products.length) return { minPrice: 0, maxPrice: 100 };
    const prices = products.map((p) => p.price);
    return {
      minPrice: Math.floor(Math.min(...prices)),
      maxPrice: Math.ceil(Math.max(...prices)),
    };
  }, [products]);

  const activeCount =
    langs.length +
    (inStock ? 1 : 0) +
    (priceMin !== null ? 1 : 0) +
    (priceMax !== null ? 1 : 0);

  const filtered = useMemo(() => {
    let list = [...products];
    if (langs.length) list = list.filter((p) => langs.includes(p.language));
    if (inStock) list = list.filter((p) => p.inStock);
    if (priceMin !== null) list = list.filter((p) => p.price >= priceMin);
    if (priceMax !== null) list = list.filter((p) => p.price <= priceMax);
    return list;
  }, [products, langs, inStock, priceMin, priceMax]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  return (
    <div className="flex gap-6">
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
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <p className="text-sm text-gray-500">{filtered.length} productos</p>
          <MobileFilterButton
            onClick={() => setMobileOpen(true)}
            activeCount={activeCount}
            color={color}
          />
        </div>

        {/* Desktop product count */}
        <p className="mb-4 hidden text-sm text-gray-500 lg:block">
          {filtered.length} productos
          {activeCount > 0 && (
            <span className="ml-2 text-xs text-gray-400">
              (filtros activos: {activeCount})
            </span>
          )}
        </p>

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
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = color;
                    (e.currentTarget as HTMLButtonElement).style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
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
