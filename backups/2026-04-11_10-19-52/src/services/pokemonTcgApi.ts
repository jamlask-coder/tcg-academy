// Pokemon TCG API — https://api.pokemontcg.io/v2
// Free tier: 1000 req/day, no key required for basic use.
// Results cached in sessionStorage for the duration of the browser session.

import type { CardApiService } from "./cardApiService";
import type { ExternalCardData, CardSet } from "@/types/card";

const BASE = "https://api.pokemontcg.io/v2";
const CACHE_PREFIX = "ptcg_cache_";

function cacheKey(k: string) {
  return CACHE_PREFIX + k;
}

function readCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: T; ts: number };
    // Cache valid for 15 min
    if (Date.now() - ts > 15 * 60 * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  try {
    sessionStorage.setItem(
      cacheKey(key),
      JSON.stringify({ data, ts: Date.now() }),
    );
  } catch {
    // sessionStorage full — ignore
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCard(raw: Record<string, any>): ExternalCardData {
  return {
    id: raw.id as string,
    name: raw.name as string,
    setId: (raw.set?.id ?? "") as string,
    setName: (raw.set?.name ?? "") as string,
    number: raw.number as string | undefined,
    rarity: raw.rarity as string | undefined,
    language: "EN",
    imageUrl: (raw.images?.small ?? "") as string,
    imageUrlHiRes: (raw.images?.large ?? "") as string,
    types: raw.types as string[] | undefined,
    hp: raw.hp as string | undefined,
    artist: raw.artist as string | undefined,
    flavorText: raw.flavorText as string | undefined,
    marketPrice: raw.cardmarket?.prices?.averageSellPrice as number | undefined,
    source: "pokemon-tcg",
  };
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Pokemon TCG API error ${res.status}`);
  return res.json() as Promise<T>;
}

export async function searchPtcgCards(
  query: string,
  setId?: string,
): Promise<ExternalCardData[]> {
  const parts: string[] = [];
  if (query.trim()) parts.push(`name:"${query.trim()}*"`);
  if (setId) parts.push(`set.id:${setId}`);
  const q = parts.join(" ") || "name:*";
  const cKey = `cards_${q}`;
  const cached = readCache<ExternalCardData[]>(cKey);
  if (cached) return cached;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await apiFetch<{ data: Record<string, any>[] }>(
    `/cards?q=${encodeURIComponent(q)}&pageSize=20&select=id,name,set,number,rarity,images,types,hp,artist,flavorText,cardmarket`,
  );
  const result = data.data.map(mapCard);
  writeCache(cKey, result);
  return result;
}

export async function getPtcgCard(
  id: string,
): Promise<ExternalCardData | null> {
  const cKey = `card_${id}`;
  const cached = readCache<ExternalCardData>(cKey);
  if (cached) return cached;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await apiFetch<{ data: Record<string, any> }>(`/cards/${id}`);
    const result = mapCard(data.data);
    writeCache(cKey, result);
    return result;
  } catch {
    return null;
  }
}

export async function getPtcgSets(): Promise<CardSet[]> {
  const cKey = "sets";
  const cached = readCache<CardSet[]>(cKey);
  if (cached) return cached;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await apiFetch<{ data: Record<string, any>[] }>(
    "/sets?orderBy=-releaseDate&select=id,name,series,releaseDate,total,images",
  );
  const result: CardSet[] = data.data.map((s) => ({
    id: s.id as string,
    name: s.name as string,
    series: s.series as string | undefined,
    releaseDate: s.releaseDate as string | undefined,
    total: s.total as number | undefined,
    logo: s.images?.logo as string | undefined,
    symbol: s.images?.symbol as string | undefined,
  }));
  writeCache(cKey, result);
  return result;
}

// Named export satisfying CardApiService interface (for consumers using the interface)
export const pokemonTcgApi: CardApiService = {
  searchCards: searchPtcgCards,
  getCard: getPtcgCard,
  getSets: getPtcgSets,
};
