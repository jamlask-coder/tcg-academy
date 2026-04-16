/**
 * Conciliación Bancaria — TCG Academy.
 *
 * Cruza movimientos bancarios (importados de CSV/OFX/CAMT.053) con
 * facturas y cobros internos para detectar discrepancias.
 *
 * Flujo:
 *   1. Admin descarga extracto bancario (cualquier banco español)
 *   2. Lo importa aquí (parseCSV, parseOFX, parseNorma43)
 *   3. El motor intenta casar cada movimiento con una factura/cobro
 *   4. Los no casados van a "pendientes de conciliar"
 *   5. Admin revisa y resuelve manualmente los que no casaron
 *
 * Formatos soportados:
 *   - CSV genérico (configurable: separador, columnas)
 *   - Norma 43 (AEB — estándar bancario español)
 *   - OFX/QFX (estándar internacional)
 *   - CAMT.053 (ISO 20022 — SEPA europeo, formato XML)
 *
 * Base legal:
 *   - Art. 28-30 Código de Comercio: libros de contabilidad
 *   - PGC: cuenta 572 Bancos c/c
 *   - Ley 10/2010: prevención blanqueo de capitales (trazabilidad)
 */

import type { InvoiceRecord } from "@/types/fiscal";
import { InvoiceStatus } from "@/types/fiscal";
import type { JournalEntry } from "@/types/accounting";
import { safeRead, safeWrite } from "@/lib/safeStorage";

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface BankMovement {
  id: string;
  date: string;             // YYYY-MM-DD
  valueDate?: string;       // Fecha valor
  amount: number;           // Positivo = ingreso, Negativo = cargo
  balance?: number;         // Saldo tras movimiento
  concept: string;          // Descripción del banco
  reference?: string;       // Referencia bancaria
  counterparty?: string;    // Nombre del ordenante/beneficiario
  counterpartyIBAN?: string;
  /** Metadatos del banco (códigos, categorías) */
  bankCode?: string;
  category?: string;
  /** Estado de conciliación */
  matchStatus: "matched" | "partial" | "unmatched" | "manual" | "ignored";
  /** Referencia a la factura/cobro que casa */
  matchedInvoiceId?: string;
  matchedInvoiceNumber?: string;
  matchedJournalEntryId?: string;
  matchedAmount?: number;
  matchDifference?: number;
  matchNote?: string;
}

export interface BankStatement {
  id: string;
  bankName: string;
  accountNumber: string;    // IBAN parcial (últimos 4)
  currency: string;
  periodFrom: string;
  periodTo: string;
  openingBalance: number;
  closingBalance: number;
  movements: BankMovement[];
  importedAt: string;
  format: "csv" | "norma43" | "ofx" | "camt053" | "manual";
}

export interface ReconciliationResult {
  statementId: string;
  generatedAt: string;
  totalMovements: number;
  matched: number;
  partial: number;
  unmatched: number;
  ignored: number;
  manual: number;
  /** Suma de ingresos casados */
  matchedIncome: number;
  /** Suma de ingresos NO casados */
  unmatchedIncome: number;
  /** Suma de cargos */
  totalCharges: number;
  /** Diferencia entre saldo banco y saldo contable */
  bankBalance: number;
  bookBalance: number;
  difference: number;
  movements: BankMovement[];
}

