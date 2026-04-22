#!/usr/bin/env node
/**
 * Pre-deploy checklist para TCG Academy.
 *
 * Verifica que el entorno y los assets estén preparados para que la web
 * funcione como tienda real al subirla a un servidor. Sale con código ≠ 0
 * si falta algún BLOQUEANTE.
 *
 * Categorías:
 *   - BLOQUEANTE : sin esto la tienda no opera (pagos, DB, email, sesiones)
 *   - RECOMENDADO: la web funciona pero pierde funcionalidad o visibilidad
 *   - OPCIONAL   : deseable pero no crítico
 *
 * Uso:
 *   npm run preflight
 *   npm run preflight -- --strict     (trata RECOMENDADOS como bloqueantes)
 *
 * El script es read-only: no modifica ningún archivo, solo reporta.
 */

import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(process.cwd());
const STRICT = process.argv.includes("--strict");

// ── Utilidades de color (ANSI, sin deps) ─────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

// ── Parseo del .env.local ────────────────────────────────────────────────────
function loadEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const raw = readFileSync(filePath, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const env = loadEnv(join(ROOT, ".env.local"));

// ── Helpers de chequeo ───────────────────────────────────────────────────────
const results = []; // { level, id, title, status: "pass"|"fail"|"warn", detail }

function check(level, id, title, fn) {
  try {
    const r = fn();
    if (r === true) {
      results.push({ level, id, title, status: "pass" });
    } else if (typeof r === "string") {
      results.push({ level, id, title, status: "fail", detail: r });
    } else if (r && typeof r === "object") {
      results.push({ level, id, title, status: r.status, detail: r.detail });
    } else {
      results.push({ level, id, title, status: "fail", detail: "check devolvió valor inesperado" });
    }
  } catch (err) {
    results.push({ level, id, title, status: "fail", detail: err.message });
  }
}

function nonEmpty(key) {
  const v = env[key];
  return typeof v === "string" && v.trim().length > 0;
}

function fileExists(relPath) {
  try {
    return statSync(join(ROOT, relPath)).isFile();
  } catch {
    return false;
  }
}

function readIfExists(relPath) {
  const p = join(ROOT, relPath);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUEANTES — sin esto no hay tienda
// ══════════════════════════════════════════════════════════════════════════════

check("BLOQUEANTE", "env-local", ".env.local existe", () => {
  return existsSync(join(ROOT, ".env.local")) || "falta el archivo .env.local en la raíz";
});

check("BLOQUEANTE", "backend-mode", "NEXT_PUBLIC_BACKEND_MODE = server", () => {
  const mode = env.NEXT_PUBLIC_BACKEND_MODE;
  if (!mode) return 'variable ausente — en producción debe valer "server" (ahora se resuelve a "local" y todo va a localStorage del navegador)';
  if (mode !== "server") return `está en "${mode}" — los pedidos/usuarios/facturas no persisten en BD`;
  return true;
});

check("BLOQUEANTE", "session-secret", "SESSION_SECRET válido (≥32 chars)", () => {
  const s = env.SESSION_SECRET;
  if (!s) return "ausente — src/lib/auth.ts lanzará error en runtime al firmar JWT";
  if (s.length < 32) return `solo tiene ${s.length} caracteres (se exigen ≥32)`;
  return true;
});

check("BLOQUEANTE", "supabase", "Supabase (3 variables) configurado", () => {
  if (env.NEXT_PUBLIC_BACKEND_MODE !== "server") {
    return { status: "warn", detail: "no se comprueba porque BACKEND_MODE ≠ server" };
  }
  const missing = [];
  if (!nonEmpty("NEXT_PUBLIC_SUPABASE_URL")) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!nonEmpty("NEXT_PUBLIC_SUPABASE_ANON_KEY")) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!nonEmpty("SUPABASE_SERVICE_ROLE_KEY")) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing.length ? `faltan: ${missing.join(", ")}` : true;
});

check("BLOQUEANTE", "email", "Proveedor de email configurado", () => {
  if (nonEmpty("RESEND_API_KEY")) return true;
  if (nonEmpty("SMTP_HOST") && nonEmpty("SMTP_USER") && nonEmpty("SMTP_PASS")) return true;
  return 'sin RESEND_API_KEY ni SMTP_* no se envían confirmaciones, resets de contraseña, ni alertas';
});

check("BLOQUEANTE", "payment", "Pasarela de pago configurada", () => {
  const hasStripe = nonEmpty("STRIPE_SECRET_KEY") && nonEmpty("STRIPE_WEBHOOK_SECRET");
  const hasRedsys = nonEmpty("REDSYS_MERCHANT_CODE") && nonEmpty("REDSYS_SECRET_KEY");
  if (hasStripe || hasRedsys) return true;
  return "ni Stripe ni Redsys configurados — POST /api/payments no puede cobrar";
});

