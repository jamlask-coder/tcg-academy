/**
 * Búsqueda inversa por imagen — HOOK para Phase 2.
 *
 * Motivación: cuando el nombre del producto no coincide exactamente entre
 * tiendas (p.ej. nuestro "Aetherdrift Draft Booster Display" vs el rival
 * "MTG Caja 36 Sobres Aetherdrift"), una búsqueda de texto falla pero la
 * IMAGEN del producto es estable entre distribuidores (la foto original
 * del fabricante es la misma).
 *
 * Proveedores realistas (requieren API key de pago):
 *  - Google Cloud Vision API (Web Detection)        → `pagesWithMatchingImages`
 *  - Bing Visual Search / Azure Cognitive Services
 *  - TinEye API
 *  - SerpApi (Google Lens wrapper)
 *
 * Ninguno es gratuito, así que este archivo queda como STUB: el API route
 * lo llama, detecta que no hay credenciales, y devuelve null para que se
 * use el fallback de búsqueda por nombre. El día que el usuario decida
 * activarlo, sólo hay que rellenar `SEARCH_BY_IMAGE_PROVIDER` y cablear
 * la lógica real aquí.
 *
 * Para activarlo:
 *  1. Añadir en `.env.local`:
 *       IMAGE_SEARCH_PROVIDER=google          # google | bing | serpapi | tineye
 *       IMAGE_SEARCH_API_KEY=xxxx
 *  2. Implementar la rama correspondiente en `searchByImage()`.
 *  3. Enriquecer el adapter para aceptar una URL específica (findProductByExactUrl).
 */

import { listEnabledCompetitorStores } from "@/config/competitorStores";

export interface ImageSearchResult {
  /** URL donde está la imagen (página de producto). */
  pageUrl: string;
  /** Dominio de la página — usado para matchear con nuestras tiendas. */
  domain: string;
  /** Score de similitud (0..1), si el proveedor lo expone. */
  score?: number;
}

export interface ImageSearchOptions {
  /**
   * URL pública de la imagen de nuestro producto.
   *
   * REGLA: siempre usar la PRIMERA imagen listada del producto (`images[0]`).
   * Las imágenes secundarias suelen ser ángulos/backs/cut-outs que reducen
   * la calidad del match. El caller es responsable de pasar `images[0]` y
   * NO componer o concatenar múltiples imágenes.
   */
  imageUrl: string;
  /** Si true, filtra resultados a dominios de nuestras tiendas registradas. */
  restrictToKnownStores?: boolean;
}

/**
 * Phase 2: devuelve páginas donde aparece la misma imagen.
 * Hoy: no-op → devuelve array vacío (el fallback es buscar por nombre).
 *
 * Cuando se active: el orquestador del API route usará estos URLs para
 * golpear directamente la página de producto (saltándose la búsqueda por
 * texto) y extraer el precio con `extractProductInfo()`.
 */
export async function searchByImage(opts: ImageSearchOptions): Promise<ImageSearchResult[]> {
  const provider = process.env.IMAGE_SEARCH_PROVIDER;
  const apiKey = process.env.IMAGE_SEARCH_API_KEY;
  if (!provider || !apiKey) {
    return [];
  }

  // TODO Phase 2: implementar rama por proveedor
  switch (provider) {
    case "google":
      return googleWebDetection(opts, apiKey);
    case "bing":
    case "serpapi":
    case "tineye":
    default:
      // eslint-disable-next-line no-console
      console.warn(`[imageSearch] provider "${provider}" no implementado — usando fallback nombre.`);
      return [];
  }
}

/**
 * Stub de Google Vision Web Detection.
 * Endpoint: POST https://vision.googleapis.com/v1/images:annotate?key=APIKEY
 * Body: { requests: [{ image: { source: { imageUri } }, features: [{ type: "WEB_DETECTION" }] }] }
 * Response: `webDetection.pagesWithMatchingImages[]`
 */
async function googleWebDetection(
  opts: ImageSearchOptions,
  _apiKey: string,
): Promise<ImageSearchResult[]> {
  // Placeholder — rellenar cuando se active el provider.
  // Devolver los dominios de nuestras tiendas es más útil que array vacío
  // para cuando queramos probar el flujo end-to-end con mocks.
  void opts;
  void _apiKey;
  return [];
}

/** Helper: ¿este dominio pertenece a una de nuestras tiendas configuradas? */
export function isKnownCompetitorDomain(domain: string): boolean {
  const known = listEnabledCompetitorStores().map((s) => s.domain.toLowerCase());
  const d = domain.toLowerCase().replace(/^www\./, "");
  return known.some((k) => d === k || d.endsWith(`.${k}`));
}
