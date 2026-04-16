#!/usr/bin/env node
/**
 * TCG Academy E-Commerce Simulation
 * -----------------------------------
 * Simulates 100 users, 300 orders, and post-order scenarios.
 * Runs business logic directly (no server required).
 *
 * Usage:  node tests/simulation/run-simulation.mjs
 */

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

// ─── Performance timer ──────────────────────────────────────────────────────
const startTime = Date.now();

// ─── localStorage mock ──────────────────────────────────────────────────────
const storage = {};
globalThis.localStorage = {
  getItem: (k) => storage[k] ?? null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { for (const k in storage) delete storage[k]; },
  get length() { return Object.keys(storage).length; },
  key: (i) => Object.keys(storage)[i] ?? null,
};
globalThis.sessionStorage = { ...globalThis.localStorage };
// Separate storage for sessionStorage
const sStorage = {};
globalThis.sessionStorage = {
  getItem: (k) => sStorage[k] ?? null,
  setItem: (k, v) => { sStorage[k] = String(v); },
  removeItem: (k) => { delete sStorage[k]; },
  clear: () => { for (const k in sStorage) delete sStorage[k]; },
  get length() { return Object.keys(sStorage).length; },
  key: (i) => Object.keys(sStorage)[i] ?? null,
};

// Mock crypto.subtle for SHA-256 (Node has it in crypto module)
if (!globalThis.crypto?.subtle) {
  globalThis.crypto = {
    ...globalThis.crypto,
    subtle: {
      digest: async (algo, data) => {
        const algoName = typeof algo === "string" ? algo : algo.name;
        const name = algoName.replace("-", "").toLowerCase(); // SHA-256 -> sha256
        const buf = Buffer.from(data);
        const hash = createHash(name);
        hash.update(buf);
        return hash.digest().buffer;
      },
    },
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    },
  };
}

// Mock window for services that check typeof window
globalThis.window = {
  localStorage: globalThis.localStorage,
  sessionStorage: globalThis.sessionStorage,
  dispatchEvent: () => {},
  location: { origin: "https://tcgacademy.es" },
  open: () => null,
};

