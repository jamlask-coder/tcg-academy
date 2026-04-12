// Unified card image service — routes requests to the correct API by game slug.
//
// Usage:
//   const service = getCardServiceForGame("magic");
//   const cards = await service.searchCards("Lightning Bolt");

import type { CardApiService } from "./cardApiService";
import { pokemonTcgApi } from "./pokemonTcgApi";
import { scryfallApi } from "./scryfallApi";
import { ygoProDeckApi } from "./ygoProDeckApi";

const GAME_TO_SERVICE: Record<string, CardApiService> = {
  magic: scryfallApi,
  pokemon: pokemonTcgApi,
  yugioh: ygoProDeckApi,
};

/**
 * Returns the card API service for the given game slug,
 * or null if the game has no supported free API.
 */
export function getCardServiceForGame(game: string): CardApiService | null {
  return GAME_TO_SERVICE[game] ?? null;
}

/**
 * Returns true if card search is available for the given game slug.
 */
export function isCardSearchSupported(game: string): boolean {
  return game in GAME_TO_SERVICE;
}

/** All game slugs that have a supported card API. */
export const CARD_SEARCH_SUPPORTED_GAMES = Object.keys(GAME_TO_SERVICE);
