/**
 * Regression test — Hold de 14 días sobre puntos del comprador
 * =============================================================
 * Cambio de negocio (admin 2026-04-26):
 *   Los puntos por compra del COMPRADOR no se acreditan al instante. Quedan
 *   pendientes durante 14 días para cubrir la ventana de devolución. Si
 *   durante ese plazo se devuelve el pedido → la entry pendiente se cancela
 *   sin tocar el balance. Si no hay devolución → maduran al saldo.
 *
 * Este test NO importa pointsService.ts (es TS + localStorage). Replica la
 * lógica del helper para verificar el invariante. Si pointsService diverge,
 * este test deja de proteger: mantenerlo SINCRONIZADO es obligatorio.
 *
 * Ejecuta: node tests/regression/points-hold-14d.mjs
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

const POINTS_PER_EURO = 100;
const POINTS_PENDING_DAYS = 14;
const POINTS_PENDING_MS = POINTS_PENDING_DAYS * 24 * 60 * 60 * 1000;

/**
 * Simulador minimalista del store de puntos (balance + history).
 * Réplica del flujo: awardPurchasePoints → releaseMaturedPoints → refundPurchasePoints.
 */
function makeStore() {
  const balance = new Map(); // userId -> number
  const history = new Map(); // userId -> HistoryEntry[]

  const get = (userId) => balance.get(userId) ?? 0;
  const setBal = (userId, n) => balance.set(userId, Math.max(0, Math.floor(n)));
  const hist = (userId) => history.get(userId) ?? [];
  const addHist = (userId, entry) => {
    const arr = hist(userId);
    arr.push({ id: `h${arr.length}`, ...entry });
    history.set(userId, arr);
  };

  function awardPurchasePoints(userId, euroAmount, orderId, now = Date.now()) {
    const euros = Math.floor(euroAmount);
    if (euros <= 0) return;
    const buyerPts = euros * POINTS_PER_EURO;
    addHist(userId, {
      ts: now,
      pts: buyerPts,
      type: "compra",
      desc: `Compra de €${euros}`,
      euroAmount: euros,
      availableAt: now + POINTS_PENDING_MS,
      released: false,
      orderId,
    });
    // NO toca balance del comprador.
  }

  function loadPendingPoints(userId, now = Date.now()) {
    return hist(userId)
      .filter(
        (h) =>
          h.type === "compra" &&
          !h.released &&
          !h.cancelled &&
          typeof h.availableAt === "number" &&
          h.availableAt > now,
      )
      .reduce((s, h) => s + Math.max(0, h.pts), 0);
  }

  function releaseMaturedPoints(userId, now = Date.now()) {
    const arr = hist(userId);
    let released = 0;
    let count = 0;
    for (const e of arr) {
      if (e.type !== "compra") continue;
      if (e.released || e.cancelled) continue;
      if (typeof e.availableAt !== "number") continue;
      if (e.availableAt > now) continue;
      const pts = Math.max(0, Math.floor(e.pts));
      setBal(userId, get(userId) + pts);
      e.released = true;
      released += pts;
      count++;
    }
    history.set(userId, arr);
    return { releasedPts: released, releasedCount: count };
  }

  function loadPoints(userId, now = Date.now()) {
    releaseMaturedPoints(userId, now);
    return get(userId);
  }

  function refundPurchasePoints(userId, euroAmount, orderId, now = Date.now()) {
    const euros = Math.floor(euroAmount);
    if (euros <= 0) return;
    const buyerPts = euros * POINTS_PER_EURO;
    let cancelledPreMature = false;
    if (orderId) {
      const arr = hist(userId);
      const e = arr.find(
        (h) =>
          h.type === "compra" &&
          h.orderId === orderId &&
          !h.released &&
          !h.cancelled,
      );
      if (e) {
        e.cancelled = true;
        addHist(userId, {
          ts: now,
          pts: 0,
          type: "devolucion",
          desc: `Devolución de €${euros} — puntos pendientes anulados`,
          euroAmount: euros,
          orderId,
        });
        cancelledPreMature = true;
      }
    }
    if (!cancelledPreMature) {
      setBal(userId, get(userId) - buyerPts);
      addHist(userId, {
        ts: now,
        pts: -buyerPts,
        type: "devolucion",
        desc: `Devolución de €${euros}`,
        euroAmount: euros,
        orderId,
      });
    }
  }

  return {
    awardPurchasePoints,
    loadPoints,
    loadPendingPoints,
    refundPurchasePoints,
    releaseMaturedPoints,
    _hist: hist,
  };
}

