/**
 * Tipos para declaraciones fiscales españolas.
 *
 * Modelos:
 * - Modelo 303: Autoliquidación trimestral del IVA
 * - Modelo 390: Resumen anual del IVA
 * - Modelo 349: Declaración recapitulativa de operaciones intracomunitarias
 */

// ─── Períodos fiscales ────────────────────────────────────────────────────────

export type Quarter = 1 | 2 | 3 | 4;
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** Período fiscal trimestral */
export interface TaxPeriod {
  year: number;
  quarter: Quarter;
  /** Mes de inicio del trimestre (1, 4, 7, 10) */
  startMonth: Month;
  /** Mes de fin del trimestre (3, 6, 9, 12) */
  endMonth: Month;
  /** Fecha límite de presentación (20 días del mes siguiente al trimestre) */
  dueDate: Date;
}

// ─── Modelo 303 ───────────────────────────────────────────────────────────────

/**
 * Desglose de IVA repercutido por tipo impositivo.
 * Cada fila corresponde a un tipo de IVA.
 */
export interface OutputVATBreakdown {
  /** Tipo de IVA: 0, 4, 10, 21 */
  vatRate: number;
  /** Base imponible total del período para este tipo */
  taxableBase: number;
  /** Cuota de IVA (base × tipo) */
  vatAmount: number;
  /** Número de facturas con este tipo */
  invoiceCount: number;
}

/**
 * Desglose de IVA soportado (compras).
 * Actualmente no implementado, preparado para cuando haya registro de compras.
 */
export interface InputVATBreakdown {
  vatRate: number;
  taxableBase: number;
  vatAmount: number;
  /** Porcentaje deducible (puede ser <100% si actividad mixta) */
  deductiblePct: number;
  deductibleAmount: number;
}

/** Resumen completo para el Modelo 303 */
export interface TaxSummary {
  period: TaxPeriod;
  /** IVA repercutido (ventas) por tipo */
  outputVAT: OutputVATBreakdown[];
  /** IVA soportado (compras) — pendiente de implementar */
  inputVAT: InputVATBreakdown[];
  /** Total IVA repercutido */
  totalOutputVAT: number;
  /** Total IVA deducible */
  totalInputVAT: number;
  /** Resultado: positivo = a ingresar, negativo = a devolver/compensar */
  result: number;
  /** Base imponible total del período */
  totalTaxableBase: number;
  /** Total facturado (base + IVA) */
  totalInvoiced: number;
  /** Número total de facturas emitidas en el período */
  invoiceCount: number;
  /** Importe de operaciones intracomunitarias (IVA 0% por inversión sujeto pasivo) */
  intraCommunityAmount: number;
  /** Importe de operaciones exentas */
  exemptAmount: number;
  /** Fecha de generación de este resumen */
  generatedAt: Date;
}

// ─── Modelo 390 ───────────────────────────────────────────────────────────────

/** Resumen trimestral dentro del resumen anual */
export interface QuarterlySummary {
  quarter: Quarter;
  totalTaxableBase: number;
  totalOutputVAT: number;
  totalInputVAT: number;
  result: number;
  invoiceCount: number;
}

/** Resumen anual completo para el Modelo 390 */
export interface AnnualSummary {
  year: number;
  /** Resumen por trimestre */
  quarters: QuarterlySummary[];
  /** Totales anuales */
  totalTaxableBase: number;
  totalOutputVAT: number;
  totalInputVAT: number;
  annualResult: number;
  totalInvoices: number;
  /** Desglose anual por tipo de IVA */
  vatBreakdown: OutputVATBreakdown[];
  generatedAt: Date;
}

// ─── Modelo 349 — Operaciones intracomunitarias ───────────────────────────────

export type IntraCommunityOperationType =
  | "E" // Entrega de bienes
  | "S" // Prestación de servicios
  | "A" // Adquisición de bienes
  | "I"; // Adquisición de servicios

/** Una operación intracomunitaria para el Modelo 349 */
export interface IntraCommunityOperation {
  /** NIF intracomunitario del operador europeo (ej: FR12345678) */
  euVatNumber: string;
  /** Nombre/razón social del operador */
  operatorName: string;
  /** País del operador (código ISO) */
  countryCode: string;
  operationType: IntraCommunityOperationType;
  /** Importe de las operaciones del período */
  amount: number;
  /** Trimestre y año */
  period: TaxPeriod;
  /** IDs de las facturas incluidas en esta operación */
  invoiceIds: string[];
}

// ─── Exportación para gestoría ───────────────────────────────────────────────

export type ExportFormat = "CSV" | "PDF" | "JSON";

/** Configuración de exportación para el asesor fiscal */
export interface TaxExportOptions {
  /** Período a exportar (null = todos) */
  period: TaxPeriod | null;
  format: ExportFormat;
  /** Incluir detalle de líneas de factura (más detallado pero más voluminoso) */
  includeLineItems: boolean;
  /** Incluir datos del cliente */
  includeRecipientData: boolean;
  /** Filtrar por tipo de IVA (null = todos) */
  filterByVatRate: number | null;
  /** Solo facturas con este estado VeriFactu */
  filterByVerifactuStatus?: string;
}

/** Fila de la exportación CSV para gestoría */
export interface TaxExportRow {
  invoiceNumber: string;
  invoiceDate: string;
  recipientName: string;
  recipientTaxId: string;
  /** Base imponible al tipo general 21% */
  base21: number;
  vat21: number;
  /** Base imponible al tipo reducido 10% */
  base10: number;
  vat10: number;
  /** Base imponible al tipo superreducido 4% */
  base4: number;
  vat4: number;
  /** Base imponible exenta (0%) */
  base0: number;
  surcharge: number;
  totalInvoice: number;
  paymentMethod: string;
  verifactuStatus: string;
}
