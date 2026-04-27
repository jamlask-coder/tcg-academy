/**
 * Promociona `ricardoluri@gmail.com` a admin en Supabase.
 *
 *   node scripts/promote-admin.mjs
 *
 * Idempotente: si ya es admin, no hace nada.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const TARGET_EMAIL = "ricardoluri@gmail.com";

const { data: before, error: e1 } = await sb
  .from("users")
  .select("id, email, role")
  .eq("email", TARGET_EMAIL)
  .maybeSingle();

if (e1) {
  console.error("Error leyendo:", e1.message);
  process.exit(1);
}
if (!before) {
  console.error(`No existe usuario ${TARGET_EMAIL}`);
  process.exit(1);
}

if (before.role === "admin") {
  console.log(`✓ ${TARGET_EMAIL} ya es admin (id=${before.id})`);
  process.exit(0);
}

const { error: e2 } = await sb
  .from("users")
  .update({ role: "admin", updated_at: new Date().toISOString() })
  .eq("id", before.id);

if (e2) {
  console.error("Error update:", e2.message);
  process.exit(1);
}
console.log(`✓ ${TARGET_EMAIL} promocionado de "${before.role}" → "admin"`);
