// Genera slide-2-strixhaven-v5.webp (desktop) + v5-mobile.webp.
//
// Filosofía de diseño (2026-04-21, feedback explícito del usuario):
//   - NUNCA colocar el escudo TCG sobre personajes o elementos del arte.
//   - Crear una ZONA DEDICADA oscura (franja inferior tipo "footer") para
//     alojar el escudo + CTA con contraste máximo y cero colisión.
//   - Mobile y desktop comparten filosofía pero tienen dimensiones y
//     posicionamientos distintos (cada viewport tiene su imagen ideal).
//
// Layout resultante (común a ambos):
//   ┌──────────────────────────────┐
//   │                              │
//   │   ARTE ORIGINAL STRIXHAVEN   │  ← zona intocable: personajes + título
//   │                              │
//   ├──────────────────────────────┤  ← transición suavizada (gradiente)
//   │  [CTA]              [ESCUDO] │  ← franja oscura dedicada
//   └──────────────────────────────┘
//
// Desktop: canvas 1885×725 (aspect 2.6 exacto = match container desktop).
// Mobile:  canvas 977×685  (aspect 1.78 exacto sobre arte de 977×549 y
//          franja 136px; toda la altura adicional es fondo dedicado).
import sharp from "sharp";

const SRC = "public/images/hero/slide-2-strixhaven.webp";
const SHIELD = "public/images/logo-tcg-shield.png";
const OUT_DESKTOP = "public/images/hero/slide-2-strixhaven-v5.webp";
const OUT_MOBILE = "public/images/hero/slide-2-strixhaven-v5-mobile.webp";

const meta = await sharp(SRC).metadata();
const W0 = meta.width;
const H0 = meta.height;
console.log("original:", W0, "x", H0);

// Trim canopy superior (48px) para compactar.
const artH = H0 - 48;
const artBuf = await sharp(SRC)
  .extract({ left: 0, top: 48, width: W0, height: artH })
  .png()
  .toBuffer();

// Oscurecimiento sobre planeswalker shield original (esquina superior
// izquierda del arte) — evita colisión con el título MAGIC al crear
// sombra suave que el título "respira" por encima.
const darkenTopLeftSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W0}" height="${artH}" viewBox="0 0 ${W0} ${artH}">
  <defs>
    <radialGradient id="g1" cx="9%" cy="18%" r="13%" fx="8%" fy="16%">
      <stop offset="0%" stop-color="#000" stop-opacity="0.88"/>
      <stop offset="55%" stop-color="#000" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W0}" height="${artH}" fill="url(#g1)"/>
</svg>`;

const artDarkened = await sharp(artBuf)
  .composite([
    {
      input: await sharp(Buffer.from(darkenTopLeftSvg))
        .resize(W0, artH, { fit: "fill" })
        .png()
        .toBuffer(),
      blend: "over",
    },
  ])
  .png()
  .toBuffer();

// Preparar escudo a dos tamaños (desktop / mobile).
const shieldMeta = await sharp(SHIELD).metadata();

async function makeShield(targetW) {
  const h = Math.round(shieldMeta.height * (targetW / shieldMeta.width));
  const scaled = await sharp(SHIELD)
    .resize(targetW, h, { kernel: "lanczos3" })
    .png()
    .toBuffer();
  // Halo ámbar suave detrás (screen blend = solo aclara).
  const haloSize = Math.round(targetW * 1.7);
  const haloSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${haloSize}" height="${haloSize}" viewBox="0 0 ${haloSize} ${haloSize}">
    <defs>
      <radialGradient id="halo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.5"/>
        <stop offset="40%" stop-color="#f59e0b" stop-opacity="0.22"/>
        <stop offset="75%" stop-color="#b45309" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${haloSize}" height="${haloSize}" fill="url(#halo)"/>
  </svg>`;
  const halo = await sharp(Buffer.from(haloSvg)).png().toBuffer();
  return { scaled, halo, w: targetW, h, haloSize };
}

// ═══════════════════════════════════════════════════════════════════════
// DESKTOP: 1885×725 (aspect 2.6 exacto del container desktop)
// ═══════════════════════════════════════════════════════════════════════
const DESKTOP_W = W0; // 1885
const DESKTOP_H = Math.round(DESKTOP_W / 2.6); // 725
const EXT_H_D = DESKTOP_H - artH; // 176

