import { describe, expect, it } from "vitest";
import {
  getEffectiveStock,
  getStockInfo,
  isProductInStock,
} from "@/utils/stockStatus";

describe("stockStatus SSOT", () => {
  describe("getEffectiveStock — stock número manda sobre inStock bool", () => {
    it("stock=300 + inStock=false → 300 (no 0)", () => {
      // Regresión: producto Nihil Zero M3 mostraba "Agotado · 300 ud."
      // porque los 2 campos divergían y la UI priorizaba inStock.
      expect(getEffectiveStock({ stock: 300, inStock: false })).toBe(300);
    });

    it("stock=0 + inStock=true → 0 (no undefined)", () => {
      expect(getEffectiveStock({ stock: 0, inStock: true })).toBe(0);
    });

    it("stock undefined + inStock=true → undefined (ilimitado)", () => {
      expect(getEffectiveStock({ inStock: true })).toBeUndefined();
    });

    it("stock undefined + inStock=false → 0 (agotado)", () => {
      expect(getEffectiveStock({ inStock: false })).toBe(0);
    });

    it("stock=50 + inStock=true → 50", () => {
      expect(getEffectiveStock({ stock: 50, inStock: true })).toBe(50);
    });
  });

  describe("isProductInStock — coherente con getEffectiveStock", () => {
    it("stock=300 + inStock=false → true (la inconsistencia la resuelve stock)", () => {
      expect(isProductInStock({ stock: 300, inStock: false })).toBe(true);
    });

    it("stock=0 + inStock=true → false", () => {
      expect(isProductInStock({ stock: 0, inStock: true })).toBe(false);
    });

    it("stock undefined + inStock=true → true (ilimitado)", () => {
      expect(isProductInStock({ inStock: true })).toBe(true);
    });

    it("stock undefined + inStock=false → false", () => {
      expect(isProductInStock({ inStock: false })).toBe(false);
    });
  });

  describe("getStockInfo + getEffectiveStock — etiqueta coherente", () => {
    it("stock=300 + inStock=false NO debe etiquetarse como 'Agotado'", () => {
      const si = getStockInfo(getEffectiveStock({ stock: 300, inStock: false }));
      expect(si.level).not.toBe("out");
      expect(si.label).not.toBe("Agotado");
      expect(si.level).toBe("available");
    });

    it("stock=0 → 'Agotado'", () => {
      const si = getStockInfo(getEffectiveStock({ stock: 0, inStock: true }));
      expect(si.level).toBe("out");
      expect(si.label).toBe("Agotado");
    });

    it("stock undefined + inStock=false → 'Agotado'", () => {
      const si = getStockInfo(getEffectiveStock({ inStock: false }));
      expect(si.level).toBe("out");
    });

    it("stock=5 → '¡Últimas unidades!'", () => {
      const si = getStockInfo(getEffectiveStock({ stock: 5, inStock: true }));
      expect(si.level).toBe("last");
    });

    it("stock=15 → 'Pocas unidades'", () => {
      const si = getStockInfo(getEffectiveStock({ stock: 15, inStock: true }));
      expect(si.level).toBe("low");
    });
  });
});
