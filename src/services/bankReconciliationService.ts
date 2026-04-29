/**
 * Bank reconciliation service — Conciliación bancaria automática.
 * ================================================================
 *
 * Importa extractos bancarios (CSV) y los empareja automáticamente con:
 *   - Pedidos pendientes de cobro (transferencia / pago en tienda).
 *   - Facturas de proveedores pendientes de pago.
 *
 * Flujo:
 *  1) `importCSV(text, source)` parsea el extracto, deduce columnas y
 *     guarda los movimientos como un lote. Cada movimiento entra en estado
 *     "unmatched" o "auto-matched" según el algoritmo.
 *  2) El admin revisa los matches en `/admin/fiscal/conciliacion`.
 *  3) `confirmMatch(movId)` aplica los efectos:
 *       - Pedido: `setOrderPaymentStatus(orderId, "cobrado")`.
 *       - Proveedor: `markAsPaid(invoiceId, "transferencia", date)`.
 *  4) Movimientos sin candidato pueden marcarse "ignored" (comisiones,
 *     transferencias internas) o emparejarse manualmente.
 *
 * Importante: el parser NO toca pedidos ni facturas; sólo prepara el
 * borrador. La escritura sólo ocurre en `confirmMatch()` — eso permite
 * deshacer un lote completo eliminando movimientos antes de confirmar.
 */

import { DataHub } from "@/lib/dataHub";
import { safeRead, safeWrite } from "@/lib/safeStorage";
import {
  type BankMovement,
  type BankImportBatch,
  type BankMatchTarget,
  type BankMatchConfidence,
  type BankMovementStatus,
  type BankMovementType,
  PaymentMethod,
  SupplierInvoiceStatus,
  type SupplierInvoiceRecord,
} from "@/types/fiscal";
import {
  loadSupplierInvoices,
  markAsPaid as markSupplierInvoicePaid,
} from "@/services/supplierInvoiceService";
import {
  readAdminOrdersMerged,
  setOrderPaymentStatus,
  getOrderPaymentStatus,
  isCountableOrder,
} from "@/lib/orderAdapter";

const KEY_MOVEMENTS = "tcgacademy_bank_movements";
const KEY_BATCHES = "tcgacademy_bank_batches";
const MAX_MOVEMENTS = 10000;
const MAX_BATCHES = 200;
const AMOUNT_TOLERANCE = 0.02; // ±2 céntimos para tolerar redondeos

// ── Storage ────────────────────────────────────────────────────────────────

export function loadBankMovements(): BankMovement[] {
  return safeRead<BankMovement[]>(KEY_MOVEMENTS, []);
}

export function loadImportBatches(): BankImportBatch[] {
  return safeRead<BankImportBatch[]>(KEY_BATCHES, []);
}

function persistMovements(list: BankMovement[]): void {
  const trimmed = list.length > MAX_MOVEMENTS ? list.slice(-MAX_MOVEMENTS) : list;
  safeWrite(KEY_MOVEMENTS, trimmed);
  DataHub.emit("bankMovements");
}

function persistBatches(list: BankImportBatch[]): void {
  const trimmed = list.length > MAX_BATCHES ? list.slice(-MAX_BATCHES) : list;
  safeWrite(KEY_BATCHES, trimmed);
}

// ── Parser CSV ─────────────────────────────────────────────────────────────

/**
 * Parser CSV permisivo:
 *  - Delimitador auto-detectado (`;` por defecto, `,` y `\t` como fallback).
 *  - Soporta campos entre comillas con dobles comillas como escape.
 *  - Ignora BOM inicial y líneas en blanco.
 */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const counts = {
    ";": (firstLine.match(/;/g) ?? []).length,
    ",": (firstLine.match(/,/g) ?? []).length,
    "\t": (firstLine.match(/\t/g) ?? []).length,
  };
  const sorted = (Object.entries(counts) as Array<[string, number]>).sort(
    (a, b) => b[1] - a[1],
  );
  return sorted[0]?.[1] > 0 ? sorted[0][0] : ";";
}

function parseCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === delim) {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Parsea importes con coma decimal (formato España) o punto. */
function parseAmount(raw: string): number | null {
  if (!raw) return null;
  // Eliminar separador de miles (puede ser "." o " ") y símbolo €.
  const cleaned = raw
    .replace(/€/g, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "") // elimina puntos de miles
    .replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Convierte fechas en formato dd/mm/yyyy o yyyy-mm-dd a ISO YYYY-MM-DD. */
function parseDate(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // dd/mm/yyyy o dd-mm-yyyy
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const yyyy = y.length === 2 ? `20${y}` : y;
    return `${yyyy}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // yyyy-mm-dd
  const ymd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

/** Indica si el primer campo es un encabezado (cualquier texto no numérico). */
function looksLikeHeader(cells: string[]): boolean {
  return cells.some((c) =>
    /fecha|f\.\s*operac|f\. ?op|concepto|importe|amount|date|description|debe|haber|saldo|balance/i.test(
      c,
    ),
  );
}

interface ColumnMap {
  date: number;
  valueDate: number;
  concept: number;
  amount: number;
  reference: number;
  counterparty: number;
}

function detectColumns(header: string[]): ColumnMap {
  const norm = header.map((h) =>
    h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  );
  const find = (...patterns: RegExp[]): number => {
    for (let i = 0; i < norm.length; i++) {
      if (patterns.some((p) => p.test(norm[i]))) return i;
    }
    return -1;
  };
  return {
    date: find(/^fecha$/, /f\.?\s*operac/, /^date$/, /fecha\s*operac/),
    valueDate: find(/f\.?\s*valor/, /value\s*date/, /fecha\s*valor/),
    concept: find(/^concepto$/, /^description$/, /descripcion/, /detalle/),
    amount: find(/^importe$/, /^amount$/, /^cantidad$/),
    reference: find(/referencia/, /reference/, /concepto\s*comun/),
    counterparty: find(/contrapart/, /ordenante/, /beneficiario/, /counterparty/),
  };
}

/** Resultado del parser. */
export interface ParsedCsv {
  movements: BankMovement[];
  errors: string[];
  bank: string;
}

/** Detecta el banco por palabras clave del header (best-effort). */
function detectBank(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("bbva")) return "BBVA";
  if (t.includes("santander")) return "Santander";
  if (t.includes("caixa")) return "CaixaBank";
  if (t.includes("sabadell")) return "Sabadell";
  if (t.includes("ing")) return "ING";
  if (t.includes("bankinter")) return "Bankinter";
  return "generic";
}

function parseCsv(
  text: string,
  batchId: string,
  importedAt: string,
): ParsedCsv {
  const errors: string[] = [];
  // Strip BOM
  const clean = text.replace(/^\uFEFF/, "");
  const delim = detectDelimiter(clean);
  const rows = clean
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rows.length === 0) {
    return { movements: [], errors: ["El CSV está vacío"], bank: "generic" };
  }

  let header: string[] | null = null;
  let dataStart = 0;
  // Buscar la primera línea que parezca header dentro de las 10 primeras filas
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cells = parseCsvLine(rows[i], delim);
    if (cells.length >= 3 && looksLikeHeader(cells)) {
      header = cells;
      dataStart = i + 1;
      break;
    }
  }
  if (!header) {
    errors.push("No se detectó cabecera. Se asume orden Fecha;Concepto;Importe.");
    header = ["fecha", "concepto", "importe"];
    dataStart = 0;
  }

  const cols = detectColumns(header);
  if (cols.date < 0 || cols.amount < 0 || cols.concept < 0) {
    errors.push(
      "Columnas mínimas (fecha, concepto, importe) no detectadas — abortando.",
    );
    return { movements: [], errors, bank: detectBank(clean) };
  }

  const out: BankMovement[] = [];
  for (let i = dataStart; i < rows.length; i++) {
    const cells = parseCsvLine(rows[i], delim);
    if (cells.length < 3) continue;
    const date = parseDate(cells[cols.date] ?? "");
    const amount = parseAmount(cells[cols.amount] ?? "");
    const concept = (cells[cols.concept] ?? "").trim();
    if (!date) {
      errors.push(`Fila ${i + 1}: fecha no válida (${cells[cols.date]}).`);
      continue;
    }
    if (amount === null) {
      errors.push(`Fila ${i + 1}: importe no válido (${cells[cols.amount]}).`);
      continue;
    }
    if (Math.abs(amount) < 0.005) continue; // movimientos cero — descartar
    const valueDate = cols.valueDate >= 0 ? parseDate(cells[cols.valueDate] ?? "") : null;
    const reference = cols.reference >= 0 ? (cells[cols.reference] ?? "").trim() : "";
    const counterparty =
      cols.counterparty >= 0 ? (cells[cols.counterparty] ?? "").trim() : "";

    const type: BankMovementType = amount >= 0 ? "income" : "expense";
    out.push({
      id: `bmov_${batchId}_${i}`,
      date,
      valueDate,
      amount: Math.round(amount * 100) / 100,
      type,
      concept,
      reference,
      counterparty,
      counterpartyIban: "",
      status: "unmatched",
      matchedTo: null,
      importBatchId: batchId,
      importedAt,
      notes: "",
    });
  }

  return { movements: out, errors, bank: detectBank(clean) };
}

// ── Auto-matching ──────────────────────────────────────────────────────────

interface MatchResult {
  target: BankMatchTarget | null;
}

/** Normaliza texto para búsquedas robustas (sin tildes, en minúsculas). */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= AMOUNT_TOLERANCE;
}

/**
 * Empareja un movimiento con un pedido (income) o una factura proveedor
 * (expense). Devuelve el mejor candidato o null.
 *
 * Estrategia:
 *  - Income: busca pedidos con `paymentStatus === "pendiente"` cuyo `total`
 *    coincida. Confianza alta si el concepto contiene el orderId; baja si
 *    sólo coincide el importe.
 *  - Expense: busca facturas de proveedor PENDIENTE con `totalInvoice` que
 *    coincida (en valor absoluto). Confianza alta si el concepto contiene
 *    el número de factura o el nombre/CIF del proveedor.
 */
export function findMatch(mov: BankMovement): MatchResult {
  const concept = normalize(`${mov.concept} ${mov.reference} ${mov.counterparty}`);

  if (mov.type === "income") {
    // Excluye carry-over: ya fue conciliado por la SL anterior.
    const orders = readAdminOrdersMerged()
      .filter(isCountableOrder)
      .filter((o) => getOrderPaymentStatus(o.id) === "pendiente");
    const candidates = orders.filter((o) => amountsMatch(o.total, mov.amount));
    if (candidates.length === 0) return { target: null };

    // Mejor candidato: el que aparezca en el concepto.
    let best: { id: string; expected: number; conf: BankMatchConfidence } | null =
      null;
    for (const o of candidates) {
      const idHit = concept.includes(normalize(o.id));
      const nameHit = o.userName ? concept.includes(normalize(o.userName)) : false;
      const conf: BankMatchConfidence = idHit ? "exact" : nameHit ? "high" : "low";
      if (
        !best ||
        confidenceRank(conf) > confidenceRank(best.conf)
      ) {
        best = { id: o.id, expected: o.total, conf };
      }
    }
    if (!best) return { target: null };
    // Si sólo hay coincidencia por importe y hay múltiples candidatos → low.
    if (best.conf === "low" && candidates.length > 1) {
      return {
        target: {
          type: "order",
          id: best.id,
          expectedAmount: best.expected,
          confidence: "low",
          method: "auto",
        },
      };
    }
    return {
      target: {
        type: "order",
        id: best.id,
        expectedAmount: best.expected,
        confidence: best.conf,
        method: "auto",
      },
    };
  }

  // expense → factura proveedor
  const expense = Math.abs(mov.amount);
  const candidates: SupplierInvoiceRecord[] = loadSupplierInvoices().filter(
    (s) =>
      s.status === SupplierInvoiceStatus.PENDIENTE &&
      amountsMatch(s.totalInvoice, expense),
  );
  if (candidates.length === 0) return { target: null };

  let best: { id: string; expected: number; conf: BankMatchConfidence } | null =
    null;
  for (const s of candidates) {
    const numHit = concept.includes(normalize(s.supplierInvoiceNumber));
    const supplier = s.supplier?.name ?? "";
    const cif = s.supplier?.taxId ?? "";
    const supplierHit = supplier ? concept.includes(normalize(supplier)) : false;
    const cifHit = cif ? concept.includes(normalize(cif)) : false;
    const conf: BankMatchConfidence =
      numHit || cifHit ? "exact" : supplierHit ? "high" : "low";
    if (!best || confidenceRank(conf) > confidenceRank(best.conf)) {
      best = { id: s.id, expected: s.totalInvoice, conf };
    }
  }
  if (!best) return { target: null };
  return {
    target: {
      type: "supplier_invoice",
      id: best.id,
      expectedAmount: best.expected,
      confidence:
        best.conf === "low" && candidates.length > 1 ? "low" : best.conf,
      method: "auto",
    },
  };
}

function confidenceRank(c: BankMatchConfidence): number {
  return c === "exact" ? 3 : c === "high" ? 2 : 1;
}

/** Aplica auto-match a un movimiento y devuelve la copia actualizada. */
function applyAutoMatch(mov: BankMovement): BankMovement {
  const { target } = findMatch(mov);
  if (!target) return mov;
  return { ...mov, status: "auto-matched", matchedTo: target };
}

// ── Importación ────────────────────────────────────────────────────────────

export interface ImportResult {
  batch: BankImportBatch;
  movementsAdded: number;
  errors: string[];
}

/**
 * Importa un CSV completo. Crea un lote, parsea las filas, ejecuta auto-match
 * y persiste todo. Devuelve resumen del lote.
 */
export function importCSV(text: string, source: string): ImportResult {
  const importedAt = new Date().toISOString();
  const batchId = `batch_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const parsed = parseCsv(text, batchId, importedAt);
  const matched = parsed.movements.map((m) => applyAutoMatch(m));

  const totalIncome = matched
    .filter((m) => m.type === "income")
    .reduce((s, m) => s + m.amount, 0);
  const totalExpense = matched
    .filter((m) => m.type === "expense")
    .reduce((s, m) => s + Math.abs(m.amount), 0);

  const batch: BankImportBatch = {
    id: batchId,
    importedAt,
    source,
    bank: parsed.bank,
    movementCount: matched.length,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    errors: parsed.errors,
  };

  const existing = loadBankMovements();
  persistMovements([...existing, ...matched]);
  persistBatches([...loadImportBatches(), batch]);

  return { batch, movementsAdded: matched.length, errors: parsed.errors };
}

// ── Mutaciones ─────────────────────────────────────────────────────────────

export function getBankMovementById(id: string): BankMovement | undefined {
  return loadBankMovements().find((m) => m.id === id);
}

function updateMovement(
  id: string,
  patch: Partial<BankMovement>,
): BankMovement | null {
  const list = loadBankMovements();
  const idx = list.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  const next: BankMovement = { ...list[idx], ...patch };
  list[idx] = next;
  persistMovements(list);
  return next;
}

/**
 * Confirma un emparejamiento (manual o sugerido) y aplica los efectos:
 *  - order: marca paymentStatus = "cobrado".
 *  - supplier_invoice: marca status = PAGADA con paymentDate = movement.date.
 */
export function confirmMatch(
  movementId: string,
  override?: BankMatchTarget,
): BankMovement | null {
  const mov = getBankMovementById(movementId);
  if (!mov) return null;
  const target = override ?? mov.matchedTo;
  if (!target) return null;

  if (target.type === "order") {
    setOrderPaymentStatus(target.id, "cobrado");
  } else {
    markSupplierInvoicePaid(target.id, PaymentMethod.TRANSFERENCIA, mov.date);
  }

  return updateMovement(movementId, {
    status: "confirmed",
    matchedTo: { ...target, method: override ? "manual" : target.method },
  });
}

/** Cambia el destino del match manualmente (sin confirmar todavía). */
export function setManualMatch(
  movementId: string,
  type: BankMatchTarget["type"],
  targetId: string,
): BankMovement | null {
  const mov = getBankMovementById(movementId);
  if (!mov) return null;
  let expectedAmount = 0;
  if (type === "order") {
    const o = readAdminOrdersMerged().find((x) => x.id === targetId);
    if (!o) return null;
    expectedAmount = o.total;
  } else {
    const s = loadSupplierInvoices().find((x) => x.id === targetId);
    if (!s) return null;
    expectedAmount = s.totalInvoice;
  }
  const confidence: BankMatchConfidence = amountsMatch(
    mov.type === "expense" ? Math.abs(mov.amount) : mov.amount,
    expectedAmount,
  )
    ? "high"
    : "low";
  return updateMovement(movementId, {
    status: "auto-matched",
    matchedTo: {
      type,
      id: targetId,
      expectedAmount,
      confidence,
      method: "manual",
    },
  });
}

export function unmatch(movementId: string): BankMovement | null {
  return updateMovement(movementId, {
    status: "unmatched",
    matchedTo: null,
  });
}

export function markIgnored(movementId: string): BankMovement | null {
  return updateMovement(movementId, {
    status: "ignored",
    matchedTo: null,
  });
}

export function setMovementStatus(
  movementId: string,
  status: BankMovementStatus,
): BankMovement | null {
  return updateMovement(movementId, { status });
}

export function setMovementNotes(
  movementId: string,
  notes: string,
): BankMovement | null {
  return updateMovement(movementId, { notes });
}

/** Elimina un movimiento concreto (no aplica efectos contables). */
export function deleteMovement(movementId: string): boolean {
  const list = loadBankMovements();
  const next = list.filter((m) => m.id !== movementId);
  if (next.length === list.length) return false;
  persistMovements(next);
  return true;
}

/** Elimina un lote entero (todos sus movimientos no confirmados). */
export function deleteBatch(batchId: string): number {
  const movs = loadBankMovements();
  // Sólo eliminamos los no confirmados — los confirmados ya escribieron efectos.
  const remaining = movs.filter(
    (m) => m.importBatchId !== batchId || m.status === "confirmed",
  );
  const removed = movs.length - remaining.length;
  persistMovements(remaining);
  const batches = loadImportBatches().filter((b) => b.id !== batchId);
  persistBatches(batches);
  return removed;
}

// ── Queries ────────────────────────────────────────────────────────────────

export function getMovementsByStatus(
  status: BankMovementStatus,
): BankMovement[] {
  return loadBankMovements().filter((m) => m.status === status);
}

export interface ReconciliationStats {
  total: number;
  unmatched: number;
  autoMatched: number;
  confirmed: number;
  ignored: number;
  totalIncome: number;
  totalExpense: number;
}

export function getReconciliationStats(): ReconciliationStats {
  const list = loadBankMovements();
  let unmatched = 0;
  let autoMatched = 0;
  let confirmed = 0;
  let ignored = 0;
  let totalIncome = 0;
  let totalExpense = 0;
  for (const m of list) {
    if (m.status === "unmatched") unmatched++;
    else if (m.status === "auto-matched") autoMatched++;
    else if (m.status === "confirmed") confirmed++;
    else if (m.status === "ignored") ignored++;
    if (m.type === "income") totalIncome += m.amount;
    else totalExpense += Math.abs(m.amount);
  }
  return {
    total: list.length,
    unmatched,
    autoMatched,
    confirmed,
    ignored,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
  };
}

/** Re-ejecuta auto-match sobre todos los movimientos sin confirmar. */
export function rematchAll(): number {
  const list = loadBankMovements();
  let count = 0;
  const next = list.map((m) => {
    if (m.status === "confirmed" || m.status === "ignored") return m;
    const updated = applyAutoMatch({ ...m, status: "unmatched", matchedTo: null });
    if (updated.matchedTo) count++;
    return updated;
  });
  persistMovements(next);
  return count;
}
