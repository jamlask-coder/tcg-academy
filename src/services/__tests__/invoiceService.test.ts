import { describe, expect, it } from "vitest";
import {
  computeControlDigits,
  verifyInvoiceNumber,
  chainInvoiceHash,
  generateInvoiceHash,
  validateInvoice,
  buildLineItem,
  saveInvoice,
  verifyDeepIntegrity,
  INVOICE_ORIGIN_WEB,
} from "@/services/invoiceService";
import { TaxIdType, VerifactuStatus, InvoiceStatus, InvoiceType } from "@/types/fiscal";
import type { CompanyData, InvoiceRecord } from "@/types/fiscal";

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

function makeRecipient(taxId = "12345678Z"): CompanyData {
  return { ...makeIssuer(), name: "Juan Pérez", taxId, taxIdType: TaxIdType.NIF };
}

function makeInvoice(overrides: Partial<InvoiceRecord> = {}): InvoiceRecord {
  const line = buildLineItem({
    lineNumber: 1,
    productId: "p1",
    description: "Booster Box",
    quantity: 1,
    unitPriceWithVAT: 121,
    vatRate: 21,
  });
  return {
    invoiceId: "inv_1",
    invoiceNumber: "FAC-2026-00001",
    invoiceDate: new Date("2026-04-01"),
    operationDate: new Date("2026-04-01"),
    invoiceType: InvoiceType.COMPLETA,
    issuer: makeIssuer(),
    recipient: makeRecipient(),
    items: [line],
    taxBreakdown: [
      {
        vatRate: 21,
        taxableBase: 100,
        vatAmount: 21,
        surchargeRate: 0,
        surchargeAmount: 0,
        total: 121,
      },
    ],
    totals: {
      totalTaxableBase: 100,
      totalVAT: 21,
      totalSurcharge: 0,
      totalInvoice: 121,
      totalPaid: 121,
      totalPending: 0,
      currency: "EUR",
    },
    paymentMethod: "tarjeta" as InvoiceRecord["paymentMethod"],
    paymentDate: new Date("2026-04-01"),
    status: InvoiceStatus.EMITIDA,
    verifactuHash: "h",
    verifactuChainHash: "c",
    verifactuQR: null,
    verifactuStatus: VerifactuStatus.PENDIENTE,
    verifactuTimestamp: null,
    verifactuError: null,
    previousInvoiceChainHash: null,
    correctionData: null,
    sourceOrderId: null,
    createdAt: new Date("2026-04-01"),
    updatedAt: new Date("2026-04-01"),
    auditLog: [],
    metadata: {},
    ...overrides,
  };
}

// ─── Dígitos de control ──────────────────────────────────────────────────────

