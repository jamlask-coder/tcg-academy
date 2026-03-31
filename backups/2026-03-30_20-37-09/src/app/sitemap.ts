export const dynamic = "force-static";
import type { MetadataRoute } from "next";
import { PRODUCTS, GAME_CONFIG } from "@/data/products";

const BASE = "https://tcgacademy.es";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, priority: 1 },
    { url: `${BASE}/catalogo`, priority: 0.9 },
    { url: `${BASE}/tiendas`, priority: 0.8 },
    { url: `${BASE}/eventos`, priority: 0.7 },
    { url: `${BASE}/contacto`, priority: 0.6 },
    { url: `${BASE}/mayoristas`, priority: 0.6 },
    { url: `${BASE}/franquicias`, priority: 0.5 },
    { url: `${BASE}/vending`, priority: 0.5 },
  ];

  const gameRoutes: MetadataRoute.Sitemap = Object.keys(GAME_CONFIG).map(
    (game) => ({
      url: `${BASE}/${game}`,
      priority: 0.85,
    }),
  );

  const productRoutes: MetadataRoute.Sitemap = PRODUCTS.map((p) => ({
    url: `${BASE}/${p.game}/${p.category}/${p.slug}`,
    priority: 0.7,
  }));

  return [...staticRoutes, ...gameRoutes, ...productRoutes];
}
