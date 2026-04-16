/**
 * Anomaly Detection — Detección de patrones sospechosos y ataques.
 *
 * Escenarios hipotéticos extremos que detecta:
 *
 *   1. MANIPULACIÓN DE PRECIOS: cliente modifica el DOM/localStorage para
 *      cambiar el precio de un producto antes de hacer checkout.
 *
 *   2. RACE CONDITION DE STOCK: dos usuarios compran el último item al
 *      mismo tiempo — uno recibe un pedido que no puede cumplirse.
 *
 *   3. PUNTO FARMING: bot que hace check-in diario + compras de 0€ con
 *      cupones para acumular puntos infinitos.
 *
 *   4. COUPON REPLAY: reutilización de un cupón ya usado copiando el
 *      localStorage de otra sesión.
 *
 *   5. CART TAMPERING: modificación directa de tcga_cart en localStorage
 *      para alterar precios o cantidades.
 *
 *   6. SESSION CLONING: copiar la sesión de otro usuario para acceder
 *      a su cuenta (XSS + localStorage theft).
 *
 *   7. INVOICE MANIPULATION: editar facturas en localStorage para alterar
 *      importes o eliminar registros fiscales.
 *
 *   8. REFUND ABUSE: solicitar devolución de un pedido que nunca existió
 *      o que ya fue devuelto.
 *
 *   9. TIME TRAVEL: cambiar el reloj del sistema para saltarse rate limits,
 *      check-ins, o expiración de cupones.
 *
 *  10. OVERFLOW/UNDERFLOW: enviar cantidades extremas (MAX_SAFE_INTEGER,
 *      -1, 0.0001) para explotar cálculos de precios.
 */

import { logger } from "@/lib/logger";
import { safeRead, safeWrite } from "@/lib/safeStorage";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AnomalyEvent {
  ts: string;
  type: AnomalyType;
  severity: "low" | "medium" | "high" | "critical";
  detail: string;
  data?: Record<string, unknown>;
  userId?: string;
}

type AnomalyType =
  | "price_manipulation"
  | "stock_oversell"
  | "point_farming"
  | "coupon_replay"
  | "cart_tampering"
  | "session_anomaly"
  | "invoice_tampering"
  | "refund_abuse"
  | "time_travel"
  | "numeric_overflow"
  | "rapid_fire"
  | "impossible_discount"
  | "phantom_order";

const ANOMALY_KEY = "tcgacademy_anomalies";
const MAX_ANOMALIES = 200;

// ─── Core ───────────────────────────────────────────────────────────────────

function recordAnomaly(event: AnomalyEvent): void {
  const anomalies = safeRead<AnomalyEvent[]>(ANOMALY_KEY, []);
  anomalies.unshift(event);
  if (anomalies.length > MAX_ANOMALIES) anomalies.length = MAX_ANOMALIES;
  safeWrite(ANOMALY_KEY, anomalies);
  logger.error(`ANOMALY [${event.severity}] ${event.type}: ${event.detail}`, "anomaly");

  // Dispatch event for UI notification
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("tcga:anomaly", { detail: event }),
    );
  }
}

export function getAnomalies(limit = 50): AnomalyEvent[] {
  return safeRead<AnomalyEvent[]>(ANOMALY_KEY, []).slice(0, limit);
}

// ─── Detection functions ────────────────────────────────────────────────────

/**
 * 1. PRICE MANIPULATION: Verifica que el precio del carrito coincide con el catálogo.
 */
export function detectPriceManipulation(
  cartItems: { key: string; price: number; name: string }[],
  catalogPrices: Map<string, number>,
): boolean {
  for (const item of cartItems) {
    const expected = catalogPrices.get(item.key);
    if (expected === undefined) continue;
    const diff = Math.abs(item.price - expected);
    if (diff > 0.02) {
      recordAnomaly({
        ts: new Date().toISOString(),
        type: "price_manipulation",
        severity: "critical",
        detail: `Precio manipulado en "${item.name}": carrito=${item.price}€, catálogo=${expected}€`,
        data: { productKey: item.key, cartPrice: item.price, catalogPrice: expected },
      });
      return true;
    }
  }
  return false;
}

/**
 * 2. STOCK OVERSELL: Detecta venta por encima del stock disponible.
 */
export function detectStockOversell(
  productId: number,
  requested: number,
  available: number,
): void {
  if (requested > available) {
    recordAnomaly({
      ts: new Date().toISOString(),
      type: "stock_oversell",
      severity: "high",
      detail: `Intento de comprar ${requested} uds del producto ${productId} (stock: ${available})`,
      data: { productId, requested, available },
    });
  }
}

/**
 * 3. POINT FARMING: Detecta acumulación sospechosa de puntos.
 *    Bandera: >500 puntos ganados en 1 hora sin compras significativas.
 */
export function detectPointFarming(
  userId: string,
  pointsHistory: { ts: number; pts: number; type: string }[],
): void {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recentGains = pointsHistory
    .filter((h) => h.ts > oneHourAgo && h.pts > 0)
    .reduce((sum, h) => sum + h.pts, 0);

  if (recentGains > 500) {
    recordAnomaly({
      ts: new Date().toISOString(),
      type: "point_farming",
      severity: "medium",
      detail: `Usuario ${userId}: ${recentGains} puntos ganados en la última hora`,
      userId,
      data: { recentGains },
    });
  }
}

/**
 * 4. COUPON REPLAY: Detecta intento de reutilizar un cupón ya usado.
 */
