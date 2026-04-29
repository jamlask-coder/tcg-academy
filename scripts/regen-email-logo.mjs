/**
 * Regenera src/data/emailAssets.ts con el escudo embebido como data URI.
 *
 * Por qué embebido y no URL externa:
 *   - El host actual de tcgacademy.es no sirve /images/* en producción
 *     (devuelve 404), lo que rompía el <img> en los emails.
 *   - Usar data URI hace que el logo viaje DENTRO del email y no dependa
 *     de que el deploy sirva ese asset.
 *
 * Cuándo ejecutar:
 *   - Tras cambiar `public/images/logo-tcg-shield-trimmed.png`.
 *
 * Uso:
 *   node scripts/regen-email-logo.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const PNG_PATH = path.join(repoRoot, "public/images/logo-tcg-shield-trimmed.png");
const OUT_PATH = path.join(repoRoot, "src/data/emailAssets.ts");

if (!fs.existsSync(PNG_PATH)) {
  console.error("✘ No existe", PNG_PATH);
  process.exit(1);
}

const buf = fs.readFileSync(PNG_PATH);
const b64 = buf.toString("base64");

const banner = `// AUTO-GENERADO — regenerar con: node scripts/regen-email-logo.mjs
// Fuente: public/images/logo-tcg-shield-trimmed.png
// Por qué data URI y no URL externa: el host actual de tcgacademy.es no sirve
// /images/* (404), así que el logo se incrusta para que no dependa del deploy.
`;

const content = `${banner}
export const SHIELD_DATA_URI = "data:image/png;base64,${b64}";
`;

fs.writeFileSync(OUT_PATH, content);
console.log(`✓ ${OUT_PATH}`);
console.log(`  PNG: ${buf.length} bytes → base64: ${b64.length} chars`);
