// adapters/pokemon.ts — pokemontcg.io + TCGDex.

import type { HighlightCard, LocalProduct, ResolveResult, SetAdapter } from "../types";
import { dedup } from "../cache";
import { getJson } from "../fetcher";
import { bestFuzzyMatch, enrichForMatch } from "../matching";
import {
  POKEMON_SET_MAP,
  TCGDEX_EN_SET,
  TCGDEX_JP_SET,
  TCGDEX_LANG,
  tcgdexImageUrl,
} from "../setMaps";
import { POKEMON_TOP_CARDS } from "../data/pokemonTopCards";

interface PokemonSet {
  id: string;
  name: string;
  series: string;
}

let pokemonSetsCache: PokemonSet[] | null = null;

async function getPokemonSets(): Promise<PokemonSet[]> {
  if (pokemonSetsCache) return pokemonSetsCache;
  const apiKey = process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY;
  const init: RequestInit = apiKey ? { headers: { "X-Api-Key": apiKey } } : {};
  const list = await dedup("pokemon:sets", async () => {
    const data = await getJson<{ data?: PokemonSet[] }>(
      "https://api.pokemontcg.io/v2/sets",
      init,
    );
    return data?.data ?? [];
  });
  pokemonSetsCache = list;
  return list;
}

function tagHasPtcgSetId(tags: string[] | undefined): string | null {
  if (!tags) return null;
  for (const t of tags) {
    const m = /^(sv\d+(?:pt\d+)?|swsh\d+(?:pt\d+)?)$/i.exec(t.trim());
    if (m) return m[0].toLowerCase();
  }
  return null;
}

async function resolvePokemon(
  product: LocalProduct,
  strategyTried: string[],
  errors: string[],
): Promise<ResolveResult | null> {
  const searchIn = [product.name, product.description, ...(product.tags ?? [])].join(" ");

  // S1 hardcoded-map
  strategyTried.push("hardcoded-map");
  for (const [re, code] of POKEMON_SET_MAP) {
    if (re.test(searchIn)) {
      return { setId: code, provenance: "hardcoded-map" };
    }
  }

  // S2 product-setcode
  strategyTried.push("product-setcode");
  const tagCode = tagHasPtcgSetId(product.tags);
  if (tagCode) {
    return { setId: tagCode, provenance: "product-setcode" };
  }

  // S3 fuzzy-sets-en
  strategyTried.push("fuzzy-sets-en");
  const sets = await getPokemonSets().catch((e) => {
    errors.push(`pokemontcg:sets:${String(e)}`);
    return [] as PokemonSet[];
  });
  if (sets.length > 0) {
    const searchEn = enrichForMatch(searchIn);
    const match = bestFuzzyMatch(sets, (s) => s.name, searchEn, 0.6);
    if (match) {
      return { setId: match.id, provenance: "fuzzy-sets-en", setLabel: match.name };
    }

    // S4 fuzzy-sets-localized
    strategyTried.push("fuzzy-sets-localized");
    const matchLoc = bestFuzzyMatch(sets, (s) => s.name, searchEn, 0.45);
    if (matchLoc) {
      return {
        setId: matchLoc.id,
        provenance: "fuzzy-sets-localized",
        setLabel: matchLoc.name,
      };
    }
  }

  // S5 hardcoded-fallback (si hay datos locales)
  strategyTried.push("hardcoded-fallback");
  // Este fallback no puede resolver por sí solo — requiere que alguna estrategia
  // anterior haya mapeado a un setId presente en POKEMON_TOP_CARDS. Si llegamos
  // aquí sin setId, no podemos más.
  return null;
}

interface PtcgCard {
  id: string;
  name: string;
  rarity?: string;
  images?: { small?: string; large?: string };
  cardmarket?: { prices?: { trendPrice?: number } };
}

async function fetchFromPtcg(setId: string): Promise<HighlightCard[]> {
  const apiKey = process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY;
  const init: RequestInit = apiKey ? { headers: { "X-Api-Key": apiKey } } : {};
  const url = `https://api.pokemontcg.io/v2/cards?q=set.id:${encodeURIComponent(setId)}&orderBy=-cardmarket.prices.trendPrice&pageSize=20`;
  const data = await getJson<{ data?: PtcgCard[] }>(url, init);
  const cards = data?.data ?? [];
  return cards
    .map<HighlightCard>((c) => ({
      id: c.id,
      name: c.name,
      imageUrl: c.images?.large ?? c.images?.small ?? "",
      imageFallbackUrl: c.images?.small,
      rarity: c.rarity ?? "",
      isHolo: Boolean(c.rarity),
      priceEur: c.cardmarket?.prices?.trendPrice,
      externalId: c.id,
      game: "pokemon",
    }))
    .filter((c) => c.imageUrl);
}

function buildFromHardcoded(setId: string, lang: string): HighlightCard[] {
  const topCards = POKEMON_TOP_CARDS[setId];
  if (!topCards) return [];
  const tcgLang = TCGDEX_LANG[lang] ?? "en";
  const isJp = lang === "JP" || lang === "KO";
  const dexSet = isJp
    ? (TCGDEX_JP_SET[setId] ?? setId)
    : (TCGDEX_EN_SET[setId] ?? setId);
  return topCards.map<HighlightCard>((c) => {
    const num = isJp ? c.ja : c.en;
    // externalId = ID EN (pokemontcg.io solo cubre sets EN), pero la carta es
    // la misma en JP/KO/ES/etc., así que el histórico EUR de Cardmarket aplica
    // como "tendencia del mismo cartón" aunque estés viendo el print localizado.
    const ptcgId = `${setId}-${c.en}`;
    return {
      id: `${setId}-${num}-${lang}`,
      name: c.name,
      imageUrl: tcgdexImageUrl(tcgLang, dexSet, num),
      rarity: "Ultra Rare",
      isHolo: true,
      game: "pokemon",
      externalId: ptcgId,
    };
  });
}

async function fetchTopCards(
  setId: string,
  lang: string,
  _product: LocalProduct,
  errors: string[],
): Promise<HighlightCard[]> {
  // Intenta pokemontcg.io primero si tenemos API key. Sin key la mayoría de
  // tiempo da 429, así que usamos hardcoded + TCGDex directamente.
  const apiKey = process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY;
  if (apiKey && (lang === "EN" || lang === "ES" || lang === "FR" || lang === "DE" || lang === "IT" || lang === "PT")) {
    try {
      const r = await fetchFromPtcg(setId);
      if (r.length > 0) return r;
    } catch (e) {
      errors.push(`pokemontcg:cards:${String(e)}`);
    }
  }
  // S5 hardcoded-fallback
  return buildFromHardcoded(setId, lang);
}

export const pokemonAdapter: SetAdapter = {
  game: "pokemon",
  supported: true,
  resolveSetId: resolvePokemon,
  fetchTopCards,
};
