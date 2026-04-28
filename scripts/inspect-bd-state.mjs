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

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

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
