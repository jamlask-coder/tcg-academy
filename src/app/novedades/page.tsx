"use client";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import type { LocalProduct } from "@/data/products";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import { getMergedProducts } from "@/lib/productStore";
import {
  SidebarFilters,
  MobileFilterButton,
} from "@/components/filters/SidebarFilters";

const LANG_ORDER = ["ES", "EN", "JP", "KO", "FR", "DE", "IT", "PT", "ZH"];

function byDateDesc(a: LocalProduct, b: LocalProduct): number {
  const getTime = (p: LocalProduct) =>
    p.createdAt
      ? new Date(p.createdAt).getTime()
      : p.id > 1_700_000_000_000
        ? p.id
        : 0;
  return getTime(b) - getTime(a);
}

export default function NovedadesPage() {
  const params = useSearchParams();
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    const all = getMergedProducts();
    setProducts([...all].sort(byDateDesc));
    const handler = () =>
      setProducts([...getMergedProducts()].sort(byDateDesc));
    window.addEventListener("tcga:products:updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("tcga:products:updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  // URL-driven sidebar filters
  const langs = useMemo(
    () => params.get("lang")?.split(",").filter(Boolean) ?? [],
    [params],
  );
  const inStock = params.get("inStock") !== "0";
  const priceMin = params.get("priceMin") ? Number(params.get("priceMin")) : null;
  const priceMax = params.get("priceMax") ? Number(params.get("priceMax")) : null;

  // Base: products created in last 60 days
  // eslint-disable-next-line react-hooks/purity
  const cutoff = useMemo(() => Date.now() - 60 * 24 * 60 * 60 * 1000, []);
  const baseNovedades = useMemo(
    () =>
      products.filter(
        (p) => p.createdAt && new Date(p.createdAt).getTime() >= cutoff,
      ),
    [products, cutoff],
  );

  const availableLanguages = useMemo(() => {
    const set = new Set(baseNovedades.map((p) => p.language).filter(Boolean));
    return [...set].sort((a, b) => {
      const ai = LANG_ORDER.indexOf(a.toUpperCase());
      const bi = LANG_ORDER.indexOf(b.toUpperCase());
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [baseNovedades]);

  const { minPrice, maxPrice } = useMemo(() => {
    if (!baseNovedades.length) return { minPrice: 0, maxPrice: 100 };
    const prices = baseNovedades.map((p) => p.price);
    return {
      minPrice: Math.floor(Math.min(...prices)),
      maxPrice: Math.ceil(Math.max(...prices)),
    };
  }, [baseNovedades]);

  const novedades = useMemo(() => {
    let list = baseNovedades;
    if (langs.length) list = list.filter((p) => langs.includes(p.language));
    if (inStock) list = list.filter((p) => p.inStock);
    if (priceMin !== null) list = list.filter((p) => p.price >= priceMin);
    if (priceMax !== null) list = list.filter((p) => p.price <= priceMax);
    return list;
  }, [baseNovedades, langs, inStock, priceMin, priceMax]);

  const activeCount =
    langs.length +
    (!inStock ? 1 : 0) +
    (priceMin !== null ? 1 : 0) +
    (priceMax !== null ? 1 : 0);

  const visible = novedades;

  return (
    <div className="bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 py-8 text-center text-white">
        <div className="mx-auto max-w-[1400px] px-4">
          <div className="flex items-center justify-center gap-3">
            <Sparkles size={28} />
            <h1 className="text-3xl font-black tracking-tight">Novedades</h1>
            <Sparkles size={28} />
          </div>
          <p className="mt-2 text-sm font-medium text-white/80">
            Los últimos productos añadidos a nuestra tienda
          </p>
        </div>
      </div>

      {/* Products */}
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="flex items-start gap-6">
          <SidebarFilters
            availableLanguages={availableLanguages}
            minPrice={minPrice}
            maxPrice={maxPrice}
            color="#f59e0b"
            filteredCount={novedades.length}
            mobileOpen={mobileFilterOpen}
            onMobileClose={() => setMobileFilterOpen(false)}
          />

          <div className="min-w-0 flex-1">
            <div className="mb-3 lg:hidden">
              <MobileFilterButton
                onClick={() => setMobileFilterOpen(true)}
                activeCount={activeCount}
                color="#f59e0b"
              />
            </div>

            {baseNovedades.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-gray-200 py-24 text-center">
                <Sparkles size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="font-medium text-gray-400">
                  No hay novedades recientes
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  Vuelve pronto para ver los nuevos productos
                </p>
              </div>
            ) : novedades.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
                <p className="mb-2 font-medium text-gray-400">
                  No hay novedades con estos filtros
                </p>
                <p className="text-sm text-gray-300">
                  Prueba a ajustar el panel de filtros
                </p>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-gray-500">
                  {novedades.length} producto
                  {novedades.length !== 1 ? "s" : ""} añadido
                  {novedades.length !== 1 ? "s" : ""} en los últimos 60 días
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                  {visible.map((p) => (
                    <LocalProductCard key={p.id} product={p} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
