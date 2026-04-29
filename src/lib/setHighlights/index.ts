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
 * Tabla de rarezas → tier numérico (más alto = más cotizada). Cubre Pokemon
 * (Cardmarket), Magic (Scryfall), Yu-Gi-Oh, One Piece y Lorcana. Las rarezas
 * desconocidas devuelven 0 — quedan al final del fallback.
 *
 * Solo se usa como TIE-BREAKER cuando no hay priceEur. No reemplaza el precio
 * real cuando existe.
 */
function rarityTier(rarity: string | undefined): number {
  if (!rarity) return 0;
  const r = rarity.toLowerCase();
  // Pokemon (Cardmarket / pokemontcg.io)
  if (r.includes("special illustration")) return 100;
  if (r.includes("hyper rare")) return 95;
  if (r.includes("illustration rare")) return 90;
  if (r.includes("ultra rare") || r.includes("ultrarare")) return 85;
  if (r.includes("secret")) return 88;
  if (r.includes("double rare")) return 70;
  // Magic
  if (r === "mythic" || r.includes("mythic")) return 95;
  // Yu-Gi-Oh
  if (r.includes("starlight")) return 100;
  if (r.includes("ghost rare") || r.includes("collector")) return 95;
  if (r.includes("prismatic secret")) return 92;
  if (r.includes("ultimate")) return 80;
  if (r.includes("super rare")) return 65;
  // One Piece / Dragon Ball
  if (r.includes("sec")) return 95;
  if (r.includes("scr")) return 95;
  if (r.includes("sp ")) return 88;
  if (r.includes("sr") || r === "sr") return 80;
  // Lorcana
  if (r.includes("enchanted")) return 95;
  if (r.includes("legendary")) return 75;
  // Generic fallback
  if (r === "rare" || r.includes("rare holo") || r.includes("rare")) return 50;
  if (r.includes("uncommon")) return 20;
  if (r.includes("common")) return 10;
  return 0;
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

  // Re-sort defensivo: garantiza que el orden del carrusel "Cartas más
  // cotizadas" sea SIEMPRE por priceEur descendente, independientemente del
  // adapter. Algunos endpoints (Scryfall sort=usd, ygoprodeck con prices a
  // null, fallback hardcoded sin precio) no garantizaban el orden por valor
  // EUR — y se veían cartas de céntimos arriba. Aquí las que no tienen precio
  // van al final, las caras suben.
  //
  // Fallback de rareza: cuando priceEur falta (sets JP-only sin Cardmarket
  // como SV11W White Flare), ordenar por número de carta dejaba arriba
  // Trainers/Stadiums/Energy. Con `rarityTier` priorizamos rarezas altas
  // (Special Illustration Rare, Hyper Rare, Ultra Rare, Mythic, Secret…)
  // sobre Common/Uncommon/Trainer.
  cards = [...cards].sort((a, b) => {
    const pa = typeof a.priceEur === "number" && a.priceEur > 0 ? a.priceEur : -1;
    const pb = typeof b.priceEur === "number" && b.priceEur > 0 ? b.priceEur : -1;
    if (pa !== pb) return pb - pa;
    return rarityTier(b.rarity) - rarityTier(a.rarity);
  });

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
