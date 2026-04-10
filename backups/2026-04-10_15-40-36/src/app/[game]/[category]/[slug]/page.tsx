import { notFound } from "next/navigation";
import {
  GAME_CONFIG,
  PRODUCTS,
  CATEGORY_LABELS,
  getProductBySlug,
} from "@/data/products";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import type { Metadata } from "next";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({
    game: p.game,
    category: p.category,
    slug: p.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; game: string }>;
}): Promise<Metadata> {
  const { slug, game } = await params;
  const product = getProductBySlug(slug);
  const config = GAME_CONFIG[game];
  if (!product || !config) return { title: "TCG Academy" };
  const ogImage = product.images[0] ?? "/og-default.png";
  return {
    title: `${product.name} — ${config.name} | TCG Academy`,
    description: product.description,
    openGraph: {
      title: `${product.name} — ${config.name}`,
      description: product.description,
      images: [{ url: ogImage, width: 800, height: 600 }],
      type: "website",
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ game: string; category: string; slug: string }>;
}) {
  const { game, category, slug } = await params;
  const config = GAME_CONFIG[game];
  if (!config) notFound();

  const product = getProductBySlug(slug);
  if (!product || product.game !== game || product.category !== category)
    notFound();

  const catLabel = CATEGORY_LABELS[category] ?? category;

  return (
    <ProductDetailClient
      product={product}
      config={config}
      catLabel={catLabel}
    />
  );
}
