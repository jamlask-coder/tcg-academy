/**
 * Tipos del Sistema de Contabilidad — Plan General Contable (PGC) español.
 *
 * Base legal:
 *   - Real Decreto 1514/2007 (PGC)
 *   - Real Decreto 1515/2007 (PGC PYMES)
 *   - Código de Comercio (art. 28-30: libros obligatorios)
 */

import type { Quarter } from "@/types/tax";

// ═══════════════════════════════════════════════════════════════════════════════
// PLAN GENERAL CONTABLE — Cuentas
// ═══════════════════════════════════════════════════════════════════════════════

export type AccountGroup = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export interface PGCAccount {
  code: string;
  name: string;
  group: AccountGroup;
  type: AccountType;
  /** true = saldo normal deudor (activos y gastos) */
  debitNature: boolean;
  parent?: string;
  description?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASIENTOS CONTABLES (Journal Entries)
// ═══════════════════════════════════════════════════════════════════════════════

export interface JournalLine {
  lineNumber: number;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export type JournalReferenceType =
  | "invoice"
  | "payment"
  | "rectificativa"
  | "adjustment"
  | "opening"
  | "closing";

export interface JournalEntry {
  entryId: string;
  entryNumber: number;
  date: string; // ISO date
  description: string;
  reference: string;
  referenceType: JournalReferenceType;
  lines: JournalLine[];
  status: "posted" | "reversed";
  periodKey: string; // "2026-Q2"
  createdAt: string;
  hash: string;
  previousHash: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIBRO MAYOR (General Ledger)
// ═══════════════════════════════════════════════════════════════════════════════

export interface LedgerEntry {
  accountCode: string;
  date: string;
  entryId: string;
  entryNumber: number;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BALANCE DE SUMAS Y SALDOS (Trial Balance)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  totalDebit: number;
  totalCredit: number;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalance {
  period: string;
  generatedAt: string;
  accounts: TrialBalanceRow[];
  totals: {
    totalDebit: number;
    totalCredit: number;
    debitBalance: number;
    creditBalance: number;
  };
  /** INVARIANTE: totalDebit === totalCredit */
  isBalanced: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BALANCE DE SITUACIÓN (Balance Sheet)
// ═══════════════════════════════════════════════════════════════════════════════

export interface BalanceGroup {
  label: string;
  accounts: { code: string; name: string; balance: number }[];
  subtotal: number;
}

export interface BalanceSheet {
  date: string;
  assets: BalanceGroup[];
  liabilities: BalanceGroup[];
  equity: BalanceGroup[];
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  /** INVARIANTE: Activo = Pasivo + Patrimonio Neto */
  isBalanced: boolean;
  difference: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUENTA DE PÉRDIDAS Y GANANCIAS (P&L — PGC format)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PLSection {
  label: string;
  accounts: { code: string; name: string; amount: number }[];
  subtotal: number;
}

export interface ProfitAndLoss {
  period: string;
  /** A) Resultado de explotación */
  operatingIncome: PLSection[];
  operatingExpenses: PLSection[];
  operatingResult: number;
  /** B) Resultado financiero */
  financialIncome: PLSection[];
  financialExpenses: PLSection[];
  financialResult: number;
  /** C) Resultado antes de impuestos */
  preTaxResult: number;
  /** Impuesto sobre beneficios */
  taxExpense: number;
  /** D) Resultado del ejercicio */
  netResult: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-VALIDATION (4 métodos)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationMethod {
  name: string;
  revenue: number;
  vat: number;
  detail: string;
}

export interface CrossValidationResult {
  timestamp: string;
  period: string;
  methodA: ValidationMethod;
  methodB: ValidationMethod;
  methodC: ValidationMethod;
  methodD: ValidationMethod;
  allAgree: boolean;
  maxDiscrepancy: number;
  discrepancies: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CIERRE DE PERÍODOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface FiscalPeriod {
  key: string;
  year: number;
  quarter: Quarter;
  status: "open" | "closed" | "filed";
  closedAt?: string;
  closedBy?: string;
  closingHash?: string;
  filedAt?: string;
  modelo303Result?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 303 — Casillas completas
// ═══════════════════════════════════════════════════════════════════════════════

export interface Modelo303Full {
  year: number;
  quarter: Quarter;
  /** IVA devengado (repercutido) */
  casilla01: number; // Base imponible régimen general 21%
  casilla02: number; // Tipo %
  casilla03: number; // Cuota 21%
  casilla04: number; // Base imponible 10%
  casilla05: number; // Tipo %
  casilla06: number; // Cuota 10%
  casilla07: number; // Base imponible 4%
  casilla08: number; // Tipo %
  casilla09: number; // Cuota 4%
  casilla10: number; // Base rec. equiv.
  casilla11: number; // Tipo rec. equiv.
  casilla12: number; // Cuota rec. equiv.
  casilla13: number; // Base rec. equiv. 10%
  casilla14: number; // Tipo
  casilla15: number; // Cuota
  casilla16: number; // Base rec. equiv. 4%
  casilla17: number; // Tipo
  casilla18: number; // Cuota
  casilla21: number; // Adq. intracomunitarias base
  casilla22: number; // Adq. intracomunitarias cuota
  casilla25: number; // TOTAL CUOTAS DEVENGADAS
  /** IVA deducible (soportado) */
  casilla26: number; // Cuotas soportadas operaciones interiores bienes corrientes
  casilla27: number; // Base
  casilla28: number; // Cuotas soportadas bienes inversión
  casilla29: number; // Base
  casilla30: number; // Cuotas soportadas importaciones bienes corrientes
  casilla31: number; // Base
  casilla32: number; // Cuotas soportadas importaciones bienes inversión
  casilla33: number; // Base
  casilla34: number; // Cuotas soportadas adq. intracomunitarias bienes corrientes
  casilla35: number; // Base
  casilla36: number; // Cuotas soportadas adq. intracomunitarias bienes inversión
  casilla37: number; // Base
  casilla38: number; // Compensaciones régimen especial A/G/P
  casilla39: number; // Base
  casilla40: number; // Rectificación deducciones
  casilla41: number; // Base
  casilla44: number; // Regularización cuotas art. 80.5
  casilla45: number; // Base
  casilla46: number; // TOTAL A DEDUCIR
  casilla47: number; // DIFERENCIA (25 - 46)
  /** Resultado */
  casilla64: number; // Result. a compensar periodos anteriores
  casilla65: number; // RESULTADO LIQUIDACIÓN
  /** Metadatos */
  generatedAt: string;
  invoiceCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT TRAIL INMUTABLE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ImmutableAuditEntry {
  id: string;
  sequence: number;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  detail: string;
  userId: string;
  previousHash: string | null;
  hash: string;
}
