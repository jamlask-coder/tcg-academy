/**
 * Libro Mayor (General Ledger) — TCG Academy.
 *
 * Derivado del Libro Diario (journal entries).
 * Cada cuenta tiene su propio registro con saldo acumulado (running balance).
 *
 * Código de Comercio art. 28.1: "El libro Mayor agrupará las operaciones
 * por cuentas, con indicación de los importes deudores y acreedores."
 */

import type {
  JournalEntry,
  LedgerEntry,
  TrialBalance,
  TrialBalanceRow,
  BalanceSheet,
  BalanceGroup,
  ProfitAndLoss,
  PLSection,
} from "@/types/accounting";
import {
  getAccountByCode,
  getAccountName,
  isDebitNature,
  getFullChartOfAccounts,
} from "@/accounting/chartOfAccounts";

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIBRO MAYOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera el Libro Mayor completo a partir del Libro Diario.
 * Returns: Map<accountCode, LedgerEntry[]>
 */
export function buildLedger(
  journalEntries: JournalEntry[],
): Map<string, LedgerEntry[]> {
  const ledger = new Map<string, LedgerEntry[]>();

  // Sort entries chronologically
  const sorted = [...journalEntries]
    .filter((e) => e.status === "posted")
    .sort((a, b) => a.date.localeCompare(b.date) || a.entryNumber - b.entryNumber);

  // Running balances per account
  const balances = new Map<string, number>();

  for (const entry of sorted) {
    for (const line of entry.lines) {
      if (line.debit === 0 && line.credit === 0) continue;

      const code = line.accountCode;
      const debitNat = isDebitNature(code);
      const prevBalance = balances.get(code) ?? 0;

      const delta = debitNat
        ? r2(line.debit - line.credit)
        : r2(line.credit - line.debit);
      const newBalance = r2(prevBalance + delta);
      balances.set(code, newBalance);

      const ledgerEntry: LedgerEntry = {
        accountCode: code,
        date: entry.date,
        entryId: entry.entryId,
        entryNumber: entry.entryNumber,
        description: line.description || entry.description,
        debit: line.debit,
        credit: line.credit,
        runningBalance: newBalance,
      };

      const existing = ledger.get(code) ?? [];
      existing.push(ledgerEntry);
      ledger.set(code, existing);
    }
  }

  return ledger;
}

/**
 * Saldo final de una cuenta.
 */
export function getAccountBalance(
  code: string,
  journalEntries: JournalEntry[],
): number {
  const debitNat = isDebitNature(code);
  let balance = 0;
  for (const entry of journalEntries) {
    if (entry.status !== "posted") continue;
    for (const line of entry.lines) {
      if (line.accountCode === code) {
        balance = debitNat
          ? r2(balance + line.debit - line.credit)
          : r2(balance + line.credit - line.debit);
      }
    }
  }
  return balance;
}

/**
 * Todos los saldos finales.
 */
