/**
 * Servicio de facturación — Generación, hash, encadenamiento VeriFactu.
 *
 * Flujo completo al confirmar un pedido:
 * 1. createInvoice() → genera InvoiceRecord completo
 * 2. generateInvoiceHash() → SHA-256 del contenido fiscal
 * 3. chainInvoiceHash() → encadena con la factura anterior (requisito VeriFactu)
 * 4. generateVerifactuQR() → URL del QR verificable
 * 5. saveInvoice() → almacena en localStorage (preparado para BD)
 * 6. Estado VeriFactu: PENDIENTE hasta que se conecte API real
 *
 * PREPARADO PARA BASE DE DATOS:
 * Sustituye las funciones loadInvoices()/saveInvoice() por llamadas a tu API.
 */

import type {
  InvoiceRecord,
  InvoiceLineItem,
  InvoiceTotals,
  CompanyData,
  CustomerData,
  CorrectionData,
} from "@/types/fiscal";
import {
  InvoiceType,
  InvoiceStatus,
  VerifactuStatus,
  TaxIdType,
  AuditAction,
  InvoiceOrigin,
  CorrectionType,
} from "@/types/fiscal";
import { SITE_CONFIG } from "@/config/siteConfig";
import { getIssuerAddress } from "@/lib/fiscalAddress";
import {
  INVOICE_STORAGE_KEY,
  INVOICE_INTEGRITY_KEY,
  INVOICE_SERIES,
} from "@/config/verifactuConfig";
import {
  calculateTaxBreakdown,
  calculateVAT,
  calculateSurcharge,
} from "@/services/taxService";
import { buildVerifactuQRUrl } from "@/services/verifactuService";
import { DataHub } from "@/lib/dataHub";
import { getOrdersByUser } from "@/lib/orderAdapter";
import { validateSpanishNIF } from "@/lib/validations/nif";
import { moneyRound as roundTo2, baseFromPriceWithVAT } from "@/lib/money";
import { tripleCheckInvoice } from "@/lib/fiscalAudit";

// ─── Datos del emisor (TCG Academy) ──────────────────────────────────────────

export function buildIssuer(): CompanyData {
  // El parser de dirección vive en `@/lib/fiscalAddress` — fuente única para
  // todo el sistema (facturas, presupuestos, PDFs, emails).
  const issuer = getIssuerAddress();
  return {
    name: SITE_CONFIG.legalName,
    taxId: SITE_CONFIG.cif,
    taxIdType: TaxIdType.CIF,
    address: {
      street: issuer.street,
      city: issuer.city,
      postalCode: issuer.postalCode,
      province: issuer.province,
      country: issuer.country,
      countryCode: issuer.countryCode,
    },
    phone: SITE_CONFIG.phone,
    email: SITE_CONFIG.email,
    isEU: false,
    countryCode: "ES",
  };
}

// ─── Número de factura correlativo (con lock anti-colisión) ─────────────────

const INVOICE_LOCK_KEY = "tcgacademy_invoice_lock";
const INVOICE_LOCK_TTL = 5000; // 5 seconds max lock

/**
 * Acquire a simple localStorage-based lock for invoice number generation.
 * Prevents two concurrent tabs from generating the same number.
 */
function acquireInvoiceLock(): boolean {
  try {
    const raw = localStorage.getItem(INVOICE_LOCK_KEY);
    if (raw) {
      const ts = JSON.parse(raw) as number;
      if (Date.now() - ts < INVOICE_LOCK_TTL) return false; // Lock held
    }
    localStorage.setItem(INVOICE_LOCK_KEY, JSON.stringify(Date.now()));
    return true;
  } catch {
    return false;
  }
}

function releaseInvoiceLock(): void {
  try {
    localStorage.removeItem(INVOICE_LOCK_KEY);
  } catch { /* non-critical */ }
}

// ─── Dígitos de control (sistema propio basado en primos) ────────────────────
//
// Formato final: FAC-YYYY-NNNNNXXXXXE
//   NNNNN = secuencial 5 dígitos (correlativo, requisito art. 6 RD 1619/2012)
//   XXXXX = número de control determinista, derivado de (N, año) vía aritmética
//           modular sobre primos. No aleatorio: la misma factura siempre produce
//           el mismo XXXXX. Pero sin conocer los primos es computacionalmente
//           impredecible → evita falsificación por numeración.
//   E     = origen "Electrónica / web". Reservado para futuras series
//           (ej. T = tienda, B = B2B manual).
//
// Para verificar una factura: recomputar computeControlDigits(N, year) y comparar.
//
// IMPORTANTE: estos primos son parte del "secreto" del sistema. No cambiar nunca
// una vez emitida la primera factura con ellos, porque invalidaría la verificación
// de todas las anteriores. Si necesitas rotarlos, introduce un nuevo sufijo de
// origen (ej. "E2") y conserva la antigua fórmula para verificar las históricas.

const CONTROL_PRIME_MULT = 104729;   // 10.000º primo
const CONTROL_PRIME_YEAR = 32771;    // primo impar, > 2*año max razonable
const CONTROL_PRIME_OFFSET = 17389;  // primo impar, evita colisión con N=0
const CONTROL_MODULUS = 99991;       // mayor primo ≤ 99999 → rango [0, 99990]

/** @deprecated Usar `InvoiceOrigin.WEB` del enum en `@/types/fiscal`. */
export const INVOICE_ORIGIN_WEB = InvoiceOrigin.WEB;

/**
 * Calcula los 5 dígitos de control para una factura dada.
 * Determinista: misma entrada → misma salida.
 * Impredecible sin conocer los primos del módulo.
 */
export function computeControlDigits(sequentialN: number, year: number): string {
  // Aritmética modular pura — no usar punto flotante.
  // Cuidado con overflow: en JS todos los enteros hasta 2^53 son seguros.
  // 999999 * 104729 ≈ 1.05e11 « 2^53, safe.
  const raw = (sequentialN * CONTROL_PRIME_MULT
             + year * CONTROL_PRIME_YEAR
             + CONTROL_PRIME_OFFSET) % CONTROL_MODULUS;
  return String(raw).padStart(5, "0");
}

