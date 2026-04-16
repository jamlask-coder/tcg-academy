/**
 * Operaciones Internacionales — TCG Academy.
 *
 * Gestión fiscal completa para:
 *   - Ventas nacionales (IVA 21%)
 *   - Ventas intracomunitarias B2B (IVA 0% — inversión sujeto pasivo)
 *   - Exportaciones extra-UE (exentas)
 *   - Importaciones (IVA soportado en aduana)
 *
 * Base legal:
 *   - Ley 37/1992 (LIVA): art. 21-25 (exenciones exportaciones/intracomunitarias)
 *   - RD 1624/1992 (RIVA): art. 13 (entrega intracomunitaria)
 *   - Modelo 349: declaración recapitulativa operaciones intracomunitarias
 *   - DUA (Documento Único Administrativo): importaciones/exportaciones extra-UE
 *   - Intrastat: estadísticas comercio intracomunitario (>400.000€/año)
 *   - VIES: verificación NIF intracomunitario
 *
 * Códigos postales y prefijos por país UE (para clasificación geográfica).
 */

import type { InvoiceRecord, CompanyData, CustomerData } from "@/types/fiscal";
import { InvoiceStatus } from "@/types/fiscal";
import type { Quarter } from "@/types/tax";
import { filterByPeriod, getTaxPeriod } from "@/services/taxService";

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASIFICACIÓN GEOGRÁFICA
// ═══════════════════════════════════════════════════════════════════════════════

/** Países UE con código ISO, nombre y si requiere Modelo 349 */
export const EU_COUNTRIES: Record<string, { name: string; nameEs: string; intrastat: boolean }> = {
  AT: { name: "Austria", nameEs: "Austria", intrastat: true },
  BE: { name: "Belgium", nameEs: "Bélgica", intrastat: true },
  BG: { name: "Bulgaria", nameEs: "Bulgaria", intrastat: true },
  CY: { name: "Cyprus", nameEs: "Chipre", intrastat: true },
  CZ: { name: "Czech Republic", nameEs: "Rep. Checa", intrastat: true },
  DE: { name: "Germany", nameEs: "Alemania", intrastat: true },
  DK: { name: "Denmark", nameEs: "Dinamarca", intrastat: true },
  EE: { name: "Estonia", nameEs: "Estonia", intrastat: true },
  FI: { name: "Finland", nameEs: "Finlandia", intrastat: true },
  FR: { name: "France", nameEs: "Francia", intrastat: true },
  GR: { name: "Greece", nameEs: "Grecia", intrastat: true },
  HR: { name: "Croatia", nameEs: "Croacia", intrastat: true },
  HU: { name: "Hungary", nameEs: "Hungría", intrastat: true },
  IE: { name: "Ireland", nameEs: "Irlanda", intrastat: true },
  IT: { name: "Italy", nameEs: "Italia", intrastat: true },
  LT: { name: "Lithuania", nameEs: "Lituania", intrastat: true },
  LU: { name: "Luxembourg", nameEs: "Luxemburgo", intrastat: true },
  LV: { name: "Latvia", nameEs: "Letonia", intrastat: true },
  MT: { name: "Malta", nameEs: "Malta", intrastat: true },
  NL: { name: "Netherlands", nameEs: "Países Bajos", intrastat: true },
  PL: { name: "Poland", nameEs: "Polonia", intrastat: true },
  PT: { name: "Portugal", nameEs: "Portugal", intrastat: true },
  RO: { name: "Romania", nameEs: "Rumanía", intrastat: true },
  SE: { name: "Sweden", nameEs: "Suecia", intrastat: true },
  SI: { name: "Slovenia", nameEs: "Eslovenia", intrastat: true },
  SK: { name: "Slovakia", nameEs: "Eslovaquia", intrastat: true },
};

/** Provincias españolas por prefijo de CP (2 primeros dígitos) */
export const SPANISH_PROVINCES: Record<string, string> = {
  "01": "Álava", "02": "Albacete", "03": "Alicante", "04": "Almería",
  "05": "Ávila", "06": "Badajoz", "07": "Baleares", "08": "Barcelona",
  "09": "Burgos", "10": "Cáceres", "11": "Cádiz", "12": "Castellón",
  "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña", "16": "Cuenca",
  "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Guipúzcoa",
  "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León",
  "25": "Lleida", "26": "La Rioja", "27": "Lugo", "28": "Madrid",
  "29": "Málaga", "30": "Murcia", "31": "Navarra", "32": "Ourense",
  "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra",
  "37": "Salamanca", "38": "S/C de Tenerife", "39": "Cantabria", "40": "Segovia",
  "41": "Sevilla", "42": "Soria", "43": "Tarragona", "44": "Teruel",
  "45": "Toledo", "46": "Valencia", "47": "Valladolid", "48": "Vizcaya",
  "49": "Zamora", "50": "Zaragoza", "51": "Ceuta", "52": "Melilla",
};

