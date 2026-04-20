// Procesa el screenshot del símbolo llama de Magic → PNG limpio sin halo.
//
// La imagen fuente es la llama naranja/roja sobre fondo transparente pero con
// checkerboard de PNG transparency tools (mezcla de blanco + gris claro). Hay
// que eliminar todo lo que sea neutro claro, conservando el naranja/rojo
// saturado de la llama.
//
// Estrategia:
// 1) Detectar píxel como "fuego" si R domina claramente sobre B (y algo sobre G).
// 2) Los demás píxeles que no sean fuego → transparente.
// 3) Múltiples pasadas de erosión de halo claro adyacente a transparente.

import sharp from "sharp";
import path from "path";

const SRC = "C:/Users/Rik/Pictures/Screenshots/Captura de pantalla 2026-04-20 085047.png";
// Solo escribimos el logo del drawer (magic-planeswalker.png). El magic-clean.png
// lo usa la home móvil con el logo WIZARDS — NO se toca aquí.
const DST_PW = path.join(process.cwd(), "public", "images", "logos", "magic-planeswalker.png");

const img = sharp(SRC).ensureAlpha();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const out = Buffer.from(data);

// ─ Pass 1: descartar píxeles no-fuego ─
// "Fuego" = warm dominance (R > G >= B) y suficientemente brillante.
// Umbral de transición suave: entre warm=20 y warm=50 alpha proporcional.
const isFire = (r, g, b) => {
  const warmRB = r - b;
  const warmRG = r - g;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return warmRB > 40 && warmRG > 0 && lum > 60 && r > 110;
};

for (let i = 0; i < out.length; i += channels) {
  const r = out[i];
  const g = out[i + 1];
  const b = out[i + 2];
  if (!isFire(r, g, b)) {
    // Banda de transición para borde antialiased
    const warmRB = r - b;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (warmRB > 15 && lum > 40 && r > 80) {
      const t =
        Math.min(1, (warmRB - 15) / 25) *
        Math.min(1, (r - 80) / 40) *
        Math.min(1, (lum - 40) / 30);
      out[i + 3] = Math.min(out[i + 3], Math.round(255 * Math.max(0, t)));
    } else {
      out[i + 3] = 0;
    }
  }
}

// ─ Pass 2: comer halo claro iterativamente ─
const isHaloPixel = (r, g, b) => {
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return spread < 30 && lum > 190;
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

const processed = await sharp(out, { raw: { width, height, channels } })
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
  .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toBuffer();

await sharp(processed).toFile(DST_PW);

console.log(`✓ ${DST_PW}`);
