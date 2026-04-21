import { describe, expect, it } from "vitest";
import {
  calculateVAT,
  calculateSurcharge,
  priceToBase,
  getApplicableTaxRate,
  isIntraCommunityOperation,
  isExtraEUExport,
  calculateTaxBreakdown,
  getQuarter,
  getTaxPeriod,
  filterByPeriod,
  generateQuarterlyReport,
  generateAnnualReport,
  buildExportRows,
  generateCSVForAdvisor,
  VAT_RATES,
  SURCHARGE_RATES,
} from "@/services/taxService";
import { TaxIdType, VerifactuStatus, InvoiceStatus, InvoiceType } from "@/types/fiscal";
import type {
  CompanyData,
  CustomerData,
  InvoiceLineItem,
  InvoiceRecord,
} from "@/types/fiscal";
import type { TaxExportOptions } from "@/types/tax";

const EXPORT_OPTS: TaxExportOptions = {
  period: null,
  format: "CSV",
  includeLineItems: false,
  includeRecipientData: true,
  filterByVatRate: null,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeLine(partial: Partial<InvoiceLineItem>): InvoiceLineItem {
  return {
    lineNumber: 1,
    productId: "p1",
    description: "Line",
    quantity: 1,
    unitPrice: 100,
    discount: 0,
    discountAmount: 0,
    taxableBase: 100,
    vatRate: 21,
    vatAmount: 21,
    surchargeRate: 0,
    surchargeAmount: 0,
    totalLine: 121,
    ...partial,
  };
}

function makeIssuer(): CompanyData {
  return {
    name: "TCG Academy",
    taxId: "B12345678",
    taxIdType: TaxIdType.CIF,
    address: {
      street: "Calle",
      city: "Madrid",
      postalCode: "28001",
      province: "Madrid",
      country: "España",
      countryCode: "ES",
    },
    phone: "+34900000000",
    email: "info@tcgacademy.es",
    isEU: false,
    countryCode: "ES",
  };
}

function makeCustomerES(): CustomerData {
  return {
    name: "Juan Pérez",
    taxId: "12345678Z",
    taxIdType: TaxIdType.NIF,
    countryCode: "ES",
  };
}

function makeInvoice(partial: Partial<InvoiceRecord> & { invoiceDate: Date; items: InvoiceLineItem[] }): InvoiceRecord {
  const { invoiceDate, items, recipient, status, ...rest } = partial;
  const totalBase = items.reduce((s, i) => s + i.taxableBase, 0);
  const totalVAT = items.reduce((s, i) => s + i.vatAmount, 0);
  const totalSurcharge = items.reduce((s, i) => s + i.surchargeAmount, 0);
  const totalInvoice = totalBase + totalVAT + totalSurcharge;
  return {
    invoiceId: "inv_1",
    invoiceNumber: "FAC-2026-00001",
    invoiceDate,
    operationDate: invoiceDate,
    invoiceType: InvoiceType.COMPLETA,
    issuer: makeIssuer(),
    recipient: recipient ?? makeCustomerES(),
    items,
    taxBreakdown: calculateTaxBreakdown(items),
    totals: {
      totalTaxableBase: totalBase,
      totalVAT,
      totalSurcharge,
      totalInvoice,
      totalPaid: totalInvoice,
      totalPending: 0,
      currency: "EUR",
    },
    paymentMethod: "tarjeta" as InvoiceRecord["paymentMethod"],
    paymentDate: invoiceDate,
    status: status ?? InvoiceStatus.EMITIDA,
    verifactuHash: "h",
    verifactuChainHash: "c",
    verifactuQR: null,
    verifactuStatus: VerifactuStatus.PENDIENTE,
    verifactuTimestamp: null,
    verifactuError: null,
    previousInvoiceChainHash: null,
    correctionData: null,
    sourceOrderId: null,
    createdAt: invoiceDate,
    updatedAt: invoiceDate,
    auditLog: [],
    metadata: {},
    ...rest,
  };
}

// ─── Tablas de tipos ─────────────────────────────────────────────────────────

describe("taxService — tablas fiscales", () => {
  it("VAT_RATES contiene los 4 tipos españoles oficiales", () => {
    expect(VAT_RATES).toEqual([0, 4, 10, 21]);
  });

  it("SURCHARGE_RATES sigue la correspondencia legal (art. 154 LIVA)", () => {
    expect(SURCHARGE_RATES[21]).toBe(5.2);
    expect(SURCHARGE_RATES[10]).toBe(1.4);
    expect(SURCHARGE_RATES[4]).toBe(0.5);
    expect(SURCHARGE_RATES[0]).toBe(0);
  });
});

// ─── Cálculos básicos ────────────────────────────────────────────────────────

describe("taxService — calculateVAT / calculateSurcharge / priceToBase", () => {
  it("calculateVAT redondea a 2 decimales", () => {
    expect(calculateVAT(100, 21)).toBe(21);
    expect(calculateVAT(33.33, 21)).toBeCloseTo(7, 2);
    expect(calculateVAT(0, 21)).toBe(0);
  });

  it("calculateSurcharge con 5.2% sobre base 100 da 5.2", () => {
    expect(calculateSurcharge(100, 5.2)).toBe(5.2);
    expect(calculateSurcharge(50, 1.4)).toBeCloseTo(0.7, 2);
  });

  it("priceToBase invierte el IVA: 121 con 21% → 100", () => {
    expect(priceToBase(121, 21)).toBe(100);
    expect(priceToBase(110, 10)).toBe(100);
    expect(priceToBase(104, 4)).toBe(100);
    expect(priceToBase(100, 0)).toBe(100);
  });
});

// ─── getApplicableTaxRate / operaciones UE ──────────────────────────────────

describe("taxService — reglas de territorialidad IVA", () => {
  it("cliente español → 21%", () => {
    expect(getApplicableTaxRate("p1", makeCustomerES())).toBe(21);
  });

  it("empresa UE con VAT intracomunitario → 0% (inversión sujeto pasivo)", () => {
    const euCompany: CompanyData = {
      ...makeIssuer(),
      taxId: "FR12345678901",
      taxIdType: TaxIdType.VAT_EU,
      isEU: true,
      countryCode: "FR",
    };
    expect(getApplicableTaxRate("p1", euCompany)).toBe(0);
    expect(isIntraCommunityOperation(euCompany)).toBe(true);
  });

  it("empresa en España aunque sea isEU=true NO es intracomunitaria", () => {
    const esCompany: CompanyData = { ...makeIssuer(), isEU: true };
    expect(isIntraCommunityOperation(esCompany)).toBe(false);
  });

  it("empresa UE sin NIF NO es intracomunitaria", () => {
    const noNif: CompanyData = {
      ...makeIssuer(),
      taxId: "",
      countryCode: "FR",
      isEU: true,
    };
    expect(isIntraCommunityOperation(noNif)).toBe(false);
  });

  it("cliente de USA → exportación extra-UE, IVA 0%", () => {
    const usCustomer: CustomerData = { name: "John Doe", countryCode: "US" };
    expect(isExtraEUExport(usCustomer)).toBe(true);
    expect(getApplicableTaxRate("p1", usCustomer)).toBe(0);
  });

  it("cliente en Alemania (UE) NO es exportación extra-UE", () => {
    const deCustomer: CustomerData = { name: "Hans", countryCode: "DE" };
    expect(isExtraEUExport(deCustomer)).toBe(false);
  });

  it("cliente sin countryCode NO se considera extra-UE", () => {
    const noCountry: CustomerData = { name: "X", countryCode: "" };
    expect(isExtraEUExport(noCountry)).toBe(false);
  });
});

// ─── calculateTaxBreakdown ───────────────────────────────────────────────────

describe("taxService — calculateTaxBreakdown", () => {
  it("agrupa líneas del mismo tipo de IVA y suma bases/cuotas", () => {
    const lines = [
      makeLine({ lineNumber: 1, taxableBase: 100, vatAmount: 21, totalLine: 121 }),
      makeLine({ lineNumber: 2, taxableBase: 50, vatAmount: 10.5, totalLine: 60.5 }),
    ];
    const breakdown = calculateTaxBreakdown(lines);
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].vatRate).toBe(21);
    expect(breakdown[0].taxableBase).toBe(150);
    expect(breakdown[0].vatAmount).toBe(31.5);
    expect(breakdown[0].total).toBe(181.5);
  });

  it("separa líneas con tipos de IVA distintos, ordena desc por vatRate", () => {
    const lines = [
      makeLine({ lineNumber: 1, vatRate: 4, taxableBase: 100, vatAmount: 4, totalLine: 104 }),
      makeLine({ lineNumber: 2, vatRate: 21, taxableBase: 100, vatAmount: 21, totalLine: 121 }),
      makeLine({ lineNumber: 3, vatRate: 10, taxableBase: 100, vatAmount: 10, totalLine: 110 }),
    ];
    const breakdown = calculateTaxBreakdown(lines);
    expect(breakdown.map((b) => b.vatRate)).toEqual([21, 10, 4]);
  });

  it("líneas vacías devuelven array vacío", () => {
    expect(calculateTaxBreakdown([])).toEqual([]);
  });
});

