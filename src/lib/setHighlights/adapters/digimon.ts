// adapters/digimon.ts — digimoncard.io (API pública) + fallback hardcoded.
// La API está caída desde 2026-Q1; intentamos con timeout corto (3s) y, si
// no devuelve cartas, se usa la tabla hardcoded en `data/digimonTopCards.ts`.

import type { HighlightCard, LocalProduct, ResolveResult, SetAdapter } from "../types";
import { getJson } from "../fetcher";
import { DIGIMON_SET_MAP, extractSetCodeFromTags } from "../setMaps";
import { DIGIMON_TOP_CARDS } from "../data/digimonTopCards";

interface DigimonCard {
  cardnumber?: string;
  name?: string;
  type?: string;
  card_image?: string;
  set_name?: string;
  rarity?: string;
}

const RARITY_ORDER: Record<string, number> = {
  SEC: 5,
  SR: 4,
  R: 3,
  U: 2,
  C: 1,
};

const API_TIMEOUT_MS = 3000;

async function resolveDigimon(
  product: LocalProduct,
  strategyTried: string[],
  _errors: string[],
): Promise<ResolveResult | null> {
  const searchIn = [product.name, product.description, ...(product.tags ?? [])].join(" ");

  // S1
  strategyTried.push("hardcoded-map");
  for (const [re, code] of DIGIMON_SET_MAP) {
    if (re.test(searchIn)) {
      return { setId: code, provenance: "hardcoded-map" };
    }
  }

  // S2 — tag tipo "BT17" / "EX8"
  strategyTried.push("product-setcode");
  const tagCode = extractSetCodeFromTags(product.tags, /^(bt\d{1,2}|ex\d{1,2})$/i);
  if (tagCode) {
    return { setId: tagCode.toUpperCase(), provenance: "product-setcode" };
  }

  return null;
}

async function tryLiveApi(setCode: string): Promise<HighlightCard[]> {
  const url = `https://digimoncard.io/api-public/search.php?set=${encodeURIComponent(setCode)}&sort=rarity`;
  const data = await getJson<DigimonCard[]>(url, {}, API_TIMEOUT_MS);
  if (!Array.isArray(data) || data.length === 0) return [];
  const sorted = [...data].sort((a, b) => {
    const rA = RARITY_ORDER[(a.rarity ?? "").toUpperCase()] ?? 0;
    const rB = RARITY_ORDER[(b.rarity ?? "").toUpperCase()] ?? 0;
    return rB - rA;
  });
  return sorted
    .slice(0, 20)
    .map<HighlightCard>((c) => ({
      id: c.cardnumber ?? `${setCode}-${c.name}`,
      name: c.name ?? "Sin nombre",
      imageUrl: c.card_image ?? "",
      rarity: c.rarity ?? "",
      isHolo: true,
      game: "digimon",
      externalId: c.cardnumber,
    }))
    .filter((c) => c.imageUrl);
}

async function fetchTopCards(
  setCode: string,
  _lang: string,
  _product: LocalProduct,
  errors: string[],
): Promise<HighlightCard[]> {
  // Normalizamos "EX8" → "EX08" para matchear la tabla hardcoded.
  const normalized = /^EX\d$/.test(setCode) ? `EX0${setCode.slice(2)}` : setCode;

  try {
    const live = await tryLiveApi(setCode);
    if (live.length > 0) return live;
  } catch (e) {
    errors.push(`digimon:search:${String(e)}`);
  }

  // Fallback hardcoded — también intenta versión normalizada.
  return DIGIMON_TOP_CARDS[setCode] ?? DIGIMON_TOP_CARDS[normalized] ?? [];
}

export const digimonAdapter: SetAdapter = {
  game: "digimon",
  supported: true,
  resolveSetId: resolveDigimon,
  fetchTopCards,
};
