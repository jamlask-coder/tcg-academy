/**
 * Regression test — Coherencia base + IVA = total en facturas
 * ============================================================
 * Bug reproducido (2026-04-25): al aplicar un cupón fijo en € (con IVA) sobre
 * la factura, la vista mostraba `Base + IVA != Total con IVA`. El cupón
 * restaba el `finalTotal` pero NO se prorrateaba sobre base/cuota.
 *
 * Fix: prorratear el cupón proporcionalmente entre base y IVA según el peso
 * de cada uno en el subtotal bruto (Art. 78.3.2º LIVA — los descuentos
 * reducen la base imponible).
 *
 * Run with: node tests/regression/invoice-base-vat-coherence.mjs
 */

let passed = 0;
let failed = 0;
const failures = [];

function check(name, fn) {
  try {
    const r = fn();
    if (r === false) throw new Error("returned false");
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗  ${name}: ${e.message}`);
    failures.push({ name, msg: e.message });
    failed++;
  }
}

function roundTo2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Réplica EXACTA de la lógica en FacturaAlbaranForm.tsx → useMemo `totals`.
 * Si esto se desincroniza, el test deja de proteger.
 */
function computeTotals({
  base,
  vat,
  total,
  shippingBase = 0,
  shippingVat = 0,
  shippingTotal = 0,
  couponAmount = 0,
}) {
  const coupon = Math.max(0, roundTo2(couponAmount));
  const subtotal = roundTo2(total + shippingTotal);
  const finalTotal = Math.max(0, roundTo2(subtotal - coupon));

  const baseWithShip = base + shippingBase;
  const vatWithShip = vat + shippingVat;
  const subtotalGross = roundTo2(baseWithShip + vatWithShip);
  const couponEffective = Math.min(coupon, subtotalGross);
  const couponBase =
    subtotalGross > 0
      ? roundTo2((baseWithShip / subtotalGross) * couponEffective)
      : 0;
  const couponVat = roundTo2(couponEffective - couponBase);

  return {
    base: roundTo2(baseWithShip - couponBase),
    vat: roundTo2(vatWithShip - couponVat),
    finalTotal,
  };
}

console.log("\n📊 Coherencia base + IVA = total en facturas\n");

// ── Caso simple — sin cupón ─────────────────────────────────────────
check("sin cupón: base + IVA = total", () => {
  // 100€ base + 21% IVA = 121€
  const t = computeTotals({ base: 100, vat: 21, total: 121, couponAmount: 0 });
  const sum = roundTo2(t.base + t.vat);
  if (sum !== t.finalTotal) {
    throw new Error(`base(${t.base}) + vat(${t.vat}) = ${sum}, total=${t.finalTotal}`);
  }
});

// ── Caso del bug — cupón fijo 10€ ───────────────────────────────────
check("cupón 10€: base + IVA = total (BUG REPRODUCIDO)", () => {
  // Carrito: 100€ base + 21€ IVA = 121€. Cupón -10€. Total final 111€.
  // ANTES del fix: base=100, vat=21, total=111 → 100+21=121 != 111 ❌
  // DESPUÉS del fix: base≈91.74, vat≈19.26, total=111 → 91.74+19.26=111 ✓
  const t = computeTotals({ base: 100, vat: 21, total: 121, couponAmount: 10 });
  const sum = roundTo2(t.base + t.vat);
  if (sum !== t.finalTotal) {
    throw new Error(`base(${t.base}) + vat(${t.vat}) = ${sum}, total=${t.finalTotal}`);
  }
});

// ── Cupón con envío ─────────────────────────────────────────────────
check("cupón 5€ con envío 4.95€: base + IVA = total", () => {
  const t = computeTotals({
    base: 50,
    vat: 10.5,
    total: 60.5,
    shippingBase: 4.09,
    shippingVat: 0.86,
    shippingTotal: 4.95,
    couponAmount: 5,
  });
  const sum = roundTo2(t.base + t.vat);
  if (sum !== t.finalTotal) {
    throw new Error(`base(${t.base}) + vat(${t.vat}) = ${sum}, total=${t.finalTotal}`);
  }
});

// ── Cupón mayor que el total — no puede dejar negativos ─────────────
check("cupón 200€ > total 121€: total final no negativo y coherente", () => {
  const t = computeTotals({ base: 100, vat: 21, total: 121, couponAmount: 200 });
  if (t.finalTotal !== 0) {
    throw new Error(`finalTotal debería ser 0, fue ${t.finalTotal}`);
  }
  const sum = roundTo2(t.base + t.vat);
  if (sum !== t.finalTotal) {
    throw new Error(`base(${t.base}) + vat(${t.vat}) = ${sum}, total=${t.finalTotal}`);
  }
});

// ── Sin líneas — todo a cero ────────────────────────────────────────
check("sin líneas: base=0, vat=0, total=0", () => {
  const t = computeTotals({ base: 0, vat: 0, total: 0, couponAmount: 0 });
  if (t.base !== 0 || t.vat !== 0 || t.finalTotal !== 0) {
    throw new Error(`esperado todo 0, fue ${JSON.stringify(t)}`);
  }
});

// ── Cupón céntimo (precisión) ───────────────────────────────────────
check("cupón 0.01€: redondeo no rompe coherencia", () => {
  const t = computeTotals({ base: 100, vat: 21, total: 121, couponAmount: 0.01 });
  const sum = roundTo2(t.base + t.vat);
  if (sum !== t.finalTotal) {
    throw new Error(`base(${t.base}) + vat(${t.vat}) = ${sum}, total=${t.finalTotal}`);
  }
});

// ── Resumen ─────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  failures.forEach((f) => console.error(`  ✗  ${f.name}: ${f.msg}`));
  process.exit(1);
}
process.exit(0);
