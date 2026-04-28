// adapters/pokemon.ts — pokemontcg.io + TCGDex.

import type { HighlightCard, LocalProduct, ResolveResult, SetAdapter } from "../types";
import { dedup } from "../cache";
import { getJson } from "../fetcher";
import { bestFuzzyMatch, enrichForMatch } from "../matching";
import { hasPokemonTcgKey, pokemonTcgInit, pokemonTcgUrl } from "@/lib/pokemonTcgClient";
import {
  POKEMON_SET_MAP,
  TCGDEX_EN_SET,
  TCGDEX_JP_SET,
  TCGDEX_LANG,
  tcgdexImageUrl,
} from "../setMaps";
import { POKEMON_TOP_CARDS } from "../data/pokemonTopCards";
import { resolveFromTag } from "../tagOverride";

interface PokemonSet {
  id: string;
  name: string;
  series: string;
}

let pokemonSetsCache: PokemonSet[] | null = null;

async function getPokemonSets(): Promise<PokemonSet[]> {
  if (pokemonSetsCache) return pokemonSetsCache;
  const list = await dedup("pokemon:sets", async () => {
    const data = await getJson<{ data?: PokemonSet[] }>(
      pokemonTcgUrl("v2/sets"),
      pokemonTcgInit(),
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

  // S0 tag-explicit-set ("set:sv10") — override manual desde tags
  strategyTried.push("tag-explicit-set");
  const tagOverride = resolveFromTag(product);
  if (tagOverride) return tagOverride;

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
  const url = pokemonTcgUrl(
    `v2/cards?q=set.id:${encodeURIComponent(setId)}&orderBy=-cardmarket.prices.trendPrice&pageSize=20`,
  );
  const data = await getJson<{ data?: PtcgCard[] }>(url, pokemonTcgInit());
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
      // No mentir: la rareza y el flag holo se enriquecen luego desde
      // pokemontcg.io (Cardmarket). Si no hay datos, queda vacío — antes
      // se hardcodeaba "Ultra Rare" para CUALQUIER carta, lo que pintaba
      // común-de-0,25€ como ultra rare (incidente Rattata KR 2026-04-28).
      rarity: "",
      isHolo: false,
      game: "pokemon",
      externalId: ptcgId,
    };
  });
}

/**
 * Enriquece la lista hardcoded (JP/KO) con rareza+precio reales del cartón EN
 * equivalente. pokemontcg.io devuelve `rarity` (= rareza Cardmarket) y
 * `cardmarket.prices.trendPrice`. Una sola llamada por set + match por
 * externalId. Sin esto la rareza queda vacía pero NUNCA se inventa.
 */
async function enrichHardcodedFromPtcg(
  setId: string,
  hardcoded: HighlightCard[],
  errors: string[],
): Promise<HighlightCard[]> {
  if (hardcoded.length === 0) return hardcoded;
  try {
    const real = await fetchFromPtcg(setId);
    if (real.length === 0) return hardcoded;
    const byId = new Map(real.map((c) => [c.externalId, c]));
    return hardcoded.map((c) => {
      const r = c.externalId ? byId.get(c.externalId) : undefined;
      if (!r) return c;
      return {
        ...c,
        rarity: r.rarity || "",
        isHolo: Boolean(r.rarity),
        priceEur: r.priceEur,
      };
    });
  } catch (e) {
    errors.push(`pokemontcg:enrich:${String(e)}`);
    return hardcoded;
  }
}

async function fetchTopCards(
  setId: string,
  lang: string,
  _product: LocalProduct,
  errors: string[],
): Promise<HighlightCard[]> {
  // Path A — sets con cartón EN-localizado: pokemontcg.io devuelve directamente
  // imagen + rareza + precio. Es la fuente de verdad (alimentada por Cardmarket).
  if (hasPokemonTcgKey() && (lang === "EN" || lang === "ES" || lang === "FR" || lang === "DE" || lang === "IT" || lang === "PT")) {
    try {
      const r = await fetchFromPtcg(setId);
      if (r.length > 0) return r;
    } catch (e) {
      errors.push(`pokemontcg:cards:${String(e)}`);
    }
  }
  // Path B — JP/KO o sin API key: TCGDex provee la imagen del print localizado
  // y enriquecemos rareza+precio del cartón EN equivalente (mismo SKU Cardmarket).
  const hardcoded = buildFromHardcoded(setId, lang);
  return enrichHardcodedFromPtcg(setId, hardcoded, errors);
}

export const pokemonAdapter: SetAdapter = {
  game: "pokemon",
  supported: true,
  resolveSetId: resolvePokemon,
  fetchTopCards,
};
