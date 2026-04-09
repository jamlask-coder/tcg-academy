"use client";
import { useEffect, useState } from "react";
import { getMergedById } from "@/lib/productStore";
import type { LocalProduct } from "@/data/products";
import { GAME_CONFIG, CATEGORY_LABELS } from "@/data/products";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";

export default function ProductoPage({ id: idProp }: { id: string }) {
  const [product, setProduct] = useState<LocalProduct | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const id = Number(idProp);
    if (isNaN(id)) {
      setProduct(null);
      return;
    }
    setProduct(getMergedById(id) ?? null);
  }, [idProp]);

  if (product === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }
  if (product === null) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-gray-500">
        Producto no encontrado
      </div>
    );
  }

  const config = GAME_CONFIG[product.game] ?? {
    name: product.game,
    color: "#6366f1",
    bgColor: "#eef2ff",
    description: "",
    emoji: "🃏",
  };

  const catLabel = CATEGORY_LABELS[product.category] ?? product.category;

  return (
    <ProductDetailClient product={product} config={config} catLabel={catLabel} />
  );
}
