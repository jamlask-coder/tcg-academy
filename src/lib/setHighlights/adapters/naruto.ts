// adapters/naruto.ts — minimalista, datos locales.

import type { HighlightCard, LocalProduct, ResolveResult, SetAdapter } from "../types";
import { NARUTO_SET_MAP } from "../setMaps";
import { NARUTO_TOP_CARDS } from "../data/narutoTopCards";

async function resolveNaruto(
  product: LocalProduct,
  strategyTried: string[],
  _errors: string[],
): Promise<ResolveResult | null> {
  const searchIn = [product.name, product.description, ...(product.tags ?? [])].join(" ");
  strategyTried.push("hardcoded-map");
  for (const [re, key] of NARUTO_SET_MAP) {
    if (re.test(searchIn)) {
      return { setId: key, provenance: "hardcoded-map" };
    }
  }
  // Default al único set actual
  strategyTried.push("hardcoded-fallback");
  return { setId: "konoha-shido", provenance: "hardcoded-fallback" };
}

async function fetchTopCards(
  setId: string,
  _lang: string,
  _product: LocalProduct,
  _errors: string[],
): Promise<HighlightCard[]> {
  return NARUTO_TOP_CARDS[setId] ?? [];
}

export const narutoAdapter: SetAdapter = {
  game: "naruto",
  supported: true,
  resolveSetId: resolveNaruto,
  fetchTopCards,
};
