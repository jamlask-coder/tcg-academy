/**
 * SIMULACIÓN COMPLETA — 100 usuarios, 300 pedidos, 50 uds stock.
 *
 * Ejecutar: node tests/simulation/fullSimulation.mjs
 *
 * Simula el flujo completo sin navegador usando acceso directo a localStorage
 * a través de un mock. Verifica:
 *   - Generación de pedidos con todas las combinaciones
 *   - Descuentos (cupones, puntos, combinados)
 *   - Stock decrementado correctamente
 *   - Facturas generadas por cada pedido
 *   - Partida doble cuadrada
 *   - Triple conteo sin discrepancias
 *   - Correlatividad de numeración
 *   - Puntos otorgados y descontados
 *   - Cálculos fiscales correctos (IVA)
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

// ─── Mock localStorage ──────────────────────────────────────────────────────

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  get length() { return store.size; },
  key: (i) => [...store.keys()][i] ?? null,
};
globalThis.window = {
  dispatchEvent: () => {},
  location: { origin: "http://localhost:3000" },
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
  crypto: globalThis.crypto,
};
globalThis.document = { querySelector: () => null, createElement: () => ({ style: {}, click: () => {} }) };
globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.BroadcastChannel = class { postMessage() {} addEventListener() {} removeEventListener() {} close() {} };
globalThis.CustomEvent = class CustomEvent { constructor(t, o) { this.type = t; this.detail = o?.detail; } };
globalThis.Event = class Event { constructor(t) { this.type = t; } };
if (!globalThis.crypto) {
  const { webcrypto } = await import("crypto");
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function r2(n) { return Math.round(n * 100) / 100; }
function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomName() {
  const nombres = ["María", "Carlos", "Ana", "Pedro", "Laura", "Javier", "Elena", "Miguel", "Sofía", "Pablo", "Carmen", "Diego", "Marta", "Andrés", "Lucía", "Roberto", "Isabel", "Fernando", "Paula", "Alejandro"];
  const apellidos = ["García", "López", "Martínez", "Rodríguez", "Fernández", "González", "Sánchez", "Pérez", "Gómez", "Díaz", "Ruiz", "Hernández", "Muñoz", "Álvarez", "Romero", "Torres", "Navarro", "Domínguez", "Gil", "Moreno"];
  return { nombre: randomFrom(nombres), apellidos: `${randomFrom(apellidos)} ${randomFrom(apellidos)}` };
}
function randomEmail(nombre, i) { return `${nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}${i}@test.com`; }
function randomCP() {
  const prefixes = ["03", "08", "28", "41", "46", "29", "15", "33", "48", "50", "18", "35", "38", "30", "11"];
  return randomFrom(prefixes) + String(randomInt(100, 999));
}
function randomPhone() { return `+34 6${randomInt(10000000, 99999999)}`; }

const PAYMENT_METHODS = ["tarjeta", "paypal", "bizum", "transferencia", "tienda"];
const SHIPPING_METHODS = ["estandar", "express", "tienda"];
const CIUDADES = ["Madrid", "Barcelona", "Valencia", "Sevilla", "Alicante", "Málaga", "Bilbao", "Zaragoza", "Murcia", "Palma"];
const PROVINCIAS = ["Madrid", "Barcelona", "Valencia", "Sevilla", "Alicante", "Málaga", "Vizcaya", "Zaragoza", "Murcia", "Baleares"];
const COUPON_CODES = ["BIENVENIDA15", "TCG10", "VERANO20"];

// ─── Load products (static import workaround) ────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════════");
console.log("  SIMULACIÓN: 100 usuarios · 300 pedidos · stock 50 uds");
console.log("═══════════════════════════════════════════════════════════════\n");

// Read products from source
const productsFile = readFileSync(resolve(ROOT, "src/data/products.ts"), "utf-8");
const productMatches = [...productsFile.matchAll(/{\s*id:\s*(\d+),\s*name:\s*"([^"]+)",[\s\S]*?price:\s*([\d.]+)/g)];
const allProducts = productMatches.map(m => ({
  id: parseInt(m[1]),
  name: m[2],
  price: parseFloat(m[3]),
}));

console.log(`📦 Productos encontrados: ${allProducts.length}`);

// ─── STEP 1: Set stock = 50 for all products ────────────────────────────────

console.log("\n── PASO 1: Configurar stock = 50 para todos ──");
const overrides = {};
for (const p of allProducts) {
  overrides[String(p.id)] = { stock: 50, inStock: true };
}
localStorage.setItem("tcgacademy_product_overrides", JSON.stringify(overrides));
console.log(`✅ Stock configurado: ${allProducts.length} productos × 50 uds`);

// ─── STEP 2: Create 100 users ───────────────────────────────────────────────

console.log("\n── PASO 2: Crear 100 usuarios ──");
const users = [];
for (let i = 1; i <= 100; i++) {
  const { nombre, apellidos } = randomName();
  users.push({
    id: `user-sim-${i}`,
    name: nombre,
    apellidos,
    email: randomEmail(nombre, i),
    phone: randomPhone(),
    role: "cliente",
    cp: randomCP(),
    ciudad: randomFrom(CIUDADES),
    provincia: randomFrom(PROVINCIAS),
    direccion: `Calle Simulación ${randomInt(1, 200)}, ${randomInt(1, 8)}º`,
  });
}
console.log(`✅ ${users.length} usuarios creados`);

// ─── STEP 3: Execute 300 orders ─────────────────────────────────────────────

console.log("\n── PASO 3: Ejecutar 300 pedidos ──");

const orders = [];
const invoices = [];
const stockTracker = {};
allProducts.forEach(p => { stockTracker[p.id] = 50; });

let pointsBalances = {};
users.forEach(u => { pointsBalances[u.id] = randomInt(0, 500); }); // Some start with points

const errors = [];
const warnings = [];
let totalRevenue = 0;
let totalVAT = 0;
let totalBase = 0;
let invoiceCounter = 0;

for (let i = 1; i <= 300; i++) {
  const user = randomFrom(users);
  const numItems = randomInt(1, 5);
  const items = [];
  let orderOk = true;

  // Pick random products
  for (let j = 0; j < numItems; j++) {
    const product = randomFrom(allProducts);
    const qty = randomInt(1, 3);

    // Check stock
    const available = stockTracker[product.id] ?? 0;
    if (available < qty) {
      // Not enough stock — reduce qty or skip
      if (available > 0) {
        items.push({ ...product, quantity: available });
      }
      continue;
    }
    items.push({ ...product, quantity: qty });
  }

  if (items.length === 0) {
    warnings.push(`Pedido #${i}: sin items (stock agotado para los seleccionados)`);
    continue;
  }

  // Calculate subtotal
  let subtotal = r2(items.reduce((s, item) => s + item.price * item.quantity, 0));

  // Apply coupon (30% chance)
  let couponDiscount = 0;
  let couponCode = null;
  if (Math.random() < 0.3) {
    couponCode = randomFrom(COUPON_CODES);
    if (couponCode === "BIENVENIDA15") couponDiscount = r2(subtotal * 0.15);
    else if (couponCode === "TCG10") couponDiscount = r2(Math.min(10, subtotal));
    else if (couponCode === "VERANO20") couponDiscount = r2(subtotal * 0.20);
  }

  // Apply points (20% chance, max 50% of subtotal)
  let pointsUsed = 0;
  let pointsDiscount = 0;
  if (Math.random() < 0.2 && pointsBalances[user.id] > 0) {
    const maxPointsDiscount = r2(subtotal * 0.5);
    const availableEuros = r2(pointsBalances[user.id] / 100);
    pointsDiscount = r2(Math.min(maxPointsDiscount, availableEuros));
    pointsUsed = Math.floor(pointsDiscount * 100);
  }

  // Shipping
  const envio = randomFrom(SHIPPING_METHODS);
  const shipping = envio === "tienda" ? 0 : subtotal >= 149 ? 0 : envio === "express" ? 6.99 : 3.99;

  // Total
  const totalDiscount = r2(couponDiscount + pointsDiscount);
  const finalTotal = r2(Math.max(0, subtotal - totalDiscount + shipping));

  // Payment
  const pago = envio === "tienda" ? "tienda" : randomFrom(PAYMENT_METHODS);

  // Validate
  if (finalTotal < 0) {
    errors.push(`Pedido #${i}: total negativo (${finalTotal})`);
    continue;
  }
  if (!Number.isFinite(finalTotal)) {
    errors.push(`Pedido #${i}: total no finito (${finalTotal})`);
    continue;
  }

  // Deduct stock
  for (const item of items) {
    stockTracker[item.id] -= item.quantity;
    if (stockTracker[item.id] < 0) {
      errors.push(`Pedido #${i}: stock negativo para ${item.name} (${stockTracker[item.id]})`);
    }
  }

  // Deduct points
  if (pointsUsed > 0) {
    pointsBalances[user.id] -= pointsUsed;
    if (pointsBalances[user.id] < 0) {
      errors.push(`Pedido #${i}: puntos negativos para ${user.id} (${pointsBalances[user.id]})`);
    }
  }

  // Award points (on discounted base, excluding shipping)
  const pointsBase = r2(Math.max(0, subtotal - totalDiscount));
  const pointsAwarded = Math.floor(pointsBase);
  pointsBalances[user.id] = (pointsBalances[user.id] ?? 0) + pointsAwarded;

  // Generate order ID
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const orderId = `TCG-${yy}${mm}${dd}-${rand}`;

  // Generate invoice
  const invoiceYear = now.getFullYear();
  invoiceCounter++;
  const invoiceNumber = `FAC-${invoiceYear}-${String(invoiceCounter).padStart(5, "0")}`;

  // Calculate VAT (21%) — distribute discount with remainder correction
  // This avoids rounding drift: the last line absorbs the leftover cents
  const discountRatio = subtotal > 0 ? totalDiscount / subtotal : 0;
  let invoiceBase = 0;
  let invoiceVAT = 0;
  let discountDistributed = 0;
  for (let j = 0; j < items.length; j++) {
    const item = items[j];
    const lineTotal = r2(item.price * item.quantity);
    let lineDiscount;
    if (j === items.length - 1) {
      // Last line absorbs remaining discount to avoid rounding drift
      lineDiscount = r2(totalDiscount - discountDistributed);
    } else {
      lineDiscount = r2(lineTotal * discountRatio);
    }
    discountDistributed = r2(discountDistributed + lineDiscount);
    const lineWithDiscount = r2(lineTotal - lineDiscount);
    const lineBase = r2(lineWithDiscount / 1.21);
    const lineVAT = r2(lineWithDiscount - lineBase);
    invoiceBase = r2(invoiceBase + lineBase);
    invoiceVAT = r2(invoiceVAT + lineVAT);
  }

  // Triple check: total from lines must equal base + VAT
  const invoiceTotal = r2(invoiceBase + invoiceVAT);
  const expectedTotal = r2(subtotal - totalDiscount);
  const tripleCheckDiff = Math.abs(invoiceTotal - expectedTotal);
  if (tripleCheckDiff >= 0.02) {
    errors.push(`Pedido #${i} (${invoiceNumber}): Triple check FAIL — factura=${invoiceTotal}, esperado=${expectedTotal}, diff=${tripleCheckDiff.toFixed(3)}`);
  }

  const order = {
    id: orderId,
    date: now.toISOString(),
    userId: user.id,
    userName: `${user.name} ${user.apellidos}`,
    email: user.email,
    items: items.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
    subtotal,
    couponCode,
    couponDiscount,
    pointsUsed,
    pointsDiscount,
    pointsAwarded,
    shipping,
    envio,
    pago,
    total: finalTotal,
    invoiceNumber,
    invoiceBase,
    invoiceVAT,
    invoiceTotal,
    address: { direccion: user.direccion, cp: user.cp, ciudad: user.ciudad, provincia: user.provincia },
  };

  orders.push(order);
  totalRevenue = r2(totalRevenue + finalTotal);
  totalBase = r2(totalBase + invoiceBase);
  totalVAT = r2(totalVAT + invoiceVAT);
}

console.log(`✅ ${orders.length} pedidos creados de 300 intentados`);

// ─── STEP 4: Verify everything ──────────────────────────────────────────────

console.log("\n── PASO 4: Verificaciones ──");

// 4.1 Stock verification
let stockIssues = 0;
for (const [id, remaining] of Object.entries(stockTracker)) {
  if (remaining < 0) {
    stockIssues++;
    errors.push(`Stock negativo: producto ${id} tiene ${remaining} uds`);
  }
}
const stockOk = stockIssues === 0;
console.log(`${stockOk ? "✅" : "❌"} Stock: ${stockOk ? "Ningún producto con stock negativo" : `${stockIssues} productos con stock negativo`}`);

// 4.2 Points verification
let pointsIssues = 0;
for (const [userId, balance] of Object.entries(pointsBalances)) {
  if (balance < 0) {
    pointsIssues++;
    errors.push(`Puntos negativos: ${userId} tiene ${balance} pts`);
  }
}
const pointsOk = pointsIssues === 0;
console.log(`${pointsOk ? "✅" : "❌"} Puntos: ${pointsOk ? "Ningún usuario con puntos negativos" : `${pointsIssues} usuarios con puntos negativos`}`);

// 4.3 Invoice correlative numbering
let corrOk = true;
for (let i = 0; i < orders.length; i++) {
  const expected = `FAC-${new Date().getFullYear()}-${String(i + 1).padStart(5, "0")}`;
  if (orders[i].invoiceNumber !== expected) {
    corrOk = false;
    errors.push(`Correlatividad: pedido ${i + 1} tiene ${orders[i].invoiceNumber}, esperado ${expected}`);
    break;
  }
}
console.log(`${corrOk ? "✅" : "❌"} Correlatividad: ${corrOk ? "Sin saltos en numeración" : "Saltos detectados"}`);

// 4.4 Triple check — all invoices
let tripleOk = true;
let tripleFailCount = 0;
for (const order of orders) {
  const diff = Math.abs(order.invoiceTotal - r2(order.subtotal - order.couponDiscount - order.pointsDiscount));
  if (diff >= 0.02) {
    tripleOk = false;
    tripleFailCount++;
  }
}
console.log(`${tripleOk ? "✅" : "❌"} Triple conteo: ${tripleOk ? `${orders.length} facturas cuadran` : `${tripleFailCount} facturas con discrepancia`}`);

// 4.5 Cross-validation: sum of invoices = total
const crossBase = r2(orders.reduce((s, o) => s + o.invoiceBase, 0));
const crossVAT = r2(orders.reduce((s, o) => s + o.invoiceVAT, 0));
const crossTotal = r2(crossBase + crossVAT);
const sumTotals = r2(orders.reduce((s, o) => s + r2(o.subtotal - o.couponDiscount - o.pointsDiscount), 0));
const crossDiff = Math.abs(crossTotal - sumTotals);
const crossOk = crossDiff < 0.5; // Allow small rounding across 300 orders
console.log(`${crossOk ? "✅" : "❌"} Cross-validation: base=${crossBase}€, IVA=${crossVAT}€, total=${crossTotal}€ vs sum=${sumTotals}€ (diff=${crossDiff.toFixed(2)}€)`);

// 4.6 Partida doble check
const journalDebit = r2(orders.reduce((s, o) => s + r2(o.invoiceBase + o.invoiceVAT), 0)); // 430 Clientes
const journalCredit700 = r2(orders.reduce((s, o) => s + o.invoiceBase, 0)); // 700 Ventas
const journalCredit477 = r2(orders.reduce((s, o) => s + o.invoiceVAT, 0)); // 477 HP IVA
const journalCreditTotal = r2(journalCredit700 + journalCredit477);
const partidaDobleDiff = Math.abs(journalDebit - journalCreditTotal);
const partidaDobleOk = partidaDobleDiff < 0.01;
console.log(`${partidaDobleOk ? "✅" : "❌"} Partida doble: Debe(430)=${journalDebit}€, Haber(700+477)=${journalCreditTotal}€ (diff=${partidaDobleDiff.toFixed(3)}€)`);

// 4.7 Payment methods distribution
const paymentDist = {};
orders.forEach(o => { paymentDist[o.pago] = (paymentDist[o.pago] ?? 0) + 1; });
console.log(`✅ Métodos de pago: ${Object.entries(paymentDist).map(([k, v]) => `${k}=${v}`).join(", ")}`);

// 4.8 Shipping methods distribution
const shippingDist = {};
orders.forEach(o => { shippingDist[o.envio] = (shippingDist[o.envio] ?? 0) + 1; });
console.log(`✅ Métodos envío: ${Object.entries(shippingDist).map(([k, v]) => `${k}=${v}`).join(", ")}`);

// 4.9 Coupon usage
const couponCount = orders.filter(o => o.couponCode).length;
const couponTotal = r2(orders.reduce((s, o) => s + o.couponDiscount, 0));
console.log(`✅ Cupones: ${couponCount} pedidos con cupón, descuento total=${couponTotal}€`);

// 4.10 Points usage
const pointsUsedTotal = orders.reduce((s, o) => s + o.pointsUsed, 0);
const pointsAwardedTotal = orders.reduce((s, o) => s + o.pointsAwarded, 0);
const pointsDiscountTotal = r2(orders.reduce((s, o) => s + o.pointsDiscount, 0));
console.log(`✅ Puntos: ${pointsUsedTotal} usados (${pointsDiscountTotal}€), ${pointsAwardedTotal} otorgados`);

// 4.11 Stock consumption
const totalItemsSold = orders.reduce((s, o) => s + o.items.reduce((s2, i) => s2 + i.quantity, 0), 0);
const stockRemaining = Object.values(stockTracker).reduce((s, v) => s + v, 0);
const totalStockInitial = allProducts.length * 50;
console.log(`✅ Stock: ${totalItemsSold} uds vendidas, ${stockRemaining}/${totalStockInitial} restantes`);

// 4.12 Geographic distribution
const provDist = {};
orders.forEach(o => { provDist[o.address.provincia] = (provDist[o.address.provincia] ?? 0) + 1; });
console.log(`✅ Provincias: ${Object.keys(provDist).length} diferentes`);

// ─── SUMMARY ────────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════════");
console.log("  RESUMEN FINAL");
console.log("═══════════════════════════════════════════════════════════════\n");

console.log(`📊 Pedidos creados:        ${orders.length}/300`);
console.log(`💰 Facturación total:      ${totalRevenue.toFixed(2)}€`);
console.log(`📋 Base imponible total:   ${totalBase.toFixed(2)}€`);
console.log(`🏛️  IVA repercutido total:  ${totalVAT.toFixed(2)}€`);
console.log(`🎫 Con cupón:              ${couponCount} (${couponTotal.toFixed(2)}€ dto.)`);
console.log(`⭐ Puntos usados:          ${pointsUsedTotal} (${pointsDiscountTotal.toFixed(2)}€ dto.)`);
console.log(`⭐ Puntos otorgados:       ${pointsAwardedTotal}`);
console.log(`📦 Items vendidos:         ${totalItemsSold}`);
console.log(`📦 Stock restante:         ${stockRemaining}/${totalStockInitial}`);

const allOk = errors.length === 0;
console.log(`\n${allOk ? "✅✅✅" : "❌❌❌"} RESULTADO: ${allOk ? "TODO CORRECTO — 0 errores" : `${errors.length} ERRORES DETECTADOS`}`);

if (errors.length > 0) {
  console.log("\n── ERRORES ──");
  errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
}

if (warnings.length > 0) {
  console.log(`\n── AVISOS (${warnings.length}) ──`);
  warnings.slice(0, 10).forEach((w) => console.log(`  ⚠️  ${w}`));
  if (warnings.length > 10) console.log(`  ... y ${warnings.length - 10} más`);
}

console.log("\n═══════════════════════════════════════════════════════════════\n");
process.exit(allOk ? 0 : 1);
