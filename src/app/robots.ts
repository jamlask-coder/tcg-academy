import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/auth/",
          "/cuenta/",
          "/finalizar-compra/",
          "/restablecer-contrasena/",
          "/recuperar-contrasena/",
          "/_next/",
          "/*?*", // query params → evita duplicados por filtros
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