// ─── Períodos fiscales ───────────────────────────────────────────────────────

describe("taxService — períodos trimestrales", () => {
  it("getQuarter asigna mes al trimestre correcto", () => {
    expect(getQuarter(1)).toBe(1);
    expect(getQuarter(3)).toBe(1);
    expect(getQuarter(4)).toBe(2);
    expect(getQuarter(6)).toBe(2);
    expect(getQuarter(7)).toBe(3);
    expect(getQuarter(9)).toBe(3);
    expect(getQuarter(10)).toBe(4);
    expect(getQuarter(12)).toBe(4);
  });

  it("getTaxPeriod Q1 2026 → enero-marzo, vencimiento 20 abril", () => {
    const p = getTaxPeriod(2026, 1);
    expect(p.year).toBe(2026);
    expect(p.quarter).toBe(1);
    expect(p.startMonth).toBe(1);
    expect(p.endMonth).toBe(3);
    expect(p.dueDate.getMonth()).toBe(3); // abril = index 3
    expect(p.dueDate.getDate()).toBe(20);
  });

  it("getTaxPeriod Q4 2026 → oct-dic, vencimiento 20 enero 2027", () => {
    const p = getTaxPeriod(2026, 4);
    expect(p.startMonth).toBe(10);
    expect(p.endMonth).toBe(12);
    expect(p.dueDate.getFullYear()).toBe(2027);
    expect(p.dueDate.getMonth()).toBe(0); // enero
  });

  it("filterByPeriod mantiene solo facturas del trimestre", () => {
    const invoices = [
      makeInvoice({ invoiceId: "1", invoiceDate: new Date("2026-01-15"), items: [makeLine({})] }),
      makeInvoice({ invoiceId: "2", invoiceDate: new Date("2026-04-01"), items: [makeLine({})] }),
      makeInvoice({ invoiceId: "3", invoiceDate: new Date("2025-03-10"), items: [makeLine({})] }),
    ];
    const filtered = filterByPeriod(invoices, getTaxPeriod(2026, 1));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].invoiceId).toBe("1");
  });
});

