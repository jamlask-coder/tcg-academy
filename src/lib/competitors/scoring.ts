/**
 * Multi-signal scoring para elegir el mejor candidato de la SERP.
 *
 * Señales:
 *   1) Nombre — tokens compartidos con la query normalizada (0..1).
 *   2) Idioma — si el título/URL/alt remoto menciona el idioma de nuestro
 *      producto, +1; si menciona uno distinto con fuerza, -1 (descarta).
 *   3) Imagen — similitud dHash (computada aguas arriba), 0..1.
 *
 * Peso por defecto: nombre 35%, idioma 25%, imagen 40%. La imagen pesa más
 * porque cuando acierta es muy fiable; cuando no hay imagen disponible se
 * re-normaliza con nombre+idioma.
 */

export type ProductLanguage =
  | "EN"
  | "ES"
  | "JP"
  | "FR"
  | "DE"
  | "IT"
  | "KO"
  | "PT"
  | "ZH";

/** Tokens que delatan cada idioma en título/url/alt remoto (minúsculas). */
const LANG_TOKENS: Record<ProductLanguage, string[]> = {
  ES: ["español", "espanol", "spanish", "castellano", "(es)", "[es]", "/es/", "-es-", "esp ", " esp", "esp."],
  EN: ["english", "inglés", "ingles", "(en)", "[en]", "/en/", "-en-", "eng "],
  IT: ["italiano", "italian", "(it)", "[it]", "/it/", "-it-", "ita "],
  FR: ["français", "francais", "french", "(fr)", "[fr]", "/fr/", "-fr-", "fra "],
  DE: ["deutsch", "german", "alemán", "aleman", "(de)", "[de]", "/de/", "-de-", "ger "],
  PT: ["português", "portugues", "portuguese", "(pt)", "[pt]", "/pt/", "-pt-", "por "],
  JP: ["japanese", "japonés", "japones", "日本語", "(jp)", "[jp]", "/jp/", "-jp-", "jpn "],
  KO: ["korean", "coreano", "한국어", "(kr)", "(ko)", "/ko/", "/kr/", "-ko-"],
  ZH: ["chinese", "chino", "中文", "(cn)", "(zh)", "/zh/", "/cn/", "-cn-"],
};

/**
 * Puntúa el idioma: 1.0 si el texto contiene tokens del idioma objetivo,
 * -1.0 si contiene tokens claros de OTRO idioma, 0 si es neutro.
 * -1 se usa como veto: el orquestador puede exigir score >=0.
 */
export function languageScore(
  expected: ProductLanguage | undefined,
  haystack: string,
): number {
  if (!expected) return 0;
  const h = haystack.toLowerCase();

  const expectedTokens = LANG_TOKENS[expected] ?? [];
  const matchedExpected = expectedTokens.some((t) => h.includes(t));
  if (matchedExpected) return 1;

  let foreignMatch = false;
  for (const [lang, tokens] of Object.entries(LANG_TOKENS)) {
    if (lang === expected) continue;
    if (tokens.some((t) => h.includes(t))) {
      foreignMatch = true;
      break;
    }
  }
  if (foreignMatch) return -1;
  return 0;
}

/** Combinador con re-normalización si falta la señal de imagen. */
export interface CombinedInput {
  /** 0..1 */
  name: number;
  /** -1..1 */
  language: number;
  /** 0..1 o undefined si no tenemos dos hashes comparables. */
  image: number | undefined;
}

export interface CombinedBreakdown {
  score: number;
  name: number;
  language: number;
  image: number | null;
  rejectedByLanguage: boolean;
}

/**
 * Score combinado 0..1 aproximado. Veto por idioma devuelve 0.
 *  - Con imagen:    0.20*name + 0.20*langPos + 0.60*image
 *  - Sin imagen:    0.60*name + 0.40*langPos
 *  - Bypass:        si image ≥ 0.85 (dHash casi idéntico) y no hay veto de
 *                   idioma → devolvemos image directamente. Razón:
 *                   nombres de productos varían mucho entre tiendas
 *                   ("Booster Box" vs "Caja de sobres" vs "Display"), pero
 *                   la foto del fabricante es prácticamente la misma. Si dos
 *                   imágenes coinciden a nivel perceptual, es el mismo SKU.
 *
 * langPos mapea [-1,1] → [0,1].
 */
export function combinedScore(input: CombinedInput): CombinedBreakdown {
  const rejectedByLanguage = input.language <= -1;
  if (rejectedByLanguage) {
    return { score: 0, name: input.name, language: input.language, image: input.image ?? null, rejectedByLanguage: true };
  }
  const langPos = (Math.max(-1, Math.min(1, input.language)) + 1) / 2; // 0..1
  let score: number;
  if (input.image === undefined) {
    score = 0.6 * input.name + 0.4 * langPos;
  } else if (input.image >= 0.85) {
    // Bypass: dos imágenes casi idénticas son el mismo producto.
    score = input.image;
  } else {
    score = 0.2 * input.name + 0.2 * langPos + 0.6 * input.image;
  }
  return {
    score: Math.max(0, Math.min(1, score)),
    name: input.name,
    language: input.language,
    image: input.image ?? null,
    rejectedByLanguage: false,
  };
}

/**
 * Extensión: tokens de filename compartidos entre nuestra imagen y la del
 * candidato. Señal débil — sólo se usa cuando no hay dHash disponible.
 */
export function imageUrlTokenScore(a: string | undefined, b: string | undefined): number {
  if (!a || !b) return 0;
  const ta = tokensFromUrl(a);
  const tb = new Set(tokensFromUrl(b));
  if (ta.length === 0) return 0;
  let hits = 0;
  for (const t of ta) if (tb.has(t)) hits++;
  return hits / ta.length;
}

function tokensFromUrl(url: string): string[] {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    const last = path.split("/").pop() ?? "";
    const stem = last.replace(/\.(jpg|jpeg|png|webp|avif|gif)$/i, "");
    return stem.split(/[-_.]+/).filter((t) => t.length >= 3 && !/^\d+$/.test(t));
  } catch {
    return [];
  }
}
