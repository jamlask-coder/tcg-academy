/**
 * Inspector de estado real de la BD Supabase.
 *
 * No modifica nada. Cuenta filas y muestra muestra de cada tabla relevante
 * para saber qué tiene que mostrar /admin/pedidos y /admin/usuarios.
 *
 * Uso:  node scripts/inspect-bd-state.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const envPath = path.join(repoRoot, ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log("Supabase URL:", url);
console.log("Service role key (head):", srk ? srk.slice(0, 20) + "…" : "MISSING");
console.log("");

const sb = createClient(url, srk, { auth: { persistSession: false } });

// auth.users (Supabase Auth) puede contener los 33 si el import los puso allí
// y no en public.users. Sólo accesible vía Admin API.
try {
  const { data: authData, error: authErr } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (authErr) console.log("auth.users → ERR:", authErr.message);
  else console.log(`auth.users: ${authData?.users?.length ?? 0} filas`);
  if ((authData?.users?.length ?? 0) > 0) {
    console.log("  Muestra (3):");
    for (const u of authData.users.slice(0, 3)) {
      console.log(
        `   - ${u.id} · ${u.email} · created=${u.created_at?.slice(0, 10)} · meta=${JSON.stringify(u.user_metadata ?? {}).slice(0, 80)}`,
      );
    }
  }
} catch (e) {
  console.log("auth.users → exception:", e.message);
}
console.log("");

const TABLES = [
  "users",
  "orders",
  "order_items",
  "coupons",
  "points_balances",
  "points_history",
  "returns",
  "breach_incidents",
  "audit_logs",
  "consents",
  "settings",
];

console.log("┌─────────────────────────┬────────┐");
console.log("│ Tabla                   │ Filas  │");
console.log("├─────────────────────────┼────────┤");

const counts = {};
for (const t of TABLES) {
  const { count, error } = await sb.from(t).select("*", { count: "exact", head: true });
  if (error) {
    counts[t] = `ERR: ${error.message.slice(0, 30)}`;
  } else {
    counts[t] = count ?? 0;
  }
  console.log(`│ ${t.padEnd(23)} │ ${String(counts[t]).padStart(6)} │`);
}
console.log("└─────────────────────────┴────────┘\n");

// Roles
const { data: roleAgg } = await sb.from("users").select("role");
const roleCounts = {};
for (const r of roleAgg ?? []) {
  roleCounts[r.role] = (roleCounts[r.role] ?? 0) + 1;
}
console.log("Usuarios por rol:", roleCounts);

// Sample order
if ((counts.orders ?? 0) > 0) {
  const { data: sample } = await sb
    .from("orders")
    .select("id, user_id, status, total, payment_status, created_at, customer_snapshot")
    .order("created_at", { ascending: false })
    .limit(3);
  console.log("\nÚltimos 3 pedidos:");
  for (const o of sample ?? []) {
    const snap = o.customer_snapshot ?? {};
    console.log(
      `  ${o.id} · ${o.created_at?.slice(0, 10)} · ${o.status} · ${o.payment_status} · ${o.total}€ · ${snap.email ?? "-"} (${snap.firstName ?? ""} ${snap.lastName ?? ""}).trim()`,
    );
  }
}

// Sample user
if ((counts.users ?? 0) > 0) {
  const { data: sample } = await sb
    .from("users")
    .select("id, email, username, first_name, last_name, role, tax_id, phone, created_at")
    .order("created_at", { ascending: false })
    .limit(3);
  console.log("\nÚltimos 3 usuarios:");
  for (const u of sample ?? []) {
    console.log(
      `  ${u.id} · ${u.email} · ${u.role} · ${u.first_name ?? ""} ${u.last_name ?? ""} · NIF=${u.tax_id ?? "-"} · ${u.created_at?.slice(0, 10)}`,
    );
  }
}

console.log("\nOK.");
