// Genera public/og-default.png (1200×630) — preview social genérica.
// Ejecutar con `node scripts/generate-og-image.mjs`. Idempotente.
//
// Diseño: gradiente diagonal violeta→cyan + nombre + tagline + CIF + dominio.
// Sin imágenes externas, sin fuentes embebidas (usa font stack del sistema).

import sharp from "sharp";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "og-default.png");

const W = 1200;
const H = 630;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="#0f172a"/>
      <stop offset="55%" stop-color="#5b21b6"/>
      <stop offset="100%" stop-color="#0e7490"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.6">
      <stop offset="0%"  stop-color="#a78bfa" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="#a78bfa" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"  stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- borde superior gradiente (acento) -->
  <rect x="0" y="0" width="${W}" height="6" fill="url(#accent)"/>
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="url(#accent)" opacity="0.6"/>

  <!-- bloque de texto -->
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
     fill="#ffffff" text-anchor="start">

    <!-- pre-título -->
    <text x="80" y="180" font-size="28" letter-spacing="6" fill="#a5f3fc" font-weight="600">
      TIENDA OFICIAL DE CARTAS COLECCIONABLES
    </text>

    <!-- título -->
    <text x="80" y="290" font-size="120" font-weight="800" letter-spacing="-2">
      TCG Academy
    </text>

    <!-- tagline -->
    <text x="80" y="370" font-size="40" font-weight="500" fill="#e9d5ff" opacity="0.95">
      Magic · Pokémon · Yu-Gi-Oh! · One Piece · Lorcana
    </text>

    <!-- divisor -->
    <line x1="80" y1="430" x2="320" y2="430" stroke="url(#accent)" stroke-width="4"/>

    <!-- footer info -->
    <text x="80" y="490" font-size="28" font-weight="500" fill="#cffafe">
      Envíos a toda España · Stock real en tienda física
    </text>
    <text x="80" y="540" font-size="22" font-weight="400" fill="#94a3b8">
      tcgacademy.es · CIF B26979302
    </text>
  </g>

  <!-- detalle decorativo: cartas estilizadas -->
  <g transform="translate(${W - 320},${H - 480}) rotate(8)" opacity="0.92">
    <rect x="0" y="0" width="180" height="260" rx="14" fill="#1e1b4b" stroke="#a78bfa" stroke-width="3"/>
    <rect x="14" y="14" width="152" height="120" rx="6" fill="#312e81"/>
    <rect x="14" y="148" width="152" height="14" rx="3" fill="#a78bfa" opacity="0.8"/>
    <rect x="14" y="170" width="120" height="10" rx="3" fill="#a78bfa" opacity="0.5"/>
    <rect x="14" y="186" width="100" height="10" rx="3" fill="#a78bfa" opacity="0.5"/>
  </g>
  <g transform="translate(${W - 220},${H - 460}) rotate(-6)" opacity="0.92">
    <rect x="0" y="0" width="180" height="260" rx="14" fill="#0c4a6e" stroke="#22d3ee" stroke-width="3"/>
    <rect x="14" y="14" width="152" height="120" rx="6" fill="#155e75"/>
    <rect x="14" y="148" width="152" height="14" rx="3" fill="#22d3ee" opacity="0.8"/>
    <rect x="14" y="170" width="120" height="10" rx="3" fill="#22d3ee" opacity="0.5"/>
    <rect x="14" y="186" width="100" height="10" rx="3" fill="#22d3ee" opacity="0.5"/>
  </g>
</svg>`;

if (!existsSync(join(ROOT, "public"))) {
  mkdirSync(join(ROOT, "public"), { recursive: true });
}

const png = await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9, palette: false })
  .toBuffer();

writeFileSync(OUT, png);

const meta = await sharp(png).metadata();
console.log(`✓ ${OUT}`);
console.log(`  ${meta.width}×${meta.height}, ${(png.length / 1024).toFixed(1)} KB`);
