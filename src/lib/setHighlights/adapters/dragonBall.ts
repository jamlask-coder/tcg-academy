// adapters/dragonBall.ts — Dragon Ball Super Fusion highlights vía Bandai CDN.
// apitcg.com se eliminó del cliente: siempre falla por CORS desde browser.
// Si en el futuro se quiere enriquecer con precios, habría que crear una ruta
// proxy server-side (p.ej. /api/apitcg/...) y llamarla desde aquí.

import type { HighlightCard, LocalProduct, ResolveResult, SetAdapter } from "../types";
import {
  BANDAI_DBS_LANG,
  DRAGONBALL_SET_MAP,
  extractSetCodeFromTags,
} from "../setMaps";
import { DBS_TOP_CARDS } from "../data/dragonBallTopCards";

async function resolveDragonBall(
  product: LocalProduct,
  strategyTried: string[],
  _errors: string[],
): Promise<ResolveResult | null> {
  const searchIn = [product.name, product.description, ...(product.tags ?? [])].join(" ");

  // S1
  strategyTried.push("hardcoded-map");
  for (const [re, code] of DRAGONBALL_SET_MAP) {
    if (re.test(searchIn)) {
      return { setId: code, provenance: "hardcoded-map" };
    }
  }

  // S2
  strategyTried.push("product-setcode");
  const tagCode = extractSetCodeFromTags(product.tags, /^fb\d{2}$/i);
  if (tagCode) {
    return { setId: tagCode.toUpperCase(), provenance: "product-setcode" };
  }

  strategyTried.push("hardcoded-fallback");
  return null;
}

function buildFromBandai(setCode: string, lang: string): HighlightCard[] {
  const top = DBS_TOP_CARDS[setCode];
  if (!top) return [];
  const region = BANDAI_DBS_LANG[lang] ?? "DBSFW-EN";
  return top.map<HighlightCard>((c) => ({
    id: `${setCode}-${c.num}-${lang}`,
    name: c.name,
    imageUrl: `https://files.bandai-tcg-plus.com/card_image/${region}/${setCode}/batch_${setCode}-${c.num}.png`,
    rarity: "SCR",
    isHolo: true,
  }));
}

async function fetchTopCards(
  setCode: string,
  lang: string,
  _product: LocalProduct,
  _errors: string[],
): Promise<HighlightCard[]> {
  return buildFromBandai(setCode, lang);
}

export const dragonBallAdapter: SetAdapter = {
  game: "dragon-ball",
  supported: true,
  resolveSetId: resolveDragonBall,
  fetchTopCards,
};
