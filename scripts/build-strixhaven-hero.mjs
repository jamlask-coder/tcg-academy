// Genera slide-2-strixhaven-v6.webp (desktop) + v6-mobile.webp.
//
// v6 (2026-04-22) — rehecho desde cero tras feedback:
//   · Fuera el darkening radial sobre el logo MAGIC (quedaba feo como un
//     "parche" oscuro justo donde vive el título).
//   · Fuera el TCG shield baked + franja negra inferior con escudo. Las
//     tarjetas de juegos solapan ~45 % el hero desde abajo, por lo que
//     cualquier elemento colocado en la franja inferior queda tapado —
//     desperdicio de composición. El shield ya vive en la navbar.
//   · Extend vertical con mirror-blur del follaje inferior (no franja
//     artificial): crea una extensión natural del canopy para alcanzar
//     el aspect 2.6/1 que exige el container desktop.
//   · Mobile: crop horizontal preservando logo MAGIC + título STRIXHAVEN
//     + dos personajes principales (elfa + búho), dejando fuera el imp
//     rojo y el guerrero para que el aspect 1.78 quede limpio.
//
// Resultado:
//   · Desktop: 1885×725 (aspect 2.6 exacto)
//   · Mobile : 977×549  (aspect 1.78 exacto)
import sharp from "sharp";

const SRC = "public/images/hero/slide-2-strixhaven.webp";
const OUT_DESKTOP = "public/images/hero/slide-2-strixhaven-v6.webp";
const OUT_MOBILE = "public/images/hero/slide-2-strixhaven-v6-mobile.webp";

const meta = await sharp(SRC).metadata();
const W0 = meta.width; // 1885
const H0 = meta.height; // 597
console.log("source:", W0, "x", H0);

// ═══════════════════════════════════════════════════════════════════════
// DESKTOP: 1885×725 (aspect 2.6 exacto)
//   Estrategia: extend vertical bottom con mirror-blur del propio arte.
//   Tomamos los últimos ~80 px del arte (forest floor), los volteamos en
//   vertical, reescalamos a EXT_H, aplicamos blur suave y extendemos por
//   debajo. El ojo percibe el canopy continuando hacia el suelo en vez
//   de un corte con franja artificial.
// ═══════════════════════════════════════════════════════════════════════
const DESKTOP_W = W0;
const DESKTOP_H = Math.round(DESKTOP_W / 2.6); // 725
const EXT_H = DESKTOP_H - H0; // 128

const mirrorStrip = await sharp(SRC)
  .extract({ left: 0, top: H0 - 80, width: W0, height: 80 })
  .flip()
  .resize(W0, EXT_H, { fit: "fill" })
  .blur(14)
  .modulate({ brightness: 0.85 }) // ligeramente más oscuro que el arte, no negro
  .png()
  .toBuffer();

// Oscurecimiento gradual en los últimos ~60 px de la extensión para que
// si alguna sombra del card grid asoma por encima del solape, no haya
// banda clara visible. Transición suave, nunca banda negra dura.
const fadeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${DESKTOP_W}" height="${EXT_H}" viewBox="0 0 ${DESKTOP_W} ${EXT_H}">
  <defs>
    <linearGradient id="f" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="55%" stop-color="#050b08" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#050b08" stop-opacity="0.75"/>
    </linearGradient>
  </defs>
  <rect width="${DESKTOP_W}" height="${EXT_H}" fill="url(#f)"/>