/**
 * Extrae el número secuencial (N) de un número de factura en cualquiera de
 * los formatos soportados:
 *   - Nuevo:    FAC-YYYY-NNNNNXXXXXE  → primeros 5 dígitos tras el prefijo
 *   - Legacy:   FAC-YYYY-NNNNN        → todos los dígitos
 * Devuelve NaN si no es parseable.
 */
function extractSequentialNumber(invoiceNumber: string, prefix: string): number {
  if (!invoiceNumber.startsWith(prefix)) return NaN;
  const body = invoiceNumber.slice(prefix.length);
  // Primeros 5 caracteres = N. Si el número legacy tenía menos de 5 no debería
  // existir (siempre padStart 5), pero por si acaso, usamos /^\d+/ con tope.
  const first5 = body.slice(0, 5);
  if (!/^\d{1,5}$/.test(first5)) return NaN;
  return parseInt(first5, 10);
}

/**
 * Verifica si un número de factura es válido (dígitos de control OK).
 * Sólo aplica al formato nuevo. El legacy (sin XXXXXE) se considera válido
 * por convención (emitido antes del sistema de control).
 */
export function verifyInvoiceNumber(invoiceNumber: string): { valid: boolean; reason?: string } {
  const match = invoiceNumber.match(/^([A-Z]+)-(\d{4})-(\d{5})(\d{5})([A-Z])$/);
  if (!match) {
    // Posible formato legacy FAC-YYYY-NNNNN — se da por válido
    if (/^[A-Z]+-\d{4}-\d{5}$/.test(invoiceNumber)) {
      return { valid: true, reason: "legacy" };
    }
    return { valid: false, reason: "formato no reconocido" };
  }
  const [, , yearStr, nStr, xStr] = match;
  const n = parseInt(nStr, 10);
  const y = parseInt(yearStr, 10);
  const expected = computeControlDigits(n, y);
  if (expected !== xStr) {
    return { valid: false, reason: `dígitos de control esperados ${expected}, recibidos ${xStr}` };
  }
  return { valid: true };
}

/**
 * Genera el siguiente número de factura en formato FAC-YYYY-NNNNNXXXXXO.
 * Garantiza correlatividad sin saltos (requisito art. 6 RD 1619/2012).
 * El sufijo `origin` indica el canal de emisión (E=web, T=TPV, M=manual, B=B2B).
 *
 * HARDENED: Uses a localStorage lock to prevent concurrent tabs from generating
 * the same invoice number. Extracts max existing number from parsed values
 * (not array length) to handle gaps from corrupted data.
 */