// Franja oscura inferior: color base + gradiente de transición arte→franja.
// Colores: #0a1812 (verde muy oscuro, liga con forest floor) a #020604.
const footerBgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${DESKTOP_W}" height="${EXT_H_D}" viewBox="0 0 ${DESKTOP_W} ${EXT_H_D}">
  <defs>
    <linearGradient id="f" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0a1812" stop-opacity="1"/>
      <stop offset="60%" stop-color="#050b08" stop-opacity="1"/>
      <stop offset="100%" stop-color="#020604" stop-opacity="1"/>
    </linearGradient>
    <!-- Acento sutil amber en el lateral del shield para atar todo -->
    <radialGradient id="amberGlow" cx="87%" cy="50%" r="28%">
      <stop offset="0%" stop-color="#78350f" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#78350f" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${DESKTOP_W}" height="${EXT_H_D}" fill="url(#f)"/>
  <rect width="${DESKTOP_W}" height="${EXT_H_D}" fill="url(#amberGlow)"/>
</svg>`;
const footerD = await sharp(Buffer.from(footerBgSvg))
  .resize(DESKTOP_W, EXT_H_D, { fit: "fill" })
  .png()
  .toBuffer();

// Gradiente de transición (40px arte → 40px franja) para fundir el borde.
const transitionSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${DESKTOP_W}" height="80" viewBox="0 0 ${DESKTOP_W} 80">
  <defs>
    <linearGradient id="t" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="50%" stop-color="#0a1812" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#0a1812" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="${DESKTOP_W}" height="80" fill="url(#t)"/>
</svg>`;
const transitionD = await sharp(Buffer.from(transitionSvg))
  .resize(DESKTOP_W, 80, { fit: "fill" })
  .png()
  .toBuffer();

// Canvas final desktop: arte en top, franja en bottom, transición empalmada.
// Usamos extend() para añadir la franja, luego compositamos transición + shield.
const desktopBase = await sharp(artDarkened)
  .extend({
    top: 0,
    bottom: EXT_H_D,
    left: 0,
    right: 0,
    background: { r: 10, g: 24, b: 18, alpha: 1 },
  })
  .composite([
    // Franja oscura completa sobre la zona extendida
    { input: footerD, left: 0, top: artH, blend: "over" },
    // Transición suave arte→franja
    { input: transitionD, left: 0, top: artH - 40, blend: "over" },
  ])
  .png()
  .toBuffer();

// Escudo desktop: ~11% del ancho canvas (≈ 210px). Cabe holgado en franja 176.
const shieldD = await makeShield(Math.round(DESKTOP_W * 0.11));
const shieldDx = DESKTOP_W - shieldD.w - Math.round(DESKTOP_W * 0.05);
const shieldDy = artH + Math.round((EXT_H_D - shieldD.h) / 2);
const haloDx = shieldDx + Math.round((shieldD.w - shieldD.haloSize) / 2);
const haloDy = shieldDy + Math.round((shieldD.h - shieldD.haloSize) / 2);

await sharp(desktopBase)
  .composite([
    { input: shieldD.halo, left: haloDx, top: haloDy, blend: "screen" },
    { input: shieldD.scaled, left: shieldDx, top: shieldDy, blend: "over" },
  ])
  .webp({ quality: 92 })
  .toFile(OUT_DESKTOP);

const v5d = await sharp(OUT_DESKTOP).metadata();
console.log(
  "v5 desktop:",
  v5d.width,
  "x",
  v5d.height,
  "aspect:",
  (v5d.width / v5d.height).toFixed(3),
  "shield:",
  shieldD.w + "x" + shieldD.h,
  "@",
  shieldDx + "," + shieldDy,
);

// ═══════════════════════════════════════════════════════════════════════
// MOBILE: 977×549 (aspect 1.78 exacto del container móvil 16:9)
//   Estrategia: NO extender vertical (rompería aspect). En su lugar,
//   re-crop del arte para dejar ~120px inferiores que se reemplazan por
//   una franja oscura (degradado desde forest floor para continuidad).
// ═══════════════════════════════════════════════════════════════════════
const MOBILE_W = 977;
const MOBILE_H = 549;
const MOBILE_ART_H = 430; // 78% del alto → arte
const MOBILE_FOOTER_H = MOBILE_H - MOBILE_ART_H; // 119

