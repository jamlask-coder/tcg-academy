// Procesa las imágenes de referencia del usuario (pokeball + planeswalker + one piece)
// para usarlas como iconos del drawer móvil. Quita el fondo oscuro texturado.
//
// - Pokeball: máscara circular (recorta el círculo central, elimina esquinas)
// - Planeswalker: threshold por luminancia (bg oscuro → transparente)
// - One Piece: flood fill desde los bordes (fondo blanco pero skull también blanco)
//
// Uso: node scripts/process-drawer-icons.mjs

import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

const SRC_DIR = "C:/Users/jamla/Pictures/Screenshots";
const DST_DIR = path.join(process.cwd(), "public", "images", "logos");

await fs.mkdir(DST_DIR, { recursive: true });

// ── Pokeball: máscara circular + limpieza de halo claro ───────────────────
// Pass 1: máscara circular al 95% (elimina el fondo oscuro del screenshot).
// Pass 2: desde los píxeles ya transparentes, flood fill hacia dentro comiendo
// SÓLO pixeles claros/neutros (el halo blanco). Se detiene en el anillo negro
// nativo del pokeball porque no es claro.
async function processPokeball(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);

  // ─ Pass 1: máscara circular ─
  const cx = width / 2;
  const cy = height / 2;
  const rMax = Math.min(width, height) / 2 * 0.95;
  const rFade = rMax - 3;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * width + x) * channels;
      if (d > rMax) {
        out[idx + 3] = 0;
      } else if (d > rFade) {
        const frac = 1 - (d - rFade) / (rMax - rFade);
        out[idx + 3] = Math.round(out[idx + 3] * frac);
      }
    }
  }

  // ─ Pass 2: flood fill del halo claro desde los píxeles transparentes ─
  const visited = new Uint8Array(width * height);
  const isLightHalo = (idx) => {
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    // Neutro claro: poca diferencia entre canales + brillo alto
    return maxC - minC < 40 && minC > 130;
  };

  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);
  let qHead = 0;
  let qTail = 0;

  // Siembra: para cada píxel transparente del pass 1, enqueue vecinos que sean halo
  const seedNeighbor = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const v = y * width + x;
    if (visited[v]) return;
    const idx = v * channels;
    if (out[idx + 3] > 0 && isLightHalo(idx)) {
      visited[v] = 1;
      queueX[qTail] = x;
      queueY[qTail] = y;
      qTail++;
    }
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      if (out[idx + 3] !== 0) continue;
      seedNeighbor(x - 1, y);
      seedNeighbor(x + 1, y);
      seedNeighbor(x, y - 1);
      seedNeighbor(x, y + 1);
    }
  }

  while (qHead < qTail) {
    const x = queueX[qHead];
    const y = queueY[qHead];
    qHead++;
    const idx = (y * width + x) * channels;
    out[idx + 3] = 0;
    seedNeighbor(x - 1, y);
    seedNeighbor(x + 1, y);
    seedNeighbor(x, y - 1);
    seedNeighbor(x, y + 1);
  }

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── Planeswalker: quitar fondo oscuro por umbral de luminancia ─────────────
async function processPlaneswalker(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);
  // Threshold: bg es gris oscuro texturado (~20-50 de luminancia),
  // símbolo es rojo-naranja brillante (luminancia alta en R).
  // Usamos dominancia de rojo + luminancia mínima.
  for (let i = 0; i < out.length; i += channels) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const redDominance = r - Math.max(g, b);

    // Pixel es parte del símbolo si R domina y brilla. Si no → transparente.
    if (!(redDominance > 30 && r > 120)) {
      // Fade suave para bordes: cuanto más cerca del umbral, más transparente
      if (redDominance > 10 && r > 80) {
        // borde: alpha proporcional
        const t = Math.min(1, (redDominance - 10) / 20) * Math.min(1, (r - 80) / 40);
        out[i + 3] = Math.round(255 * t);
      } else {
        out[i + 3] = 0;
      }
    }
    // Silenciamos lum para no romper lint (se usa como anclaje conceptual).
    void lum;
  }

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── One Piece: flood fill desde los bordes (fondo blanco) ──────────────────
// No se puede usar threshold simple porque el skull interior también es blanco.
// Solución: BFS desde los píxeles de los bordes; sólo el blanco conectado al
// exterior se hace transparente. El skull queda intacto porque está rodeado
// por el círculo negro.
async function processOnePiece(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);
  const visited = new Uint8Array(width * height);

  const isBg = (idx) => {
    // Fondo: blanco/casi blanco (R,G,B todos > 235)
    return out[idx] > 235 && out[idx + 1] > 235 && out[idx + 2] > 235;
  };

  // Cola tipo BFS con puntero (shift es O(n), así es O(1))
  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);
  let qHead = 0;
  let qTail = 0;

  const enqueueIfBg = (x, y) => {
    const v = y * width + x;
    if (visited[v]) return;
    const idx = v * channels;
    if (isBg(idx)) {
      visited[v] = 1;
      queueX[qTail] = x;
      queueY[qTail] = y;
      qTail++;
    }
  };

  // Siembra: todos los píxeles de los bordes
  for (let x = 0; x < width; x++) {
    enqueueIfBg(x, 0);
    enqueueIfBg(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    enqueueIfBg(0, y);
    enqueueIfBg(width - 1, y);
  }

  // BFS 4-conectado
  while (qHead < qTail) {
    const x = queueX[qHead];
    const y = queueY[qHead];
    qHead++;
    const idx = (y * width + x) * channels;
    out[idx + 3] = 0; // transparente

    if (x > 0) enqueueIfBg(x - 1, y);
    if (x < width - 1) enqueueIfBg(x + 1, y);
    if (y > 0) enqueueIfBg(x, y - 1);
    if (y < height - 1) enqueueIfBg(x, y + 1);
  }

  // Antialiasing de bordes: píxeles semi-blancos adyacentes a transparente
  // → alpha proporcional para suavizar el contorno
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const v = y * width + x;
      if (visited[v]) continue;
      const idx = v * channels;
      const r = out[idx];
      const g = out[idx + 1];
      const b = out[idx + 2];
      // Sólo tocamos píxeles ya bastante claros
      if (r < 200 || g < 200 || b < 200) continue;
      // ¿Algún vecino transparente (visited)?
      const neighbors = [
        visited[(y - 1) * width + x],
        visited[(y + 1) * width + x],
        visited[y * width + (x - 1)],
        visited[y * width + (x + 1)],
      ];
      if (neighbors.some((n) => n)) {
        // Gris → alfa escalado por distancia al blanco puro
        const lum = (r + g + b) / 3;
        const t = Math.max(0, Math.min(1, (255 - lum) / 55));
        out[idx + 3] = Math.round(255 * t);
      }
    }
  }

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── Riftbound: símbolo naranja sobre fondo negro ──────────────────────────
// Fondo negro puro (R,G,B < 30). Símbolo naranja (R alto, G medio, B bajo).
// Conservamos pixeles con luminancia > umbral y con R dominando claramente.
async function processRiftbound(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += channels) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // Orange = R alto, G medio, B muy bajo. Red dominance sobre B es fuerte.
    const warmDominance = r - b;

    // Umbral principal: píxel claramente naranja/cálido
    if (!(warmDominance > 60 && r > 110 && lum > 60)) {
      // Borde suave: alpha proporcional dentro de la banda de transición
      if (warmDominance > 20 && r > 60) {
        const t =
          Math.min(1, (warmDominance - 20) / 40) *
          Math.min(1, (r - 60) / 50) *
          Math.min(1, (lum - 30) / 30);
        out[i + 3] = Math.round(255 * Math.max(0, t));
      } else {
        out[i + 3] = 0;
      }
    }
  }

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── Yu-Gi-Oh: logo rojo+blanco sobre fondo negro ──────────────────────────
// Mantiene rojo (triángulo) y blanco (letras). Todo lo oscuro → transparente.
// El negro del interior del triángulo se hace transparente — queda flotante
// sobre el fondo del drawer (visualmente casi idéntico contra azul profundo).
async function processYugioh(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += channels) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum < 25) {
      // Fondo oscuro puro → transparente total
      out[i + 3] = 0;
    } else if (lum < 55) {
      // Banda de transición → alpha proporcional
      const t = (lum - 25) / 30;
      out[i + 3] = Math.round(255 * t);
    }
    // lum >= 55 → opaco (rojo o blanco)
  }

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── Dragon Ball: bola 3D naranja con 4 estrellas sobre fondo negro ────────
// BG negro sólido. La bola incluye sombra inferior muy oscura (marrón) que
// sin embargo tiene tinte rojo/naranja (R > G > B). Criterio: "neutro y
// oscuro" — sólo matchea píxeles casi acromáticos (R≈G≈B) con lum baja.
// Así respetamos la sombra del borde inferior de la bola.
async function processDragonBall(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);
  floodFillFromEdges(out, width, height, channels, (idx) => {
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    // BG = oscuro Y neutro (casi gris). La sombra marrón de la bola tiene
    // spread > 20 (R domina sobre B) así que no matchea.
    return lum < 45 && spread < 20;
  });

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── Helper: flood fill genérico desde los bordes ──────────────────────────
function floodFillFromEdges(out, width, height, channels, isBg) {
  const visited = new Uint8Array(width * height);
  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);
  let qHead = 0;
  let qTail = 0;

  const enqueueIfBg = (x, y) => {
    const v = y * width + x;
    if (visited[v]) return;
    const idx = v * channels;
    if (isBg(idx)) {
      visited[v] = 1;
      queueX[qTail] = x;
      queueY[qTail] = y;
      qTail++;
    }
  };

  for (let x = 0; x < width; x++) {
    enqueueIfBg(x, 0);
    enqueueIfBg(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    enqueueIfBg(0, y);
    enqueueIfBg(width - 1, y);
  }

  while (qHead < qTail) {
    const x = queueX[qHead];
    const y = queueY[qHead];
    qHead++;
    const idx = (y * width + x) * channels;
    out[idx + 3] = 0;
    if (x > 0) enqueueIfBg(x - 1, y);
    if (x < width - 1) enqueueIfBg(x + 1, y);
    if (y > 0) enqueueIfBg(x, y - 1);
    if (y < height - 1) enqueueIfBg(x, y + 1);
  }

  return visited;
}

