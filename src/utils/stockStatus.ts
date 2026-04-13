/**
 * Stock status criteria — single source of truth.
 * Used in: admin herramientas, product detail, product cards, quick view.
 *
 * Rules:
 *  - stock === undefined  → unlimited, show "En stock"
 *  - stock >= 20          → "Stock disponible"
 *  - stock >= 11 && <= 19 → "Pocas unidades"  (amber warning)
 *  - stock >= 1  && <= 10 → "¡Últimas unidades!" (red urgency)
 *  - stock === 0          → "Agotado"
 */

export type StockLevel = "unlimited" | "available" | "low" | "last" | "out";

export interface StockInfo {
  level: StockLevel;
  label: string;
  color: string;       // text color class
  bgColor: string;     // bg color class
  dotColor: string;    // dot/indicator color class
}

export const STOCK_THRESHOLDS = {
  lastUnits: 10,  // <= 10 → últimas unidades
  lowStock: 19,   // <= 19 → pocas unidades
  available: 20,  // >= 20 → stock disponible
} as const;

export function getStockInfo(stock: number | undefined): StockInfo {
  if (stock === undefined) {
    return {
      level: "unlimited",
      label: "En stock",
      color: "text-green-600",
      bgColor: "bg-green-50",
      dotColor: "bg-green-500",
    };
  }
  if (stock === 0) {
    return {
      level: "out",
      label: "Agotado",
      color: "text-red-600",
      bgColor: "bg-red-50",
      dotColor: "bg-red-500",
    };
  }
  if (stock <= STOCK_THRESHOLDS.lastUnits) {
    return {
      level: "last",
      label: "¡Últimas unidades!",
      color: "text-red-600",
      bgColor: "bg-red-50",
      dotColor: "bg-red-500",
    };
  }
  if (stock <= STOCK_THRESHOLDS.lowStock) {
    return {
      level: "low",
      label: "Pocas unidades",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      dotColor: "bg-amber-500",
    };
  }
  return {
    level: "available",
    label: "En stock",
    color: "text-green-600",
    bgColor: "bg-green-50",
    dotColor: "bg-green-500",
  };
}
