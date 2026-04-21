/**
 * Competitor price — servicio cliente.
 *
 * Responsabilidades:
 *  - Cachear snapshots por productId (24h TTL) en localStorage.
 *  - Servir la lectura para la columna compacta del admin sin golpear la API.
 *  - Emitir `tcga:competitor_prices:updated` tras cada refresh para que las
 *    vistas subscritas se actualicen.
 *
 * La escritura remota (llamar a /api/competitor-prices) es responsabilidad
 * exclusiva de este servicio — nadie debería hacer `fetch` a ese endpoint
 * directamente.
 */

import { safeRead, safeWrite } from "@/lib/safeStorage";
import type {
  CompetitorPriceRange,
  CompetitorPriceSnapshot,
  CompetitorPricesRequest,
  CompetitorPricesResponse,
} from "@/types/competitorPrice";

export const STORAGE_KEY = "tcgacademy_competitor_prices";
export const EVENT_UPDATED = "tcga:competitor_prices:updated";
export const TTL_MS = 24 * 60 * 60 * 1000; // 24h

type SnapshotMap = Record<string, CompetitorPriceSnapshot>;

function readAll(): SnapshotMap {
  return safeRead<SnapshotMap>(STORAGE_KEY, {});
}

function writeAll(map: SnapshotMap): void {
  safeWrite(STORAGE_KEY, map);
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new Event(EVENT_UPDATED));
    } catch { /* non-fatal */ }
  }
}

/** Devuelve el snapshot cacheado de un producto (o null si no hay). */
export function getCachedSnapshot(productId: number): CompetitorPriceSnapshot | null {
  const all = readAll();
  return all[String(productId)] ?? null;
}

/** ¿Está el snapshot fresco (< TTL)? */
export function isFresh(snapshot: CompetitorPriceSnapshot | null): boolean {
  if (!snapshot) return false;
  const ts = new Date(snapshot.lastUpdate).getTime();
  if (!isFinite(ts)) return false;
  return Date.now() - ts < TTL_MS;
}

/** Rango min/max derivado de un snapshot — alimenta la columna compacta. */
export function deriveRange(snapshot: CompetitorPriceSnapshot | null): CompetitorPriceRange {
  if (!snapshot) {
    return { min: null, max: null, hits: 0, total: 0 };
  }
  const priced = snapshot.prices.filter((p) => typeof p.price === "number" && p.price > 0);
  const values = priced.map((p) => p.price as number);
  return {
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    hits: values.length,
    total: snapshot.prices.length,
  };
}

/**
 * Fuerza un refresh consultando la API (aunque haya cache fresca).
 * Persiste el resultado y dispara el evento.
 */
export async function refreshCompetitorPrices(
  productId: number,
  productName: string,
  opts?: {
    productImage?: string;
    productGame?: string;
    productLanguage?: string;
    storeIds?: string[];
  },
): Promise<CompetitorPriceSnapshot> {
  const body: CompetitorPricesRequest = {
    productId,
    productName,
    productImage: opts?.productImage,
    productGame: opts?.productGame,
    productLanguage: opts?.productLanguage,
    storeIds: opts?.storeIds,
  };
  const res = await fetch("/api/competitor-prices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`competitor-prices API ${res.status}: ${err}`);
  }
  const json = (await res.json()) as CompetitorPricesResponse;
  if (!json.ok) throw new Error("competitor-prices devolvió ok=false");
  const all = readAll();
  all[String(productId)] = json.snapshot;
  writeAll(all);
  return json.snapshot;
}

/**
 * Lee del cache si está fresco; si no, refresca. Úsalo desde el modal
 * cuando el usuario pincha "Ver" y queremos mostrar datos ya.
 */
export async function getOrRefresh(
  productId: number,
  productName: string,
  opts?: { productImage?: string; productGame?: string; force?: boolean },
): Promise<CompetitorPriceSnapshot> {
  if (!opts?.force) {
    const cached = getCachedSnapshot(productId);
    if (isFresh(cached) && cached) return cached;
  }
  return refreshCompetitorPrices(productId, productName, {
    productImage: opts?.productImage,
    productGame: opts?.productGame,
  });
}

/** Invalida la entrada de un producto (útil tras editar nombre o precio). */
export function invalidateCompetitorPrice(productId: number): void {
  const all = readAll();
  if (all[String(productId)]) {
    delete all[String(productId)];
    writeAll(all);
  }
}

/** Hook-friendly subscribe (para componentes). */
export function subscribeCompetitorPrices(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_UPDATED, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT_UPDATED, handler);
    window.removeEventListener("storage", handler);
  };
}
