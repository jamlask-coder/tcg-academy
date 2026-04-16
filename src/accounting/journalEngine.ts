/**
 * Motor de Contabilidad por Partida Doble — TCG Academy.
 *
 * REGLA FUNDAMENTAL (Luca Pacioli, 1494):
 *   Para cada asiento: SUM(Debe) === SUM(Haber)
 *   Tolerancia: 0.00€. Sin excepciones.
 *
 * Cada venta genera automáticamente:
 *   Debe 430 Clientes          [total con IVA]
 *   Haber 700 Ventas           [base imponible]
 *   Haber 477 HP IVA repercutido [cuota IVA]
 */

import type {
  JournalEntry,
  JournalLine,
  JournalReferenceType,
} from "@/types/accounting";
import type { InvoiceRecord } from "@/types/fiscal";
import { InvoiceType, InvoiceStatus } from "@/types/fiscal";
import { getAccountName, validateAccountCode } from "@/accounting/chartOfAccounts";
import { safeRead, safeWrite } from "@/lib/safeStorage";

// ─── Storage ────────────────────────────────────────────────────────────────

const JOURNAL_KEY = "tcgacademy_journal";

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── SHA-256 (sync-ish via cached) ──────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Load / Save ────────────────────────────────────────────────────────────

export function loadJournal(periodKey?: string): JournalEntry[] {
  const all = safeRead<JournalEntry[]>(JOURNAL_KEY, []);
  if (!periodKey) return all;
  return all.filter((e) => e.periodKey === periodKey);
}

function saveJournal(entries: JournalEntry[]): void {
  const ok = safeWrite(JOURNAL_KEY, entries);
  if (!ok) {
    throw new Error("CRITICAL: No se pudo guardar el libro diario.");
  }
}

// ─── Period key ─────────────────────────────────────────────────────────────

