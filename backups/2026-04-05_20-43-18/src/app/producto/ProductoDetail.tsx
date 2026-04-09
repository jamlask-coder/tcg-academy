"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getMergedById } from "@/lib/productStore";
import type { LocalProduct } from "@/data/products";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { GAME_CONFIG, CATEGORY_LABELS } from "@/data/products";
import Link from "next/link";

export function ProductoDetail() {
  const params = useSearchParams();
  const [product, setProduct] = useState<LocalProduct | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const idStr = params.get("id");
    if (!idStr) {
      setProduct(null);
      return;
    }
    const id = Number(idStr);
    if (isNaN(id)) {
      setProduct(null);
      return;
    }
    // Try immediately first; retry after a tick in case localStorage isn't ready yet
    const found = getMergedById(id);
    if (found) {
      setProduct(found);
      return;
    }
    const t = setTimeout(() => setProduct(getMergedById(id) ?? null), 100);
    return () => clearTimeout(t);
  }, [params]);

  if (product === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold text-gray-700">
          Producto no encontrado
        </p>
        <Link
          href="/catalogo"
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
        >
          Ver catálogo
        </Link>
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