// ── Helper: conservar sólo el componente conexo OPACO más grande ──────────
// Útil para quitar "chispitas" decorativas pequeñas del fondo sin tocar el
// sujeto principal.
function keepLargestOpaqueComponent(out, width, height, channels) {
  const comp = new Int32Array(width * height).fill(-1);
  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);
  let bestId = -1;
  let bestSize = 0;
  const sizes = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = y * width + x;
      if (comp[v] !== -1) continue;
      const idx = v * channels;
      if (out[idx + 3] === 0) continue;
      const id = sizes.length;
      let qHead = 0;
      let qTail = 0;
      comp[v] = id;
      queueX[qTail] = x;
      queueY[qTail] = y;
      qTail++;
      let size = 0;
      while (qHead < qTail) {
        const cx = queueX[qHead];
        const cy = queueY[qHead];
        qHead++;
        size++;
        const steps = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dx, dy] of steps) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nv = ny * width + nx;
          if (comp[nv] !== -1) continue;
          const nidx = nv * channels;
          if (out[nidx + 3] === 0) continue;
          comp[nv] = id;
          queueX[qTail] = nx;
          queueY[qTail] = ny;
          qTail++;
        }
      }
      sizes.push(size);
      if (size > bestSize) {
        bestSize = size;
        bestId = id;
      }
    }
  }

  // Todo lo que no sea el componente más grande → transparente
  for (let i = 0; i < comp.length; i++) {
    if (comp[i] !== -1 && comp[i] !== bestId) {
      out[i * channels + 3] = 0;
    }
  }
}

