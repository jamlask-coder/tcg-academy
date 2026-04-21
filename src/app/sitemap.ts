export const dynamic = "force-static";
import type { MetadataRoute } from "next";
import { PRODUCTS, GAME_CONFIG, getAllCategories } from "@/data/products";
import { STORES } from "@/data/stores";
import { SITE_URL } from "@/lib/seo";

const BASE = SITE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, priority: 1, changeFrequency: "daily", lastModified: now },
    { url: `${BASE}/catalogo`, priority: 0.9, changeFrequency: "daily", lastModified: now },
    { url: `${BASE}/tiendas`, priority: 0.8, changeFrequency: "monthly", lastModified: now },
    { url: `${BASE}/eventos`, priority: 0.7, changeFrequency: "weekly", lastModified: now },
    { url: `${BASE}/contacto`, priority: 0.6, changeFrequency: "yearly" },
    { url: `${BASE}/mayoristas`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${BASE}/mayoristas/b2b`, priority: 0.55, changeFrequency: "monthly" },
    { url: `${BASE}/mayoristas/franquicias`, priority: 0.5, changeFrequency: "monthly" },
    { url: `${BASE}/mayoristas/vending`, priority: 0.5, changeFrequency: "monthly" },
    { url: `${BASE}/novedades`, priority: 0.8, changeFrequency: "daily", lastModified: now },
    { url: `${BASE}/puntos`, priority: 0.5, changeFrequency: "yearly" },
    { url: `${BASE}/devoluciones`, priority: 0.5, changeFrequency: "yearly" },
    { url: `${BASE}/reclamaciones`, priority: 0.3, changeFrequency: "yearly" },
    { url: `${BASE}/verificar-factura`, priority: 0.4, changeFrequency: "yearly" },
    { url: `${BASE}/aviso-legal`, priority: 0.4, changeFrequency: "yearly" },
    { url: `${BASE}/privacidad`, priority: 0.4, changeFrequency: "yearly" },
    { url: `${BASE}/terminos`, priority: 0.4, changeFrequency: "yearly" },
    { url: `${BASE}/cookies`, priority: 0.3, changeFrequency: "yearly" },
  ];

  const storeRoutes: MetadataRoute.Sitemap = Object.keys(STORES).map((id) => ({
    url: `${BASE}/tiendas/${id}`,
    priority: 0.75,
    changeFrequency: "monthly",
  }));

  const gameRoutes: MetadataRoute.Sitemap = Object.keys(GAME_CONFIG).map(
    (game) => ({
      url: `${BASE}/${game}`,
      priority: 0.85,
      changeFrequency: "daily",
      lastModified: now,
    }),
  );

  const categoryRoutes: MetadataRoute.Sitemap = Object.keys(GAME_CONFIG).flatMap(
    (game) =>
      getAllCategories(game).map((category) => ({
        url: `${BASE}/${game}/${category}`,
        priority: 0.7,
        changeFrequency: "daily" as const,
        lastModified: now,
      })),
  );

  const productRoutes: MetadataRoute.Sitemap = PRODUCTS.map((p) => {
    const imgs = (p.images ?? [])
      .map((i) => (i.startsWith("http") ? i : `${BASE}${i.startsWith("/") ? "" : "/"}${i}`))
      .slice(0, 5); // Google recomienda ≤ 1000 imágenes por URL, limitamos a 5 por claridad
    return {
      url: `${BASE}/${p.game}/${p.category}/${p.slug}`,
      priority: 0.7,
      changeFrequency: "weekly" as const,
      lastModified: p.createdAt ? new Date(p.createdAt) : now,
      images: imgs.length > 0 ? imgs : undefined,
    };
  });

  return [
    ...staticRoutes,
    ...storeRoutes,
    ...gameRoutes,
    ...categoryRoutes,
    ...productRoutes,
  ];
}
