/**
 * Regression test — Aislamiento TPV multi-tienda
 * ================================================
 *
 * Cambio de negocio (admin 2026-05-02):
 *   Cuatro tiendas físicas usan el TPV de TCG Academy:
 *     - Calpe        → SHARED   : comparte stock + libro fiscal con la web
 *     - Béjar        → STANDALONE: stock + libro fiscal propios
 *     - Madrid       → STANDALONE: stock + libro fiscal propios
 *     - Barcelona    → STANDALONE: stock + libro fiscal propios
 *
 *   Reglas duras (tests son la red de seguridad):
 *     1) Una venta TPV NUNCA crea un AdminOrder (no entra en /admin/pedidos).
 *     2) Calpe descuenta del stock central; el resto NUNCA toca el central.
 *     3) Calpe escribe en el libro central con metadata.salesChannel="CALPE";
 *        web escribe con salesChannel="WEB" implícito o explícito.
 *     4) Béjar/Madrid/Barcelona escriben en su propio libro
 *        (tcgacademy_tpv_<slug>_invoices) con cadena hash independiente.
 *     5) Cada tienda lleva su propio histórico de ventas
 *        (tcgacademy_tpv_<slug>_sales) — incluida Calpe.
 *     6) El emisor (issuer) de Béjar/Madrid/Barcelona es su CompanyData
 *        propia, NUNCA TCG Academy SL.
 *     7) Cadenas hash y contadores son por-tienda — manipular Béjar no
 *        altera Madrid ni el libro central.
 *
 * Este test NO importa los servicios TS — replica la lógica de routing
 * para verificar los invariantes con un mock-localStorage. Si los
 * servicios TS divergen, este test deja de proteger: hay que
 * mantenerlo SINCRONIZADO con tpvService / tpvStoreInvoiceService /
 * tpvStoreStockService / tpvStoreSalesService.
 *
 * Ejecuta: node tests/regression/tpv-multi-store-isolation.mjs
 */

import { createHash } from "node:crypto";

let passed = 0;
let failed = 0;
const failures = [];

function check(name, fn) {
  try {
    const r = fn();
    if (r === false) throw new Error("returned false");
    console.log(`  \u2713  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  \u2717  ${name}: ${e.message}`);
    failures.push({ name, msg: e.message });
    failed++;
  }
}

async function checkAsync(name, fn) {
  try {
    const r = await fn();
    if (r === false) throw new Error("returned false");
    console.log(`  \u2713  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  \u2717  ${name}: ${e.message}`);
    failures.push({ name, msg: e.message });
    failed++;
  }
}