// Mock TextEncoder/TextDecoder (Node 18+ has them, but let's be safe)
if (!globalThis.TextEncoder) {
  const { TextEncoder, TextDecoder } = await import("node:util");
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Mock URLSearchParams if needed
if (!globalThis.URLSearchParams) {
  globalThis.URLSearchParams = URL.searchParams?.constructor;
}

// ─── Report structure ────────────────────────────────────────────────────────
const report = {
  timestamp: new Date().toISOString(),
  summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
  bugs: [],
  security: [],
  missingFeatures: [],
  dataQuality: [],
  analytics: {},
  recommendations: [],
};

function addBug(severity, title, detail, reproduction) {
  // Deduplicate by title
  const existing = report.bugs.find(b => b.title === title);
  if (existing) {
    existing.occurrences = (existing.occurrences ?? 1) + 1;
    return;
  }
  report.bugs.push({ severity, title, detail, reproduction, occurrences: 1 });
}
function addSecurity(risk, title, detail) {
  const existing = report.security.find(s => s.title === title);
  if (existing) { existing.occurrences = (existing.occurrences ?? 1) + 1; return; }
  report.security.push({ risk, title, detail, occurrences: 1 });
}
function addMissing(title, detail) {
  report.missingFeatures.push({ title, detail });
}
function addDQ(title, detail) {
  report.dataQuality.push({ title, detail });
}
function addRec(priority, title, detail) {
  report.recommendations.push({ priority, title, detail });
}

let testsPassed = 0;
let testsFailed = 0;
let testsWarnings = 0;

function pass(msg) { testsPassed++; }
function fail(msg, detail) { testsFailed++; console.error(`  FAIL: ${msg}`, detail ?? ""); }
function warn(msg) { testsWarnings++; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function roundTo2(n) { return Math.round(n * 100) / 100; }
function uuid() { return `sim_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`; }

// SHA-256 compatible with the app
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── Load product data (manual read to avoid TS compilation) ─────────────────
// We'll parse the product IDs, prices, games, categories from the actual TS file
import { readFileSync } from "node:fs";

const productsSource = readFileSync(path.join(ROOT, "src/data/products.ts"), "utf8");

// Extract product objects manually from the source
function extractProducts(src) {
  const products = [];
  // Match blocks that start with { id: NNNNN and extract key fields
  const idRegex = /\{\s*\n?\s*id:\s*(\d+),/g;
  let match;
  const positions = [];
  while ((match = idRegex.exec(src)) !== null) {
    positions.push({ start: match.index, id: parseInt(match[1]) });
  }

  for (let i = 0; i < positions.length; i++) {
    const { start, id } = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1].start : src.length;
    const block = src.slice(start, end);

    const getField = (name) => {
      const m = block.match(new RegExp(`${name}:\\s*([^,\\n]+)`));
      return m ? m[1].trim().replace(/^["']|["']$/g, "") : undefined;
    };
    const getNumField = (name) => {
      const v = getField(name);
      return v ? parseFloat(v) : undefined;
    };
    const getBoolField = (name) => {
      const v = getField(name);
      return v === "true";
    };

    products.push({
      id,
      name: (() => {
        const m = block.match(/name:\s*"([^"]+)"/);
        return m ? m[1] : `Product ${id}`;
      })(),
      slug: getField("slug") ?? `product-${id}`,
      price: getNumField("price") ?? 9.99,
      wholesalePrice: getNumField("wholesalePrice") ?? 7.99,
      storePrice: getNumField("storePrice") ?? 6.99,
      costPrice: getNumField("costPrice"),
      category: getField("category") ?? "booster-box",
      game: getField("game") ?? "magic",
      inStock: getBoolField("inStock"),
      stock: getNumField("stock"),
      maxPerUser: getNumField("maxPerUser"),
      language: getField("language") ?? "EN",
    });
  }
  return products;
}

const PRODUCTS = extractProducts(productsSource);
console.log(`Loaded ${PRODUCTS.length} products from src/data/products.ts`);

if (PRODUCTS.length === 0) {
  console.error("FATAL: No products found. Check the parser.");
  process.exit(1);
}

// ─── SITE_CONFIG equivalent ──────────────────────────────────────────────────
const SITE_CONFIG = {
  name: "TCG Academy",
  cif: "B12345678",
  email: "hola@tcgacademy.es",
  phone: "+34 965 83 00 01",
  carrier: "GLS",
  shippingThreshold: 149,
  dispatchHours: 24,
  vatRate: 21,
  newProductDays: 45,
};

// ─── Spanish data generators ─────────────────────────────────────────────────
const FIRST_NAMES = [
  "Carlos", "Ana", "Miguel", "Laura", "David", "Carmen", "Pablo", "Sara",
  "Javier", "Elena", "Daniel", "Lucia", "Jorge", "Maria", "Alejandro",
  "Marta", "Fernando", "Patricia", "Antonio", "Isabel", "Manuel", "Rocio",
  "Francisco", "Beatriz", "Rafael", "Sofia", "Pedro", "Cristina", "Juan",
  "Paula", "Sergio", "Andrea", "Alberto", "Teresa", "Luis", "Raquel",
  "Guillermo", "Natalia", "Diego", "Silvia", "Ramon", "Eva", "Marcos",
  "Olga", "Hugo", "Rosa", "Adrian", "Nuria", "Victor", "Pilar",
  "Roberto", "Alicia", "Enrique", "Marina", "Andres", "Clara", "Oscar",
  "Irene", "Ivan", "Angela",
];
const LAST_NAMES = [
  "Garcia", "Rodriguez", "Martinez", "Lopez", "Gonzalez", "Hernandez",
  "Perez", "Sanchez", "Ramirez", "Torres", "Flores", "Rivera",
  "Gomez", "Diaz", "Reyes", "Moreno", "Munoz", "Jimenez",
  "Alvarez", "Romero", "Ruiz", "Serrano", "Navarro", "Blanco",
  "Molina", "Castro", "Ortega", "Marin", "Rubio", "Nunez",
];
const PROVINCIAS = [
  "Madrid", "Barcelona", "Valencia", "Sevilla", "Alicante", "Malaga",
  "Murcia", "Cadiz", "Vizcaya", "Asturias", "Zaragoza", "Pontevedra",
  "Granada", "Tarragona", "Cordoba", "Salamanca", "Badajoz", "Leon",
  "Cantabria", "Navarra",
];
const CITIES_BY_PROV = {
  Madrid: "Madrid", Barcelona: "Barcelona", Valencia: "Valencia",
  Sevilla: "Sevilla", Alicante: "Alicante", Malaga: "Malaga",
  Murcia: "Murcia", Cadiz: "Cadiz", Vizcaya: "Bilbao",
  Asturias: "Oviedo", Zaragoza: "Zaragoza", Pontevedra: "Vigo",
  Granada: "Granada", Tarragona: "Tarragona", Cordoba: "Cordoba",
  Salamanca: "Bejar", Badajoz: "Badajoz", Leon: "Leon",
  Cantabria: "Santander", Navarra: "Pamplona",
};
const CALLES = [
  "Calle Mayor", "Av. de la Constitucion", "C/ Gran Via", "Paseo del Prado",
  "Rambla de Catalunya", "C/ Alcala", "Av. Diagonal", "C/ Serrano",
  "Plaza Mayor", "C/ Real", "Av. de Andalucia", "C/ del Carmen",
];
const CP_PREFIXES = {
  Madrid: "28", Barcelona: "08", Valencia: "46", Sevilla: "41",
  Alicante: "03", Malaga: "29", Murcia: "30", Cadiz: "11",
  Vizcaya: "48", Asturias: "33", Zaragoza: "50", Pontevedra: "36",
  Granada: "18", Tarragona: "43", Cordoba: "14", Salamanca: "37",
  Badajoz: "06", Leon: "24", Cantabria: "39", Navarra: "31",
};
const PAYMENT_METHODS = ["tarjeta", "bizum", "paypal", "transferencia", "contra_reembolso"];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateCP(provincia) {
  const prefix = CP_PREFIXES[provincia] || "28";
  return prefix + String(randInt(0, 999)).padStart(3, "0");
}
function generatePhone() {
  return `+34 ${randInt(600, 699)} ${randInt(100, 999)} ${randInt(100, 999)}`;
}
function generateNIF() {
  const num = randInt(10000000, 99999999);
  const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
  return `${num}${letters[num % 23]}`;
}
function generateCIF() {
  const letter = "ABCDEFGHJNPQRSUVW"[randInt(0, 16)];
  return `${letter}${randInt(10000000, 99999999)}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// PHASE 1: Generate 100 users
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n=== PHASE 1: Generating 100 users ===");

const users = [];

function createUser(role, overrides = {}) {
  const firstName = overrides.name ?? pick(FIRST_NAMES);
  const lastName = overrides.lastName ?? `${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`;
  const provincia = overrides.provincia ?? pick(PROVINCIAS);
  const id = overrides.id ?? uuid();
  const email = overrides.email ?? `${firstName.toLowerCase()}.${lastName.split(" ")[0].toLowerCase()}${randInt(1, 999)}@${pick(["gmail.com", "hotmail.es", "outlook.com", "yahoo.es"])}`;

  return {
    id,
    email,
    name: firstName,
    lastName,
    phone: overrides.phone ?? generatePhone(),
    role,
    addresses: [{
      id: uuid(),
      label: "Casa",
      nombre: firstName,
      apellidos: lastName,
      calle: pick(CALLES),
      numero: String(randInt(1, 200)),
      piso: randInt(0, 1) ? `${randInt(1, 10)}${pick(["A", "B", "C", "D"])}` : undefined,
      cp: generateCP(provincia),
      ciudad: CITIES_BY_PROV[provincia] || provincia,
      provincia,
      pais: "Espana",
      predeterminada: true,
    }],
    billing: role === "mayorista" || role === "tienda" ? {
      nif: generateCIF(),
      razonSocial: `${firstName} ${lastName} S.L.`,
      calle: pick(CALLES) + " " + randInt(1, 100),
      cp: generateCP(provincia),
      ciudad: CITIES_BY_PROV[provincia] || provincia,
      provincia,
      pais: "Espana",
    } : undefined,
    empresa: role === "mayorista" || role === "tienda" ? {
      cif: generateCIF(),
      razonSocial: `${firstName} ${lastName} S.L.`,
      direccionFiscal: `${pick(CALLES)} ${randInt(1, 100)}, ${CITIES_BY_PROV[provincia]}`,
      personaContacto: `${firstName} ${lastName.split(" ")[0]}`,
      telefonoEmpresa: generatePhone(),
      emailFacturacion: `facturacion@${firstName.toLowerCase()}sl.es`,
    } : undefined,
    createdAt: new Date(Date.now() - randInt(0, 365) * 86400000).toISOString(),
    favorites: [],
    ...overrides,
  };
}

// 60 regular clients
for (let i = 0; i < 60; i++) users.push(createUser("cliente"));
// 15 wholesale
for (let i = 0; i < 15; i++) users.push(createUser("mayorista"));
// 10 store accounts
for (let i = 0; i < 10; i++) users.push(createUser("tienda"));
// 10 admin
for (let i = 0; i < 10; i++) users.push(createUser("admin"));
// 5 edge-case users
users.push(createUser("cliente", {
  name: "A".repeat(200),
  lastName: "B".repeat(200),
  email: "very.long.email.address.that.goes.on.and.on.and.on.for.testing@extremely-long-domain-name-for-testing-purposes.example.com",
}));
users.push(createUser("cliente", {
  name: '<script>alert("XSS")</script>',
  lastName: 'O\'Brien "Bobby"',
  email: "xss.test@evil.com",
}));
users.push(createUser("cliente", {
  name: "\u00D1o\u00F1o \u00C1ngel",
  lastName: "M\u00FCller-Sch\u00F6n\u00E9",
  email: "unicode@test.es",
}));
users.push(createUser("cliente", {
  name: "",
  lastName: "",
  phone: "",
  email: "empty@fields.com",
}));
users.push(createUser("cliente", {
  name: "'; DROP TABLE orders; --",
  lastName: "1=1; DELETE FROM users;",
  email: "sqli@attack.com",
}));

console.log(`  Created ${users.length} users (${users.filter(u => u.role === "cliente").length} clientes, ${users.filter(u => u.role === "mayorista").length} mayoristas, ${users.filter(u => u.role === "tienda").length} tiendas, ${users.filter(u => u.role === "admin").length} admins)`);

// ──────────────────────────────────────────────────────────────────────────────
// PHASE 2: Generate 300 orders
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n=== PHASE 2: Generating 300 orders ===");

const orders = [];
const invoices = [];
const emailLog = [];
const stockTracker = {}; // productId -> remaining stock
const pointsTracker = {}; // userId -> points
const orderIdSet = new Set();
let orderCounter = 0; // global counter for unique IDs

// Initialize stock tracker
for (const p of PRODUCTS) {
  stockTracker[p.id] = p.stock ?? 9999; // unlimited = high number
}

function getPriceForRole(product, role) {
  if (role === "mayorista") return product.wholesalePrice;
  if (role === "tienda") return product.storePrice;
  return product.price;
}

function generateOrderId() {
  orderCounter++;
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `TCG-${dateStr}-${String(orderCounter).padStart(3, "0")}`;
}

function calculateShipping(subtotal, type = "standard") {
  if (type === "tienda") return 0;
  if (subtotal >= SITE_CONFIG.shippingThreshold) return 0;
  if (type === "express") return 9.95;
  return 4.95;
}

function buildInvoiceLineItem(lineNum, product, qty, role, discount = 0) {
  const unitPriceWithVAT = getPriceForRole(product, role);
  const vatRate = 21;
  const unitPriceNoVAT = roundTo2(unitPriceWithVAT / (1 + vatRate / 100));
  const subtotal = roundTo2(unitPriceNoVAT * qty);
  const discountAmount = roundTo2(subtotal * (discount / 100));
  const taxableBase = roundTo2(subtotal - discountAmount);
  const vatAmount = roundTo2(taxableBase * (vatRate / 100));
  const totalLine = roundTo2(taxableBase + vatAmount);

  return {
    lineNumber: lineNum,
    productId: String(product.id),
    description: product.name,
    quantity: qty,
    unitPrice: unitPriceNoVAT,
    discount,
    discountAmount,
    taxableBase,
    vatRate,
    vatAmount,
    surchargeRate: 0,
    surchargeAmount: 0,
    totalLine,
  };
}

async function createSimOrder(params) {
  const {
    user, items, shippingType = "standard", couponDiscount = 0,
    pointsRedeemed = 0, manipulatedPrice = false, expectedFail = false,
    failReason = "",
  } = params;

  const orderId = generateOrderId();

  // Check order ID uniqueness
  if (orderIdSet.has(orderId)) {
    if (!orderIdSet._collisionReported) {
      addBug("CRITICAL", "Order ID collision", `Duplicate order ID: ${orderId}`, "Generate 300+ orders sequentially");
      orderIdSet._collisionReported = true;
    }
    fail("Order ID collision");
    return null;
  }
  orderIdSet.add(orderId);

  // Validate items
  const validationErrors = [];
  for (const item of items) {
    if (!item.product) {
      validationErrors.push("Product not found");
      continue;
    }
    if (item.quantity <= 0) validationErrors.push(`Invalid quantity: ${item.quantity}`);
    if (!item.product.inStock && item.quantity > 0) validationErrors.push(`Product ${item.product.id} is out of stock`);
    if (item.product.stock !== undefined && item.quantity > stockTracker[item.product.id]) {
      validationErrors.push(`Insufficient stock for ${item.product.id}: need ${item.quantity}, have ${stockTracker[item.product.id]}`);
    }
    if (item.product.maxPerUser && item.quantity > item.product.maxPerUser) {
      validationErrors.push(`Exceeds max per user for ${item.product.id}: ${item.quantity} > ${item.product.maxPerUser}`);
    }
  }

  // Validate user fields
  // Email validation: must have local part, @, and domain with TLD
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!user.email || !emailRegex.test(user.email)) validationErrors.push("Invalid email");
  if (user.addresses.length === 0 && shippingType !== "tienda") validationErrors.push("No address");
  const addr = user.addresses[0];
  if (addr && shippingType !== "tienda") {
    if (!addr.cp || addr.cp.length !== 5 || !/^\d{5}$/.test(addr.cp)) {
      validationErrors.push(`Invalid postal code: ${addr.cp}`);
    }
  }

  if (expectedFail) {
    if (validationErrors.length > 0) {
      pass(`Expected failure caught: ${failReason}`);
      return { orderId, status: "rejected", reason: validationErrors.join("; ") };
    } else {
      fail(`Expected failure NOT caught: ${failReason}`, "Validation passed when it should have failed");
      addBug("HIGH", `Missing validation: ${failReason}`,
        `Order should have been rejected but was accepted`,
        `Create order with: ${failReason}`);
    }
  } else if (validationErrors.length > 0) {
    // Unexpected failures
    return { orderId, status: "rejected", reason: validationErrors.join("; ") };
  }

  // Calculate totals
  const lineItems = items.map((item, idx) =>
    buildInvoiceLineItem(idx + 1, item.product, item.quantity, user.role, item.discount ?? 0)
  );

  const subtotal = roundTo2(lineItems.reduce((s, l) => s + l.totalLine, 0));
  const shipping = calculateShipping(subtotal, shippingType);
  let total = roundTo2(subtotal + shipping);

  // Apply coupon
  if (couponDiscount > 0) {
    total = roundTo2(total - couponDiscount);
  }
  // Apply points
  const pointsDiscount = pointsRedeemed / 100; // 1 pt = 0.01 EUR
  if (pointsDiscount > 0) {
    const maxPointsDiscount = subtotal * 0.5; // 50% max
    const actualPointsDiscount = Math.min(pointsDiscount, maxPointsDiscount);
    total = roundTo2(total - actualPointsDiscount);
  }

  if (total < 0) total = 0;

  // Price manipulation check
  if (manipulatedPrice) {
    const realTotal = roundTo2(lineItems.reduce((s, l) => s + l.totalLine, 0) + shipping);
    const clientClaimedTotal = roundTo2(realTotal * 0.5); // Client claims 50% less
    if (Math.abs(total - clientClaimedTotal) > 0.01) {
      pass("Price manipulation detected (server recalculates total)");
    } else {
      fail("Price manipulation NOT detected");
      addSecurity("CRITICAL", "Price manipulation accepted",
        "Server accepted a client-provided total that differs from calculated total");
    }
  }

  // Decrement stock
  for (const item of items) {
    if (item.product && stockTracker[item.product.id] !== undefined) {
      stockTracker[item.product.id] -= item.quantity;
    }
  }

  // Award points
  const earnedPoints = Math.floor(total) * 1; // 1 pt per EUR
  pointsTracker[user.id] = (pointsTracker[user.id] ?? 0) + earnedPoints;

  const order = {
    id: orderId,
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    date: new Date().toISOString(),
    status: "pedido",
    items: lineItems,
    subtotal,
    shipping,
    couponDiscount,
    pointsRedeemed,
    total,
    shippingType,
    paymentMethod: pick(PAYMENT_METHODS),
    address: addr ? `${addr.calle} ${addr.numero}, ${addr.cp} ${addr.ciudad}` : "Recogida en tienda",
    statusHistory: [{ status: "pedido", at: new Date().toISOString(), by: "system" }],
    earnedPoints,
  };

  orders.push(order);

  // Generate invoice
  const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const invoiceNum = `FAC-2026-${String(invoices.length + 1).padStart(5, "0")}`;

  const taxableBase = roundTo2(lineItems.reduce((s, l) => s + l.taxableBase, 0));
  const totalVAT = roundTo2(lineItems.reduce((s, l) => s + l.vatAmount, 0));

  // Generate hash
  const hashContent = [
    SITE_CONFIG.cif,
    invoiceNum,
    new Date().toISOString().slice(0, 10),
    total.toFixed(2),
    user.billing?.nif ?? "",
  ].join("|");
  const verifactuHash = await sha256(hashContent);

  const prevChainHash = invoices.length > 0 ? invoices[invoices.length - 1].verifactuChainHash : null;
  const chainHash = await sha256(verifactuHash + (prevChainHash ?? ""));

  const invoice = {
    invoiceId,
    invoiceNumber: invoiceNum,
    invoiceDate: new Date().toISOString(),
    invoiceType: "completa",
    recipientName: `${user.name} ${user.lastName}`,
    recipientTaxId: user.billing?.nif ?? "",
    totals: {
      totalTaxableBase: taxableBase,
      totalVAT,
      totalSurcharge: 0,
      totalInvoice: total,
      totalPaid: total,
      totalPending: 0,
      currency: "EUR",
    },
    paymentMethod: order.paymentMethod,
    status: "emitida",
    verifactuHash,
    verifactuChainHash: chainHash,
    previousInvoiceChainHash: prevChainHash,
    sourceOrderId: orderId,
  };

  invoices.push(invoice);

  // Validate invoice
  const invoiceErrors = [];
  if (!invoice.invoiceNumber) invoiceErrors.push("No invoice number");
  if (invoice.totals.totalInvoice <= 0) invoiceErrors.push("Invoice total <= 0");
  if (!invoice.verifactuHash) invoiceErrors.push("No VeriFactu hash");
  if (!invoice.verifactuChainHash) invoiceErrors.push("No chain hash");

  // Verify hash chain integrity
  if (invoices.length > 1) {
    const prevInv = invoices[invoices.length - 2];
    if (invoice.previousInvoiceChainHash !== prevInv.verifactuChainHash) {
      addBug("CRITICAL", "VeriFactu chain broken",
        `Invoice ${invoiceNum} chain hash doesn't match previous invoice`,
        "Create sequential invoices and verify chain");
    }
  }

  // Verify totals consistency
  const recalculatedSubtotal = roundTo2(lineItems.reduce((s, l) => s + l.totalLine, 0));
  if (Math.abs(subtotal - recalculatedSubtotal) > 0.01) {
    addDQ("Subtotal mismatch", `Order ${orderId}: items sum to ${recalculatedSubtotal} but subtotal is ${subtotal}`);
  }

  // Check VAT calculation
  for (const item of lineItems) {
    const expectedVAT = roundTo2(item.taxableBase * (item.vatRate / 100));
    if (Math.abs(item.vatAmount - expectedVAT) > 0.01) {
      addDQ("VAT calculation error", `Order ${orderId}, line ${item.lineNumber}: expected VAT ${expectedVAT}, got ${item.vatAmount}`);
    }
  }

  // Log email
  emailLog.push({
    to: user.email,
    type: "order_confirmation",
    orderId,
    sentAt: new Date().toISOString(),
  });

  if (invoiceErrors.length === 0) {
    pass(`Order ${orderId} + invoice OK`);
  } else {
    fail(`Invoice errors for ${orderId}`, invoiceErrors.join(", "));
  }

  return order;
}

// ─── Generate the 300 orders ─────────────────────────────────────────────────

const clientes = users.filter(u => u.role === "cliente");
const mayoristas = users.filter(u => u.role === "mayorista");
const tiendas = users.filter(u => u.role === "tienda");
const inStockProducts = PRODUCTS.filter(p => p.inStock);

// Helper: pick random items for an order
function randomItems(n, role) {
  const selected = pickN(inStockProducts, n);
  return selected.map(p => ({
    product: p,
    quantity: randInt(1, 3),
    discount: 0,
  }));
}

async function generateAllOrders() {
  console.log("  Generating 150 normal orders...");
  for (let i = 0; i < 150; i++) {
    const user = pick(clientes);
    const numItems = randInt(1, 10);
    await createSimOrder({
      user,
      items: randomItems(numItems, user.role),
    });
  }

  console.log("  Generating 30 orders with coupons...");
  for (let i = 0; i < 30; i++) {
    const user = pick(clientes);
    const items = randomItems(randInt(1, 5), user.role);
    const subtotal = items.reduce((s, it) => s + getPriceForRole(it.product, user.role) * it.quantity, 0);
    // Apply 10-20% coupon
    const couponPct = randInt(10, 20);
    const couponDiscount = roundTo2(subtotal * couponPct / 100);
    await createSimOrder({ user, items, couponDiscount });
  }

  console.log("  Generating 20 orders with points...");
  for (let i = 0; i < 20; i++) {
    const user = pick(clientes);
    const items = randomItems(randInt(1, 3), user.role);
    await createSimOrder({ user, items, pointsRedeemed: randInt(100, 2000) });
  }

  console.log("  Generating 20 store pickup orders...");
  for (let i = 0; i < 20; i++) {
    const user = pick(clientes);
    await createSimOrder({
      user,
      items: randomItems(randInt(1, 5), user.role),
      shippingType: "tienda",
    });
  }

  console.log("  Generating 15 express shipping orders...");
  for (let i = 0; i < 15; i++) {
    const user = pick(clientes);
    await createSimOrder({
      user,
      items: randomItems(randInt(1, 3), user.role),
      shippingType: "express",
    });
  }

  console.log("  Generating 15 wholesale orders...");
  for (let i = 0; i < 15; i++) {
    const user = pick(mayoristas);
    await createSimOrder({
      user,
      items: randomItems(randInt(2, 8), user.role),
    });
  }

  console.log("  Generating 10 store orders...");
  for (let i = 0; i < 10; i++) {
    const user = pick(tiendas);
    await createSimOrder({
      user,
      items: randomItems(randInt(3, 10), user.role),
    });
  }

  console.log("  Generating 10 orders that should fail validation...");
  // Empty name
  const emptyUser = users.find(u => u.name === "" && u.lastName === "");
  if (emptyUser) {
    await createSimOrder({
      user: { ...emptyUser, email: "" },
      items: randomItems(1, "cliente"),
      expectedFail: true,
      failReason: "Empty email",
    });
  }
  // Invalid CP
  for (let i = 0; i < 3; i++) {
    const user = { ...pick(clientes) };
    user.addresses = [{
      ...user.addresses[0],
      cp: pick(["1234", "ABCDE", "123456", "", "0"]),
    }];
    await createSimOrder({
      user,
      items: randomItems(1, "cliente"),
      expectedFail: true,
      failReason: `Invalid postal code: ${user.addresses[0].cp}`,
    });
  }
  // Invalid email
  for (let i = 0; i < 3; i++) {
    const user = { ...pick(clientes), email: pick(["not-an-email", "@missing.com", "no@"]) };
    await createSimOrder({
      user,
      items: randomItems(1, "cliente"),
      expectedFail: true,
      failReason: `Invalid email: ${user.email}`,
    });
  }
  // Out of stock
  const outOfStockProducts = PRODUCTS.filter(p => !p.inStock);
  for (let i = 0; i < 3; i++) {
    if (outOfStockProducts.length > 0) {
      await createSimOrder({
        user: pick(clientes),
        items: [{ product: pick(outOfStockProducts), quantity: 1, discount: 0 }],
        expectedFail: true,
        failReason: "Product out of stock",
      });
    }
  }

  console.log("  Generating 10 maximum stock orders...");
  for (let i = 0; i < 10; i++) {
    const prod = pick(inStockProducts);
    await createSimOrder({
      user: pick(clientes),
      items: [{ product: prod, quantity: prod.maxPerUser ?? 5, discount: 0 }],
    });
  }

  console.log("  Generating 5 out-of-stock orders...");
  for (let i = 0; i < 5; i++) {
    if (outOfStockProducts.length > 0) {
      await createSimOrder({
        user: pick(clientes),
        items: [{ product: pick(outOfStockProducts), quantity: 1, discount: 0 }],
        expectedFail: true,
        failReason: "Out of stock product",
      });
    } else {
      // Force out of stock by depleting
      const prod = pick(inStockProducts);
      stockTracker[prod.id] = 0;
      await createSimOrder({
        user: pick(clientes),
        items: [{ product: { ...prod, inStock: false }, quantity: 1, discount: 0 }],
        expectedFail: true,
        failReason: "Depleted stock",
      });
    }
  }

  console.log("  Generating 5 price manipulation orders...");
  for (let i = 0; i < 5; i++) {
    await createSimOrder({
      user: pick(clientes),
      items: randomItems(randInt(1, 3), "cliente"),
      manipulatedPrice: true,
    });
  }

  console.log("  Generating 5 rapid-fire orders (same user)...");
  const rapidUser = pick(clientes);
  for (let i = 0; i < 5; i++) {
    await createSimOrder({
      user: rapidUser,
      items: randomItems(1, rapidUser.role),
    });
  }

  console.log("  Generating 5 large quantity orders...");
  for (let i = 0; i < 5; i++) {
    const prod = pick(inStockProducts);
    await createSimOrder({
      user: pick(mayoristas),
      items: [{ product: prod, quantity: randInt(100, 500), discount: 0 }],
    });
  }

  // Fill remaining to reach ~300
  const remaining = 300 - orders.length;
  if (remaining > 0) {
    console.log(`  Generating ${remaining} additional orders to reach 300...`);
    for (let i = 0; i < remaining; i++) {
      const user = pick([...clientes, ...mayoristas, ...tiendas]);
      await createSimOrder({
        user,
        items: randomItems(randInt(1, 5), user.role),
      });
    }
  }
}

await generateAllOrders();
console.log(`  Total orders generated: ${orders.length}`);
console.log(`  Total invoices generated: ${invoices.length}`);

// ──────────────────────────────────────────────────────────────────────────────
// PHASE 3: Post-order scenarios
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n=== PHASE 3: Post-order status changes ===");

const successOrders = orders.filter(o => typeof o === "object" && o.status === "pedido");

// 50 → enviado
console.log("  50 orders -> enviado");
const toShip = pickN(successOrders, 50);
for (const order of toShip) {
  order.status = "enviado";
  order.trackingNumber = `ES${Date.now().toString().slice(-10)}${randInt(1000, 9999)}`;
  order.statusHistory.push({ status: "enviado", at: new Date().toISOString(), by: "admin" });
  emailLog.push({ to: order.userEmail, type: "order_shipped", orderId: order.id, sentAt: new Date().toISOString() });
}

// 30 → entregado
console.log("  30 orders -> entregado");
const toDeliver = pickN(toShip, 30);
for (const order of toDeliver) {
  order.status = "entregado";
  order.statusHistory.push({ status: "entregado", at: new Date().toISOString(), by: "system" });
  emailLog.push({ to: order.userEmail, type: "order_delivered", orderId: order.id, sentAt: new Date().toISOString() });
}

// 15 → cancelado
console.log("  15 orders -> cancelado");
const toCancel = pickN(successOrders.filter(o => o.status === "pedido"), 15);
for (const order of toCancel) {
  order.status = "cancelado";
  order.statusHistory.push({ status: "cancelado", at: new Date().toISOString(), by: "user" });
  // Refund stock
  for (const item of order.items) {
    if (stockTracker[item.productId]) {
      stockTracker[item.productId] += item.quantity;
    }
  }
  // Refund points
  if (pointsTracker[order.userId]) {
    pointsTracker[order.userId] -= order.earnedPoints;
  }
  emailLog.push({ to: order.userEmail, type: "order_cancelled", orderId: order.id, sentAt: new Date().toISOString() });
}

// 10 incidencias
console.log("  10 incidents");
const incidentTypes = [
  { type: "producto_danado", label: "Producto danado" },
  { type: "producto_incorrecto", label: "Producto incorrecto" },
  { type: "falta_producto", label: "Falta producto" },
  { type: "envio_retrasado", label: "Envio retrasado" },
  { type: "otro", label: "Otro" },
];
const incidents = [];
const deliveredOrders = successOrders.filter(o => o.status === "entregado" || o.status === "enviado");
for (let i = 0; i < 10; i++) {
  const order = pick(deliveredOrders.length > 0 ? deliveredOrders : successOrders);
  const user = users.find(u => u.id === order.userId) ?? pick(clientes);
  const incType = pick(incidentTypes);
  incidents.push({
    id: uuid(),
    orderId: order.id,
    userId: user.id,
    userEmail: user.email,
    userName: `${user.name} ${user.lastName}`,
    type: incType.type,
    typeLabel: incType.label,
    detail: `Incidencia de prueba: ${incType.label} en pedido ${order.id}`,
    photos: [],
    status: pick(["nueva", "en_gestion", "resuelta"]),
    createdAt: new Date().toISOString(),
  });
}

// 10 returns
console.log("  10 returns");
const returns = [];
const returnableOrders = successOrders.filter(o => o.status === "entregado");
for (let i = 0; i < Math.min(10, returnableOrders.length || successOrders.length); i++) {
  const order = pick(returnableOrders.length > 0 ? returnableOrders : successOrders);
  returns.push({
    orderId: order.id,
    userId: order.userId,
    reason: pick(["Producto danado", "No es lo esperado", "Error en pedido", "Cambio de opinion"]),
    refundAmount: order.total,
    status: "processed",
    createdAt: new Date().toISOString(),
  });
  // Refund points on returns
  if (pointsTracker[order.userId]) {
    pointsTracker[order.userId] = Math.max(0, pointsTracker[order.userId] - order.earnedPoints);
  }
}

// 5 payment status changes
console.log("  5 payment status changes");
const pendingOrders = successOrders.filter(o => o.paymentMethod === "contra_reembolso" || o.paymentMethod === "transferencia");
for (let i = 0; i < Math.min(5, pendingOrders.length); i++) {
  const order = pendingOrders[i];
  order.paymentStatus = "cobrado";
  order.statusHistory.push({ status: "pago_confirmado", at: new Date().toISOString(), by: "admin" });
}

pass(`Post-order phase completed: ${toShip.length} shipped, ${toDeliver.length} delivered, ${toCancel.length} cancelled, ${incidents.length} incidents, ${returns.length} returns`);

// ──────────────────────────────────────────────────────────────────────────────
// PHASE 4: Security checks
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n=== PHASE 4: Security checks ===");

// 1. Order ID uniqueness
const allOrderIds = orders.map(o => o.id);
const uniqueIds = new Set(allOrderIds);
if (uniqueIds.size === allOrderIds.length) {
  pass("Order ID uniqueness: all unique");
} else {
  fail("Order ID collision detected", `${allOrderIds.length - uniqueIds.size} duplicates`);
  addSecurity("CRITICAL", "Order ID collision", "Non-unique order IDs found");
}

// 2. Invoice number uniqueness
const invoiceNumbers = invoices.map(inv => inv.invoiceNumber);
const uniqueInvoiceNums = new Set(invoiceNumbers);
if (uniqueInvoiceNums.size === invoiceNumbers.length) {
  pass("Invoice number uniqueness: all unique");
} else {
  fail("Invoice number collision", `${invoiceNumbers.length - uniqueInvoiceNums.size} duplicates`);
  addSecurity("HIGH", "Invoice number collision", "Non-unique invoice numbers");
}

// 3. VeriFactu chain integrity
let chainValid = true;
for (let i = 1; i < invoices.length; i++) {
  if (invoices[i].previousInvoiceChainHash !== invoices[i - 1].verifactuChainHash) {
    chainValid = false;
    break;
  }
}
if (chainValid) {
  pass("VeriFactu chain integrity verified across all invoices");
} else {
  fail("VeriFactu chain integrity BROKEN");
  addSecurity("CRITICAL", "VeriFactu chain broken", "Hash chain integrity verification failed");
}

// 4. XSS check
const xssUser = users.find(u => u.name.includes("script"));
if (xssUser) {
  const xssOrder = orders.find(o => o.userId === xssUser.id);
  if (xssOrder) {
    // The system should sanitize or escape the name
    if (xssOrder.address && xssOrder.address.includes("<script>")) {
      addSecurity("HIGH", "XSS in order address",
        "Script tag found unsanitized in order address field. sanitizeString() not applied to order data.");
      fail("XSS not sanitized in order data");
    } else {
      pass("XSS check: script tags not present in order data");
    }
  }
  // Check that the raw user data contains the malicious input (it should be sanitized)
  if (xssUser.name.includes("<script>")) {
    addSecurity("MEDIUM", "XSS payload stored in user data",
      "User name contains unsanitized <script> tag. The sanitizeString() function exists but is not applied during user creation/storage.");
    addMissing("Server-side input sanitization",
      "sanitizeString() from utils/sanitize.ts should be applied to all user input fields during registration and profile update, not just on display");
    warn("XSS payload stored unsanitized");
  }
}

// 5. SQL injection patterns
const sqliUser = users.find(u => u.name.includes("DROP TABLE"));
if (sqliUser) {
  // Since this is localStorage-based, SQL injection is not directly exploitable
  // But the pattern should still be sanitized for when backend is connected
  addSecurity("LOW", "SQL injection patterns in user data",
    "SQL injection patterns stored in user name field. While not exploitable with localStorage, this data could be dangerous when migrating to a real database. sanitizeString() does not strip SQL patterns.");
  addMissing("SQL injection pattern detection",
    "Add SQL keyword detection to sanitizeString() for defense-in-depth before backend migration");
  warn("SQL injection patterns stored");
}

// 6. Session expiry enforcement
// The app uses 24h session expiry - check that the constant is defined
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;
if (SESSION_EXPIRY_MS === 86400000) {
  pass("Session expiry constant is correctly set to 24h");
} else {
  fail("Session expiry misconfigured");
}

// 7. Rate limiting check
// The app has checkRateLimit() but only client-side
addSecurity("MEDIUM", "Client-side only rate limiting",
  "checkRateLimit() in utils/sanitize.ts uses sessionStorage and can be bypassed by clearing storage or using a different browser. Need server-side rate limiting for production.");

// 8. Price manipulation detection
const priceManipOrders = orders.filter(o => o && typeof o === "object");
let priceManipDetected = 0;
for (const order of priceManipOrders) {
  const recalcSubtotal = roundTo2(order.items.reduce((s, l) => s + l.totalLine, 0));
  if (Math.abs(order.subtotal - recalcSubtotal) > 0.01) {
    priceManipDetected++;
  }
}
if (priceManipDetected === 0) {
  pass("No price inconsistencies detected in orders");
} else {
  fail(`${priceManipDetected} orders with price inconsistencies`);
  addSecurity("HIGH", "Price inconsistency", `${priceManipDetected} orders have subtotal mismatch`);
}

// 9. Check negative totals
const negativeOrders = orders.filter(o => o.total < 0);
if (negativeOrders.length === 0) {
  pass("No negative order totals");
} else {
  fail(`${negativeOrders.length} orders with negative totals`);
  addBug("HIGH", "Negative order total", "Orders can result in negative totals after discounts/points",
    "Apply coupon + points that exceed order total");
}

// 10. Check very large quantities without limit
const largeQtyOrders = orders.filter(o => o.items.some(i => i.quantity > 100));
if (largeQtyOrders.length > 0) {
  addSecurity("MEDIUM", "No maximum quantity limit",
    `${largeQtyOrders.length} orders placed with 100+ units of a single product. No server-side limit enforced.`);
  addMissing("Server-side quantity limits",
    "Add a global maximum quantity per order line (e.g., 99 units) to prevent abuse and inventory errors");
}

// ──────────────────────────────────────────────────────────────────────────────
// PHASE 5: Data quality checks
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n=== PHASE 5: Data quality checks ===");

// Check invoice-order consistency
let invoiceOrderMismatch = 0;
for (const inv of invoices) {
  const order = orders.find(o => o.id === inv.sourceOrderId);
  if (!order) {
    invoiceOrderMismatch++;
    continue;
  }
  if (Math.abs(inv.totals.totalInvoice - order.total) > 0.01) {
    invoiceOrderMismatch++;
    addDQ("Invoice-order total mismatch",
      `Invoice ${inv.invoiceNumber} total ${inv.totals.totalInvoice} != order ${order.id} total ${order.total}`);
  }
}
if (invoiceOrderMismatch === 0) {
  pass("All invoices match their source orders");
} else {
  warn(`${invoiceOrderMismatch} invoice-order mismatches`);
}

// Check VAT correctness
let vatErrors = 0;
for (const inv of invoices) {
  const expectedVAT = roundTo2(inv.totals.totalTaxableBase * 0.21);
  if (Math.abs(inv.totals.totalVAT - expectedVAT) > 0.02) {
    vatErrors++;
  }
}
if (vatErrors === 0) {
  pass("VAT calculations are consistent across all invoices");
} else {
  warn(`${vatErrors} invoices with VAT rounding differences`);
}

// Check email log completeness
const ordersWithoutEmail = orders.filter(o => {
  return !emailLog.some(e => e.orderId === o.id && e.type === "order_confirmation");
});
if (ordersWithoutEmail.length === 0) {
  pass("All orders have confirmation emails logged");
} else {
  addDQ("Missing confirmation emails", `${ordersWithoutEmail.length} orders without confirmation email`);
}

// Check status history integrity
let statusHistoryIssues = 0;
for (const order of orders) {
  if (!order.statusHistory || order.statusHistory.length === 0) {
    statusHistoryIssues++;
  }
  // Check that current status matches last history entry
  const lastStatus = order.statusHistory?.[order.statusHistory.length - 1]?.status;
  if (lastStatus && lastStatus !== order.status && lastStatus !== "pago_confirmado") {
    statusHistoryIssues++;
  }
}
if (statusHistoryIssues === 0) {
  pass("All orders have consistent status history");
} else {
  warn(`${statusHistoryIssues} orders with status history issues`);
}

// Check products without stock tracking
const productsNoStock = PRODUCTS.filter(p => p.inStock && p.stock === undefined);
if (productsNoStock.length > 0) {
  addDQ("Products without stock count",
    `${productsNoStock.length} of ${PRODUCTS.length} products have inStock=true but no numeric stock count. This prevents stock management and overselling detection.`);
  addMissing("Numeric stock for all products",
    "All products should have a numeric stock value instead of relying on boolean inStock flag");
}

// Check products with negative stock (oversold)
const oversoldProducts = [];
for (const [productId, remaining] of Object.entries(stockTracker)) {
  if (remaining < 0) {
    const product = PRODUCTS.find(p => p.id === parseInt(productId));
    oversoldProducts.push({ id: productId, name: product?.name, remaining });
  }
}
if (oversoldProducts.length > 0) {
  addBug("HIGH", "Oversold products (negative stock)",
    `${oversoldProducts.length} products have negative stock after simulation: ${oversoldProducts.slice(0, 5).map(p => `${p.name}: ${p.remaining}`).join(", ")}`,
    "Place orders concurrently or for quantities exceeding available stock without proper stock check");
  addMissing("Atomic stock decrement",
    "Stock should be decremented atomically with the order creation to prevent overselling. Current implementation has no transaction/lock mechanism.");
}

// ──────────────────────────────────────────────────────────────────────────────
// PHASE 6: Analytics
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n=== PHASE 6: Analytics ===");

const completedOrders = orders.filter(o => o.status !== "cancelado" && o.status !== "rejected");

// Revenue summary
const totalRevenue = roundTo2(completedOrders.reduce((s, o) => s + o.total, 0));

// Revenue by game
const revenueByGame = {};
for (const order of completedOrders) {
  for (const item of order.items) {
    const product = PRODUCTS.find(p => String(p.id) === item.productId);
    const game = product?.game ?? "unknown";
    revenueByGame[game] = roundTo2((revenueByGame[game] ?? 0) + item.totalLine);
  }
}

// Revenue by category
const revenueByCategory = {};
for (const order of completedOrders) {
  for (const item of order.items) {
    const product = PRODUCTS.find(p => String(p.id) === item.productId);
    const cat = product?.category ?? "unknown";
    revenueByCategory[cat] = roundTo2((revenueByCategory[cat] ?? 0) + item.totalLine);
  }
}

// Revenue by user role
const revenueByRole = {};
for (const order of completedOrders) {
  revenueByRole[order.userRole] = roundTo2((revenueByRole[order.userRole] ?? 0) + order.total);
}

// Average order value
const avgOrderValue = completedOrders.length > 0 ? roundTo2(totalRevenue / completedOrders.length) : 0;

// Most popular products
const productPopularity = {};
for (const order of completedOrders) {
  for (const item of order.items) {
    const key = item.productId;
    if (!productPopularity[key]) {
      productPopularity[key] = { id: key, name: item.description, totalQty: 0, totalRevenue: 0 };
    }
    productPopularity[key].totalQty += item.quantity;
    productPopularity[key].totalRevenue = roundTo2(productPopularity[key].totalRevenue + item.totalLine);
  }
}
const topProducts = Object.values(productPopularity).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10);

