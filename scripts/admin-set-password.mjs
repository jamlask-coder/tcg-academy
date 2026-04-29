/**
 * Script one-off: cambia la contraseña de un usuario por email.
 *
 *   node scripts/admin-set-password.mjs <email> <newPassword>
 *
 * Usa bcryptjs (mismo algoritmo que `hashPassword` en src/lib/auth.ts) y
 * escribe directamente en la columna `password_hash` vía service role.
 * Idempotente: ejecutar dos veces produce el mismo resultado funcional
 * (hash distinto pero login con la misma contraseña).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const [, , emailArg, passwordArg] = process.argv;
if (!emailArg || !passwordArg) {
  console.error("Uso: node scripts/admin-set-password.mjs <email> <newPassword>");
  process.exit(1);
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: user, error: e1 } = await sb
  .from("users")
  .select("id, email, role")
  .ilike("email", emailArg)
  .maybeSingle();

if (e1) {
  console.error("Error leyendo:", e1.message);
  process.exit(1);
}
if (!user) {
  console.error(`No existe usuario ${emailArg}`);
  process.exit(1);
}

// BCRYPT_ROUNDS=13 — mismo coste que src/lib/auth.ts::hashPassword.
const hash = await bcrypt.hash(passwordArg, 13);

const { error: e2 } = await sb
  .from("users")
  .update({ password_hash: hash, updated_at: new Date().toISOString() })
  .eq("id", user.id);

if (e2) {
  console.error("Error update:", e2.message);
  process.exit(1);
}
console.log(`OK contraseña actualizada para ${user.email} (id=${user.id}, role=${user.role})`);
