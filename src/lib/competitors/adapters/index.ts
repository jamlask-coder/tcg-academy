/**
 * Registry de adapters.
 *
 * Todas las tiendas actuales (cardzone, battledeck, pokemillon, itaca,
 * collectorage, manavortex) usan el mismo flujo genérico (`genericSearch`)
 * con diferencias mínimas en las URLs (ya encapsuladas en `COMPETITOR_STORES`).
 *
 * Cuando una tienda necesite lógica específica (p.ej. endpoint JSON en vez
 * de HTML, o captcha), se crea un adapter dedicado que implemente
 * `StoreAdapter` y se registra aquí en `CUSTOM_ADAPTERS` para sobrescribir
 * la entrada genérica.
 */

import { COMPETITOR_STORES, getCompetitorStore, type CompetitorStoreConfig } from "@/config/competitorStores";
import type { StoreAdapter } from "./types";
import { genericSearch } from "./genericAdapter";
import { buildCardmarketAdapter } from "./cardmarketAdapter";

function buildAdapterForStore(store: CompetitorStoreConfig): StoreAdapter {
  return {
    id: store.id,
    search: (query, ctx) => genericSearch(store, query, ctx),
  };
}

/** Overrides por tienda cuando el adapter genérico no basta.
 *  - cardmarket: agregador con SERP propia + precio "From X,XX €" en detalle
 *    (≈ vendedor profesional para sellados). Requiere parser específico. */
const cardmarketStore = getCompetitorStore("cardmarket");
const CUSTOM_ADAPTERS: Record<string, StoreAdapter> = {
  ...(cardmarketStore
    ? { cardmarket: buildCardmarketAdapter(cardmarketStore.searchUrl) }
    : {}),
};

export const ADAPTERS: Record<string, StoreAdapter> = Object.fromEntries(
  COMPETITOR_STORES.map((s) => [s.id, CUSTOM_ADAPTERS[s.id] ?? buildAdapterForStore(s)]),
);

export function getAdapter(id: string): StoreAdapter | undefined {
  return ADAPTERS[id];
}