describe("invoiceService — computeControlDigits", () => {
  it("es determinista: misma (N, año) → mismo resultado", () => {
    const a = computeControlDigits(1, 2026);
    const b = computeControlDigits(1, 2026);
    expect(a).toBe(b);
  });

  it("siempre devuelve exactamente 5 dígitos (padStart)", () => {
    for (let n = 0; n < 10; n++) {
      const digits = computeControlDigits(n, 2026);
      expect(digits).toMatch(/^\d{5}$/);
      expect(digits.length).toBe(5);
    }
  });

  it("N y año distintos producen dígitos distintos", () => {
    const a = computeControlDigits(1, 2026);
    const b = computeControlDigits(2, 2026);
    const c = computeControlDigits(1, 2027);
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("invoiceService — verifyInvoiceNumber", () => {
  it("acepta formato legacy FAC-YYYY-NNNNN como válido", () => {
    const res = verifyInvoiceNumber("FAC-2025-00001");
    expect(res.valid).toBe(true);
    expect(res.reason).toBe("legacy");
  });

  it("acepta formato nuevo con dígitos de control correctos", () => {
    const year = 2026;
    const n = 7;
    const x = computeControlDigits(n, year);
    const num = `FAC-${year}-${String(n).padStart(5, "0")}${x}${INVOICE_ORIGIN_WEB}`;
    expect(verifyInvoiceNumber(num).valid).toBe(true);
  });

  it("rechaza formato nuevo con dígitos de control alterados", () => {
    const year = 2026;
    const n = 7;
    const x = computeControlDigits(n, year);
    const badX = x === "00000" ? "99999" : "00000";
    const num = `FAC-${year}-${String(n).padStart(5, "0")}${badX}${INVOICE_ORIGIN_WEB}`;
    const res = verifyInvoiceNumber(num);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain("dígitos de control");
  });

  it("rechaza formatos completamente irreconocibles", () => {
    expect(verifyInvoiceNumber("foo").valid).toBe(false);
    expect(verifyInvoiceNumber("").valid).toBe(false);
  });
});

// ─── Hash y encadenamiento ───────────────────────────────────────────────────

describe("invoiceService — hash encadenado", () => {
  it("generateInvoiceHash produce SHA-256 hex (64 chars) determinista", async () => {
    const invoice = makeInvoice();
    const h1 = await generateInvoiceHash(invoice);
    const h2 = await generateInvoiceHash(invoice);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("distintas facturas producen hashes distintos", async () => {
    const a = makeInvoice({ invoiceNumber: "FAC-2026-00001" });
    const b = makeInvoice({ invoiceNumber: "FAC-2026-00002" });
    expect(await generateInvoiceHash(a)).not.toBe(await generateInvoiceHash(b));
  });

  it("chainInvoiceHash combina hash actual con el anterior", async () => {
    const h = "abc123";
    const chainedSolo = await chainInvoiceHash(h, null);
    const chainedWithPrev = await chainInvoiceHash(h, "prev456");
    expect(chainedSolo).not.toBe(chainedWithPrev);
    expect(chainedSolo).toMatch(/^[a-f0-9]{64}$/);
  });

  it("chainInvoiceHash con prev=null equivale a prev=''", async () => {
    const hashNull = await chainInvoiceHash("X", null);
    const hashEmpty = await chainInvoiceHash("X", "");
    expect(hashNull).toBe(hashEmpty);
  });

  it("detecta manipulación: alterar un campo cambia el hash encadenado", async () => {
    const original = makeInvoice();
    const manipulated = makeInvoice({
      totals: { ...original.totals, totalInvoice: 999999 },
    });
    const h1 = await generateInvoiceHash(original);
    const h2 = await generateInvoiceHash(manipulated);
    expect(h1).not.toBe(h2);
  });
});

// ─── Validación ──────────────────────────────────────────────────────────────

describe("invoiceService — validateInvoice", () => {
  it("factura completa válida pasa sin errores", () => {
    const result = validateInvoice(makeInvoice());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("detecta falta de NIF del receptor en factura completa", () => {
    const invoice = makeInvoice({
      recipient: { ...makeRecipient(), taxId: "" },
    });
    const result = validateInvoice(invoice);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("NIF"))).toBe(true);
  });

  it("detecta NIF español mal formado", () => {
    const invoice = makeInvoice({
      recipient: { ...makeRecipient(), taxId: "12345" },
    });
    const result = validateInvoice(invoice);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes("no válido"))).toBe(true);
  });

  it("detecta factura sin líneas", () => {
    const invoice = makeInvoice({ items: [] });
    const result = validateInvoice(invoice);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("al menos una línea"))).toBe(true);
  });

  it("rectificativa sin correctionData produce error", () => {
    const invoice = makeInvoice({
      invoiceType: InvoiceType.RECTIFICATIVA,
      correctionData: null,
    });
    const result = validateInvoice(invoice);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("rectificativas"))).toBe(true);
  });

  it("total ≤ 0 produce warning (no error)", () => {
    const invoice = makeInvoice({
      totals: {
        totalTaxableBase: 0,
        totalVAT: 0,
        totalSurcharge: 0,
        totalInvoice: 0,
        totalPaid: 0,
        totalPending: 0,
        currency: "EUR",
      },
    });
    const result = validateInvoice(invoice);
    expect(result.warnings.some((w) => w.includes("0 o negativo"))).toBe(true);
  });

  it("factura sin hash VeriFactu añade warning", () => {
    const invoice = makeInvoice({ verifactuHash: null, verifactuChainHash: null });
    const result = validateInvoice(invoice);
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── buildLineItem ───────────────────────────────────────────────────────────

describe("invoiceService — buildLineItem básicos (sin recargo)", () => {
  it("descompone precio con IVA en base + IVA correctamente", () => {
    const line = buildLineItem({
      lineNumber: 1,
      productId: "p1",
      description: "Carta",
      quantity: 2,
      unitPriceWithVAT: 121,
      vatRate: 21,
    });
    expect(line.unitPrice).toBe(100);
    expect(line.taxableBase).toBe(200);
    expect(line.vatAmount).toBe(42);
    expect(line.totalLine).toBe(242);
  });

  it("aplica descuento sobre subtotal antes de IVA", () => {
    const line = buildLineItem({
      lineNumber: 1,
      productId: "p1",
      description: "Descuento",
      quantity: 1,
      unitPriceWithVAT: 121,
      vatRate: 21,
      discount: 10,
    });
    // Subtotal 100, descuento 10 → base 90, IVA 18.9, total 108.9
    expect(line.discountAmount).toBe(10);
    expect(line.taxableBase).toBe(90);
    expect(line.vatAmount).toBeCloseTo(18.9, 2);
    expect(line.totalLine).toBeCloseTo(108.9, 2);
  });

  it("IVA 0% → base = precio completo", () => {
    const line = buildLineItem({
      lineNumber: 1,
      productId: "p1",
      description: "Exento",
      quantity: 1,
      unitPriceWithVAT: 100,
      vatRate: 0,
    });
    expect(line.taxableBase).toBe(100);
    expect(line.vatAmount).toBe(0);
    expect(line.totalLine).toBe(100);
  });
});

// ─── Blindaje anti-corrupción: saveInvoice rechaza facturas inconsistentes ───

describe("invoiceService — blindaje saveInvoice (triple check)", () => {
  it("rechaza factura con totales manipulados", () => {
    const corrupt = makeInvoice({
      totals: {
        totalTaxableBase: 100,
        totalVAT: 21,
        totalSurcharge: 0,
        totalInvoice: 121,
        totalPaid: 121,
        totalPending: 0,
        currency: "EUR",
      },
      // Desglose incoherente: base 999 en vez de 100
      taxBreakdown: [
        {
          vatRate: 21,
          taxableBase: 999,
          vatAmount: 209.79,
          surchargeRate: 0,
          surchargeAmount: 0,
          total: 1208.79,
        },
      ],
    });

    expect(() => saveInvoice(corrupt)).toThrow(/blindaje fiscal/);
  });

  it("acepta factura coherente en los 3 métodos", () => {
    const ok = makeInvoice();
    // No debe lanzar (aunque saveInvoice toca localStorage, en jsdom no falla)
    expect(() => saveInvoice(ok)).not.toThrow();
  });
});

describe("invoiceService — verifyDeepIntegrity", () => {
  it("no reporta issues para factura coherente sin cadena previa", async () => {
    const ok = makeInvoice({
      verifactuHash: await generateInvoiceHash(makeInvoice()),
      verifactuChainHash: null,
    });
    const issues = await verifyDeepIntegrity([ok]);
    // Puede reportar chain_hash_mismatch si el chain es null; el caso real es
    // que si hash coincide y no hay chain, no debe fallar content_hash.
    const contentIssues = issues.filter(
      (i) => i.kind === "content_hash_mismatch",
    );
    expect(contentIssues).toHaveLength(0);
  });

  it("detecta content_hash_mismatch si alguien edita campos tras emitir", async () => {
    const original = makeInvoice();
    const originalHash = await generateInvoiceHash(original);
    // Simulamos manipulación: guardamos el hash original pero editamos el total
    const tampered: InvoiceRecord = {
      ...original,
      verifactuHash: originalHash,
      totals: { ...original.totals, totalInvoice: 99999 },
      // Mantenemos coherencia interna para pasar triple-check
      items: [
        buildLineItem({
          lineNumber: 1,
          productId: "p1",
          description: "Booster Box",
          quantity: 1,
          unitPriceWithVAT: 99999,
          vatRate: 21,
        }),
      ],
      taxBreakdown: [
        {
          vatRate: 21,
          taxableBase: 82644.63,
          vatAmount: 17354.37,
          surchargeRate: 0,
          surchargeAmount: 0,
          total: 99999,
        },
      ],
    };

    const issues = await verifyDeepIntegrity([tampered]);
    const contentIssues = issues.filter(
      (i) => i.kind === "content_hash_mismatch",
    );
    expect(contentIssues.length).toBeGreaterThan(0);
  });
});
