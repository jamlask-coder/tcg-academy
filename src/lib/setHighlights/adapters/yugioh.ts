// adapters/yugioh.ts — ygoprodeck.
// Nota: las imágenes son solo EN, pero mostramos algo antes que nada —
// por eso retiramos el antiguo `if (lang !== "EN") return []`.

import type { HighlightCard, LocalProduct, ResolveResult, SetAdapter } from "../types";
import { dedup } from "../cache";
import { getJson } from "../fetcher";
import { bestFuzzyMatch, enrichForMatch } from "../matching";
import { YUGIOH_SET_MAP, isHoloRarity } from "../setMaps";

interface YgoSetMeta {
  set_name: string;
  set_code?: string;
  num_of_cards?: number;
  tcg_date?: string;
}

interface YgoCardSet {
  set_name: string;
  set_rarity?: string;
}
interface YgoCardImage {
  image_url?: string;
  image_url_small?: string;
}
interface YgoCardPrice {
  cardmarket_price?: string;
}
interface YgoCard {
  id: number | string;
  name: string;
  card_prices?: YgoCardPrice[];
  card_images?: YgoCardImage[];
  card_sets?: YgoCardSet[];
}

let ygoSetsCache: YgoSetMeta[] | null = null;

async function getYgoSets(): Promise<YgoSetMeta[]> {
  if (ygoSetsCache) return ygoSetsCache;
  const list = await dedup("ygo:sets", async () => {
    const data = await getJson<YgoSetMeta[]>(
      "https://db.ygoprodeck.com/api/v7/cardsets.php",
    );
    return Array.isArray(data) ? data : [];
  });
  ygoSetsCache = list;
  return list;
}

async function resolveYugioh(
  product: LocalProduct,
  strategyTried: string[],
  errors: string[],
): Promise<ResolveResult | null> {
  const searchIn = [product.name, product.description, ...(product.tags ?? [])].join(" ");

  // S1 hardcoded-map (set_name parcial)
  strategyTried.push("hardcoded-map");
  for (const [re, partialName] of YUGIOH_SET_MAP) {
    if (re.test(searchIn)) {
      return { setId: partialName, provenance: "hardcoded-map", setLabel: partialName };
    }
  }

  // S3 fuzzy-sets-en vs /cardsets
  strategyTried.push("fuzzy-sets-en");
  const sets = await getYgoSets().catch((e) => {
    errors.push(`ygo:sets:${String(e)}`);
    return [] as YgoSetMeta[];
  });
  if (sets.length > 0) {
    const searchEn = enrichForMatch(searchIn);
    const match = bestFuzzyMatch(sets, (s) => s.set_name, searchEn, 0.6);
    if (match) {
      return {
        setId: match.set_name,
        provenance: "fuzzy-sets-en",
        setLabel: match.set_name,
      };
    }

    // S4 localized (mismo corpus, score más bajo)
    strategyTried.push("fuzzy-sets-localized");
    const matchLoc = bestFuzzyMatch(sets, (s) => s.set_name, searchEn, 0.45);
    if (matchLoc) {
      return {
        setId: matchLoc.set_name,
        provenance: "fuzzy-sets-localized",
        setLabel: matchLoc.set_name,
      };
    }
  }

  return null;
}

async function fetchTopCards(
  setName: string,
  _lang: string,
  _product: LocalProduct,
  errors: string[],
): Promise<HighlightCard[]> {
  try {
    const url = `https://db.ygoprodeck.com/api/v7/cardinfo.php?cardset=${encodeURIComponent(setName)}`;
    const data = await getJson<{ data?: YgoCard[] }>(url);
    const cards = data?.data ?? [];
    const sorted = [...cards].sort(
      (a, b) =>
        parseFloat(b.card_prices?.[0]?.cardmarket_price ?? "0") -
        parseFloat(a.card_prices?.[0]?.cardmarket_price ?? "0"),
    );
    return sorted
      .slice(0, 20)
      .map<HighlightCard>((c) => {
        const img = c.card_images?.[0];
        const setInfo = c.card_sets?.find((s) =>
          s.set_name.toLowerCase().includes(setName.toLowerCase()),
        );
        const rarity = setInfo?.set_rarity ?? "";
        const priceStr = c.card_prices?.[0]?.cardmarket_price;
        const priceEur = priceStr ? parseFloat(priceStr) : undefined;
        return {
          id: String(c.id),
          name: c.name,
          imageUrl: img?.image_url ?? img?.image_url_small ?? "",
          imageFallbackUrl: img?.image_url_small,
          rarity,
          isHolo: isHoloRarity(rarity),
          priceEur: Number.isFinite(priceEur) ? priceEur : undefined,
          externalId: String(c.id),
          game: "yugioh",
        };
      })
      .filter((c) => c.imageUrl);
  } catch (e) {
    errors.push(`ygo:cardinfo:${String(e)}`);
    return [];
  }
}

export const yugiohAdapter: SetAdapter = {
  game: "yugioh",
  supported: true,
  resolveSetId: resolveYugioh,
  fetchTopCards,
};
