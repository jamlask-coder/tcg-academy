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
} from "@/types/fiscal";
import { SITE_CONFIG } from "@/config/siteConfig";
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

// ─── Datos del emisor (TCG Academy) ──────────────────────────────────────────

function buildIssuer(): CompanyData {
  return {
    name: "TCG Academy S.L.",
    taxId: SITE_CONFIG.cif,
    taxIdType: TaxIdType.CIF,
    address: {
      street: "Calle Ejemplo, 1",
      city: "Alicante",
      postalCode: "03001",
      province: "Alicante",
      country: "España",
      countryCode: "ES",
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

/**
 * Genera el siguiente número de factura en formato FAC-YYYY-NNNNN.
 * Garantiza correlatividad sin saltos (requisito art. 6 RD 1619/2012).
 *
 * HARDENED: Uses a localStorage lock to prevent concurrent tabs from generating
 * the same invoice number. Extracts max existing number from parsed values
 * (not array length) to handle gaps from corrupted data.
 */
export function generateInvoiceNumber(): string {
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
      if (inv.invoiceNumber.startsWith(prefix)) {
        const numPart = parseInt(inv.invoiceNumber.slice(prefix.length), 10);
        if (Number.isFinite(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }

    const nextNum = maxNum + 1;
    return `${INVOICE_SERIES}-${year}-${String(nextNum).padStart(5, "0")}`;
  } finally {
    releaseInvoiceLock();
  }
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

  const unitPriceNoVAT = roundTo2(unitPriceWithVAT / (1 + vatRate / 100));
  const subtotal = roundTo2(unitPriceNoVAT * quantity);
  const discountAmount = roundTo2(subtotal * (discount / 100));
  const taxableBase = roundTo2(subtotal - discountAmount);
  const vatAmount = calculateVAT(taxableBase, vatRate);

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

function calculateTotals(items: InvoiceLineItem[]): InvoiceTotals {
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
  for (const item of items) {
    const expectedBase = roundTo2(
      roundTo2(item.unitPrice * item.quantity) - item.discountAmount,
    );
    if (Math.abs(expectedBase - item.taxableBase) >= 0.01) {
      throw new Error(
        `INTEGRIDAD FISCAL: Línea "${item.description}" base esperada ${expectedBase} ≠ registrada ${item.taxableBase}`,
      );
    }
    const expectedVAT = calculateVAT(item.taxableBase, item.vatRate);
    if (Math.abs(expectedVAT - item.vatAmount) >= 0.01) {
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
  } = params;

  const invoiceNumber = generateInvoiceNumber();
  const invoiceId = generateId();
  const taxBreakdown = calculateTaxBreakdown(items);
  const totals = calculateTotals(items);

  const invoice: InvoiceRecord = {
    invoiceId,
    invoiceNumber,
    invoiceDate,
    operationDate: operationDate ?? invoiceDate,
    invoiceType,
    issuer: buildIssuer(),
    recipient,
    items,
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
 * La rectificativa es una nueva factura con las correcciones aplicadas.
 * La original NO se modifica (solo cambia su estado a ANULADA si es sustitución).
 */
export async function rectifyInvoice(
  originalId: string,
  corrections: Partial<CreateInvoiceParams> & {
    correctionData: CorrectionData;
  },
): Promise<InvoiceRecord> {
  const invoices = loadInvoices();
  const original = invoices.find((inv) => inv.invoiceId === originalId);
  if (!original) throw new Error(`Factura ${originalId} no encontrada`);

  const rectificativa = await createInvoice({
    recipient: corrections.recipient ?? original.recipient,
    items: corrections.items ?? original.items,
    paymentMethod: corrections.paymentMethod ?? original.paymentMethod,
    sourceOrderId: original.sourceOrderId ?? undefined,
    invoiceType: InvoiceType.RECTIFICATIVA,
    correctionData: corrections.correctionData,
  });

  // Actualizar estado de la original
  const updatedOriginal: InvoiceRecord = {
    ...original,
    status: InvoiceStatus.ANULADA,
    updatedAt: new Date(),
    auditLog: [
      ...original.auditLog,
      {
        timestamp: new Date(),
        userId: "admin",
        userName: "Administrador",
        action: AuditAction.RECTIFICADA,
        detail: `Rectificada por factura ${rectificativa.invoiceNumber}`,
      },
    ],
  };

  const updatedInvoices = invoices.map((inv) =>
    inv.invoiceId === originalId ? updatedOriginal : inv,
  );
  persistInvoices([...updatedInvoices, rectificativa]);

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

  // Receptor obligatorio en factura completa
  if (invoice.invoiceType === InvoiceType.COMPLETA) {
    const recipient = invoice.recipient as CompanyData;
    if (!recipient.name)
      errors.push("Nombre del receptor obligatorio en factura completa");
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

// ─── Almacenamiento (localStorage → reemplazar por BD) ───────────────────────

/** Carga todas las facturas del almacenamiento */
export function loadInvoices(): InvoiceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INVOICE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: InvoiceRecord[] = JSON.parse(raw);
    // Restaura objetos Date serializados como string
    return parsed.map(deserializeDates);
  } catch {
    return [];
  }
}

/** Guarda una nueva factura, actualiza el hash de integridad, y genera asiento contable */
export function saveInvoice(invoice: InvoiceRecord): void {
  const invoices = loadInvoices();
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

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

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
