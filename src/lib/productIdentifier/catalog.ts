// productIdentifier/catalog.ts
// Búsqueda paralela en catálogos TCG públicos a partir de una query de texto.
// Cada fuente devuelve CatalogHit[] normalizados; fusion.ts los agrupa.
//
// Fuentes:
//   - Scryfall         → Magic
//   - pokemontcg.io    → Pokémon (sets EN)
//   - ygoprodeck       → Yu-Gi-Oh
//   - TCGDex           → Pokémon multi-idioma (fallback JP/FR/DE/IT/PT/ES)
//
// Todas las peticiones tienen AbortController con timeout para no colgarse,
// y `cache: "force-cache"` para que navegador/CDN las reutilicen.

import { normalizeForMatch } from "@/lib/setHighlights/matching";
import type { CatalogHit } from "./types";

const DEFAULT_TIMEOUT_MS = 6000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function timedFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Score 0..1 por coincidencia de tokens entre query y name.
 *
 * Reglas:
 *   - Tokens ≥ 2 caracteres.
 *   - Un token del query puntúa si un token del name lo contiene, empieza por
 *     él, o al revés (para que "strix" case con "strixhaven").
 *   - Normalizamos por el número de tokens del query (recall) — así queries
 *     cortas (1-2 palabras) no se penalizan contra nombres largos.
 */
export function scoreMatch(query: string, name: string): number {
  const qTokens = normalizeForMatch(query)
    .split(" ")
    .filter((t) => t.length >= 2);
  const nTokens = normalizeForMatch(name)
    .split(" ")
    .filter((t) => t.length >= 2);
  if (qTokens.length === 0 || nTokens.length === 0) return 0;

  let hit = 0;
  for (const q of qTokens) {
    const matched = nTokens.some(
      (n) => n === q || n.startsWith(q) || q.startsWith(n) || n.includes(q),
    );
    if (matched) hit++;
  }
  // Recall vs query: cuántos tokens de la query aparecen en el nombre.
  return hit / qTokens.length;
}

// ─── Scryfall (Magic) ─────────────────────────────────────────────────────────

interface ScryfallSet {
  code: string;
  name: string;
  set_type: string;
  card_count: number;
  icon_svg_uri?: string;
  released_at?: string;
}

/** Devuelve imágenes de la carta más icónica del set (EDHREC rank 1). */
async function getScryfallSampleCardImages(
  code: string,
): Promise<{ normal?: string; art?: string }> {
  try {
    const url = `https://api.scryfall.com/cards/search?q=set%3A${encodeURIComponent(code)}&order=edhrec&unique=prints&page=1`;
    const r = await timedFetch(url, { cache: "force-cache" }, 4000);
    if (!r.ok) return {};
    const j = (await r.json()) as {
      data?: Array<{
        image_uris?: { normal?: string; art_crop?: string; large?: string };
      }>;
    };
    const uris = j.data?.[0]?.image_uris;
    return {
      normal: uris?.large ?? uris?.normal,
      art: uris?.art_crop,
    };
  } catch {
    return {};
  }
}

