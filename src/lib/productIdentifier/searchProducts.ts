// productIdentifier/searchProducts.ts
// Orquestador del flujo "busco por texto → candidatos fusionados".
//
// Uso:
//   const { candidates, errors, ... } = await searchProducts("bloomburrow booster box");
//   // Mostrar candidatos en el modal. Al seleccionar uno:
//   const draft = candidateToDraft(candidate);
//   // draft → defaultValues del ProductForm

import { searchAllCatalogs } from "./catalog";
import { fuseHits } from "./fusion";
import type { CatalogSearchResult } from "./types";

export async function searchProducts(query: string): Promise<CatalogSearchResult> {
  const t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const errors: string[] = [];
  const clean = query.trim();

  if (clean.length < 2) {
    return {
      candidates: [],
      rawHits: [],
      errors: ["query:too-short"],
      sourcesQueried: [],
      tookMs: 0,
    };
  }

  const { hits, sourcesQueried } = await searchAllCatalogs(clean, errors);
  const candidates = fuseHits(hits, clean);

  const t1 =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    candidates,
    rawHits: hits,
    errors,
    sourcesQueried,
    tookMs: Math.round(t1 - t0),
  };
}
