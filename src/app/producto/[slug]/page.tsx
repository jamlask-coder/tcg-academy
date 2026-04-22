"use client";
// Ruta legible para productos que no tienen URL estática SEO
// (`/[game]/[category]/[slug]`). La usan los productos creados en admin a
// runtime (Date.now() IDs), que no están en `PRODUCTS` y por tanto no se
// prerenderizan. El lookup es cliente-side (localStorage + merge con PRODUCTS).
//
// Reemplaza el viejo fallback `/producto?id=X` — URL legible (`/producto/mi-booster`)
// en lugar de ID numérico opaco.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getMergedBySlug } from "@/lib/productStore";
import type { LocalProduct } from "@/data/products";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { GAME_CONFIG, CATEGORY_LABELS } from "@/data/products";

export default function ProductoBySlugPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [product, setProduct] = useState<LocalProduct | null | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!slug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProduct(null);
      return;
    }
    // Intentar lookup inmediato; reintento tras tick por si localStorage no
    // está listo aún (hidratación parcial).
    const found = getMergedBySlug(slug);
    if (found) {
      setProduct(found);
      return;
    }
    const t = setTimeout(() => setProduct(getMergedBySlug(slug) ?? null), 100);
    return () => clearTimeout(t);
  }, [slug]);

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
    <ProductDetailClient
      product={product}
      config={config}
      catLabel={catLabel}
    />
  );
}
