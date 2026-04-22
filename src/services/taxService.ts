/**
 * Servicio fiscal — Cálculos de IVA y generación de informes tributarios.
 *
 * Tipos de IVA en España (Ley 37/1992):
 * - General: 21% (la mayoría de bienes y servicios)
 * - Reducido: 10% (alimentos no básicos, transporte, hostelería...)
 * - Superreducido: 4% (alimentos básicos, medicamentos, libros...)
 * - Exento: 0% (educación, sanidad, operaciones intracomunitarias B2B...)
 *
 * Recargo de equivalencia (art. 154 LIVA):
 * - Solo para comerciantes minoristas no sujetos a IVA ordinario
 * - 21% → +5.2% | 10% → +1.4% | 4% → +0.5%
 */

import type {
  InvoiceRecord,
  InvoiceLineItem,
  TaxBreakdown,
  CompanyData,
  CustomerData,
} from "@/types/fiscal";
import type {
  TaxPeriod,
  TaxSummary,
  AnnualSummary,
  OutputVATBreakdown,
  QuarterlySummary,
  TaxExportOptions,
  TaxExportRow,
  Quarter,
} from "@/types/tax";
import {
  moneyRound as roundTo2,
  baseFromPriceWithVAT,
  feeOnBase,
} from "@/lib/money";

// ─── Tablas de tipos ─────────────────────────────────────────────────────────

/** Tipos de IVA válidos en España */
export const VAT_RATES = [0, 4, 10, 21] as const;
export type VatRate = (typeof VAT_RATES)[number];

/** Recargo de equivalencia correspondiente a cada tipo de IVA */
export const SURCHARGE_RATES: Record<VatRate, 0 | 0.5 | 1.4 | 5.2> = {
  0: 0,
  4: 0.5,
  10: 1.4,
  21: 5.2,
};

// ─── Cálculos básicos ────────────────────────────────────────────────────────

/** Calcula la cuota de IVA sobre una base imponible */
export function calculateVAT(taxableBase: number, rate: number): number {
  return feeOnBase(taxableBase, rate);
}

/** Calcula el recargo de equivalencia sobre una base imponible */
export function calculateSurcharge(taxableBase: number, rate: number): number {
  return feeOnBase(taxableBase, rate);
}

/**
 * Calcula la base imponible a partir del precio con IVA incluido.
 * Útil cuando el precio de venta ya incluye IVA.
 */
export function priceToBase(priceWithVAT: number, vatRate: number): number {
  return baseFromPriceWithVAT(priceWithVAT, vatRate);
}

/**
 * Determina el tipo de IVA aplicable según el producto y el cliente.
 *
 * Simplificación para TCG Academy:
 * - Cartas TCG y accesorios: IVA general 21%
 * - Clientes intracomunitarios B2B: 0% (inversión sujeto pasivo)
 * - Exportaciones extra-UE: 0% (exento)
 *
 * Preparado para ampliar cuando haya categorías con IVA reducido.
 */
export function getApplicableTaxRate(
  _productId: string,
  recipient: CompanyData | CustomerData,
): VatRate {
  if (isIntraCommunityOperation(recipient)) return 0;
  if (isExtraEUExport(recipient)) return 0;
  return 21;
}

/**
 * Determina si una operación es intracomunitaria.
 * Requisitos: cliente con NIF intracomunitario UE, distinto de España.
 */
export function isIntraCommunityOperation(
  recipient: CompanyData | CustomerData,
): boolean {
  const r = recipient as CompanyData;
  return (
    r.isEU === true &&
    r.countryCode !== "ES" &&
    Boolean(r.taxId) &&
    Boolean(r.taxIdType === "VAT_EU" || r.taxIdType === "CIF")
  );
}

/** Determina si la operación es una exportación fuera de la UE */
export function isExtraEUExport(
  recipient: CompanyData | CustomerData,
): boolean {
  const EU_CODES = new Set([
    "AT",
    "BE",
    "BG",
    "CY",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FR",
    "GR",
    "HR",
    "HU",
    "IE",
    "IT",
    "LT",
    "LU",
    "LV",
    "MT",
    "NL",
    "PL",
    "PT",
    "RO",
    "SE",
    "SI",
    "SK",
  ]);
  const code = recipient.countryCode;
  return Boolean(code) && !EU_CODES.has(code);
}

// ─── Desglose fiscal ─────────────────────────────────────────────────────────

/**
 * Agrupa las líneas de factura por tipo de IVA y calcula el desglose fiscal.
 * Cumple con el formato requerido por el modelo 303 y VeriFactu.
 */
