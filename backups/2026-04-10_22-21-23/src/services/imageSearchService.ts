// src/services/imageSearchService.ts
"use client";

export interface ImageSearchResult {
  url: string;
  label: string;
  source: string;
}

const CARD_CATEGORIES = new Set([
  "singles",
  "gradeadas",
  "prize-cards",
  "starlight",
  "alternate-art",
  "enchanted",
  "scr",
  "foil",
  "full-art-lands",
  "especiales",
]);

async function searchPokemonSets(query: string): Promise<ImageSearchResult[]> {
  try {
    const res = await fetch(
      `https://api.pokemontcg.io/v2/sets?q=name:${encodeURIComponent(query)}&pageSize=6`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      data: Array<{ name: string; images: { logo: string } }>;
    };
    return data.data
      .filter((s) => s.images?.logo)
      .map((s) => ({
        url: s.images.logo,
        label: s.name,
        source: "Pokémon TCG",
      }));
  } catch {
    return [];
  }
}

async function searchPokemonCards(query: string): Promise<ImageSearchResult[]> {
  try {
    const res = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(query)}&pageSize=6`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      data: Array<{ name: string; images: { large: string } }>;
    };
    return data.data
      .filter((c) => c.images?.large)
      .map((c) => ({
        url: c.images.large,
        label: c.name,
        source: "Pokémon TCG",
      }));
  } catch {
    return [];
  }
}

async function searchScryfallCards(
  query: string,
): Promise<ImageSearchResult[]> {
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&per_page=6`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      data: Array<{
        name: string;
        image_uris?: { normal: string };
        card_faces?: Array<{ image_uris?: { normal: string } }>;
      }>;
    };
    return data.data
      .slice(0, 6)
      .map((c) => {
        const url =
          c.image_uris?.normal ?? c.card_faces?.[0]?.image_uris?.normal ?? "";
        return { url, label: c.name, source: "Scryfall" };
      })
      .filter((r) => r.url);
  } catch {
    return [];
  }
}

async function searchYGOCards(query: string): Promise<ImageSearchResult[]> {
  try {
    const res = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(query)}&num=6&offset=0`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      data: Array<{
        name: string;
        card_images: Array<{ image_url: string }>;
      }>;
    };
    return data.data
      .slice(0, 6)
      .map((c) => ({
        url: c.card_images[0]?.image_url ?? "",
        label: c.name,
        source: "YGOProDeck",
      }))
      .filter((r) => r.url);
  } catch {
    return [];
  }
}

export async function searchProductImages(
  query: string,
  game: string,
  category: string,
): Promise<ImageSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const isCard = CARD_CATEGORIES.has(category);

  if (game === "pokemon") {
    return isCard ? searchPokemonCards(q) : searchPokemonSets(q);
  }
  if (game === "magic") {
    return searchScryfallCards(q);
  }
  if (game === "yugioh") {
    return searchYGOCards(q);
  }
  return [];
}
