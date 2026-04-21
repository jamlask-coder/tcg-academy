/**
 * Price extractors — funciones puras para parsear HTML y sacar
 * precio + título + URL sin depender de cheerio ni de DOM.
 *
 * Orden de intento en cada adapter:
 *   1) JSON-LD Product schema (Google, Shopify, Shopware, muchas plataformas)
 *   2) Meta tag Open Graph product:price:amount
 *   3) Microdata itemprop="price"
 *   4) Regex sobre patrones CSS comunes (.price, .product-price, data-price)
 *
 * Devolver null en vez de explotar: el caller decide fallback.
 */

/** Convierte "1.234,56 €" / "1,234.56" / "€24.95" / "24,95" → 24.95. */
export function parsePriceString(raw: string | null | undefined): number | null {
  if (!raw) return null;
  // Quitar todo lo que no sea dígito, coma, punto
  const cleaned = raw.replace(/[^\d,.\s]/g, "").trim();
  if (!cleaned) return null;

  // Si hay ambos separadores, el último es el decimal
  const hasDot = cleaned.includes(".");
  const hasComma = cleaned.includes(",");
  let normalized: string;
  if (hasDot && hasComma) {
    const lastDot = cleaned.lastIndexOf(".");
    const lastComma = cleaned.lastIndexOf(",");
    if (lastComma > lastDot) {
      // coma decimal, punto millares → "1.234,56"
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    // solo coma → asumir decimal si exactamente 2 dígitos tras coma
    const m = cleaned.match(/,(\d{1,2})$/);
    normalized = m ? cleaned.replace(/,/, ".") : cleaned.replace(/,/g, "");
  } else {
    normalized = cleaned.replace(/\s/g, "");
  }

  const n = parseFloat(normalized);
  if (!isFinite(n) || n <= 0 || n > 100000) return null;
  return Math.round(n * 100) / 100;
}

export interface ExtractedProductInfo {
  price: number | null;
  title?: string;
  url?: string;
  inStock?: boolean;
}

/** Intenta extraer de JSON-LD Product schema. */
export function extractFromJsonLd(html: string, baseUrl: string): ExtractedProductInfo | null {
  const scripts = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (!scripts) return null;

  for (const block of scripts) {
    const jsonText = block
      .replace(/<script[^>]*>/i, "")
      .replace(/<\/script>/i, "")
      .trim();
    try {
      const parsed = JSON.parse(jsonText);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const products = collectProducts(item);
        for (const product of products) {
          const offer = Array.isArray(product.offers)
            ? product.offers[0]
            : product.offers;
          const priceRaw = offer?.price ?? offer?.priceSpecification?.price ?? product.price;
          const price = parsePriceString(String(priceRaw ?? ""));
          if (!price) continue;
          const url = typeof product.url === "string"
            ? resolveUrl(product.url, baseUrl)
            : undefined;
          const availability = String(offer?.availability ?? "").toLowerCase();
          const inStock = availability
            ? availability.includes("instock") || availability.includes("in_stock")
            : undefined;
          return {
            price,
            title: typeof product.name === "string" ? product.name : undefined,
            url,
            inStock,
          };
        }
      }
    } catch {
      /* no es JSON válido — ignorar bloque */
    }
  }
  return null;
}

function collectProducts(node: unknown): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  if (!node || typeof node !== "object") return out;
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) {
    out.push(obj);
  }
  // @graph (muy común)
  if (Array.isArray(obj["@graph"])) {
    for (const g of obj["@graph"] as unknown[]) {
      out.push(...collectProducts(g));
    }
  }
  return out;
}