function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}: got ${a} want ${e}`);
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

// ─── Mock localStorage ───────────────────────────────────────────────────────

function makeStore() {
  const m = new Map();
  return {
    get: (k) => (m.has(k) ? m.get(k) : null),
    set: (k, v) => m.set(k, String(v)),
    remove: (k) => m.delete(k),
    keys: () => Array.from(m.keys()),
    raw: m,
  };
}

// ─── Replica del catálogo TPV_STORES (síncrono con src/config/tpvStores.ts) ──

const TPV_STORES = {
  calpe: {
    slug: "calpe",
    name: "Calpe",
    sharesWebStock: true,
    sharesWebInvoicing: true,
    invoiceSeriesPrefix: "PC",
    channel: "CALPE",
    company: null,
  },
  bejar: {
    slug: "bejar",
    name: "Béjar",
    sharesWebStock: false,
    sharesWebInvoicing: false,
    invoiceSeriesPrefix: "PB",
    channel: "BEJAR",
    company: { name: "TCG Academy Béjar", taxId: "PENDIENTE" },
  },
  madrid: {
    slug: "madrid",
    name: "Madrid",
    sharesWebStock: false,
    sharesWebInvoicing: false,
    invoiceSeriesPrefix: "PM",
    channel: "MADRID",
    company: { name: "TCG Academy Madrid", taxId: "PENDIENTE" },
  },
  barcelona: {
    slug: "barcelona",
    name: "Barcelona",
    sharesWebStock: false,
    sharesWebInvoicing: false,
    invoiceSeriesPrefix: "PX",
    channel: "BARCELONA",
    company: { name: "TCG Academy Barcelona", taxId: "PENDIENTE" },
  },
};

const CENTRAL_ISSUER = { name: "TCG Academy SL", taxId: "B12345678" };

// Storage keys (síncrono con src/config/tpvStores.ts)
const tpvSalesKey   = (s) => `tcgacademy_tpv_${s}_sales`;
const tpvStockKey   = (s) => `tcgacademy_tpv_${s}_stock`;
const tpvInvKey     = (s) => `tcgacademy_tpv_${s}_invoices`;
const tpvInvChainKey= (s) => `tcgacademy_tpv_${s}_inv_chain`;
const CENTRAL_INV   = "tcgacademy_invoices";
const CENTRAL_PRODS = "tcgacademy_product_overrides"; // persistProductPatch SSOT
const ADMIN_ORDERS  = "tcgacademy_admin_orders";

// ─── Replica de la lógica de tpvService.completeTpvSale() ────────────────────
//
// Sólo replicamos lo necesario para verificar el ROUTING (qué clave toca y
// qué no). Cálculo numérico (totales, IVA) usa los servicios canónicos en
// runtime — aquí los IVA finales son irrelevantes para los invariantes.

async function chainHash(content, prev) {
  return sha256(content + (prev ?? ""));
}

async function completeSaleMock(ls, store, sale, productCatalog) {
  // 1) Pre-check stock
  for (const line of sale.lines) {
    const available = store.sharesWebStock
      ? productCatalog.get(line.productId) ?? 0
      : (() => {
          const raw = ls.get(tpvStockKey(store.slug));
          const map = raw ? JSON.parse(raw) : {};
          return map[line.productId] ?? 0;
        })();
    if (available < line.quantity) {
      throw new Error(`stock insuficiente productId=${line.productId} en ${store.slug}`);
    }
  }

  // 2) Decrement stock
  for (const line of sale.lines) {
    if (store.sharesWebStock) {
      productCatalog.set(line.productId, productCatalog.get(line.productId) - line.quantity);
    } else {
      const raw = ls.get(tpvStockKey(store.slug));
      const map = raw ? JSON.parse(raw) : {};
      map[line.productId] = (map[line.productId] ?? 0) - line.quantity;
      ls.set(tpvStockKey(store.slug), JSON.stringify(map));
    }
  }

  // 3) Append a la sales registry de SU tienda (todas, incluida Calpe)
  {
    const raw = ls.get(tpvSalesKey(store.slug));
    const list = raw ? JSON.parse(raw) : [];
    list.push({
      saleId: sale.saleId,
      storeSlug: store.slug,
      lines: sale.lines,
      total: sale.total,
      createdAt: new Date().toISOString(),
      invoiceId: null,
      invoiceNumber: null,
    });
    ls.set(tpvSalesKey(store.slug), JSON.stringify(list));
  }

  // 4) Crear factura — RAMA por sharesWebInvoicing
  let invoiceNumber, invoiceId, issuer, chainHashHex;
  if (store.sharesWebInvoicing) {
    // Calpe → libro central. Numera con prefijo "PC".
    const raw = ls.get(CENTRAL_INV);
    const list = raw ? JSON.parse(raw) : [];
    const year = new Date().getFullYear();
    const prefix = `${store.invoiceSeriesPrefix}-${year}-`;
    let maxN = 0;
    for (const inv of list) {
      if (!inv.invoiceNumber.startsWith(prefix)) continue;
      const n = parseInt(inv.invoiceNumber.slice(prefix.length), 10);
      if (Number.isFinite(n) && n > maxN) maxN = n;
    }
    invoiceNumber = `${prefix}${String(maxN + 1).padStart(5, "0")}`;
    invoiceId = `inv_central_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    issuer = CENTRAL_ISSUER;
    // Cadena hash usa la cadena del libro central (último registro)
    const prevChain = list.length > 0 ? list[list.length - 1].verifactuChainHash : null;
    const contentHash = sha256(`${issuer.taxId}|${invoiceNumber}|${sale.total}`);
    chainHashHex = await chainHash(contentHash, prevChain);
    list.push({
      invoiceId,
      invoiceNumber,
      issuer,
      total: sale.total,
      verifactuHash: contentHash,
      verifactuChainHash: chainHashHex,
      previousInvoiceChainHash: prevChain,
      metadata: { salesChannel: store.channel, tpvStoreSlug: store.slug },
    });
    ls.set(CENTRAL_INV, JSON.stringify(list));
  } else {
    // Standalone → libro propio.
    const raw = ls.get(tpvInvKey(store.slug));
    const list = raw ? JSON.parse(raw) : [];
    const year = new Date().getFullYear();
    const prefix = `${store.invoiceSeriesPrefix}-${year}-`;
    let maxN = 0;
    for (const inv of list) {
      if (!inv.invoiceNumber.startsWith(prefix)) continue;
      const n = parseInt(inv.invoiceNumber.slice(prefix.length), 10);
      if (Number.isFinite(n) && n > maxN) maxN = n;
    }
    invoiceNumber = `${prefix}${String(maxN + 1).padStart(5, "0")}`;
    invoiceId = `inv_${store.slug}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    issuer = store.company;
    const prevChain = ls.get(tpvInvChainKey(store.slug));
    const contentHash = sha256(`${issuer.taxId}|${invoiceNumber}|${sale.total}`);
    chainHashHex = await chainHash(contentHash, prevChain);
    list.push({
      invoiceId,
      invoiceNumber,
      issuer,
      total: sale.total,
      verifactuHash: contentHash,
      verifactuChainHash: chainHashHex,
      previousInvoiceChainHash: prevChain,
      metadata: { salesChannel: store.channel, tpvStoreSlug: store.slug },
    });
    ls.set(tpvInvKey(store.slug), JSON.stringify(list));
    ls.set(tpvInvChainKey(store.slug), chainHashHex);
  }

  // 5) Attach invoice a la sale
  {
    const raw = ls.get(tpvSalesKey(store.slug));
    const list = JSON.parse(raw);
    const idx = list.findIndex((s) => s.saleId === sale.saleId);
    list[idx].invoiceId = invoiceId;
    list[idx].invoiceNumber = invoiceNumber;
    ls.set(tpvSalesKey(store.slug), JSON.stringify(list));
  }

  // 6) Importante: NUNCA tocar admin_orders ni tcgacademy_orders
  return { invoiceId, invoiceNumber, chainHashHex };
}

// ─── Helper: lee facturas central filtradas por canal ────────────────────────

function readCentralInvoicesByChannel(ls, channel) {
  const raw = ls.get(CENTRAL_INV);
  const list = raw ? JSON.parse(raw) : [];
  if (channel === "WEB") {
    return list.filter((i) => !i.metadata || !i.metadata.salesChannel || i.metadata.salesChannel === "WEB");
  }
  return list.filter((i) => i.metadata?.salesChannel === channel);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

console.log("\n=== TPV multi-store isolation ===\n");

// Helper: crea un setup limpio con stock central y sin claves TPV
function freshSetup() {
  const ls = makeStore();
  const productCatalog = new Map();
  productCatalog.set(101, 50); // 50 unidades en catálogo central
  productCatalog.set(102, 50);
  // Stock independiente de cada tienda standalone
  for (const slug of ["bejar", "madrid", "barcelona"]) {
    ls.set(tpvStockKey(slug), JSON.stringify({ 101: 30, 102: 30 }));
  }
  return { ls, productCatalog };
}

const sale = (saleId, lines, total) => ({ saleId, lines, total });
const line = (productId, qty) => ({ productId, name: `P${productId}`, quantity: qty, unitPriceWithVat: 10, vatRate: 21 });

// 1) Calpe descuenta stock central
await checkAsync("Test 1: venta en Calpe descuenta stock CENTRAL", async () => {
  const { ls, productCatalog } = freshSetup();
  await completeSaleMock(ls, TPV_STORES.calpe, sale("PC-1", [line(101, 3)], 30), productCatalog);
  if (productCatalog.get(101) !== 47) throw new Error(`stock central=${productCatalog.get(101)} want 47`);
});

// 2) Béjar NO toca stock central
await checkAsync("Test 2: venta en Béjar NO toca stock central", async () => {
  const { ls, productCatalog } = freshSetup();
  await completeSaleMock(ls, TPV_STORES.bejar, sale("PB-1", [line(101, 5)], 50), productCatalog);
  if (productCatalog.get(101) !== 50) throw new Error(`stock central=${productCatalog.get(101)} want 50`);
  const bejarStock = JSON.parse(ls.get(tpvStockKey("bejar")));
  if (bejarStock[101] !== 25) throw new Error(`stock bejar=${bejarStock[101]} want 25`);
});

// 3) Béjar/Madrid/Barcelona — stocks mutuamente independientes
await checkAsync("Test 3: stock Béjar / Madrid / Barcelona NO se afectan entre sí", async () => {
  const { ls, productCatalog } = freshSetup();
  await completeSaleMock(ls, TPV_STORES.bejar, sale("PB-1", [line(101, 1)], 10), productCatalog);
  const madStock = JSON.parse(ls.get(tpvStockKey("madrid")));
  const bcnStock = JSON.parse(ls.get(tpvStockKey("barcelona")));
  if (madStock[101] !== 30) throw new Error("Madrid afectada por venta Béjar");
  if (bcnStock[101] !== 30) throw new Error("Barcelona afectada por venta Béjar");
});

// 4) Calpe escribe factura en libro CENTRAL con salesChannel="CALPE"
await checkAsync("Test 4: factura Calpe entra en libro central con salesChannel=CALPE", async () => {
  const { ls, productCatalog } = freshSetup();
  await completeSaleMock(ls, TPV_STORES.calpe, sale("PC-1", [line(101, 1)], 10), productCatalog);
  const central = JSON.parse(ls.get(CENTRAL_INV));
  if (central.length !== 1) throw new Error(`central invoices count=${central.length} want 1`);
  if (central[0].metadata.salesChannel !== "CALPE") throw new Error("salesChannel != CALPE");
  if (!central[0].invoiceNumber.startsWith("PC-")) throw new Error("prefix != PC-");
  if (ls.get(tpvInvKey("calpe"))) throw new Error("Calpe NO debe tener libro propio");
});

// 5) Béjar NO escribe en libro central
await checkAsync("Test 5: factura Béjar NO entra en libro central", async () => {
  const { ls, productCatalog } = freshSetup();
  await completeSaleMock(ls, TPV_STORES.bejar, sale("PB-1", [line(101, 1)], 10), productCatalog);
  const central = ls.get(CENTRAL_INV);
  if (central) {
    const list = JSON.parse(central);
    if (list.length !== 0) throw new Error(`central tiene ${list.length} factura(s)`);
  }
  const bejarBook = JSON.parse(ls.get(tpvInvKey("bejar")));
  if (bejarBook.length !== 1) throw new Error(`Béjar libro count=${bejarBook.length} want 1`);
  if (!bejarBook[0].invoiceNumber.startsWith("PB-")) throw new Error("prefix != PB-");
});

// 6) Filtros WEB vs CALPE en libro central — separación visible
await checkAsync("Test 6: libro central separa WEB y CALPE por filtro de canal", async () => {
  const { ls, productCatalog } = freshSetup();
  // Simulamos una factura web preexistente (sin metadata o salesChannel=WEB)
  ls.set(CENTRAL_INV, JSON.stringify([
    { invoiceId: "inv_web_1", invoiceNumber: "FAC-2026-00001", total: 100, metadata: { salesChannel: "WEB" } },
  ]));
  await completeSaleMock(ls, TPV_STORES.calpe, sale("PC-1", [line(101, 1)], 10), productCatalog);
  const web = readCentralInvoicesByChannel(ls, "WEB");
  const calpe = readCentralInvoicesByChannel(ls, "CALPE");
  if (web.length !== 1) throw new Error(`web=${web.length} want 1`);
  if (calpe.length !== 1) throw new Error(`calpe=${calpe.length} want 1`);
  // WEB + CALPE = total libro central
  const totalCentral = JSON.parse(ls.get(CENTRAL_INV)).length;
  if (web.length + calpe.length !== totalCentral) {
    throw new Error("WEB + CALPE != total central — hay facturas perdidas");
  }
});

// 7) Issuer correcto por tienda
await checkAsync("Test 7: issuer es store.company para standalone, central para Calpe", async () => {
  const { ls, productCatalog } = freshSetup();
  await completeSaleMock(ls, TPV_STORES.calpe, sale("PC-1", [line(101, 1)], 10), productCatalog);
  await completeSaleMock(ls, TPV_STORES.bejar, sale("PB-1", [line(101, 1)], 10), productCatalog);
  const calpeInv = JSON.parse(ls.get(CENTRAL_INV))[0];
  const bejarInv = JSON.parse(ls.get(tpvInvKey("bejar")))[0];
  if (calpeInv.issuer.taxId !== CENTRAL_ISSUER.taxId) {
    throw new Error(`Calpe issuer.taxId=${calpeInv.issuer.taxId} want ${CENTRAL_ISSUER.taxId}`);
  }
  if (bejarInv.issuer.taxId !== "PENDIENTE") {
    throw new Error(`Béjar issuer.taxId=${bejarInv.issuer.taxId} want PENDIENTE`);
  }
  if (bejarInv.issuer.name === CENTRAL_ISSUER.name) {
    throw new Error("Béjar emite con nombre de TCG Academy SL — fuga fiscal");
  }
});

// 8) Cadenas hash independientes — manipular Béjar no altera Madrid ni central
await checkAsync("Test 8: cadenas hash independientes entre tiendas standalone y central", async () => {
  const { ls, productCatalog } = freshSetup();
  await completeSaleMock(ls, TPV_STORES.calpe, sale("PC-1", [line(101, 1)], 10), productCatalog);
  await completeSaleMock(ls, TPV_STORES.bejar, sale("PB-1", [line(101, 1)], 10), productCatalog);
  await completeSaleMock(ls, TPV_STORES.madrid, sale("PM-1", [line(101, 1)], 10), productCatalog);

  const centralChainBefore = JSON.parse(ls.get(CENTRAL_INV)).map((i) => i.verifactuChainHash);
  const madridChainBefore = ls.get(tpvInvChainKey("madrid"));

  // Tampering: forzamos otra factura en Béjar; sólo debe cambiar la cadena de Béjar.
  await completeSaleMock(ls, TPV_STORES.bejar, sale("PB-2", [line(101, 1)], 10), productCatalog);

  const centralChainAfter = JSON.parse(ls.get(CENTRAL_INV)).map((i) => i.verifactuChainHash);
  const madridChainAfter = ls.get(tpvInvChainKey("madrid"));
  eq(centralChainAfter, centralChainBefore, "central chain alterada por venta Béjar");
  if (madridChainAfter !== madridChainBefore) throw new Error("Madrid chain alterada por venta Béjar");
});

// 9) Numeración independiente por serie — PC-1, PB-1, PM-1, PX-1 coexisten
await checkAsync("Test 9: numeración independiente por serie — prefijos no chocan", async () => {
  const { ls, productCatalog } = freshSetup();
  const r1 = await completeSaleMock(ls, TPV_STORES.calpe, sale("S-1", [line(101, 1)], 10), productCatalog);
  const r2 = await completeSaleMock(ls, TPV_STORES.bejar, sale("S-2", [line(101, 1)], 10), productCatalog);
  const r3 = await completeSaleMock(ls, TPV_STORES.madrid, sale("S-3", [line(101, 1)], 10), productCatalog);
  const r4 = await completeSaleMock(ls, TPV_STORES.barcelona, sale("S-4", [line(101, 1)], 10), productCatalog);
  if (!r1.invoiceNumber.includes("PC-")) throw new Error(`Calpe num=${r1.invoiceNumber}`);
  if (!r2.invoiceNumber.includes("PB-")) throw new Error(`Béjar num=${r2.invoiceNumber}`);
  if (!r3.invoiceNumber.includes("PM-")) throw new Error(`Madrid num=${r3.invoiceNumber}`);
  if (!r4.invoiceNumber.includes("PX-")) throw new Error(`Barcelona num=${r4.invoiceNumber}`);
  // Cada uno tiene su -00001
  for (const r of [r1, r2, r3, r4]) {
    if (!r.invoiceNumber.endsWith("-00001")) throw new Error(`${r.invoiceNumber} no termina en 00001`);
  }
});

// 10) TPV NUNCA crea AdminOrder
await checkAsync("Test 10: ninguna venta TPV escribe en tcgacademy_admin_orders", async () => {
  const { ls, productCatalog } = freshSetup();
  await completeSaleMock(ls, TPV_STORES.calpe, sale("S-1", [line(101, 1)], 10), productCatalog);
  await completeSaleMock(ls, TPV_STORES.bejar, sale("S-2", [line(101, 1)], 10), productCatalog);
  await completeSaleMock(ls, TPV_STORES.madrid, sale("S-3", [line(101, 1)], 10), productCatalog);
  await completeSaleMock(ls, TPV_STORES.barcelona, sale("S-4", [line(101, 1)], 10), productCatalog);
  const adminOrders = ls.get(ADMIN_ORDERS);
  if (adminOrders !== null) {
    const list = JSON.parse(adminOrders);
    if (Array.isArray(list) && list.length > 0) {
      throw new Error(`admin_orders contiene ${list.length} entradas — TPV no debe crear pedidos`);
    }
  }
});

// 11) Cada tienda mantiene su propio sales registry (incluida Calpe)
await checkAsync("Test 11: cada tienda registra su propia venta en tpv_<slug>_sales", async () => {
  const { ls, productCatalog } = freshSetup();
  await completeSaleMock(ls, TPV_STORES.calpe, sale("S-C", [line(101, 1)], 10), productCatalog);
  await completeSaleMock(ls, TPV_STORES.bejar, sale("S-B", [line(101, 1)], 10), productCatalog);
  await completeSaleMock(ls, TPV_STORES.madrid, sale("S-M", [line(101, 1)], 10), productCatalog);
  await completeSaleMock(ls, TPV_STORES.barcelona, sale("S-X", [line(101, 1)], 10), productCatalog);
  for (const slug of ["calpe", "bejar", "madrid", "barcelona"]) {
    const list = JSON.parse(ls.get(tpvSalesKey(slug)));
    if (list.length !== 1) throw new Error(`${slug} sales count=${list.length} want 1`);
    if (!list[0].invoiceId) throw new Error(`${slug} sale no tiene invoiceId asociado`);
    if (list[0].storeSlug !== slug) throw new Error(`${slug} sale.storeSlug != ${slug}`);
  }
});

// 12) Stock standalone insuficiente bloquea — y NO descuenta nada parcial
await checkAsync("Test 12: stock standalone insuficiente lanza y no escribe factura", async () => {
  const { ls, productCatalog } = freshSetup();
  // Béjar tiene 30 de productId 101
  let threw = false;
  try {
    await completeSaleMock(ls, TPV_STORES.bejar, sale("S-OOB", [line(101, 999)], 10), productCatalog);
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("debió lanzar por stock insuficiente");
  // No debe haber factura ni cadena de Béjar
  if (ls.get(tpvInvKey("bejar"))) throw new Error("Béjar libro creado pese a fallo");
  if (ls.get(tpvInvChainKey("bejar"))) throw new Error("Béjar chain creada pese a fallo");
});

// ─── Resumen ────────────────────────────────────────────────────────────────

console.log(`\nResultado: ${passed} pasados, ${failed} fallidos`);
if (failed > 0) {
  console.error("\nFallos:");
  for (const f of failures) console.error(`  - ${f.name}: ${f.msg}`);
  process.exit(1);
}
process.exit(0);
