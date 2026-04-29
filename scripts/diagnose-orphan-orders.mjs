/**
 * Diagnóstico de pedidos huérfanos (orders.user_id IS NULL).
 *
 * Read-only: NO escribe nada en BD. Solo cuenta y reporta.
 *
 * Pregunta que responde:
 *   "¿Por qué algunos usuarios no ven sus compras pasadas en /admin/usuarios/[id]
 *    o en /cuenta/pedidos?"
 *
 * Causa raíz típica:
 *   El importador WP→Supabase enlaza orders.user_id con un subselect a
 *   users.email. Si el pedido se importó ANTES que su dueño (los pedidos
 *   se generan en el SQL en orden de wp_id, no por orden de existencia
 *   del usuario), user_id queda NULL y nunca se rebindeó.
 *
 * El filtro de la UI (orderAdapter.orderRecordToAdmin) entonces mapea
 *   userId → "guest-<orderId>"
 * y el match `o.userId === baseUser.id` falla. Solo el match por email
 * (o.userEmail === baseUser.email) los recupera. Si además el email del
 * customer_snapshot está vacío o difiere, el pedido se vuelve invisible
 * para el dueño.
 *
 * Uso:  node scripts/diagnose-orphan-orders.mjs
 *
 * Salida:
 *   - Total pedidos / huérfanos / rebindables / irrecuperables
 *   - Top 10 emails con más huérfanos rebindables
 *   - Muestra de pedidos irrecuperables (email vacío o sin user)
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
if (!url || !srk) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const sb = createClient(url, srk, { auth: { persistSession: false } });

console.log("Supabase:", url);
console.log("");

// ── Conteo global ─────────────────────────────────────────────────────
const { count: totalOrders, error: e1 } = await sb
  .from("orders")
  .select("*", { count: "exact", head: true });
if (e1) {
  console.error("Error contando orders:", e1.message);
  process.exit(1);
}

const { count: orphanOrders, error: e2 } = await sb
  .from("orders")
  .select("*", { count: "exact", head: true })
  .is("user_id", null);
if (e2) {
  console.error("Error contando huérfanos:", e2.message);
  process.exit(1);
}

console.log("┌──────────────────────────────────┬────────┐");
console.log("│ Métrica                          │ Filas  │");
console.log("├──────────────────────────────────┼────────┤");
console.log(`│ Total pedidos                    │ ${String(totalOrders ?? 0).padStart(6)} │`);
console.log(`│ Pedidos con user_id NULL         │ ${String(orphanOrders ?? 0).padStart(6)} │`);
console.log("└──────────────────────────────────┴────────┘\n");

if ((orphanOrders ?? 0) === 0) {
  console.log("✅ No hay pedidos huérfanos por user_id NULL.");
  console.log("   Sigo con segunda pasada: user_id que apunta a user inexistente,");
  console.log("   o user_id correcto pero email del snapshot diverge del email actual.\n");
}

// ── Cargar todos los huérfanos (id + customer_snapshot) ───────────────
// Paginamos defensivamente por si hay muchos.
const orphans = [];
const PAGE = 1000;
let from = 0;
while (true) {
  const { data, error } = await sb
    .from("orders")
    .select("id, customer_snapshot, created_at")
    .is("user_id", null)
    .order("created_at", { ascending: true })
    .range(from, from + PAGE - 1);
  if (error) {
    console.error("Error paginando huérfanos:", error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) break;
  orphans.push(...data);
  if (data.length < PAGE) break;
  from += PAGE;
}

// ── Cargar todos los users (id + email) ───────────────────────────────
const usersByEmail = new Map();
{
  const { data, error } = await sb.from("users").select("id, email");
  if (error) {
    console.error("Error cargando users:", error.message);
    process.exit(1);
  }
  for (const u of data ?? []) {
    if (u.email) usersByEmail.set(u.email.toLowerCase().trim(), u.id);
  }
}
console.log(`Usuarios cargados: ${usersByEmail.size}\n`);

// ── Clasificar huérfanos ──────────────────────────────────────────────
const rebindable = []; // {orderId, email, userId}
const noEmail = []; // {orderId}
const noUser = []; // {orderId, email}

for (const o of orphans) {
  const snap = o.customer_snapshot ?? {};
  const email = (snap.email ?? "").toLowerCase().trim();
  if (!email) {
    noEmail.push({ orderId: o.id, createdAt: o.created_at });
    continue;
  }
  const userId = usersByEmail.get(email);
  if (!userId) {
    noUser.push({ orderId: o.id, email, createdAt: o.created_at });
    continue;
  }
  rebindable.push({ orderId: o.id, email, userId });
}

console.log("┌──────────────────────────────────┬────────┐");
console.log("│ Clasificación huérfanos          │ Filas  │");
console.log("├──────────────────────────────────┼────────┤");
console.log(`│ Rebindables (email matchea user) │ ${String(rebindable.length).padStart(6)} │`);
console.log(`│ Irrecuperables: email vacío      │ ${String(noEmail.length).padStart(6)} │`);
console.log(`│ Irrecuperables: email sin user   │ ${String(noUser.length).padStart(6)} │`);
console.log("└──────────────────────────────────┴────────┘\n");

// ── Top emails con huérfanos rebindables ──────────────────────────────
if (rebindable.length > 0) {
  const byEmail = new Map();
  for (const r of rebindable) {
    byEmail.set(r.email, (byEmail.get(r.email) ?? 0) + 1);
  }
  const top = [...byEmail.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log("Top 10 emails con huérfanos REBINDABLES (los recuperaría el backfill):");
  for (const [email, n] of top) {
    console.log(`  ${String(n).padStart(4)} × ${email}`);
  }
  console.log("");
}

// ── Top emails sin user (irrecuperables sin acción manual) ────────────
if (noUser.length > 0) {
  const byEmail = new Map();
  for (const r of noUser) {
    byEmail.set(r.email, (byEmail.get(r.email) ?? 0) + 1);
  }
  const top = [...byEmail.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log("Top 10 emails de huérfanos SIN user (necesitan crear cuenta o ignorarlos):");
  for (const [email, n] of top) {
    console.log(`  ${String(n).padStart(4)} × ${email}`);
  }
  console.log("");
}

// ── Muestra de huérfanos sin email ────────────────────────────────────
if (noEmail.length > 0) {
  console.log("Muestra de huérfanos SIN email en customer_snapshot (max 5):");
  for (const r of noEmail.slice(0, 5)) {
    console.log(`  ${r.orderId} · ${r.createdAt?.slice(0, 10)}`);
  }
  console.log("");
}

// ── Segunda pasada: pedidos NO huérfanos pero potencialmente "invisibles" ─
// La UI cruza por o.userId === baseUser.id || o.userEmail === baseUser.email.
// Si user_id apunta a un user que ya no existe, o si el email del snapshot
// no coincide con el del user dueño, el pedido puede no aparecer en algunas
// vistas o aparecer descolocado.
console.log("\n══════════════════════════════════════════════════════════");
console.log("Segunda pasada — pedidos NO huérfanos\n");

const usersById = new Map();
{
  const { data, error } = await sb.from("users").select("id, email");
  if (error) {
    console.error("Error cargando users (id-map):", error.message);
    process.exit(1);
  }
  for (const u of data ?? []) {
    usersById.set(u.id, (u.email ?? "").toLowerCase().trim());
  }
}

// Cargar pedidos NO huérfanos paginando.
const owned = [];
{
  let off = 0;
  while (true) {
    const { data, error } = await sb
      .from("orders")
      .select("id, user_id, customer_snapshot, created_at")
      .not("user_id", "is", null)
      .order("created_at", { ascending: true })
      .range(off, off + PAGE - 1);
    if (error) {
      console.error("Error paginando NO huérfanos:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    owned.push(...data);
    if (data.length < PAGE) break;
    off += PAGE;
  }
}

const ghostUser = []; // user_id apunta a id que no existe en users
const emailMismatch = []; // user_id ok, pero snapshot.email != users.email
const okOwned = [];

for (const o of owned) {
  const userEmail = usersById.get(o.user_id);
  if (userEmail === undefined) {
    ghostUser.push({
      orderId: o.id,
      userId: o.user_id,
      snapEmail: (o.customer_snapshot?.email ?? "").toLowerCase().trim(),
      createdAt: o.created_at,
    });
    continue;
  }
  const snapEmail = (o.customer_snapshot?.email ?? "").toLowerCase().trim();
  if (snapEmail && userEmail && snapEmail !== userEmail) {
    emailMismatch.push({
      orderId: o.id,
      userId: o.user_id,
      userEmail,
      snapEmail,
      createdAt: o.created_at,
    });
  } else {
    okOwned.push(o.id);
  }
}

console.log("┌─────────────────────────────────────────────┬────────┐");
console.log("│ Clasificación de pedidos NO huérfanos       │ Filas  │");
console.log("├─────────────────────────────────────────────┼────────┤");
console.log(`│ user_id ok + email coincide con users.email │ ${String(okOwned.length).padStart(6)} │`);
console.log(`│ user_id apunta a user INEXISTENTE (fantasma)│ ${String(ghostUser.length).padStart(6)} │`);
console.log(`│ user_id ok pero email del snap DIVERGE      │ ${String(emailMismatch.length).padStart(6)} │`);
console.log("└─────────────────────────────────────────────┴────────┘\n");

if (ghostUser.length > 0) {
  console.log("⚠️  Pedidos cuyo user_id no existe en users (max 10):");
  for (const g of ghostUser.slice(0, 10)) {
    console.log(`  ${g.orderId} · userId=${g.userId} · snap.email=${g.snapEmail || "-"} · ${g.createdAt?.slice(0, 10)}`);
  }
  console.log("");
}

if (emailMismatch.length > 0) {
  console.log("⚠️  Pedidos donde el email del snapshot diverge del email del user (max 10):");
  for (const m of emailMismatch.slice(0, 10)) {
    console.log(`  ${m.orderId}`);
    console.log(`    snap.email   = ${m.snapEmail}`);
    console.log(`    users.email  = ${m.userEmail}  (id=${m.userId})`);
  }
  console.log("");
}

// ── Tercera pasada: por usuario, cuenta orders por user_id vs por email ──
// Esta es la métrica que captura tu síntoma real: "en algunos sí veo el
// pedido, en otros no". Si por user_id contamos N y por email contamos M
// con M>N, ese usuario tiene M-N pedidos que la UI ve por OR-email pero
// no por user_id; y si M<N, hay pedidos por user_id sin coincidencia
// de email (el caso emailMismatch de arriba).
console.log("══════════════════════════════════════════════════════════");
console.log("Tercera pasada — cobertura por usuario (top discrepancias)\n");

const ordersByUserId = new Map();
const ordersByEmail = new Map();
for (const o of [...orphans, ...owned]) {
  const uid = o.user_id ?? null;
  const em = (o.customer_snapshot?.email ?? "").toLowerCase().trim();
  if (uid) ordersByUserId.set(uid, (ordersByUserId.get(uid) ?? 0) + 1);
  if (em) ordersByEmail.set(em, (ordersByEmail.get(em) ?? 0) + 1);
}

const rows = [];
for (const [uid, em] of usersById) {
  const byId = ordersByUserId.get(uid) ?? 0;
  const byEm = em ? (ordersByEmail.get(em) ?? 0) : 0;
  if (byId === 0 && byEm === 0) continue;
  rows.push({ uid, em, byId, byEm, diff: byEm - byId });
}
rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || b.byEm + b.byId - (a.byEm + a.byId));

console.log("Usuarios con pedidos (top 15 por diferencia / volumen):");
console.log("  byId = orders donde user_id == users.id");
console.log("  byEm = orders donde customer_snapshot.email == users.email");
console.log("  diff = byEm - byId  (>0: pedidos atribuidos a otro user_id que aún rescata el email)\n");
for (const r of rows.slice(0, 15)) {
  const flag = r.diff !== 0 ? " ⚠️" : "";
  console.log(
    `  byId=${String(r.byId).padStart(3)} · byEm=${String(r.byEm).padStart(3)} · diff=${String(r.diff).padStart(3)}${flag} · ${r.em || "(sin email)"}`,
  );
}

// ── Resumen final ─────────────────────────────────────────────────────
console.log("\n──────────────────────────────────────────────────────────");
console.log("Diagnóstico final:");
if (rebindable.length > 0) {
  console.log(`  · ${rebindable.length} huérfanos rebindables → aplica orders_rebind_orphans.sql`);
}
if (ghostUser.length > 0) {
  console.log(`  · ${ghostUser.length} pedidos con user_id fantasma → necesitan rebind por email`);
}
if (emailMismatch.length > 0) {
  console.log(`  · ${emailMismatch.length} pedidos con email del snapshot divergente del user actual`);
  console.log(`    (se ven por user_id pero no por OR-email; bajo riesgo)`);
}
const usersConDiff = rows.filter((r) => r.diff !== 0).length;
if (usersConDiff > 0) {
  console.log(`  · ${usersConDiff} usuarios con discrepancia byId vs byEm (revisar lista de arriba)`);
}
if (
  rebindable.length === 0 &&
  ghostUser.length === 0 &&
  emailMismatch.length === 0 &&
  usersConDiff === 0
) {
  console.log("  ✅ BD coherente. Si sigues sin ver pedidos en la UI, el bug está en");
  console.log("     el filtro del page detail o en cómo resuelve el id del usuario.");
}
console.log("──────────────────────────────────────────────────────────");
