/**
 * Checklist pre-flip BACKEND_MODE=server.
 *
 *   node scripts/check-server-readiness.mjs
 *
 * Verifica:
 *  - Conexión a Supabase OK
 *  - Tabla `users` con al menos 1 admin
 *  - Tabla `products` con al menos 1 producto
 *  - Buckets storage `product-images` + `hero-images`
 *  - Variables de entorno críticas presentes
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const envPath = path.join(repoRoot, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const checks = [];
function ok(msg) {
  checks.push({ ok: true, msg });
  console.log(`✓ ${msg}`);
}
function fail(msg) {
  checks.push({ ok: false, msg });
  console.log(`✗ ${msg}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  fail("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
ok("Credenciales Supabase presentes");

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  fail("SESSION_SECRET ausente o < 32 chars (auth JWT no funcionará)");
} else {
  ok("SESSION_SECRET OK (>= 32 chars)");
}

if (!process.env.RESEND_API_KEY) {
  fail("RESEND_API_KEY ausente — emails fallarán");
} else {
  ok("RESEND_API_KEY presente");
}

const sb = createClient(url, key, { auth: { persistSession: false } });

// 1. Productos seedeados
const { count: productsCount, error: pErr } = await sb
  .from("products")
  .select("*", { count: "exact", head: true });
if (pErr) fail(`Tabla products: ${pErr.message}`);
else if ((productsCount ?? 0) === 0) fail("Tabla products vacía — ejecutar `node scripts/seed-supabase.mjs`");
else ok(`Tabla products: ${productsCount} filas`);

// 2. Admin user
const { data: admins, error: aErr } = await sb
  .from("users")
  .select("id, email, role")
  .eq("role", "admin");
if (aErr) fail(`Tabla users: ${aErr.message}`);
else if (!admins || admins.length === 0)
  fail("Sin admins en tabla users — registrarse + UPDATE users SET role='admin' WHERE email='...'");
else ok(`Admins: ${admins.map((a) => a.email).join(", ")}`);

// 3. Buckets
const { data: buckets, error: bErr } = await sb.storage.listBuckets();
if (bErr) fail(`Storage listBuckets: ${bErr.message}`);
else {
  const names = (buckets ?? []).map((b) => b.name);
  for (const need of ["product-images", "hero-images"]) {
    if (names.includes(need)) ok(`Bucket ${need} OK`);
    else fail(`Bucket ${need} ausente`);
  }
}

// 4. Tablas críticas
const criticalTables = [
  "users",
  "products",
  "categories",
  "orders",
  "order_items",
  "carts",
  "cart_items",
  "invoices",
  "messages",
  "notifications",
  "incidents",
  "complaints",
  "solicitudes",
];
for (const t of criticalTables) {
  const { error } = await sb.from(t).select("*", { count: "exact", head: true });
  if (error) fail(`Tabla ${t}: ${error.message}`);
  else ok(`Tabla ${t} OK`);
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} OK`);
if (failed.length > 0) {
  console.log("\n⚠ Bloqueadores:");
  for (const f of failed) console.log(`  - ${f.msg}`);
  process.exit(1);
}
console.log("\n✓ Listo para flip BACKEND_MODE=server");
