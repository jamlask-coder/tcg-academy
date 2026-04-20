// productIdentifier/index.ts
// Fachada pública del pipeline de identificación automática.
//
// Uso típico desde el UI:
//   const result = await identifyProductFromImages(images, filenames, onProgress);
//   // result.draft → pasar como defaultValues al ProductForm
//   // result.confidence → pintar badges por campo
//   // result.strategyLog / result.errors → panel de depuración para el admin

import { composeDraft } from "./compose";
import { extractClues } from "./extract";
import { runOcrOnImages } from "./ocr";
import { canonicalizeClues } from "./search";
import type { IdentifyProgress, IdentifyResult } from "./types";

export type {
  CatalogHit,
  CatalogSearchResult,
  Clues,
  ConfidenceLevel,
  ConfidenceMap,
  FieldHint,
  IdentifyProgress,
  IdentifyResult,
  ProductCandidate,
  ProductDraft,
} from "./types";

export { isOcrAvailable, runOcrOnImages } from "./ocr";
export { extractClues } from "./extract";
export { searchProducts } from "./searchProducts";
export { candidateToDraft } from "./candidateToDraft";
export {
  removeBackgroundFromImage,
  isBgRemovalRecommended,
} from "./bgRemove";

/**
 * Pipeline completo: imágenes → ProductDraft con confianza por campo.
 *
 * Fases:
 *   1. OCR (tesseract.js lazy) → texto agregado
 *   2. Extract → pistas (game, category, language, setCode, packsPerBox, ...)
 *   3. Search → canonicaliza contra API del juego detectado
 *   4. Compose → ProductDraft final + mapa de confianza + descripción auto
 *
 * Nunca lanza: los errores se acumulan en `result.errors` y el UI los muestra
 * sin bloquear al admin (puede completar a mano lo que falte).
 */
export async function identifyProductFromImages(
  images: string[],
  filenames: string[] = [],
  onProgress?: (p: IdentifyProgress) => void,
): Promise<IdentifyResult> {
  const t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const errors: string[] = [];
  const strategyLog: string[] = [];

  // Fase 1: OCR
  onProgress?.({ phase: "ocr", progress: 0, message: "Iniciando OCR..." });
  let ocrText = "";
  try {
    ocrText = await runOcrOnImages(images, onProgress);
    strategyLog.push(`ocr: ${ocrText.length} chars extracted`);
  } catch (e) {
    errors.push(`ocr:${String(e)}`);
    strategyLog.push("ocr: failed — continuing with filenames only");
  }

  // Fase 2: Extract
  onProgress?.({
    phase: "extract",
    progress: 0.65,
    message: "Extrayendo pistas (juego, categoría, idioma)...",
  });
  const clues = extractClues(ocrText, filenames);
  strategyLog.push(
    `clues: game=${clues.game ?? "?"} cat=${clues.category ?? "?"} ` +
      `lang=${clues.language ?? "?"} setCode=${clues.setCode ?? "?"} ` +
      `fragments=${clues.nameFragments.length}`,
  );

  // Fase 3: Canonical search
  onProgress?.({
    phase: "search",
    progress: 0.8,
    message: "Buscando en catálogos TCG oficiales...",
  });
  const canonical = await canonicalizeClues(clues, errors, strategyLog);
  if (canonical) {
    strategyLog.push(
      `canonical: game=${canonical.game ?? "?"} setId=${canonical.setId ?? "?"} ` +
        `setName=${canonical.setName ?? "?"} confidence=${canonical.confidence}`,
    );
  }

  // Fase 4: Compose
  onProgress?.({
    phase: "compose",
    progress: 0.95,
    message: "Rellenando formulario...",
  });
  const { draft, confidence } = composeDraft(clues, canonical, images);

  onProgress?.({ phase: "done", progress: 1, message: "Identificación completa" });

  const t1 =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  return {
    draft,
    confidence,
    ocrText,
    strategyLog,
    errors,
    tookMs: Math.round(t1 - t0),
  };
}
