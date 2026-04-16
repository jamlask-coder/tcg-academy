/**
 * Sistema de Auditoría Fiscal — TCG Academy
 *
 * BLINDADO para inspecciones de Hacienda / AEAT.
 *
 * Principios:
 *   1. TRIPLE CONTEO: cada importe se calcula por 3 vías independientes.
 *      Si alguna vía difiere en ≥0.01€, se marca como DISCREPANCIA.
 *   2. TRAZABILIDAD TOTAL: cada factura → pedido, cada rectificativa → original,
 *      cada devolución → factura rectificativa.
 *   3. INMUTABILIDAD: las facturas emitidas NUNCA se modifican. Solo se anulan
 *      y se emiten rectificativas.
 *   4. CORRELATIVIDAD: sin saltos en la numeración (art. 6 RD 1619/2012).
 *
 * Base legal:
 *   - Ley 37/1992 (LIVA) — Ley del IVA
 *   - RD 1619/2012 — Reglamento de facturación
 *   - RD 1007/2023 — VeriFactu / Sistemas informáticos
 *   - Ley 11/2021 — Ley Antifraude
 *   - Art. 28-30 Código de Comercio — Libros obligatorios
 *   - PGC (Plan General Contable) — Para Balance y Cuenta de Resultados
 */

import type {
  InvoiceRecord,
  InvoiceLineItem,
  TaxBreakdown,
} from "@/types/fiscal";
import { InvoiceStatus, InvoiceType } from "@/types/fiscal";
import type { Quarter } from "@/types/tax";
import {
  calculateVAT,
  calculateTaxBreakdown,
  filterByPeriod,
  getTaxPeriod,
  generateQuarterlyReport,
  generateAnnualReport,
} from "@/services/taxService";
import { loadInvoices, verifyIntegrity } from "@/services/invoiceService";

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 1: REDONDEO Y ARITMÉTICA DE PRECISIÓN
// ═══════════════════════════════════════════════════════════════════════════════

/** Redondeo bancario a 2 decimales (el estándar fiscal español) */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compara dos importes con tolerancia de 0 céntimos.
 * En fiscal, NO hay tolerancia: 0.01€ es una discrepancia.
 */
