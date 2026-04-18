/**
 * Store adapter interface — una implementación por tienda competidora.
 *
 * Cada adapter traduce un `NormalizedName` al formato de búsqueda específico
 * de esa tienda, fetcha el HTML, intenta extraer precio y devuelve una
 * `AdapterResult` homogénea. El API route la envuelve en un `CompetitorPrice`
 * añadiendo metadatos (storeId, storeName, checkedAt…).
 */

import type { CompetitorLookupStatus } from "@/types/competitorPrice";
import type { NormalizedName } from "@/lib/competitors/nameNormalize";

export interface AdapterResult {
  status: CompetitorLookupStatus;
  price: number | null;
  url: string;            // URL directa al producto, o URL de búsqueda como fallback
  matchedTitle?: string;
  inStock?: boolean;
  errorMessage?: string;
}

export interface AdapterContext {
  /** Función fetch server-side con timeout y UA browser-like. */
  fetchHtml: (url: string, timeoutMs?: number) => Promise<string>;
  /** Permite al adapter escribir logs diagnósticos (no sensible). */
  log?: (msg: string) => void;
  /**
   * Slug del juego al que pertenece el producto (p.ej. "magic", "pokemon").
   * Disponible para adapters que quieran segmentar búsqueda por catálogo.
   * Opcional porque adapters de tiendas generalistas no lo usan.
   */
  productGame?: string;
}

export interface StoreAdapter {
  id: string;
  search: (query: NormalizedName, ctx: AdapterContext) => Promise<AdapterResult>;
}