// ── Naruto: espiral naranja/roja sobre fondo blanco ───────────────────────
async function processNaruto(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);
  // BG = blanco puro o casi blanco (neutro + muy brillante). El contenido
  // es naranja/rojo/amarillo, donde R domina claramente sobre B.
  floodFillFromEdges(out, width, height, channels, (idx) => {
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    return maxC - minC < 25 && minC > 220;
  });

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── Topps: 3 pelotas deportivas (fútbol, basket, tenis) sobre checkerboard
// El usuario quiere los colores ORIGINALES (blanco+gris fútbol, naranja
// basket, amarillo tenis), NO tinte ámbar. Solo quitamos el checkerboard.
// Problema: el checkerboard es neutro y claro, pero el balón de fútbol
// TAMBIÉN tiene zonas blancas. Los contornos negros del balón encierran
// el interior, así que flood-fill desde bordes mata el exterior pero no
// puede entrar a los gajos blancos interiores. No hay pasada global aquí
// porque perderíamos el blanco del fútbol.
async function processTopps(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);
  // BG checkerboard: neutro (spread muy bajo) y muy claro. Umbral estricto
  // para no tocar los grises medios (hexágonos oscuros del fútbol) ni las
  // sombras claras.
  floodFillFromEdges(out, width, height, channels, (idx) => {
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    return spread < 15 && lum > 190;
  });

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── Lorcana: estrella dorada con adornos sobre fondo navy oscuro ──────────
async function processLorcana(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);
  // BG = muy oscuro (lum baja). El oro brillante (R>G>B claros) no matchea.
  floodFillFromEdges(out, width, height, channels, (idx) => {
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum < 50;
  });

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── Cyberpunk: símbolo amarillo/verde sobre fondo negro ───────────────────
async function processCyberpunk(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);
  // BG = negro / casi negro (lum muy baja). El amarillo/verde brillante no
  // matchea ni de lejos.
  floodFillFromEdges(out, width, height, channels, (idx) => {
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum < 35;
  });

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── Digimon: Digivice amarillo sobre fondo azul muy claro con chispitas ──
// Flood fill + keep-largest-component para eliminar las chispitas decorativas
// (pequeños "+" en el fondo) sin tocar el aparato.
async function processDigimon(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);
  // BG principal = azul muy claro / blanco (lum alta, poca saturación).
  floodFillFromEdges(out, width, height, channels, (idx) => {
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    return minC > 200 && maxC - minC < 30;
  });

  // Quitar chispitas flotantes (componentes conexos pequeños)
  keepLargestOpaqueComponent(out, width, height, channels);

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── Seal: sello "QUALITY SATISFACTION GUARANTEED" azul marino → ámbar ────
// Sello con textura vintage (navy oscuro sobre blanco con granulado). Tiene
// texto BLANCO interior (QUALITY, SATISFACTION, GUARANTEED) encerrado por
// el navy. Estrategia: flood-fill blanco desde bordes + pasada global para
// limpiar el blanco interior + recolor navy → ámbar con alpha por oscuridad.
async function processSeal(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);
  const isLightBg = (idx) => {
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    return spread < 30 && lum > 170;
  };
  floodFillFromEdges(out, width, height, channels, isLightBg);

  // Huecos interiores (texto blanco dentro del sello, granulado claro)
  const total = width * height;
  for (let i = 0; i < total; i++) {
    const idx = i * channels;
    if (out[idx + 3] === 0) continue;
    if (isLightBg(idx)) out[idx + 3] = 0;
  }

  // Recolor navy → ámbar. alpha proporcional a la oscuridad original para
  // preservar la textura vintage del sello (píxeles grises intermedios
  // aparecen como ámbar medio-transparente, dando el mismo "look").
  const AMBER_R = 251, AMBER_G = 191, AMBER_B = 36;
  for (let i = 0; i < total; i++) {
    const idx = i * channels;
    if (out[idx + 3] === 0) continue;
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    out[idx] = AMBER_R;
    out[idx + 1] = AMBER_G;
    out[idx + 2] = AMBER_B;
    out[idx + 3] = Math.min(out[idx + 3], Math.max(0, Math.min(255, Math.round(255 - lum))));
  }

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── Money: fajo de billetes blanco sobre fondo negro → ámbar ─────────────
// Invertimos la lógica de B2B: aquí el sujeto es CLARO y el fondo OSCURO.
// Flood-fill por luminancia baja quita el negro; luego recoloreamos a ámbar
// con alpha proporcional al BRILLO original (píxeles más blancos = más
// opacos) para que los detalles (el pliegue de los billetes, los óvalos)
// queden limpios.
async function processMoney(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);

  floodFillFromEdges(out, width, height, channels, (idx) => {
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum < 40;
  });

  const total = width * height;
  const AMBER_R = 251, AMBER_G = 191, AMBER_B = 36;
  for (let i = 0; i < total; i++) {
    const idx = i * channels;
    if (out[idx + 3] === 0) continue;
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    out[idx] = AMBER_R;
    out[idx + 1] = AMBER_G;
    out[idx + 2] = AMBER_B;
    out[idx + 3] = Math.min(out[idx + 3], Math.max(0, Math.min(255, Math.round(lum))));
  }

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── Franquicias: 3 tienditas negras con líneas sobre checkerboard → ámbar ─
// Misma lógica que B2B (negro sobre claro): flood-fill neutro desde bordes
// quita el checkerboard + pasada global para huecos interiores (los huecos
// de las tiendas que están cerrados por los trazos negros). Recolor negro
// → ámbar con alpha por oscuridad.
async function processFranchises(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);
  const isLightNeutral = (idx) => {
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    return spread < 25 && lum > 130;
  };
  floodFillFromEdges(out, width, height, channels, isLightNeutral);

  // Huecos internos cerrados (entrada de tienda, toldos): limpiar global.
  const total = width * height;
  for (let i = 0; i < total; i++) {
    const idx = i * channels;
    if (out[idx + 3] === 0) continue;
    if (isLightNeutral(idx)) out[idx + 3] = 0;
  }

  const AMBER_R = 251, AMBER_G = 191, AMBER_B = 36;
  for (let i = 0; i < total; i++) {
    const idx = i * channels;
    if (out[idx + 3] === 0) continue;
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    out[idx] = AMBER_R;
    out[idx + 1] = AMBER_G;
    out[idx + 2] = AMBER_B;
    out[idx + 3] = Math.min(out[idx + 3], Math.max(0, Math.min(255, Math.round(255 - lum))));
  }

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── Cart: carrito con 4 cajas amarillas y contorno negro sobre checkerboard
// El sujeto es bicolor (amarillo + negro). Estrategia:
//   1) Flood-fill neutro-claro desde bordes → transparente (mata checkerboard).
//      El amarillo es saturado (spread grande) → no matchea. El negro interno
//      sobrevive porque está encerrado por el amarillo.
//   2) Recolor uniforme a ámbar: toda forma queda en color ámbar, preservando
//      la silueta del carrito (cajas + ruedas + tirador).
async function processCart(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);
  floodFillFromEdges(out, width, height, channels, (idx) => {
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // Checkerboard: neutro (spread < 25) y claro (lum > 130).
    return spread < 25 && lum > 130;
  });

  const total = width * height;
  // Paleta dos-tonos para preservar la estructura del carrito:
  //   - Relleno (píxeles originalmente amarillos, lum alta) → amber-200 claro
  //   - Contornos (píxeles originalmente negros, lum baja) → amber-400 vivo
  // Ambos con alpha original → antialiasing suave en los bordes.
  const AMBER_400_R = 251, AMBER_400_G = 191, AMBER_400_B = 36; // #fbbf24
  const AMBER_200_R = 253, AMBER_200_G = 230, AMBER_200_B = 138; // #fde68a
  for (let i = 0; i < total; i++) {
    const idx = i * channels;
    if (out[idx + 3] === 0) continue;
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum > 130) {
      out[idx] = AMBER_200_R;
      out[idx + 1] = AMBER_200_G;
      out[idx + 2] = AMBER_200_B;
    } else {
      out[idx] = AMBER_400_R;
      out[idx + 1] = AMBER_400_G;
      out[idx + 2] = AMBER_400_B;
    }
  }

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── B2B: texto "B2B" con flechas circulares, negro sobre blanco → ámbar ──
// El logo viene como negro sólido sobre blanco. En el drawer oscuro el negro
// no se vería, así que:
//   1) flood-fill blanco desde bordes → transparente
//   2) todo píxel sobreviviente → ámbar (#fbbf24) conservando alpha según la
//      oscuridad original (así los bordes antialiased quedan limpios).
async function processB2B(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);

  // 1) Quitar blanco exterior. El texto y las flechas están rodeados de
  //    blanco, el fill llega a todo el fondo pero no entra en las letras
  //    (cerradas). Hueco interior de 'B' / '2' tampoco se alcanza; se limpia
  //    después globalmente porque todo píxel blanco es uniformemente blanco.
  floodFillFromEdges(out, width, height, channels, (idx) => {
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum > 225;
  });

  // Segunda pasada: los huecos interiores de B/2/B son blancos pero cerrados
  // por los trazos negros → no los alcanza el flood-fill. Como el logo es
  // negro sólido y blanco sólido, cualquier píxel muy claro restante es
  // hueco interior y se puede limpiar globalmente sin riesgo.
  const total = width * height;
  for (let i = 0; i < total; i++) {
    const idx = i * channels;
    if (out[idx + 3] === 0) continue;
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum > 225) out[idx + 3] = 0;
  }

  // 2) Recolor → ámbar. Amber-400 de Tailwind: #fbbf24 = rgb(251, 191, 36).
  //    Alpha se escala con la oscuridad original (1 - lum/255) para que los
  //    bordes antialiased salgan suaves en vez de "pixelados".
  const AMBER_R = 251;
  const AMBER_G = 191;
  const AMBER_B = 36;
  for (let i = 0; i < total; i++) {
    const idx = i * channels;
    if (out[idx + 3] === 0) continue;
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // alpha proporcional a la oscuridad (negro=opaco, blanco=transparente)
    const a = Math.max(0, Math.min(255, Math.round(255 - lum)));
    out[idx] = AMBER_R;
    out[idx + 1] = AMBER_G;
    out[idx + 2] = AMBER_B;
    out[idx + 3] = Math.min(out[idx + 3], a);
  }

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── Euro coin: círculo naranja con "€" blanco sobre fondo checkerboard ───
// BG = checkerboard (blanco + gris claro) + la sombra gris alargada debajo
// del círculo. Flood-fill desde bordes con criterio "neutro" (R≈G≈B). El €
// interior está encerrado por el naranja → no se alcanza, queda intacto.
async function processEuroCoin(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);
  floodFillFromEdges(out, width, height, channels, (idx) => {
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    // Neutro (gris/blanco). El naranja tiene spread > 80 así que no matchea
    // y el contorno del círculo detiene el fill.
    return spread < 25;
  });

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── Panini: "P" roja sobre fondo amarillo plano ──────────────────────────
// BG = amarillo saturado (R alto, G alto, B bajo). La P roja tiene G bajo
// y B bajo, así que no matchea el criterio de amarillo. El contorno negro
// de la P también tiene lum baja y no matchea.
async function processPanini(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);
  const isYellow = (idx) => {
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    // Amarillo: R y G altos, B claramente más bajo. Margen generoso para
    // coger variaciones JPEG.
    return r > 200 && g > 180 && b < 120 && r - b > 80 && g - b > 60;
  };
  floodFillFromEdges(out, width, height, channels, isYellow);

  // Segunda pasada global: el hueco interior de la P es amarillo pero el
  // flood-fill desde bordes no puede alcanzarlo (contorno cerrado). Como
  // amarillo no aparece dentro de la P roja ni del contorno negro, podemos
  // limpiarlo globalmente sin riesgo.
  const total = width * height;
  for (let i = 0; i < total; i++) {
    const idx = i * channels;
    if (out[idx + 3] === 0) continue;
    if (isYellow(idx)) out[idx + 3] = 0;
  }

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

