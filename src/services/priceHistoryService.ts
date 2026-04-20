/**
 * Price History — servicio cliente.
 *
 * Responsabilidades:
 *  - Leer el histórico público de precios (EUR, fuente Cardmarket o equivalente)
 *    llamando a /api/price-history.
 *  - Cachear 1h en localStorage para no martillear la API al hacer hover/scroll.
 *  - Devolver series ordenadas por fecha asc, deduplicadas por fecha (un punto/día).
 *
 * La escritura la hace el cron server-side (POST /api/cron/price-snapshot) —
 * nunca desde cliente. El cliente es READ-ONLY.
 */

import { safeRead, safeWrite } from "@/lib/safeStorage";
import { DataHubEvents } from "@/lib/dataHub/events";

export interface PriceHistoryPoint {
  /** ISO date string (YYYY-MM-DD) — 1 snapshot por día máximo. */
  date: string;
  /** Precio Cardmarket trend (profesional) en EUR. */
  eur: number;
  /** Código ISO moneda fuente (si vino USD/JPY se convirtió a EUR vía BCE). */
  sourceCurrency?: string;
  /** Identificador proveedor: "scryfall" | "ygoprodeck" | "pokemontcg" | "tcgplayer" */
  source?: string;
}

export interface PriceHistorySeries {
  /** Clave canónica: `${game}:${externalId}` — único por carta. */
  cardId: string;
  game: string;
  cardName: string;
  points: PriceHistoryPoint[];
  /** Última actualización del server (ISO). */
  updatedAt: string;
}

const CACHE_KEY = "tcgacademy_price_history";
const CACHE_META_KEY = "tcgacademy_price_history_meta";
const CLIENT_TTL_MS = 60 * 60 * 1000; // 1 hora

interface CacheMap {
  [cardId: string]: { series: PriceHistorySeries; fetchedAt: string };
}

function readCache(): CacheMap {
  return safeRead<CacheMap>(CACHE_KEY, {});
}

function writeCache(cache: CacheMap): void {
  safeWrite(CACHE_KEY, cache);
  safeWrite(CACHE_META_KEY, { lastWriteAt: new Date().toISOString() });
  if (typeof window !== "undefined") {
    try { window.dispatchEvent(new Event(DataHubEvents.PRICE_HISTORY_UPDATED)); } catch { /* non-fatal */ }
  }
}

function isFresh(entry: CacheMap[string] | undefined): boolean {
  if (!entry) return false;
  const t = Date.parse(entry.fetchedAt);
  if (!isFinite(t)) return false;
  return Date.now() - t < CLIENT_TTL_MS;
}

/** Clave canónica. Ej: cardId("magic", "abc123") → "magic:abc123". */
export function canonicalCardId(game: string, externalId: string): string {
  return `${game}:${externalId}`;
}

/**
 * Devuelve la serie completa (hasta 3 años) ordenada asc por fecha.
 * Si no hay histórico aún, devuelve `null` (NO inventa datos).
 */
export async function getPriceHistory(
  game: string,
  externalId: string,
): Promise<PriceHistorySeries | null> {
  const cardId = canonicalCardId(game, externalId);
  const cache = readCache();
  const entry = cache[cardId];
  if (isFresh(entry)) return entry.series;

  try {
    const res = await fetch(
      `/api/price-history?cardId=${encodeURIComponent(cardId)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) {
      // 404 = no hay histórico todavía — legítimo, no es error.
      if (res.status === 404) return null;
      throw new Error(`price-history ${res.status}`);
    }
    const json = (await res.json()) as { ok: boolean; series?: PriceHistorySeries };
    if (!json.ok || !json.series) return null;
    const series = json.series;
    cache[cardId] = { series, fetchedAt: new Date().toISOString() };
    writeCache(cache);
    return series;
  } catch {
    // En fallo de red, servir cache stale si existe.
    return entry?.series ?? null;
  }
}

/** Último precio conocido (el último punto de la serie). */
export function getLatestPrice(series: PriceHistorySeries | null): number | null {
  if (!series || series.points.length === 0) return null;
  return series.points[series.points.length - 1].eur;
}

/** Primer precio conocido (primer punto) — útil para calcular % variación total. */
export function getFirstPrice(series: PriceHistorySeries | null): number | null {
  if (!series || series.points.length === 0) return null;
  return series.points[0].eur;
}

/** % de variación entre primer y último punto. Null si <2 puntos. */
export function getVariationPct(series: PriceHistorySeries | null): number | null {
  if (!series || series.points.length < 2) return null;
  const first = series.points[0].eur;
  const last = series.points[series.points.length - 1].eur;
  if (first <= 0) return null;
  return ((last - first) / first) * 100;
}