export function generateInvoiceNumber(origin: InvoiceOrigin = InvoiceOrigin.WEB): string {
  // Try to acquire lock (retry once after 100ms if busy)
  if (!acquireInvoiceLock()) {
    // Brief spin — invoice generation is fast
    const start = Date.now();
    while (Date.now() - start < 200) { /* spin */ }
    if (!acquireInvoiceLock()) {
      // Force-acquire if stale (safety net)
      localStorage.setItem(INVOICE_LOCK_KEY, JSON.stringify(Date.now()));
    }
  }

  try {
    const invoices = loadInvoices();
    const year = new Date().getFullYear();
    const prefix = `${INVOICE_SERIES}-${year}-`;

    // Extract the actual max number from existing invoices (not array length)
    let maxNum = 0;
    for (const inv of invoices) {
      const numPart = extractSequentialNumber(inv.invoiceNumber, prefix);
      if (Number.isFinite(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }

    const nextNum = maxNum + 1;
    const nStr = String(nextNum).padStart(5, "0");
    const xStr = computeControlDigits(nextNum, year);
    return `${INVOICE_SERIES}-${year}-${nStr}${xStr}${origin}`;
  } finally {
    releaseInvoiceLock();
  }
}

/** Extrae el origen (última letra) de un número de factura en formato v2. */
function extractOriginFromNumber(invoiceNumber: string): InvoiceOrigin {
  const m = invoiceNumber.match(/^[A-Z]+-\d{4}-\d{5}\d{5}([A-Z])$/);
  if (!m) return InvoiceOrigin.WEB;
  const letter = m[1];
  const values = Object.values(InvoiceOrigin) as string[];
  return values.includes(letter) ? (letter as InvoiceOrigin) : InvoiceOrigin.WEB;
}

// ─── Construcción de líneas de factura ───────────────────────────────────────

/**
 * Construye una línea de factura a partir de datos básicos del pedido.
 * El precio de entrada puede ser con o sin IVA — indicar en `priceIncludesVAT`.
 */
export function buildLineItem(params: {
  lineNumber: number;
  productId: string;
  description: string;
  quantity: number;
  unitPriceWithVAT: number;
  vatRate: 0 | 4 | 10 | 21;
  discount?: number;
  applySurcharge?: boolean;
}): InvoiceLineItem {
  const {
    lineNumber,
    productId,
    description,
    quantity,
    unitPriceWithVAT,
    vatRate,
    discount = 0,
    applySurcharge = false,
  } = params;

  // `unitPriceWithVAT` es el precio final IVA incluido que teclea el usuario —
  // tratarlo como autoritativo y derivar base/IVA hacia atrás evita perder
  // céntimos por redondeos intermedios (ej: 10 € IVA 21 % no debe caer a 9,99).
  const unitPriceNoVAT = baseFromPriceWithVAT(unitPriceWithVAT, vatRate);
  const grossTotal = roundTo2(unitPriceWithVAT * quantity);
  const finalGross = roundTo2(grossTotal * (1 - discount / 100));
  const taxableBase = roundTo2(finalGross / (1 + vatRate / 100));
  const vatAmount = roundTo2(finalGross - taxableBase);
  // discountAmount se expresa sobre la base imponible (convención fiscal).
  const subtotalBase = roundTo2(unitPriceNoVAT * quantity);
  const discountAmount = roundTo2(subtotalBase - taxableBase);

  const surchargeRateMap: Record<number, 0 | 0.5 | 1.4 | 5.2> = {
    0: 0,
    4: 0.5,
    10: 1.4,
    21: 5.2,
  };
  const surchargeRate = applySurcharge ? surchargeRateMap[vatRate] : 0;
  const surchargeAmount = applySurcharge
    ? calculateSurcharge(taxableBase, surchargeRate)
    : 0;

  const totalLine = roundTo2(taxableBase + vatAmount + surchargeAmount);

  return {
    lineNumber,
    productId,
    description,
    quantity,
    unitPrice: unitPriceNoVAT,
    discount,
    discountAmount,
    taxableBase,
    vatRate,
    vatAmount,
    surchargeRate,
    surchargeAmount,
    totalLine,
  };
}

// ─── Totales (con verificación cruzada interna) ─────────────────────────────

export function calculateTotals(items: InvoiceLineItem[]): InvoiceTotals {
  const totalTaxableBase = roundTo2(
    items.reduce((s, i) => s + i.taxableBase, 0),
  );
  const totalVAT = roundTo2(items.reduce((s, i) => s + i.vatAmount, 0));
  const totalSurcharge = roundTo2(
    items.reduce((s, i) => s + i.surchargeAmount, 0),
  );
  const totalInvoice = roundTo2(totalTaxableBase + totalVAT + totalSurcharge);

  // ── VERIFICACIÓN CRUZADA: suma de totalLine debe coincidir ──
  const totalFromLines = roundTo2(
    items.reduce((s, i) => s + i.totalLine, 0),
  );
  const diff = Math.abs(totalInvoice - totalFromLines);
  if (diff >= 0.01) {
    throw new Error(
      `INTEGRIDAD FISCAL: Total calculado (${totalInvoice}) difiere de suma de líneas (${totalFromLines}) en ${diff.toFixed(2)}€. ` +
      `Factura NO generada para evitar discrepancia fiscal.`,
    );
  }

  // ── VERIFICACIÓN: cada línea es internamente consistente ──
  // Tolerancia de 1 céntimo (admitida por AEAT para redondeos): buildLineItem
  // calcula el IVA por método top-down (total − base) y calculateVAT por
  // bottom-up (base × rate). Ambos métodos pueden discrepar exactamente
  // 1 céntimo en casos borde (ej: cupón −10 € al 21% → top-down −1,74 vs
  // bottom-up −1,73). Usamos estrictamente mayor que 0,011 (buffer FP) para
  // no generar falsos positivos mientras seguimos detectando cualquier
  // manipulación real (que será de varios céntimos o más).
  for (const item of items) {
    const expectedBase = roundTo2(
      roundTo2(item.unitPrice * item.quantity) - item.discountAmount,
    );
    if (Math.abs(expectedBase - item.taxableBase) > 0.011) {
      throw new Error(
        `INTEGRIDAD FISCAL: Línea "${item.description}" base esperada ${expectedBase} ≠ registrada ${item.taxableBase}`,
      );
    }
    const expectedVAT = calculateVAT(item.taxableBase, item.vatRate);
    if (Math.abs(expectedVAT - item.vatAmount) > 0.011) {
      throw new Error(
        `INTEGRIDAD FISCAL: Línea "${item.description}" IVA esperado ${expectedVAT} ≠ registrado ${item.vatAmount}`,
      );
    }
  }

  return {
    totalTaxableBase,
    totalVAT,
    totalSurcharge,
    totalInvoice,
    totalPaid: totalInvoice,
    totalPending: 0,
    currency: "EUR",
  };
}

// ─── Creación de factura ──────────────────────────────────────────────────────

/** Parámetros para crear una factura a partir de un pedido */
export interface CreateInvoiceParams {
  recipient: CompanyData | CustomerData;
  items: InvoiceLineItem[];
  paymentMethod: InvoiceRecord["paymentMethod"];
  sourceOrderId?: string;
  invoiceDate?: Date;
  operationDate?: Date;
  invoiceType?: InvoiceType;
  correctionData?: CorrectionData;
  /** Canal de emisión — sufijo del número de factura. Default: WEB (E). */
  origin?: InvoiceOrigin;
}

/**
 * Crea un InvoiceRecord completo, genera el hash y encadena con la factura anterior.
 * Llama a esta función al confirmar un pedido.
 */
export async function createInvoice(
  params: CreateInvoiceParams,
): Promise<InvoiceRecord> {
  const {
    recipient,
    items,
    paymentMethod,
    sourceOrderId,
    invoiceDate = new Date(),
    operationDate,
    invoiceType = InvoiceType.COMPLETA,
    correctionData,
    origin = InvoiceOrigin.WEB,
  } = params;

  const invoiceNumber = generateInvoiceNumber(origin);
  const invoiceId = generateId();

  // Recargo de equivalencia — si el receptor está en ese régimen especial
  // (minoristas), cada línea lleva un recargo sobre la base imponible
  // (21%→5.2%, 10%→1.4%, 4%→0.5%). GAP-014.
  const needsSurcharge = Boolean(
    (recipient as { recargoEquivalencia?: boolean }).recargoEquivalencia,
  );
  const finalItems: InvoiceLineItem[] =
    needsSurcharge && items.some((i) => i.surchargeRate === 0)
      ? items.map((i) =>
          buildLineItem({
            lineNumber: i.lineNumber,
            productId: i.productId,
            description: i.description,
            quantity: i.quantity,
            // unitPriceWithVAT reconstruido a partir de los campos normalizados
            unitPriceWithVAT: i.quantity > 0 ? i.totalLine / i.quantity : 0,
            vatRate: i.vatRate,
            discount: i.discount,
            applySurcharge: true,
          }),
        )
      : items;

  const taxBreakdown = calculateTaxBreakdown(finalItems);
  const totals = calculateTotals(finalItems);

  const invoice: InvoiceRecord = {
    invoiceId,
    invoiceNumber,
    invoiceDate,
    operationDate: operationDate ?? invoiceDate,
    invoiceType,
    issuer: buildIssuer(),
    recipient,
    items: finalItems,
    taxBreakdown,
    totals,
    paymentMethod,
    paymentDate: new Date(),
    status: InvoiceStatus.EMITIDA,
    verifactuHash: null,
    verifactuChainHash: null,
    verifactuQR: null,
    verifactuStatus: VerifactuStatus.PENDIENTE,
    verifactuTimestamp: null,
    verifactuError: null,
    previousInvoiceChainHash: null,
    correctionData: correctionData ?? null,
    sourceOrderId: sourceOrderId ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
    auditLog: [
      {
        timestamp: new Date(),
        userId: "system",
        userName: "Sistema",
        action: AuditAction.CREADA,
        detail: `Factura ${invoiceNumber} creada automáticamente`,
      },
    ],
    metadata: {},
  };

  // Genera hash SHA-256 del contenido fiscal
  const hash = await generateInvoiceHash(invoice);
  invoice.verifactuHash = hash;

  // Encadena con la factura anterior (requisito VeriFactu)
  const previousChainHash = getLastChainHash();
  const chainHash = await chainInvoiceHash(hash, previousChainHash);
  invoice.verifactuChainHash = chainHash;
  invoice.previousInvoiceChainHash = previousChainHash;

  // Genera URL del QR verificable
  invoice.verifactuQR = buildVerifactuQRUrl(invoice);

  // ── VALIDACIÓN FINAL antes de devolver ──
  const validation = validateInvoice(invoice);
  if (!validation.valid) {
    throw new Error(
      `Factura ${invoiceNumber} no pasa validación fiscal: ${validation.errors.join("; ")}`,
    );
  }

  return invoice;
}

// ─── Hash y encadenamiento ───────────────────────────────────────────────────

/**
 * Genera el hash SHA-256 de los campos fiscales clave de la factura.
 *
 * Campos incluidos en el hash (siguiendo el espíritu del RD 1007/2023):
 * - NIF emisor + número serie + fecha + importe total + NIF receptor
 *
 * IMPORTANTE: Una vez generado, este hash NO debe modificarse.
 * Si se necesita corrección, emitir factura rectificativa.
 */
export async function generateInvoiceHash(
  invoice: InvoiceRecord,
): Promise<string> {
  const content = [
    invoice.issuer.taxId,
    invoice.invoiceNumber,
    formatDateForHash(invoice.invoiceDate),
    invoice.totals.totalInvoice.toFixed(2),
    "taxId" in invoice.recipient ? (invoice.recipient.taxId ?? "") : "",
  ].join("|");

  return sha256(content);
}

/**
 * Genera el hash encadenado = SHA-256(hashActual + hashAnterior).
 * Si no hay factura anterior (primera del año), hashAnterior = "".
 * El encadenamiento es el núcleo del sistema anti-manipulación de VeriFactu.
 */
export async function chainInvoiceHash(
  currentHash: string,
  previousChainHash: string | null,
): Promise<string> {
  const combined = currentHash + (previousChainHash ?? "");
  return sha256(combined);
}

// ─── Rectificativas y anulaciones ────────────────────────────────────────────

/**
 * Crea una factura rectificativa sobre una factura original.
 *
 * Dos modos según Art. 15.3 RD 1619/2012:
 *   - SUSTITUCION: la rectificativa recoge los importes correctos en su totalidad
 *     y la original queda ANULADA. Usar cuando hubo error de fondo
 *     (cliente incorrecto, concepto erróneo, factura emitida por duplicado).
 *   - DIFERENCIAS: la rectificativa recoge sólo el delta (puede llevar líneas
 *     negativas). La original SIGUE VIGENTE. Usar para ajustes de precio,
 *     descuentos posteriores, o devoluciones parciales.
 *
 * La rectificativa lleva sufijo "R" en el número de factura para que sea
 * visualmente identificable en el libro y en los modelos 303/390/349/347.
 * Su hash encadenado garantiza la integridad VeriFactu.
 */
export async function rectifyInvoice(
  originalId: string,
  corrections: Partial<CreateInvoiceParams> & {
    correctionData: CorrectionData;
    /** Admin que está rectificando. Se registra en el auditLog. */
    userId?: string;
    userName?: string;
  },
): Promise<InvoiceRecord> {
  if (!corrections.correctionData) {
    throw new Error("rectifyInvoice: correctionData es obligatorio (Art. 15 RD 1619/2012)");
  }
  if (!corrections.correctionData.reason?.trim()) {
    throw new Error("rectifyInvoice: motivo de la rectificación obligatorio");
  }
  const invoices = loadInvoices();
  const original = invoices.find((inv) => inv.invoiceId === originalId);
  if (!original) throw new Error(`Factura ${originalId} no encontrada`);

  // No se puede rectificar una factura ya anulada — debe hacerse desde la
  // rectificativa que la sustituyó, si existe.
  if (original.status === InvoiceStatus.ANULADA) {
    throw new Error(
      `Factura ${original.invoiceNumber} ya está anulada. No se puede rectificar una factura anulada.`,
    );
  }
  // No tiene sentido rectificar una rectificativa — debería emitirse una nueva
  // rectificativa sobre la ORIGINAL (cadena de rectificativas no permitida por AEAT).
  if (original.invoiceType === InvoiceType.RECTIFICATIVA) {
    throw new Error(
      `La factura ${original.invoiceNumber} ya es rectificativa. Emitir nueva rectificativa sobre la original.`,
    );
  }

  // Asegurar coherencia: los datos de la original dentro de correctionData.
  const correctionData: CorrectionData = {
    ...corrections.correctionData,
    originalInvoiceId: original.invoiceId,
    originalInvoiceNumber: original.invoiceNumber,
    originalInvoiceDate: new Date(original.invoiceDate),
  };

  const rectificativa = await createInvoice({
    recipient: corrections.recipient ?? original.recipient,
    items: corrections.items ?? original.items,
    paymentMethod: corrections.paymentMethod ?? original.paymentMethod,
    sourceOrderId: original.sourceOrderId ?? undefined,
    invoiceType: InvoiceType.RECTIFICATIVA,
    correctionData,
    // Sufijo "R" en el número → visible en el libro y en los modelos fiscales.
    origin: InvoiceOrigin.RECTIFICATIVA,
  });

  // Actor que registra la rectificación (audit trail fiscal real, no "admin").
  const actorId = corrections.userId ?? "admin";
  const actorName = corrections.userName ?? "Administrador";

  // Sólo se anula la original si la rectificación es por SUSTITUCIÓN.
  // En DIFERENCIAS la original permanece vigente (Art. 15.3 RD 1619/2012).
  const isSubstitution =
    correctionData.correctionType === CorrectionType.SUSTITUCION;

  const updatedOriginal: InvoiceRecord = isSubstitution
    ? {
        ...original,
        status: InvoiceStatus.ANULADA,
        updatedAt: new Date(),
        auditLog: [
          ...original.auditLog,
          {
            timestamp: new Date(),
            userId: actorId,
            userName: actorName,
            action: AuditAction.RECTIFICADA,
            detail: `Sustituida por rectificativa ${rectificativa.invoiceNumber} (${correctionData.reasonCode}: ${correctionData.reason})`,
          },
        ],
      }
    : {
        ...original,
        updatedAt: new Date(),
        auditLog: [
          ...original.auditLog,
          {
            timestamp: new Date(),
            userId: actorId,
            userName: actorName,
            action: AuditAction.RECTIFICADA,
            detail: `Rectificada por diferencias mediante ${rectificativa.invoiceNumber} (${correctionData.reasonCode}: ${correctionData.reason}). Original sigue vigente.`,
          },
        ],
      };

  const updatedInvoices = invoices.map((inv) =>
    inv.invoiceId === originalId ? updatedOriginal : inv,
  );
  persistInvoices([...updatedInvoices, rectificativa]);

  // ── Side-effects sobre la rectificativa ────────────────────────────────
  // La original ya tenía asiento y envío VeriFactu previos; solo la
  // RECTIFICATIVA necesita dispararlos ahora. Estos side effects son idénticos
  // a los de `saveInvoice()`, pero no podemos reutilizarlo porque re-añadiría
  // la rectificativa (duplicado). Ver flujo análogo en saveInvoice().
  void (async () => {
    try {
      const { createJournalFromInvoice } = await import("@/accounting/journalEngine");
      await createJournalFromInvoice(rectificativa);
    } catch {
      // Silent — autopilot fiscal detectará discrepancia en cross-validation.
    }
  })();

  void (async () => {
    try {
      const { VERIFACTU_CONFIG } = await import("@/config/verifactuConfig");
      if (VERIFACTU_CONFIG.mode === "off") return;
      const { getVerifactuProvider } = await import("@/services/verifactuService");
      const provider = getVerifactuProvider();
      const response = await provider.sendInvoice(rectificativa);
      const updatedRectificativa: InvoiceRecord = {
        ...rectificativa,
        verifactuStatus: response.status,
        verifactuTimestamp: response.aeatTimestamp ?? new Date(),
        verifactuError: response.errorMessage ?? null,
        status: response.success ? InvoiceStatus.ENVIADA_AEAT : rectificativa.status,
        updatedAt: new Date(),
        auditLog: [
          ...rectificativa.auditLog,
          {
            timestamp: new Date(),
            userId: "system",
            userName: "Sistema VeriFactu",
            action: AuditAction.ENVIADA_VERIFACTU,
            detail: response.success
              ? `Rectificativa enviada a VeriFactu (${response.providerId ?? "mock"}). Estado: ${response.status}.`
              : `Envío de rectificativa rechazado: ${response.errorMessage ?? "desconocido"}`,
          },
        ],
      };
      updateInvoice(updatedRectificativa);
    } catch {
      // VeriFactu silent fail — autopilot lo detectará en próximo escaneo.
    }
  })();

  return rectificativa;
}

/**
 * Anula una factura.
 * Las facturas anuladas quedan en el registro (nunca se eliminan).
 * Si ya se emitió al cliente, debe crearse una factura rectificativa.
 */
export async function annulInvoice(
  invoiceId: string,
  reason: string,
  userId = "admin",
): Promise<InvoiceRecord> {
  const invoices = loadInvoices();
  const invoice = invoices.find((inv) => inv.invoiceId === invoiceId);
  if (!invoice) throw new Error(`Factura ${invoiceId} no encontrada`);
  if (invoice.status === InvoiceStatus.ANULADA) {
    throw new Error("La factura ya está anulada");
  }

  const updated: InvoiceRecord = {
    ...invoice,
    status: InvoiceStatus.ANULADA,
    updatedAt: new Date(),
    auditLog: [
      ...invoice.auditLog,
      {
        timestamp: new Date(),
        userId,
        userName: "Administrador",
        action: AuditAction.ANULADA,
        detail: `Anulada. Motivo: ${reason}`,
      },
    ],
  };

  persistInvoices(
    invoices.map((inv) => (inv.invoiceId === invoiceId ? updated : inv)),
  );
  return updated;
}

// ─── Validación ──────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valida que una factura cumple todos los requisitos legales españoles.
 * Basado en art. 6 y 7 del RD 1619/2012.
 */
export function validateInvoice(invoice: InvoiceRecord): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Campos obligatorios (art. 6 RD 1619/2012)
  if (!invoice.invoiceNumber) errors.push("Número de factura obligatorio");
  if (!invoice.invoiceDate) errors.push("Fecha de expedición obligatoria");
  if (!invoice.issuer.taxId) errors.push("NIF/CIF del emisor obligatorio");
  if (!invoice.issuer.name) errors.push("Razón social del emisor obligatoria");
  if (invoice.items.length === 0)
    errors.push("La factura debe tener al menos una línea");

  // Receptor obligatorio en factura completa (Art. 6.1.d RD 1619/2012)
  if (invoice.invoiceType === InvoiceType.COMPLETA) {
    const recipient = invoice.recipient as CompanyData;
    if (!recipient.name)
      errors.push("Nombre del receptor obligatorio en factura completa");
    if (!recipient.taxId)
      errors.push(
        "NIF/NIE/CIF del receptor obligatorio en factura completa (Art. 6.1.d RD 1619/2012)",
      );
    if (recipient.taxId) {
      // Validación estructural para clientes españoles
      const country = recipient.countryCode ?? "ES";
      if (country === "ES") {
        const v = validateSpanishNIF(recipient.taxId);
        if (!v.valid) {
          errors.push(
            `NIF/NIE/CIF del receptor no válido: ${v.error ?? "formato incorrecto"}`,
          );
        }
      }
    }
  }

  // Totales
  if (invoice.totals.totalInvoice <= 0) {
    warnings.push("El importe total es 0 o negativo");
  }

  // VeriFactu
  if (!invoice.verifactuHash) warnings.push("Hash VeriFactu no generado");
  if (!invoice.verifactuChainHash) warnings.push("Hash encadenado no generado");

  // Facturas rectificativas
  if (
    invoice.invoiceType === InvoiceType.RECTIFICATIVA &&
    !invoice.correctionData
  ) {
    errors.push("Las facturas rectificativas requieren datos de corrección");
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Migración de numeración (legacy → FAC-YYYY-NNNNNXXXXXE) ─────────────────
//
// Toda factura existente anterior a la adopción del formato nuevo se re-numera
// de forma determinista y se re-encadena:
//   1. Se agrupan por año y se ordenan por (invoiceDate, createdAt, invoiceId).
//   2. A cada una se le asigna N = posición ordinal dentro del año (1..M).
//   3. Se calcula XXXXX = computeControlDigits(N, año) y se añade el sufijo "E".
//   4. Se recalcula verifactuHash con el nuevo invoiceNumber.
//   5. Se recalcula toda la cadena verifactuChainHash en orden cronológico global.
//   6. Se añade una entrada en auditLog describiendo el cambio.
//   7. Se persiste la versión del esquema para no volver a ejecutar la migración.
//
// Idempotente: ya migrado → no-op. Las facturas que ya cumplen el formato v2
// y superan verifyInvoiceNumber() se dejan intactas (solo se re-encadenan).

const INVOICE_NUMBER_VERSION_KEY = "tcgacademy_invoice_number_version";
const INVOICE_NUMBER_VERSION_CURRENT = 2;

export interface InvoiceMigrationReport {
  migrated: number;       // facturas cuyo número cambió
  preserved: number;      // facturas ya en formato v2 que se mantienen tal cual
  rechained: number;      // total re-encadenadas (incluye preserved si cambió alguna anterior)
  errors: string[];
  alreadyUpToDate: boolean;
}

export async function migrateInvoiceNumbersIfNeeded(): Promise<InvoiceMigrationReport> {
  const empty: InvoiceMigrationReport = {
    migrated: 0,
    preserved: 0,
    rechained: 0,
    errors: [],
    alreadyUpToDate: true,
  };
  if (typeof window === "undefined") return empty;

  const currentVersion = Number(localStorage.getItem(INVOICE_NUMBER_VERSION_KEY) ?? "1");
  const invoices = loadInvoices();
  if (invoices.length === 0) {
    localStorage.setItem(INVOICE_NUMBER_VERSION_KEY, String(INVOICE_NUMBER_VERSION_CURRENT));
    return empty;
  }
  if (currentVersion >= INVOICE_NUMBER_VERSION_CURRENT) {
    return { ...empty, preserved: invoices.length };
  }

  const report: InvoiceMigrationReport = {
    migrated: 0,
    preserved: 0,
    rechained: 0,
    errors: [],
    alreadyUpToDate: false,
  };

  // 1. Orden global cronológico estable (crítico para la cadena de hashes).
  const sorted = [...invoices].sort((a, b) => {
    const da = new Date(a.invoiceDate).getTime();
    const db = new Date(b.invoiceDate).getTime();
    if (da !== db) return da - db;
    const ca = new Date(a.createdAt).getTime();
    const cb = new Date(b.createdAt).getTime();
    if (ca !== cb) return ca - cb;
    return a.invoiceId.localeCompare(b.invoiceId);
  });

  // 2. Asignar N correlativo por año.
  const counterByYear = new Map<number, number>();
  const updatedList: InvoiceRecord[] = [];
  let previousChainHash: string | null = null;

  for (const original of sorted) {
    try {
      const year = new Date(original.invoiceDate).getFullYear();
      const currentN = (counterByYear.get(year) ?? 0) + 1;
      counterByYear.set(year, currentN);

      const prefix = `${INVOICE_SERIES}-${year}-`;
      const newNumber = `${prefix}${String(currentN).padStart(5, "0")}${computeControlDigits(currentN, year)}${INVOICE_ORIGIN_WEB}`;

      const numberChanged = original.invoiceNumber !== newNumber;

      // Construir copia con el nuevo número (siempre regeneramos hash/cadena).
      const working: InvoiceRecord = {
        ...original,
        invoiceNumber: newNumber,
        // issuer se re-normaliza al valor actual en loadInvoices(), lo respetamos.
        updatedAt: new Date(),
        previousInvoiceChainHash: previousChainHash,
      };

      const newHash = await generateInvoiceHash(working);
      working.verifactuHash = newHash;
      const newChainHash = await chainInvoiceHash(newHash, previousChainHash);
      working.verifactuChainHash = newChainHash;
      working.verifactuQR = buildVerifactuQRUrl(working);

      if (numberChanged) {
        working.auditLog = [
          ...working.auditLog,
          {
            timestamp: new Date(),
            userId: "system",
            userName: "Sistema — Migración numeración",
            action: AuditAction.MIGRADA,
            detail: `Número migrado de "${original.invoiceNumber}" a "${newNumber}" (formato FAC-YYYY-NNNNNXXXXXE con dígitos de control).`,
          },
        ];
        report.migrated++;
      } else {
        report.preserved++;
      }

      report.rechained++;
      previousChainHash = newChainHash;
      updatedList.push(working);
    } catch (err) {
      report.errors.push(
        `Factura ${original.invoiceNumber}: ${err instanceof Error ? err.message : "error desconocido"}`,
      );
      // En caso de error, preservamos la original para no perder datos.
      updatedList.push(original);
    }
  }

  if (report.errors.length === 0) {
    persistInvoices(updatedList);
    localStorage.setItem(INVOICE_NUMBER_VERSION_KEY, String(INVOICE_NUMBER_VERSION_CURRENT));
  }

  return report;
}

// ─── Almacenamiento (localStorage → reemplazar por BD) ───────────────────────

/**
 * Detecta facturas legacy con datos mock del emisor ("Calle Ejemplo",
 * CIF placeholder, razón social vacía). Esas SÍ deben migrarse al emisor
 * actual porque nunca fueron "snapshots reales" — eran mocks de desarrollo.
 *
 * Todas las demás se respetan COMO ESTÁN: son fotografías fiscales del
 * momento de emisión (Art. 6 RD 1619/2012) y NO pueden reescribirse si
 * SITE_CONFIG cambia (mudanza de oficina, rebranding, fusión).
 */
function isLegacyMockIssuer(issuer: InvoiceRecord["issuer"]): boolean {
  if (!issuer) return true;
  if (!issuer.taxId || !issuer.name) return true;
  const mockMarkers = ["Calle Ejemplo", "ejemplo", "MOCK", "PLACEHOLDER"];
  const street = issuer.address?.street ?? "";
  return mockMarkers.some((m) => street.toLowerCase().includes(m.toLowerCase()));
}

/** Carga todas las facturas del almacenamiento */
export function loadInvoices(): InvoiceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INVOICE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: InvoiceRecord[] = JSON.parse(raw);
    // SNAPSHOT INMUTABLE: la factura es una fotografía fiscal del momento
    // de emisión. NO reescribir el issuer con SITE_CONFIG actual — solo
    // migrar los mocks legacy de desarrollo (faltaba CIF, calle placeholder).
    const currentIssuer = buildIssuer();
    const migrated = parsed.map((inv) => {
      const deserialized = deserializeDates(inv);
      if (isLegacyMockIssuer(deserialized.issuer)) {
        return { ...deserialized, issuer: currentIssuer };
      }
      return deserialized;
    });
    return migrated;
  } catch {
    return [];
  }
}

/**
 * Helper canónico "Vista 360°": todas las facturas emitidas a un usuario.
 * El FK vive en Order (sourceOrderId → Order.userId), no en la factura
 * — la factura es snapshot inmutable con datos del receptor, no un FK vivo.
 */
export function getInvoicesByUser(userId: string): InvoiceRecord[] {
  const orderIds = new Set(getOrdersByUser(userId).map((o) => o.id));
  return loadInvoices().filter(
    (inv) => inv.sourceOrderId !== null && orderIds.has(inv.sourceOrderId),
  );
}

/** Guarda una nueva factura, actualiza el hash de integridad, y genera asiento contable */
export function saveInvoice(invoice: InvoiceRecord): void {
  // BLINDAJE ANTI-CORRUPCIÓN: triple-check antes de persistir.
  // Si las 3 vías de cálculo (líneas / recálculo desde unitPrice / desglose
  // fiscal) no coinciden, la factura está corrupta y NO se persiste jamás.
  // Mejor fallar ruidosamente aquí que emitir una factura con totales
  // incoherentes que luego dispare alertas en el autopilot fiscal.
  const check = tripleCheckInvoice(invoice);
  if (!check.allMatch) {
    throw new Error(
      `Factura ${invoice.invoiceNumber} rechazada por blindaje fiscal: ` +
        `los 3 métodos de cálculo difieren. ${check.discrepancies.join(" | ")}`,
    );
  }

  const invoices = loadInvoices();

  // Última línea de defensa contra duplicados: si otro tab insertó una
  // factura con el mismo número entre `generateInvoiceNumber()` y este
  // `saveInvoice()`, regeneramos antes de persistir. La correlatividad
  // legal (art. 6 RD 1619/2012) NO admite duplicados ni saltos — preferimos
  // un número nuevo (que avanza el correlativo) a colisionar con un número
  // ya emitido.
  if (invoices.some((inv) => inv.invoiceNumber === invoice.invoiceNumber)) {
    const origin = extractOriginFromNumber(invoice.invoiceNumber);
    const newNumber = generateInvoiceNumber(origin);
    invoice = { ...invoice, invoiceNumber: newNumber };
  }

  persistInvoices([...invoices, invoice]);

  // Generar asiento contable automáticamente (partida doble)
  // Se ejecuta async sin bloquear — el asiento es secundario a la factura
  void (async () => {
    try {
      const { createJournalFromInvoice } = await import("@/accounting/journalEngine");
      await createJournalFromInvoice(invoice);
    } catch {
      // El asiento contable falla silenciosamente — la factura ya está guardada.
      // El autopilot fiscal detectará la discrepancia en la cross-validation.
    }
  })();

  // ── Envío automático a VeriFactu (proveedor actual: mock o real) ──
  // Si VERIFACTU_CONFIG.mode === "off" no se hace NADA: la factura queda
  // en estado EMITIDA + verifactuStatus PENDIENTE, que es lo correcto mientras
  // no sea obligatorio o no haya proveedor contratado.
  // Non-blocking: la factura ya está guardada y contabilizada.
  void (async () => {
    try {
      const { VERIFACTU_CONFIG } = await import("@/config/verifactuConfig");
      if (VERIFACTU_CONFIG.mode === "off") return;
      const { getVerifactuProvider } = await import("@/services/verifactuService");
      const provider = getVerifactuProvider();
      const response = await provider.sendInvoice(invoice);
      const updated: InvoiceRecord = {
        ...invoice,
        verifactuStatus: response.status,
        verifactuTimestamp: response.aeatTimestamp ?? new Date(),
        verifactuError: response.errorMessage ?? null,
        status: response.success ? InvoiceStatus.ENVIADA_AEAT : invoice.status,
        updatedAt: new Date(),
        auditLog: [
          ...invoice.auditLog,
          {
            timestamp: new Date(),
            userId: "system",
            userName: "Sistema VeriFactu",
            action: AuditAction.ENVIADA_VERIFACTU,
            detail: response.success
              ? `Enviada a VeriFactu (${response.providerId ?? "mock"}). Estado: ${response.status}.`
              : `Envío rechazado: ${response.errorMessage ?? "desconocido"}`,
          },
        ],
      };
      updateInvoice(updated);
    } catch {
      // VeriFactu falla silenciosamente — la factura queda en PENDIENTE
      // y el autopilot la detectará en el próximo escaneo.
    }
  })();
}

/** Actualiza una factura existente */
export function updateInvoice(invoice: InvoiceRecord): void {
  const invoices = loadInvoices();
  persistInvoices(
    invoices.map((inv) =>
      inv.invoiceId === invoice.invoiceId ? invoice : inv,
    ),
  );
}

/**
 * Persist invoices to storage.
 * HARDENED: validates write success and throws on failure.
 * Invoices are CRITICAL fiscal data — silent failure is not acceptable.
 */
function persistInvoices(invoices: InvoiceRecord[]): void {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(invoices);
  try {
    localStorage.setItem(INVOICE_STORAGE_KEY, json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    throw new Error(`CRITICAL: Failed to persist invoices: ${msg}. Data may be lost.`);
  }

  // Verify write integrity
  const readBack = localStorage.getItem(INVOICE_STORAGE_KEY);
  if (!readBack || readBack.length !== json.length) {
    throw new Error("CRITICAL: Invoice write verification failed — data corruption possible.");
  }

  // Actualiza hash de integridad del conjunto
  void updateIntegrityHash(invoices);

  // Canonical event — any admin view (fiscal dashboard, factura list,
  // kpi counters) that subscribes to `tcga:invoices:updated` refreshes.
  DataHub.emit("invoices");
}

async function updateIntegrityHash(invoices: InvoiceRecord[]): Promise<void> {
  const content = invoices.map((inv) => inv.verifactuChainHash ?? "").join("");
  const hash = await sha256(content);
  localStorage.setItem(INVOICE_INTEGRITY_KEY, hash);
}

/** Verifica que el hash de integridad del conjunto de facturas es correcto */
export async function verifyIntegrity(
  invoices: InvoiceRecord[],
): Promise<boolean> {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(INVOICE_INTEGRITY_KEY);
  if (!stored) return invoices.length === 0;
  const content = invoices.map((inv) => inv.verifactuChainHash ?? "").join("");
  const expected = await sha256(content);
  return stored === expected;
}

/**
 * Resultado de la verificación profunda por factura.
 */
export interface DeepIntegrityIssue {
  invoiceId: string;
  invoiceNumber: string;
  kind: "content_hash_mismatch" | "chain_hash_mismatch" | "triple_check_failed";
  detail: string;
}

/**
 * BLINDAJE PROFUNDO: recalcula el hash de contenido y el hash encadenado de
 * cada factura del libro y los compara con los hashes almacenados.
 *
 * Detecta tres tipos de corrupción posterior a la emisión:
 *  - content_hash_mismatch: alguien editó campos fiscales de una factura
 *  - chain_hash_mismatch:   se insertó/eliminó/reordenó una factura en el libro
 *  - triple_check_failed:   los totales no cuadran ni siquiera consigo mismos
 *
 * Se llama desde `invoiceRecovery.runScan()` (autopilot fiscal). No lanza —
 * devuelve la lista de issues para que el dashboard los presente.
 */
export async function verifyDeepIntegrity(
  invoices: InvoiceRecord[],
): Promise<DeepIntegrityIssue[]> {
  const issues: DeepIntegrityIssue[] = [];

  let prevChain: string | null = null;
  for (const inv of invoices) {
    // 1. Triple check (vuelve a correr la misma comprobación que bloquea saveInvoice)
    const check = tripleCheckInvoice(inv);
    if (!check.allMatch) {
      issues.push({
        invoiceId: inv.invoiceId,
        invoiceNumber: inv.invoiceNumber,
        kind: "triple_check_failed",
        detail: check.discrepancies.join(" | "),
      });
    }

    // 2. Hash de contenido — se recalcula desde los campos y se compara con
    //    el almacenado. Si difiere → alguien editó la factura tras emitirla.
    if (inv.verifactuHash) {
      const expectedHash = await generateInvoiceHash(inv);
      if (expectedHash !== inv.verifactuHash) {
        issues.push({
          invoiceId: inv.invoiceId,
          invoiceNumber: inv.invoiceNumber,
          kind: "content_hash_mismatch",
          detail: `hash recalculado ${expectedHash.slice(0, 12)}… ≠ almacenado ${inv.verifactuHash.slice(0, 12)}…`,
        });
      }
    }

    // 3. Hash encadenado — debe ser SHA-256(hashActual + hashAnteriorDelLibro).
    if (inv.verifactuHash && inv.verifactuChainHash) {
      const expectedChain = await chainInvoiceHash(inv.verifactuHash, prevChain);
      if (expectedChain !== inv.verifactuChainHash) {
        issues.push({
          invoiceId: inv.invoiceId,
          invoiceNumber: inv.invoiceNumber,
          kind: "chain_hash_mismatch",
          detail: `cadena esperada ${expectedChain.slice(0, 12)}… ≠ almacenada ${inv.verifactuChainHash.slice(0, 12)}…`,
        });
      }
    }

    prevChain = inv.verifactuChainHash ?? prevChain;
  }

  return issues;
}

function getLastChainHash(): string | null {
  const invoices = loadInvoices();
  if (invoices.length === 0) return null;
  const last = invoices[invoices.length - 1];
  return last.verifactuChainHash;
}

// ─── Utilidades internas ─────────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateId(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatDateForHash(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// roundTo2 ahora se importa de @/lib/money (big.js-based, precisión exacta).

function deserializeDates(inv: InvoiceRecord): InvoiceRecord {
  return {
    ...inv,
    invoiceDate: new Date(inv.invoiceDate),
    operationDate: new Date(inv.operationDate),
    paymentDate: inv.paymentDate ? new Date(inv.paymentDate) : null,
    verifactuTimestamp: inv.verifactuTimestamp
      ? new Date(inv.verifactuTimestamp)
      : null,
    createdAt: new Date(inv.createdAt),
    updatedAt: new Date(inv.updatedAt),
    auditLog: inv.auditLog.map((e) => ({
      ...e,
      timestamp: new Date(e.timestamp),
    })),
  };
}
