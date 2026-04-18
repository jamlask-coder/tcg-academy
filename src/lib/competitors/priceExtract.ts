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
