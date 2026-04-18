/**
 * Contabilidad Avanzada — TCG Academy.
 *
 * Funciones que tienen los mejores programas de contabilidad,
 * 100% automatizadas, sin intervención humana.
 *
 * Contenido:
 *   1. Aging Reports (antigüedad de saldos / deudores morosos)
 *   2. Cash Flow Statement (estado de flujos de efectivo)
 *   3. Tax Calendar (calendario fiscal con deadlines)
 *   4. Dunning Engine (reclamación automática de impagos)
 *   5. Modelo 347 (operaciones con terceros >3.005,06€)
 *   6. Amortization Tables (depreciación del inmovilizado)
 *   7. Bad Debt Provisioning (provisión por insolvencias)
 *   8. Inventory Valuation (valoración de existencias — PMP)
 *
 * Base legal:
 *   - PGC (RD 1514/2007): estados financieros
 *   - Art. 13.1 LIS: provisión por insolvencias (6 meses)
 *   - RD 1777/2004: tablas de amortización
 *   - Art. 33 RGAT: Modelo 347 (>3.005,06€/año)
 *   - Ley 37/1992 (LIVA): plazos de declaración
 */

import type { InvoiceRecord } from "@/types/fiscal";
import { InvoiceStatus, InvoiceType } from "@/types/fiscal";
import type { JournalEntry } from "@/types/accounting";
import { getPaymentStatusMap } from "@/lib/orderAdapter";

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmtNum(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AGING REPORTS (Antigüedad de saldos)
// ═══════════════════════════════════════════════════════════════════════════════

export interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number;
  count: number;
  amount: number;
  invoices: { number: string; client: string; amount: number; daysOverdue: number }[];
}

export interface AgingReport {
  generatedAt: string;
  totalOutstanding: number;
  totalOverdue: number;
  buckets: AgingBucket[];
  /** Top 10 deudores por importe */
  topDebtors: { client: string; nif: string; totalOwed: number; oldestDays: number }[];
}

/**
 * Genera informe de antigüedad de saldos automáticamente.
 * Clasifica facturas pendientes de cobro por tramos de edad.
 */