export function getProvinceFromCP(cp: string): string {
  return SPANISH_PROVINCES[cp.slice(0, 2)] ?? "Desconocida";
}

export type OperationType = "nacional" | "intracomunitaria" | "exportacion" | "importacion";

export function classifyOperation(recipient: CompanyData | CustomerData): OperationType {
  const code = recipient.countryCode;
  if (!code || code === "ES") return "nacional";
  if (EU_COUNTRIES[code]) {
    const r = recipient as CompanyData;
    if (r.taxId && r.isEU) return "intracomunitaria";
    return "intracomunitaria"; // Aún dentro UE, aunque particular
  }
  return "exportacion";
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELO 349 — Operaciones intracomunitarias
// ═══════════════════════════════════════════════════════════════════════════════

export interface Modelo349Entry {
  euVatNumber: string;
  operatorName: string;
  countryCode: string;
  countryName: string;
  operationType: "E" | "S" | "A" | "I"; // Entrega/Servicio/Adquisición/Importación servicio
  amount: number;
  invoiceCount: number;
  invoiceNumbers: string[];
}

export interface Modelo349 {
  year: number;
  quarter: Quarter;
  entries: Modelo349Entry[];
  totalAmount: number;
  generatedAt: string;
}

export function generateModelo349(
  invoices: InvoiceRecord[],
  year: number,
  quarter: Quarter,
): Modelo349 {
  const period = getTaxPeriod(year, quarter);
  const periodInvoices = filterByPeriod(invoices, period).filter(
    (inv) => inv.status !== InvoiceStatus.ANULADA,
  );

  // Filter only intra-community operations
  const intraComInvoices = periodInvoices.filter((inv) => {
    const r = inv.recipient as CompanyData;
    return r.countryCode && r.countryCode !== "ES" && EU_COUNTRIES[r.countryCode] && r.taxId;
  });

  // Group by counterparty VAT number
  const grouped = new Map<string, Modelo349Entry>();
  for (const inv of intraComInvoices) {
    const r = inv.recipient as CompanyData;
    const vatNum = r.taxId;
    const existing = grouped.get(vatNum) ?? {
      euVatNumber: vatNum,
      operatorName: r.name,
      countryCode: r.countryCode,
      countryName: EU_COUNTRIES[r.countryCode]?.nameEs ?? r.countryCode,
      operationType: "E" as const, // Entrega de bienes
      amount: 0,
      invoiceCount: 0,
      invoiceNumbers: [],
    };
    existing.amount = r2(existing.amount + inv.totals.totalTaxableBase);
    existing.invoiceCount++;
    existing.invoiceNumbers.push(inv.invoiceNumber);
    grouped.set(vatNum, existing);
  }

  const entries = Array.from(grouped.values()).sort((a, b) => b.amount - a.amount);
  const totalAmount = r2(entries.reduce((s, e) => s + e.amount, 0));

  return {
    year,
    quarter,
    entries,
    totalAmount,
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESUMEN GEOGRÁFICO (para inspecciones)
// ═══════════════════════════════════════════════════════════════════════════════

export interface GeographicSummary {
  /** Desglose por tipo de operación */
  byType: {
    type: OperationType;
    count: number;
    base: number;
    vat: number;
    total: number;
  }[];
  /** Nacional: desglose por provincia */
  byProvince: {
    province: string;
    cpPrefix: string;
    count: number;
    base: number;
    vat: number;
    total: number;
  }[];
  /** Internacional: desglose por país */
  byCountry: {
    countryCode: string;
    countryName: string;
    type: OperationType;
    count: number;
    base: number;
    total: number;
  }[];
}

export function generateGeographicSummary(
  invoices: InvoiceRecord[],
): GeographicSummary {
  const active = invoices.filter((i) => i.status !== InvoiceStatus.ANULADA);

  const typeMap = new Map<OperationType, { count: number; base: number; vat: number; total: number }>();
  const provinceMap = new Map<string, { province: string; cpPrefix: string; count: number; base: number; vat: number; total: number }>();
  const countryMap = new Map<string, { countryCode: string; countryName: string; type: OperationType; count: number; base: number; total: number }>();

  for (const inv of active) {
    const opType = classifyOperation(inv.recipient);
    const base = inv.totals.totalTaxableBase;
    const vat = inv.totals.totalVAT;
    const total = inv.totals.totalInvoice;

    // By type
    const existing = typeMap.get(opType) ?? { count: 0, base: 0, vat: 0, total: 0 };
    existing.count++;
    existing.base = r2(existing.base + base);
    existing.vat = r2(existing.vat + vat);
    existing.total = r2(existing.total + total);
    typeMap.set(opType, existing);

    const addr = (inv.recipient as { address?: { postalCode?: string; province?: string } }).address;
    const code = inv.recipient.countryCode;

    if (opType === "nacional" && addr?.postalCode) {
      const cpPrefix = addr.postalCode.slice(0, 2);
      const province = SPANISH_PROVINCES[cpPrefix] ?? addr.province ?? "Desconocida";
      const key = cpPrefix;
      const prov = provinceMap.get(key) ?? { province, cpPrefix, count: 0, base: 0, vat: 0, total: 0 };
      prov.count++;
      prov.base = r2(prov.base + base);
      prov.vat = r2(prov.vat + vat);
      prov.total = r2(prov.total + total);
      provinceMap.set(key, prov);
    }

    if (opType !== "nacional" && code) {
      const countryName = EU_COUNTRIES[code]?.nameEs ?? code;
      const ck = countryMap.get(code) ?? { countryCode: code, countryName, type: opType, count: 0, base: 0, total: 0 };
      ck.count++;
      ck.base = r2(ck.base + base);
      ck.total = r2(ck.total + total);
      countryMap.set(code, ck);
    }
  }

  return {
    byType: Array.from(typeMap.entries()).map(([type, data]) => ({ type, ...data })),
    byProvince: Array.from(provinceMap.values()).sort((a, b) => b.total - a.total),
    byCountry: Array.from(countryMap.values()).sort((a, b) => b.total - a.total),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTACIONES
// ═══════════════════════════════════════════════════════════════════════════════

function fmtNum(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export function exportModelo349CSV(model: Modelo349): string {
  const headers = [
    "NIF Intracom.", "Nombre Operador", "País", "Tipo Operación",
    "Importe", "Nº Facturas", "Facturas",
  ];
  const rows = model.entries.map((e) =>
    [
      e.euVatNumber,
      `"${e.operatorName}"`,
      `${e.countryCode} - ${e.countryName}`,
      e.operationType === "E" ? "Entrega bienes" : e.operationType === "S" ? "Prestación servicios" : "Adquisición",
      fmtNum(e.amount),
      String(e.invoiceCount),
      `"${e.invoiceNumbers.join(", ")}"`,
    ].join(";"),
  );
  rows.push("");
  rows.push(`TOTAL;;;;;${fmtNum(model.totalAmount)};`);
  return "\uFEFF" + [headers.join(";"), ...rows].join("\n");
}

export function exportGeographicCSV(summary: GeographicSummary): string {
  const sections: string[] = [];

  // By type
  sections.push("RESUMEN POR TIPO DE OPERACIÓN");
  sections.push(["Tipo", "Nº Facturas", "Base Imponible", "IVA", "Total"].join(";"));
  for (const t of summary.byType) {
    sections.push([t.type, String(t.count), fmtNum(t.base), fmtNum(t.vat), fmtNum(t.total)].join(";"));
  }

  sections.push("");
  sections.push("DESGLOSE POR PROVINCIA (Nacional)");
  sections.push(["Provincia", "CP Prefijo", "Nº Facturas", "Base Imponible", "IVA", "Total"].join(";"));
  for (const p of summary.byProvince) {
    sections.push([`"${p.province}"`, p.cpPrefix, String(p.count), fmtNum(p.base), fmtNum(p.vat), fmtNum(p.total)].join(";"));
  }

  sections.push("");
  sections.push("DESGLOSE POR PAÍS (Internacional)");
  sections.push(["País", "Código", "Tipo", "Nº Facturas", "Base Imponible", "Total"].join(";"));
  for (const c of summary.byCountry) {
    sections.push([`"${c.countryName}"`, c.countryCode, c.type, String(c.count), fmtNum(c.base), fmtNum(c.total)].join(";"));
  }

  return "\uFEFF" + sections.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRACIÓN TPV / ERP (formatos estándar)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Exporta datos en formato compatible con software de gestión TPV/ERP.
 * Formato: JSON estructurado con esquema documentado.
 *
 * Compatible con: Holded, Contasol, Sage, A3, ContaPlus, Factusol
 */
export interface ERPExportRecord {
  /** Identificador único de la transacción */
  transactionId: string;
  /** Tipo: SALE, REFUND, PAYMENT */
  type: "SALE" | "REFUND" | "PAYMENT";
  /** Fecha ISO */
  date: string;
  /** Número de factura */
  invoiceNumber: string;
  /** Datos del cliente */
  customer: {
    name: string;
    taxId: string;
    countryCode: string;
    address: string;
    postalCode: string;
    city: string;
    province: string;
  };
  /** Líneas de detalle */
  lines: {
    productCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxableBase: number;
    vatRate: number;
    vatAmount: number;
    total: number;
  }[];
  /** Totales */
  totals: {
    taxableBase: number;
    totalVAT: number;
    totalSurcharge: number;
    totalInvoice: number;
  };
  /** Método de pago */
  paymentMethod: string;
  /** Canal de cobro (para TPV) */
  paymentChannel: string;
  /** Referencia de pago (ID transacción del gateway) */
  paymentReference: string;
  /** Clasificación geográfica */
  operationType: OperationType;
  /** Datos VeriFactu */
  verifactu: {
    hash: string;
    chainHash: string;
    status: string;
    qrUrl: string;
  };
}

export function exportForERP(invoices: InvoiceRecord[]): ERPExportRecord[] {
  return invoices
    .filter((inv) => inv.status !== InvoiceStatus.ANULADA)
    .map((inv) => {
      const r = inv.recipient as CompanyData & CustomerData;
      const addr = r.address ?? { street: "", postalCode: "", city: "", province: "", country: "" };
      const opType = classifyOperation(inv.recipient);

      return {
        transactionId: inv.invoiceId,
        type: inv.invoiceType === "rectificativa" ? "REFUND" as const : "SALE" as const,
        date: new Date(inv.invoiceDate).toISOString().slice(0, 10),
        invoiceNumber: inv.invoiceNumber,
        customer: {
          name: r.name ?? "",
          taxId: r.taxId ?? "",
          countryCode: r.countryCode ?? "ES",
          address: addr.street ?? "",
          postalCode: addr.postalCode ?? "",
          city: addr.city ?? "",
          province: addr.province ?? "",
        },
        lines: inv.items.map((item) => ({
          productCode: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxableBase: item.taxableBase,
          vatRate: item.vatRate,
          vatAmount: item.vatAmount,
          total: item.totalLine,
        })),
        totals: {
          taxableBase: inv.totals.totalTaxableBase,
          totalVAT: inv.totals.totalVAT,
          totalSurcharge: inv.totals.totalSurcharge,
          totalInvoice: inv.totals.totalInvoice,
        },
        paymentMethod: inv.paymentMethod,
        paymentChannel: inv.paymentMethod === "tarjeta" ? "CARD_TERMINAL" :
          inv.paymentMethod === "bizum" ? "MOBILE_PAYMENT" :
            inv.paymentMethod === "paypal" ? "ONLINE_WALLET" :
              inv.paymentMethod === "transferencia" ? "BANK_TRANSFER" :
                inv.paymentMethod === "efectivo" ? "CASH" : "OTHER",
        paymentReference: inv.sourceOrderId ?? "",
        operationType: opType,
        verifactu: {
          hash: inv.verifactuHash ?? "",
          chainHash: inv.verifactuChainHash ?? "",
          status: inv.verifactuStatus,
          qrUrl: inv.verifactuQR ?? "",
        },
      };
    });
}

/** Exporta para ERP en formato JSON descargable */
export function exportERPjson(invoices: InvoiceRecord[]): string {
  const data = exportForERP(invoices);
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    source: "TCG Academy",
    version: "1.0",
    format: "tcga-erp-v1",
    recordCount: data.length,
    records: data,
  }, null, 2);
}

/** Exporta para ERP en formato CSV plano (Sage/A3/ContaPlus) */
export function exportERPcsv(invoices: InvoiceRecord[]): string {
  const data = exportForERP(invoices);
  const headers = [
    "Tipo", "Fecha", "Nº Factura", "Cliente", "NIF/CIF", "País",
    "Dirección", "CP", "Ciudad", "Provincia",
    "Base Imponible", "IVA", "Recargo", "Total",
    "Forma Pago", "Canal Pago", "Tipo Operación",
    "Hash VeriFactu",
  ];
  const rows = data.map((r) =>
    [
      r.type,
      r.date,
      r.invoiceNumber,
      `"${r.customer.name}"`,
      r.customer.taxId,
      r.customer.countryCode,
      `"${r.customer.address}"`,
      r.customer.postalCode,
      `"${r.customer.city}"`,
      `"${r.customer.province}"`,
      fmtNum(r.totals.taxableBase),
      fmtNum(r.totals.totalVAT),
      fmtNum(r.totals.totalSurcharge),
      fmtNum(r.totals.totalInvoice),
      r.paymentMethod,
      r.paymentChannel,
      r.operationType,
      r.verifactu.hash.slice(0, 16),
    ].join(";"),
  );
  return "\uFEFF" + [headers.join(";"), ...rows].join("\n");
}
