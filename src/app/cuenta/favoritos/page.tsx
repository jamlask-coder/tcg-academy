"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Heart, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { useFavorites } from "@/context/FavoritesContext";
import { getMergedProducts } from "@/lib/productStore";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import type { LocalProduct } from "@/data/products";
import { LANGUAGE_NAMES } from "@/data/products";
import { LanguageFlag } from "@/components/ui/LanguageFlag";

const LANG_ORDER = ["ES", "EN", "JP", "KO", "FR", "DE", "IT", "PT", "ZH"];

export default function FavoritosPage() {
  const { favorites } = useFavorites();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const all = getMergedProducts();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProducts(all.filter((p) => favorites.includes(p.id)));
  }, [favorites]);

  // URL-driven filters (same keys as rest of the site for consistency)
  const langs = useMemo(
    () => params.get("lang")?.split(",").filter(Boolean) ?? [],
    [params],
  );
  const inStock = params.get("inStock") !== "0";
  const priceMin = params.get("priceMin") ? Number(params.get("priceMin")) : null;
  const priceMax = params.get("priceMax") ? Number(params.get("priceMax")) : null;

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const toggleLang = (lang: string) => {
    const nextLangs = langs.includes(lang)
      ? langs.filter((l) => l !== lang)
      : [...langs, lang];
    updateParam("lang", nextLangs.length ? nextLangs.join(",") : null);
  };

  const availableLanguages = useMemo(() => {
    const set = new Set(products.map((p) => p.language).filter(Boolean));
    return [...set].sort((a, b) => {
      const ai = LANG_ORDER.indexOf(a.toUpperCase());
      const bi = LANG_ORDER.indexOf(b.toUpperCase());
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [products]);

  const { minPrice, maxPrice } = useMemo(() => {
    if (!products.length) return { minPrice: 0, maxPrice: 100 };
    const prices = products.map((p) => p.price);
    return {
      minPrice: Math.floor(Math.min(...prices)),
      maxPrice: Math.ceil(Math.max(...prices)),
    };
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (langs.length) list = list.filter((p) => langs.includes(p.language));
    if (inStock) list = list.filter((p) => p.inStock);
    if (priceMin !== null) list = list.filter((p) => p.price >= priceMin);
    if (priceMax !== null) list = list.filter((p) => p.price <= priceMax);
    return list;
  }, [products, langs, inStock, priceMin, priceMax]);

  const activeCount =
    langs.length +
    (!inStock ? 1 : 0) +
    (priceMin !== null ? 1 : 0) +
    (priceMax !== null ? 1 : 0);

  const clearAll = () => router.replace(pathname, { scroll: false });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis favoritos</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filtered.length} de {products.length} producto
            {products.length !== 1 ? "s" : ""} guardado
            {products.length !== 1 ? "s" : ""}
          </p>
        </div>

        {products.length > 0 && (
          <button
            onClick={() => setPanelOpen((v) => !v)}
            aria-label="Mostrar filtros"
            aria-expanded={panelOpen}
            className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-semibold transition ${
              panelOpen
                ? "border-[#2563eb] bg-[#2563eb] text-white"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            <SlidersHorizontal size={15} />
            Filtros
            {activeCount > 0 && (
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                  panelOpen ? "bg-white text-[#2563eb]" : "bg-[#2563eb] text-white"
                }`}
              >
                {activeCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Inline collapsible filter panel — compact, fits inside the /cuenta
          content area without stacking a second sidebar next to the account nav. */}
      {panelOpen && products.length > 0 && (
        <div className="mb-4 space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          {/* In stock */}
          <label className="flex cursor-pointer items-center gap-2.5 select-none">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => updateParam("inStock", e.target.checked ? null : "0")}
              className="h-4 w-4 accent-[#2563eb]"
            />
            <span className="text-sm font-medium text-gray-700">Solo en stock</span>
          </label>

          {/* Price range */}
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Precio (€)
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={minPrice}
                max={maxPrice}
                defaultValue={priceMin ?? ""}
                placeholder={String(minPrice)}
                onBlur={(e) => {
                  const v = e.currentTarget.value;
                  updateParam("priceMin", v === "" ? null : String(Math.round(Number(v))));
                }}
                aria-label="Precio mínimo"
                className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-[#2563eb] focus:outline-none"
              />
              <span className="text-gray-400">—</span>
              <input
                type="number"
                min={minPrice}
                max={maxPrice}
                defaultValue={priceMax ?? ""}
                placeholder={String(maxPrice)}
                onBlur={(e) => {
                  const v = e.currentTarget.value;
                  updateParam("priceMax", v === "" ? null : String(Math.round(Number(v))));
                }}
                aria-label="Precio máximo"
                className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-[#2563eb] focus:outline-none"
              />
            </div>
          </div>

          {/* Languages */}
          {availableLanguages.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Idioma
              </p>
              <div className="flex flex-wrap gap-2">
                {availableLanguages.map((lang) => {
                  const active = langs.includes(lang);
                  return (
                    <button
                      key={lang}
                      onClick={() => toggleLang(lang)}
                      aria-pressed={active}
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        active
                          ? "border-[#2563eb] bg-[#2563eb] text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <LanguageFlag language={lang} size="sm" />
                      {LANGUAGE_NAMES[lang] ?? lang}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600"
            >
              <X size={13} /> Limpiar filtros
            </button>
          )}
        </div>
      )}

      {products.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center">
          <Heart size={48} className="mx-auto mb-4 text-gray-200" />
          <p className="mb-2 font-bold text-gray-700">
            Aún no tienes favoritos
          </p>
          <p className="mb-6 text-sm text-gray-500">
            Haz clic en el corazón de cualquier producto para guardarlo aquí
          </p>
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            <ShoppingBag size={16} /> Explorar catálogo
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <p className="mb-2 font-medium text-gray-400">
            Ningún favorito con estos filtros
          </p>
          <p className="text-sm text-gray-300">
            Prueba a ajustar el panel de filtros
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <LocalProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
