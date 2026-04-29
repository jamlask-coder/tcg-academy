// /api/tcgcsv — proxy server-side de tcgcsv.com.
//
// TCGCSV (https://tcgcsv.com) es un mirror comunitario de los datos públicos
// de TCGplayer. Contiene:
//   - Categorías (juegos: Magic, Pokémon, Yu-Gi-Oh, One Piece, Lorcana, etc.)
//   - Groups (sets): Bloomburrow, Stellar Crown, etc.
//   - Products (sellados): booster boxes, ETBs, bundles, tins... CON FOTOS REALES.
//
// Este endpoint:
//   1. Recibe ?query=<texto> y opcionalmente ?game=<slug>
//   2. Encuentra el/los sets (groups) que fuzzy-matchean con la query.
//   3. Descarga los productos de cada set y filtra los "sellados" (no singles).
//   4. Devuelve CatalogHit[] compatible con el pipeline del identificador.
//
// Caché: groups se cachea 24h en memoria del server (cambia raro). Products
// se cachea 1h. Entre sesiones, Next fetch usa su propio caché HTTP.

import { NextResponse } from "next/server";
import { normalizeForMatch } from "@/lib/setHighlights/matching";
import type { CatalogHit } from "@/lib/productIdentifier/types";

// runtime: nodejs (default). El edge runtime desactivaría la generación
// estática (`revalidate`) y haría que cada request re-pegara a tcgcsv.com.
// Como solo proxeamos JSON con fetch + filtrado in-memory, nodejs vale.
export const runtime = "nodejs";
export const revalidate = 3600;

// ─── Game → TCGCSV categoryId ──────────────────────────────────────────────

const GAME_TO_CATEGORY: Record<string, number> = {
  magic: 1,
  yugioh: 2,
  pokemon: 3,
  "one-piece": 68,
  lorcana: 71,
  "dragon-ball": 80, // Fusion World (el TCG actual, 2024+)
  riftbound: 89,
};

const CATEGORY_TO_GAME = Object.fromEntries(
  Object.entries(GAME_TO_CATEGORY).map(([g, id]) => [id, g]),
) as Record<number, string>;

// ─── Tipos TCGCSV ──────────────────────────────────────────────────────────

interface TcgCsvGroup {
  groupId: number;
  name: string;
  abbreviation?: string;
  publishedOn?: string;
  categoryId: number;
}

interface TcgCsvGroupsResponse {
  success: boolean;
  results?: TcgCsvGroup[];
}

interface TcgCsvProduct {
  productId: number;
  name: string;
  cleanName?: string;
  imageUrl?: string;
  categoryId: number;
  groupId: number;
  url?: string;
  imageCount?: number;
  presaleInfo?: { releasedOn?: string };
  extendedData?: Array<{ name: string; value: string }>;
}

