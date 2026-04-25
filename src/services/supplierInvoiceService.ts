/**
 * Supplier invoice service — Libro registro de facturas RECIBIDAS.
 * ================================================================
 *
 * Servicio canónico para registrar las compras de TCG Academy:
 *  - mercadería (sobres, displays, cartas en re-venta) → IVA soportado deducible
 *  - alquiler local físico → genera retención Modelo 115
 *  - servicios profesionales (gestoría, abogados) → genera retención Modelo 111
 *  - suministros, transporte, marketing, oficina, amortizables → P&G
 *
 * Alimenta:
 *  - Modelo 303 (IVA soportado, casillas 28-39) y 390 (resumen anual)
 *  - Modelo 347 (operaciones >3.005,06€/año por proveedor)
 *  - Modelo 111/115 (retenciones practicadas)
 *  - Cuenta de pérdidas y ganancias (gastos deducibles para Modelo 200/202)
 *
 * Único punto de escritura. NO tocar `tcgacademy_supplier_invoices` desde
 * fuera de este archivo — los listeners de DataHub se romperían.
 */

import { DataHub } from "@/lib/dataHub";
import { safeRead, safeWrite } from "@/lib/safeStorage";
import {
  SupplierInvoiceStatus,
  type SupplierInvoiceRecord,
  type SupplierInvoiceLine,
  type SupplierInvoiceCategory,
  type CompanyData,
  type PaymentMethod,
} from "@/types/fiscal";

const KEY = "tcgacademy_supplier_invoices";
const MAX = 5000;

// ── Storage ────────────────────────────────────────────────────────────────

export function loadSupplierInvoices(): SupplierInvoiceRecord[] {
  return safeRead<SupplierInvoiceRecord[]>(KEY, []);
}

function persist(list: SupplierInvoiceRecord[]): void {
  const trimmed = list.length > MAX ? list.slice(0, MAX) : list;
  safeWrite(KEY, trimmed);
  DataHub.emit("supplierInvoices");
}

// ── Helpers ────────────────────────────────────────────────────────────────

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Recalcula totales de una línea para mantener invariantes:
 *   vatAmount = base × vatRate%
 *   deductibleVAT = vatAmount × deductiblePct%
 *   retentionAmount = base × retentionPct%
 *   totalLine = base + vatAmount − retentionAmount
 */
export function recomputeLine(line: SupplierInvoiceLine): SupplierInvoiceLine {
  const base = roundTo2(line.taxableBase);
  const vatAmount = roundTo2((base * line.vatRate) / 100);
  const deductibleVAT = roundTo2((vatAmount * line.deductiblePct) / 100);
  const retentionAmount = roundTo2((base * line.retentionPct) / 100);
  const totalLine = roundTo2(base + vatAmount - retentionAmount);
  return {
    ...line,
    taxableBase: base,
    vatAmount,
    deductibleVAT,
    retentionAmount,
    totalLine,
  };
}

/**
 * Recalcula los totales globales de una factura a partir de sus líneas.
 * Llamar siempre antes de persistir para evitar drift base/IVA/total.
 */
export function recomputeTotals(
  partial: Pick<SupplierInvoiceRecord, "lines"> &
    Partial<SupplierInvoiceRecord>,
): {
  totalTaxableBase: number;
  totalVAT: number;
  totalDeductibleVAT: number;
  totalRetention: number;
  totalInvoice: number;
  lines: SupplierInvoiceLine[];
} {
  const lines = partial.lines.map(recomputeLine);
  const totalTaxableBase = roundTo2(
    lines.reduce((s, l) => s + l.taxableBase, 0),
  );
  const totalVAT = roundTo2(lines.reduce((s, l) => s + l.vatAmount, 0));
  const totalDeductibleVAT = roundTo2(
    lines.reduce((s, l) => s + l.deductibleVAT, 0),
  );
  const totalRetention = roundTo2(
    lines.reduce((s, l) => s + l.retentionAmount, 0),
  );
  const totalInvoice = roundTo2(totalTaxableBase + totalVAT - totalRetention);
  return {
    lines,
    totalTaxableBase,
    totalVAT,
    totalDeductibleVAT,
    totalRetention,
    totalInvoice,
  };
}

// ── CRUD ───────────────────────────────────────────────────────────────────

export interface CreateSupplierInvoiceInput {
  supplierInvoiceNumber: string;
  invoiceDate: string;
  receivedDate?: string;
  supplier: CompanyData;
  category: SupplierInvoiceCategory;
  lines: SupplierInvoiceLine[];
  paymentMethod?: PaymentMethod | null;
  paymentDate?: string | null;
  status?: SupplierInvoiceStatus;
  notes?: string;
}