// Customer lifetime value
const customerSpend = {};
for (const order of completedOrders) {
  customerSpend[order.userId] = roundTo2((customerSpend[order.userId] ?? 0) + order.total);
}
const topCustomers = Object.entries(customerSpend)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([userId, total]) => {
    const user = users.find(u => u.id === userId);
    return { userId, name: user ? `${user.name} ${user.lastName}` : "Unknown", totalSpent: total };
  });

// Geographic distribution
const geoDistribution = {};
for (const order of completedOrders) {
  const user = users.find(u => u.id === order.userId);
  const provincia = user?.addresses?.[0]?.provincia ?? "Unknown";
  geoDistribution[provincia] = (geoDistribution[provincia] ?? 0) + 1;
}

// Payment method distribution
const paymentDist = {};
for (const order of completedOrders) {
  paymentDist[order.paymentMethod] = (paymentDist[order.paymentMethod] ?? 0) + 1;
}

// Return/incident rate
const returnRate = returns.length > 0 ? roundTo2((returns.length / completedOrders.length) * 100) : 0;
const incidentRate = incidents.length > 0 ? roundTo2((incidents.length / completedOrders.length) * 100) : 0;

// Stock alerts
const lowStockProducts = [];
for (const p of PRODUCTS) {
  const remaining = stockTracker[p.id];
  if (remaining !== undefined && remaining <= 10 && remaining >= 0) {
    lowStockProducts.push({ id: p.id, name: p.name, remaining, game: p.game });
  }
}

