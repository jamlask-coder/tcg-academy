/**
 * Generic adapter — lógica común a las 4 tiendas soportadas.
 *
 * Flujo:
 *  1) GET URL de búsqueda con query primary.
 *  2) Intentar extraer precio directamente de la página de resultados
 *     (algunas tiendas muestran la ficha con precio en la misma SERP).
 *  3) Si no hay precio pero hay enlace al primer producto → seguir el link
 *     y extraer del detalle.
 *  4) Si la primary query no devuelve nada usable → probar variantes.
 *  5) Si todo falla → devolver la URL de búsqueda como `parse_error` para
 *     que el usuario pueda abrirla manualmente.
 */

import { extractFirstProductLink, extractProductInfo } from "@/lib/competitors/priceExtract";
import { matchScore } from "@/lib/competitors/nameNormalize";
import type { AdapterResult, AdapterContext } from "./types";
import type { CompetitorStoreConfig } from "@/config/competitorStores";
import type { NormalizedName } from "@/lib/competitors/nameNormalize";

/** Umbral mínimo de score para aceptar un match remoto. */
const MATCH_THRESHOLD = 0.35;

export async function genericSearch(
  store: CompetitorStoreConfig,
  query: NormalizedName,
  ctx: AdapterContext,
): Promise<AdapterResult> {
  const queries = [query.primary, ...query.variants].filter(Boolean);
  const primarySearchUrl = store.searchUrl(query.primary, ctx.productGame);

  let lastSearchUrl = primarySearchUrl;
  let networkFailed = false;
  let lastErr: string | undefined;

  for (const q of queries) {
    const searchUrl = store.searchUrl(q, ctx.productGame);
    lastSearchUrl = searchUrl;

    let searchHtml: string;
    try {
      searchHtml = await ctx.fetchHtml(searchUrl, store.timeoutMs);
    } catch (e) {
      networkFailed = true;
      lastErr = e instanceof Error ? e.message : "fetch failed";
      continue;
    }

    // 1) Intento directo sobre SERP (muchas webs muestran precio en la grid)
    const direct = extractProductInfo(searchHtml, store.baseUrl);
    if (direct?.price && (!direct.title || matchScore(q, direct.title) >= MATCH_THRESHOLD)) {
      return {
        status: "ok",
        price: direct.price,
        url: direct.url ?? searchUrl,
        matchedTitle: direct.title,
        inStock: direct.inStock,
      };
    }

    // 2) Seguir el enlace del primer producto si existe
    const firstLink = extractFirstProductLink(searchHtml, store.baseUrl);
    if (firstLink) {
      try {
        const productHtml = await ctx.fetchHtml(firstLink, store.timeoutMs);
        const info = extractProductInfo(productHtml, store.baseUrl);
        if (info?.price) {
          const scoreOk = !info.title || matchScore(q, info.title) >= MATCH_THRESHOLD;
          if (scoreOk) {
            return {
              status: "ok",
              price: info.price,
              url: firstLink,
              matchedTitle: info.title,
              inStock: info.inStock,
            };
          }
        }
      } catch (e) {
        networkFailed = true;
        lastErr = e instanceof Error ? e.message : "product fetch failed";
      }
    }
    // Si llegamos aquí con esta query, probar la siguiente variante.
  }

  // Ningún query funcionó. Distinguir entre "no encontrado" y "bloqueado".
  if (networkFailed) {
    return {
      status: "network_error",
      price: null,
      url: primarySearchUrl,
      errorMessage: lastErr ?? "Red o timeout.",
    };
  }
  return {
    status: "not_found",
    price: null,
    url: lastSearchUrl,
  };
}
