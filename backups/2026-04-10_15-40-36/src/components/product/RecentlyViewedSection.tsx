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
    const ids = getRecentlyViewedIds();
    const all = getMergedProducts();
    const result: LocalProduct[] = [];
    for (const id of ids) {
      if (id === excludeId) continue;
      const p = all.find((x) => x.id === id);
      if (p) result.push(p);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProducts(result.slice(0, 8));
  }, [excludeId]);

  if (products.length === 0) return null;

  return (
    <section className="mb-12">
      <h2 className="mb-6 text-xl font-bold text-gray-900">
        Vistos recientemente
      </h2>
      {/* Mobile: horizontal scroll; desktop: grid */}
      <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
        {products.map((p) => (
          <div key={p.id} className="w-[160px] flex-shrink-0 sm:w-auto">
            <LocalProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
