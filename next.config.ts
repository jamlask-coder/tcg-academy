import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // output: "export" removed — enables API routes, SSR, and image optimization
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pokemontcg.io" },
      { protocol: "https", hostname: "cards.scryfall.io" },
      { protocol: "https", hostname: "c1.scryfall.com" },
      { protocol: "https", hostname: "svgs.scryfall.io" },
      { protocol: "https", hostname: "images.ygoprodeck.com" },
      { protocol: "https", hostname: "api.tcgdex.net" },
      { protocol: "https", hostname: "files.bandai-tcg-plus.com" },
      { protocol: "https", hostname: "lorcana-api.com" },
      { protocol: "https", hostname: "tcgplayer-cdn.tcgplayer.com" },
      { protocol: "https", hostname: "images.riftbound.gg" },
      { protocol: "https", hostname: "cdn11.bigcommerce.com" },
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "img.yugioh-card.com" },
      { protocol: "https", hostname: "www.yugioh-card.com" },
      { protocol: "https", hostname: "pandacollecting.com" },
    ],
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://static.cardmarket.com https://images.pokemontcg.io https://cards.scryfall.io https://c1.scryfall.com https://svgs.scryfall.io https://images.ygoprodeck.com https://api.tcgdex.net https://assets.tcgdex.net https://files.bandai-tcg-plus.com https://storage.googleapis.com https://tcgplayer-cdn.tcgplayer.com https://lorcana-api.com https://images.riftbound.gg https://apitcg.com https://images.digimoncard.io https://en.digimoncard.com https://cdn11.bigcommerce.com https://cdn.sanity.io https://img.yugioh-card.com https://www.yugioh-card.com https://pandacollecting.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https://api.scryfall.com https://api.pokemontcg.io https://api.tcgdex.net https://api.lorcana-api.com https://db.ygoprodeck.com https://api.frankfurter.app https://apitcg.com https://digimoncard.io",
      "frame-src 'self' https://www.google.com https://maps.google.com",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "X-Download-Options", value: "noopen" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
      // NOTA: no sobrescribimos Cache-Control en /_next/static — Next.js ya establece
      // "public, max-age=31536000, immutable" y hacerlo puede romper el dev server (Next 16).
      {
        source: "/images/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
