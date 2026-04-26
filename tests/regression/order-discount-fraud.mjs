/**
 * Regression test — Fraude de descuentos en /api/orders (P0)
 * ===========================================================
 * Bug reproducido (auditoría 2026-04-25):
 *   POST /api/orders aceptaba `body.coupon.discount` y `body.pointsDiscount`
 *   tal cual los enviaba el cliente, sin validarlos contra fuente canónica.
 *   Un atacante autenticado podía enviar:
 *     { coupon: { code:"X", discount: 99999 }, pointsDiscount: 99999 }
 *   y obtener pedido total ≈ 0 €.
 *
 * Fix: `validateAndComputeDiscounts()` recalcula desde:
 *   - server mode: DbAdapter.getCouponByCode + DbAdapter.getPoints (Supabase)
 *   - local mode:  clamps duros (≤ subtotal, ≥ 0, requiere userId para puntos)
 *
 * Este test NO arranca el server real — replica la lógica del helper para
 * verificar el invariante. Si el helper diverge, este test deja de proteger:
 * mantenerlo SINCRONIZADO con src/lib/priceVerification.ts es obligatorio.
 *
 * Ejecuta: node tests/regression/order-discount-fraud.mjs
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

const POINTS_PER_EURO_REDEMPTION = 10000;

/** Réplica del cálculo de cupón canónico — coincide con calcCanonicalCouponDiscount. */
function calcCanonical(coupon, subtotal) {
  if (!coupon || !coupon.isActive) return 0;
  if (coupon.minOrder && subtotal < coupon.minOrder) return 0;
  if (coupon.validUntil) {
    const t = new Date(coupon.validUntil).getTime();
    if (Number.isFinite(t) && Date.now() > t) return 0;
  }
  if (coupon.discountType === "percentage") {
    return Math.round(subtotal * (coupon.discountValue / 100) * 100) / 100;
  }
  if (coupon.discountType === "fixed") {
    return Math.min(
      Math.round(coupon.discountValue * 100) / 100,
      subtotal,
    );
  }
  return 0;
}

/**
 * Réplica del helper validateAndComputeDiscounts (server flujo). Si el
 * helper original cambia, ACTUALIZAR esta función o el test es decorativo.
 */
function validateDiscounts({
  subtotal,
  coupon,
  pointsDiscount,
  userId,
  serverMode,
  // mocks de BD
  resolveCoupon,
  resolveBalance,
}) {
  const errors = [];
  const warnings = [];
  let canonicalCoupon = 0;
  let resolved = null;

  if (coupon?.code) {
    if (serverMode) {
      resolved = resolveCoupon(coupon.code);
      if (!resolved) {
        errors.push(`Cupón "${coupon.code}" no existe o está inactivo`);
      } else {
        canonicalCoupon = calcCanonical(resolved, subtotal);
        if (canonicalCoupon === 0) {
          errors.push(`Cupón "${coupon.code}" no aplicable`);
        }
      }
    } else {
      const claimed = Number(coupon.discount ?? 0);
      if (Number.isFinite(claimed) && claimed > 0) {
        canonicalCoupon = Math.min(claimed, subtotal);
      }
    }
  }

  let canonicalPoints = 0;
  const claimedPoints = Number(pointsDiscount ?? 0);
  if (Number.isFinite(claimedPoints) && claimedPoints > 0) {
    if (!userId) {
      errors.push("Para canjear puntos hay que iniciar sesión");
    } else if (serverMode) {
      const balance = resolveBalance(userId) ?? 0;
      const maxFromBalance = Math.floor(balance) / POINTS_PER_EURO_REDEMPTION;
      const remainingAfterCoupon = Math.max(0, subtotal - canonicalCoupon);
      const cap = Math.min(maxFromBalance, remainingAfterCoupon);
      canonicalPoints = Math.round(Math.min(claimedPoints, cap) * 100) / 100;
      if (claimedPoints > cap + 0.01) {
        warnings.push(`Cliente intentó ${claimedPoints}, máximo ${cap}`);
      }
      if (cap === 0 && claimedPoints > 0) {
        errors.push(
          balance === 0
            ? "No tienes puntos disponibles para canjear"
            : "El subtotal restante no permite canjear puntos",
        );
      }
    } else {
      const remaining = Math.max(0, subtotal - canonicalCoupon);
      canonicalPoints = Math.round(Math.min(claimedPoints, remaining) * 100) / 100;
    }
  }

  return {
    couponDiscount: Math.max(0, canonicalCoupon),
    pointsDiscount: Math.max(0, canonicalPoints),
    errors,
    warnings,
    resolvedCoupon: resolved,
  };
}