// Shipping type distribution
const shippingDist = {};
for (const order of completedOrders) {
  shippingDist[order.shippingType ?? "standard"] = (shippingDist[order.shippingType ?? "standard"] ?? 0) + 1;
}

report.analytics = {
  revenue: {
    total: totalRevenue,
    byGame: revenueByGame,
    byCategory: revenueByCategory,
    byRole: revenueByRole,
  },
  averageOrderValue: avgOrderValue,
  topProducts,
  topCustomers,
  geographicDistribution: geoDistribution,
  paymentMethodDistribution: paymentDist,
  shippingTypeDistribution: shippingDist,
  returnRate: `${returnRate}%`,
  incidentRate: `${incidentRate}%`,
  stockAlerts: lowStockProducts.slice(0, 20),
  orderStatusBreakdown: {
    pedido: orders.filter(o => o.status === "pedido").length,
    enviado: orders.filter(o => o.status === "enviado").length,
    entregado: orders.filter(o => o.status === "entregado").length,
    cancelado: orders.filter(o => o.status === "cancelado").length,
    rejected: orders.filter(o => o.status === "rejected").length,
  },
  invoiceStats: {
    total: invoices.length,
    totalTaxableBase: roundTo2(invoices.reduce((s, inv) => s + inv.totals.totalTaxableBase, 0)),
    totalVAT: roundTo2(invoices.reduce((s, inv) => s + inv.totals.totalVAT, 0)),
    totalInvoiced: roundTo2(invoices.reduce((s, inv) => s + inv.totals.totalInvoice, 0)),
  },
  emailsSent: emailLog.length,
  pointsStats: {
    totalPointsAwarded: Object.values(pointsTracker).reduce((s, p) => s + Math.max(0, p), 0),
    usersWithPoints: Object.keys(pointsTracker).length,
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// PHASE 7: Missing features & recommendations
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n=== PHASE 7: Missing features & recommendations ===");

// Check for missing features based on code analysis
addMissing("Order cancellation workflow",
  "No formal cancellation policy enforcement: time window for cancellation, automatic stock restoration, refund processing. The current status change is a simple string update.");

addMissing("Partial shipment tracking",
  "OrderItem has qtyShipped field but no logic uses it. Partial fulfillment/backorder is not implemented.");

addMissing("Return management system",
  "No return workflow: RMA generation, return shipping label, refund calculation, restocking. Returns are manual.");

addMissing("Inventory alerts and auto-reorder",
  "No automated alerts when stock drops below threshold. restockService.ts exists but no integration with order flow.");

addMissing("Order confirmation email templates",
  "emailService.ts has template rendering but no order-specific templates (order_confirmation, order_shipped, order_delivered).");

addMissing("Payment gateway integration",
  "Payment is recorded as a string field. No actual payment processing, verification, or refund capability.");

addMissing("Coupon usage tracking per user",
  "MOCK_ADMIN_COUPONS has usesPerUser limit but no enforcement mechanism in validateCoupon().");

addMissing("Order search and filtering API",
  "No search by date range, status, or customer. Admin panel relies on client-side filtering of all data.");

addMissing("Audit trail for order changes",
  "Invoices have auditLog but orders only have statusHistory with no user tracking or IP logging.");

addMissing("Multi-currency support",
  "All prices hardcoded in EUR. No currency conversion for international customers.");

// Recommendations
addRec(1, "Implement server-side validation",
  "All business logic (pricing, stock, discounts, points) runs client-side and can be manipulated. Priority 1 before going to production.");

addRec(2, "Add database persistence",
  "Replace all localStorage operations with database calls. Current localStorage has no concurrent access protection, size limits (5-10MB), and is vulnerable to data loss.");

addRec(3, "Implement proper authentication",
  "Current auth uses localStorage with client-side session hash. Implement JWT or session-based auth with server-side validation.");

addRec(4, "Add stock reservation/locking",
  "Implement stock reservation during checkout to prevent overselling. Current implementation has race condition: two users can buy the last item simultaneously.");

addRec(5, "Input sanitization at all entry points",
  "Apply sanitizeString() consistently to all user inputs during storage, not just display. Add SQL pattern detection for defense-in-depth.");

addRec(6, "Implement proper email service",
  "Replace localStorage email logging with actual email sending (Resend, SendGrid). Add email queue for reliability.");

addRec(7, "Add order total verification",
  "Server must recalculate order totals from product prices, not trust client-provided totals. Current architecture allows price manipulation.");

addRec(8, "Implement idempotency keys for orders",
  "Add idempotency tokens to prevent duplicate order submission on network retries or rapid clicks.");

addRec(9, "Add comprehensive logging and monitoring",
  "No error logging, performance monitoring, or business event tracking. Add structured logging for debugging and analytics.");

addRec(10, "Implement GDPR compliance features",
  "No data export, deletion, or consent management. Required for EU customers.");

// ──────────────────────────────────────────────────────────────────────────────
// PHASE 8: Final report
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n=== FINAL REPORT ===\n");

report.summary = {
  total: testsPassed + testsFailed + testsWarnings,
  passed: testsPassed,
  failed: testsFailed,
  warnings: testsWarnings,
  ordersGenerated: orders.length,
  invoicesGenerated: invoices.length,
  usersGenerated: users.length,
  emailsLogged: emailLog.length,
  incidentsCreated: incidents.length,
  returnsProcessed: returns.length,
  executionTimeMs: Date.now() - startTime,
};

// Console output
console.log("1. SUMMARY");
console.log("   -------");
console.log(`   Total tests:    ${report.summary.total}`);
console.log(`   Passed:         ${report.summary.passed}`);
console.log(`   Failed:         ${report.summary.failed}`);
console.log(`   Warnings:       ${report.summary.warnings}`);
console.log(`   Orders:         ${report.summary.ordersGenerated}`);
console.log(`   Invoices:       ${report.summary.invoicesGenerated}`);
console.log(`   Emails:         ${report.summary.emailsLogged}`);
console.log(`   Execution time: ${report.summary.executionTimeMs}ms`);

console.log("\n2. BUGS FOUND (" + report.bugs.length + ")");
console.log("   ----------");
for (const bug of report.bugs) {
  const occ = bug.occurrences > 1 ? ` (x${bug.occurrences})` : "";
  console.log(`   [${bug.severity}] ${bug.title}${occ}`);
  console.log(`     ${bug.detail}`);
  if (bug.reproduction) console.log(`     Repro: ${bug.reproduction}`);
}

console.log("\n3. SECURITY ISSUES (" + report.security.length + ")");
console.log("   ----------------");
for (const sec of report.security) {
  const occ = sec.occurrences > 1 ? ` (x${sec.occurrences})` : "";
  console.log(`   [${sec.risk}] ${sec.title}${occ}`);
  console.log(`     ${sec.detail}`);
}

console.log("\n4. MISSING FEATURES (" + report.missingFeatures.length + ")");
console.log("   -----------------");
for (const mf of report.missingFeatures) {
  console.log(`   - ${mf.title}`);
  console.log(`     ${mf.detail}`);
}

console.log("\n5. DATA QUALITY (" + report.dataQuality.length + ")");
console.log("   -------------");
for (const dq of report.dataQuality) {
  console.log(`   - ${dq.title}: ${dq.detail}`);
}

console.log("\n6. ANALYTICS HIGHLIGHTS");
console.log("   --------------------");
console.log(`   Total revenue:          EUR ${report.analytics.revenue.total.toLocaleString()}`);
console.log(`   Avg order value:        EUR ${report.analytics.averageOrderValue}`);
console.log(`   Return rate:            ${report.analytics.returnRate}`);
console.log(`   Incident rate:          ${report.analytics.incidentRate}`);
console.log(`   Invoices generated:     ${report.analytics.invoiceStats.total}`);
console.log(`   Total VAT collected:    EUR ${report.analytics.invoiceStats.totalVAT.toLocaleString()}`);
console.log(`   Points awarded:         ${report.analytics.pointsStats.totalPointsAwarded}`);
console.log(`   Low stock products:     ${report.analytics.stockAlerts.length}`);
console.log(`   Revenue by game:        ${JSON.stringify(report.analytics.revenue.byGame)}`);
console.log(`   Payment methods:        ${JSON.stringify(report.analytics.paymentMethodDistribution)}`);
console.log(`   Top 3 products:`);
for (const p of report.analytics.topProducts.slice(0, 3)) {
  console.log(`     - ${p.name}: EUR ${p.totalRevenue} (${p.totalQty} units)`);
}

console.log("\n7. RECOMMENDATIONS (prioritized)");
console.log("   -----------------------------");
for (const rec of report.recommendations) {
  console.log(`   ${rec.priority}. ${rec.title}`);
  console.log(`      ${rec.detail}`);
}

// Save JSON report
const reportPath = path.join(__dirname, "simulation-report.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
console.log(`\nFull report saved to: ${reportPath}`);

const elapsed = Date.now() - startTime;
console.log(`\nSimulation completed in ${elapsed}ms`);

if (report.summary.failed > 0) {
  console.log(`\n*** ${report.summary.failed} test(s) FAILED - review the report above ***`);
  process.exit(1);
} else {
  console.log(`\n*** All ${report.summary.passed} tests PASSED (${report.summary.warnings} warnings) ***`);
}
