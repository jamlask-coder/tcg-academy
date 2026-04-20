// cache.ts — caches en memoria para highlights + in-flight dedup para listas de sets.

import type { HighlightCard } from "./types";

/** Cache final de cartas resueltas por (game:setId:lang). */
export const highlightCache = new Map<string, HighlightCard[]>();

/**
 * In-flight dedup. Si dos llamadas piden la misma URL simultáneamente, reusamos
 * la promesa para evitar dos fetches y para que la 2ª obtenga la misma lista.
 */
const inflight = new Map<string, Promise<unknown>>();

export function dedup<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = inflight.get(key);
  if (hit) return hit as Promise<T>;
  const p = loader().finally(() => {
    // Liberamos la entrada en el mismo tick para permitir reuso rápido pero no
    // eterno. El caller almacenará el resultado en su cache de datos si procede.
    inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}
