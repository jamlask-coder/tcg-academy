"use client";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect, Suspense } from "react";
import { GAME_CONFIG } from "@/data/products";
import type { LocalProduct } from "@/data/products";
import { getMergedProducts } from "@/lib/productStore";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import { Search } from "lucide-react";
import Link from "next/link";

function SearchPageContent() {
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const [allProducts, setAllProducts] = useState<LocalProduct[]>([]);

  useEffect(() => {
    setAllProducts(getMergedProducts());
    const handler = () => setAllProducts(getMergedProducts());
    window.addEventListener("tcga:products:updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("tcga:products:updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const results = useMemo(() => {
    if (!q) return [];
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        (GAME_CONFIG[p.game]?.name ?? p.game).toLowerCase().includes(q),
    );
  }, [q, allProducts]);

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
      ) : results.length === 0 ? (
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
      ) : (
        <>
          <p className="mb-6 text-sm text-gray-500">
            {results.length} resultado{results.length !== 1 ? "s" : ""} para
            &quot;{q}&quot;
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {results.map((p) => (
              <LocalProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
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
