"use client";
import { useState, useEffect } from "react";
import { getRecentlyViewedIds } from "@/lib/recentlyViewed";
import { getMergedProducts } from "@/lib/productStore";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import type { LocalProduct } from "@/data/products";

interface Props {
  excludeId?: number;
}

export function RecentlyViewedSection({ excludeId }: Props) {
  const [products, setProducts] = useState<LocalProduct[]>([]);

  useEffect(() => {
    // Fix 2026-04-22: si el admin edita nombre/precio/imagen mientras el
    // usuario está viendo un producto, la sección "vistos recientemente"
    // mostraba datos caducos. Ahora escuchamos tcga:products:updated y
    // recalculamos la lista a partir de merged products en cada emisión.
    const recompute = () => {
      const ids = getRecentlyViewedIds();
      const all = getMergedProducts();
      const result: LocalProduct[] = [];
      for (const id of ids) {
        if (id === excludeId) continue;
        const p = all.find((x) => x.id === id);
        if (p) result.push(p);
      }
      setProducts(result.slice(0, 8));
    };
    recompute();
    if (typeof window === "undefined") return;
    window.addEventListener("tcga:products:updated", recompute);
    return () => window.removeEventListener("tcga:products:updated", recompute);
  }, [excludeId]);

  if (products.length === 0) return null;

  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xl font-bold text-gray-900">
        Vistos recientemente
      </h2>
      {/* Mobile: horizontal scroll; desktop: grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {products.map((p) => (
          <LocalProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