interface TcgCsvProductsResponse {
  success: boolean;
  results?: TcgCsvProduct[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function scoreMatch(query: string, name: string): number {
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
  return hit / qTokens.length;
}

/**
 * Heurística de categoría TCG Academy a partir del nombre del producto TCGCSV.
 *
 * TCGCSV usa nombres canónicos de TCGplayer tipo:
 *   "Bloomburrow - Play Booster Display"
 *   "Scarlet & Violet - Stellar Crown Elite Trainer Box"
 *   "Phantom Nightmare Booster Box (1st Edition)"
 */
function inferCategory(name: string): string | undefined {
  const n = name.toLowerCase();
  if (/booster display|booster box|draft booster box|play booster display|collector booster display/.test(n))
    return "booster-box";
  if (/elite trainer box|\betb\b/.test(n)) return "etb";
  if (/structure deck|structure:? /.test(n)) return "structure-decks";
  if (/commander deck|commander:? /.test(n)) return "commander";
  if (/secret lair/.test(n)) return "secret-lair";
  if (/starter deck|starter:? /.test(n)) return "starter";
  if (/bundle|gift bundle/.test(n)) return "bundles";
  if (/\btin\b|mega tin|collector tin/.test(n)) return "tins";
  if (/\bblister\b/.test(n)) return "blisters";
  if (/play booster pack|draft booster pack|\bbooster pack\b|sobre\b/.test(n))
    return "sobres";
  if (/gift set/.test(n)) return "gift-sets";
  return undefined;
}

/**
 * Filtro "sellado interesante": nos interesa lo que se puede vender como
 * producto independiente (boxes, ETBs, bundles, tins, sobres sueltos).
 * Ignoramos booklets, art cards, promo packs sueltos de 1 carta, etc.
 */
function isInterestingProduct(name: string): boolean {
  const n = name.toLowerCase();
  if (/booklet|one-card|art card|code card|dice|sleeves|playmat|deck box|binder/.test(n))
    return false;
  return /booster|box|display|etb|elite trainer|bundle|tin|deck|starter|structure|blister|gift set|collector|commander|secret lair/.test(
    n,
  );
}

// ─── Data fetching (con caché incorporado de Next 16) ─────────────────────

async function fetchGroups(categoryId: number): Promise<TcgCsvGroup[]> {
  const r = await fetch(
    `https://tcgcsv.com/tcgplayer/${categoryId}/groups`,
    { next: { revalidate: 86400 } },
  );
  if (!r.ok) return [];
  const j = (await r.json()) as TcgCsvGroupsResponse;
  return j.results ?? [];
}

async function fetchProducts(
  categoryId: number,
  groupId: number,
): Promise<TcgCsvProduct[]> {
  const r = await fetch(
    `https://tcgcsv.com/tcgplayer/${categoryId}/${groupId}/products`,
    { next: { revalidate: 3600 } },
  );
  if (!r.ok) return [];
  const j = (await r.json()) as TcgCsvProductsResponse;
  return j.results ?? [];
}

// ─── Pipeline por categoría ────────────────────────────────────────────────

async function searchOneCategory(
  categoryId: number,
  query: string,
): Promise<CatalogHit[]> {
  const groups = await fetchGroups(categoryId);
  // Top 3 groups por score. Luego pedimos products de cada uno en paralelo.
  const topGroups = groups
    .map((g) => ({ g, score: scoreMatch(query, g.name) }))
    .filter((x) => x.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (topGroups.length === 0) return [];

  const productLists = await Promise.all(
    topGroups.map(({ g }) => fetchProducts(categoryId, g.groupId)),
  );

  const hits: CatalogHit[] = [];
  topGroups.forEach(({ g }, i) => {
    const products = productLists[i];
    const game = CATEGORY_TO_GAME[categoryId];
    for (const p of products) {
      if (!isInterestingProduct(p.name)) continue;
      if (!p.imageUrl) continue;
      const category = inferCategory(p.name);
      const upc = p.extendedData?.find((e) => e.name === "UPC")?.value;
      hits.push({
        key: `tcgcsv:${p.productId}`,
        source: "tcgcsv",
        game,
        setId: g.abbreviation?.toLowerCase() ?? String(g.groupId),
        setName: g.name,
        imageUrl: p.imageUrl,
        extraImages: p.imageUrl ? [p.imageUrl] : undefined,
        releasedAt: p.presaleInfo?.releasedOn ?? g.publishedOn,
        note: [category, upc ? `upc:${upc}` : ""].filter(Boolean).join(" "),
      });
    }
  });

  return hits;
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("query")?.trim() ?? "";
  const gameFilter = url.searchParams.get("game")?.trim().toLowerCase();

  if (query.length < 2) {
    return NextResponse.json({
      hits: [],
      errors: ["query:too-short"],
      sourcesQueried: [],
    });
  }

  const categoryIds = gameFilter
    ? GAME_TO_CATEGORY[gameFilter]
      ? [GAME_TO_CATEGORY[gameFilter]]
      : []
    : Object.values(GAME_TO_CATEGORY);

  if (categoryIds.length === 0) {
    return NextResponse.json({
      hits: [],
      errors: [`unknown-game:${gameFilter}`],
      sourcesQueried: [],
    });
  }

  const errors: string[] = [];
  const batches = await Promise.all(
    categoryIds.map((cid) =>
      searchOneCategory(cid, query).catch((e) => {
        errors.push(`tcgcsv:${cid}:${String(e)}`);
        return [] as CatalogHit[];
      }),
    ),
  );

  const hits = batches.flat();
  return NextResponse.json({
    hits,
    errors,
    sourcesQueried: ["tcgcsv"],
  });
}