// ─── Modelo 303 ──────────────────────────────────────────────────────────────

describe("taxService — generateQuarterlyReport (Modelo 303)", () => {
  it("suma IVA repercutido del trimestre y excluye anuladas", () => {
    const invoices = [
      makeInvoice({ invoiceId: "a", invoiceDate: new Date("2026-02-01"), items: [makeLine({})] }),
      makeInvoice({ invoiceId: "b", invoiceDate: new Date("2026-02-15"), items: [makeLine({})] }),
      makeInvoice({
        invoiceId: "c",
        invoiceDate: new Date("2026-02-20"),
        items: [makeLine({})],
        status: InvoiceStatus.ANULADA,
      }),
    ];
    const report = generateQuarterlyReport(invoices, 2026, 1);
    expect(report.invoiceCount).toBe(2);
    expect(report.totalOutputVAT).toBe(42);
    expect(report.totalTaxableBase).toBe(200);
    expect(report.totalInvoiced).toBe(242);
    expect(report.outputVAT).toHaveLength(1);
    expect(report.outputVAT[0].invoiceCount).toBe(2);
  });

  it("separa intracomunitario vs exento al 0% de IVA", () => {
    const intraLine = makeLine({ vatRate: 0, vatAmount: 0, taxableBase: 100, totalLine: 100 });
    const intraRecipient: CompanyData = {
      ...makeIssuer(),
      taxId: "FR12345678901",
      taxIdType: TaxIdType.VAT_EU,
      isEU: true,
      countryCode: "FR",
    };
    const exemptLine = makeLine({ vatRate: 0, vatAmount: 0, taxableBase: 50, totalLine: 50 });
    const exemptRecipient: CustomerData = { name: "US Customer", countryCode: "US" };

    const invoices = [
      makeInvoice({
        invoiceId: "intra",
        invoiceDate: new Date("2026-01-10"),
        items: [intraLine],
        recipient: intraRecipient,
      }),
      makeInvoice({
        invoiceId: "exempt",
        invoiceDate: new Date("2026-01-12"),
        items: [exemptLine],
        recipient: exemptRecipient,
      }),
    ];
    const report = generateQuarterlyReport(invoices, 2026, 1);
    expect(report.intraCommunityAmount).toBe(100);
    expect(report.exemptAmount).toBe(50);
  });

  it("período sin facturas devuelve totales 0", () => {
    const report = generateQuarterlyReport([], 2026, 3);
    expect(report.totalOutputVAT).toBe(0);
    expect(report.totalTaxableBase).toBe(0);
    expect(report.invoiceCount).toBe(0);
  });
});