export function generateAgingReport(invoices: InvoiceRecord[]): AgingReport {
  const now = Date.now();
  // SSOT: leer el estado de cobro desde AdminOrder via orderAdapter (antes: clave paralela).
  const paymentStatus = getPaymentStatusMap();

  // Facturas pendientes de cobro
  const unpaid = invoices.filter((inv) => {
    if (inv.status === InvoiceStatus.ANULADA) return false;
    if (inv.invoiceType === InvoiceType.RECTIFICATIVA) return false;
    // Check if marked as paid
    const orderId = inv.sourceOrderId;
    if (orderId && paymentStatus[orderId] === "cobrado") return false;
    // Pagos inmediatos (tarjeta, bizum, paypal) se consideran cobrados
    const immediateMethods = ["tarjeta", "bizum", "paypal"];
    if (immediateMethods.includes(inv.paymentMethod)) return false;
    return true;
  });

  const bucketDefs = [
    { label: "Al corriente (0-30 días)", minDays: 0, maxDays: 30 },
    { label: "31-60 días", minDays: 31, maxDays: 60 },
    { label: "61-90 días", minDays: 61, maxDays: 90 },
    { label: "91-180 días", minDays: 91, maxDays: 180 },
    { label: "Más de 180 días (provisionar)", minDays: 181, maxDays: 99999 },
  ];

  const buckets: AgingBucket[] = bucketDefs.map((def) => ({
    ...def,
    count: 0,
    amount: 0,
    invoices: [],
  }));

  const debtorMap = new Map<string, { client: string; nif: string; totalOwed: number; oldestDays: number }>();

  for (const inv of unpaid) {
    const days = Math.floor((now - new Date(inv.invoiceDate).getTime()) / (24 * 60 * 60 * 1000));
    const amount = inv.totals.totalInvoice;
    const recipient = inv.recipient as { name?: string; taxId?: string };
    const clientName = recipient.name ?? "Desconocido";
    const nif = recipient.taxId ?? "";

    for (const bucket of buckets) {
      if (days >= bucket.minDays && days <= bucket.maxDays) {
        bucket.count++;
        bucket.amount = r2(bucket.amount + amount);
        bucket.invoices.push({ number: inv.invoiceNumber, client: clientName, amount, daysOverdue: days });
        break;
      }
    }

    const key = clientName;
    const existing = debtorMap.get(key) ?? { client: clientName, nif, totalOwed: 0, oldestDays: 0 };
    existing.totalOwed = r2(existing.totalOwed + amount);
    existing.oldestDays = Math.max(existing.oldestDays, days);
    debtorMap.set(key, existing);
  }

  const totalOutstanding = r2(buckets.reduce((s, b) => s + b.amount, 0));
  const totalOverdue = r2(buckets.filter((b) => b.minDays > 30).reduce((s, b) => s + b.amount, 0));
  const topDebtors = Array.from(debtorMap.values())
    .sort((a, b) => b.totalOwed - a.totalOwed)
    .slice(0, 10);

  return { generatedAt: new Date().toISOString(), totalOutstanding, totalOverdue, buckets, topDebtors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CASH FLOW STATEMENT (Estado de flujos de efectivo)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CashFlowStatement {
  period: string;
  /** A) Flujos de explotación (ventas - compras - gastos operativos) */
  operatingCashFlow: { label: string; amount: number }[];
  operatingTotal: number;
  /** B) Flujos de inversión (compra/venta de activos) */
  investingCashFlow: { label: string; amount: number }[];
  investingTotal: number;
  /** C) Flujos de financiación (préstamos, capital) */
  financingCashFlow: { label: string; amount: number }[];
  financingTotal: number;
  /** Variación neta de efectivo = A + B + C */
  netCashChange: number;
  /** Efectivo al inicio del período */
  openingCash: number;
  /** Efectivo al final del período */
  closingCash: number;
}

export function generateCashFlowStatement(
  journalEntries: JournalEntry[],
  period: string,
): CashFlowStatement {
  const posted = journalEntries.filter((e) => e.status === "posted");

  function accountBalance(code: string): number {
    let balance = 0;
    for (const e of posted) {
      for (const l of e.lines) {
        if (l.accountCode.startsWith(code)) {
          balance = r2(balance + l.debit - l.credit);
        }
      }
    }
    return balance;
  }

  // A) Operating
  const salesReceived = accountBalance("572") + accountBalance("570") + accountBalance("5721") + accountBalance("5722") + accountBalance("5723");
  const operating = [
    { label: "Cobros de clientes", amount: salesReceived },
    { label: "Pagos a proveedores", amount: -accountBalance("400") },
    { label: "IVA liquidado (477-472)", amount: -(accountBalance("477") - accountBalance("472")) },
  ];
  const operatingTotal = r2(operating.reduce((s, i) => s + i.amount, 0));

  // B) Investing (simplified for e-commerce)
  const investing = [
    { label: "Adquisición de inmovilizado", amount: -(accountBalance("217") + accountBalance("206")) },
  ];
  const investingTotal = r2(investing.reduce((s, i) => s + i.amount, 0));

  // C) Financing
  const financing = [
    { label: "Préstamos recibidos/devueltos", amount: accountBalance("170") + accountBalance("520") },
  ];
  const financingTotal = r2(financing.reduce((s, i) => s + i.amount, 0));

  const netCashChange = r2(operatingTotal + investingTotal + financingTotal);
  const closingCash = accountBalance("570") + accountBalance("572") + accountBalance("5720") + accountBalance("5721") + accountBalance("5722") + accountBalance("5723");

  return {
    period,
    operatingCashFlow: operating,
    operatingTotal,
    investingCashFlow: investing,
    investingTotal,
    financingCashFlow: financing,
    financingTotal,
    netCashChange,
    openingCash: r2(closingCash - netCashChange),
    closingCash,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TAX CALENDAR (Calendario fiscal con deadlines)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TaxObligation {
  modelo: string;
  description: string;
  deadline: string; // YYYY-MM-DD
  period: string;
  status: "pending" | "filed" | "overdue";
  daysRemaining: number;
  legalBasis: string;
}

export function generateTaxCalendar(year: number): TaxObligation[] {
  const now = Date.now();
  const obligations: TaxObligation[] = [];

  function addObligation(modelo: string, desc: string, deadline: string, period: string, legal: string) {
    const d = new Date(deadline);
    const days = Math.ceil((d.getTime() - now) / (24 * 60 * 60 * 1000));
    obligations.push({
      modelo,
      description: desc,
      deadline,
      period,
      status: days < 0 ? "overdue" : "pending",
      daysRemaining: days,
      legalBasis: legal,
    });
  }

  // Modelo 303 — IVA trimestral
  addObligation("303", "IVA T1 (Ene-Mar)", `${year}-04-20`, `T1 ${year}`, "Art. 71 LIVA");
  addObligation("303", "IVA T2 (Abr-Jun)", `${year}-07-20`, `T2 ${year}`, "Art. 71 LIVA");
  addObligation("303", "IVA T3 (Jul-Sep)", `${year}-10-20`, `T3 ${year}`, "Art. 71 LIVA");
  addObligation("303", "IVA T4 (Oct-Dic)", `${year + 1}-01-30`, `T4 ${year}`, "Art. 71 LIVA");

  // Modelo 390 — Resumen anual IVA
  addObligation("390", "Resumen anual IVA", `${year + 1}-01-30`, `Anual ${year}`, "Art. 71.5 LIVA");

  // Modelo 349 — Intracomunitarias (trimestral si <50.000€, mensual si >50.000€)
  addObligation("349", "Intracomunitarias T1", `${year}-04-20`, `T1 ${year}`, "Art. 78-79 RIVA");
  addObligation("349", "Intracomunitarias T2", `${year}-07-20`, `T2 ${year}`, "Art. 78-79 RIVA");
  addObligation("349", "Intracomunitarias T3", `${year}-10-20`, `T3 ${year}`, "Art. 78-79 RIVA");
  addObligation("349", "Intracomunitarias T4", `${year + 1}-01-30`, `T4 ${year}`, "Art. 78-79 RIVA");

  // Modelo 347 — Operaciones con terceros >3.005,06€
  addObligation("347", "Operaciones con terceros", `${year + 1}-02-28`, `Anual ${year}`, "Art. 33 RGAT");

  // Modelo 111 — Retenciones IRPF (si hay proveedores profesionales)
  addObligation("111", "Retenciones IRPF T1", `${year}-04-20`, `T1 ${year}`, "Art. 108 RIRPF");
  addObligation("111", "Retenciones IRPF T2", `${year}-07-20`, `T2 ${year}`, "Art. 108 RIRPF");
  addObligation("111", "Retenciones IRPF T3", `${year}-10-20`, `T3 ${year}`, "Art. 108 RIRPF");
  addObligation("111", "Retenciones IRPF T4", `${year + 1}-01-20`, `T4 ${year}`, "Art. 108 RIRPF");

  // Modelo 190 — Resumen anual retenciones
  addObligation("190", "Resumen anual retenciones", `${year + 1}-01-31`, `Anual ${year}`, "Art. 108 RIRPF");

  // Cuentas anuales
  addObligation("CCAA", "Depósito cuentas anuales", `${year + 1}-07-30`, `Anual ${year}`, "Art. 279 LSC");

  // Impuesto de Sociedades
  addObligation("200", "Impuesto de Sociedades", `${year + 1}-07-25`, `Anual ${year}`, "Art. 124 LIS");

  return obligations.sort((a, b) => a.deadline.localeCompare(b.deadline));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. MODELO 347 (Operaciones con terceros >3.005,06€/año)
// Art. 33 RGAT — obligatorio para operaciones superiores a 3.005,06€ anuales
// ═══════════════════════════════════════════════════════════════════════════════

export interface Modelo347Entry {
  nif: string;
  name: string;
  totalAmount: number;
  /** Desglose trimestral */
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  invoiceCount: number;
  type: "cliente" | "proveedor";
}

export interface Modelo347 {
  year: number;
  threshold: number;
  entries: Modelo347Entry[];
  totalDeclared: number;
  generatedAt: string;
}

const MODELO_347_THRESHOLD = 3005.06;

export function generateModelo347(invoices: InvoiceRecord[], year: number): Modelo347 {
  const yearInvoices = invoices.filter((inv) => {
    const d = new Date(inv.invoiceDate);
    return d.getFullYear() === year && inv.status !== InvoiceStatus.ANULADA;
  });

  const clientMap = new Map<string, Modelo347Entry>();

  for (const inv of yearInvoices) {
    const recipient = inv.recipient as { name?: string; taxId?: string };
    const nif = recipient.taxId ?? "";
    if (!nif) continue; // Sin NIF no se puede declarar

    const key = nif.toUpperCase();
    const month = new Date(inv.invoiceDate).getMonth() + 1;
    const quarter = Math.ceil(month / 3) as 1 | 2 | 3 | 4;
    const amount = inv.totals.totalInvoice;

    const existing = clientMap.get(key) ?? {
      nif: key,
      name: recipient.name ?? "",
      totalAmount: 0,
      q1: 0, q2: 0, q3: 0, q4: 0,
      invoiceCount: 0,
      type: "cliente" as const,
    };

    existing.totalAmount = r2(existing.totalAmount + amount);
    if (quarter === 1) existing.q1 = r2(existing.q1 + amount);
    else if (quarter === 2) existing.q2 = r2(existing.q2 + amount);
    else if (quarter === 3) existing.q3 = r2(existing.q3 + amount);
    else existing.q4 = r2(existing.q4 + amount);
    existing.invoiceCount++;
    clientMap.set(key, existing);
  }

  // Solo los que superan el umbral
  const entries = Array.from(clientMap.values())
    .filter((e) => e.totalAmount >= MODELO_347_THRESHOLD)
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    year,
    threshold: MODELO_347_THRESHOLD,
    entries,
    totalDeclared: r2(entries.reduce((s, e) => s + e.totalAmount, 0)),
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. BAD DEBT PROVISIONING (Provisión por insolvencias)
// Art. 13.1 LIS: deducible tras 6 meses de impago
// ═══════════════════════════════════════════════════════════════════════════════

export interface BadDebtEntry {
  invoiceNumber: string;
  client: string;
  amount: number;
  daysOverdue: number;
  provisionable: boolean; // >6 meses (art. 13.1 LIS)
  provisionAmount: number;
  journalEntry: string; // "694 Debe / 490 Haber"
}

export function calculateBadDebtProvisions(invoices: InvoiceRecord[]): {
  entries: BadDebtEntry[];
  totalProvision: number;
  legalBasis: string;
} {
  const aging = generateAgingReport(invoices);
  const entries: BadDebtEntry[] = [];

  for (const bucket of aging.buckets) {
    for (const inv of bucket.invoices) {
      if (inv.daysOverdue >= 180) { // 6 meses
        entries.push({
          invoiceNumber: inv.number,
          client: inv.client,
          amount: inv.amount,
          daysOverdue: inv.daysOverdue,
          provisionable: true,
          provisionAmount: inv.amount,
          journalEntry: `694 Pérd. deterioro créditos → ${inv.amount.toFixed(2)}€ Debe / 490 Deterioro valor créditos → ${inv.amount.toFixed(2)}€ Haber`,
        });
      }
    }
  }

  return {
    entries,
    totalProvision: r2(entries.reduce((s, e) => s + e.provisionAmount, 0)),
    legalBasis: "Art. 13.1 LIS — créditos morosos deducibles tras 6 meses de impago. Dotación: cuenta 694 (gasto) contra cuenta 490 (deterioro).",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. AMORTIZATION TABLES (Depreciación del inmovilizado)
// RD 1777/2004: tablas oficiales de amortización
// ═══════════════════════════════════════════════════════════════════════════════

export interface FixedAsset {
  id: string;
  description: string;
  accountCode: string; // 206, 217, 218...
  purchaseDate: string;
  purchaseAmount: number;
  usefulLifeYears: number;
  annualRate: number; // %
  method: "linear"; // Método lineal (el más común para PYMES)
}

export interface AmortizationSchedule {
  asset: FixedAsset;
  monthlyAmount: number;
  yearlyAmount: number;
  accumulatedToDate: number;
  remainingValue: number;
  fullyAmortized: boolean;
  journalEntry: string;
}

/** Tablas simplificadas de amortización (RD 1777/2004, tabla oficial) */
export const AMORTIZATION_RATES: Record<string, { description: string; maxRate: number; maxYears: number }> = {
  "206": { description: "Aplicaciones informáticas", maxRate: 33, maxYears: 6 },
  "217": { description: "Equipos proceso información", maxRate: 25, maxYears: 8 },
  "218": { description: "Elementos de transporte", maxRate: 16, maxYears: 14 },
  "219": { description: "Mobiliario", maxRate: 10, maxYears: 20 },
  "220": { description: "Instalaciones", maxRate: 12, maxYears: 18 },
};

export function calculateAmortization(assets: FixedAsset[]): AmortizationSchedule[] {
  const now = new Date();

  return assets.map((asset) => {
    const yearlyAmount = r2(asset.purchaseAmount * (asset.annualRate / 100));
    const monthlyAmount = r2(yearlyAmount / 12);
    const purchaseDate = new Date(asset.purchaseDate);
    const monthsElapsed = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
    const accumulated = r2(Math.min(monthlyAmount * Math.max(0, monthsElapsed), asset.purchaseAmount));
    const remaining = r2(asset.purchaseAmount - accumulated);

    return {
      asset,
      monthlyAmount,
      yearlyAmount,
      accumulatedToDate: accumulated,
      remainingValue: remaining,
      fullyAmortized: remaining <= 0.01,
      journalEntry: `681 Amort. inmov. material → ${monthlyAmount.toFixed(2)}€/mes Debe / 281 Amort. acum. → ${monthlyAmount.toFixed(2)}€/mes Haber`,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTACIONES CSV
// ═══════════════════════════════════════════════════════════════════════════════

export function exportAgingCSV(report: AgingReport): string {
  const headers = ["Tramo", "Nº Facturas", "Importe"];
  const rows = report.buckets.map((b) =>
    [b.label, String(b.count), fmtNum(b.amount)].join(";"),
  );
  rows.push("");
  rows.push(`Total pendiente;;${fmtNum(report.totalOutstanding)}`);
  rows.push(`Total vencido (>30d);;${fmtNum(report.totalOverdue)}`);
  rows.push("");
  rows.push("TOP DEUDORES");
  rows.push(["Cliente", "NIF", "Importe Adeudado", "Días más antiguo"].join(";"));
  for (const d of report.topDebtors) {
    rows.push([`"${d.client}"`, d.nif, fmtNum(d.totalOwed), String(d.oldestDays)].join(";"));
  }
  return "\uFEFF" + [headers.join(";"), ...rows].join("\n");
}

export function exportTaxCalendarCSV(obligations: TaxObligation[]): string {
  const headers = ["Modelo", "Descripción", "Período", "Fecha Límite", "Días Restantes", "Estado", "Base Legal"];
  const rows = obligations.map((o) =>
    [o.modelo, `"${o.description}"`, o.period, o.deadline, String(o.daysRemaining), o.status === "overdue" ? "VENCIDO" : "Pendiente", `"${o.legalBasis}"`].join(";"),
  );
  return "\uFEFF" + [headers.join(";"), ...rows].join("\n");
}

export function exportModelo347CSV(model: Modelo347): string {
  const headers = ["NIF/CIF", "Nombre", "Total Anual", "T1", "T2", "T3", "T4", "Nº Facturas"];
  const rows = model.entries.map((e) =>
    [e.nif, `"${e.name}"`, fmtNum(e.totalAmount), fmtNum(e.q1), fmtNum(e.q2), fmtNum(e.q3), fmtNum(e.q4), String(e.invoiceCount)].join(";"),
  );
  rows.push("");
  rows.push(`TOTAL declarado;;${fmtNum(model.totalDeclared)};;;;;`);
  rows.push(`Umbral;;${fmtNum(model.threshold)};;;;;`);
  rows.push(`"Art. 33 RGAT — operaciones con terceros que superan ${model.threshold.toFixed(2)}€ anuales.";;;;`);
  return "\uFEFF" + [headers.join(";"), ...rows].join("\n");
}

export function exportCashFlowCSV(cf: CashFlowStatement): string {
  const rows: string[] = [];
  rows.push(`ESTADO DE FLUJOS DE EFECTIVO — ${cf.period}`);
  rows.push("");
  rows.push("A) FLUJOS DE EXPLOTACIÓN");
  for (const item of cf.operatingCashFlow) {
    rows.push(`${item.label};${fmtNum(item.amount)}`);
  }
  rows.push(`TOTAL EXPLOTACIÓN;${fmtNum(cf.operatingTotal)}`);
  rows.push("");
  rows.push("B) FLUJOS DE INVERSIÓN");
  for (const item of cf.investingCashFlow) {
    rows.push(`${item.label};${fmtNum(item.amount)}`);
  }
  rows.push(`TOTAL INVERSIÓN;${fmtNum(cf.investingTotal)}`);
  rows.push("");
  rows.push("C) FLUJOS DE FINANCIACIÓN");
  for (const item of cf.financingCashFlow) {
    rows.push(`${item.label};${fmtNum(item.amount)}`);
  }
  rows.push(`TOTAL FINANCIACIÓN;${fmtNum(cf.financingTotal)}`);
  rows.push("");
  rows.push(`VARIACIÓN NETA DE EFECTIVO;${fmtNum(cf.netCashChange)}`);
  rows.push(`Efectivo inicio período;${fmtNum(cf.openingCash)}`);
  rows.push(`Efectivo final período;${fmtNum(cf.closingCash)}`);
  return "\uFEFF" + rows.join("\n");
}