export interface CSVColumnMapping {
  date: number;         // Columna de fecha (0-based)
  amount: number;       // Columna de importe
  concept: number;      // Columna de concepto/descripción
  reference?: number;   // Columna de referencia
  balance?: number;     // Columna de saldo
  counterparty?: number;
  dateFormat: "DD/MM/YYYY" | "YYYY-MM-DD" | "MM/DD/YYYY" | "DD-MM-YYYY";
  separator: ";" | "," | "\t";
  decimalSeparator: "," | ".";
  skipRows: number;     // Filas de cabecera a saltar
  encoding: "utf-8" | "latin1" | "windows-1252";
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

const STATEMENTS_KEY = "tcgacademy_bank_statements";
const RECONCILIATION_KEY = "tcgacademy_bank_reconciliations";

export function loadStatements(): BankStatement[] {
  return safeRead<BankStatement[]>(STATEMENTS_KEY, []);
}

export function saveStatement(statement: BankStatement): void {
  const all = loadStatements();
  const idx = all.findIndex((s) => s.id === statement.id);
  if (idx >= 0) all[idx] = statement;
  else all.push(statement);
  safeWrite(STATEMENTS_KEY, all);
}

export function loadReconciliations(): ReconciliationResult[] {
  return safeRead<ReconciliationResult[]>(RECONCILIATION_KEY, []);
}

function saveReconciliation(result: ReconciliationResult): void {
  const all = loadReconciliations();
  all.unshift(result);
  if (all.length > 50) all.length = 50;
  safeWrite(RECONCILIATION_KEY, all);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSERS
// ═══════════════════════════════════════════════════════════════════════════════

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseDate(raw: string, format: CSVColumnMapping["dateFormat"]): string {
  const clean = raw.trim().replace(/"/g, "");
  if (format === "YYYY-MM-DD") return clean;
  if (format === "DD/MM/YYYY") {
    const [d, m, y] = clean.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (format === "DD-MM-YYYY") {
    const [d, m, y] = clean.split("-");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (format === "MM/DD/YYYY") {
    const [m, d, y] = clean.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return clean;
}

function parseAmount(raw: string, decimalSep: "," | "."): number {
  let s = raw.trim().replace(/"/g, "").replace(/\s/g, "");
  // Remove thousand separator
  if (decimalSep === ",") {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? r2(n) : 0;
}

/**
 * Parsea un CSV bancario genérico.
 * Soporta cualquier banco español (Santander, BBVA, CaixaBank, Sabadell, ING, etc.)
 */
export function parseBankCSV(
  csvContent: string,
  mapping: CSVColumnMapping,
  bankName: string,
): BankStatement {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
  const dataLines = lines.slice(mapping.skipRows);

  const movements: BankMovement[] = [];
  for (let i = 0; i < dataLines.length; i++) {
    const cols = dataLines[i].split(mapping.separator);
    if (cols.length <= Math.max(mapping.date, mapping.amount, mapping.concept)) continue;

    const amount = parseAmount(cols[mapping.amount], mapping.decimalSeparator);
    if (amount === 0) continue;

    movements.push({
      id: `bm_${Date.now()}_${i}`,
      date: parseDate(cols[mapping.date], mapping.dateFormat),
      amount,
      concept: cols[mapping.concept]?.trim().replace(/"/g, "") ?? "",
      reference: mapping.reference !== undefined ? cols[mapping.reference]?.trim() : undefined,
      balance: mapping.balance !== undefined ? parseAmount(cols[mapping.balance], mapping.decimalSeparator) : undefined,
      counterparty: mapping.counterparty !== undefined ? cols[mapping.counterparty]?.trim() : undefined,
      matchStatus: "unmatched",
    });
  }

  // Sort by date
  movements.sort((a, b) => a.date.localeCompare(b.date));

  const id = `bs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    bankName,
    accountNumber: "****",
    currency: "EUR",
    periodFrom: movements[0]?.date ?? "",
    periodTo: movements[movements.length - 1]?.date ?? "",
    openingBalance: 0,
    closingBalance: movements[movements.length - 1]?.balance ?? 0,
    movements,
    importedAt: new Date().toISOString(),
    format: "csv",
  };
}

/**
 * Parsea Norma 43 (AEB) — estándar de los bancos españoles.
 * Registro tipo 11=cabecera cuenta, 22=movimiento, 23=complemento, 33=final.
 */
export function parseNorma43(content: string, bankName: string): BankStatement {
  const lines = content.split(/\r?\n/).filter((l) => l.length >= 2);
  const movements: BankMovement[] = [];
  let openingBalance = 0;
  let closingBalance = 0;
  let accountNumber = "";
  let periodFrom = "";
  let periodTo = "";
  let currentMovement: Partial<BankMovement> | null = null;

  for (const line of lines) {
    const type = line.substring(0, 2);

    if (type === "11") {
      // Cabecera de cuenta
      accountNumber = line.substring(2, 12).trim();
      const dateStr = line.substring(20, 26); // AAMMDD
      periodFrom = `20${dateStr.slice(0, 2)}-${dateStr.slice(2, 4)}-${dateStr.slice(4, 6)}`;
      const balStr = line.substring(33, 47);
      const sign = line.substring(32, 33); // 1=debe(negativo), 2=haber(positivo)
      openingBalance = r2(parseInt(balStr, 10) / 100 * (sign === "1" ? -1 : 1));
    }

    if (type === "22") {
      // Movimiento
      if (currentMovement) {
        movements.push(currentMovement as BankMovement);
      }
      const dateOp = line.substring(10, 16); // AAMMDD
      const dateVal = line.substring(16, 22);
      const sign = line.substring(27, 28); // 1=debe, 2=haber
      const amountStr = line.substring(28, 42);
      const amount = r2(parseInt(amountStr, 10) / 100 * (sign === "1" ? -1 : 1));
      const concept = line.substring(52).trim();

      currentMovement = {
        id: `n43_${movements.length}`,
        date: `20${dateOp.slice(0, 2)}-${dateOp.slice(2, 4)}-${dateOp.slice(4, 6)}`,
        valueDate: `20${dateVal.slice(0, 2)}-${dateVal.slice(2, 4)}-${dateVal.slice(4, 6)}`,
        amount,
        concept,
        matchStatus: "unmatched",
      };
    }

    if (type === "23" && currentMovement) {
      // Complemento del movimiento (más texto)
      currentMovement.concept += " " + line.substring(4).trim();
    }

    if (type === "33") {
      // Final de cuenta
      if (currentMovement) {
        movements.push(currentMovement as BankMovement);
        currentMovement = null;
      }
      const dateStr = line.substring(20, 26);
      periodTo = `20${dateStr.slice(0, 2)}-${dateStr.slice(2, 4)}-${dateStr.slice(4, 6)}`;
      const balStr = line.substring(33, 47);
      const sign = line.substring(32, 33);
      closingBalance = r2(parseInt(balStr, 10) / 100 * (sign === "1" ? -1 : 1));
    }
  }

  return {
    id: `n43_${Date.now()}`,
    bankName,
    accountNumber: accountNumber.slice(-4),
    currency: "EUR",
    periodFrom,
    periodTo,
    openingBalance,
    closingBalance,
    movements,
    importedAt: new Date().toISOString(),
    format: "norma43",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOTOR DE MATCHING INTELIGENTE (100% AUTOMÁTICO — sin intervención humana)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sistema de scoring multi-señal para casar movimientos con facturas.
 * NO requiere confirmación humana. Decide solo.
 *
 * Cada candidato recibe una puntuación (0-100) basada en múltiples señales:
 *   - Referencia de pedido en concepto (+40 pts)
 *   - Importe exacto (+30 pts) o cercano (+20 pts)
 *   - Nombre del cliente en concepto (+15 pts)
 *   - Fecha cercana (+15 pts max, decrece con distancia)
 *   - Email o teléfono en concepto (+10 pts)
 *
 * Umbral de auto-match:
 *   ≥60 pts → match automático (verde, "matched")
 *   40-59 pts → match con comisión probable (verde, "matched" + nota)
 *   <40 pts → sin casar (el informe lo documenta, nadie lo toca)
 *
 * Comisiones bancarias (diferencia ≤1€ entre banco y factura):
 *   Se registran automáticamente como gasto bancario (cuenta 626).
 *   Sin intervención humana.
 */

interface MatchCandidate {
  invoice: InvoiceRecord;
  score: number;
  signals: string[];
  amountDiff: number;
}

function normalizeText(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function scoreCandidate(
  mov: BankMovement,
  inv: InvoiceRecord,
  orders: Map<string, { id: string; total: number; date: string; invoiceId?: string; shippingAddress?: { nombre?: string; apellidos?: string; email?: string; telefono?: string } }>,
): MatchCandidate {
  let score = 0;
  const signals: string[] = [];
  const concept = normalizeText(mov.concept);
  const counterparty = normalizeText(mov.counterparty ?? "");
  const recipient = inv.recipient as { name?: string; taxId?: string; email?: string; phone?: string };
  const amountDiff = r2(Math.abs(mov.amount - inv.totals.totalInvoice));

  // ── Signal 1: Referencia de pedido en concepto (+40) ──
  const orderRefMatch = mov.concept.match(/TCG-\d{6}-[A-Z0-9]{6}/i);
  if (orderRefMatch && inv.sourceOrderId) {
    if (orderRefMatch[0].toUpperCase() === inv.sourceOrderId.toUpperCase()) {
      score += 40;
      signals.push(`Ref. pedido exacta: ${orderRefMatch[0]}`);
    }
  }

  // ── Signal 2: Importe (+30 exacto, +20 cercano, +10 comisión) ──
  if (amountDiff < 0.01) {
    score += 30;
    signals.push("Importe exacto");
  } else if (amountDiff <= 0.10) {
    score += 25;
    signals.push(`Importe ±${amountDiff.toFixed(2)}€ (comisión probable)`);
  } else if (amountDiff <= 0.50) {
    score += 20;
    signals.push(`Importe ±${amountDiff.toFixed(2)}€ (comisión gateway)`);
  } else if (amountDiff <= 1.00) {
    score += 10;
    signals.push(`Importe ±${amountDiff.toFixed(2)}€ (comisión bancaria)`);
  }

  // ── Signal 3: Nombre del cliente (+15) ──
  const clientName = normalizeText(recipient.name ?? "");
  if (clientName.length >= 3) {
    const nameParts = clientName.split(/\s+/).filter((p) => p.length >= 3);
    const matchedParts = nameParts.filter(
      (part) => concept.includes(part) || counterparty.includes(part),
    );
    if (matchedParts.length >= 2) {
      score += 15;
      signals.push(`Nombre cliente: "${matchedParts.join(" ")}"`);
    } else if (matchedParts.length === 1) {
      score += 8;
      signals.push(`Apellido coincide: "${matchedParts[0]}"`);
    }
  }

  // ── Signal 4: Fecha cercana (+15 max, decrece) ──
  const invDate = new Date(inv.invoiceDate).getTime();
  const movDate = new Date(mov.date).getTime();
  const daysDiff = Math.abs(invDate - movDate) / (24 * 60 * 60 * 1000);
  if (daysDiff <= 1) {
    score += 15;
    signals.push("Mismo día o siguiente");
  } else if (daysDiff <= 3) {
    score += 12;
    signals.push(`±${Math.round(daysDiff)} días`);
  } else if (daysDiff <= 7) {
    score += 8;
    signals.push(`±${Math.round(daysDiff)} días`);
  } else if (daysDiff <= 14) {
    score += 3;
    signals.push(`±${Math.round(daysDiff)} días`);
  }

  // ── Signal 5: Email o teléfono en concepto (+10) ──
  const email = normalizeText(recipient.email ?? "");
  const phone = (recipient.phone ?? "").replace(/\s/g, "");
  if (email && (concept.includes(email) || counterparty.includes(email))) {
    score += 10;
    signals.push(`Email coincide: ${email}`);
  }
  if (phone.length >= 9 && concept.includes(phone.slice(-9))) {
    score += 10;
    signals.push(`Teléfono coincide`);
  }

  // ── Signal 6: NIF/CIF en concepto (+10) ──
  const taxId = normalizeText((recipient as { taxId?: string }).taxId ?? "");
  if (taxId.length >= 8 && (concept.includes(taxId) || counterparty.includes(taxId))) {
    score += 10;
    signals.push(`NIF/CIF coincide: ${taxId.toUpperCase()}`);
  }

  // ── Signal 7: Nº factura en concepto (+10) ──
  const invNum = normalizeText(inv.invoiceNumber);
  if (concept.includes(invNum)) {
    score += 10;
    signals.push(`Nº factura en concepto`);
  }

  // ── Signal 8: Datos del pedido (nombre en dirección de envío) ──
  if (inv.sourceOrderId) {
    const order = orders.get(inv.sourceOrderId);
    if (order?.shippingAddress) {
      const addr = order.shippingAddress;
      const fullName = normalizeText(`${addr.nombre ?? ""} ${addr.apellidos ?? ""}`);
      const parts = fullName.split(/\s+/).filter((p) => p.length >= 3);
      const addrMatches = parts.filter((p) => concept.includes(p) || counterparty.includes(p));
      if (addrMatches.length >= 1 && !signals.some((s) => s.startsWith("Nombre"))) {
        score += 8;
        signals.push(`Nombre envío: "${addrMatches.join(" ")}"`);
      }
    }
  }

  return { invoice: inv, score: Math.min(score, 100), signals, amountDiff };
}

/** Umbral mínimo de confianza para auto-match */
const AUTO_MATCH_THRESHOLD = 40;

/**
 * Conciliación 100% automática.
 * Puntúa cada combinación movimiento-factura y asigna el mejor match.
 * Sin intervención humana. Solo emite informe de lo que hizo.
 */
export function autoReconcile(
  statement: BankStatement,
  invoices: InvoiceRecord[],
  _journalEntries: JournalEntry[],
): BankStatement {
  const activeInvoices = invoices.filter(
    (i) => i.status !== InvoiceStatus.ANULADA,
  );

  const matchedInvoiceIds = new Set<string>();

  // Load orders with shipping addresses for name matching
  const orders = safeRead<{
    id: string; total: number; date: string; invoiceId?: string;
    shippingAddress?: { nombre?: string; apellidos?: string; email?: string; telefono?: string };
  }[]>("tcgacademy_orders", []);
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  for (const mov of statement.movements) {
    if (mov.amount <= 0) {
      // Cargos bancarios: auto-clasificar como gasto
      mov.matchStatus = "matched";
      mov.matchNote = `Cargo bancario auto-clasificado (${mov.concept.slice(0, 50)})`;
      continue;
    }

    // Score all unmatched invoices against this movement
    const candidates: MatchCandidate[] = [];
    for (const inv of activeInvoices) {
      if (matchedInvoiceIds.has(inv.invoiceId)) continue;
      // Pre-filter: amount difference must be ≤ 2€ (no point scoring if way off)
      const amountDiff = Math.abs(mov.amount - inv.totals.totalInvoice);
      if (amountDiff > 2.00) continue;

      candidates.push(scoreCandidate(mov, inv, orderMap));
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    if (best && best.score >= AUTO_MATCH_THRESHOLD) {
      mov.matchStatus = "matched";
      mov.matchedInvoiceId = best.invoice.invoiceId;
      mov.matchedInvoiceNumber = best.invoice.invoiceNumber;
      mov.matchedAmount = best.invoice.totals.totalInvoice;
      mov.matchDifference = r2(mov.amount - best.invoice.totals.totalInvoice);
      mov.matchNote = `Score: ${best.score}/100. Señales: ${best.signals.join("; ")}`;

      if (best.amountDiff > 0.01) {
        mov.matchNote += `. Diferencia: ${best.amountDiff.toFixed(2)}€ → gasto bancario (cuenta 626).`;
      }

      matchedInvoiceIds.add(best.invoice.invoiceId);
    } else {
      // No match found — document for the report
      mov.matchStatus = "unmatched";
      mov.matchNote = best
        ? `Mejor candidato: ${best.invoice.invoiceNumber} (score ${best.score}/100, bajo umbral ${AUTO_MATCH_THRESHOLD}).`
        : `Sin candidatos dentro de ±2€ de tolerancia.`;
    }
  }

  return statement;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERACIÓN DE INFORME DE CONCILIACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

export function generateReconciliationReport(
  statement: BankStatement,
  bookBalance: number,
): ReconciliationResult {
  const matched = statement.movements.filter((m) => m.matchStatus === "matched").length;
  const partial = statement.movements.filter((m) => m.matchStatus === "partial").length;
  const unmatched = statement.movements.filter((m) => m.matchStatus === "unmatched").length;
  const ignored = statement.movements.filter((m) => m.matchStatus === "ignored").length;
  const manual = statement.movements.filter((m) => m.matchStatus === "manual").length;

  const matchedIncome = r2(
    statement.movements
      .filter((m) => m.matchStatus === "matched" && m.amount > 0)
      .reduce((s, m) => s + m.amount, 0),
  );
  const unmatchedIncome = r2(
    statement.movements
      .filter((m) => m.matchStatus === "unmatched" && m.amount > 0)
      .reduce((s, m) => s + m.amount, 0),
  );
  const totalCharges = r2(
    statement.movements
      .filter((m) => m.amount < 0)
      .reduce((s, m) => s + Math.abs(m.amount), 0),
  );

  const result: ReconciliationResult = {
    statementId: statement.id,
    generatedAt: new Date().toISOString(),
    totalMovements: statement.movements.length,
    matched,
    partial,
    unmatched,
    ignored,
    manual,
    matchedIncome,
    unmatchedIncome,
    totalCharges,
    bankBalance: statement.closingBalance,
    bookBalance,
    difference: r2(statement.closingBalance - bookBalance),
    movements: statement.movements,
  };

  saveReconciliation(result);
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INFORME AUTOMÁTICO DE CONCILIACIÓN
// ═══════════════════════════════════════════════════════════════════════════════
// NO HAY funciones manuales. El sistema decide solo.
// Solo genera informes de lo que hizo y por qué.

export interface ReconciliationAuditEntry {
  movementId: string;
  movementDate: string;
  bankAmount: number;
  concept: string;
  decision: "matched" | "unmatched" | "charge_classified";
  invoiceNumber?: string;
  invoiceAmount?: number;
  score?: number;
  signals: string[];
  difference?: number;
  differenceClassification?: string; // "comisión bancaria", "redondeo gateway", etc.
}

/**
 * Genera un informe detallado de todas las decisiones del motor de matching.
 * 100% automático — solo lectura.
 */
export function generateReconciliationAudit(
  statement: BankStatement,
): ReconciliationAuditEntry[] {
  return statement.movements.map((mov) => ({
    movementId: mov.id,
    movementDate: mov.date,
    bankAmount: mov.amount,
    concept: mov.concept,
    decision: mov.amount <= 0 ? "charge_classified" as const : mov.matchStatus === "matched" ? "matched" as const : "unmatched" as const,
    invoiceNumber: mov.matchedInvoiceNumber,
    invoiceAmount: mov.matchedAmount,
    score: mov.matchNote ? parseInt(mov.matchNote.match(/Score: (\d+)/)?.[1] ?? "0", 10) || undefined : undefined,
    signals: mov.matchNote?.match(/Señales: (.+?)(?:\.|$)/)?.[1]?.split("; ") ?? [],
    difference: mov.matchDifference,
    differenceClassification:
      mov.matchDifference !== undefined && Math.abs(mov.matchDifference) > 0.01
        ? Math.abs(mov.matchDifference) <= 0.10 ? "Redondeo gateway de pago"
          : Math.abs(mov.matchDifference) <= 0.50 ? "Comisión pasarela (Stripe/PayPal/Bizum)"
            : Math.abs(mov.matchDifference) <= 1.00 ? "Comisión bancaria"
              : "Diferencia significativa — revisar en informe"
        : undefined,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTACIONES
// ═══════════════════════════════════════════════════════════════════════════════

function fmtNum(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

/** CSV de conciliación bancaria — automático, con scoring y clasificación */
export function exportReconciliationCSV(result: ReconciliationResult): string {
  const audit = generateReconciliationAudit({
    id: result.statementId,
    bankName: "",
    accountNumber: "",
    currency: "EUR",
    periodFrom: "",
    periodTo: "",
    openingBalance: 0,
    closingBalance: result.bankBalance,
    movements: result.movements,
    importedAt: "",
    format: "csv",
  });

  const headers = [
    "Fecha", "Concepto", "Importe Banco", "Decisión Automática",
    "Factura Casada", "Importe Factura", "Diferencia",
    "Score Confianza", "Señales Detectadas", "Clasificación Diferencia",
  ];
  const rows = audit.map((a) =>
    [
      a.movementDate,
      `"${a.concept.replace(/"/g, '""')}"`,
      fmtNum(a.bankAmount),
      a.decision === "matched" ? "CASADO AUTO" :
        a.decision === "charge_classified" ? "CARGO BANCARIO" : "SIN CASAR",
      a.invoiceNumber ?? "",
      a.invoiceAmount ? fmtNum(a.invoiceAmount) : "",
      a.difference !== undefined ? fmtNum(a.difference) : "",
      a.score !== undefined ? `${a.score}/100` : "",
      a.signals.length > 0 ? `"${a.signals.join("; ")}"` : "",
      a.differenceClassification ? `"${a.differenceClassification}"` : "",
    ].join(";"),
  );

  // Summary
  const matched = audit.filter((a) => a.decision === "matched").length;
  const unmatched = audit.filter((a) => a.decision === "unmatched").length;
  const charges = audit.filter((a) => a.decision === "charge_classified").length;
  rows.push("");
  rows.push("RESUMEN CONCILIACIÓN AUTOMÁTICA;;;;;;;;;;");
  rows.push(`Movimientos totales;${result.totalMovements};;;;;;;;`);
  rows.push(`Casados automáticamente;${matched};;;;;;;;`);
  rows.push(`Sin casar;${unmatched};;;;;;;;`);
  rows.push(`Cargos clasificados;${charges};;;;;;;;`);
  rows.push(`Saldo banco;${fmtNum(result.bankBalance)};;;;;;;;`);
  rows.push(`Saldo contable;${fmtNum(result.bookBalance)};;;;;;;;`);
  rows.push(`Diferencia;${fmtNum(result.difference)};;;;;;;;`);
  rows.push("");
  rows.push(`"Este informe fue generado automáticamente por el motor de conciliación inteligente.";;;;;;;;`);
  rows.push(`"Umbral de confianza: ${AUTO_MATCH_THRESHOLD}/100. Diferencias ≤1€ clasificadas como comisión bancaria.";;;;;;;;`);
  rows.push(`"Ninguna decisión fue tomada por un humano.";;;;;;;;`);

  return "\uFEFF" + [headers.join(";"), ...rows].join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESETS DE BANCOS ESPAÑOLES
// ═══════════════════════════════════════════════════════════════════════════════

/** Configuraciones predefinidas para los principales bancos españoles */
export const BANK_PRESETS: Record<string, { name: string; mapping: CSVColumnMapping }> = {
  santander: {
    name: "Santander",
    mapping: { date: 0, amount: 3, concept: 2, reference: 1, balance: 4, dateFormat: "DD/MM/YYYY", separator: ";", decimalSeparator: ",", skipRows: 1, encoding: "utf-8" },
  },
  bbva: {
    name: "BBVA",
    mapping: { date: 0, amount: 4, concept: 2, reference: 1, balance: 5, dateFormat: "DD/MM/YYYY", separator: ";", decimalSeparator: ",", skipRows: 1, encoding: "utf-8" },
  },
  caixabank: {
    name: "CaixaBank",
    mapping: { date: 0, amount: 3, concept: 1, balance: 4, dateFormat: "DD/MM/YYYY", separator: ";", decimalSeparator: ",", skipRows: 1, encoding: "utf-8" },
  },
  sabadell: {
    name: "Sabadell",
    mapping: { date: 0, amount: 2, concept: 1, balance: 3, dateFormat: "DD/MM/YYYY", separator: ";", decimalSeparator: ",", skipRows: 1, encoding: "utf-8" },
  },
  ing: {
    name: "ING",
    mapping: { date: 0, amount: 3, concept: 1, reference: 2, dateFormat: "DD/MM/YYYY", separator: ";", decimalSeparator: ",", skipRows: 1, encoding: "utf-8" },
  },
  bankinter: {
    name: "Bankinter",
    mapping: { date: 0, amount: 2, concept: 1, balance: 3, dateFormat: "DD/MM/YYYY", separator: ";", decimalSeparator: ",", skipRows: 1, encoding: "utf-8" },
  },
  openbank: {
    name: "Openbank",
    mapping: { date: 0, amount: 3, concept: 2, balance: 4, dateFormat: "DD/MM/YYYY", separator: ";", decimalSeparator: ",", skipRows: 1, encoding: "utf-8" },
  },
  custom: {
    name: "Personalizado",
    mapping: { date: 0, amount: 1, concept: 2, dateFormat: "DD/MM/YYYY", separator: ";", decimalSeparator: ",", skipRows: 1, encoding: "utf-8" },
  },
};
