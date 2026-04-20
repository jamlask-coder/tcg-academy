// adapters/onePiece.ts — One Piece highlights vía Bandai CDN (hardcoded).
// apitcg.com se eliminó del cliente: siempre falla por CORS desde browser.
// Si en el futuro se quiere enriquecer con precios, habría que crear una ruta
// proxy server-side (p.ej. /api/apitcg/...) y llamarla desde aquí.

import type { HighlightCard, LocalProduct, ResolveResult, SetAdapter } from "../types";
import {
  BANDAI_OP_LANG,
  ONEPIECE_SET_MAP,
  extractSetCodeFromTags,
} from "../setMaps";
import { OP_TOP_CARDS } from "../data/onePieceTopCards";

async function resolveOnePiece(
  product: LocalProduct,
  strategyTried: string[],
  _errors: string[],
): Promise<ResolveResult | null> {
  const searchIn = [product.name, product.description, ...(product.tags ?? [])].join(" ");

  // S1 hardcoded-map
  strategyTried.push("hardcoded-map");
  for (const [re, code] of ONEPIECE_SET_MAP) {
    if (re.test(searchIn)) {
      return { setId: code, provenance: "hardcoded-map" };
    }
  }

  // S2 product-setcode — tag tipo "OP09" / "EB03"
  strategyTried.push("product-setcode");
  const tagCode = extractSetCodeFromTags(product.tags, /^(op|eb)\d{2}$/i);
  if (tagCode) {
    return { setId: tagCode.toUpperCase(), provenance: "product-setcode" };
  }

  strategyTried.push("hardcoded-fallback");
  return null;
}

function buildFromBandai(setCode: string, lang: string): HighlightCard[] {
  const top = OP_TOP_CARDS[setCode];
  if (!top) return [];
  const region = BANDAI_OP_LANG[lang] ?? "OP-EN";
  return top.map<HighlightCard>((c) => ({
    id: `${setCode}-${c.num}-${lang}`,
    name: c.name,
    imageUrl: `https://files.bandai-tcg-plus.com/card_image/${region}/${setCode}/batch_${setCode}-${c.num}_d.png`,
    rarity: "SEC",
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

export const onePieceAdapter: SetAdapter = {
  game: "one-piece",
  supported: true,
  resolveSetId: resolveOnePiece,
  fetchTopCards,
};