// Crop del arte (de artDarkened): tomamos left=100 para quitar algo de
// planeswalker y centrar sobre título+personajes. Tomamos todo el alto
// y luego lo re-escalamos a MOBILE_ART_H manteniendo ancho.
const mobileArtRaw = await sharp(artDarkened)
  .extract({ left: 100, top: 0, width: MOBILE_W, height: artH })
  .png()
  .toBuffer();
// Escala para que encaje en MOBILE_ART_H sin distorsión (ratio cambia —
// ajustamos top-crop para mantener lo importante: título + caras).
const mobileArtScaled = await sharp(mobileArtRaw)
  .resize(MOBILE_W, MOBILE_ART_H, { fit: "cover", position: "top" })
  .png()
  .toBuffer();

// Franja oscura mobile (más pequeña que desktop proporcionalmente).
const footerMSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MOBILE_W}" height="${MOBILE_FOOTER_H}" viewBox="0 0 ${MOBILE_W} ${MOBILE_FOOTER_H}">
  <defs>
    <linearGradient id="f" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0a1812" stop-opacity="1"/>
      <stop offset="60%" stop-color="#050b08" stop-opacity="1"/>
      <stop offset="100%" stop-color="#020604" stop-opacity="1"/>
    </linearGradient>
    <radialGradient id="amberGlow" cx="20%" cy="55%" r="32%">
      <stop offset="0%" stop-color="#78350f" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#78350f" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${MOBILE_W}" height="${MOBILE_FOOTER_H}" fill="url(#f)"/>
  <rect width="${MOBILE_W}" height="${MOBILE_FOOTER_H}" fill="url(#amberGlow)"/>
</svg>`;
const footerM = await sharp(Buffer.from(footerMSvg))
  .resize(MOBILE_W, MOBILE_FOOTER_H, { fit: "fill" })
  .png()
  .toBuffer();

// Transición arte→franja mobile (50px de fundido).
const transitionMSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MOBILE_W}" height="50" viewBox="0 0 ${MOBILE_W} 50">
  <defs>
    <linearGradient id="t" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#0a1812" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="${MOBILE_W}" height="50" fill="url(#t)"/>
</svg>`;
const transitionM = await sharp(Buffer.from(transitionMSvg))
  .resize(MOBILE_W, 50, { fit: "fill" })
  .png()
  .toBuffer();

// Canvas mobile: arte + franja. Empezamos con arte, extendemos abajo con
// fondo oscuro, compositamos franja y transición.
const mobileBase = await sharp(mobileArtScaled)
  .extend({
    top: 0,
    bottom: MOBILE_FOOTER_H,
    left: 0,
    right: 0,
    background: { r: 10, g: 24, b: 18, alpha: 1 },
  })
  .composite([
    { input: footerM, left: 0, top: MOBILE_ART_H, blend: "over" },
    { input: transitionM, left: 0, top: MOBILE_ART_H - 25, blend: "over" },
  ])
  .png()
  .toBuffer();

// Escudo mobile: en el lado OPUESTO al CTA. CTA móvil está en left-1/2
// translate-x -1/2 (centrado). Escudo a la derecha de la franja para
// composición balanceada (CTA al centro, escudo derecho).
const shieldM = await makeShield(Math.round(MOBILE_W * 0.12)); // ≈ 117
const shieldMx = MOBILE_W - shieldM.w - Math.round(MOBILE_W * 0.05);
const shieldMy = MOBILE_ART_H + Math.round((MOBILE_FOOTER_H - shieldM.h) / 2);
const haloMx = shieldMx + Math.round((shieldM.w - shieldM.haloSize) / 2);
const haloMy = shieldMy + Math.round((shieldM.h - shieldM.haloSize) / 2);

await sharp(mobileBase)
  .composite([
    { input: shieldM.halo, left: haloMx, top: haloMy, blend: "screen" },
    { input: shieldM.scaled, left: shieldMx, top: shieldMy, blend: "over" },
  ])
  .webp({ quality: 92 })
  .toFile(OUT_MOBILE);

const v5m = await sharp(OUT_MOBILE).metadata();
console.log(
  "v5 mobile:",
  v5m.width,
  "x",
  v5m.height,
  "aspect:",
  (v5m.width / v5m.height).toFixed(3),
  "shield:",
  shieldM.w + "x" + shieldM.h,
  "@",
  shieldMx + "," + shieldMy,
);
