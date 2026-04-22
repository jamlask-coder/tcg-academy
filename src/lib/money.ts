/**
 * Aritmética monetaria exacta — helpers para cálculos fiscales.
 *
 * Basado en `big.js` para evitar errores de coma flotante en cadenas de
 * operaciones (división base / (1+IVA), sumas de líneas, recargos, etc.).
 *
 * ─── CUÁNDO USAR ESTOS HELPERS ─────────────────────────────────────────────
 *
 * SOLO en el módulo fiscal (invoiceService, taxService, accounting/*).
 * El resto del sitio trabaja con precios CON IVA en `number` — no necesita
 * esta precisión y cambiar ahí añadiría complejidad sin beneficio real.
 *
 * Reglas fiscales (Ley 37/1992 + RD 1619/2012):
 * - Las bases imponibles y cuotas se redondean a 2 decimales.
 * - El redondeo es "half-up" (0.5 → 1), equivalente a Math.round para importes
 *   positivos. No usamos banker's rounding para preservar compatibilidad con
 *   facturas ya emitidas y su hash VeriFactu.
 *
 * Todos estos helpers devuelven `number` para mantener compatibilidad con los
 * tipos existentes (`InvoiceLineItem`, `InvoiceTotals`, etc.) y con el hash
 * de la cadena VeriFactu que serializa con `.toFixed(2)`.
 */

import Big from "big.js";

// Redondeo "half-away-from-zero" (en Big.js: ROUND_HALF_UP = 3 redondea away
// from zero cuando el dígito es 5). Para importes positivos — que es el 100%
// de casos en facturación — coincide con Math.round.
Big.RM = Big.roundHalfUp;

/**
 * Redondea un número a 2 decimales con semántica half-up.
 * Equivalente a `Math.round(n * 100) / 100` pero sin errores de FP intermedios.
 */
export function moneyRound(n: number): number {
  return Number(new Big(n).round(2));
}

/** Suma cualquier número de importes y redondea a 2 decimales. */
export function moneyAdd(...amounts: number[]): number {
  const total = amounts.reduce((acc, x) => acc.plus(x), new Big(0));
  return Number(total.round(2));
}

/** Resta `b` de `a` y redondea a 2 decimales. */
export function moneySub(a: number, b: number): number {
  return Number(new Big(a).minus(b).round(2));
}

/** Multiplica dos importes y redondea a 2 decimales. */
export function moneyMul(a: number, b: number): number {
  return Number(new Big(a).times(b).round(2));
}

/**
 * Divide `a` entre `b` y redondea a 2 decimales.
 * Lanza si `b` es 0. En fiscal, el divisor nunca es 0 (quantity, 1+VATrate, etc.).
 */
export function moneyDiv(a: number, b: number): number {
  if (b === 0) throw new Error("moneyDiv: divisor is 0");
  // 20 decimales intermedios para evitar pérdida antes del round final.
  return Number(new Big(a).div(b).round(2));
}

/**
 * Extrae la base imponible a partir de un precio con IVA incluido.
 * base = priceWithVAT / (1 + vatRate / 100)
 *
 * @example
 *   baseFromPriceWithVAT(24.20, 21) → 20.00
 *   baseFromPriceWithVAT(10.50, 10) →  9.55
 */
export function baseFromPriceWithVAT(priceWithVAT: number, vatRate: number): number {
  const divisor = new Big(1).plus(new Big(vatRate).div(100));
  return Number(new Big(priceWithVAT).div(divisor).round(2));
}

/**
 * Calcula la cuota (IVA o recargo) sobre una base imponible.
 * cuota = base * rate / 100
 */
export function feeOnBase(base: number, ratePercent: number): number {
  return Number(new Big(base).times(ratePercent).div(100).round(2));
}

/**
 * Compara dos importes con tolerancia de 1 céntimo.
 * Útil para verificaciones cruzadas (base+IVA == totalLinea, etc.) sin
 * falsos positivos por redondeos intermedios.
 */
export function moneyEquals(a: number, b: number, toleranceCents = 1): boolean {
  return Math.abs(Number(new Big(a).minus(b))) * 100 < toleranceCents;
}

/** Formatea un importe como "1.234,56 €" (formato español). */
export function formatMoneyES(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
