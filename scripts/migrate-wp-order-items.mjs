/**
 * Genera `migrations/wp_order_items_import.sql` con las 41 líneas de
 * producto de los pedidos heredados WP. Va a la tabla `order_items_legacy`
 * (sin FK a products) para no romper la integridad del schema nuevo.
 *
 * Fuente WP:
 *   - wp_woocommerce_order_items     → (id, name, type, order_id)
 *   - wp_woocommerce_order_itemmeta  → meta key/value: _product_id, _qty,
 *                                       _line_total, _line_tax
 *
 * Solo incluimos `type = 'line_item'` (descartamos shipping/tax/coupon/fee).
 *
 * Idempotente: cada item se identifica por (order_id, wp_item_id) y se
 * borra antes de insertar (DELETE+INSERT en transacción) para que re-correr
 * el script no duplique. El UUID PK se regenera, pero al ser solo carry-over
 * informativo no hay referencias externas.
 *
 * Uso:  node scripts/migrate-wp-order-items.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const dumpPath = path.join(repoRoot, "..", "Downloads", "u357847309_0zFd1.sql");
const outputPath = path.join(repoRoot, "migrations", "wp_order_items_import.sql");

const sql = fs.readFileSync(dumpPath, "utf8");

// ── Reusa el parser robusto de migrate-wp-orders ──────────────────────────
function parseRow(rowStr) {
  const inner = rowStr.replace(/^\(/, "").replace(/\)[,;]?$/, "");
  const out = [];
  let i = 0, buf = "", inStr = false;
  while (i < inner.length) {
    const c = inner[i];
    if (inStr) {
      if (c === "\\" && i + 1 < inner.length) { buf += c + inner[i + 1]; i += 2; continue; }
      if (c === "'") {
        if (inner[i + 1] === "'") { buf += "''"; i += 2; continue; }
        buf += c; inStr = false; i++; continue;
      }
      buf += c; i++; continue;
    }
    if (c === "'") { inStr = true; buf += c; i++; continue; }
    if (c === ",") { out.push(buf.trim()); buf = ""; i++; continue; }
    buf += c; i++;
  }
  if (buf.length > 0) out.push(buf.trim());
  return out.map((v) => {
    if (v === "NULL") return null;
    if (v.startsWith("'") && v.endsWith("'")) {
      return v.slice(1, -1).replace(/\\'/g, "'").replace(/''/g, "'").replace(/\\\\/g, "\\");
    }
    return v;
  });
}

function extractInsertRows(table) {
  const re = new RegExp(`INSERT INTO \`${table}\`[^;]*?VALUES`, "g");
  const m = re.exec(sql);
  if (!m) return [];
  const start = m.index + m[0].length;
  let end = start, depth = 0, inStr = false;
  while (end < sql.length) {
    const c = sql[end];
    if (inStr) {
      if (c === "\\") { end += 2; continue; }
      if (c === "'") inStr = false;
      end++; continue;
    }
    if (c === "'") inStr = true;
    else if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === ";" && depth === 0) break;
    end++;
  }
  const block = sql.slice(start, end);
  const rows = [];
  let i = 0;
  while (i < block.length) {
    if (block[i] !== "(") { i++; continue; }
    let j = i, d = 0, s = false;
    while (j < block.length) {
      const c = block[j];
      if (s) {
        if (c === "\\") { j += 2; continue; }
        if (c === "'") s = false;
        j++; continue;
      }
      if (c === "'") s = true;
      else if (c === "(") d++;
      else if (c === ")") { d--; if (d === 0) { j++; break; } }
      j++;
    }
    rows.push(block.slice(i, j));
    i = j;
  }
  return rows.map(parseRow);
}

// ── Lee ───────────────────────────────────────────────────────────────────
const itemRows = extractInsertRows("wp_woocommerce_order_items");
const metaRows = extractInsertRows("wp_woocommerce_order_itemmeta");

// Index meta por order_item_id
const metaByItem = new Map();
for (const m of metaRows) {
  const [, orderItemId, key, value] = m;
  const k = String(orderItemId);
  if (!metaByItem.has(k)) metaByItem.set(k, {});
  metaByItem.get(k)[key] = value;
}

// Cabeceras WP id → fecha (para derivar el id Supabase TCG-YYMMDD-W…)
const orderHeaderRows = extractInsertRows("wp_wc_orders");
const dateByWpId = new Map();
for (const o of orderHeaderRows) {
  dateByWpId.set(String(o[0]), o[8]); // [0]=id, [8]=date_created_gmt
}

function deriveOrderId(wpId) {
  const dateGmt = dateByWpId.get(String(wpId));
  if (!dateGmt) return null;
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

// ── Construye items ───────────────────────────────────────────────────────
const items = [];
const orderIdsTouched = new Set();

for (const r of itemRows) {
  const [wpItemId, itemName, itemType, wpOrderId] = r;
  if (itemType !== "line_item") continue;

  const orderId = deriveOrderId(wpOrderId);
  if (!orderId) {
    console.warn(`⚠ wp_order ${wpOrderId} sin fecha — saltado`);
    continue;
  }

  const meta = metaByItem.get(String(wpItemId)) ?? {};
  const qty = Math.max(1, parseInt(meta._qty ?? "1", 10));
  const lineTotal = Number(meta._line_total ?? "0");
  const lineTax = Number(meta._line_tax ?? "0");
  const lineGross = lineTotal + lineTax;
  const unitPrice = qty > 0 ? lineGross / qty : 0;
  const wpProductId = meta._product_id ? parseInt(meta._product_id, 10) : null;

  items.push({
    orderId,
    wpItemId,
    wpProductId,
    name: itemName ?? "Producto WP",
    qty,
    unitPrice: Math.round(unitPrice * 100) / 100,
    lineTotal: Math.round(lineGross * 100) / 100,
  });
  orderIdsTouched.add(orderId);
}

// ── Genera SQL ────────────────────────────────────────────────────────────
const lines = [];
lines.push("-- Generado por scripts/migrate-wp-order-items.mjs (no editar a mano)");
lines.push("-- Fuente: wp_woocommerce_order_items + wp_woocommerce_order_itemmeta");
lines.push(`-- Total: ${items.length} líneas de producto en ${orderIdsTouched.size} pedidos`);
lines.push("--");
lines.push("-- Idempotente: borra los items de los orders afectados y reinserta.");
lines.push("-- Solo toca order_items_legacy (carry-over WP). NO afecta order_items.");
lines.push("");
lines.push("BEGIN;");
lines.push("");
lines.push("-- Limpieza previa de los pedidos importados (re-ejecutable)");
const orderIdsList = [...orderIdsTouched].map((id) => `'${id}'`).join(",\n  ");
lines.push("DELETE FROM order_items_legacy WHERE order_id IN (");
lines.push(`  ${orderIdsList}`);
lines.push(");");
lines.push("");

for (const it of items) {
  lines.push(
    `INSERT INTO order_items_legacy (order_id, wp_product_id, name, quantity, unit_price, line_total, vat_rate, source) VALUES (` +
      `${sqlEscape(it.orderId)}, ` +
      `${it.wpProductId ?? "NULL"}, ` +
      `${sqlEscape(it.name)}, ` +
      `${it.qty}, ` +
      `${it.unitPrice.toFixed(2)}, ` +
      `${it.lineTotal.toFixed(2)}, ` +
      `21.00, ` +
      `'wp');`,
  );
}

lines.push("");
lines.push("COMMIT;");
lines.push("");
lines.push(`-- Importados: ${items.length} items`);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
console.log(`✅ ${outputPath}`);
console.log(`   Items: ${items.length} en ${orderIdsTouched.size} pedidos`);
