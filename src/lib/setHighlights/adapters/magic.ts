// adapters/magic.ts — Scryfall.

import type { HighlightCard, LocalProduct, ResolveResult, SetAdapter } from "../types";
import { dedup } from "../cache";
import { getJson } from "../fetcher";
import { bestFuzzyMatch, enrichForMatch } from "../matching";
import { MAGIC_SET_MAP, SCRYFALL_LANG, isHoloRarity } from "../setMaps";
import { resolveFromTag } from "../tagOverride";

interface ScryfallSet {
  code: string;
  name: string;
  set_type: string;
  card_count: number;
}

interface ScryfallImgs {
  normal?: string;
  small?: string;
  large?: string;
  png?: string;
}

interface ScryfallCard {
  id: string;
  name: string;
  printed_name?: string;
  rarity?: string;
  image_uris?: ScryfallImgs;
  card_faces?: { image_uris?: ScryfallImgs }[];
  prices?: { eur?: string | null };
}

let scryfallSetsCache: ScryfallSet[] | null = null;

async function getScryfallSets(): Promise<ScryfallSet[]> {
  if (scryfallSetsCache) return scryfallSetsCache;
  const list = await dedup("scryfall:sets", async () => {
    const data = await getJson<{ data?: ScryfallSet[] }>(
      "https://api.scryfall.com/sets",
    );
    return data?.data ?? [];
  });
  scryfallSetsCache = list;
  return list;
}

function tagHasSetCode(tags: string[] | undefined): string | null {
  if (!tags) return null;
  for (const t of tags) {
    // Formato típico Scryfall: 3 letras lowercase (ej. "dsk", "blb")
    const m = /^[a-z]{3,4}$/i.exec(t.trim());
    if (m) return m[0].toLowerCase();
  }
  return null;
}

async function resolveMagic(
  product: LocalProduct,
  strategyTried: string[],
  errors: string[],
): Promise<ResolveResult | null> {
  const searchIn = [product.name, product.description, ...(product.tags ?? [])].join(" ");

  // S0 tag-explicit-set ("set:blb") — override manual
  strategyTried.push("tag-explicit-set");
  const tagOverride = resolveFromTag(product);
  if (tagOverride) return tagOverride;

  // S1 hardcoded-map
  strategyTried.push("hardcoded-map");
  for (const [re, code] of MAGIC_SET_MAP) {
    if (re.test(searchIn)) {
      return { setId: code, provenance: "hardcoded-map" };
    }
  }

  // S2 product-setcode (tag 3-4 letras que matchee con un código Scryfall)
  strategyTried.push("product-setcode");
  const tagCode = tagHasSetCode(product.tags);
  if (tagCode) {
    const sets = await getScryfallSets().catch((e) => {
      errors.push(`scryfall:sets:${String(e)}`);
      return [] as ScryfallSet[];
    });
    if (sets.some((s) => s.code.toLowerCase() === tagCode)) {
      return { setId: tagCode, provenance: "product-setcode" };
    }
  }

  // S3 fuzzy-sets-en
  strategyTried.push("fuzzy-sets-en");
  const sets = await getScryfallSets().catch(() => [] as ScryfallSet[]);
  if (sets.length > 0) {
    const validTypes = new Set([
      "core",
      "expansion",
      "masters",
      "draft_innovation",
      "commander",
      "alchemy",
      "starter",
    ]);
    const candidates = sets.filter(
      (s) => validTypes.has(s.set_type) && s.card_count > 20,
    );
    const searchEn = enrichForMatch(searchIn);
    const match = bestFuzzyMatch(candidates, (s) => s.name, searchEn, 0.6);
    if (match) {
      return { setId: match.code, provenance: "fuzzy-sets-en", setLabel: match.name };
    }

    // S4 fuzzy-sets-localized — mismo corpus pero score más bajo
    strategyTried.push("fuzzy-sets-localized");
    const matchLoc = bestFuzzyMatch(candidates, (s) => s.name, searchEn, 0.45);
    if (matchLoc) {
      return {
        setId: matchLoc.code,
        provenance: "fuzzy-sets-localized",
        setLabel: matchLoc.name,
      };
    }
  }

  return null;
}

async function scryfallSearch(query: string): Promise<ScryfallCard[]> {
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=usd&dir=desc&page=1`;
  const data = await getJson<{ data?: ScryfallCard[] }>(url, {
    headers: { Accept: "application/json" },
  });
  return data?.data ?? [];
}

function scryfallToHighlights(cards: ScryfallCard[]): HighlightCard[] {
  return cards
    .filter((c) => c.image_uris || c.card_faces?.[0]?.image_uris)
    .slice(0, 20)
    .map<HighlightCard>((c) => {
      const imgs = c.image_uris ?? c.card_faces?.[0]?.image_uris ?? {};
      const url = imgs.normal ?? imgs.large ?? imgs.small ?? imgs.png ?? "";
      const fallback = imgs.small && imgs.small !== url ? imgs.small : undefined;
      const priceStr = c.prices?.eur ?? null;
      const priceEur = priceStr ? parseFloat(priceStr) : undefined;
      return {
        id: c.id,
        name: c.printed_name ?? c.name,
        imageUrl: url,
        imageFallbackUrl: fallback,
        rarity: c.rarity ?? "",
        isHolo: isHoloRarity(c.rarity),
        priceEur: Number.isFinite(priceEur) ? priceEur : undefined,
        externalId: c.id,
        game: "magic",
      };
    })
    .filter((c) => c.imageUrl);
}

async function fetchTopCards(
  setId: string,
  lang: string,
  _product: LocalProduct,
  errors: string[],
): Promise<HighlightCard[]> {
  const sLang = SCRYFALL_LANG[lang] ?? "en";
  const langPart = sLang !== "en" ? ` lang:${sLang}` : "";
  const queries = [
    `set:${setId} (rarity:mythic OR rarity:rare)${langPart}`,
    `set:${setId} (rarity:mythic OR rarity:rare)`,
    `set:${setId}${langPart}`,
    `set:${setId}`,
  ];
  for (const q of queries) {
    try {
      const cards = await scryfallSearch(q);
      const result = scryfallToHighlights(cards);
      if (result.length > 0) return result;
    } catch (e) {
      errors.push(`scryfall:search:${String(e)}`);
    }
  }
  return [];
}

export const magicAdapter: SetAdapter = {
  game: "magic",
  supported: true,
  resolveSetId: resolveMagic,
  fetchTopCards,
};