export function getAllAccountBalances(
  journalEntries: JournalEntry[],
): Map<string, number> {
  const balances = new Map<string, number>();
  for (const entry of journalEntries) {
    if (entry.status !== "posted") continue;
    for (const line of entry.lines) {
      const code = line.accountCode;
      const debitNat = isDebitNature(code);
      const prev = balances.get(code) ?? 0;
      const delta = debitNat
        ? r2(line.debit - line.credit)
        : r2(line.credit - line.debit);
      balances.set(code, r2(prev + delta));
    }
  }
  return balances;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BALANCE DE SUMAS Y SALDOS (Trial Balance)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INVARIANTE: SUM(saldos deudores) === SUM(saldos acreedores)
 * Si esto falla, hay un error en la partida doble.
 */
export function generateTrialBalance(
  journalEntries: JournalEntry[],
  period: string,
): TrialBalance {
  const posted = journalEntries.filter((e) => e.status === "posted");
  const accountTotals = new Map<string, { debit: number; credit: number }>();

  for (const entry of posted) {
    for (const line of entry.lines) {
      const code = line.accountCode;
      const existing = accountTotals.get(code) ?? { debit: 0, credit: 0 };
      existing.debit = r2(existing.debit + line.debit);
      existing.credit = r2(existing.credit + line.credit);
      accountTotals.set(code, existing);
    }
  }

  const accounts: TrialBalanceRow[] = [];
  let totalDebit = 0;
  let totalCredit = 0;
  let debitBalance = 0;
  let creditBalance = 0;

  for (const [code, totals] of accountTotals) {
    const db = totals.debit > totals.credit ? r2(totals.debit - totals.credit) : 0;
    const cb = totals.credit > totals.debit ? r2(totals.credit - totals.debit) : 0;
    accounts.push({
      accountCode: code,
      accountName: getAccountName(code),
      totalDebit: totals.debit,
      totalCredit: totals.credit,
      debitBalance: db,
      creditBalance: cb,
    });
    totalDebit = r2(totalDebit + totals.debit);
    totalCredit = r2(totalCredit + totals.credit);
    debitBalance = r2(debitBalance + db);
    creditBalance = r2(creditBalance + cb);
  }

  accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  return {
    period,
    generatedAt: new Date().toISOString(),
    accounts,
    totals: { totalDebit, totalCredit, debitBalance, creditBalance },
    isBalanced:
      Math.abs(totalDebit - totalCredit) < 0.01 &&
      Math.abs(debitBalance - creditBalance) < 0.01,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BALANCE DE SITUACIÓN (Balance Sheet)
// INVARIANTE: Activo = Pasivo + Patrimonio Neto
// ═══════════════════════════════════════════════════════════════════════════════

export function generateBalanceSheet(
  journalEntries: JournalEntry[],
  date: string,
): BalanceSheet {
  const balances = getAllAccountBalances(journalEntries);
  const chart = getFullChartOfAccounts();

  function buildGroup(
    label: string,
    filter: (code: string) => boolean,
  ): BalanceGroup {
    const groupAccounts: { code: string; name: string; balance: number }[] = [];
    for (const account of chart) {
      if (filter(account.code)) {
        const bal = balances.get(account.code) ?? 0;
        if (Math.abs(bal) >= 0.01) {
          groupAccounts.push({ code: account.code, name: account.name, balance: bal });
        }
      }
    }
    return {
      label,
      accounts: groupAccounts.sort((a, b) => a.code.localeCompare(b.code)),
      subtotal: r2(groupAccounts.reduce((s, a) => s + a.balance, 0)),
    };
  }

  const assets: BalanceGroup[] = [
    buildGroup("Inmovilizado", (c) => c.startsWith("2") && !c.startsWith("28")),
    buildGroup("Amort. acumulada", (c) => c.startsWith("28")),
    buildGroup("Existencias", (c) => c.startsWith("3")),
    buildGroup("Deudores comerciales", (c) => c.startsWith("43") || c.startsWith("44")),
    buildGroup("HP deudora", (c) => c.startsWith("470") || c.startsWith("472") || c.startsWith("473")),
    buildGroup("Tesorería", (c) => c.startsWith("57")),
    buildGroup("Otros activos", (c) => c.startsWith("55")),
  ];

  const liabilities: BalanceGroup[] = [
    buildGroup("Deudas a L/P", (c) => c.startsWith("17")),
    buildGroup("Deudas a C/P", (c) => c.startsWith("52")),
    buildGroup("Proveedores", (c) => c.startsWith("40") || c.startsWith("41")),
    buildGroup("HP acreedora", (c) => c.startsWith("475") || c.startsWith("476") || c.startsWith("477")),
    buildGroup("Rem. pendientes", (c) => c.startsWith("465")),
  ];

  const equity: BalanceGroup[] = [
    buildGroup("Capital y reservas", (c) => c.startsWith("10") || c.startsWith("11") || c.startsWith("12")),
  ];

  const totalAssets = r2(assets.reduce((s, g) => s + g.subtotal, 0));
  const totalLiab = r2(liabilities.reduce((s, g) => s + g.subtotal, 0));
  const totalEquity = r2(equity.reduce((s, g) => s + g.subtotal, 0));
  const totalLiabilitiesAndEquity = r2(totalLiab + totalEquity);

  return {
    date,
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilitiesAndEquity,
    isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
    difference: r2(totalAssets - totalLiabilitiesAndEquity),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUENTA DE PÉRDIDAS Y GANANCIAS (P&L — formato PGC)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateProfitAndLoss(
  journalEntries: JournalEntry[],
  period: string,
): ProfitAndLoss {
  const balances = getAllAccountBalances(journalEntries);

  function section(label: string, codes: string[]): PLSection {
    const accounts: { code: string; name: string; amount: number }[] = [];
    for (const code of codes) {
      const bal = balances.get(code) ?? 0;
      if (Math.abs(bal) >= 0.01) {
        accounts.push({ code, name: getAccountName(code), amount: bal });
      }
    }
    return {
      label,
      accounts,
      subtotal: r2(accounts.reduce((s, a) => s + a.amount, 0)),
    };
  }

  const operatingIncome: PLSection[] = [
    section("Importe neto cifra de negocios", ["700", "705"]),
    section("Devoluciones y rappels", ["708", "709"]),
    section("Otros ingresos de explotación", ["759", "778"]),
  ];

  const operatingExpenses: PLSection[] = [
    section("Aprovisionamientos", ["600", "602", "608"]),
    section("Variación de existencias", ["610"]),
    section("Gastos de personal", ["640", "642", "649"]),
    section("Otros gastos de explotación", ["621", "622", "623", "624", "625", "626", "627", "628", "629"]),
    section("Otros tributos", ["631"]),
    section("Amortizaciones", ["681", "682"]),
    section("Deterioro y pérdidas", ["650", "694"]),
  ];

  const financialIncome: PLSection[] = [
    section("Ingresos financieros", ["769", "794"]),
  ];

  const financialExpenses: PLSection[] = [
    section("Gastos financieros", ["662", "669", "678"]),
  ];

  const opIncomeTotal = r2(operatingIncome.reduce((s, sec) => s + sec.subtotal, 0));
  const opExpenseTotal = r2(operatingExpenses.reduce((s, sec) => s + sec.subtotal, 0));
  const operatingResult = r2(opIncomeTotal - opExpenseTotal);

  const finIncomeTotal = r2(financialIncome.reduce((s, sec) => s + sec.subtotal, 0));
  const finExpenseTotal = r2(financialExpenses.reduce((s, sec) => s + sec.subtotal, 0));
  const financialResult = r2(finIncomeTotal - finExpenseTotal);

  const preTaxResult = r2(operatingResult + financialResult);
  const taxExpense = balances.get("630") ?? 0;
  const netResult = r2(preTaxResult - taxExpense);

  return {
    period,
    operatingIncome,
    operatingExpenses,
    operatingResult,
    financialIncome,
    financialExpenses,
    financialResult,
    preTaxResult,
    taxExpense,
    netResult,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-VALIDATION: 4 MÉTODOS INDEPENDIENTES
// ═══════════════════════════════════════════════════════════════════════════════

import type { CrossValidationResult, ValidationMethod } from "@/types/accounting";
import type { InvoiceRecord } from "@/types/fiscal";

/**
 * 4 métodos independientes que DEBEN coincidir al céntimo.
 * Si alguno difiere → ALERTA CRÍTICA.
 */
export function runCrossValidation(
  invoices: InvoiceRecord[],
  journalEntries: JournalEntry[],
  period: string,
): CrossValidationResult {
  const activeInvoices = invoices.filter((i) => i.status !== "anulada");
  const postedEntries = journalEntries.filter((e) => e.status === "posted");
  const discrepancies: string[] = [];

  // ── Método A: Saldo de cuentas del libro diario ──
  const balances = getAllAccountBalances(postedEntries);
  const revenueA = r2((balances.get("700") ?? 0) - (balances.get("708") ?? 0) - (balances.get("709") ?? 0));
  const vatA = balances.get("477") ?? 0;
  const methodA: ValidationMethod = {
    name: "A: Libro Diario (cuentas 700-708-709)",
    revenue: revenueA,
    vat: vatA,
    detail: `700=${(balances.get("700") ?? 0).toFixed(2)}, 708=${(balances.get("708") ?? 0).toFixed(2)}, 477=${vatA.toFixed(2)}`,
  };

  // ── Método B: Suma de líneas de factura ──
  let revenueB = 0;
  let vatB = 0;
  for (const inv of activeInvoices) {
    const sign = inv.invoiceType === "rectificativa" ? -1 : 1;
    revenueB = r2(revenueB + sign * inv.totals.totalTaxableBase);
    vatB = r2(vatB + sign * inv.totals.totalVAT);
  }
  const methodB: ValidationMethod = {
    name: "B: Suma líneas de factura",
    revenue: revenueB,
    vat: vatB,
    detail: `${activeInvoices.length} facturas activas`,
  };

  // ── Método C: Agregación de taxBreakdown ──
  let revenueC = 0;
  let vatC = 0;
  for (const inv of activeInvoices) {
    const sign = inv.invoiceType === "rectificativa" ? -1 : 1;
    for (const tb of inv.taxBreakdown) {
      revenueC = r2(revenueC + sign * tb.taxableBase);
      vatC = r2(vatC + sign * tb.vatAmount);
    }
  }
  const methodC: ValidationMethod = {
    name: "C: Agregación taxBreakdown",
    revenue: revenueC,
    vat: vatC,
    detail: "Suma de desglose fiscal agrupado por tipo IVA",
  };

  // ── Método D: Balance de comprobación ──
  const trial = generateTrialBalance(postedEntries, period);
  const revenueD = r2(
    trial.accounts
      .filter((a) => a.accountCode === "700")
      .reduce((s, a) => s + a.creditBalance, 0) -
    trial.accounts
      .filter((a) => a.accountCode === "708" || a.accountCode === "709")
      .reduce((s, a) => s + a.debitBalance, 0),
  );
  const vatD = r2(
    trial.accounts
      .filter((a) => a.accountCode === "477")
      .reduce((s, a) => s + a.creditBalance, 0),
  );
  const methodD: ValidationMethod = {
    name: "D: Balance de Comprobación",
    revenue: revenueD,
    vat: vatD,
    detail: `Balance ${trial.isBalanced ? "CUADRADO" : "DESCUADRADO"}`,
  };

  // ── Comparar los 4 ──
  const revenues = [revenueA, revenueB, revenueC, revenueD];
  const vats = [vatA, vatB, vatC, vatD];
  const methods = ["A", "B", "C", "D"];

  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      if (Math.abs(revenues[i] - revenues[j]) >= 0.01) {
        discrepancies.push(
          `Ingresos: Método ${methods[i]} (${revenues[i].toFixed(2)}) ≠ Método ${methods[j]} (${revenues[j].toFixed(2)})`,
        );
      }
      if (Math.abs(vats[i] - vats[j]) >= 0.01) {
        discrepancies.push(
          `IVA: Método ${methods[i]} (${vats[i].toFixed(2)}) ≠ Método ${methods[j]} (${vats[j].toFixed(2)})`,
        );
      }
    }
  }

  const maxRevDiff = Math.max(...revenues) - Math.min(...revenues);
  const maxVatDiff = Math.max(...vats) - Math.min(...vats);

  return {
    timestamp: new Date().toISOString(),
    period,
    methodA,
    methodB,
    methodC,
    methodD,
    allAgree: discrepancies.length === 0,
    maxDiscrepancy: r2(Math.max(maxRevDiff, maxVatDiff)),
    discrepancies,
  };
}