export function addSupplierInvoice(
  input: CreateSupplierInvoiceInput,
): SupplierInvoiceRecord {
  const now = new Date().toISOString();
  const totals = recomputeTotals({ lines: input.lines });
  const record: SupplierInvoiceRecord = {
    id: `si_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    supplierInvoiceNumber: input.supplierInvoiceNumber.trim(),
    invoiceDate: input.invoiceDate,
    receivedDate: input.receivedDate ?? now.slice(0, 10),
    supplier: input.supplier,
    category: input.category,
    lines: totals.lines,
    totalTaxableBase: totals.totalTaxableBase,
    totalVAT: totals.totalVAT,
    totalDeductibleVAT: totals.totalDeductibleVAT,
    totalRetention: totals.totalRetention,
    totalInvoice: totals.totalInvoice,
    status: input.status ?? SupplierInvoiceStatus.PENDIENTE,
    paymentMethod: input.paymentMethod ?? null,
    paymentDate: input.paymentDate ?? null,
    notes: input.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };
  const list = loadSupplierInvoices();
  list.unshift(record);
  persist(list);
  return record;
}

export function updateSupplierInvoice(
  id: string,
  patch: Partial<SupplierInvoiceRecord>,
): SupplierInvoiceRecord | null {
  const list = loadSupplierInvoices();
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  const merged: SupplierInvoiceRecord = {
    ...list[idx],
    ...patch,
    id: list[idx].id, // id inmutable
    createdAt: list[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  // Si han tocado las líneas, recalcular totales
  if (patch.lines) {
    const totals = recomputeTotals({ lines: patch.lines });
    Object.assign(merged, totals);
  }
  list[idx] = merged;
  persist(list);
  return merged;
}

export function markAsPaid(
  id: string,
  paymentMethod: PaymentMethod,
  paymentDate?: string,
): SupplierInvoiceRecord | null {
  return updateSupplierInvoice(id, {
    status: SupplierInvoiceStatus.PAGADA,
    paymentMethod,
    paymentDate: paymentDate ?? new Date().toISOString().slice(0, 10),
  });
}

export function deleteSupplierInvoice(id: string): boolean {
  const list = loadSupplierInvoices();
  const next = list.filter((s) => s.id !== id);
  if (next.length === list.length) return false;
  persist(next);
  return true;
}

export function getSupplierInvoiceById(
  id: string,
): SupplierInvoiceRecord | undefined {
  return loadSupplierInvoices().find((s) => s.id === id);
}

// ── Queries para reportes fiscales ────────────────────────────────────────

/** Filtra facturas que caen dentro de un trimestre concreto */
export function getSupplierInvoicesByQuarter(
  year: number,
  quarter: 1 | 2 | 3 | 4,
): SupplierInvoiceRecord[] {
  const startMonth = (quarter - 1) * 3;
  const endMonth = startMonth + 3;
  return loadSupplierInvoices().filter((s) => {
    if (s.status === SupplierInvoiceStatus.DISPUTADA) return false;
    const d = new Date(s.invoiceDate);
    return (
      d.getFullYear() === year &&
      d.getMonth() >= startMonth &&
      d.getMonth() < endMonth
    );
  });
}

/** Filtra facturas dentro de un año natural */
export function getSupplierInvoicesByYear(
  year: number,
): SupplierInvoiceRecord[] {
  return loadSupplierInvoices().filter((s) => {
    if (s.status === SupplierInvoiceStatus.DISPUTADA) return false;
    return new Date(s.invoiceDate).getFullYear() === year;
  });
}

/**
 * Agrupa el IVA soportado por tipo (21/10/4/0) para un período dado.
 * Estructura compatible con InputVATBreakdown que consume taxService.
 */
export function getInputVATBreakdown(
  invoices: SupplierInvoiceRecord[],
): {
  vatRate: number;
  taxableBase: number;
  vatAmount: number;
  deductiblePct: number;
  deductibleAmount: number;
}[] {
  const map = new Map<
    number,
    { taxableBase: number; vatAmount: number; deductibleAmount: number }
  >();
  for (const inv of invoices) {
    for (const line of inv.lines) {
      const cur = map.get(line.vatRate) ?? {
        taxableBase: 0,
        vatAmount: 0,
        deductibleAmount: 0,
      };
      cur.taxableBase = roundTo2(cur.taxableBase + line.taxableBase);
      cur.vatAmount = roundTo2(cur.vatAmount + line.vatAmount);
      cur.deductibleAmount = roundTo2(
        cur.deductibleAmount + line.deductibleVAT,
      );
      map.set(line.vatRate, cur);
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b - a)
    .map(([rate, v]) => ({
      vatRate: rate,
      taxableBase: v.taxableBase,
      vatAmount: v.vatAmount,
      deductiblePct: v.vatAmount > 0 ? roundTo2((v.deductibleAmount / v.vatAmount) * 100) : 100,
      deductibleAmount: v.deductibleAmount,
    }));
}

/**
 * Suma total del IVA soportado deducible para un trimestre — atajo para
 * Modelo 303.
 */
export function getDeductibleVATForQuarter(
  year: number,
  quarter: 1 | 2 | 3 | 4,
): number {
  return getSupplierInvoicesByQuarter(year, quarter).reduce(
    (s, inv) => s + inv.totalDeductibleVAT,
    0,
  );
}

/** Suma total del IVA soportado deducible anual — atajo para Modelo 390. */
export function getDeductibleVATForYear(year: number): number {
  return getSupplierInvoicesByYear(year).reduce(
    (s, inv) => s + inv.totalDeductibleVAT,
    0,
  );
}

/**
 * Suma de retenciones IRPF practicadas en un trimestre.
 * - retentionPct = 15% (servicios profesionales) → Modelo 111
 * - retentionPct = 19% (alquileres) → Modelo 115
 * Discriminamos por categoría — la retención de "servicios_profesionales" va
 * al 111 y la de "alquiler" al 115.
 */
export function getRetentionsForQuarter(
  year: number,
  quarter: 1 | 2 | 3 | 4,
): { mod111: number; mod115: number } {
  const list = getSupplierInvoicesByQuarter(year, quarter);
  let mod111 = 0;
  let mod115 = 0;
  for (const inv of list) {
    if (inv.totalRetention === 0) continue;
    if (inv.category === "alquiler") {
      mod115 = roundTo2(mod115 + inv.totalRetention);
    } else if (inv.category === "servicios_profesionales") {
      mod111 = roundTo2(mod111 + inv.totalRetention);
    }
  }
  return { mod111, mod115 };
}