check("BLOQUEANTE", "nextauth-url", "NEXTAUTH_URL apunta a producción", () => {
  const u = env.NEXTAUTH_URL;
  if (!u) return "ausente";
  if (/localhost|127\.0\.0\.1/.test(u)) return `está en ${u} — debería ser el dominio real (https://tcgacademy.es)`;
  if (!/^https:/i.test(u)) return `no es HTTPS: ${u}`;
  return true;
});

check("BLOQUEANTE", "asset-og", "public/og-default.png (imagen para compartir en redes)", () => {
  return fileExists("public/og-default.png") || "falta — referenciada en metadata raíz, dará 404 al compartir en Twitter/WhatsApp/Facebook";
});

check("BLOQUEANTE", "asset-logo", "public/logo.png (logo para Organization schema)", () => {
  return fileExists("public/logo.png") || "falta — referenciado en organizationJsonLd() de src/lib/seo.ts";
});

check("BLOQUEANTE", "asset-favicon", "public/favicon.ico", () => {
  return (
    fileExists("public/favicon.ico") ||
    fileExists("src/app/favicon.ico") ||
    "ninguna versión encontrada — navegadores mostrarán icono en blanco"
  );
});

check("BLOQUEANTE", "next-build", "Último build de Next.js completado (.next/ existe)", () => {
  if (!existsSync(join(ROOT, ".next"))) return "no hay carpeta .next/ — ejecuta `npm run build` antes de desplegar";
  const manifest = join(ROOT, ".next/BUILD_ID");
  if (!existsSync(manifest)) return "carpeta .next/ existe pero sin BUILD_ID — build incompleto";
  return true;
});

// ══════════════════════════════════════════════════════════════════════════════
// RECOMENDADOS — la web funciona pero pierde piezas
// ══════════════════════════════════════════════════════════════════════════════

check("RECOMENDADO", "verifactu-mode", "VeriFactu no está en modo off", () => {
  const file = readIfExists("src/config/verifactuConfig.ts");
  if (!file) return "no se puede leer verifactuConfig.ts";
  const match = file.match(/mode:\s*"([^"]+)"/);
  if (!match) return "no se detecta el campo mode";
  const mode = match[1];
  if (mode === "off") {
    return 'mode = "off" — las facturas se generan localmente pero no se envían a la AEAT. Obligatorio según el volumen anual (RD 1007/2023)';
  }
  if (mode === "mock") {
    return { status: "warn", detail: 'mode = "mock" — solo simulación, no hay envío real a AEAT' };
  }
  if (mode === "sandbox") {
    return { status: "warn", detail: 'mode = "sandbox" — pruebas del proveedor, aún no producción' };
  }
  return true; // production
});

check("RECOMENDADO", "cron-secret", "CRON_SECRET (histórico diario de precios)", () => {
  return nonEmpty("CRON_SECRET") || "sin CRON_SECRET, /api/cron/price-snapshot queda expuesto o inactivo";
});

check("RECOMENDADO", "stores-geo", "Coordenadas geo rellenadas en las 4 tiendas", () => {
  const src = readIfExists("src/data/stores.ts");
  if (!src) return "no se puede leer src/data/stores.ts";
  const storeIds = ["calpe", "madrid", "barcelona", "bejar"];
  const missing = [];
  for (const id of storeIds) {
    // Busca el bloque de cada tienda y comprueba que tenga geo: { ... }
    const blockRegex = new RegExp(`${id}:\\s*\\{[\\s\\S]*?\\n\\s*\\}`, "m");
    const block = src.match(blockRegex)?.[0] ?? "";
    if (!/geo:\s*\{\s*lat:/.test(block)) missing.push(id);
  }
  return missing.length === 0
    ? true
    : `sin geo: ${missing.join(", ")} — Google Maps no enriquecerá resultados locales`;
});

check("RECOMENDADO", "node-version", "Node.js ≥ 18.17 (requisito Next.js 15)", () => {
  const v = process.versions.node.split(".").map(Number);
  const ok = v[0] > 18 || (v[0] === 18 && v[1] >= 17);
  return ok || `Node ${process.versions.node} — Next.js 15 exige ≥ 18.17`;
});

// ══════════════════════════════════════════════════════════════════════════════
// OPCIONALES — mejoran funcionalidad específica
// ══════════════════════════════════════════════════════════════════════════════

check("OPCIONAL", "tcgplayer", "TCGPLAYER_* (histórico precios One Piece / Dragon Ball / Lorcana / Riftbound)", () => {
  return (nonEmpty("TCGPLAYER_PUBLIC_KEY") && nonEmpty("TCGPLAYER_PRIVATE_KEY")) ||
    "sin estas claves, solo Magic/YGO/Pokémon tendrán gráfico histórico";
});

check("OPCIONAL", "pokemon-key", "POKEMON_TCG_API_KEY (rate limit pokemontcg.io)", () => {
  return nonEmpty("POKEMON_TCG_API_KEY") || "sin clave, la API de Pokémon limita a ~1000 peticiones/día";
});

check("OPCIONAL", "google-oauth", "NEXT_PUBLIC_GOOGLE_CLIENT_ID", () => {
  return nonEmpty("NEXT_PUBLIC_GOOGLE_CLIENT_ID") || "sin esto, el botón 'Entrar con Google' no funciona";
});

// ── Assets referenciados en el código deben existir en /public ───────────────
// Tras el incidente f7669b4 (borrado masivo de PNGs sin limpiar referencias)
// añadimos esta barrera: cualquier string "/images/..." literal en src/ debe
// corresponder a un archivo real. Se saltan las referencias dinámicas (con `${}`
// o variables) porque no son resolvibles estáticamente.
check("BLOQUEANTE", "assets-dangling", "Ningún <img src> rota (assets en /public existen)", () => {
  function walk(dir, acc = []) {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      if (name.name === "node_modules" || name.name === ".next" || name.name.startsWith(".")) continue;
      const full = join(dir, name.name);
      if (name.isDirectory()) walk(full, acc);
      else if (/\.(tsx?|jsx?|mjs|mts)$/.test(name.name)) acc.push(full);
    }
    return acc;
  }
  const files = walk(join(ROOT, "src"));
  const re = /["'`](\/images\/[^"'`$?{}\s]+)(?:\?[^"'`$]*)?["'`]/g;
  const missing = new Set();
  for (const f of files) {
    let content;
    try { content = readFileSync(f, "utf8"); } catch { continue; }
    for (const m of content.matchAll(re)) {
      const path = m[1];
      const full = join(ROOT, "public", path);
      if (!existsSync(full)) missing.add(path);
    }
  }
  if (missing.size === 0) return true;
  return `${missing.size} asset(s) rotos: ${[...missing].slice(0, 5).join(", ")}${missing.size > 5 ? "…" : ""}`;
});

