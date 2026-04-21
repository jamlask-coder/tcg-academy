import { notFound } from "next/navigation";
import {
  GAME_CONFIG,
  PRODUCTS,
  CATEGORY_LABELS,
  getProductBySlug,
} from "@/data/products";
import { SITE_CONFIG } from "@/config/siteConfig";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import type { Metadata } from "next";
import {
  breadcrumbJsonLd,
  jsonLdProps,
  productJsonLd,
} from "@/lib/seo";

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
  params: Promise<{ slug: string; game: string; category: string }>;
}): Promise<Metadata> {
  const { slug, game, category } = await params;
  const product = getProductBySlug(slug);
  const config = GAME_CONFIG[game];
  if (!product || !config) return { title: "TCG Academy" };
  const ogImage = product.images[0] ?? "/og-default.png";
  const canonical = `/${game}/${category}/${slug}`;
  return {
    title: `${product.name} — ${config.name} | TCG Academy`,
    description: product.description,
    alternates: { canonical },
    openGraph: {
      title: `${product.name} — ${config.name}`,
      description: product.description,
      images: [{ url: ogImage, width: 800, height: 600 }],
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} — ${config.name}`,
      description: product.description,
      images: [ogImage],
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
  const url = `/${game}/${category}/${slug}`;
  const vatRate = product.vatRate ?? SITE_CONFIG.vatRate;
  const priceWithVat =
    Math.round(product.price * (1 + vatRate / 100) * 100) / 100;

  const productLd = productJsonLd(product, { priceWithVat, url });
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Inicio", url: "/" },
    { name: config.name, url: `/${game}` },
    { name: catLabel, url: `/${game}/${category}` },
    { name: product.name, url },
  ]);

  return (
    <>
      <script {...jsonLdProps(productLd)} />
      <script {...jsonLdProps(breadcrumbLd)} />
      <ProductDetailClient
        product={product}
        config={config}
        catLabel={catLabel}
      />
    </>
  );
}