console.log("\n══════════════════════════════════════════");
console.log("  Regression — Hold 14 días puntos");
console.log("══════════════════════════════════════════\n");

// 1. Compra → balance NO sube, pending = buyerPts
check("Compra de €100 → balance disponible 0, pending 10000", () => {
  const s = makeStore();
  const t0 = 1_700_000_000_000;
  s.awardPurchasePoints("u1", 100, "TCG-1", t0);
  if (s.loadPoints("u1", t0) !== 0) throw new Error("balance subió antes de madurar");
  if (s.loadPendingPoints("u1", t0) !== 10000)
    throw new Error(`pending=${s.loadPendingPoints("u1", t0)}, esperado 10000`);
});

// 2. Avanzar 13 días → sigue pending, no maduró
check("13 días después → balance 0, pending sigue 10000", () => {
  const s = makeStore();
  const t0 = 1_700_000_000_000;
  s.awardPurchasePoints("u1", 100, "TCG-1", t0);
  const t13 = t0 + 13 * 24 * 60 * 60 * 1000;
  if (s.loadPoints("u1", t13) !== 0) throw new Error("maduró antes de tiempo");
  if (s.loadPendingPoints("u1", t13) !== 10000) throw new Error("pending cambió");
});

// 3. Día 14 exacto → madura, balance pasa a 10000, pending 0
check("Día 14 → maduran al saldo, pending=0", () => {
  const s = makeStore();
  const t0 = 1_700_000_000_000;
  s.awardPurchasePoints("u1", 100, "TCG-1", t0);
  const t14 = t0 + POINTS_PENDING_MS;
  if (s.loadPoints("u1", t14) !== 10000)
    throw new Error(`balance=${s.loadPoints("u1", t14)}, esperado 10000`);
  if (s.loadPendingPoints("u1", t14) !== 0)
    throw new Error("pending no se vació tras maduración");
});

// 4. Devolución pre-mature → cancela, balance sigue 0
check("Devolución pre-mature → entry cancelled, balance sigue 0", () => {
  const s = makeStore();
  const t0 = 1_700_000_000_000;
  s.awardPurchasePoints("u1", 100, "TCG-1", t0);
  const t5 = t0 + 5 * 24 * 60 * 60 * 1000;
  s.refundPurchasePoints("u1", 100, "TCG-1", t5);
  if (s.loadPoints("u1", t5) !== 0)
    throw new Error("balance se descontó cuando debió cancelarse pre-mature");
  if (s.loadPendingPoints("u1", t5) !== 0)
    throw new Error("pending no se vació tras cancelación");
  // Aunque pase el tiempo, NO debe madurar ya que está cancelled
  const t30 = t0 + 30 * 24 * 60 * 60 * 1000;
  if (s.loadPoints("u1", t30) !== 0)
    throw new Error("entry cancelled no debió madurar");
});

// 5. Devolución post-mature → deduct del balance
check("Devolución post-mature → balance descontado", () => {
  const s = makeStore();
  const t0 = 1_700_000_000_000;
  s.awardPurchasePoints("u1", 100, "TCG-1", t0);
  const t14 = t0 + POINTS_PENDING_MS;
  if (s.loadPoints("u1", t14) !== 10000) throw new Error("no maduró");
  // Usuario gasta nada, devuelve después
  const t20 = t0 + 20 * 24 * 60 * 60 * 1000;
  s.refundPurchasePoints("u1", 100, "TCG-1", t20);
  if (s.loadPoints("u1", t20) !== 0)
    throw new Error(`balance=${s.loadPoints("u1", t20)}, esperado 0`);
});