/** Meta tags OG product:price:amount. */
export function extractFromMeta(html: string): ExtractedProductInfo | null {
  const price = findMetaContent(html, [
    /name=["']product:price:amount["']/i,
    /property=["']product:price:amount["']/i,
    /property=["']og:price:amount["']/i,
    /name=["']twitter:data1["']/i,
    /name=["']price["']/i,
  ]);
  const n = parsePriceString(price);
  if (!n) return null;
  const title = findMetaContent(html, [/property=["']og:title["']/i]);
  const url = findMetaContent(html, [/property=["']og:url["']/i]);
  return {
    price: n,
    title: title ?? undefined,
    url: url ?? undefined,
  };
}

function findMetaContent(html: string, attrPatterns: RegExp[]): string | null {
  for (const pat of attrPatterns) {
    // Buscar tags <meta ... content="..."> en cualquier orden de atributos
    const re = new RegExp(
      `<meta\\b(?=[^>]*${pat.source})[^>]*content=["']([^"']+)["'][^>]*>|<meta\\b[^>]*content=["']([^"']+)["'][^>]*(?=${pat.source})[^>]*>`,
      "i",
    );
    const m = html.match(re);
    if (m) return m[1] ?? m[2] ?? null;
  }
  return null;
}

/** Última línea de defensa: regex sobre patrones HTML frecuentes. */
export function extractFromHtmlRegex(html: string): ExtractedProductInfo | null {
  const patterns: RegExp[] = [
    /<[^>]+itemprop=["']price["'][^>]*content=["']([^"']+)["']/i,
    /<[^>]+itemprop=["']price["'][^>]*>([^<]+)</i,
    /<[^>]+class=["'][^"']*\b(?:product-price|price-current|current-price|sale-price|price-value|product__price|price)\b[^"']*["'][^>]*>([\s\S]{0,120}?)</i,
    /<[^>]+data-price(?:-amount)?=["']([^"']+)["']/i,
    /"price"\s*:\s*"?([\d.,]+)"?/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) {
      const n = parsePriceString(m[1]);
      if (n) return { price: n };
    }
  }
  return null;
}

/**
 * Combinador: intenta todas las estrategias en orden y devuelve el primer
 * éxito. Útil para páginas de producto individuales; para páginas de
 * resultados de búsqueda hay que localizar primero el enlace del producto.
 */
export function extractProductInfo(html: string, baseUrl: string): ExtractedProductInfo | null {
  return (
    extractFromJsonLd(html, baseUrl) ??
    extractFromMeta(html) ??
    extractFromHtmlRegex(html)
  );
}

/**
 * Extrae el primer enlace de producto de una página de resultados de búsqueda.
 * Intenta primero JSON-LD ItemList, luego patrones de anchor comunes.
 */
export function extractFirstProductLink(html: string, baseUrl: string): string | null {
  // JSON-LD ItemList con productos
  const ldMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (ldMatch) {
    try {
      const parsed = JSON.parse(ldMatch[1]);
      const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          if (obj["@type"] === "ItemList" && Array.isArray(obj.itemListElement)) {
            const first = obj.itemListElement[0];
            if (first && typeof first === "object") {
              const url = (first as Record<string, unknown>).url
                ?? ((first as Record<string, unknown>).item as Record<string, unknown> | undefined)?.url;
              if (typeof url === "string") return resolveUrl(url, baseUrl);
            }
          }
        }
      }
    } catch { /* ignore */ }
  }

  // Anchor patterns — priorizar clases de producto
  const anchorPatterns: RegExp[] = [
    /<a[^>]+class=["'][^"']*\b(?:product-item-link|product-link|card__link|product__link|product-name)\b[^"']*["'][^>]*href=["']([^"']+)["']/i,
    /<a[^>]+href=["']([^"']+)["'][^>]*class=["'][^"']*\b(?:product-item-link|product-link|card__link|product__link|product-name)\b[^"']*["']/i,
    // Shopify / OpenCart frecuentes
    /<a[^>]+href=["'](\/products\/[^"']+)["']/i,
    /<a[^>]+href=["'](\/[^"']*product[^"']*)["']/i,
  ];
  for (const re of anchorPatterns) {
    const m = html.match(re);
    if (m && m[1]) return resolveUrl(m[1], baseUrl);
  }
  return null;
}

export function resolveUrl(href: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href.startsWith("/") ? baseUrl.replace(/\/$/, "") + href : href;
  }
}

// ─── Multi-candidate SERP extraction ─────────────────────────────────────────

/**
 * Un candidato extraído de una página de resultados de búsqueda: título,
 * precio (si visible en SERP), URL del producto e imagen (para comparación
 * perceptual). Los scrapers extraen hasta N=10 y dejan que el orquestador
 * puntúe y elija el mejor match.
 */
export interface SearchCandidate {
  /** URL directa al producto. */
  url: string;
  /** Título limpio (alt de la imagen, nombre del link, H tags). */
  title?: string;
  /** Precio si aparece en la tarjeta de producto de la SERP. */
  price?: number;
  /** URL de la imagen del producto (para dHash). */
  imageUrl?: string;
  /** Texto ALT de la imagen — otra pista útil para idioma y match. */
  altText?: string;
  /** Snippet arbitrario cerca del link (puede contener idioma, edición). */
  nearbyText?: string;
}

const MAX_CANDIDATES = 10;

/**
 * Extrae hasta 10 candidatos de producto de una página de resultados.
 * Busca bloques <article|li|div class="...product..."> o <a href="...product...">
 * y dentro saca título, imagen y precio si están presentes.
 */
export function extractSearchCandidates(
  html: string,
  baseUrl: string,
): SearchCandidate[] {
  const seenUrls = new Set<string>();
  const candidates: SearchCandidate[] = [];

  const push = (c: SearchCandidate) => {
    if (!c.url || seenUrls.has(c.url)) return;
    if (candidates.length >= MAX_CANDIDATES) return;
    seenUrls.add(c.url);
    candidates.push(c);
  };

  // 1) JSON-LD ItemList (Shopify y algunos WooCommerce lo emiten)
  const ldBlocks = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (ldBlocks) {
    for (const block of ldBlocks) {
      const jsonText = block
        .replace(/<script[^>]*>/i, "")
        .replace(/<\/script>/i, "")
        .trim();
      try {
        const parsed = JSON.parse(jsonText);
        const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          const obj = item as Record<string, unknown>;
          if (obj["@type"] === "ItemList" && Array.isArray(obj.itemListElement)) {
            for (const el of obj.itemListElement) {
              if (!el || typeof el !== "object") continue;
              const inner = (el as Record<string, unknown>).item ?? el;
              if (!inner || typeof inner !== "object") continue;
              const o = inner as Record<string, unknown>;
              const url = typeof o.url === "string" ? resolveUrl(o.url, baseUrl) : undefined;
              if (!url) continue;
              const title = typeof o.name === "string" ? o.name : undefined;
              const image = typeof o.image === "string"
                ? resolveUrl(o.image, baseUrl)
                : Array.isArray(o.image) && typeof o.image[0] === "string"
                  ? resolveUrl(String(o.image[0]), baseUrl)
                  : undefined;
              const offers = o.offers;
              const offer = Array.isArray(offers) ? offers[0] : offers;
              const priceRaw =
                (offer as Record<string, unknown> | undefined)?.price ??
                (offer as Record<string, unknown> | undefined)?.priceSpecification;
              const price = typeof priceRaw === "string" || typeof priceRaw === "number"
                ? parsePriceString(String(priceRaw))
                : null;
              push({ url, title, imageUrl: image, price: price ?? undefined });
            }
          }
        }
      } catch {
        /* ignore */
      }
    }
  }

  // 2) Bloques HTML con "product" en clase
  // Busca contenedores típicos y extrae link, img y precio cercano.
  const blockRe =
    /<(article|li|div)[^>]*class=["'][^"']*\b(?:product[-_]?item|product[-_]?card|product[-_]?tile|product[-_]?box|grid[-_]?item|item|card)\b[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  let safety = 0;
  while ((m = blockRe.exec(html)) && safety < 40 && candidates.length < MAX_CANDIDATES) {
    safety++;
    const block = m[2];
    const c = candidateFromBlock(block, baseUrl);
    if (c) push(c);
  }

  // 3) Fallback: anchors directos con href que contiene "product" o "/p/" o "/prod"
  if (candidates.length === 0) {
    const anchorRe =
      /<a[^>]+href=["']([^"']*(?:\/product|\/products\/|\/p\/|\/prod-|\/producto)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let a: RegExpExecArray | null;
    let loop = 0;
    while ((a = anchorRe.exec(html)) && loop < 30 && candidates.length < MAX_CANDIDATES) {
      loop++;
      const href = a[1];
      const inner = a[2];
      if (/\/cart|\/checkout|\/login|\/account/i.test(href)) continue;
      const url = resolveUrl(href, baseUrl);
      const imgMatch = inner.match(/<img[^>]+(?:src|data-src|data-lazy-src)=["']([^"']+)["'][^>]*(?:\salt=["']([^"']*)["'])?/i);
      const altMatch = inner.match(/\salt=["']([^"']+)["']/i);
      const titleText = stripTags(inner).slice(0, 160).trim();
      push({
        url,
        title: altMatch?.[1] ?? titleText ?? undefined,
        imageUrl: imgMatch ? resolveUrl(imgMatch[1], baseUrl) : undefined,
        altText: imgMatch?.[2] ?? altMatch?.[1] ?? undefined,
      });
    }
  }

  return candidates;
}

function candidateFromBlock(block: string, baseUrl: string): SearchCandidate | null {
  const hrefMatch = block.match(/<a[^>]+href=["']([^"']+)["']/i);
  if (!hrefMatch) return null;
  const href = hrefMatch[1];
  if (/^#|^javascript:|^mailto:/i.test(href)) return null;
  if (/\/cart|\/checkout|\/login|\/account|\/wishlist/i.test(href)) return null;
  const url = resolveUrl(href, baseUrl);

  // Imagen: src, data-src o srcset (primer elemento)
  const imgMatch = block.match(
    /<img[^>]+(?:src|data-src|data-lazy-src|data-original)=["']([^"']+)["'][^>]*>/i,
  );
  const srcsetMatch = block.match(/<img[^>]+srcset=["']([^"',\s]+)/i);
  const imageUrl = imgMatch
    ? resolveUrl(imgMatch[1], baseUrl)
    : srcsetMatch
      ? resolveUrl(srcsetMatch[1], baseUrl)
      : undefined;
  const altMatch = block.match(/<img[^>]+alt=["']([^"']+)["']/i);

  // Título: h1..h4, .product-name, .name, .title, o alt
  const titleMatch =
    block.match(
      /<(?:h[1-4]|[a-z]+)[^>]*class=["'][^"']*\b(?:product[-_]?name|product[-_]?title|product__title|name|title)\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:h[1-4]|[a-z]+)>/i,
    ) ?? block.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i);
  const title = titleMatch
    ? stripTags(titleMatch[1]).trim()
    : altMatch?.[1]?.trim();

  // Precio: itemprop, clase price, data-price
  const priceMatch =
    block.match(/<[^>]+itemprop=["']price["'][^>]*content=["']([^"']+)["']/i) ??
    block.match(
      /<[^>]+class=["'][^"']*\b(?:price|product[-_]?price|money)\b[^"']*["'][^>]*>([\s\S]{0,80}?)</i,
    ) ??
    block.match(/<[^>]+data-price(?:-amount)?=["']([^"']+)["']/i);
  const price = priceMatch ? parsePriceString(priceMatch[1]) ?? undefined : undefined;

  return {
    url,
    title,
    imageUrl,
    altText: altMatch?.[1],
    price,
    nearbyText: stripTags(block).slice(0, 280).trim() || undefined,
  };
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
