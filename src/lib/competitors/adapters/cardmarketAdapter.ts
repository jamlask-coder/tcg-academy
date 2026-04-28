/**
 * Adapter dedicado Cardmarket.
 *
 * Cardmarket es un MERCADO (agregador): cada producto agrupa ofertas de
 * decenas de vendedores. El precio relevante para nosotros como tienda es el
 * "From X,XX €" que muestra Cardmarket en la cabecera del producto — es la
 * oferta más baja entre TODOS los vendedores disponibles.
 *
 * En productos sellados (booster boxes, ETBs, etc., que es lo que vendemos)
 * el "From" coincide en la práctica con el precio profesional más bajo,
 * porque la mayoría de listings sellados los publican sellers profesionales
 * (los privados vacían la cuenta cuando abren el producto).
 *
 * Por qué un adapter dedicado y no el `genericSearch`:
 *   - La SERP de Cardmarket NO emite JSON-LD ni metadata `og:price`.
 *   - El precio del producto no está como `.price` clásico, sino como un
 *     `<dd>` dentro de un `<dl>` con label "From" / "Trend" / "Avg. 30 days".
 *   - El listing usa enlaces `/es/<Game>/Products/<Category>/<Slug>` que el
 *     `genericSearch` no detecta como producto.
 *
 * El flujo:
 *   1) GET search URL  → extrae filas del listing con link + img + título.
 *   2) dHash de imágenes contra la nuestra → elige la mejor.
 *   3) GET detail URL del ganador → parsea "From X,XX €".
 *   4) Si todo falla, intenta fallback al primer enlace de producto del SERP.
 *
 * Limitación conocida: si Cardmarket cambia el markup del bloque "From",
 * el adapter devolverá `not_found` (status seguro). No bloqueamos la web
 * ni reintentamos — el usuario verá "—" en la celda y es señal de revisar.
 */

import { matchScore } from "@/lib/competitors/nameNormalize";
import {
  combinedScore,
  imageUrlTokenScore,
  languageScore,
} from "@/lib/competitors/scoring";
import { dhashFromUrl, imageSimilarity } from "@/lib/competitors/imageHash";
import { parsePriceString, resolveUrl } from "@/lib/competitors/priceExtract";
import type {
  AdapterContext,
  AdapterResult,
  StoreAdapter,
} from "./types";
import type { NormalizedName } from "@/lib/competitors/nameNormalize";

const CM_BASE = "https://www.cardmarket.com";
const TIMEOUT_MS = 10_000;
const MATCH_THRESHOLD = 0.5;
const MAX_CANDIDATES = 10;

interface CmCandidate {
  url: string;
  title?: string;
  imageUrl?: string;
  // Cardmarket frecuentemente muestra un "From X,XX €" ya en la SERP.
  // Si lo encontramos, evitamos un GET extra al detalle.
  serpPrice?: number;
}

/**
 * Extrae candidatos del HTML de la SERP de Cardmarket.
 *
 * Cardmarket renderiza cada producto en un bloque con:
 *   <div class="row no-gutters align-items-center" data-name="..."> ...
 *     <a href="/es/Magic/Products/...">
 *     <img src="..." alt="...">
 *     ...
 *     <span class="...">From <span>X,XX €</span></span>
 *
 * El markup cambia ligeramente entre catálogos (singles vs sealed) — usamos
 * regex tolerantes y sólo aceptamos enlaces que contengan `/Products/`.
 */
