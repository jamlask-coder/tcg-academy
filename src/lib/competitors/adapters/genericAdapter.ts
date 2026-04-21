/**
 * Generic adapter — flujo multi-señal para encontrar el match correcto.
 *
 * 1) GET URL de búsqueda con la query principal.
 * 2) Extrae hasta 10 candidatos de la SERP (título, precio, url, imagen).
 * 3) Para cada candidato:
 *    - Calcula nameScore (tokens compartidos con la query)
 *    - Calcula languageScore (idioma del producto vs. texto del candidato)
 *    - Descarga la imagen y computa dHash → imageScore
 * 4) Combina con pesos (nombre 35% · idioma 25% · imagen 40%) y elige el
 *    candidato con mejor score ≥ 0.50. Idioma contradictorio → veto.
 * 5) Si el mejor candidato no tiene precio en la SERP → GET su detalle.
 * 6) Si ningún candidato supera el umbral → not_found.
 */

import {
  extractFirstProductLink,
  extractProductInfo,
  extractSearchCandidates,
  type SearchCandidate,
} from "@/lib/competitors/priceExtract";
import { matchScore } from "@/lib/competitors/nameNormalize";
import {
  combinedScore,
  imageUrlTokenScore,
  languageScore,
} from "@/lib/competitors/scoring";
import { dhashFromUrl, imageSimilarity } from "@/lib/competitors/imageHash";
import type { AdapterContext, AdapterResult } from "./types";
import type { CompetitorStoreConfig } from "@/config/competitorStores";
import type { NormalizedName } from "@/lib/competitors/nameNormalize";

/** Umbral mínimo del score combinado para aceptar el match. */
const MATCH_THRESHOLD = 0.5;
/** Límite de imágenes remotas a descargar por búsqueda (protección). */
const MAX_IMAGES_PER_SEARCH = 8;

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

    // Extraer múltiples candidatos con imagen y título.
    const candidates = extractSearchCandidates(searchHtml, store.baseUrl);

    if (candidates.length > 0) {
      const best = await pickBestCandidate(candidates, q, ctx);
      if (best && best.combined.score >= MATCH_THRESHOLD) {
        // Si el candidato de la SERP ya trae precio, úsalo.
        if (best.candidate.price) {
          return {
            status: "ok",
            price: best.candidate.price,
            url: best.candidate.url,
            matchedTitle: best.candidate.title ?? best.candidate.altText,
            confidence: best.combined.score,
          };
        }
        // Si no, entra al detalle.
        try {
          const detailHtml = await ctx.fetchHtml(best.candidate.url, store.timeoutMs);
          const info = extractProductInfo(detailHtml, store.baseUrl);
          if (info?.price) {
            return {
              status: "ok",
              price: info.price,
              url: best.candidate.url,
              matchedTitle: info.title ?? best.candidate.title ?? best.candidate.altText,
              inStock: info.inStock,
              confidence: best.combined.score,
            };
          }
        } catch (e) {
          networkFailed = true;
          lastErr = e instanceof Error ? e.message : "detail fetch failed";
        }
      }
    }

    // Fallback clásico: primer enlace de producto + match textual suave.
    const directOnSerp = extractProductInfo(searchHtml, store.baseUrl);
    if (directOnSerp?.price) {
      const titleOk = !directOnSerp.title || matchScore(q, directOnSerp.title) >= 0.35;
      const langOk = languageScoreForCandidate(directOnSerp.title ?? "", directOnSerp.url ?? "", ctx) >= 0;
      if (titleOk && langOk) {
        return {
          status: "ok",
          price: directOnSerp.price,
          url: directOnSerp.url ?? searchUrl,
          matchedTitle: directOnSerp.title,
          inStock: directOnSerp.inStock,
        };
      }
    }

    const firstLink = extractFirstProductLink(searchHtml, store.baseUrl);
    if (firstLink) {
      try {
        const productHtml = await ctx.fetchHtml(firstLink, store.timeoutMs);
        const info = extractProductInfo(productHtml, store.baseUrl);
        if (info?.price) {
          const titleOk = !info.title || matchScore(q, info.title) >= 0.4;
          const langOk = languageScoreForCandidate(info.title ?? "", firstLink, ctx) >= 0;
          if (titleOk && langOk) {
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
  }

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

// ─── Scoring helpers ─────────────────────────────────────────────────────────

interface ScoredCandidate {
  candidate: SearchCandidate;
  combined: ReturnType<typeof combinedScore>;
}

/**
 * Puntúa todos los candidatos y devuelve el mejor.
 * - Descarga hasta MAX_IMAGES_PER_SEARCH imágenes (en paralelo) para dHash.
 * - El resto cae a comparación por filename de imagen (señal débil).
 */
async function pickBestCandidate(
  candidates: SearchCandidate[],
  query: string,
  ctx: AdapterContext,
): Promise<ScoredCandidate | null> {
  const ourHash = ctx.productImageHash ?? null;

  // Prepara hashes en paralelo sólo para los N primeros candidatos.
  const toHash = candidates.slice(0, MAX_IMAGES_PER_SEARCH);
  const hashes = ourHash
    ? await Promise.all(
        toHash.map((c) => (c.imageUrl ? dhashFromUrl(c.imageUrl) : Promise.resolve(null))),
      )
    : toHash.map(() => null);

  const scored: ScoredCandidate[] = candidates.map((c, i) => {
    const hay = [c.title, c.altText, c.url, c.nearbyText].filter(Boolean).join(" ");
    const name = matchScore(query, hay);
    const language = ctx.productLanguage
      ? languageScore(ctx.productLanguage, hay)
      : 0;
    let image: number | undefined;
    const remoteHash = hashes[i] ?? null;
    if (ourHash && remoteHash) {
      image = imageSimilarity(ourHash, remoteHash);
    } else if (ctx.productImageUrl && c.imageUrl) {
      // Señal débil cuando no hay dos hashes: tokens del filename.
      const tok = imageUrlTokenScore(ctx.productImageUrl, c.imageUrl);
      // Sólo contar si supera algo; evitar ruido.
      if (tok >= 0.25) image = tok;
    }
    const combined = combinedScore({ name, language, image });
    return { candidate: c, combined };
  });

  scored.sort((a, b) => b.combined.score - a.combined.score);
  return scored[0] ?? null;
}

function languageScoreForCandidate(
  title: string,
  url: string,
  ctx: AdapterContext,
): number {
  if (!ctx.productLanguage) return 0;
  return languageScore(ctx.productLanguage, `${title} ${url}`);
}
