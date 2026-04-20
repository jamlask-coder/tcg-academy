// Procesa el screenshot del pokeball cartoon → PNG limpio SIN halo claro.
//
// 1) Flood-fill agresivo desde bordes: mata blanco puro.
// 2) Múltiples pasadas de "comer halo": cada vecino transparente borra el
//    píxel actual si es claro/neutro (lum > 200, spread < 30). Se repite
//    hasta estabilizarse → desaparecen los restos grises del antialias.
// 3) Antialiasing final suave en los bordes ya limpios.
//
// Uso: node scripts/process-pokemon-logo.mjs

import sharp from "sharp";
import path from "path";

const SRC = "C:/Users/Rik/Pictures/Screenshots/Captura de pantalla 2026-04-20 084137.png";
const DST = path.join(process.cwd(), "public", "images", "logos", "pokeball.png");

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
}

const img = sharp(SRC).ensureAlpha();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const out = Buffer.from(data);

// ─ Pass 1: flood-fill del blanco desde bordes ─
// Umbral generoso para pillar el antialiasing del borde del pokeball.
floodFillFromEdges(out, width, height, channels, (idx) => {
  const r = out[idx];
  const g = out[idx + 1];
  const b = out[idx + 2];
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return maxC - minC < 25 && lum > 220;
});

// ─ Pass 2: comer halo claro iterativamente ─
// Cada píxel claro/neutro adyacente a uno transparente se vuelve transparente.
// Se repite hasta que no hay más cambios (máximo 12 pasadas).
const isHaloPixel = (r, g, b) => {
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  // Neutro (gris/blanco) + claro. El negro del pokeball no matchea (lum < 50).
  // El rojo saturado no matchea (spread alto). Solo greys claros del halo.
  return spread < 35 && lum > 190;
};

for (let pass = 0; pass < 12; pass++) {
  let changed = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const v = y * width + x;
      const idx = v * channels;
      if (out[idx + 3] === 0) continue;
      const r = out[idx];
      const g = out[idx + 1];
      const b = out[idx + 2];
      if (!isHaloPixel(r, g, b)) continue;
      // ¿Algún vecino ya transparente?
      if (
        out[((y - 1) * width + x) * channels + 3] === 0 ||
        out[((y + 1) * width + x) * channels + 3] === 0 ||
        out[(y * width + (x - 1)) * channels + 3] === 0 ||
        out[(y * width + (x + 1)) * channels + 3] === 0
      ) {
        out[idx + 3] = 0;
        changed++;
      }
    }
  }
  if (changed === 0) break;
}

// ─ Pass 3: suavizado final de borde ─
// Píxeles que aún son casi-blancos y tocan transparente → alfa proporcional
// a la oscuridad (más oscuro = más opaco).
for (let y = 1; y < height - 1; y++) {
  for (let x = 1; x < width - 1; x++) {
    const v = y * width + x;
    const idx = v * channels;
    if (out[idx + 3] === 0) continue;
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 150) continue;
    if (
      out[((y - 1) * width + x) * channels + 3] === 0 ||
      out[((y + 1) * width + x) * channels + 3] === 0 ||
      out[(y * width + (x - 1)) * channels + 3] === 0 ||
      out[(y * width + (x + 1)) * channels + 3] === 0
    ) {
      const t = Math.max(0, Math.min(1, (255 - lum) / 40));
      out[idx + 3] = Math.min(out[idx + 3], Math.round(255 * t));
    }
  }
}

await sharp(out, { raw: { width, height, channels } })
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
  .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(DST);

console.log(`✓ ${DST}`);
