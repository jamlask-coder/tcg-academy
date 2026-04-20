import { describe, expect, it } from "vitest";
import { buildLineItem } from "@/services/invoiceService";

// GAP-014: recargoEquivalencia debe aplicarse correctamente para cada tipo de IVA.
// Tipos oficiales (Ley 37/1992 IVA, art. 161):
//   21% IVA → 5.2% RE
//   10% IVA → 1.4% RE
//    4% IVA → 0.5% RE
//    0% IVA →   0% RE
describe("invoiceService — buildLineItem con recargo de equivalencia", () => {
  it("no aplica recargo si applySurcharge=false (flujo B2C por defecto)", () => {
    const line = buildLineItem({
      lineNumber: 1,
      productId: "p1",
      description: "Booster Box",
      quantity: 1,
      unitPriceWithVAT: 121,
      vatRate: 21,
    });
    expect(line.surchargeRate).toBe(0);
    expect(line.surchargeAmount).toBe(0);
    expect(line.totalLine).toBeCloseTo(121, 2);
  });

  it("aplica 5.2% sobre base al IVA 21%", () => {
    const line = buildLineItem({
      lineNumber: 1,
      productId: "p1",
      description: "Booster Box",
      quantity: 1,
      unitPriceWithVAT: 121,
      vatRate: 21,
      applySurcharge: true,
    });
    // Base 100, IVA 21, RE 5.2
    expect(line.taxableBase).toBeCloseTo(100, 2);
    expect(line.vatAmount).toBeCloseTo(21, 2);
    expect(line.surchargeRate).toBe(5.2);
    expect(line.surchargeAmount).toBeCloseTo(5.2, 2);
    expect(line.totalLine).toBeCloseTo(126.2, 2);
  });

  it("aplica 1.4% sobre base al IVA 10%", () => {
    const line = buildLineItem({
      lineNumber: 1,
      productId: "p2",
      description: "Producto reducido",
      quantity: 1,
      unitPriceWithVAT: 110,
      vatRate: 10,
      applySurcharge: true,
    });
    expect(line.surchargeRate).toBe(1.4);
    expect(line.surchargeAmount).toBeCloseTo(1.4, 2);
    expect(line.totalLine).toBeCloseTo(111.4, 2);
  });

  it("aplica 0.5% sobre base al IVA 4%", () => {
    const line = buildLineItem({
      lineNumber: 1,
      productId: "p3",
      description: "Producto superreducido",
      quantity: 1,
      unitPriceWithVAT: 104,
      vatRate: 4,
      applySurcharge: true,
    });
    expect(line.surchargeRate).toBe(0.5);
    expect(line.surchargeAmount).toBeCloseTo(0.5, 2);
    expect(line.totalLine).toBeCloseTo(104.5, 2);
  });

  it("no aplica recargo al IVA 0% incluso si applySurcharge=true", () => {
    const line = buildLineItem({
      lineNumber: 1,
      productId: "p4",
      description: "Operación exenta",
      quantity: 1,
      unitPriceWithVAT: 100,
      vatRate: 0,
      applySurcharge: true,
    });
    expect(line.surchargeRate).toBe(0);
    expect(line.surchargeAmount).toBe(0);
  });
});
