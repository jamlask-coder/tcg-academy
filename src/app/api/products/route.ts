/**
 * GET /api/products — Catálogo público.
 *
 * Devuelve todos los productos no-eliminados en el shape `LocalProduct` que
 * espera la web. La conversión `ProductRecord (DB) → LocalProduct (UI)` ocurre
 * aquí — la metadata extendida (game, category, tags, isFeatured, isNew,
 * comparePrice, wholesalePrice, storePrice, costPrice, packs/box, gtin13, mpn,
 * límites por rol) viaja en `metadata` JSONB.
 *
 * En modo local devuelve PRODUCTS estático para que el cliente funcione sin
 * Supabase configurado.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { LocalProduct } from "@/data/products";
import { PRODUCTS } from "@/data/products";
import { logger } from "@/lib/logger";

function isServerMode(): boolean {
  return process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
}

export async function GET() {
  try {
    if (!isServerMode()) {
      return NextResponse.json({ products: PRODUCTS });
    }

    const records = await getDb().getProducts();
    const products: LocalProduct[] = records.map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      const num = (k: string): number | undefined =>
        typeof meta[k] === "number" ? (meta[k] as number) : undefined;
      const str = (k: string): string | undefined =>
        typeof meta[k] === "string" ? (meta[k] as string) : undefined;

      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        price: r.price,
        comparePrice: num("comparePrice"),
        wholesalePrice: typeof meta.wholesalePrice === "number" ? (meta.wholesalePrice as number) : r.price,
        storePrice: typeof meta.storePrice === "number" ? (meta.storePrice as number) : r.price,
        costPrice: num("costPrice"),
        description: r.description ?? "",
        category: str("category") ?? "",
        game: str("game") ?? "",
        images: r.images,
        inStock: typeof meta.inStock === "boolean" ? (meta.inStock as boolean) : (r.stock ?? 0) > 0,
        stock: r.stock,
        maxPerUser: r.maxPerUser,
        maxPerClient: num("maxPerClient"),
        maxPerWholesaler: num("maxPerWholesaler"),
        maxPerStore: num("maxPerStore"),
        isNew: typeof meta.isNew === "boolean" ? (meta.isNew as boolean) : false,
        createdAt: str("createdAt") ?? r.createdAt.slice(0, 10),
        isFeatured: typeof meta.isFeatured === "boolean" ? (meta.isFeatured as boolean) : false,
        language: r.language ?? "ES",
        tags: Array.isArray(meta.tags) ? (meta.tags as string[]) : [],
        vatRate: r.vatRate,
        linkedPackId: num("linkedPackId"),
        linkedBoxId: num("linkedBoxId"),
        packsPerBox: num("packsPerBox"),
        cardsPerPack: num("cardsPerPack"),
        gtin13: str("gtin13") ?? r.barcode,
        mpn: str("mpn"),
      };
    });

    // Cache 5 min en CDN — el catálogo cambia poco y todo visitante ve lo mismo.
    const res = NextResponse.json({ products });
    res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res;
  } catch (err) {
    logger.error("api/products GET failed", "api.products", { err: String(err) });
    return NextResponse.json({ products: PRODUCTS, error: "fallback" }, { status: 200 });
  }
}
