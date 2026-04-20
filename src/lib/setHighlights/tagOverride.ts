// tagOverride.ts — Helper común a todos los adapters.
// Permite al admin forzar un setId concreto en un producto con un tag "set:<id>"
// (p.ej. "set:sv10" o "set:blb"). Útil para productos demo/ficticios cuyo nombre
// no matchea regex ni fuzzy.

import type { LocalProduct, ResolveResult } from "./types";

/**
 * Busca un tag del tipo "set:<id>" en product.tags.
 * Devuelve un ResolveResult con provenance "tag-explicit-set" o null.
 *
 * Formato aceptado (case-insensitive):
 *   - "set:sv10"
 *   - "set:blb"
 *   - "set:op-11"
 *
 * El setId se conserva en lowercase (los APIs suelen usar minúsculas).
 */
export function resolveFromTag(product: LocalProduct): ResolveResult | null {
  const tags = product.tags;
  if (!tags || tags.length === 0) return null;
  for (const t of tags) {
    const m = /^set:(.+)$/i.exec(t.trim());
    if (m && m[1]) {
      const setId = m[1].trim().toLowerCase();
      if (setId) {
        return { setId, provenance: "tag-explicit-set" };
      }
    }
  }
  return null;
}