function exactMatch(a: number, b: number): boolean {
  return Math.abs(r2(a) - r2(b)) < 0.001; // < 0.1 céntimo
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 2: TRIPLE CONTEO DEL IVA
// Tres métodos independientes para calcular el IVA de una factura.
// Si los 3 coinciden → OK. Si alguno difiere → ALERTA.
// ═══════════════════════════════════════════════════════════════════════════════

export interface TripleCheckResult {
  invoiceId: string;
  invoiceNumber: string;
  /** Método 1: suma de líneas individuales (bottom-up) */
  method1_lineSum: {
    totalBase: number;
    totalVAT: number;
    totalInvoice: number;
  };
  /** Método 2: recalcular desde precios brutos (top-down) */
  method2_fromGross: {
    totalBase: number;
    totalVAT: number;
    totalInvoice: number;
  };
  /** Método 3: desde el desglose fiscal (taxBreakdown) */
  method3_breakdown: {
    totalBase: number;
    totalVAT: number;
    totalInvoice: number;
  };
  /** Coinciden los 3 métodos */
  allMatch: boolean;
  /** Diferencias detectadas (vacío si allMatch) */
  discrepancies: string[];
}

/**
 * TRIPLE CONTEO: calcula el IVA de una factura por 3 vías independientes.
 * Si alguna vía difiere en ≥0.01€, genera una discrepancia.
 */
export function tripleCheckInvoice(invoice: InvoiceRecord): TripleCheckResult {
  const discrepancies: string[] = [];

  // ── Método 1: Suma bottom-up de líneas individuales ──
  let m1Base = 0;
  let m1VAT = 0;
  let m1Total = 0;
  for (const line of invoice.items) {
    m1Base = r2(m1Base + line.taxableBase);
    m1VAT = r2(m1VAT + line.vatAmount);
    m1Total = r2(m1Total + line.totalLine);
  }

  // ── Método 2: Recalcular desde cero (precio bruto → base → IVA) ──
  let m2Base = 0;
  let m2VAT = 0;
  let m2Total = 0;
  for (const line of invoice.items) {
    // Recalcular base desde unitPrice (sin IVA) × qty - descuento
    const lineSubtotal = r2(line.unitPrice * line.quantity);
    const lineDiscount = r2(lineSubtotal * (line.discount / 100));
    const lineBase = r2(lineSubtotal - lineDiscount);
    const lineVAT = calculateVAT(lineBase, line.vatRate);
    const lineSurcharge = r2(lineBase * (line.surchargeRate / 100));
    const lineTotal = r2(lineBase + lineVAT + lineSurcharge);

    m2Base = r2(m2Base + lineBase);
    m2VAT = r2(m2VAT + lineVAT);
    m2Total = r2(m2Total + lineTotal);
  }

  // ── Método 3: Desde el desglose fiscal (taxBreakdown) ──
  let m3Base = 0;
  let m3VAT = 0;
  let m3Total = 0;
  for (const tb of invoice.taxBreakdown) {
    m3Base = r2(m3Base + tb.taxableBase);
    m3VAT = r2(m3VAT + tb.vatAmount);
    m3Total = r2(m3Total + tb.total);
  }

  // ── Comparar los 3 métodos ──
  const checkPair = (
    label: string,
    a: number,
    b: number,
    aName: string,
    bName: string,
  ) => {
    if (!exactMatch(a, b)) {
      discrepancies.push(
        `${label}: ${aName}=${a.toFixed(2)} vs ${bName}=${b.toFixed(2)} (diff: ${r2(Math.abs(a - b)).toFixed(2)})`,
      );
    }
  };

  // Base imponible
  checkPair("Base", m1Base, m2Base, "Líneas", "Recálculo");
  checkPair("Base", m1Base, m3Base, "Líneas", "Desglose");
  checkPair("Base", m2Base, m3Base, "Recálculo", "Desglose");

  // Cuota IVA
  checkPair("IVA", m1VAT, m2VAT, "Líneas", "Recálculo");
  checkPair("IVA", m1VAT, m3VAT, "Líneas", "Desglose");

  // Total factura
  checkPair("Total", m1Total, m2Total, "Líneas", "Recálculo");
  checkPair("Total", m1Total, m3Total, "Líneas", "Desglose");

  // También verificar contra invoice.totals
  if (!exactMatch(m1Base, invoice.totals.totalTaxableBase)) {
    discrepancies.push(
      `Base vs Totals: Líneas=${m1Base.toFixed(2)} vs totals.totalTaxableBase=${invoice.totals.totalTaxableBase.toFixed(2)}`,
    );
  }
  if (!exactMatch(m1VAT, invoice.totals.totalVAT)) {
    discrepancies.push(
      `IVA vs Totals: Líneas=${m1VAT.toFixed(2)} vs totals.totalVAT=${invoice.totals.totalVAT.toFixed(2)}`,
    );
  }
  if (!exactMatch(m1Total, invoice.totals.totalInvoice)) {
    discrepancies.push(
      `Total vs Totals: Líneas=${m1Total.toFixed(2)} vs totals.totalInvoice=${invoice.totals.totalInvoice.toFixed(2)}`,
    );
  }

  return {
    invoiceId: invoice.invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    method1_lineSum: { totalBase: m1Base, totalVAT: m1VAT, totalInvoice: m1Total },
    method2_fromGross: { totalBase: m2Base, totalVAT: m2VAT, totalInvoice: m2Total },
    method3_breakdown: { totalBase: m3Base, totalVAT: m3VAT, totalInvoice: m3Total },
    allMatch: discrepancies.length === 0,
    discrepancies,
  };
}

/**
 * Ejecuta el triple conteo sobre TODAS las facturas.
 * Devuelve las que fallan (si las hay).
 */
export function tripleCheckAllInvoices(invoices: InvoiceRecord[]): {
  total: number;
  passed: number;
  failed: TripleCheckResult[];
} {
  const results = invoices
    .filter((inv) => inv.status !== InvoiceStatus.ANULADA)
    .map(tripleCheckInvoice);
  const failed = results.filter((r) => !r.allMatch);
  return {
    total: results.length,
    passed: results.length - failed.length,
    failed,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 3: VERIFICACIÓN DE CORRELATIVIDAD
// Art. 6 RD 1619/2012: numeración correlativa sin saltos.
// ═══════════════════════════════════════════════════════════════════════════════

export interface CorrelativeCheckResult {
  ok: boolean;
  year: number;
  expectedCount: number;
  actualCount: number;
  gaps: string[];
  duplicates: string[];
}

export function checkCorrelativeNumbering(
  invoices: InvoiceRecord[],
  year: number,
): CorrelativeCheckResult {
  const prefix = `FAC-${year}-`;
  const yearInvoices = invoices
    .filter((inv) => inv.invoiceNumber.startsWith(prefix))
    .sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber));

  const gaps: string[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();
  const numbers: number[] = [];

  for (const inv of yearInvoices) {
    if (seen.has(inv.invoiceNumber)) {
      duplicates.push(inv.invoiceNumber);
    }
    seen.add(inv.invoiceNumber);
    const num = parseInt(inv.invoiceNumber.slice(prefix.length), 10);
    if (Number.isFinite(num)) numbers.push(num);
  }

  numbers.sort((a, b) => a - b);
  for (let i = 0; i < numbers.length; i++) {
    const expected = i + 1;
    if (numbers[i] !== expected) {
      gaps.push(`Esperado ${prefix}${String(expected).padStart(5, "0")}, encontrado ${prefix}${String(numbers[i]).padStart(5, "0")}`);
    }
  }

  return {
    ok: gaps.length === 0 && duplicates.length === 0,
    year,
    expectedCount: numbers.length,
    actualCount: yearInvoices.length,
    gaps,
    duplicates,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 4: VERIFICACIÓN DE CADENA DE HASH (VERIFACTU)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChainCheckResult {
  ok: boolean;
  totalInvoices: number;
  brokenLinks: { invoiceNumber: string; detail: string }[];
  integrityHashValid: boolean;
}

export async function checkHashChain(
  invoices: InvoiceRecord[],
): Promise<ChainCheckResult> {
  const sorted = [...invoices].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const brokenLinks: { invoiceNumber: string; detail: string }[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const inv = sorted[i];

    // Cada factura debe tener hash
    if (!inv.verifactuHash) {
      brokenLinks.push({
        invoiceNumber: inv.invoiceNumber,
        detail: "Falta hash VeriFactu",
      });
    }

    if (!inv.verifactuChainHash) {
      brokenLinks.push({
        invoiceNumber: inv.invoiceNumber,
        detail: "Falta hash encadenado",
      });
    }

    // La primera factura no tiene previous
    if (i === 0) continue;

    // Verificar que previousInvoiceChainHash coincide con el chainHash de la anterior
    const prevChain = sorted[i - 1].verifactuChainHash;
    if (inv.previousInvoiceChainHash !== prevChain) {
      brokenLinks.push({
        invoiceNumber: inv.invoiceNumber,
        detail: `previousChainHash no coincide con la factura anterior (${sorted[i - 1].invoiceNumber})`,
      });
    }
  }

  const integrityHashValid = await verifyIntegrity(invoices);

  return {
    ok: brokenLinks.length === 0 && integrityHashValid,
    totalInvoices: sorted.length,
    brokenLinks,
    integrityHashValid,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 5: RECTIFICATIVAS Y DEVOLUCIONES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RectificativeCheckResult {
  ok: boolean;
  total: number;
  issues: string[];
  /** Rectificativas sin original vinculada */
  orphanRectificatives: string[];
  /** Originales anuladas sin rectificativa */
  unlinkedAnnulments: string[];
}

export function checkRectificatives(
  invoices: InvoiceRecord[],
): RectificativeCheckResult {
  const issues: string[] = [];
  const orphanRectificatives: string[] = [];
  const unlinkedAnnulments: string[] = [];

  const rectificativas = invoices.filter(
    (inv) => inv.invoiceType === InvoiceType.RECTIFICATIVA,
  );
  const annulled = invoices.filter(
    (inv) => inv.status === InvoiceStatus.ANULADA,
  );

  // Cada rectificativa debe tener correctionData con original válida
  for (const rect of rectificativas) {
    if (!rect.correctionData) {
      issues.push(`${rect.invoiceNumber}: rectificativa sin datos de corrección`);
      orphanRectificatives.push(rect.invoiceNumber);
      continue;
    }
    const original = invoices.find(
      (inv) => inv.invoiceId === rect.correctionData!.originalInvoiceId,
    );
    if (!original) {
      issues.push(
        `${rect.invoiceNumber}: referencia a original inexistente (${rect.correctionData.originalInvoiceNumber})`,
      );
      orphanRectificatives.push(rect.invoiceNumber);
    }
  }

  // Cada factura anulada debería tener una rectificativa asociada
  for (const ann of annulled) {
    const hasRect = rectificativas.some(
      (r) => r.correctionData?.originalInvoiceId === ann.invoiceId,
    );
    if (!hasRect) {
      // Solo advertencia — anulación sin rectificativa es legal si no se envió al cliente
      unlinkedAnnulments.push(ann.invoiceNumber);
    }
  }

  return {
    ok: issues.length === 0,
    total: rectificativas.length,
    issues,
    orphanRectificatives,
    unlinkedAnnulments,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 6: LIBRO DE FACTURAS EMITIDAS (Art. 63-64 RIVA)
// ═══════════════════════════════════════════════════════════════════════════════

export interface LibroFacturasRow {
  numero: string;
  fecha: string;
  tipo: string;
  cliente: string;
  nifCliente: string;
  baseImponible: number;
  tipoIVA: string;
  cuotaIVA: number;
  recargoEquiv: number;
  totalFactura: number;
  formaPago: string;
  estadoVeriFactu: string;
  rectificaDe: string;
  pedidoOrigen: string;
}

/**
 * Genera el Libro de Facturas Emitidas (obligatorio art. 63-64 RIVA).
 * Incluye TODAS las facturas, incluidas las anuladas y rectificativas.
 */
export function generateLibroFacturas(
  invoices: InvoiceRecord[],
): LibroFacturasRow[] {
  return invoices
    .sort(
      (a, b) =>
        new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime(),
    )
    .map((inv) => {
      const recipient = inv.recipient as { name?: string; taxId?: string };
      const tiposIVA = inv.taxBreakdown.map((b) => `${b.vatRate}%`).join(", ");

      return {
        numero: inv.invoiceNumber,
        fecha: formatDate(inv.invoiceDate),
        tipo:
          inv.invoiceType === InvoiceType.RECTIFICATIVA
            ? "RECTIFICATIVA"
            : inv.invoiceType === InvoiceType.SIMPLIFICADA
              ? "SIMPLIFICADA"
              : inv.status === InvoiceStatus.ANULADA
                ? "ANULADA"
                : "COMPLETA",
        cliente: recipient.name ?? "",
        nifCliente: recipient.taxId ?? "",
        baseImponible: inv.totals.totalTaxableBase,
        tipoIVA: tiposIVA,
        cuotaIVA: inv.totals.totalVAT,
        recargoEquiv: inv.totals.totalSurcharge,
        totalFactura: inv.totals.totalInvoice,
        formaPago: inv.paymentMethod,
        estadoVeriFactu: inv.verifactuStatus,
        rectificaDe: inv.correctionData?.originalInvoiceNumber ?? "",
        pedidoOrigen: inv.sourceOrderId ?? "",
      };
    });
}

/**
 * Exporta el Libro de Facturas Emitidas a CSV.
 * BOM UTF-8 + separador ; para Excel español.
 */
export function exportLibroFacturasCSV(invoices: InvoiceRecord[]): string {
  const rows = generateLibroFacturas(invoices);
  const headers = [
    "Nº Factura",
    "Fecha",
    "Tipo",
    "Cliente",
    "NIF/CIF Cliente",
    "Base Imponible",
    "Tipo(s) IVA",
    "Cuota IVA",
    "Recargo Equiv.",
    "Total Factura",
    "Forma de Pago",
    "Estado VeriFactu",
    "Rectifica a",
    "Pedido Origen",
  ];

  const csvRows = rows.map((r) =>
    [
      r.numero,
      r.fecha,
      r.tipo,
      `"${r.cliente}"`,
      r.nifCliente,
      fmtNum(r.baseImponible),
      r.tipoIVA,
      fmtNum(r.cuotaIVA),
      fmtNum(r.recargoEquiv),
      fmtNum(r.totalFactura),
      r.formaPago,
      r.estadoVeriFactu,
      r.rectificaDe,
      r.pedidoOrigen,
    ].join(";"),
  );

  return "\uFEFF" + [headers.join(";"), ...csvRows].join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 7: CUENTA DE RESULTADOS (PGC simplificado)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CuentaResultados {
  periodo: string;
  /** Ingresos por ventas (base imponible de facturas emitidas) */
  ventasNetas: number;
  /** Devoluciones y rectificativas (negativo) */
  devoluciones: number;
  /** Ingresos netos = ventas - devoluciones */
  ingresosNetos: number;
  /** IVA repercutido (no es ingreso, es deuda con Hacienda) */
  ivaRepercutido: number;
  /** Total facturado (ventas + IVA) */
  totalFacturado: number;
  /** Número de facturas emitidas */
  numFacturas: number;
  /** Número de facturas anuladas */
  numAnuladas: number;
  /** Número de rectificativas */
  numRectificativas: number;
  /** Ticket medio (ingresos netos / facturas activas) */
  ticketMedio: number;
}

export function generateCuentaResultados(
  invoices: InvoiceRecord[],
  periodoLabel: string,
): CuentaResultados {
  const activas = invoices.filter((i) => i.status !== InvoiceStatus.ANULADA);
  const anuladas = invoices.filter((i) => i.status === InvoiceStatus.ANULADA);
  const rectificativas = activas.filter(
    (i) => i.invoiceType === InvoiceType.RECTIFICATIVA,
  );
  const normales = activas.filter(
    (i) => i.invoiceType !== InvoiceType.RECTIFICATIVA,
  );

  const ventasNetas = r2(
    normales.reduce((s, i) => s + i.totals.totalTaxableBase, 0),
  );
  const devoluciones = r2(
    rectificativas.reduce((s, i) => s + i.totals.totalTaxableBase, 0),
  );
  const ingresosNetos = r2(ventasNetas - devoluciones);
  const ivaRepercutido = r2(
    activas.reduce((s, i) => s + i.totals.totalVAT, 0),
  );
  const totalFacturado = r2(ingresosNetos + ivaRepercutido);
  const numActivas = normales.length;
  const ticketMedio = numActivas > 0 ? r2(ingresosNetos / numActivas) : 0;

  return {
    periodo: periodoLabel,
    ventasNetas,
    devoluciones,
    ingresosNetos,
    ivaRepercutido,
    totalFacturado,
    numFacturas: activas.length,
    numAnuladas: anuladas.length,
    numRectificativas: rectificativas.length,
    ticketMedio,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 8: RECONCILIACIÓN CRUZADA (Facturas ↔ Pedidos)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReconciliationResult {
  ok: boolean;
  ordersWithoutInvoice: string[];
  invoicesWithoutOrder: string[];
  amountMismatches: {
    orderId: string;
    invoiceNumber: string;
    orderTotal: number;
    invoiceTotal: number;
    diff: number;
  }[];
}

export function reconcileOrdersAndInvoices(
  orders: { id: string; total: number; invoiceId?: string }[],
  invoices: InvoiceRecord[],
): ReconciliationResult {
  const invoiceMap = new Map(invoices.map((i) => [i.invoiceId, i]));
  const invoicesWithOrder = new Set<string>();

  const ordersWithoutInvoice: string[] = [];
  const amountMismatches: ReconciliationResult["amountMismatches"] = [];

  for (const order of orders) {
    if (!order.invoiceId) {
      ordersWithoutInvoice.push(order.id);
      continue;
    }
    const inv = invoiceMap.get(order.invoiceId);
    if (!inv) {
      ordersWithoutInvoice.push(order.id);
      continue;
    }
    invoicesWithOrder.add(inv.invoiceId);

    // Comparar totales
    if (!exactMatch(order.total, inv.totals.totalInvoice)) {
      amountMismatches.push({
        orderId: order.id,
        invoiceNumber: inv.invoiceNumber,
        orderTotal: order.total,
        invoiceTotal: inv.totals.totalInvoice,
        diff: r2(Math.abs(order.total - inv.totals.totalInvoice)),
      });
    }
  }

  // Facturas sin pedido asociado (excepto rectificativas)
  const invoicesWithoutOrder = invoices
    .filter(
      (i) =>
        !invoicesWithOrder.has(i.invoiceId) &&
        i.invoiceType !== InvoiceType.RECTIFICATIVA &&
        i.status !== InvoiceStatus.ANULADA,
    )
    .map((i) => i.invoiceNumber);

  return {
    ok:
      ordersWithoutInvoice.length === 0 &&
      invoicesWithoutOrder.length === 0 &&
      amountMismatches.length === 0,
    ordersWithoutInvoice,
    invoicesWithoutOrder,
    amountMismatches,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 9: CROSS-CHECK TRIMESTRAL (Modelo 303 ↔ Facturas)
// ═══════════════════════════════════════════════════════════════════════════════

export interface QuarterCrossCheck {
  quarter: Quarter;
  year: number;
  ok: boolean;
  /** Suma directa de facturas del trimestre */
  directSum: { base: number; vat: number; total: number };
  /** Lo que dice generateQuarterlyReport() */
  reportResult: { base: number; vat: number; total: number };
  /** Diferencias (deberían ser 0.00) */
  diff: { base: number; vat: number; total: number };
}

export function crossCheckQuarter(
  invoices: InvoiceRecord[],
  year: number,
  quarter: Quarter,
): QuarterCrossCheck {
  const period = getTaxPeriod(year, quarter);
  const periodInvoices = filterByPeriod(invoices, period).filter(
    (inv) => inv.status !== InvoiceStatus.ANULADA,
  );

  // Suma directa de facturas
  let directBase = 0;
  let directVAT = 0;
  let directTotal = 0;
  for (const inv of periodInvoices) {
    directBase = r2(directBase + inv.totals.totalTaxableBase);
    directVAT = r2(directVAT + inv.totals.totalVAT);
    directTotal = r2(directTotal + inv.totals.totalInvoice);
  }

  // Resultado del report
  const report = generateQuarterlyReport(invoices, year, quarter);

  return {
    quarter,
    year,
    ok:
      exactMatch(directBase, report.totalTaxableBase) &&
      exactMatch(directVAT, report.totalOutputVAT) &&
      exactMatch(directTotal, report.totalInvoiced),
    directSum: { base: directBase, vat: directVAT, total: directTotal },
    reportResult: {
      base: report.totalTaxableBase,
      vat: report.totalOutputVAT,
      total: report.totalInvoiced,
    },
    diff: {
      base: r2(directBase - report.totalTaxableBase),
      vat: r2(directVAT - report.totalOutputVAT),
      total: r2(directTotal - report.totalInvoiced),
    },
  };
}

/**
 * Cross-check de los 4 trimestres de un año.
 * Además verifica que la suma de trimestres = resumen anual.
 */
export function crossCheckYear(
  invoices: InvoiceRecord[],
  year: number,
): {
  quarters: QuarterCrossCheck[];
  annualCheck: {
    ok: boolean;
    quarterSum: { base: number; vat: number };
    annualReport: { base: number; vat: number };
    diff: { base: number; vat: number };
  };
} {
  const quarters = ([1, 2, 3, 4] as Quarter[]).map((q) =>
    crossCheckQuarter(invoices, year, q),
  );

  // Suma de trimestres
  let qBase = 0;
  let qVAT = 0;
  for (const q of quarters) {
    qBase = r2(qBase + q.directSum.base);
    qVAT = r2(qVAT + q.directSum.vat);
  }

  // Resumen anual
  const annual = generateAnnualReport(invoices, year);

  return {
    quarters,
    annualCheck: {
      ok:
        exactMatch(qBase, annual.totalTaxableBase) &&
        exactMatch(qVAT, annual.totalOutputVAT),
      quarterSum: { base: qBase, vat: qVAT },
      annualReport: {
        base: annual.totalTaxableBase,
        vat: annual.totalOutputVAT,
      },
      diff: {
        base: r2(qBase - annual.totalTaxableBase),
        vat: r2(qVAT - annual.totalOutputVAT),
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 10: AUDITORÍA COMPLETA
// Ejecuta TODAS las comprobaciones y devuelve un informe consolidado.
// ═══════════════════════════════════════════════════════════════════════════════

export interface FullAuditReport {
  generatedAt: string;
  year: number;
  /** 1. Triple conteo de IVA */
  tripleCheck: {
    total: number;
    passed: number;
    failed: TripleCheckResult[];
  };
  /** 2. Correlatividad de numeración */
  correlative: CorrelativeCheckResult;
  /** 3. Cadena de hash VeriFactu */
  hashChain: ChainCheckResult;
  /** 4. Rectificativas y anulaciones */
  rectificatives: RectificativeCheckResult;
  /** 5. Cross-check trimestral ↔ facturas */
  crossCheck: {
    quarters: QuarterCrossCheck[];
    annualCheck: {
      ok: boolean;
      quarterSum: { base: number; vat: number };
      annualReport: { base: number; vat: number };
      diff: { base: number; vat: number };
    };
  };
  /** 6. Cuenta de resultados del año */
  cuentaResultados: CuentaResultados;
  /** Veredicto final */
  allClear: boolean;
  issues: string[];
}

export async function runFullAudit(year: number): Promise<FullAuditReport> {
  const invoices = loadInvoices();
  const yearInvoices = invoices.filter((inv) => {
    const d = new Date(inv.invoiceDate);
    return d.getFullYear() === year;
  });

  const issues: string[] = [];

  // 1. Triple conteo
  const tripleCheck = tripleCheckAllInvoices(yearInvoices);
  if (tripleCheck.failed.length > 0) {
    issues.push(
      `${tripleCheck.failed.length} facturas con discrepancia en triple conteo de IVA`,
    );
  }

  // 2. Correlatividad
  const correlative = checkCorrelativeNumbering(invoices, year);
  if (!correlative.ok) {
    if (correlative.gaps.length) issues.push(`Saltos en numeración: ${correlative.gaps.length}`);
    if (correlative.duplicates.length) issues.push(`Números duplicados: ${correlative.duplicates.length}`);
  }

  // 3. Cadena de hash
  const hashChain = await checkHashChain(invoices);
  if (!hashChain.ok) {
    issues.push(`Cadena VeriFactu rota: ${hashChain.brokenLinks.length} eslabones`);
  }

  // 4. Rectificativas
  const rectificatives = checkRectificatives(yearInvoices);
  if (!rectificatives.ok) {
    issues.push(`Problemas en rectificativas: ${rectificatives.issues.length}`);
  }

  // 5. Cross-check trimestral
  const crossCheck = crossCheckYear(invoices, year);
  for (const q of crossCheck.quarters) {
    if (!q.ok) {
      issues.push(`Discrepancia en T${q.quarter} ${year}: base diff=${q.diff.base}, IVA diff=${q.diff.vat}`);
    }
  }
  if (!crossCheck.annualCheck.ok) {
    issues.push(`Discrepancia anual: base diff=${crossCheck.annualCheck.diff.base}, IVA diff=${crossCheck.annualCheck.diff.vat}`);
  }

  // 6. Cuenta de resultados
  const cuentaResultados = generateCuentaResultados(
    yearInvoices,
    `Año ${year}`,
  );

  return {
    generatedAt: new Date().toISOString(),
    year,
    tripleCheck,
    correlative,
    hashChain,
    rectificatives,
    crossCheck,
    cuentaResultados,
    allClear: issues.length === 0,
    issues,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 11: EXPORTACIONES CSV AVANZADAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CSV de desglose de IVA por factura (para inspección detallada).
 * Cada línea de factura tiene su propia fila.
 */
export function exportDetailedVATBreakdownCSV(
  invoices: InvoiceRecord[],
): string {
  const headers = [
    "Nº Factura",
    "Fecha",
    "Tipo",
    "Estado",
    "Cliente",
    "NIF/CIF",
    "Línea",
    "Producto",
    "Cantidad",
    "Precio Unit. (sin IVA)",
    "% Descuento",
    "Base Imponible Línea",
    "Tipo IVA",
    "Cuota IVA Línea",
    "Recargo Equiv.",
    "Total Línea",
    "Pedido Origen",
    "Hash VeriFactu",
  ];

  const rows: string[] = [];
  const sorted = [...invoices].sort(
    (a, b) =>
      new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime(),
  );

  for (const inv of sorted) {
    const recipient = inv.recipient as { name?: string; taxId?: string };
    for (const line of inv.items) {
      rows.push(
        [
          inv.invoiceNumber,
          formatDate(inv.invoiceDate),
          inv.invoiceType,
          inv.status,
          `"${recipient.name ?? ""}"`,
          recipient.taxId ?? "",
          String(line.lineNumber),
          `"${line.description}"`,
          String(line.quantity),
          fmtNum(line.unitPrice),
          fmtNum(line.discount),
          fmtNum(line.taxableBase),
          `${line.vatRate}%`,
          fmtNum(line.vatAmount),
          fmtNum(line.surchargeAmount),
          fmtNum(line.totalLine),
          inv.sourceOrderId ?? "",
          inv.verifactuHash?.slice(0, 16) ?? "",
        ].join(";"),
      );
    }
  }

  return "\uFEFF" + [headers.join(";"), ...rows].join("\n");
}

/**
 * CSV de auditoría de triple conteo (para demostrar a Hacienda
 * que cada factura se verifica por 3 métodos independientes).
 */
export function exportTripleCheckCSV(invoices: InvoiceRecord[]): string {
  const headers = [
    "Nº Factura",
    "Método 1 Base (Líneas)",
    "Método 1 IVA",
    "Método 1 Total",
    "Método 2 Base (Recálculo)",
    "Método 2 IVA",
    "Método 2 Total",
    "Método 3 Base (Desglose)",
    "Método 3 IVA",
    "Método 3 Total",
    "Registrado Base",
    "Registrado IVA",
    "Registrado Total",
    "OK",
    "Discrepancias",
  ];

  const active = invoices.filter((i) => i.status !== InvoiceStatus.ANULADA);
  const rows = active.map((inv) => {
    const check = tripleCheckInvoice(inv);
    return [
      inv.invoiceNumber,
      fmtNum(check.method1_lineSum.totalBase),
      fmtNum(check.method1_lineSum.totalVAT),
      fmtNum(check.method1_lineSum.totalInvoice),
      fmtNum(check.method2_fromGross.totalBase),
      fmtNum(check.method2_fromGross.totalVAT),
      fmtNum(check.method2_fromGross.totalInvoice),
      fmtNum(check.method3_breakdown.totalBase),
      fmtNum(check.method3_breakdown.totalVAT),
      fmtNum(check.method3_breakdown.totalInvoice),
      fmtNum(inv.totals.totalTaxableBase),
      fmtNum(inv.totals.totalVAT),
      fmtNum(inv.totals.totalInvoice),
      check.allMatch ? "OK" : "ERROR",
      `"${check.discrepancies.join(" | ")}"`,
    ].join(";");
  });

  return "\uFEFF" + [headers.join(";"), ...rows].join("\n");
}

/**
 * CSV de reconciliación facturas ↔ pedidos.
 */
export function exportReconciliationCSV(
  orders: { id: string; total: number; invoiceId?: string }[],
  invoices: InvoiceRecord[],
): string {
  const result = reconcileOrdersAndInvoices(orders, invoices);
  const headers = [
    "Tipo",
    "ID Pedido / Nº Factura",
    "Total Pedido",
    "Total Factura",
    "Diferencia",
    "Estado",
  ];

  const rows: string[] = [];

  for (const oid of result.ordersWithoutInvoice) {
    const order = orders.find((o) => o.id === oid);
    rows.push(
      [
        "SIN FACTURA",
        oid,
        fmtNum(order?.total ?? 0),
        "",
        "",
        "PENDIENTE",
      ].join(";"),
    );
  }

  for (const invNum of result.invoicesWithoutOrder) {
    rows.push(
      ["SIN PEDIDO", invNum, "", "", "", "REVISAR"].join(";"),
    );
  }

  for (const m of result.amountMismatches) {
    rows.push(
      [
        "DIFERENCIA",
        `${m.orderId} / ${m.invoiceNumber}`,
        fmtNum(m.orderTotal),
        fmtNum(m.invoiceTotal),
        fmtNum(m.diff),
        "ERROR",
      ].join(";"),
    );
  }

  if (rows.length === 0) {
    rows.push(["TODO OK", "Sin discrepancias", "", "", "", "OK"].join(";"));
  }

  return "\uFEFF" + [headers.join(";"), ...rows].join("\n");
}

/**
 * CSV resumen de cuenta de resultados (para gestoría / contable).
 */
export function exportCuentaResultadosCSV(
  invoices: InvoiceRecord[],
  year: number,
): string {
  const headers = [
    "Período",
    "Ventas Netas",
    "Devoluciones",
    "Ingresos Netos",
    "IVA Repercutido",
    "Total Facturado",
    "Nº Facturas",
    "Nº Anuladas",
    "Nº Rectificativas",
    "Ticket Medio",
  ];

  const rows: string[] = [];

  // Trimestral
  for (const q of [1, 2, 3, 4] as Quarter[]) {
    const period = getTaxPeriod(year, q);
    const periodInvoices = filterByPeriod(invoices, period);
    const cr = generateCuentaResultados(periodInvoices, `T${q} ${year}`);
    rows.push(
      [
        cr.periodo,
        fmtNum(cr.ventasNetas),
        fmtNum(cr.devoluciones),
        fmtNum(cr.ingresosNetos),
        fmtNum(cr.ivaRepercutido),
        fmtNum(cr.totalFacturado),
        String(cr.numFacturas),
        String(cr.numAnuladas),
        String(cr.numRectificativas),
        fmtNum(cr.ticketMedio),
      ].join(";"),
    );
  }

  // Anual
  const yearInvoices = invoices.filter(
    (i) => new Date(i.invoiceDate).getFullYear() === year,
  );
  const annual = generateCuentaResultados(yearInvoices, `AÑO ${year}`);
  rows.push(
    [
      annual.periodo,
      fmtNum(annual.ventasNetas),
      fmtNum(annual.devoluciones),
      fmtNum(annual.ingresosNetos),
      fmtNum(annual.ivaRepercutido),
      fmtNum(annual.totalFacturado),
      String(annual.numFacturas),
      String(annual.numAnuladas),
      String(annual.numRectificativas),
      fmtNum(annual.ticketMedio),
    ].join(";"),
  );

  return "\uFEFF" + [headers.join(";"), ...rows].join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES INTERNAS
// ═══════════════════════════════════════════════════════════════════════════════

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

function fmtNum(n: number): string {
  return n.toFixed(2).replace(".", ",");
}