// ── Vending: máquina expendedora gris sobre fondo claro → ámbar ──────────
// BG claro neutro se quita por flood-fill; los grises oscuros del chasis se
// recolorean a ámbar con alpha proporcional a la oscuridad (look consistente
// con seal/money). Pasada global después para limpiar huecos interiores
// neutros claros (los estantes internos) que el flood-fill no alcanza.
async function processVending(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.from(data);
  const isLightBg = (idx) => {
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    return spread < 25 && lum > 200;
  };
  floodFillFromEdges(out, width, height, channels, isLightBg);

  // Pasada global: limpiar cualquier claro neutro residual (no hay colores
  // saturados en la imagen, así que es seguro).
  const total = width * height;
  for (let i = 0; i < total; i++) {
    const idx = i * channels;
    if (out[idx + 3] === 0) continue;
    if (isLightBg(idx)) out[idx + 3] = 0;
  }

  // Recolor gris → ámbar. alpha por oscuridad (más oscuro = más opaco).
  const AMBER_R = 251, AMBER_G = 191, AMBER_B = 36;
  for (let i = 0; i < total; i++) {
    const idx = i * channels;
    if (out[idx + 3] === 0) continue;
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    out[idx] = AMBER_R;
    out[idx + 1] = AMBER_G;
    out[idx + 2] = AMBER_B;
    out[idx + 3] = Math.min(out[idx + 3], Math.max(0, Math.min(255, Math.round(255 - lum))));
  }

  await sharp(out, { raw: { width, height, channels } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓ ${outputPath}`);
}

await processPokeball(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 175504.png"),
  path.join(DST_DIR, "pokeball.png"),
);

await processPlaneswalker(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 175849.png"),
  path.join(DST_DIR, "magic-planeswalker.png"),
);

await processOnePiece(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 180616.png"),
  path.join(DST_DIR, "onepiece-strawhat.png"),
);

await processRiftbound(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 181210.png"),
  path.join(DST_DIR, "riftbound-vortex.png"),
);

await processYugioh(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 182153.png"),
  path.join(DST_DIR, "yugioh-triangle.png"),
);

await processDragonBall(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 190350.png"),
  path.join(DST_DIR, "dragonball-4stars.png"),
);

await processNaruto(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 183305.png"),
  path.join(DST_DIR, "naruto-sun.png"),
);

await processTopps(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 205038.png"),
  path.join(DST_DIR, "topps-sports.png"),
);

await processLorcana(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 183432.png"),
  path.join(DST_DIR, "lorcana-star.png"),
);

await processDigimon(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 183639.png"),
  path.join(DST_DIR, "digimon-digivice.png"),
);

await processCyberpunk(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 184127.png"),
  path.join(DST_DIR, "cyberpunk-bolt.png"),
);

await processPanini(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 184348.png"),
  path.join(DST_DIR, "panini-p.png"),
);

await processEuroCoin(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 190723.png"),
  path.join(DST_DIR, "euro-coin.png"),
);

await processB2B(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 191732.png"),
  path.join(DST_DIR, "b2b-amber.png"),
);

await processMoney(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 204630.png"),
  path.join(DST_DIR, "money-amber.png"),
);

await processFranchises(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 204539.png"),
  path.join(DST_DIR, "franquicias-amber.png"),
);

await processCart(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 204509.png"),
  path.join(DST_DIR, "b2b-cart-amber.png"),
);

await processSeal(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 205837.png"),
  path.join(DST_DIR, "quality-seal-amber.png"),
);

await processVending(
  path.join(SRC_DIR, "Captura de pantalla 2026-04-19 210324.png"),
  path.join(DST_DIR, "vending-amber.png"),
);

console.log("\nListo.");