</svg>`;
const fade = await sharp(Buffer.from(fadeSvg))
  .resize(DESKTOP_W, EXT_H, { fit: "fill" })
  .png()
  .toBuffer();

await sharp(SRC)
  .extend({
    top: 0,
    bottom: EXT_H,
    left: 0,
    right: 0,
    background: { r: 5, g: 11, b: 8, alpha: 1 },
  })
  .composite([
    { input: mirrorStrip, left: 0, top: H0, blend: "over" },
    { input: fade, left: 0, top: H0, blend: "over" },
  ])
  .webp({ quality: 92 })
  .toFile(OUT_DESKTOP);

const v6d = await sharp(OUT_DESKTOP).metadata();
console.log(
  "v6 desktop:",
  v6d.width,
  "x",
  v6d.height,
  "aspect:",
  (v6d.width / v6d.height).toFixed(3),
);

// ═══════════════════════════════════════════════════════════════════════
// MOBILE: 977×549 (aspect 1.78 exacto)
//   Estrategia distinta a desktop:
//     · Crop horizontal preservando logo MAGIC + título STRIXHAVEN +
//       elfa + búho (el imp rojo y el guerrero quedan fuera).
//     · Arte escalado a 977×450 y anclado arriba. Los 99 px inferiores
//       son una franja dedicada con mirror-blur del follaje + vignette
//       progresiva oscura, que aloja el CTA "Ver catálogo" en zona
//       limpia sin pisar título ni personajes.
//     · En móvil las tarjetas de juegos NO solapan el hero (layout
//       distinto a desktop), así que la franja inferior sí se ve.
// ═══════════════════════════════════════════════════════════════════════
const MOBILE_W = 977;
const MOBILE_H = 549;
const MOBILE_ART_H = 450; // arte escalado, deja 99 px abajo para CTA
const MOBILE_FOOTER_H = MOBILE_H - MOBILE_ART_H; // 99

// Ancho de crop en coords de fuente que mantiene el aspect del arte.
// Queremos que el crop a 977×MOBILE_ART_H preserve la aspect original
// del arte ⇒ cropW/cropH = 977/MOBILE_ART_H ⇒ cropW = 597 * 977/450.
const cropW = Math.round(H0 * (MOBILE_W / MOBILE_ART_H));
const cropX = 40;

const mobileArt = await sharp(SRC)
  .extract({ left: cropX, top: 0, width: cropW, height: H0 })
  .resize(MOBILE_W, MOBILE_ART_H, { kernel: "lanczos3" })
  .png()
  .toBuffer();

// Mirror-blur de la última franja del arte escalado → continuación
// natural del canopy en vez de banda negra artificial.
const mirrorMStrip = await sharp(mobileArt)
  .extract({ left: 0, top: MOBILE_ART_H - 60, width: MOBILE_W, height: 60 })
  .flip()
  .resize(MOBILE_W, MOBILE_FOOTER_H, { fit: "fill" })
  .blur(14)
  .modulate({ brightness: 0.7 })
  .png()
  .toBuffer();

// Oscurecimiento suave de la franja para contraste del CTA ámbar.
const footerFadeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MOBILE_W}" height="${MOBILE_FOOTER_H}" viewBox="0 0 ${MOBILE_W} ${MOBILE_FOOTER_H}">
  <defs>
    <linearGradient id="f" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="50%" stop-color="#050b08" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#050b08" stop-opacity="0.7"/>
    </linearGradient>
  </defs>
  <rect width="${MOBILE_W}" height="${MOBILE_FOOTER_H}" fill="url(#f)"/>
</svg>`;
const footerFade = await sharp(Buffer.from(footerFadeSvg))
  .resize(MOBILE_W, MOBILE_FOOTER_H, { fit: "fill" })
  .png()
  .toBuffer();

await sharp(mobileArt)
  .extend({
    top: 0,
    bottom: MOBILE_FOOTER_H,
    left: 0,
    right: 0,
    background: { r: 5, g: 11, b: 8, alpha: 1 },
  })
  .composite([
    { input: mirrorMStrip, left: 0, top: MOBILE_ART_H, blend: "over" },
    { input: footerFade, left: 0, top: MOBILE_ART_H, blend: "over" },
  ])
  .webp({ quality: 92 })
  .toFile(OUT_MOBILE);

const v6m = await sharp(OUT_MOBILE).metadata();
console.log(
  "v6 mobile:",
  v6m.width,
  "x",
  v6m.height,
  "aspect:",
  (v6m.width / v6m.height).toFixed(3),
);