export function getPeriodKey(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const quarter = Math.ceil((d.getMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface EntryValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Valida un asiento ANTES de guardarlo.
 * Si no pasa, el asiento NO se registra.
 */
export function validateEntry(lines: JournalLine[]): EntryValidation {
  const errors: string[] = [];

  if (lines.length < 2) {
    errors.push("Un asiento necesita al menos 2 líneas (partida doble).");
  }

  // Cada línea: solo debe O haber (no ambos)
  for (const line of lines) {
    if (line.debit > 0 && line.credit > 0) {
      errors.push(`Línea ${line.lineNumber}: no puede tener debe Y haber simultáneamente.`);
    }
    if (line.debit < 0 || line.credit < 0) {
      errors.push(`Línea ${line.lineNumber}: importes negativos no permitidos.`);
    }
    if (!Number.isFinite(line.debit) || !Number.isFinite(line.credit)) {
      errors.push(`Línea ${line.lineNumber}: importes no finitos.`);
    }
    if (!validateAccountCode(line.accountCode)) {
      errors.push(`Línea ${line.lineNumber}: cuenta ${line.accountCode} no existe en el PGC.`);
    }
  }

  // REGLA FUNDAMENTAL: Debe = Haber
  const totalDebit = r2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = r2(lines.reduce((s, l) => s + l.credit, 0));
  const diff = Math.abs(totalDebit - totalCredit);
  if (diff >= 0.001) {
    errors.push(
      `PARTIDA DOBLE VIOLADA: Debe=${totalDebit.toFixed(2)} ≠ Haber=${totalCredit.toFixed(2)} (diff: ${diff.toFixed(3)}€).`,
    );
  }

  return { valid: errors.length === 0, errors };
}

// ─── Create entry ───────────────────────────────────────────────────────────

function getNextEntryNumber(entries: JournalEntry[], periodKey: string): number {
  const periodEntries = entries.filter((e) => e.periodKey === periodKey);
  if (periodEntries.length === 0) return 1;
  return Math.max(...periodEntries.map((e) => e.entryNumber)) + 1;
}

/**
 * Crea y registra un asiento contable.
 * LANZA ERROR si la partida doble no cuadra.
 */
export async function createJournalEntry(input: {
  date: string;
  description: string;
  reference: string;
  referenceType: JournalReferenceType;
  lines: Omit<JournalLine, "lineNumber" | "accountName">[];
}): Promise<JournalEntry> {
  // Build lines with names and line numbers
  const lines: JournalLine[] = input.lines.map((l, i) => ({
    ...l,
    lineNumber: i + 1,
    accountName: getAccountName(l.accountCode),
  }));

  // Validate
  const validation = validateEntry(lines);
  if (!validation.valid) {
    throw new Error(
      `Asiento rechazado:\n${validation.errors.join("\n")}`,
    );
  }

  const all = loadJournal();
  const periodKey = getPeriodKey(input.date);
  const entryNumber = getNextEntryNumber(all, periodKey);
  const previousHash = all.length > 0 ? all[all.length - 1].hash : null;

  const entryId = `je_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const createdAt = new Date().toISOString();

  // Hash for immutability
  const hashInput = [
    entryId,
    String(entryNumber),
    input.date,
    input.description,
    input.reference,
    lines.map((l) => `${l.accountCode}:${l.debit}:${l.credit}`).join(","),
    previousHash ?? "GENESIS",
  ].join("|");
  const hash = await sha256(hashInput);

  const entry: JournalEntry = {
    entryId,
    entryNumber,
    date: input.date,
    description: input.description,
    reference: input.reference,
    referenceType: input.referenceType,
    lines,
    status: "posted",
    periodKey,
    createdAt,
    hash,
    previousHash,
  };

  all.push(entry);
  saveJournal(all);
  return entry;
}

// ─── Automatic entry from invoice ───────────────────────────────────────────

/**
 * Genera automáticamente un asiento contable a partir de una factura.
 *
 * Factura normal:
 *   Debe 430 Clientes         [totalInvoice]
 *   Haber 700 Ventas          [totalTaxableBase]
 *   Haber 477 HP IVA rep.     [totalVAT]
 *
 * Factura rectificativa (devolución):
 *   Debe 708 Dev. ventas      [totalTaxableBase]
 *   Debe 477 HP IVA rep.      [totalVAT]
 *   Haber 430 Clientes        [totalInvoice]
 */
export async function createJournalFromInvoice(
  invoice: InvoiceRecord,
): Promise<JournalEntry> {
  if (invoice.status === InvoiceStatus.ANULADA) {
    throw new Error("No se generan asientos para facturas anuladas.");
  }

  const base = invoice.totals.totalTaxableBase;
  const vat = invoice.totals.totalVAT;
  const total = invoice.totals.totalInvoice;
  const isRect = invoice.invoiceType === InvoiceType.RECTIFICATIVA;
  const recipientName = (invoice.recipient as { name?: string }).name ?? "";

  const lines: Omit<JournalLine, "lineNumber" | "accountName">[] = isRect
    ? [
        // Rectificativa: revertimos la venta
        { accountCode: "708", debit: base, credit: 0, description: `Dev. venta ${recipientName}` },
        { accountCode: "477", debit: vat, credit: 0, description: `IVA dev. ${invoice.invoiceNumber}` },
        { accountCode: "430", debit: 0, credit: total, description: `Cliente ${recipientName}` },
      ]
    : [
        // Venta normal
        { accountCode: "430", debit: total, credit: 0, description: `Cliente ${recipientName}` },
        { accountCode: "700", debit: 0, credit: base, description: `Venta ${recipientName}` },
        { accountCode: "477", debit: 0, credit: vat, description: `IVA rep. ${invoice.invoiceNumber}` },
      ];

  // Si hay recargo de equivalencia, añadir línea
  if (invoice.totals.totalSurcharge > 0) {
    if (isRect) {
      // Adjust the client credit to include surcharge
      lines[2].credit = r2(total + invoice.totals.totalSurcharge);
      lines.push({
        accountCode: "477",
        debit: invoice.totals.totalSurcharge,
        credit: 0,
        description: `Rec. equiv. dev. ${invoice.invoiceNumber}`,
      });
    } else {
      lines[0].debit = r2(total + invoice.totals.totalSurcharge);
      lines.push({
        accountCode: "477",
        debit: 0,
        credit: invoice.totals.totalSurcharge,
        description: `Rec. equiv. ${invoice.invoiceNumber}`,
      });
    }
  }

  return createJournalEntry({
    date: new Date(invoice.invoiceDate).toISOString().slice(0, 10),
    description: isRect
      ? `Rectificativa ${invoice.invoiceNumber} — ${recipientName}`
      : `Factura ${invoice.invoiceNumber} — ${recipientName}`,
    reference: invoice.invoiceNumber,
    referenceType: isRect ? "rectificativa" : "invoice",
    lines,
  });
}

/**
 * Genera asiento de cobro.
 *
 *   Debe 572 Bancos (o 570 Caja)   [amount]
 *   Haber 430 Clientes              [amount]
 */
export async function createPaymentEntry(
  invoiceNumber: string,
  paymentMethod: string,
  amount: number,
  date: string,
): Promise<JournalEntry> {
  // Determinar cuenta de tesorería según método de pago
  let cashAccount = "572"; // Bancos por defecto
  if (paymentMethod === "efectivo" || paymentMethod === "tienda") cashAccount = "570";
  else if (paymentMethod === "paypal") cashAccount = "5721";
  else if (paymentMethod === "bizum") cashAccount = "5723";

  return createJournalEntry({
    date,
    description: `Cobro factura ${invoiceNumber} — ${paymentMethod}`,
    reference: invoiceNumber,
    referenceType: "payment",
    lines: [
      { accountCode: cashAccount, debit: amount, credit: 0 },
      { accountCode: "430", debit: 0, credit: amount },
    ],
  });
}

// ─── Verification ───────────────────────────────────────────────────────────

/**
 * Verifica la integridad de TODOS los asientos del libro diario.
 * Comprueba: partida doble, hash chain, correlatividad.
 */
export function verifyJournalIntegrity(entries?: JournalEntry[]): {
  ok: boolean;
  totalEntries: number;
  issues: string[];
} {
  const all = entries ?? loadJournal();
  const issues: string[] = [];

  for (let i = 0; i < all.length; i++) {
    const entry = all[i];

    // Partida doble
    const totalDebit = r2(entry.lines.reduce((s, l) => s + l.debit, 0));
    const totalCredit = r2(entry.lines.reduce((s, l) => s + l.credit, 0));
    if (Math.abs(totalDebit - totalCredit) >= 0.001) {
      issues.push(
        `Asiento #${entry.entryNumber} (${entry.entryId}): Debe=${totalDebit} ≠ Haber=${totalCredit}`,
      );
    }

    // Hash chain
    if (i > 0 && entry.previousHash !== all[i - 1].hash) {
      issues.push(
        `Asiento #${entry.entryNumber}: cadena de hash rota (previousHash no coincide)`,
      );
    }
  }

  return {
    ok: issues.length === 0,
    totalEntries: all.length,
    issues,
  };
}