export function calculateTaxBreakdown(
  items: InvoiceLineItem[],
): TaxBreakdown[] {
  const grouped = new Map<number, TaxBreakdown>();

  for (const item of items) {
    const existing = grouped.get(item.vatRate);
    if (existing) {
      existing.taxableBase = roundTo2(existing.taxableBase + item.taxableBase);
      existing.vatAmount = roundTo2(existing.vatAmount + item.vatAmount);
      existing.surchargeAmount = roundTo2(
        existing.surchargeAmount + item.surchargeAmount,
      );
      existing.total = roundTo2(existing.total + item.totalLine);
    } else {
      grouped.set(item.vatRate, {
        vatRate: item.vatRate,
        taxableBase: item.taxableBase,
        vatAmount: item.vatAmount,
        surchargeRate: item.surchargeRate,
        surchargeAmount: item.surchargeAmount,
        total: item.totalLine,
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => b.vatRate - a.vatRate);
}

// ─── Períodos trimestrales ───────────────────────────────────────────────────

/** Devuelve el trimestre (1-4) para un mes dado */
export function getQuarter(month: number): Quarter {
  return Math.ceil(month / 3) as Quarter;
}

/** Genera la información completa de un período fiscal trimestral */
export function getTaxPeriod(year: number, quarter: Quarter): TaxPeriod {
  const startMonths: Record<Quarter, number> = { 1: 1, 2: 4, 3: 7, 4: 10 };
  const endMonths: Record<Quarter, number> = { 1: 3, 2: 6, 3: 9, 4: 12 };
  const startMonth = startMonths[quarter] as TaxPeriod["startMonth"];
  const endMonth = endMonths[quarter] as TaxPeriod["endMonth"];

  // Plazo presentación modelo 303: 20 días del mes siguiente al trimestre
  const dueMonth = endMonth + 1 > 12 ? 1 : endMonth + 1;
  const dueYear = endMonth + 1 > 12 ? year + 1 : year;
  const dueDate = new Date(dueYear, dueMonth - 1, 20);

  return { year, quarter, startMonth, endMonth, dueDate };
}

/** Filtra las facturas que pertenecen a un período fiscal */
export function filterByPeriod(
  invoices: InvoiceRecord[],
  period: TaxPeriod,
): InvoiceRecord[] {
  return invoices.filter((inv) => {
    const d = new Date(inv.invoiceDate);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    if (y !== period.year) return false;
    return m >= period.startMonth && m <= period.endMonth;
  });
}

// ─── Modelo 303 ──────────────────────────────────────────────────────────────

/** Genera el resumen fiscal para el Modelo 303 (IVA trimestral) */
export function generateQuarterlyReport(
  invoices: InvoiceRecord[],
  year: number,
  quarter: Quarter,
): TaxSummary {
  const period = getTaxPeriod(year, quarter);
  const periodInvoices = filterByPeriod(invoices, period).filter(
    (inv) => inv.status !== "anulada",
  );

  // Agrupa IVA repercutido por tipo
  const vatMap = new Map<number, OutputVATBreakdown>();
  let totalTaxableBase = 0;
  let totalOutputVAT = 0;
  let intraCommunityAmount = 0;
  let exemptAmount = 0;

  for (const inv of periodInvoices) {
    for (const breakdown of inv.taxBreakdown) {
      const existing = vatMap.get(breakdown.vatRate);
      if (existing) {
        existing.taxableBase = roundTo2(
          existing.taxableBase + breakdown.taxableBase,
        );
        existing.vatAmount = roundTo2(existing.vatAmount + breakdown.vatAmount);
        existing.invoiceCount += 1;
      } else {
        vatMap.set(breakdown.vatRate, {
          vatRate: breakdown.vatRate,
          taxableBase: breakdown.taxableBase,
          vatAmount: breakdown.vatAmount,
          invoiceCount: 1,
        });
      }
      totalTaxableBase = roundTo2(totalTaxableBase + breakdown.taxableBase);
      totalOutputVAT = roundTo2(totalOutputVAT + breakdown.vatAmount);

      if (breakdown.vatRate === 0) {
        if (isIntraCommunityOperation(inv.recipient)) {
          intraCommunityAmount = roundTo2(
            intraCommunityAmount + breakdown.taxableBase,
          );
        } else {
          exemptAmount = roundTo2(exemptAmount + breakdown.taxableBase);
        }
      }
    }
  }

  const totalInvoiced = roundTo2(totalTaxableBase + totalOutputVAT);

  return {
    period,
    outputVAT: Array.from(vatMap.values()).sort(
      (a, b) => b.vatRate - a.vatRate,
    ),
    inputVAT: [], // Pendiente: registro de compras
    totalOutputVAT,
    totalInputVAT: 0,
    result: roundTo2(totalOutputVAT - 0), // a ingresar (IVA soportado pendiente)
    totalTaxableBase,
    totalInvoiced,
    invoiceCount: periodInvoices.length,
    intraCommunityAmount,
    exemptAmount,
    generatedAt: new Date(),
  };
}

// ─── Modelo 390 ──────────────────────────────────────────────────────────────

/** Genera el resumen anual para el Modelo 390 */
export function generateAnnualReport(
  invoices: InvoiceRecord[],
  year: number,
): AnnualSummary {
  const quarters = ([1, 2, 3, 4] as Quarter[]).map((q): QuarterlySummary => {
    const summary = generateQuarterlyReport(invoices, year, q);
    return {
      quarter: q,
      totalTaxableBase: summary.totalTaxableBase,
      totalOutputVAT: summary.totalOutputVAT,
      totalInputVAT: summary.totalInputVAT,
      result: summary.result,
      invoiceCount: summary.invoiceCount,
    };
  });

  // Totales anuales
  const vatMap = new Map<number, OutputVATBreakdown>();
  const yearInvoices = invoices.filter((inv) => {
    const d = new Date(inv.invoiceDate);
    return d.getFullYear() === year && inv.status !== "anulada";
  });

  for (const inv of yearInvoices) {
    for (const breakdown of inv.taxBreakdown) {
      const existing = vatMap.get(breakdown.vatRate);
      if (existing) {
        existing.taxableBase = roundTo2(
          existing.taxableBase + breakdown.taxableBase,
        );
        existing.vatAmount = roundTo2(existing.vatAmount + breakdown.vatAmount);
        existing.invoiceCount += 1;
      } else {
        vatMap.set(breakdown.vatRate, {
          vatRate: breakdown.vatRate,
          taxableBase: breakdown.taxableBase,
          vatAmount: breakdown.vatAmount,
          invoiceCount: 1,
        });
      }
    }
  }

  const totalOutputVAT = roundTo2(
    quarters.reduce((s, q) => s + q.totalOutputVAT, 0),
  );
  const totalTaxableBase = roundTo2(
    quarters.reduce((s, q) => s + q.totalTaxableBase, 0),
  );

  return {
    year,
    quarters,
    totalTaxableBase,
    totalOutputVAT,
    totalInputVAT: 0,
    annualResult: totalOutputVAT,
    totalInvoices: yearInvoices.length,
    vatBreakdown: Array.from(vatMap.values()).sort(
      (a, b) => b.vatRate - a.vatRate,
    ),
    generatedAt: new Date(),
  };
}

// ─── Exportación para gestoría ───────────────────────────────────────────────

/** Convierte facturas a filas CSV para la gestoría */
export function buildExportRows(invoices: InvoiceRecord[]): TaxExportRow[] {
  return invoices.map((inv): TaxExportRow => {
    const vatMap = new Map(inv.taxBreakdown.map((b) => [b.vatRate, b]));
    const b21 = vatMap.get(21);
    const b10 = vatMap.get(10);
    const b4 = vatMap.get(4);
    const b0 = vatMap.get(0);
    const recipient = inv.recipient as CompanyData & CustomerData;
    const name = recipient.name ?? "";
    const taxId = recipient.taxId ?? "";

    return {
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: formatDateISO(inv.invoiceDate),
      recipientName: name,
      recipientTaxId: taxId,
      base21: b21?.taxableBase ?? 0,
      vat21: b21?.vatAmount ?? 0,
      base10: b10?.taxableBase ?? 0,
      vat10: b10?.vatAmount ?? 0,
      base4: b4?.taxableBase ?? 0,
      vat4: b4?.vatAmount ?? 0,
      base0: b0?.taxableBase ?? 0,
      surcharge: roundTo2(inv.totals.totalSurcharge),
      totalInvoice: inv.totals.totalInvoice,
      paymentMethod: inv.paymentMethod,
      verifactuStatus: inv.verifactuStatus,
    };
  });
}

/**
 * Genera el contenido CSV (con BOM UTF-8 para Excel español) para la gestoría.
 * Compatible con ContaPlus, A3, Sage y otros programas de contabilidad.
 */
export function generateCSVForAdvisor(
  invoices: InvoiceRecord[],
  options: TaxExportOptions,
): string {
  const filtered = options.period
    ? filterByPeriod(invoices, options.period)
    : invoices;

  const rows = buildExportRows(filtered);
  const headers = [
    "Nº Factura",
    "Fecha",
    "Cliente",
    "NIF/CIF",
    "Base 21%",
    "Cuota 21%",
    "Base 10%",
    "Cuota 10%",
    "Base 4%",
    "Cuota 4%",
    "Base Exenta",
    "Recargo Equiv.",
    "Total Factura",
    "Forma de Pago",
    "Estado VeriFactu",
  ];

  const csvRows = rows.map((r) =>
    [
      r.invoiceNumber,
      r.invoiceDate,
      `"${r.recipientName}"`,
      r.recipientTaxId,
      formatNum(r.base21),
      formatNum(r.vat21),
      formatNum(r.base10),
      formatNum(r.vat10),
      formatNum(r.base4),
      formatNum(r.vat4),
      formatNum(r.base0),
      formatNum(r.surcharge),
      formatNum(r.totalInvoice),
      r.paymentMethod,
      r.verifactuStatus,
    ].join(";"),
  );

  // BOM UTF-8 para compatibilidad con Excel español
  return "\uFEFF" + [headers.join(";"), ...csvRows].join("\n");
}

// ─── Utilidades ──────────────────────────────────────────────────────────────
// roundTo2 ahora se importa de @/lib/money (big.js-based, precisión exacta)

function formatDateISO(date: Date | string): string {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

function formatNum(n: number): string {
  return n.toFixed(2).replace(".", ",");
}
