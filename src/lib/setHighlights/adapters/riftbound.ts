// adapters/riftbound.ts — totalmente local (no hay API CORS pública).

import type { HighlightCard, LocalProduct, ResolveResult, SetAdapter } from "../types";
import { RIFTBOUND_SET_MAP } from "../setMaps";
import { RIFTBOUND_CARDS } from "../data/riftboundTopCards";

async function resolveRiftbound(
  product: LocalProduct,
  strategyTried: string[],
  _errors: string[],
): Promise<ResolveResult | null> {
  const searchIn = [product.name, product.description, ...(product.tags ?? [])].join(" ");
  strategyTried.push("hardcoded-map");
  for (const [re, key] of RIFTBOUND_SET_MAP) {
    if (re.test(searchIn)) {
      return { setId: key, provenance: "hardcoded-map" };
    }
  }
  // S2 — tag explícito "spiritforged" / "origins"
  strategyTried.push("product-setcode");
  if (product.tags) {
    for (const t of product.tags) {
      const norm = t.toLowerCase().trim();
      if (norm in RIFTBOUND_CARDS) {
        return { setId: norm, provenance: "product-setcode" };
      }
    }
  }
  return null;
}

async function fetchTopCards(
  setId: string,
  _lang: string,
  _product: LocalProduct,
  _errors: string[],
): Promise<HighlightCard[]> {
  return RIFTBOUND_CARDS[setId] ?? [];
}

export const riftboundAdapter: SetAdapter = {
  game: "riftbound",
  supported: true,
  resolveSetId: resolveRiftbound,
  fetchTopCards,
};
