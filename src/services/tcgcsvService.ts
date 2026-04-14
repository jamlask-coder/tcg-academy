// ── TCGCSV Service ───────────────────────────────────────────────────────────
// Free API with daily-updated TCGPlayer prices. No key required.
// Docs: https://tcgcsv.com/docs
// Covers: One Piece (68), Lorcana (71), Dragon Ball FW (80), Riftbound (89)

const BASE = "https://tcgcsv.com/tcgplayer";

export interface TcgCsvProduct {
  productId: number;
  name: string;
  imageUrl: string;
  marketPrice: number;
  subTypeName: string;
}

interface RawProduct {
  productId: number;
  name: string;
  imageUrl?: string;
}

interface RawPrice {
  productId: number;
  marketPrice?: number;
  subTypeName?: string;
}

interface GroupResult {
  groupId: number;
  name: string;
}

const groupCache = new Map<number, GroupResult[]>();
const resultCache = new Map<string, TcgCsvProduct[]>();

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Get all set groups for a game category. */
async function getGroups(categoryId: number): Promise<GroupResult[]> {
  if (groupCache.has(categoryId)) return groupCache.get(categoryId)!;
  const data = await fetchJson<{ results: GroupResult[] }>(`${BASE}/${categoryId}/groups`);
  const groups = data?.results ?? [];
  groupCache.set(categoryId, groups);
  return groups;
}

/** Find a group by matching its name against a regex. */
export async function findGroup(categoryId: number, pattern: RegExp): Promise<GroupResult | null> {
  const groups = await getGroups(categoryId);
  return groups.find((g) => pattern.test(g.name)) ?? null;
}

/**
 * Get the top cards from a set, sorted by market price descending.
 * Returns cards with images from TCGPlayer CDN (400w).
 */
export async function getTopCards(
  categoryId: number,
  groupId: number,
  limit = 8,
): Promise<TcgCsvProduct[]> {
  const cacheKey = `${categoryId}:${groupId}`;
  if (resultCache.has(cacheKey)) return resultCache.get(cacheKey)!.slice(0, limit);

  const [prodsData, pricesData] = await Promise.all([
    fetchJson<{ results: RawProduct[] }>(`${BASE}/${categoryId}/${groupId}/products`),
    fetchJson<{ results: RawPrice[] }>(`${BASE}/${categoryId}/${groupId}/prices`),
  ]);

  if (!prodsData?.results || !pricesData?.results) return [];

  const prodMap = new Map(prodsData.results.map((p) => [p.productId, p]));

  // Filter out sealed product (boxes, packs, cases, decks, bundles)
  const sealedRe = /\b(booster|box|case|pack|deck|bundle|set|display|tin)\b/i;

  const merged = pricesData.results
    .filter((p) => p.marketPrice && p.marketPrice > 0)
    .map((p) => {
      const prod = prodMap.get(p.productId);
      if (!prod || !prod.imageUrl) return null;
      if (sealedRe.test(prod.name)) return null;
      return {
        productId: p.productId,
        name: prod.name,
        imageUrl: prod.imageUrl.replace("_200w", "_400w"),
        marketPrice: p.marketPrice!,
        subTypeName: p.subTypeName ?? "Normal",
      };
    })
    .filter(Boolean) as TcgCsvProduct[];

  merged.sort((a, b) => b.marketPrice - a.marketPrice);
  resultCache.set(cacheKey, merged);
  return merged.slice(0, limit);
}