console.log("\n══════════════════════════════════════════");
console.log("  Regression — Fraude descuentos /api/orders");
console.log("══════════════════════════════════════════\n");

// ── 1. ATAQUE: cupón inexistente con discount 99999 (server mode) ──────────
check("Server mode: cupón inexistente → error, descuento 0€", () => {
  const r = validateDiscounts({
    subtotal: 100,
    coupon: { code: "FAKEHACK", discount: 99999 },
    serverMode: true,
    resolveCoupon: () => null,
    resolveBalance: () => 0,
  });
  if (r.errors.length === 0) throw new Error("se aceptó cupón inexistente");
  if (r.couponDiscount !== 0) throw new Error("descuento no es 0");
});

// ── 2. ATAQUE: cupón real, pero cliente miente con discount inflado ────────
check("Server mode: cliente envía 9999€ pero cupón real 10% → 10€ canónico", () => {
  const realCoupon = {
    id: "u1",
    code: "X10",
    discountType: "percentage",
    discountValue: 10,
    minOrder: 0,
    maxPerUser: 1,
    usedCount: 0,
    validFrom: "2026-01-01",
    isActive: true,
  };
  const r = validateDiscounts({
    subtotal: 100,
    coupon: { code: "X10", discount: 9999 },
    serverMode: true,
    resolveCoupon: () => realCoupon,
    resolveBalance: () => 0,
  });
  if (r.errors.length !== 0) throw new Error("hubo error inesperado");
  if (r.couponDiscount !== 10) {
    throw new Error(`couponDiscount=${r.couponDiscount}, esperado 10`);
  }
});

// ── 3. ATAQUE: pointsDiscount 9999€ con saldo 0 (server mode) ──────────────
check("Server mode: cliente intenta 9999€ puntos sin saldo → error", () => {
  const r = validateDiscounts({
    subtotal: 100,
    pointsDiscount: 9999,
    userId: "user-attacker",
    serverMode: true,
    resolveCoupon: () => null,
    resolveBalance: () => 0,
  });
  if (r.errors.length === 0) throw new Error("se aceptó canje sin saldo");
  if (r.pointsDiscount !== 0) throw new Error("descuento puntos no es 0");
});

// ── 4. ATAQUE: pointsDiscount sin login → bloqueado ───────────────────────
check("Sin userId: pointsDiscount cualquier > 0 → error 'iniciar sesión'", () => {
  const r = validateDiscounts({
    subtotal: 100,
    pointsDiscount: 5,
    userId: undefined,
    serverMode: true,
    resolveCoupon: () => null,
    resolveBalance: () => 0,
  });
  if (!r.errors.some((e) => e.includes("iniciar sesión"))) {
    throw new Error("no rechazó puntos sin login");
  }
});

// ── 5. CASO LEGÍTIMO: usuario con 50.000 pts canjea 5€ ────────────────────
check("Server mode: usuario con 50000 pts canjea 5€ → 5€ aplicado", () => {
  const r = validateDiscounts({
    subtotal: 100,
    pointsDiscount: 5,
    userId: "u-legit",
    serverMode: true,
    resolveCoupon: () => null,
    resolveBalance: () => 50000,
  });
  if (r.errors.length !== 0) throw new Error("hubo error en caso legítimo");
  if (r.pointsDiscount !== 5) {
    throw new Error(`pointsDiscount=${r.pointsDiscount}, esperado 5`);
  }
});

