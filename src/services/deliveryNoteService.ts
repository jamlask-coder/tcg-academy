/**
 * Servicio de albaranes (delivery notes).
 *
 * Albaranes != facturas. Son documentos de entrega que:
 *  - NO entran en la cadena VeriFactu (sin hash encadenado SHA-256).
 *  - NO aparecen en el Libro de Facturas ni en los modelos 303/390/349.
 *  - NO generan asiento contable.
 *
 * Si posteriormente se factura un albarán, `convertToInvoice()` llama al
 * servicio canónico `createInvoice()` — solo entonces se dispara todo el
 * pipeline fiscal (cadena VeriFactu, libro, asiento). El albarán original
 * queda marcado con `invoiceId` / `invoiceNumber` para trazabilidad.
 */

import type {
  DeliveryNoteRecord,
  InvoiceLineItem,
  CompanyData,
  CustomerData,
  InvoiceRecord,
  PaymentMethod,
} from "@/types/fiscal";
import {
  DeliveryNoteStatus,
  AuditAction,
} from "@/types/fiscal";
import {
  buildIssuer,
  calculateTotals,
  createInvoice,
  saveInvoice,
} from "@/services/invoiceService";
import { calculateTaxBreakdown } from "@/services/taxService";
import { DataHub } from "@/lib/dataHub";

// ─── Storage keys ────────────────────────────────────────────────────────────

const STORAGE_KEY = "tcgacademy_delivery_notes";
const COUNTER_KEY = "tcgacademy_delivery_note_counter";

// ─── Numeración correlativa ALB-YYYY-NNNN ────────────────────────────────────

function bumpCounter(year: number): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = localStorage.getItem(COUNTER_KEY);
    const obj = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    const next = (obj[String(year)] ?? 0) + 1;
    obj[String(year)] = next;
    localStorage.setItem(COUNTER_KEY, JSON.stringify(obj));
    return next;
  } catch {
    return 1;
  }
}

/**
 * Genera un número de albarán correlativo anual: `ALB-YYYY-NNNN`.
 * La serie es independiente de la de facturas — un mismo día puede
 * haber FAC-2026-00123E y ALB-2026-0042 sin relación.
 */
export function generateDeliveryNoteNumber(date: Date = new Date()): string {
  const year = date.getFullYear();
  const n = bumpCounter(year);
  return `ALB-${year}-${String(n).padStart(4, "0")}`;
}

