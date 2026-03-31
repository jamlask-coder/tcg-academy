// YGOProDeck API — https://db.ygoprodeck.com/api/v7/
// Free, no key required.
// Docs: https://ygoprodeck.com/api-guide/

import type { CardApiService } from "./cardApiService";
import type { ExternalCardData, CardSet } from "@/types/card";

const BASE = "https://db.ygoprodeck.com/api/v7";
const CACHE_PREFIX = "ygo_cache_";

function cacheKey(k: string) {
  return CACHE_PREFIX + k;
}

function readCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: T; ts: number };
    if (Date.now() - ts > 15 * 60 * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  try {
    sessionStorage.setItem(cacheKey(key), JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // sessionStorage full — ignore
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCard(raw: Record<string, any>): ExternalCardData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const images = raw.card_images as Array<Record<string, any>> | undefined;
  const img = images?.[0];

  return {
    id: String(raw.id as number),
    name: raw.name as string,
    setId: "",
    setName: "",
    rarity: undefined,
    language: "EN",
    imageUrl: (img?.image_url_small ?? img?.image_url ?? "") as string,
    imageUrlHiRes: (img?.image_url ?? "") as string,
    types: [raw.type as string],
    artist: undefined,
    flavorText: raw.desc as string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    marketPrice: (raw.card_prices as Array<Record<string, any>> | undefined)?.[0]
      ?.cardmarket_price
      ? parseFloat(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (raw.card_prices as Array<Record<string, any>>)[0].cardmarket_price as string,
        )
      : undefined,
    source: "ygoprodeck",
  };
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`YGOProDeck API error ${res.status}`);
  return res.json() as Promise<T>;
}

export async function searchYgoCards(
  query: string,
  _setId?: string,
): Promise<ExternalCardData[]> {
  if (!query.trim()) return [];
  const cKey = `cards_${query}`;
  const cached = readCache<ExternalCardData[]>(cKey);
  if (cached) return cached;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await apiFetch<{ data: Record<string, any>[] }>(
    `/cardinfo.php?fname=${encodeURIComponent(query.trim())}&num=20&offset=0`,
  );
  const result = data.data.map(mapCard);
  writeCache(cKey, result);
  return result;
}

export async function getYgoCard(id: string): Promise<ExternalCardData | null> {
  const cKey = `card_${id}`;
  const cached = readCache<ExternalCardData>(cKey);
  if (cached) return cached;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await apiFetch<{ data: Record<string, any>[] }>(
      `/cardinfo.php?id=${encodeURIComponent(id)}`,
    );
    if (!data.data?.length) return null;
    const result = mapCard(data.data[0]);
    writeCache(cKey, result);
    return result;
  } catch {
    return null;
  }
}

export async function getYgoSets(): Promise<CardSet[]> {
  const cKey = "sets";
  const cached = readCache<CardSet[]>(cKey);
  if (cached) return cached;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await apiFetch<Array<Record<string, any>>>("/cardsets.php");
  const result: CardSet[] = data
    .sort((a, b) =>
      // Sort newest first by set_code (approximate; API doesn't return dates for all sets)
      String(b.set_code).localeCompare(String(a.set_code)),
    )
    .slice(0, 200)
    .map((s) => ({
      id: s.set_code as string,
      name: s.set_name as string,
      total: s.num_of_cards as number | undefined,
      releaseDate: s.tcg_date as string | undefined,
    }));
  writeCache(cKey, result);
  return result;
}

export const ygoProDeckApi: CardApiService = {
  searchCards: searchYgoCards,
  getCard: getYgoCard,
  getSets: getYgoSets,
};
