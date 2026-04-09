// Scryfall API — https://api.scryfall.com
// Free, no key required. Please add 50–100 ms between automated requests.
// Docs: https://scryfall.com/docs/api

import type { CardApiService } from "./cardApiService";
import type { ExternalCardData, CardSet } from "@/types/card";

const BASE = "https://api.scryfall.com";
const CACHE_PREFIX = "scryfall_cache_";

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
  // Prefer large image; fall back to normal or png
  const imgFaces =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw.card_faces as Array<Record<string, any>> | undefined) ?? [];
  const faceImages = imgFaces[0]?.image_uris ?? null;
  const cardImages = raw.image_uris ?? faceImages ?? {};

  return {
    id: raw.id as string,
    name: raw.name as string,
    setId: (raw.set ?? "") as string,
    setName: (raw.set_name ?? "") as string,
    number: raw.collector_number as string | undefined,
    rarity: raw.rarity as string | undefined,
    language: (raw.lang as string | undefined)?.toUpperCase() ?? "EN",
    imageUrl: (cardImages.normal ?? cardImages.small ?? "") as string,
    imageUrlHiRes: (cardImages.large ?? cardImages.png ?? "") as string,
    types: raw.type_line
      ? (raw.type_line as string).split(" — ")[0].split(" ")
      : undefined,
    artist: raw.artist as string | undefined,
    flavorText: raw.flavor_text as string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    marketPrice: (raw.prices as Record<string, any> | undefined)?.eur
      ? parseFloat(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (raw.prices as Record<string, any>).eur as string,
        )
      : undefined,
    source: "scryfall",
  };
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Scryfall API error ${res.status}`);
  return res.json() as Promise<T>;
}

export async function searchScryfallCards(
  query: string,
  setId?: string,
): Promise<ExternalCardData[]> {
  const parts: string[] = [];
  if (query.trim()) parts.push(query.trim());
  if (setId) parts.push(`s:${setId}`);
  const q = parts.join(" ") || "type:creature";
  const cKey = `cards_${q}`;
  const cached = readCache<ExternalCardData[]>(cKey);
  if (cached) return cached;

  const data = await apiFetch<{
    data: Record<string, unknown>[];
    total_cards: number;
  }>(`/cards/search?q=${encodeURIComponent(q)}&order=edhrec&page=1`);
  const result = data.data.slice(0, 20).map(mapCard);
  writeCache(cKey, result);
  return result;
}

export async function getScryfallCard(
  id: string,
): Promise<ExternalCardData | null> {
  const cKey = `card_${id}`;
  const cached = readCache<ExternalCardData>(cKey);
  if (cached) return cached;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await apiFetch<Record<string, any>>(`/cards/${id}`);
    const result = mapCard(data);
    writeCache(cKey, result);
    return result;
  } catch {
    return null;
  }
}

export async function getScryfallSets(): Promise<CardSet[]> {
  const cKey = "sets";
  const cached = readCache<CardSet[]>(cKey);
  if (cached) return cached;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await apiFetch<{ data: Record<string, any>[] }>("/sets");
  const result: CardSet[] = data.data
    // Only show expansion/core sets, commander, and masters — skip tokens, etc.
    .filter((s) =>
      [
        "expansion",
        "core",
        "masters",
        "commander",
        "draft_innovation",
      ].includes(s.set_type as string),
    )
    .sort(
      (a, b) =>
        new Date(b.released_at as string).getTime() -
        new Date(a.released_at as string).getTime(),
    )
    .map((s) => ({
      id: s.code as string,
      name: s.name as string,
      releaseDate: s.released_at as string | undefined,
      total: s.card_count as number | undefined,
      logo: s.icon_svg_uri as string | undefined,
      symbol: s.icon_svg_uri as string | undefined,
    }));
  writeCache(cKey, result);
  return result;
}

export const scryfallApi: CardApiService = {
  searchCards: searchScryfallCards,
  getCard: getScryfallCard,
  getSets: getScryfallSets,
};