// ─── ID generator ────────────────────────────────────────────────────────────

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `dn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export function loadDeliveryNotes(): DeliveryNoteRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DeliveryNoteRecord[];
    // Revivir fechas — JSON.parse las deja como strings
    return parsed.map((d) => ({
      ...d,
      deliveryNoteDate: new Date(d.deliveryNoteDate),
      operationDate: new Date(d.operationDate),
      paymentDate: d.paymentDate ? new Date(d.paymentDate) : null,
      invoicedAt: d.invoicedAt ? new Date(d.invoicedAt) : null,
      createdAt: new Date(d.createdAt),
      updatedAt: new Date(d.updatedAt),
      auditLog: (d.auditLog ?? []).map((a) => ({
        ...a,
        timestamp: new Date(a.timestamp),
      })),
    }));
  } catch {
    return [];
  }
}

export function getDeliveryNoteById(id: string): DeliveryNoteRecord | null {
  return loadDeliveryNotes().find((d) => d.deliveryNoteId === id) ?? null;
}

function persist(list: DeliveryNoteRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  DataHub.emit("deliveryNotes");
}

// ─── Create ──────────────────────────────────────────────────────────────────

export interface CreateDeliveryNoteParams {
  recipient: CompanyData | CustomerData;
  items: InvoiceLineItem[];
  paymentMethod: PaymentMethod;
  sourceOrderId?: string;
  deliveryNoteDate?: Date;
  operationDate?: Date;
}

/**
 * Crea un albarán y lo persiste. NO llama a VeriFactu, NO crea asiento,
 * NO entra en el libro de facturas.
 */
export function createDeliveryNote(
  params: CreateDeliveryNoteParams,
): DeliveryNoteRecord {
  const {
    recipient,
    items,
    paymentMethod,
    sourceOrderId,
    deliveryNoteDate = new Date(),
    operationDate,
  } = params;

  const deliveryNoteNumber = generateDeliveryNoteNumber(deliveryNoteDate);
  const deliveryNoteId = generateId();
  const taxBreakdown = calculateTaxBreakdown(items);
  const totals = calculateTotals(items);

  const record: DeliveryNoteRecord = {
    deliveryNoteId,
    deliveryNoteNumber,
    deliveryNoteDate,
    operationDate: operationDate ?? deliveryNoteDate,
    issuer: buildIssuer(),
    recipient,
    items,
    taxBreakdown,
    totals,
    paymentMethod,
    paymentDate: new Date(),
    status: DeliveryNoteStatus.PENDIENTE,
    sourceOrderId: sourceOrderId ?? null,
    invoiceId: null,
    invoiceNumber: null,
    invoicedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    auditLog: [
      {
        timestamp: new Date(),
        userId: "system",
        userName: "Sistema",
        action: AuditAction.CREADA,
        detail: `Albarán ${deliveryNoteNumber} creado`,
      },
    ],
    metadata: {},
  };

  const list = loadDeliveryNotes();
  list.push(record);
  persist(list);
  return record;
}

// ─── Conversion to invoice ────────────────────────────────────────────────────

/**
 * Convierte un albarán pendiente en una factura real.
 *
 * - Llama a `createInvoice()` (cadena VeriFactu completa: hash, encadenamiento, QR).
 * - Llama a `saveInvoice()` para persistir en el libro y disparar efectos.
 * - Marca el albarán original como FACTURADO con el id/número de la nueva factura.
 *
 * Lanza si el albarán no está PENDIENTE (ya facturado o anulado).
 */
export async function convertToInvoice(
  deliveryNoteId: string,
): Promise<InvoiceRecord> {
  const list = loadDeliveryNotes();
  const idx = list.findIndex((d) => d.deliveryNoteId === deliveryNoteId);
  if (idx === -1) {
    throw new Error(`Albarán ${deliveryNoteId} no encontrado`);
  }
  const dn = list[idx];
  if (dn.status !== DeliveryNoteStatus.PENDIENTE) {
    throw new Error(
      `El albarán ${dn.deliveryNoteNumber} ya está en estado "${dn.status}" y no puede facturarse.`,
    );
  }

  const invoice = await createInvoice({
    recipient: dn.recipient,
    items: dn.items,
    paymentMethod: dn.paymentMethod,
    sourceOrderId: dn.sourceOrderId ?? undefined,
  });
  saveInvoice(invoice);

  const updated: DeliveryNoteRecord = {
    ...dn,
    status: DeliveryNoteStatus.FACTURADO,
    invoiceId: invoice.invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    invoicedAt: new Date(),
    updatedAt: new Date(),
    auditLog: [
      ...dn.auditLog,
      {
        timestamp: new Date(),
        userId: "admin",
        userName: "Admin",
        action: AuditAction.MIGRADA,
        detail: `Albarán convertido en factura ${invoice.invoiceNumber}`,
      },
    ],
  };
  list[idx] = updated;
  persist(list);
  return invoice;
}

/** Anular albarán (no se puede facturar ya). */
export function annulDeliveryNote(deliveryNoteId: string, reason = ""): void {
  const list = loadDeliveryNotes();
  const idx = list.findIndex((d) => d.deliveryNoteId === deliveryNoteId);
  if (idx === -1) throw new Error(`Albarán ${deliveryNoteId} no encontrado`);
  const dn = list[idx];
  if (dn.status === DeliveryNoteStatus.FACTURADO) {
    throw new Error(
      `No se puede anular el albarán ${dn.deliveryNoteNumber} porque ya ha sido facturado (${dn.invoiceNumber}). Anula la factura en su lugar.`,
    );
  }
  list[idx] = {
    ...dn,
    status: DeliveryNoteStatus.ANULADO,
    updatedAt: new Date(),
    auditLog: [
      ...dn.auditLog,
      {
        timestamp: new Date(),
        userId: "admin",
        userName: "Admin",
        action: AuditAction.ANULADA,
        detail: reason || "Albarán anulado",
      },
    ],
  };
  persist(list);
}
