// smartProduct/searchHelpers.ts
// Helpers puros del buscador premium: historial localStorage, highlights,
// filtrado por juego, ordenación, sugerencias. Sin dependencias de React
// ni del DOM para que sean testeables.

import { enrichForMatch, normalizeForMatch } from "@/lib/setHighlights/matching";
import type { ProductCandidate } from "@/lib/productIdentifier";

// ─── Historial de búsqueda ────────────────────────────────────────────────────

export const HISTORY_KEY = "tcga_admin_ia_search_history";
export const HISTORY_MAX = 8;

export function loadHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, HISTORY_MAX);
  } catch {
    return [];
  }
}

export function saveHistory(list: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
  } catch {
    // ignore
  }
}

/** Añade una query al historial (dedupe, lowercase, trim, max 8). */
export function pushHistory(prev: string[], query: string): string[] {
  const clean = query.trim();
  if (clean.length < 2) return prev;
  const key = clean.toLowerCase();
  const dedup = prev.filter((q) => q.toLowerCase() !== key);
  return [clean, ...dedup].slice(0, HISTORY_MAX);
}

export function clearHistory(): string[] {
  saveHistory([]);
  return [];
}

// ─── Highlight de tokens matcheados ───────────────────────────────────────────

/**
 * Dado un texto y una query, devuelve segmentos { text, matched } para renderizar
 * con highlights. Matchea token a token (normalizado + sinónimos ES→EN).
 * Preserva la capitalización original del texto.
 */
export interface HighlightSegment {
  text: string;
  matched: boolean;
}

export function buildHighlightSegments(
  text: string,
  query: string,
): HighlightSegment[] {
  if (!text) return [];
  if (!query.trim()) return [{ text, matched: false }];

  // Tokens de la query tras enrichForMatch (aplica sinónimos ES→EN)
  const queryTokens = new Set(
    enrichForMatch(query)
      .split(" ")
      .filter((t) => t.length >= 2),
  );
  if (queryTokens.size === 0) return [{ text, matched: false }];

  // Divide el texto en "palabras" manteniendo separadores visuales.
  // Una palabra es una secuencia de [A-Za-z0-9ÁÉÍÓÚáéíóúñÑ]. El resto va literal.
  const parts = text.split(/([^A-Za-z0-9\u00C0-\u017F]+)/);
  return parts.map<HighlightSegment>((p) => {
    if (!p) return { text: p, matched: false };
    // Solo las "palabras" pueden matchear. Los separadores van literales.
    const isWord = /^[A-Za-z0-9\u00C0-\u017F]+$/.test(p);
    if (!isWord) return { text: p, matched: false };
    const norm = normalizeForMatch(p);
    const matched = queryTokens.has(norm);
    return { text: p, matched };
  });
}

// ─── Filtrado y ordenación de candidatos ──────────────────────────────────────

export type SortMode = "score" | "recent" | "cards";

export interface FilterOpts {
  gameFilter: string | null;
  sortBy: SortMode;
}

export function filterAndSort(
  candidates: ProductCandidate[],
  opts: FilterOpts,
): ProductCandidate[] {
  const filtered = opts.gameFilter
    ? candidates.filter((c) => c.game === opts.gameFilter)
    : candidates.slice();

  if (opts.sortBy === "score") {
    filtered.sort((a, b) => b.score - a.score);
  } else if (opts.sortBy === "recent") {
    filtered.sort((a, b) => {
      const da = a.releasedAt ? Date.parse(a.releasedAt) : 0;
      const db = b.releasedAt ? Date.parse(b.releasedAt) : 0;
      if (db !== da) return db - da;
      return b.score - a.score;
    });
  } else if (opts.sortBy === "cards") {
    filtered.sort((a, b) => {
      const ca = a.cardCount ?? 0;
      const cb = b.cardCount ?? 0;
      if (cb !== ca) return cb - ca;
      return b.score - a.score;
    });
  }
  return filtered;
}

/** Cuenta candidatos presentes por cada juego (para habilitar/deshabilitar chips). */
export function countByGame(candidates: ProductCandidate[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of candidates) {
    out[c.game] = (out[c.game] ?? 0) + 1;
  }
  return out;
}

/** Cuenta candidatos por cada fuente (un candidato puede venir de varias). */
export function countBySource(candidates: ProductCandidate[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of candidates) {
    for (const s of c.sources) {
      out[s] = (out[s] ?? 0) + 1;
    }
  }
  return out;
}

// ─── Sugerencias (empty state) ────────────────────────────────────────────────

/**
 * Ejemplos populares por juego. Se muestran cuando la query está vacía y no
 * hay historial — orientan al admin sobre qué escribir.
 */
export const SEARCH_SUGGESTIONS: Array<{ label: string; game: string; emoji: string }> = [
  { label: "Bloomburrow", game: "magic", emoji: "🧙" },
  { label: "Foundations", game: "magic", emoji: "🧙" },
  { label: "Prismatic Evolutions", game: "pokemon", emoji: "⚡" },
  { label: "Stellar Crown", game: "pokemon", emoji: "⚡" },
  { label: "Rage of the Abyss", game: "yugioh", emoji: "🌀" },
  { label: "Phantom Nightmare", game: "yugioh", emoji: "🌀" },
  { label: "Azurite Sea", game: "lorcana", emoji: "✨" },
  { label: "One Piece OP-11", game: "one-piece", emoji: "⛵" },
];
