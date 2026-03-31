import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  output: "export",
  images: {
    // Static export requires unoptimized images.
    // remotePatterns are kept here to document approved CDN origins for future SSR migration.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.pokemontcg.io" },
      { protocol: "https", hostname: "cards.scryfall.io" },
      { protocol: "https", hostname: "c1.scryfall.com" },
      { protocol: "https", hostname: "svgs.scryfall.io" },
      { protocol: "https", hostname: "images.ygoprodeck.com" },
      { protocol: "https", hostname: "api.tcgdex.net" },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
