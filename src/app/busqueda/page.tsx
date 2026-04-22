"use client";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect, Suspense } from "react";
import { GAME_CONFIG } from "@/data/products";
import type { LocalProduct } from "@/data/products";
import { getMergedProducts } from "@/lib/productStore";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import { Search } from "lucide-react";
import Link from "next/link";
import {
  SidebarFilters,
  MobileFilterButton,
} from "@/components/filters/SidebarFilters";

const LANG_ORDER = ["ES", "EN", "JP", "KO", "FR", "DE", "IT", "PT", "ZH"];

function SearchPageContent() {
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const [allProducts, setAllProducts] = useState<LocalProduct[]>([]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllProducts(getMergedProducts());
    const handler = () => setAllProducts(getMergedProducts());
    window.addEventListener("tcga:products:updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("tcga:products:updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  // URL-driven sidebar filters (shared pattern across product pages)
  const langs = useMemo(
    () => params.get("lang")?.split(",").filter(Boolean) ?? [],
    [params],
  );
  const inStock = params.get("inStock") !== "0";
  const priceMin = params.get("priceMin") ? Number(params.get("priceMin")) : null;
  const priceMax = params.get("priceMax") ? Number(params.get("priceMax")) : null;

  // Base: text match against name + description + tags + game name
  const baseResults = useMemo(() => {
    if (!q) return [];
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        (GAME_CONFIG[p.game]?.name ?? p.game).toLowerCase().includes(q),
    );
  }, [q, allProducts]);

  const availableLanguages = useMemo(() => {
    const set = new Set(baseResults.map((p) => p.language).filter(Boolean));
    return [...set].sort((a, b) => {
      const ai = LANG_ORDER.indexOf(a.toUpperCase());
      const bi = LANG_ORDER.indexOf(b.toUpperCase());
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [baseResults]);

  const { minPrice, maxPrice } = useMemo(() => {
    if (!baseResults.length) return { minPrice: 0, maxPrice: 100 };
    const prices = baseResults.map((p) => p.price);
    return {
      minPrice: Math.floor(Math.min(...prices)),
      maxPrice: Math.ceil(Math.max(...prices)),
    };
  }, [baseResults]);

  const results = useMemo(() => {
    let list = baseResults;
    if (langs.length) list = list.filter((p) => langs.includes(p.language));
    if (inStock) list = list.filter((p) => p.inStock);
    if (priceMin !== null) list = list.filter((p) => p.price >= priceMin);
    if (priceMax !== null) list = list.filter((p) => p.price <= priceMax);
    return list;
  }, [baseResults, langs, inStock, priceMin, priceMax]);

  const activeCount =
    langs.length +
    (!inStock ? 1 : 0) +
    (priceMin !== null ? 1 : 0) +
    (priceMax !== null ? 1 : 0);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl">
        {q ? (
          <>
            Resultados para{" "}
            <span className="text-[#2563eb]">&quot;{q}&quot;</span>
          </>
        ) : (
          "Búsqueda"
        )}
      </h1>

      {!q ? (
        <div className="py-16 text-center text-gray-400">
          <Search size={48} className="mx-auto mb-4 text-gray-200" />
          <p>Introduce un término de búsqueda</p>
        </div>
      ) : (
        <div className="flex items-start gap-6">
          <SidebarFilters
            availableLanguages={availableLanguages}
            minPrice={minPrice}
            maxPrice={maxPrice}
            color="#2563eb"
            filteredCount={results.length}
            mobileOpen={mobileFilterOpen}
            onMobileClose={() => setMobileFilterOpen(false)}
          />

          <div className="min-w-0 flex-1">
            <div className="mb-3 lg:hidden">
              <MobileFilterButton
                onClick={() => setMobileFilterOpen(true)}
                activeCount={activeCount}
                color="#2563eb"
              />
            </div>

            {baseResults.length === 0 ? (
              <div className="py-16 text-center">
                <Search size={48} className="mx-auto mb-4 text-gray-200" />
                <h2 className="mb-2 text-xl font-bold text-gray-700">
                  Sin resultados
                </h2>
                <p className="mb-6 text-gray-500">
                  No encontramos nada para &quot;{q}&quot;
                </p>
                <Link
                  href="/catalogo"
                  className="inline-block rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
                >
                  Ver todo el catálogo
                </Link>
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
                <p className="mb-2 font-medium text-gray-400">
                  Ningún resultado con estos filtros
                </p>
                <p className="text-sm text-gray-300">
                  Prueba a ajustar el panel de filtros
                </p>
              </div>
            ) : (
              <>
                <p className="mb-6 text-sm text-gray-500">
                  {results.length} resultado{results.length !== 1 ? "s" : ""}{" "}
                  para &quot;{q}&quot;
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {results.map((p) => (
                    <LocalProductCard key={p.id} product={p} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BusquedaPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-6 h-8 w-64 animate-pulse rounded bg-gray-200" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-2xl bg-gray-200"
              />
            ))}
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