function extractCardmarketCandidates(html: string): CmCandidate[] {
  const seen = new Set<string>();
  const out: CmCandidate[] = [];

  // 1) Bloques con "row" y un link a /Products/ — patrón más fiable.
  const rowRe =
    /<(?:div|tr)[^>]*class=["'][^"']*\brow\b[^"']*["'][^>]*>([\s\S]{0,4000}?)<\/(?:div|tr)>/gi;
  let m: RegExpExecArray | null;
  let safety = 0;
  while ((m = rowRe.exec(html)) && safety < 80 && out.length < MAX_CANDIDATES) {
    safety++;
    const block = m[1];
    const linkMatch = block.match(
      /<a[^>]+href=["'](\/[^"']*\/Products\/[^"']+)["'][^>]*>/i,
    );
    if (!linkMatch) continue;
    const url = resolveUrl(linkMatch[1], CM_BASE);
    if (seen.has(url)) continue;
    seen.add(url);

    const imgMatch = block.match(
      /<img[^>]+(?:src|data-src|data-original)=["']([^"']+)["'][^>]*>/i,
    );
    const altMatch = block.match(/<img[^>]+alt=["']([^"']+)["']/i);
    const titleMatch =
      block.match(
        /<a[^>]*href=["'][^"']*\/Products\/[^"']*["'][^>]*>\s*([^<]{3,160})\s*</i,
      ) ?? null;

    // Precio "From" inline en el listing — si está, lo aprovechamos.
    const priceMatch = block.match(
      /from\s*[^<]*<[^>]*>\s*([0-9][0-9.,\s]*€)/i,
    ) ?? block.match(/([0-9]+[.,][0-9]{2})\s*€/);
    const serpPrice = priceMatch
      ? parsePriceString(priceMatch[1]) ?? undefined
      : undefined;

    out.push({
      url,
      title: titleMatch?.[1]?.trim() ?? altMatch?.[1] ?? undefined,
      imageUrl: imgMatch ? resolveUrl(imgMatch[1], CM_BASE) : undefined,
      serpPrice,
    });
  }

  // 2) Fallback: simplemente cualquier <a href> a /Products/ con su img cercana.
  if (out.length === 0) {
    const linkRe =
      /<a[^>]+href=["'](\/[^"']*\/Products\/[^"']+)["'][^>]*>([\s\S]{0,1200}?)<\/a>/gi;
    let a: RegExpExecArray | null;
    let loop = 0;
    while ((a = linkRe.exec(html)) && loop < 30 && out.length < MAX_CANDIDATES) {
      loop++;
      const url = resolveUrl(a[1], CM_BASE);
      if (seen.has(url)) continue;
      seen.add(url);
      const inner = a[2];
      const imgMatch = inner.match(
        /<img[^>]+(?:src|data-src)=["']([^"']+)["']/i,
      );
      const altMatch = inner.match(/<img[^>]+alt=["']([^"']+)["']/i);
      const text = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      out.push({
        url,
        title: altMatch?.[1] ?? text.slice(0, 160) ?? undefined,
        imageUrl: imgMatch ? resolveUrl(imgMatch[1], CM_BASE) : undefined,
      });
    }
  }

  return out;
}

/**
 * Extrae el precio "From X,XX €" de la página de detalle de un producto en
 * Cardmarket. Busca varios patrones que el sitio usa según el catálogo.
 */
function extractCardmarketDetailPrice(html: string): {
  price: number | null;
  title?: string;
} {
  // 1) Bloque "From" en el `info-list` del header.
  // Patrón típico:
  //   <dt>From</dt>
  //   <dd>X,XX €</dd>
  let mm = html.match(
    /<dt[^>]*>\s*(?:From|Desde|Disponible\s+desde)\s*<\/dt>\s*<dd[^>]*>\s*([^<]+?)\s*<\/dd>/i,
  );
  if (mm) {
    const price = parsePriceString(mm[1]);
    if (price) return { price, title: extractDetailTitle(html) };
  }

  // 2) "Available from X,XX €" en una sola línea.
  mm = html.match(/(?:Available\s+from|Disponible\s+desde)[^0-9]*([0-9][0-9.,\s]*€)/i);
  if (mm) {
    const price = parsePriceString(mm[1]);
    if (price) return { price, title: extractDetailTitle(html) };
  }

  // 3) Tabla de artículos: primera fila de seller con price-container.
  //    <span class="...color-primary fw-bold...">X,XX €</span>
  mm = html.match(
    /<span[^>]*class=["'][^"']*\b(?:color-primary|fw-bold|font-weight-bold|price-container)\b[^"']*["'][^>]*>\s*([0-9][0-9.,\s]*€)/i,
  );
  if (mm) {
    const price = parsePriceString(mm[1]);
    if (price) return { price, title: extractDetailTitle(html) };
  }

  return { price: null, title: extractDetailTitle(html) };
}

function extractDetailTitle(html: string): string | undefined {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (m) {
    const cleaned = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (cleaned) return cleaned.slice(0, 200);
  }
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og) return og[1];
  return undefined;
}

interface ScoredCm {
  cand: CmCandidate;
  combined: ReturnType<typeof combinedScore>;
}

async function pickBest(
  candidates: CmCandidate[],
  query: string,
  ctx: AdapterContext,
): Promise<ScoredCm | null> {
  const ourHash = ctx.productImageHash ?? null;
  const slice = candidates.slice(0, 10);
  const hashes = ourHash
    ? await Promise.all(
        slice.map((c) => (c.imageUrl ? dhashFromUrl(c.imageUrl) : Promise.resolve(null))),
      )
    : slice.map(() => null);

  const scored: ScoredCm[] = candidates.map((c, i) => {
    const hay = [c.title, c.url].filter(Boolean).join(" ");
    const name = matchScore(query, hay);
    const language = ctx.productLanguage
      ? languageScore(ctx.productLanguage, hay)
      : 0;
    let image: number | undefined;
    const remoteHash = hashes[i] ?? null;
    if (ourHash && remoteHash) {
      image = imageSimilarity(ourHash, remoteHash);
    } else if (ctx.productImageUrl && c.imageUrl) {
      const tok = imageUrlTokenScore(ctx.productImageUrl, c.imageUrl);
      if (tok >= 0.25) image = tok;
    }
    const combined = combinedScore({ name, language, image });
    return { cand: c, combined };
  });

  scored.sort((a, b) => b.combined.score - a.combined.score);
  return scored[0] ?? null;
}

export async function cardmarketSearch(
  query: NormalizedName,
  ctx: AdapterContext,
  buildSearchUrl: (q: string) => string,
): Promise<AdapterResult> {
  const queries = [query.primary, ...query.variants].filter(Boolean);
  const primaryUrl = buildSearchUrl(query.primary);
  let lastUrl = primaryUrl;
  let networkFailed = false;
  let lastErr: string | undefined;

  for (const q of queries) {
    const url = buildSearchUrl(q);
    lastUrl = url;

    let html: string;
    try {
      html = await ctx.fetchHtml(url, TIMEOUT_MS);
    } catch (e) {
      networkFailed = true;
      lastErr = e instanceof Error ? e.message : "fetch failed";
      continue;
    }

    const candidates = extractCardmarketCandidates(html);
    if (candidates.length === 0) continue;

    const best = await pickBest(candidates, q, ctx);
    if (!best || best.combined.score < MATCH_THRESHOLD) continue;

    // ¿Tenemos precio "From" ya en la SERP?
    if (best.cand.serpPrice && best.cand.serpPrice > 0) {
      return {
        status: "ok",
        price: best.cand.serpPrice,
        url: best.cand.url,
        matchedTitle: best.cand.title,
        confidence: best.combined.score,
      };
    }

    // Si no, vamos a la página de detalle.
    try {
      const detailHtml = await ctx.fetchHtml(best.cand.url, TIMEOUT_MS);
      const info = extractCardmarketDetailPrice(detailHtml);
      if (info.price) {
        return {
          status: "ok",
          price: info.price,
          url: best.cand.url,
          matchedTitle: info.title ?? best.cand.title,
          confidence: best.combined.score,
        };
      }
    } catch (e) {
      networkFailed = true;
      lastErr = e instanceof Error ? e.message : "detail fetch failed";
    }
  }

  if (networkFailed) {
    return {
      status: "network_error",
      price: null,
      url: primaryUrl,
      errorMessage: lastErr ?? "Red o timeout.",
    };
  }
  return {
    status: "not_found",
    price: null,
    url: lastUrl,
  };
}

/** Adapter listo para registrar. Acepta una closure con la URL de búsqueda. */
export function buildCardmarketAdapter(
  buildSearchUrl: (q: string, productGame?: string) => string,
): StoreAdapter {
  return {
    id: "cardmarket",
    search: (query, ctx) =>
      cardmarketSearch(query, ctx, (q) => buildSearchUrl(q, ctx.productGame)),
  };
}
