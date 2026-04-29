import type { MetadataRoute } from "next";

/**
 * Web App Manifest — habilita "Añadir a pantalla de inicio" en Android e
 * iOS, y manda señales de "PWA-quality" a Lighthouse / Google Search.
 *
 * No convertimos la web en una PWA con service worker (innecesario para una
 * tienda transaccional), pero el manifest por sí solo mejora la calificación
 * mobile-friendly y es indexable por Google como WebApplication.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TCG Academy — La mejor tienda TCG de España",
    short_name: "TCG Academy",
    description:
      "Pokémon, Magic, Yu-Gi-Oh!, One Piece, Lorcana, Riftbound y Dragon Ball. 4 tiendas físicas, envío 24h.",
    start_url: "/",
    display: "minimal-ui",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#132B5F",
    lang: "es-ES",
    dir: "ltr",
    categories: ["shopping", "games", "entertainment"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