async function searchScryfall(query: string, errors: string[]): Promise<CatalogHit[]> {
  try {
    const r = await timedFetch("https://api.scryfall.com/sets", {
      cache: "force-cache",
    });
    if (!r.ok) {
      errors.push(`scryfall:${r.status}`);
      return [];
    }
    const json = (await r.json()) as { data?: ScryfallSet[] };
    const validTypes = new Set([
      "core",
      "expansion",
      "masters",
      "draft_innovation",
      "commander",
      "alchemy",
      "starter",
    ]);
    const candidates = (json.data ?? []).filter(
      (s) => validTypes.has(s.set_type) && s.card_count > 20,
    );

    const topSets = candidates
      .map((s) => ({ set: s, score: scoreMatch(query, s.name) }))
      .filter((x) => x.score >= 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    // Pedimos en paralelo la carta icónica de cada set — así la preview es
    // una carta real del set en vez de la silueta minúscula del símbolo.
    const sampleImages = await Promise.all(
      topSets.map(({ set: s }) => getScryfallSampleCardImages(s.code)),
    );

    return topSets.map<CatalogHit>(({ set: s }, i) => {
      const sample = sampleImages[i];
      const extras = [s.icon_svg_uri, sample.art].filter(
        (x): x is string => !!x,
      );
      return {
        key: `scryfall:${s.code}`,
        source: "scryfall",
        game: "magic",
        setId: s.code.toLowerCase(),
        setName: s.name,
        imageUrl: sample.normal ?? s.icon_svg_uri,
        extraImages: extras,
        releasedAt: s.released_at,
        cardCount: s.card_count,
        note: s.set_type,
      };
    });
  } catch (e) {
    errors.push(`scryfall:${String(e)}`);
    return [];
  }
}

// ─── pokemontcg.io ────────────────────────────────────────────────────────────

interface PokemonTcgSet {
  id: string;
  name: string;
  series?: string;
  releaseDate?: string;
  total?: number;
  images?: { symbol?: string; logo?: string };
}

async function searchPokemonTcg(query: string, errors: string[]): Promise<CatalogHit[]> {
  try {
    const apiKey =
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY
        : undefined;
    const init: RequestInit = apiKey
      ? { headers: { "X-Api-Key": apiKey }, cache: "force-cache" }
      : { cache: "force-cache" };
    // La API soporta q=name:"<term>*"
    const q = encodeURIComponent(`name:"${query.replace(/"/g, "")}*"`);
    const r = await timedFetch(
      `https://api.pokemontcg.io/v2/sets?q=${q}&pageSize=10`,
      init,
    );
    if (!r.ok) {
      errors.push(`pokemontcg:${r.status}`);
      return [];
    }
    const json = (await r.json()) as { data?: PokemonTcgSet[] };
    return (json.data ?? []).slice(0, 10).map<CatalogHit>((s) => ({
      key: `pokemontcg:${s.id}`,
      source: "pokemontcg",
      game: "pokemon",
      setId: s.id,
      setName: s.name,
      imageUrl: s.images?.logo ?? s.images?.symbol,
      extraImages: [s.images?.symbol, s.images?.logo].filter(
        (x): x is string => !!x,
      ),
      releasedAt: s.releaseDate,
      cardCount: s.total,
      note: s.series,
    }));
  } catch (e) {
    errors.push(`pokemontcg:${String(e)}`);
    return [];
  }
}

// ─── TCGDex (Pokémon multi-idioma) ────────────────────────────────────────────

interface TcgDexSet {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount?: { total?: number };
  releaseDate?: string;
}

async function searchTcgDex(query: string, errors: string[]): Promise<CatalogHit[]> {
  try {
    // Empezamos por EN; si la query parece JP/ES podríamos expandir por lang.
    const r = await timedFetch("https://api.tcgdex.net/v2/en/sets", {
      cache: "force-cache",
    });
    if (!r.ok) {
      errors.push(`tcgdex:${r.status}`);
      return [];
    }
    const sets = (await r.json()) as TcgDexSet[];
    return sets
      .map((s) => ({ s, score: scoreMatch(query, s.name) }))
      .filter((x) => x.score >= 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map<CatalogHit>(({ s }) => ({
        key: `tcgdex:${s.id}`,
        source: "tcgdex",
        game: "pokemon",
        setId: s.id,
        setName: s.name,
        // TCGDex expone logo/symbol sin extensión — añadimos .png
        imageUrl: s.logo ? `${s.logo}.png` : s.symbol ? `${s.symbol}.png` : undefined,
        extraImages: [
          s.logo ? `${s.logo}.png` : undefined,
          s.symbol ? `${s.symbol}.png` : undefined,
        ].filter((x): x is string => !!x),
        releasedAt: s.releaseDate,
        cardCount: s.cardCount?.total,
      }));
  } catch (e) {
    errors.push(`tcgdex:${String(e)}`);
    return [];
  }
}

// ─── ygoprodeck (Yu-Gi-Oh) ────────────────────────────────────────────────────

interface YgoSet {
  set_name: string;
  set_code: string;
  num_of_cards: number;
  tcg_date?: string;
  set_image?: string;
}

async function searchYgoPro(query: string, errors: string[]): Promise<CatalogHit[]> {
  try {
    const r = await timedFetch(
      "https://db.ygoprodeck.com/api/v7/cardsets.php",
      { cache: "force-cache" },
    );
    if (!r.ok) {
      errors.push(`ygoprodeck:${r.status}`);
      return [];
    }
    const sets = (await r.json()) as YgoSet[];
    return sets
      .filter((s) => s.num_of_cards >= 30)
      .map((s) => ({ s, score: scoreMatch(query, s.set_name) }))
      .filter((x) => x.score >= 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map<CatalogHit>(({ s }) => ({
        key: `ygoprodeck:${s.set_code}`,
        source: "ygoprodeck",
        game: "yugioh",
        setId: s.set_code.toLowerCase(),
        setName: s.set_name,
        imageUrl: s.set_image,
        releasedAt: s.tcg_date,
        cardCount: s.num_of_cards,
      }));
  } catch (e) {
    errors.push(`ygoprodeck:${String(e)}`);
    return [];
  }
}

// ─── TCGCSV (vía route server-side /api/tcgcsv) ───────────────────────────────

async function searchTcgCsv(
  query: string,
  errors: string[],
): Promise<CatalogHit[]> {
  try {
    const r = await timedFetch(
      `/api/tcgcsv?query=${encodeURIComponent(query)}`,
      {},
      8000,
    );
    if (!r.ok) {
      errors.push(`tcgcsv:${r.status}`);
      return [];
    }
    const j = (await r.json()) as { hits?: CatalogHit[]; errors?: string[] };
    if (j.errors) for (const e of j.errors) errors.push(e);
    return j.hits ?? [];
  } catch (e) {
    errors.push(`tcgcsv:${String(e)}`);
    return [];
  }
}

// ─── Fan-out paralelo ─────────────────────────────────────────────────────────

export async function searchAllCatalogs(
  query: string,
  errors: string[],
): Promise<{ hits: CatalogHit[]; sourcesQueried: string[] }> {
  const sourcesQueried = [
    "tcgcsv",
    "scryfall",
    "pokemontcg",
    "tcgdex",
    "ygoprodeck",
  ];
  const [tcg, a, b, c, d] = await Promise.all([
    searchTcgCsv(query, errors),
    searchScryfall(query, errors),
    searchPokemonTcg(query, errors),
    searchTcgDex(query, errors),
    searchYgoPro(query, errors),
  ]);
  return { hits: [...tcg, ...a, ...b, ...c, ...d], sourcesQueried };
}