// ─── Modelo 390 ──────────────────────────────────────────────────────────────

describe("taxService — generateAnnualReport (Modelo 390)", () => {
  it("suma 4 trimestres y devuelve 4 entradas quarters[]", () => {
    const invoices = [
      makeInvoice({ invoiceId: "q1", invoiceDate: new Date("2026-02-01"), items: [makeLine({})] }),
      makeInvoice({ invoiceId: "q2", invoiceDate: new Date("2026-05-01"), items: [makeLine({})] }),
      makeInvoice({ invoiceId: "q3", invoiceDate: new Date("2026-08-01"), items: [makeLine({})] }),
      makeInvoice({ invoiceId: "q4", invoiceDate: new Date("2026-11-01"), items: [makeLine({})] }),
    ];
    const report = generateAnnualReport(invoices, 2026);
    expect(report.quarters).toHaveLength(4);
    expect(report.totalInvoices).toBe(4);
    expect(report.totalOutputVAT).toBe(84);
    expect(report.totalTaxableBase).toBe(400);
  });

  it("ignora facturas de otros años", () => {
    const invoices = [
      makeInvoice({ invoiceId: "a", invoiceDate: new Date("2025-12-15"), items: [makeLine({})] }),
      makeInvoice({ invoiceId: "b", invoiceDate: new Date("2026-01-15"), items: [makeLine({})] }),
    ];
    const report = generateAnnualReport(invoices, 2026);
    expect(report.totalInvoices).toBe(1);
  });
});

// ─── Exportación CSV ─────────────────────────────────────────────────────────

describe("taxService — buildExportRows / generateCSVForAdvisor", () => {
  it("buildExportRows mapea los 4 tipos de IVA a columnas dedicadas", () => {
    const invoice = makeInvoice({
      invoiceId: "x",
      invoiceDate: new Date("2026-01-15"),
      items: [
        makeLine({ lineNumber: 1, vatRate: 21, taxableBase: 100, vatAmount: 21, totalLine: 121 }),
        makeLine({ lineNumber: 2, vatRate: 10, taxableBase: 50, vatAmount: 5, totalLine: 55 }),
      ],
    });
    const rows = buildExportRows([invoice]);
    expect(rows).toHaveLength(1);
    expect(rows[0].base21).toBe(100);
    expect(rows[0].vat21).toBe(21);
    expect(rows[0].base10).toBe(50);
    expect(rows[0].vat10).toBe(5);
    expect(rows[0].base4).toBe(0);
    expect(rows[0].base0).toBe(0);
  });

  it("generateCSVForAdvisor añade BOM UTF-8 y separador punto y coma", () => {
    const invoice = makeInvoice({
      invoiceId: "csv",
      invoiceDate: new Date("2026-01-15"),
      items: [makeLine({})],
    });
    const csv = generateCSVForAdvisor([invoice], EXPORT_OPTS);
    expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM
    expect(csv.split("\n")[0]).toContain("Nº Factura;Fecha;Cliente");
  });

  it("generateCSVForAdvisor usa coma decimal (formato español)", () => {
    const invoice = makeInvoice({
      invoiceId: "csv2",
      invoiceDate: new Date("2026-01-15"),
      items: [makeLine({ taxableBase: 33.33, vatAmount: 7.0, totalLine: 40.33 })],
    });
    const csv = generateCSVForAdvisor([invoice], EXPORT_OPTS);
    expect(csv).toContain("33,33");
    expect(csv).not.toContain("33.33");
  });
});
