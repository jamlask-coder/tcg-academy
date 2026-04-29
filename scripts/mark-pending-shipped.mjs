/**
 * Marca como `enviado` todos los pedidos pendientes (pendiente, confirmado,
 * procesando) — excluye cancelados y devueltos por construcción.
 *
 * Va directo a Supabase con service role → NO pasa por /api/orders →
 * NO dispara email automático al cliente.
 *
 * Uso:
 *   node scripts/mark-pending-shipped.mjs            # dry-run (lista sin tocar)
 *   node scripts/mark-pending-shipped.mjs --apply    # aplica los cambios
 *
 * Idempotente: ejecutar dos veces no hace nada si ya están todos en `enviado`.
 *
 * Razón fiscal: estos pedidos son heredados de la SL anterior, no nos
 * pertenecen a efectos de facturación — NO se emite factura sobre ellos.
 * Solo cambiamos su estado para limpiar la bandeja de "pendientes de envío".
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

const APPLY = process.argv.includes("--apply");

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// Estados que consideramos "pendientes de envío" → pasan a enviado.
// Quedan FUERA por el filtro: cancelado, devuelto, enviado.
const PENDING_STATES = ["pendiente", "confirmado", "procesando"];

const { data: pending, error: e1 } = await sb
  .from("orders")
  .select("id, status, customer_snapshot, total, created_at")
  .in("status", PENDING_STATES)
  .order("created_at", { ascending: false });

if (e1) {
  console.error("Error leyendo orders:", e1.message);
  process.exit(1);
}

if (!pending || pending.length === 0) {
  console.log("No hay pedidos en estado pendiente/confirmado/procesando.");
  process.exit(0);
}

console.log(`\nPedidos a marcar como ENVIADO (${pending.length}):\n`);
console.log("┌──────────────────────────┬─────────────┬──────────────┬──────────┐");
console.log("│ ID                       │ Estado      │ Cliente      │ Total    │");
console.log("├──────────────────────────┼─────────────┼──────────────┼──────────┤");
for (const o of pending) {
  const name =
    `${o.customer_snapshot?.name ?? ""} ${o.customer_snapshot?.lastName ?? ""}`.trim() ||
    o.customer_snapshot?.email ||
    "(sin datos)";
  console.log(
    `│ ${String(o.id).padEnd(24)} │ ${String(o.status).padEnd(11)} │ ${name.slice(0, 12).padEnd(12)} │ ${String(o.total ?? "").padStart(7)}€ │`,
  );
}
console.log("└──────────────────────────┴─────────────┴──────────────┴──────────┘\n");

if (!APPLY) {
  console.log("DRY-RUN. Re-ejecuta con --apply para confirmar el cambio:");
  console.log("  node scripts/mark-pending-shipped.mjs --apply\n");
  process.exit(0);
}

const ids = pending.map((o) => o.id);
const nowIso = new Date().toISOString();
const { error: e2 } = await sb
  .from("orders")
  .update({ status: "enviado", updated_at: nowIso })
  .in("id", ids);

if (e2) {
  console.error("Error actualizando:", e2.message);
  process.exit(1);
}

console.log(`OK ${ids.length} pedidos actualizados a "enviado".`);
console.log("Sin emails enviados (actualización directa en BD, no pasa por API).");
