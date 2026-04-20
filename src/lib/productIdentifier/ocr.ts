// productIdentifier/ocr.ts
// Adaptador OCR con degradación elegante.
//
// Estrategia:
//   1. Intenta cargar `tesseract.js` vía dynamic import.
//   2. Si está instalado y se carga bien → OCR real (eng + spa).
//   3. Si no está instalado → devuelve texto vacío y registra el motivo.
//      El pipeline sigue funcionando: extractClues usa también filenames
//      como fallback, y el admin puede rellenar el resto a mano.
//
// Nota: para instalar OCR real el admin debe ejecutar `npm install tesseract.js`
// en la raíz del proyecto. El módulo se carga sólo en el cliente (typeof window).

import type { IdentifyProgress } from "./types";

type ProgressCb = (p: IdentifyProgress) => void;

/**
 * Resultado del worker de Tesseract. Dejamos el tipo local para no depender
 * de los tipos del paquete (que puede no estar instalado).
 */
interface TessRecognizeResult {
  data?: { text?: string };
}
interface TessWorker {
  recognize: (image: string) => Promise<TessRecognizeResult>;
  terminate: () => Promise<unknown>;
}
interface TessModule {
  createWorker: (
    langs: string | string[],
    oem?: number,
    options?: { logger?: (m: { status?: string; progress?: number }) => void },
  ) => Promise<TessWorker>;
}

let workerPromise: Promise<TessWorker | null> | null = null;
let loadFailed = false;

async function loadWorker(onProgress?: ProgressCb): Promise<TessWorker | null> {
  if (loadFailed) return null;
  if (workerPromise) return workerPromise;

  workerPromise = (async () => {
    if (typeof window === "undefined") return null;
    try {
      // Dynamic import — puede fallar si tesseract.js no está instalado.
      const mod = (await import("tesseract.js")) as unknown as TessModule;
      const worker = await mod.createWorker(["eng", "spa"], 1, {
        logger: (m) => {
          if (typeof m.progress === "number" && onProgress) {
            onProgress({
              phase: "ocr",
              progress: Math.max(0, Math.min(1, m.progress)),
              message: `OCR: ${m.status ?? "procesando"} (${Math.round((m.progress ?? 0) * 100)}%)`,
            });
          }
        },
      });
      return worker;
    } catch (e) {
      loadFailed = true;
      // eslint-disable-next-line no-console
      console.info(
        "[productIdentifier/ocr] tesseract.js no disponible — OCR deshabilitado. " +
          "Instala con: npm install tesseract.js",
        e,
      );
      return null;
    }
  })();

  return workerPromise;
}

/**
 * Ejecuta OCR sobre una lista de Data URLs de imágenes y devuelve el texto
 * concatenado. Si tesseract.js no está instalado, devuelve "".
 *
 * Es resiliente: imagenes individuales que fallen no rompen el resto.
 */
export async function runOcrOnImages(
  images: string[],
  onProgress?: ProgressCb,
): Promise<string> {
  if (images.length === 0) return "";
  if (typeof window === "undefined") return "";

  const worker = await loadWorker(onProgress);
  if (!worker) return "";

  const texts: string[] = [];
  for (let i = 0; i < images.length; i++) {
    onProgress?.({
      phase: "ocr",
      progress: (i / images.length) * 0.9,
      message: `OCR imagen ${i + 1}/${images.length}...`,
    });
    try {
      const r = await worker.recognize(images[i]);
      texts.push(r.data?.text ?? "");
    } catch (e) {
      // Un fallo por imagen no aborta el resto.
      texts.push("");
      // eslint-disable-next-line no-console
      console.warn(`[ocr] recognize falló en imagen ${i}`, e);
    }
  }

  // Liberamos el worker para no dejar memoria colgando entre identificaciones.
  try {
    await worker.terminate();
  } catch {
    /* ignore */
  }
  workerPromise = null;

  return texts.join("\n---\n");
}

/**
 * Indica si el OCR real (tesseract.js) está disponible en el entorno actual.
 * Útil para que el UI muestre un aviso "OCR offline — instala tesseract.js".
 */
export async function isOcrAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (loadFailed) return false;
  try {
    await import("tesseract.js");
    return true;
  } catch {
    loadFailed = true;
    return false;
  }
}