// ══════════════════════════════════════════════════════════════════════════════
// Informe
// ══════════════════════════════════════════════════════════════════════════════

function formatLine(r) {
  const icon =
    r.status === "pass" ? `${c.green}✓${c.reset}` :
    r.status === "warn" ? `${c.yellow}⚠${c.reset}` :
    `${c.red}✗${c.reset}`;
  const title = r.status === "pass" ? `${c.gray}${r.title}${c.reset}` : r.title;
  const detail = r.detail ? `\n    ${c.dim}↳ ${r.detail}${c.reset}` : "";
  return `  ${icon} ${title}${detail}`;
}

function printSection(level, colorFn) {
  const items = results.filter((r) => r.level === level);
  if (items.length === 0) return;
  console.log(`\n${colorFn(c.bold + level + c.reset)}`);
  for (const r of items) console.log(formatLine(r));
}

console.log(`${c.bold}${c.cyan}━━━ TCG Academy · Pre-deploy checklist ━━━${c.reset}`);
console.log(`${c.dim}Modo: ${STRICT ? "strict (los RECOMENDADOS también bloquean)" : "normal"}${c.reset}`);

printSection("BLOQUEANTE", (t) => `${c.red}${t}`);
printSection("RECOMENDADO", (t) => `${c.yellow}${t}`);
printSection("OPCIONAL", (t) => `${c.cyan}${t}`);

// ── Resumen ──────────────────────────────────────────────────────────────────
const counts = { pass: 0, warn: 0, fail: 0 };
const blockingFails = [];
const recommendedFails = [];
for (const r of results) {
  counts[r.status]++;
  if (r.status === "fail" && r.level === "BLOQUEANTE") blockingFails.push(r);
  if (r.status === "fail" && r.level === "RECOMENDADO") recommendedFails.push(r);
}

console.log(`\n${c.bold}Resumen${c.reset}`);
console.log(`  ${c.green}${counts.pass} OK${c.reset}   ${c.yellow}${counts.warn} warn${c.reset}   ${c.red}${counts.fail} fallos${c.reset}`);

const strictTripwire = STRICT && recommendedFails.length > 0;
const shouldFail = blockingFails.length > 0 || strictTripwire;

if (shouldFail) {
  console.log(`\n${c.red}${c.bold}✗ No subas la web todavía.${c.reset}`);
  if (blockingFails.length > 0) {
    console.log(`${c.red}Faltan ${blockingFails.length} bloqueante(s):${c.reset}`);
    for (const r of blockingFails) console.log(`  • ${r.title}`);
  }
  if (strictTripwire) {
    console.log(`${c.yellow}En modo --strict, también fallan ${recommendedFails.length} recomendado(s).${c.reset}`);
  }
  process.exit(1);
} else {
  console.log(`\n${c.green}${c.bold}✓ La web está lista para desplegar.${c.reset}`);
  if (counts.warn > 0 || recommendedFails.length > 0) {
    console.log(`${c.yellow}Revisa los warnings/recomendados antes de producción real.${c.reset}`);
  }
  process.exit(0);
}
