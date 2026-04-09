"use client";
import { useProductsByGame, useProductsByGameAndCategory } from "@/hooks/useProductStore";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import { isLocalProduct } from "@/lib/productStore";

interface Props {
  game: string;
  category?: string;
  color: string;
  staticProductIds: number[]; // IDs already shown statically — don't duplicate
}

export function DynamicProductsSection({
  game,
  category,
  color: _color,
  staticProductIds,
}: Props) {
  const allProductsWithGame = useProductsByGame(game);
  const allProductsWithCategory = useProductsByGameAndCategory(
    game,
    category ?? "",
  );

  const allProducts = category ? allProductsWithCategory : allProductsWithGame;

  const dynamicProducts = allProducts.filter(
    (p) => isLocalProduct(p.id) && !staticProductIds.includes(p.id),
  );

  if (dynamicProducts.length === 0) return null;

  return (
    <section className="border-t border-gray-100 py-10">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <h2 className="mb-6 text-xl font-bold text-gray-900">
          Nuevos productos
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {dynamicProducts.map((product) => (
            <LocalProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
