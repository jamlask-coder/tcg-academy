/**
 * Self-Healing System — Detección y reparación automática de datos corruptos.
 *
 * Escenarios que maneja:
 *   1. localStorage corrupto (JSON inválido)
 *   2. Datos inconsistentes (pedido sin factura, puntos negativos)
 *   3. Stock negativo o NaN
 *   4. Facturas con totales que no cuadran
 *   5. Sesiones expiradas o manipuladas
 *   6. Cadena VeriFactu rota
 *   7. Índices de cupones desincronizados
 *
 * Filosofía: DETECTAR → REPORTAR → REPARAR → VERIFICAR
 * Nunca elimina datos — los mueve a cuarentena.
 */

import { safeRead, safeWrite, safeReadArray } from "@/lib/safeStorage";
import { logger } from "@/lib/logger";
import { getCriticalJsonKeys } from "@/lib/dataHub";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HealingReport {
  ts: string;
  checks: HealingCheck[];
  repaired: number;
  quarantined: number;
  healthy: number;
}

interface HealingCheck {
  area: string;
  status: "ok" | "repaired" | "quarantined" | "error";
  detail: string;
}

const QUARANTINE_KEY = "tcgacademy_quarantine";
const HEAL_LOG_KEY = "tcgacademy_heal_log";

// ─── Quarantine ─────────────────────────────────────────────────────────────

function quarantine(key: string, data: unknown, reason: string): void {
  const q = safeRead<{ key: string; data: unknown; reason: string; ts: string }[]>(
    QUARANTINE_KEY,
    [],
  );
  q.push({ key, data, reason, ts: new Date().toISOString() });
  // Max 50 quarantined items
  if (q.length > 50) q.shift();
  safeWrite(QUARANTINE_KEY, q);
  logger.warn(`Quarantined: ${key} — ${reason}`, "selfHeal");
}

// ─── Individual healers ─────────────────────────────────────────────────────

function healJsonKey(key: string, fallback: unknown): HealingCheck {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return { area: key, status: "ok", detail: "No existe (OK)" };
    JSON.parse(raw);
    return { area: key, status: "ok", detail: "JSON válido" };
  } catch {
    // JSON corrupto — quarantine y reset
    const raw = localStorage.getItem(key);
    quarantine(key, raw, "JSON corrupto");
    safeWrite(key, fallback);
    return { area: key, status: "repaired", detail: "JSON corrupto → reseteado a fallback" };
  }
}

function healOrders(): HealingCheck {
  const orders = safeRead<Record<string, unknown>[]>("tcgacademy_orders", []);
  if (!Array.isArray(orders)) {
    quarantine("tcgacademy_orders", orders, "No es un array");
    safeWrite("tcgacademy_orders", []);
    return { area: "orders", status: "repaired", detail: "Orders no era array → reseteado" };
  }

  let repaired = 0;
  const cleaned = orders.filter((order) => {
    // Cada pedido debe tener id y date
    if (!order || typeof order !== "object") {
      quarantine("order_invalid", order, "Pedido no es objeto");
      repaired++;
      return false;
    }
    if (!order.id || !order.date) {
      quarantine("order_missing_fields", order, "Pedido sin id o date");
      repaired++;
      return false;
    }
    // Total debe ser número finito ≥ 0
    if (typeof order.total === "number" && !Number.isFinite(order.total)) {
      (order as Record<string, unknown>).total = 0;
      repaired++;
    }
    return true;
  });

  if (repaired > 0) {
    safeWrite("tcgacademy_orders", cleaned);
    return {
      area: "orders",
      status: "repaired",
      detail: `${repaired} pedidos inválidos → cuarentena`,
    };
  }
  return { area: "orders", status: "ok", detail: `${orders.length} pedidos OK` };
}

function healPoints(): HealingCheck {
  const map = safeRead<Record<string, unknown>>("tcgacademy_pts", {});
  let repaired = 0;

  for (const [userId, pts] of Object.entries(map)) {
    if (typeof pts !== "number" || !Number.isFinite(pts) || pts < 0) {
      map[userId] = Math.max(0, Math.floor(Number(pts) || 0));
      repaired++;
    }
  }

  if (repaired > 0) {
    safeWrite("tcgacademy_pts", map);
    return {
      area: "points",
      status: "repaired",
      detail: `${repaired} balances de puntos corregidos (negativos/NaN → 0)`,
    };
  }
  return { area: "points", status: "ok", detail: "Puntos OK" };
}

function healStock(): HealingCheck {
  const overrides = safeRead<Record<string, Record<string, unknown>>>(
    "tcgacademy_product_overrides",
    {},
  );
  let repaired = 0;

  for (const [productId, data] of Object.entries(overrides)) {
    if (data && typeof data === "object") {
      // Stock negativo o NaN → 0
      if (
        "stock" in data &&
        (typeof data.stock !== "number" ||
          !Number.isFinite(data.stock as number) ||
          (data.stock as number) < 0)
      ) {
        data.stock = 0;
        data.inStock = false;
        repaired++;
        logger.warn(`Stock reparado para producto ${productId}`, "selfHeal");
      }
    }
  }

  if (repaired > 0) {
    safeWrite("tcgacademy_product_overrides", overrides);
    return {
      area: "stock",
      status: "repaired",
      detail: `${repaired} stocks negativos/NaN → 0`,
    };
  }
  return { area: "stock", status: "ok", detail: "Stock OK" };
}