// 6. Devolución sin orderId (legacy) → fallback deduct
check("Refund legacy sin orderId → fallback deduct (balance puede ir a 0)", () => {
  const s = makeStore();
  const t0 = 1_700_000_000_000;
  s.awardPurchasePoints("u1", 100, "TCG-1", t0);
  const t14 = t0 + POINTS_PENDING_MS;
  s.loadPoints("u1", t14); // fuerza maduración
  s.refundPurchasePoints("u1", 100, undefined, t14);
  if (s.loadPoints("u1", t14) !== 0)
    throw new Error(`balance=${s.loadPoints("u1", t14)}, esperado 0`);
});

// 7. Idempotencia: llamar releaseMaturedPoints 2 veces no doble-cuenta
check("releaseMaturedPoints es idempotente (no doble-cuenta)", () => {
  const s = makeStore();
  const t0 = 1_700_000_000_000;
  s.awardPurchasePoints("u1", 100, "TCG-1", t0);
  const t14 = t0 + POINTS_PENDING_MS;
  s.releaseMaturedPoints("u1", t14);
  s.releaseMaturedPoints("u1", t14);
  s.releaseMaturedPoints("u1", t14);
  if (s.loadPoints("u1", t14) !== 10000)
    throw new Error(`balance=${s.loadPoints("u1", t14)}, esperado 10000 (no x3)`);
});

// 8. Múltiples compras: cada una madura independientemente
check("Compras escalonadas → cada una madura en su fecha", () => {
  const s = makeStore();
  const t0 = 1_700_000_000_000;
  s.awardPurchasePoints("u1", 50, "TCG-1", t0); // 5000 pts hold hasta t0+14d
  const t5 = t0 + 5 * 24 * 60 * 60 * 1000;
  s.awardPurchasePoints("u1", 30, "TCG-2", t5); // 3000 pts hold hasta t5+14d
  // En t14: solo la 1ª maduró
  const t14 = t0 + POINTS_PENDING_MS;
  if (s.loadPoints("u1", t14) !== 5000)
    throw new Error(`t14: balance=${s.loadPoints("u1", t14)}, esperado 5000`);
  if (s.loadPendingPoints("u1", t14) !== 3000)
    throw new Error(`t14: pending=${s.loadPendingPoints("u1", t14)}, esperado 3000`);
  // En t5+14d: la 2ª también madura
  const t19 = t5 + POINTS_PENDING_MS;
  if (s.loadPoints("u1", t19) !== 8000)
    throw new Error(`t19: balance=${s.loadPoints("u1", t19)}, esperado 8000`);
});

// 9. Devolver una de varias compras → solo cancela esa
check("Refund de TCG-2 con 2 compras → solo cancela la suya", () => {
  const s = makeStore();
  const t0 = 1_700_000_000_000;
  s.awardPurchasePoints("u1", 50, "TCG-1", t0);
  s.awardPurchasePoints("u1", 30, "TCG-2", t0);
  const t5 = t0 + 5 * 24 * 60 * 60 * 1000;
  s.refundPurchasePoints("u1", 30, "TCG-2", t5);
  // En t14, solo TCG-1 madura (TCG-2 está cancelled)
  const t14 = t0 + POINTS_PENDING_MS;
  if (s.loadPoints("u1", t14) !== 5000)
    throw new Error(`balance=${s.loadPoints("u1", t14)}, esperado 5000 (solo TCG-1)`);
});

// 10. Invariante: el balance jamás puede ser negativo
check("Invariante: balance siempre ≥ 0", () => {
  const s = makeStore();
  const t0 = 1_700_000_000_000;
  s.awardPurchasePoints("u1", 100, "TCG-1", t0);
  const t14 = t0 + POINTS_PENDING_MS;
  s.loadPoints("u1", t14);
  // Sobre-deducir
  s.refundPurchasePoints("u1", 200, undefined, t14);
  if (s.loadPoints("u1", t14) < 0) throw new Error("balance negativo");
});

console.log("\n══════════════════════════════════════════");
console.log(`  Resultado: ${passed}/${passed + failed} tests pasados`);
if (failed > 0) {
  console.log(`  FALLOS (${failed}):`);
  failures.forEach(({ name }) => console.log(`    - ${name}`));
}
console.log("══════════════════════════════════════════\n");

process.exit(failed > 0 ? 1 : 0);