export function detectCouponReplay(
  code: string,
  userEmail: string,
  alreadyUsed: boolean,
): void {
  if (alreadyUsed) {
    recordAnomaly({
      ts: new Date().toISOString(),
      type: "coupon_replay",
      severity: "medium",
      detail: `Intento de reutilizar cupón "${code}" por ${userEmail}`,
      data: { code, userEmail },
    });
  }
}

/**
 * 5. CART TAMPERING: Verifica integridad del carrito con un hash.
 *    Genera un fingerprint del carrito y lo compara con el almacenado.
 */
export function generateCartFingerprint(
  items: { key: string; price: number; quantity: number }[],
): string {
  const content = items
    .map((i) => `${i.key}:${i.price}:${i.quantity}`)
    .sort()
    .join("|");
  // Simple hash for tamper detection (not cryptographic — just detection)
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

export function verifyCartIntegrity(
  items: { key: string; price: number; quantity: number }[],
  storedFingerprint: string | null,
): boolean {
  if (!storedFingerprint) return true; // First time, no fingerprint yet
  const current = generateCartFingerprint(items);
  if (current !== storedFingerprint) {
    recordAnomaly({
      ts: new Date().toISOString(),
      type: "cart_tampering",
      severity: "high",
      detail: `Carrito modificado fuera de la aplicación (fingerprint mismatch)`,
      data: { expected: storedFingerprint, actual: current },
    });
    return false;
  }
  return true;
}

/**
 * 7. INVOICE TAMPERING: Verifica que el número de facturas no ha disminuido.
 *    (Alguien eliminando facturas del localStorage)
 */
export function detectInvoiceTampering(currentCount: number): void {
  const KEY = "tcgacademy_invoice_count_watermark";
  const watermark = safeRead<number>(KEY, 0);

  if (currentCount < watermark) {
    recordAnomaly({
      ts: new Date().toISOString(),
      type: "invoice_tampering",
      severity: "critical",
      detail: `Facturas reducidas de ${watermark} a ${currentCount}. Posible eliminación manual.`,
      data: { watermark, currentCount },
    });
  }

  // Always update watermark to max
  if (currentCount > watermark) {
    safeWrite(KEY, currentCount);
  }
}

/**
 * 9. TIME TRAVEL: Detecta si el reloj del sistema ha retrocedido.
 */
export function detectTimeTravel(): void {
  const KEY = "tcgacademy_last_known_time";
  const lastKnown = safeRead<number>(KEY, 0);
  const now = Date.now();

  if (lastKnown > 0 && now < lastKnown - 60000) {
    // El reloj retrocedió más de 1 minuto
    recordAnomaly({
      ts: new Date().toISOString(),
      type: "time_travel",
      severity: "medium",
      detail: `Reloj del sistema retrocedió: último=${new Date(lastKnown).toISOString()}, ahora=${new Date(now).toISOString()}`,
      data: { lastKnown, now, drift: lastKnown - now },
    });
  }

  safeWrite(KEY, now);
}

/**
 * 10. NUMERIC OVERFLOW: Verifica que un valor numérico es seguro.
 */
export function isSafeNumber(value: unknown): boolean {
  if (typeof value !== "number") return false;
  if (!Number.isFinite(value)) return false;
  if (Math.abs(value) > 999999) return false; // No order should exceed €999,999
  return true;
}

export function detectNumericOverflow(
  context: string,
  value: unknown,
): void {
  if (!isSafeNumber(value)) {
    recordAnomaly({
      ts: new Date().toISOString(),
      type: "numeric_overflow",
      severity: "high",
      detail: `Valor numérico peligroso en ${context}: ${String(value)}`,
      data: { context, value: String(value), type: typeof value },
    });
  }
}

/**
 * 11. RAPID FIRE: Detecta ráfagas de acciones sospechosamente rápidas.
 */
const actionTimestamps = new Map<string, number[]>();

export function detectRapidFire(
  action: string,
  maxPerMinute: number,
): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  const timestamps = actionTimestamps.get(action) ?? [];
  const recent = timestamps.filter((t) => t > oneMinuteAgo);
  recent.push(now);
  actionTimestamps.set(action, recent);

  if (recent.length > maxPerMinute) {
    recordAnomaly({
      ts: new Date().toISOString(),
      type: "rapid_fire",
      severity: "medium",
      detail: `Acción "${action}": ${recent.length} veces en 1 minuto (límite: ${maxPerMinute})`,
      data: { action, count: recent.length, limit: maxPerMinute },
    });
    return true;
  }
  return false;
}

/**
 * 12. IMPOSSIBLE DISCOUNT: Descuento mayor que el subtotal.
 */
export function detectImpossibleDiscount(
  subtotal: number,
  totalDiscount: number,
  orderId?: string,
): void {
  if (totalDiscount > subtotal && subtotal > 0) {
    recordAnomaly({
      ts: new Date().toISOString(),
      type: "impossible_discount",
      severity: "critical",
      detail: `Descuento (${totalDiscount.toFixed(2)}€) > subtotal (${subtotal.toFixed(2)}€)`,
      data: { subtotal, totalDiscount, orderId },
    });
  }
}

/**
 * Export anomalies as CSV for admin review.
 */
export function exportAnomaliesCSV(): string {
  const anomalies = getAnomalies(MAX_ANOMALIES);
  const headers = ["Fecha", "Tipo", "Severidad", "Detalle", "Usuario", "Datos"];
  const rows = anomalies.map((a) =>
    [
      a.ts,
      a.type,
      a.severity,
      `"${a.detail.replace(/"/g, '""')}"`,
      a.userId ?? "",
      a.data ? `"${JSON.stringify(a.data).replace(/"/g, '""')}"` : "",
    ].join(";"),
  );
  return "\uFEFF" + [headers.join(";"), ...rows].join("\n");
}
