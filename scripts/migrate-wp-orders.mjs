/**
 * Genera `migrations/wp_orders_import.sql` con los pedidos heredados de
 * WordPress/WooCommerce (HPOS) listos para importar en Supabase.
 *
 * Fuente: Downloads/u357847309_0zFd1.sql (dump WP completo).
 * Tablas WP usadas:
 *   - wp_wc_orders            → cabecera (id, status, totales, payment_method, billing_email, fechas)
 *   - wp_wc_order_addresses   → dirección de envío (preferida) o de facturación (fallback)
 *   - wp_wc_order_product_lookup → ENVIO + DESCUENTO acumulados por pedido (no items)
 *
 * Salida: SQL idempotente (ON CONFLICT DO UPDATE).
 *
 * IMPORTANTE — qué importamos y qué NO:
 *   - Importamos cabeceras orders (datos completos del cliente, totales, status).
 *   - NO importamos order_items: el schema actual exige
 *     `product_id REFERENCES products(id)` y los productos WP no existen en
 *     la tabla `products` de Supabase. Importar items requiere migración del
 *     schema (quitar la FK o crear order_items_legacy). Decisión del admin.
 *   - NO emitimos facturas: estas órdenes pertenecen a la SL anterior
 *     (carry-over). El adapter ya marca fiscalCarryOver=true al leerlas y
 *     PedidoDetailClient bloquea la creación de factura.
 *
 * Mapeo status:
 *   wc-completed   → enviado (estado terminal — no usamos "entregado", ver
 *                    feedback_no_entregado_status)
 *   wc-processing  → confirmado
 *   wc-pending     → pendiente
 *   wc-on-hold     → pendiente
 *   wc-cancelled   → cancelado
 *   wc-failed      → cancelado
 *   wc-refunded    → devuelto
 *
 * Mapeo payment_method:
 *   redsys        → tarjeta
 *   ppcp-gateway  → paypal
 *   bacs          → transferencia
 *   "" / unknown  → transferencia (fallback)
 *
 * Uso:  node scripts/migrate-wp-orders.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const dumpPath = path.join(
  repoRoot,
  "..",
  "Downloads",
  "u357847309_0zFd1.sql",
);
const outputPath = path.join(repoRoot, "migrations", "wp_orders_import.sql");

if (!fs.existsSync(dumpPath)) {
  console.error("❌ No se encuentra el dump WP en:", dumpPath);
  process.exit(1);
}

const sql = fs.readFileSync(dumpPath, "utf8");

// ── Parser MySQL row ──────────────────────────────────────────────────────
// Parser correcto para tuplas SQL: respeta strings con escapes SQL ('' y \').
// (la versión naive splitea mal cuando hay comas dentro de strings).
function parseRow(rowStr) {
  // rowStr empieza con `(` y acaba con `)` ó `),` ó `);`
  const inner = rowStr.replace(/^\(/, "").replace(/\)[,;]?$/, "");
  const out = [];
  let i = 0;
  let buf = "";
  let inStr = false;
  while (i < inner.length) {
    const c = inner[i];
    if (inStr) {
      if (c === "\\" && i + 1 < inner.length) {
        // escape: copiamos el carácter siguiente literal
        buf += c + inner[i + 1];
        i += 2;
        continue;
      }
      if (c === "'") {
        // '' escape SQL
        if (inner[i + 1] === "'") {
          buf += "''";
          i += 2;
          continue;
        }
        // fin de string
        buf += c;
        inStr = false;
        i++;
        continue;
      }
      buf += c;
      i++;
      continue;
    }
    if (c === "'") {
      inStr = true;
      buf += c;
      i++;
      continue;
    }
    if (c === ",") {
      out.push(buf.trim());
      buf = "";
      i++;
      continue;
    }
    buf += c;
    i++;
  }
  if (buf.length > 0) out.push(buf.trim());
  return out.map((v) => {
    if (v === "NULL") return null;
    if (v.startsWith("'") && v.endsWith("'")) {
      // unescape SQL
      return v.slice(1, -1).replace(/\\'/g, "'").replace(/''/g, "'").replace(/\\\\/g, "\\");
    }
    return v;
  });
}

// Extrae todas las tuplas de un INSERT INTO `<table>` (...)  VALUES ...;
function extractInsertRows(table) {
  const re = new RegExp(`INSERT INTO \`${table}\`[^;]*?VALUES`, "g");
  const m = re.exec(sql);
  if (!m) return [];
  const start = m.index + m[0].length;
  // bloque hasta el ; final del INSERT
  let end = start;
  let depth = 0;
  let inStr = false;
  while (end < sql.length) {
    const c = sql[end];
    if (inStr) {
      if (c === "\\") {
        end += 2;
        continue;
      }
      if (c === "'") inStr = false;
      end++;
      continue;
    }
    if (c === "'") inStr = true;
    else if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === ";" && depth === 0) break;
    end++;
  }
  const block = sql.slice(start, end);

  // Splitea por tuplas top-level: cada `(...)`
  const rows = [];
  let i = 0;
  while (i < block.length) {
    if (block[i] !== "(") {
      i++;
      continue;
    }
    let j = i;
    let d = 0;
    let s = false;
    while (j < block.length) {
      const c = block[j];
      if (s) {
        if (c === "\\") {
          j += 2;
          continue;
        }
        if (c === "'") s = false;
        j++;
        continue;
      }
      if (c === "'") s = true;
      else if (c === "(") d++;
      else if (c === ")") {
        d--;
        if (d === 0) {
          j++;
          break;
        }
      }
      j++;
    }
    rows.push(block.slice(i, j));
    i = j;
  }
  return rows.map(parseRow);
}

// ── Lee tablas WP ─────────────────────────────────────────────────────────
const orderRows = extractInsertRows("wp_wc_orders");
const addrRows = extractInsertRows("wp_wc_order_addresses");
const lookupRows = extractInsertRows("wp_wc_order_product_lookup");

console.log(`Pedidos WP: ${orderRows.length}`);
console.log(`Direcciones WP: ${addrRows.length}`);
console.log(`Items lookup WP: ${lookupRows.length}`);

// Index direcciones por order_id + tipo
const addrByOrder = new Map(); // wp_id → { billing, shipping }
for (const r of addrRows) {
  const [, orderId, type, firstName, lastName, company, addr1, addr2, city, state, postcode, country, email, phone] = r;
  const key = String(orderId);
  if (!addrByOrder.has(key)) addrByOrder.set(key, {});
  addrByOrder.get(key)[type] = {
    firstName: firstName ?? "",
    lastName: lastName ?? "",
    company: company ?? "",
    addr1: addr1 ?? "",
    addr2: addr2 ?? "",
    city: city ?? "",
    state: state ?? "",
    postcode: postcode ?? "",
    country: country ?? "ES",
    email: email ?? "",
    phone: phone ?? "",
  };
}

// Suma envío + descuento por pedido (de wp_wc_order_product_lookup)
const totalsByOrder = new Map(); // wp_id → { shipping, couponDiscount, taxAmount }
for (const r of lookupRows) {
  const [, orderId, , , , , , , , couponAmount, , shippingAmount] = r;
  const key = String(orderId);
  const prev = totalsByOrder.get(key) ?? { shipping: 0, couponDiscount: 0 };
  prev.shipping += Number(shippingAmount) || 0;
  prev.couponDiscount += Number(couponAmount) || 0;
  totalsByOrder.set(key, prev);
}

// ── Mapeos ────────────────────────────────────────────────────────────────
function mapStatus(wpStatus) {
  switch (wpStatus) {
    case "wc-completed": return "enviado";
    case "wc-processing": return "confirmado";
    case "wc-pending": return "pendiente";
    case "wc-on-hold": return "pendiente";
    case "wc-cancelled": return "cancelado";
    case "wc-failed": return "cancelado";
    case "wc-refunded": return "devuelto";
    default: return "pendiente";
  }
}

function mapPayment(wpPayment) {
  if (!wpPayment) return "transferencia";
  if (wpPayment.includes("redsys")) return "tarjeta";
  if (wpPayment.includes("paypal") || wpPayment.includes("ppcp")) return "paypal";
  if (wpPayment.includes("bacs")) return "transferencia";
  if (wpPayment.includes("cod") || wpPayment.includes("cash")) return "transferencia";
  return "transferencia";
}

function mapPaymentStatus(wpStatus) {
  switch (wpStatus) {
    case "wc-completed":
    case "wc-processing":
      return "cobrado";
    case "wc-refunded":
      return "reembolsado";
    case "wc-failed":
      return "fallido";
    default:
      return "pendiente";
  }
}

function deriveOrderId(wpId, dateGmt) {
  // schema check: ^TCG-[0-9]{6}-[A-Z0-9]{6}$
  // Derivamos: TCG-YYMMDD-W<5 dígitos del wpId>. WP-3016 → TCG-260111-W03016.
  const d = new Date(dateGmt + (dateGmt.includes("Z") ? "" : "Z"));
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const wpStr = String(wpId).padStart(5, "0").slice(-5);
  return `TCG-${yy}${mm}${dd}-W${wpStr}`;
}

function sqlEscape(s) {
  if (s === null || s === undefined) return "NULL";
  return `'${String(s).replace(/'/g, "''")}'`;
}

// ── Genera SQL idempotente ────────────────────────────────────────────────
const lines = [];
lines.push("-- Generado por scripts/migrate-wp-orders.mjs (no editar a mano)");
lines.push("-- Fuente: u357847309_0zFd1.sql (WP/WooCommerce HPOS)");
lines.push(`-- Total: ${orderRows.length} pedidos heredados (carry-over SL anterior)`);
lines.push("--");
lines.push("-- Re-ejecutable: ON CONFLICT (id) DO UPDATE.");
lines.push("-- NO se importan order_items (FK a products bloquea — productos WP");
lines.push("-- no existen en tabla products). Cabeceras suficientes para /admin/pedidos.");
lines.push("-- NO se emiten facturas: el adapter marca fiscalCarryOver=true.");
lines.push("");
lines.push("BEGIN;");
lines.push("");

let imported = 0;
let skipped = 0;

for (const row of orderRows) {
  const [
    wpId,
    wpStatus,
    currency,
    type,
    taxAmount,
    totalAmount,
    customerId,
    billingEmail,
    dateCreated,
    dateUpdated,
    parentOrderId,
    paymentMethod,
    paymentMethodTitle,
    transactionId,
    ipAddress,
    userAgent,
    customerNote,
  ] = row;

  if (type !== "shop_order") {
    skipped++;
    continue; // refunds (`shop_order_refund`) no son pedidos
  }

  const status = mapStatus(wpStatus);
  const pay = mapPayment(paymentMethod);
  const payStatus = mapPaymentStatus(wpStatus);
  const id = deriveOrderId(wpId, dateCreated);

  const addrs = addrByOrder.get(String(wpId)) ?? {};
  const ship = addrs.shipping ?? addrs.billing ?? null;
  const bill = addrs.billing ?? addrs.shipping ?? null;

  if (!bill) {
    skipped++;
    continue;
  }

  const customerSnapshot = {
    userId: null, // se resuelve en SQL via billing_email + LEFT JOIN
    firstName: bill.firstName,
    lastName: bill.lastName,
    email: bill.email || billingEmail || "",
    phone: bill.phone || "",
    taxId: "",
    taxIdType: null,
    company: bill.company || null,
  };

  const shippingSnapshot = ship
    ? {
        calle: ship.addr1 || "",
        numero: "",
        piso: ship.addr2 || "",
        cp: ship.postcode || "",
        ciudad: ship.city || "",
        provincia: ship.state || "",
        pais: ship.country || "ES",
      }
    : null;

  const totals = totalsByOrder.get(String(wpId)) ?? { shipping: 0, couponDiscount: 0 };
  const total = Number(totalAmount) || 0;
  const shippingCost = Math.max(0, totals.shipping);
  const couponDiscount = Math.max(0, totals.couponDiscount);
  const subtotal = Math.max(0, total - shippingCost);

  const noteLines = [];
  noteLines.push(`[Carry-over WP] WP id=${wpId}`);
  if (paymentMethodTitle) noteLines.push(`Pago: ${paymentMethodTitle}`);
  if (transactionId) noteLines.push(`Tx: ${transactionId}`);
  if (customerNote) noteLines.push(`Nota cliente: ${customerNote}`);
  const notes = noteLines.join(" · ");

  lines.push(`-- WP order ${wpId} (${billingEmail}) · ${dateCreated}`);
  lines.push(`INSERT INTO orders (
  id, user_id, status, customer_snapshot, shipping_snapshot,
  shipping_method, shipping_cost,
  subtotal, coupon_discount, points_spent, points_discount,
  total, payment_method, payment_status, payment_intent,
  notes, created_at, updated_at
) VALUES (
  ${sqlEscape(id)},
  (SELECT id FROM users WHERE LOWER(email) = LOWER(${sqlEscape(billingEmail)}) LIMIT 1),
  ${sqlEscape(status)}::order_status,
  ${sqlEscape(JSON.stringify(customerSnapshot))}::jsonb,
  ${shippingSnapshot ? `${sqlEscape(JSON.stringify(shippingSnapshot))}::jsonb` : "NULL"},
  'estandar',
  ${shippingCost.toFixed(2)},
  ${subtotal.toFixed(2)},
  ${couponDiscount.toFixed(2)},
  0,
  0.00,
  ${total.toFixed(2)},
  ${sqlEscape(pay)}::payment_method,
  ${sqlEscape(payStatus)}::payment_status,
  ${transactionId ? sqlEscape(transactionId) : "NULL"},
  ${sqlEscape(notes)},
  ${sqlEscape(dateCreated)}::timestamptz,
  ${sqlEscape(dateUpdated || dateCreated)}::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  status            = EXCLUDED.status,
  customer_snapshot = EXCLUDED.customer_snapshot,
  shipping_snapshot = EXCLUDED.shipping_snapshot,
  shipping_cost     = EXCLUDED.shipping_cost,
  subtotal          = EXCLUDED.subtotal,
  coupon_discount   = EXCLUDED.coupon_discount,
  total             = EXCLUDED.total,
  payment_method    = EXCLUDED.payment_method,
  payment_status    = EXCLUDED.payment_status,
  payment_intent    = COALESCE(EXCLUDED.payment_intent, orders.payment_intent),
  notes             = EXCLUDED.notes,
  updated_at        = EXCLUDED.updated_at;
`);
  imported++;
}

// ─────────────────────────────────────────────────────────────────────
// Rebind defensivo: el INSERT ... ON CONFLICT DO UPDATE de cada pedido
// NO actualiza user_id (intencionado: nunca pisamos un user_id ya
// enlazado). Pero los pedidos importados ANTES que su dueño quedaron
// con user_id = NULL para siempre. Este bloque rebindea por email
// dentro de la misma transacción del import → el SQL es 100% self-healing.
// Idempotente: solo toca user_id NULL.
// ─────────────────────────────────────────────────────────────────────
lines.push("");
lines.push("-- Rebind defensivo de huérfanos (user_id NULL ↔ users.email)");
lines.push(`UPDATE orders o
   SET user_id    = u.id,
       updated_at = NOW()
  FROM users u
 WHERE o.user_id IS NULL
   AND LOWER(TRIM(u.email)) = LOWER(TRIM(o.customer_snapshot->>'email'))
   AND COALESCE(TRIM(o.customer_snapshot->>'email'), '') <> '';`);
lines.push("");
lines.push("COMMIT;");
lines.push("");
lines.push(`-- Importados: ${imported} pedidos`);
lines.push(`-- Saltados:   ${skipped} (refunds / sin dirección)`);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
console.log(`\n✅ SQL generado: ${outputPath}`);
console.log(`   Importados: ${imported}`);
console.log(`   Saltados:   ${skipped}`);
