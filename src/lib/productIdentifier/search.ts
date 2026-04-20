// productIdentifier/search.ts
// Canonicaliza pistas contra APIs TCG oficiales.
// Si el set se reconoce, podemos reconstruir el nombre del producto en inglés
// con altísima confianza (p. ej. "Bloomburrow Play Booster Display").
//
// APIs usadas (todas públicas, sin API key obligatoria):
//   - Scryfall (Magic)
//   - pokemontcg.io (Pokémon)
//   - ygoprodeck (Yu-Gi-Oh)
//
// Para los demás juegos no hay API pública fiable con catálogo de sets, así
// que nos quedamos con las pistas del extract layer y marcamos confianza media.

import { bestFuzzyMatch, enrichForMatch } from "@/lib/setHighlights/matching";
import type { CanonicalMatch, Clues } from "./types";

// ─── Scryfall (Magic) ─────────────────────────────────────────────────────────

interface ScryfallSet {
  code: string;
  name: string;
  set_type: string;
  card_count: number;
}

async function searchMagicSet(clues: Clues): Promise<CanonicalMatch | null> {
  try {
    const r = await fetch("https://api.scryfall.com/sets", {
      cache: "force-cache",
    });
    if (!r.ok) return null;
    const json = (await r.json()) as { data?: ScryfallSet[] };
    const sets = json?.data ?? [];
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

    // 1. Match exacto por setCode si lo extrajimos
    if (clues.setCode) {
      const byCode = candidates.find(
        (s) => s.code.toLowerCase() === clues.setCode!.toLowerCase(),
      );
      if (byCode) {
        return {
          game: "magic",
          setId: byCode.code,
          setName: byCode.name,
          productName: byCode.name,
          confidence: "high",
          source: "scryfall:set-code",
        };
      }
    }

    // 2. Fuzzy contra fragmentos de nombre + keywords
    const searchText = enrichForMatch(
      [clues.nameFragments.join(" "), clues.keywords.join(" ")].join(" "),
    );
    const match = bestFuzzyMatch(candidates, (s) => s.name, searchText, 0.55);
    if (match) {
      return {
        game: "magic",
        setId: match.code,
        setName: match.name,
        productName: match.name,
        confidence: "high",
        source: "scryfall:fuzzy",
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── pokemontcg.io (Pokémon) ──────────────────────────────────────────────────

interface PokemonSet {
  id: string;
  name: string;
  series: string;
}

async function searchPokemonSet(clues: Clues): Promise<CanonicalMatch | null> {
  try {
    const apiKey =
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_POKEMON_TCG_API_KEY
        : undefined;
    const init: RequestInit = apiKey
      ? { headers: { "X-Api-Key": apiKey } }
      : {};
    const r = await fetch("https://api.pokemontcg.io/v2/sets", {
      ...init,
      cache: "force-cache",
    });
    if (!r.ok) return null;
    const json = (await r.json()) as { data?: PokemonSet[] };
    const sets = json?.data ?? [];

    if (clues.setCode) {
      const byCode = sets.find(
        (s) => s.id.toLowerCase() === clues.setCode!.toLowerCase(),
      );
      if (byCode) {
        return {
          game: "pokemon",
          setId: byCode.id,
          setName: byCode.name,
          productName: byCode.name,
          confidence: "high",
          source: "pokemontcg:set-code",
        };
      }
    }

    const searchText = enrichForMatch(
      [clues.nameFragments.join(" "), clues.keywords.join(" ")].join(" "),
    );
    const match = bestFuzzyMatch(sets, (s) => s.name, searchText, 0.55);
    if (match) {
      return {
        game: "pokemon",
        setId: match.id,
        setName: match.name,
        productName: match.name,
        confidence: "high",
        source: "pokemontcg:fuzzy",
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Yu-Gi-Oh (ygoprodeck) ────────────────────────────────────────────────────

interface YgoSet {
  set_name: string;
  set_code: string;
  num_of_cards: number;
}

async function searchYugiohSet(clues: Clues): Promise<CanonicalMatch | null> {
  try {
    const r = await fetch("https://db.ygoprodeck.com/api/v7/cardsets.php", {
      cache: "force-cache",
    });
    if (!r.ok) return null;
    const sets = (await r.json()) as YgoSet[];
    const candidates = sets.filter((s) => s.num_of_cards >= 30);

    if (clues.setCode) {
      const byCode = candidates.find(
        (s) => s.set_code?.toLowerCase() === clues.setCode!.toLowerCase(),
      );
      if (byCode) {
        return {
          game: "yugioh",
          setId: byCode.set_code.toLowerCase(),
          setName: byCode.set_name,
          productName: byCode.set_name,
          confidence: "high",
          source: "ygoprodeck:set-code",
        };
      }
    }

    const searchText = enrichForMatch(
      [clues.nameFragments.join(" "), clues.keywords.join(" ")].join(" "),
    );
    const match = bestFuzzyMatch(
      candidates,
      (s) => s.set_name,
      searchText,
      0.55,
    );
    if (match) {
      return {
        game: "yugioh",
        setId: match.set_code.toLowerCase(),
        setName: match.set_name,
        productName: match.set_name,
        confidence: "high",
        source: "ygoprodeck:fuzzy",
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

/**
 * Intenta canonicalizar las pistas contra la API del juego detectado.
 * Devuelve el mejor match o un CanonicalMatch con confianza "low" si el juego
 * no tiene API pública fiable (One Piece, Dragon Ball, Lorcana, Riftbound,
 * Digimon, Naruto, Topps, Panini, Cyberpunk).
 */
export async function canonicalizeClues(
  clues: Clues,
  errors: string[],
  strategyLog: string[],
): Promise<CanonicalMatch | null> {
  if (!clues.game) {
    strategyLog.push("canonical: no game detected — skip");
    return null;
  }

  try {
    if (clues.game === "magic") {
      strategyLog.push("canonical: scryfall");
      const m = await searchMagicSet(clues);
      if (m) return m;
    } else if (clues.game === "pokemon") {
      strategyLog.push("canonical: pokemontcg");
      const m = await searchPokemonSet(clues);
      if (m) return m;
    } else if (clues.game === "yugioh") {
      strategyLog.push("canonical: ygoprodeck");
      const m = await searchYugiohSet(clues);
      if (m) return m;
    } else {
      // Juegos sin API catalog pública robusta — devolvemos lo que tenemos.
      strategyLog.push(`canonical: no catalog api for game=${clues.game}`);
      if (clues.nameFragments.length > 0 || clues.setCode) {
        return {
          game: clues.game,
          setId: clues.setCode,
          setName: undefined,
          productName: clues.nameFragments[0],
          confidence: "medium",
          source: "heuristic:no-api",
        };
      }
    }
  } catch (e) {
    errors.push(`canonical:${String(e)}`);
  }

  // Fallback: devolvemos el game con baja confianza para que compose
  // aún rellene el juego aunque el set no se haya reconocido.
  if (clues.game) {
    return {
      game: clues.game,
      productName: clues.nameFragments[0],
      confidence: "low",
      source: "fallback:game-only",
    };
  }
  return null;
}
