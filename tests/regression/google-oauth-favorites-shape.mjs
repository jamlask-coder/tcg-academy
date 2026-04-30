/**
 * Regression test — Google OAuth callback no debe crashear
 * ========================================================
 * Incidente 2026-04-30: el callback /auth/google/callback mostraba
 * "This page couldn't load" porque `/api/auth google-signin` devuelve un
 * userProfile sin `favorites`/`addresses`, AuthContext lo persistía crudo,
 * y FavoritesContext.tsx hacía `user.favorites.length` → TypeError que
 * tumbaba el árbol React entero.
 *
 * Fix doble (defensa en profundidad):
 *   1. AuthContext.loginWithGoogle: hidrata favorites/addresses (igual que
 *      el login con email/password) antes de persist().
 *   2. FavoritesContext: `user.favorites ?? []` para que un user con
 *      favorites undefined nunca crashee.
 *
 * Este test es estático: si alguien revierte alguna de las 2 capas, falla.
 *
 * Run with: node tests/regression/google-oauth-favorites-shape.mjs
 */
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(fileURLToPath(import.meta.url), "../../..");

let passed = 0;
let failed = 0;
const failures = [];

function run(name, fn) {
  try {
    const result = fn();
    if (result === false) throw new Error("check returned false");
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗  ${name}`);
    console.error(`       ${e.message}`);
    failed++;
    failures.push({ name, error: e.message });
  }
}

const authCtx = readFileSync(
  join(ROOT, "src/context/AuthContext.tsx"),
  "utf8",
);
const favCtx = readFileSync(
  join(ROOT, "src/context/FavoritesContext.tsx"),
  "utf8",
);

console.log("Google OAuth favorites shape — regression");

run("AuthContext.loginWithGoogle hidrata favorites antes de persist", () => {
  // Localizar el bloque server-mode de loginWithGoogle (caso IS_SERVER_MODE).
  const idx = authCtx.indexOf('action: "google-signin"');
  if (idx === -1) throw new Error('no se encuentra action: "google-signin"');
  // Tomar 1500 chars desde ahí — el persist() debería caer dentro.
  const slice = authCtx.slice(idx, idx + 1800);
  if (!/favorites:\s*cachedExtras\.favorites\s*\?\?\s*\[\]/.test(slice)) {
    throw new Error(
      "no se encuentra `favorites: cachedExtras.favorites ?? []` tras google-signin",
    );
  }
  if (!/addresses:\s*cachedExtras\.addresses\s*\?\?\s*\[\]/.test(slice)) {
    throw new Error(
      "no se encuentra `addresses: cachedExtras.addresses ?? []` tras google-signin",
    );
  }
  // Y debe persist(merged), NO persist(data.user), porque persist(data.user)
  // re-introduciría el bug.
  const persistMatch = slice.match(/persist\(([^,)]+)/);
  if (!persistMatch) throw new Error("no se encuentra persist() en bloque google-signin");
  const arg = persistMatch[1].trim();
  if (arg === "data.user") {
    throw new Error(
      "loginWithGoogle persiste data.user crudo — re-introduce el bug",
    );
  }
});

run("FavoritesContext defaults user.favorites a [] (defensa en profundidad)", () => {
  // Debe haber un fallback `?? []` en la línea que deriva ids.
  if (!/user\.favorites\s*\?\?\s*\[\]/.test(favCtx)) {
    throw new Error(
      "no se encuentra `user.favorites ?? []` — quitar el default re-expone el crash",
    );
  }
  // Y la lectura inline de user.favorites.includes en useEffect también
  // debe ir blindada con un default local.
  const merge = favCtx.match(/const userFavs = user\.favorites \?\? \[\];/);
  if (!merge) {
    throw new Error(
      "el merge de favoritos en useEffect no usa `user.favorites ?? []` — crashea si user llega sin favorites",
    );
  }
});

run("Mensaje del incidente conservado en el comentario", () => {
  // Si alguien reescribe el comentario perdiendo la referencia, queremos
  // saberlo: el "porqué" es vital para futuros reviewers.
  if (!/2026-04-30|OAuth/.test(favCtx)) {
    throw new Error(
      "el comentario que explica el incidente OAuth ha desaparecido",
    );
  }
});

console.log("");
console.log(`  ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log("");
  console.log("Failures:");
  for (const f of failures) {
    console.log(`  - ${f.name}: ${f.error}`);
  }
  process.exit(1);
}
