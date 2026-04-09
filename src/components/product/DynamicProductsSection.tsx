"use client";
import { useEffect, useState } from "react";
import type { LocalProduct } from "@/data/products";
import {
  getMergedByGame,
  getMergedByGameAndCategory,
  isLocalProduct,
} from "@/lib/productStore";
import { LocalProductCard } from "@/components/product/LocalProductCard";

interface Props {
  game: string;
  category?: string;
  color: string;
  staticProductIds: number[];
}

export function DynamicProductsSection({
  game,
  category,
  color,
  staticProductIds,
}: Props) {
  const [products, setProducts] = useState<LocalProduct[]>([]);

  useEffect(() => {
    const load = () => {
      const all = category
        ? getMergedByGameAndCategory(game, category)
        : getMergedByGame(game);
      setProducts(
        all.filter(
          (p) => isLocalProduct(p.id) && !staticProductIds.includes(p.id),
        ),
      );
    };
    load();
    window.addEventListener("storage", load);
    window.addEventListener("tcga:products:updated", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("tcga:products:updated", load);
    };
  }, [game, category, staticProductIds]);

  if (products.length === 0) return null;

  return (
    <section className="border-t border-gray-100 py-10">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900">
          <span
            className="h-4 w-1 rounded-full"
            style={{ backgroundColor: color }}
          />
          Nuevos productos
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {products.map((product) => (
            <LocalProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
