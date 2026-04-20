// productIdentifier/bgRemove.ts
// Limpieza de fondo en imágenes de producto mediante flood-fill en canvas.
//
// Funciona bien para fondos UNIFORMES (blanco, gris claro, transparente) —
// que es el caso habitual en las imágenes de catálogo TCG (logos de set,
// booster box shots comerciales).
//
// Para fondos no uniformes (fotos reales de tienda con escaparate, etc.) el
// resultado será pobre pero el usuario puede desactivar la limpieza.
//
// Algoritmo:
//   1. Cargar imagen en canvas
//   2. Muestrear 16 píxeles de las esquinas/bordes → determinar color fondo
//   3. Flood-fill desde cada borde, marcando píxeles "parecidos" (dentro
//      de tolerancia euclidiana en RGB) como transparentes
//   4. Dejar el interior del producto intacto aunque coincida en color
//      (gracias a que sólo conectamos desde bordes, no tocamos regiones
//      internas aisladas)
//   5. Export PNG data URL

export interface BgRemoveOptions {
  /** Tolerancia RGB (0-255) — subir si el fondo no es perfectamente plano */
  tolerance?: number;
  /** Si el fondo parece no uniforme, NO procesa y devuelve null */
  requireUniformBg?: boolean;
}

/**
 * Intenta cargar una imagen (Data URL o URL remota CORS-safe) en canvas.
 * Falla limpiamente si la imagen es tainted por CORS — devolvemos null y
 * el caller decide qué hacer.
 */
async function loadImageToCanvas(
  src: string,
): Promise<{
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  imgData: ImageData;
} | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve({ canvas, ctx, imgData });
      } catch {
        // CORS tainted
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Color promedio y dispersión de un conjunto de píxeles (RGBA bytes). */
function averageBorderColor(imgData: ImageData): {
  r: number;
  g: number;
  b: number;
  stddev: number;
} {
  const { data, width, height } = imgData;
  const samples: Array<[number, number, number]> = [];
  const addPx = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    samples.push([data[i], data[i + 1], data[i + 2]]);
  };
  const step = Math.max(1, Math.floor(Math.min(width, height) / 32));
  for (let x = 0; x < width; x += step) {
    addPx(x, 0);
    addPx(x, height - 1);
  }
  for (let y = 0; y < height; y += step) {
    addPx(0, y);
    addPx(width - 1, y);
  }
  let r = 0,
    g = 0,
    b = 0;
  for (const [sr, sg, sb] of samples) {
    r += sr;
    g += sg;
    b += sb;
  }
  const n = samples.length;
  r /= n;
  g /= n;
  b /= n;
  let variance = 0;
  for (const [sr, sg, sb] of samples) {
    variance += (sr - r) ** 2 + (sg - g) ** 2 + (sb - b) ** 2;
  }
  const stddev = Math.sqrt(variance / n);
  return { r, g, b, stddev };
}

function colorDistance(
  r: number,
  g: number,
  b: number,
  tr: number,
  tg: number,
  tb: number,
): number {
  return Math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2);
}

/**
 * Flood fill desde los bordes, marcando píxeles dentro de tolerancia como
 * transparentes. Usa cola iterativa (no recursiva) para evitar stack overflow
 * en imágenes grandes.
 */
function floodFillBorder(
  imgData: ImageData,
  bg: { r: number; g: number; b: number },
  tolerance: number,
): void {
  const { data, width, height } = imgData;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const idx = (x: number, y: number) => y * width + x;
  const isBgLike = (x: number, y: number): boolean => {
    const i = idx(x, y) * 4;
    return (
      colorDistance(data[i], data[i + 1], data[i + 2], bg.r, bg.g, bg.b) <=
      tolerance
    );
  };

  // Seed con todos los bordes
  for (let x = 0; x < width; x++) {
    queue.push(idx(x, 0));
    queue.push(idx(x, height - 1));
  }
  for (let y = 0; y < height; y++) {
    queue.push(idx(0, y));
    queue.push(idx(width - 1, y));
  }

  while (queue.length) {
    const p = queue.pop()!;
    if (visited[p]) continue;
    visited[p] = 1;
    const y = Math.floor(p / width);
    const x = p - y * width;
    if (!isBgLike(x, y)) continue;
    // Marcar alpha = 0
    data[p * 4 + 3] = 0;
    if (x > 0) queue.push(idx(x - 1, y));
    if (x < width - 1) queue.push(idx(x + 1, y));
    if (y > 0) queue.push(idx(x, y - 1));
    if (y < height - 1) queue.push(idx(x, y + 1));
  }
}

/**
 * Punto de entrada. Intenta limpiar el fondo; devuelve el data URL PNG
 * resultante o null si no se pudo (CORS, fondo no uniforme, fallo de canvas).
 */
export async function removeBackgroundFromImage(
  src: string,
  opts: BgRemoveOptions = {},
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const tolerance = opts.tolerance ?? 22;
  const requireUniformBg = opts.requireUniformBg ?? true;

  const loaded = await loadImageToCanvas(src);
  if (!loaded) return null;
  const { canvas, ctx, imgData } = loaded;

  const bg = averageBorderColor(imgData);
  if (requireUniformBg && bg.stddev > 45) {
    // Fondo demasiado heterogéneo — no procesamos.
    return null;
  }

  floodFillBorder(imgData, bg, tolerance);
  ctx.putImageData(imgData, 0, 0);

  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/**
 * Estimación rápida: ¿parece esta imagen candidata a limpieza automática?
 * (fondo uniforme, formato razonable). Útil para marcar en la UI qué
 * imágenes tienen sentido limpiar.
 */
export async function isBgRemovalRecommended(src: string): Promise<boolean> {
  const loaded = await loadImageToCanvas(src);
  if (!loaded) return false;
  const bg = averageBorderColor(loaded.imgData);
  // Uniforme y claro (blanco, gris claro, transparente-sobre-blanco)
  const isLight = bg.r > 200 && bg.g > 200 && bg.b > 200;
  const isUniform = bg.stddev < 30;
  return isLight && isUniform;
}