// ── 6. EDGE: pointsDiscount > saldo → clampea al máximo del saldo ─────────
check("Server mode: usuario con 30000 pts pide 10€ → solo 3€ canónico", () => {
  const r = validateDiscounts({
    subtotal: 100,
    pointsDiscount: 10,
    userId: "u-low",
    serverMode: true,
    resolveCoupon: () => null,
    resolveBalance: () => 30000, // = 3€
  });
  if (r.pointsDiscount !== 3) {
    throw new Error(`pointsDiscount=${r.pointsDiscount}, esperado 3`);
  }
  if (r.warnings.length === 0) throw new Error("warning ausente sobre clamp");
});

// ── 7. EDGE: cupón + puntos no superan subtotal ────────────────────────────
check("Server: cupón 10€ + puntos 95€ sobre subtotal 100€ → puntos clamped a 90€", () => {
  const realCoupon = {
    id: "u2", code: "TEN", discountType: "fixed", discountValue: 10,
    minOrder: 0, maxPerUser: 1, usedCount: 0, validFrom: "", isActive: true,
  };
  const r = validateDiscounts({
    subtotal: 100,
    coupon: { code: "TEN", discount: 10 },
    pointsDiscount: 95,
    userId: "u",
    serverMode: true,
    resolveCoupon: () => realCoupon,
    resolveBalance: () => 1_000_000, // sobrado, 100€
  });
  if (r.couponDiscount !== 10) {
    throw new Error(`coupon=${r.couponDiscount}, esperado 10`);
  }
  if (r.pointsDiscount !== 90) {
    throw new Error(`points=${r.pointsDiscount}, esperado 90`);
  }
});

// ── 8. LOCAL MODE: cliente envía 9999€ → clamp a subtotal ─────────────────
check("Local mode: clamp duro descuento_cupón a subtotal", () => {
  const r = validateDiscounts({
    subtotal: 50,
    coupon: { code: "WHATEVER", discount: 9999 },
    serverMode: false,
    resolveCoupon: () => null,
    resolveBalance: () => 0,
  });
  if (r.couponDiscount !== 50) {
    throw new Error(`coupon=${r.couponDiscount}, esperado 50 (subtotal)`);
  }
});

// ── 9. LOCAL MODE: clamp puntos a subtotal restante ────────────────────────
check("Local mode: clamp duro pointsDiscount a subtotal", () => {
  const r = validateDiscounts({
    subtotal: 50,
    pointsDiscount: 9999,
    userId: "u",
    serverMode: false,
    resolveCoupon: () => null,
    resolveBalance: () => 0,
  });
  if (r.pointsDiscount !== 50) {
    throw new Error(`points=${r.pointsDiscount}, esperado 50 (subtotal)`);
  }
});

// ── 10. INVARIANTE: jamás devuelve negativo ────────────────────────────────
check("Invariante: descuentos siempre ≥ 0", () => {
  const r = validateDiscounts({
    subtotal: 100,
    coupon: { code: "X", discount: -5000 },
    pointsDiscount: -1000,
    userId: "u",
    serverMode: false,
    resolveCoupon: () => null,
    resolveBalance: () => 0,
  });
  if (r.couponDiscount < 0 || r.pointsDiscount < 0) {
    throw new Error("descuento negativo");
  }
});

console.log("\n══════════════════════════════════════════");
console.log(`  Resultado: ${passed}/${passed + failed} tests pasados`);
if (failed > 0) {
  console.log(`  FALLOS (${failed}):`);
  failures.forEach(({ name }) => console.log(`    - ${name}`));
}
console.log("══════════════════════════════════════════\n");

process.exit(failed > 0 ? 1 : 0);
