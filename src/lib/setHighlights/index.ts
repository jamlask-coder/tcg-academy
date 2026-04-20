// index.ts — dispatcher público del módulo setHighlights.
//
// Uso desde la UI:
//   const result = await resolveHighlights(product, "es");
//
// El dispatcher:
// 1. Elige el adapter por `product.game` (fallback: noop).
// 2. Ejecuta `resolveSetId(...)` con las estrategias del adapter.
// 3. Llama `fetchTopCards(...)` con timeout individual.
// 4. Cachea (game:setId:lang) en memoria.
// 5. Registra en telemetría para debug (`globalThis.__TCGA_HIGHLIGHTS_LOG__`).

import type {
  HighlightCard,
  HighlightsResult,
  LocalProduct,
  SetAdapter,
} from "./types";
import { highlightCache } from "./cache";
import { logToTelemetry } from "./telemetry";
import { magicAdapter } from "./adapters/magic";
import { pokemonAdapter } from "./adapters/pokemon";
import { yugiohAdapter } from "./adapters/yugioh";
import { onePieceAdapter } from "./adapters/onePiece";
import { dragonBallAdapter } from "./adapters/dragonBall";
import { lorcanaAdapter } from "./adapters/lorcana";
import { riftboundAdapter } from "./adapters/riftbound";
import { digimonAdapter } from "./adapters/digimon";
import { narutoAdapter } from "./adapters/naruto";
import {
  cyberpunkAdapter,
  noopAdapter,
  paniniAdapter,
  toppsAdapter,
} from "./adapters/noop";

const ADAPTERS: Record<string, SetAdapter> = {
  magic: magicAdapter,
  pokemon: pokemonAdapter,
  yugioh: yugiohAdapter,
  "one-piece": onePieceAdapter,
  "dragon-ball": dragonBallAdapter,
  lorcana: lorcanaAdapter,
  riftbound: riftboundAdapter,
  digimon: digimonAdapter,
  naruto: narutoAdapter,
  topps: toppsAdapter,
  panini: paniniAdapter,
  cyberpunk: cyberpunkAdapter,
};

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * Indica si el adaptador de un juego está soportado (tiene fuente de cartas).
 * Juegos como `topps`, `panini`, `cyberpunk` son cromos sin cotización, por lo
 * que devuelven siempre `[]` y no deben contabilizarse como "fallos".
 */
export function isGameSupported(game: string): boolean {
  const adapter = ADAPTERS[game] ?? noopAdapter;
  return adapter.supported;
}

export async function resolveHighlights(
  product: LocalProduct,
  lang: string = product.language ?? "EN",
): Promise<HighlightsResult> {
  const t0 = now();
  const game = product.game;
  const adapter = ADAPTERS[game] ?? noopAdapter;
  const strategyTried: string[] = [];
  const errors: string[] = [];

  const emptyResult = (): HighlightsResult => ({
    cards: [],
    provenance: "none",
    resolved: null,
    game,
    strategyTried,
    errors,
    tookMs: now() - t0,
  });

  if (!adapter.supported) {
    const r = emptyResult();
    logToTelemetry(r, { productId: product.id, productName: product.name });
    return r;
  }

  let resolved = null;
  try {
    resolved = await adapter.resolveSetId(product, strategyTried, errors);
  } catch (e) {
    errors.push(`resolve:${String(e)}`);
  }

  if (!resolved) {
    const r = emptyResult();
    logToTelemetry(r, { productId: product.id, productName: product.name });
    return r;
  }

  // Cache hit
  const cacheKey = `${game}:${resolved.setId}:${lang}`;
  const cached = highlightCache.get(cacheKey);
  if (cached) {
    const r: HighlightsResult = {
      cards: cached,
      provenance: resolved.provenance,
      resolved,
      game,
      strategyTried,
      errors,
      tookMs: now() - t0,
    };
    logToTelemetry(r, { productId: product.id, productName: product.name });
    return r;
  }

  let cards: HighlightCard[] = [];
  try {
    cards = await adapter.fetchTopCards(resolved.setId, lang, product, errors);
  } catch (e) {
    errors.push(`fetch:${String(e)}`);
  }

  if (cards.length > 0) {
    highlightCache.set(cacheKey, cards);
  }

  const r: HighlightsResult = {
    cards,
    provenance: resolved.provenance,
    resolved,
    game,
    strategyTried,
    errors,
    tookMs: now() - t0,
  };
  logToTelemetry(r, { productId: product.id, productName: product.name });
  if (
    typeof window !== "undefined" &&
    typeof process !== "undefined" &&
    process.env?.NODE_ENV !== "production" &&
    cards.length === 0
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      `[highlights] 0 cards for "${product.name}" (${game}/${resolved.setId}). strategies=${strategyTried.join(",")} errors=${errors.join("|")}`,
    );
  }
  return r;
}

export type {
  HighlightCard,
  HighlightsResult,
  Provenance,
  ResolveResult,
  SetAdapter,
} from "./types";