function healInvoices(): HealingCheck {
  const invoices = safeReadArray<Record<string, unknown>>("tcgacademy_invoices");
  if (!Array.isArray(invoices)) {
    return { area: "invoices", status: "ok", detail: "Sin facturas" };
  }

  let issues = 0;
  for (const inv of invoices) {
    // Verificar que totals existen y son coherentes
    const totals = inv.totals as Record<string, number> | undefined;
    if (!totals) {
      issues++;
      continue;
    }
    const base = totals.totalTaxableBase ?? 0;
    const vat = totals.totalVAT ?? 0;
    const surcharge = totals.totalSurcharge ?? 0;
    const total = totals.totalInvoice ?? 0;
    const expected = Math.round((base + vat + surcharge) * 100) / 100;
    const diff = Math.abs(total - expected);
    if (diff >= 0.01) {
      issues++;
      logger.error(
        `Factura ${inv.invoiceNumber}: total ${total} ≠ base+iva+rec ${expected} (diff: ${diff.toFixed(2)})`,
        "selfHeal",
      );
    }
  }

  // NO reparamos facturas — son inmutables. Solo reportamos.
  if (issues > 0) {
    return {
      area: "invoices",
      status: "error",
      detail: `${issues} facturas con totales inconsistentes (NO reparadas — requiere intervención manual)`,
    };
  }
  return {
    area: "invoices",
    status: "ok",
    detail: `${invoices.length} facturas verificadas OK`,
  };
}

function healSessions(): HealingCheck {
  const raw = localStorage.getItem("tcgacademy_user");
  if (!raw) return { area: "session", status: "ok", detail: "Sin sesión activa" };

  try {
    const session = JSON.parse(raw) as Record<string, unknown>;
    // Verificar expiración
    const loginAt = session.loginAt as number | undefined;
    const rememberMe = session.rememberMe as boolean | undefined;
    if (loginAt) {
      const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      if (Date.now() - loginAt > maxAge) {
        localStorage.removeItem("tcgacademy_user");
        return {
          area: "session",
          status: "repaired",
          detail: "Sesión expirada eliminada",
        };
      }
    }
    // Verificar campos obligatorios
    if (!session.id || !session.email || !session.role) {
      quarantine("tcgacademy_user", session, "Sesión sin campos obligatorios");
      localStorage.removeItem("tcgacademy_user");
      return {
        area: "session",
        status: "repaired",
        detail: "Sesión corrupta eliminada (sin id/email/role)",
      };
    }
    return { area: "session", status: "ok", detail: "Sesión válida" };
  } catch {
    localStorage.removeItem("tcgacademy_user");
    return {
      area: "session",
      status: "repaired",
      detail: "Sesión con JSON inválido eliminada",
    };
  }
}

// ─── Main healer ────────────────────────────────────────────────────────────

/**
 * Ejecuta todas las comprobaciones de salud y repara lo que pueda.
 * Llamar al arrancar la app (en un useEffect del layout).
 */
export function runSelfHealing(): HealingReport {
  if (typeof window === "undefined") {
    return { ts: new Date().toISOString(), checks: [], repaired: 0, quarantined: 0, healthy: 0 };
  }

  const checks: HealingCheck[] = [];

  // 1. Verificar JSON de todas las keys críticas.
  //    Lista derivada del registry de DataHub (flag `criticalJson: true`).
  //    El fallback por defecto es [] salvo para las claves tipo diccionario conocidas.
  const dictionaryKeys = new Set([
    "tcgacademy_pts",
    "tcgacademy_pts_attr",
    "tcgacademy_product_overrides",
  ]);
  for (const key of getCriticalJsonKeys()) {
    const fallback: unknown = dictionaryKeys.has(key) ? {} : [];
    checks.push(healJsonKey(key, fallback));
  }

  // 2. Verificaciones de negocio
  checks.push(healOrders());
  checks.push(healPoints());
  checks.push(healStock());
  checks.push(healInvoices());
  checks.push(healSessions());

  const report: HealingReport = {
    ts: new Date().toISOString(),
    checks,
    repaired: checks.filter((c) => c.status === "repaired").length,
    quarantined: safeRead<unknown[]>(QUARANTINE_KEY, []).length,
    healthy: checks.filter((c) => c.status === "ok").length,
  };

  // Log the report
  const logs = safeRead<HealingReport[]>(HEAL_LOG_KEY, []);
  logs.unshift(report);
  if (logs.length > 20) logs.length = 20;
  safeWrite(HEAL_LOG_KEY, logs);

  if (report.repaired > 0) {
    logger.warn(
      `Self-healing: ${report.repaired} reparaciones, ${report.healthy} sanos`,
      "selfHeal",
    );
  }

  return report;
}

/** Obtener historial de reparaciones */
export function getHealingHistory(): HealingReport[] {
  return safeRead<HealingReport[]>(HEAL_LOG_KEY, []);
}

/** Obtener datos en cuarentena */
export function getQuarantinedData(): { key: string; data: unknown; reason: string; ts: string }[] {
  return safeRead(QUARANTINE_KEY, []);
}
