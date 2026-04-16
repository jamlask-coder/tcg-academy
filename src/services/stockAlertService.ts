// ── Stock Alert Service ──────────────────────────────────────────────────────
// Provides stock monitoring: low-stock alerts, out-of-stock lists, summaries.
// Reads base data from products.ts and merges runtime overrides from localStorage.

import { PRODUCTS, type LocalProduct } from "@/data/products";
import { getMergedProducts } from "@/lib/productStore";

// ── Types ────────────────────────────────────────────────────────────────────

export interface StockAlert {
  product: LocalProduct;
  stock: number;
}

export interface StockSummary {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  noStockTracked: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the effective stock for a product, considering localStorage overrides. */
function getEffectiveStock(product: LocalProduct): number | undefined {
  return product.stock;
}

/** Get all products with runtime overrides applied. */
function getAllProducts(): LocalProduct[] {
  if (typeof window === "undefined") return PRODUCTS;
  return getMergedProducts();
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns products with stock at or below the given threshold.
 * Only includes products that have numeric stock tracking.
 */
export function getStockAlerts(threshold = 5): StockAlert[] {
  return getAllProducts()
    .filter((p) => {
      const stock = getEffectiveStock(p);
      return stock !== undefined && stock <= threshold;
    })
    .map((p) => ({
      product: p,
      stock: getEffectiveStock(p) ?? 0,
    }))
    .sort((a, b) => a.stock - b.stock);
}

/**
 * Returns products with stock between 1 and 10 (low but not zero).
 */
export function getLowStockProducts(): StockAlert[] {
  return getAllProducts()
    .filter((p) => {
      const stock = getEffectiveStock(p);
      return stock !== undefined && stock >= 1 && stock <= 10;
    })
    .map((p) => ({
      product: p,
      stock: getEffectiveStock(p) ?? 0,
    }))
    .sort((a, b) => a.stock - b.stock);
}

/**
 * Returns products that are out of stock (stock === 0 or inStock === false).
 */
export function getOutOfStockProducts(): StockAlert[] {
  return getAllProducts()
    .filter((p) => p.stock === 0 || p.inStock === false)
    .map((p) => ({
      product: p,
      stock: getEffectiveStock(p) ?? 0,
    }));
}

/**
 * Returns a summary of stock across all products.
 */
export function getStockSummary(): StockSummary {
  const products = getAllProducts();
  let inStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let noStockTracked = 0;

  for (const p of products) {
    const stock = getEffectiveStock(p);
    if (stock === undefined) {
      noStockTracked++;
    } else if (stock === 0 || !p.inStock) {
      outOfStock++;
    } else if (stock <= 10) {
      lowStock++;
    } else {
      inStock++;
    }
  }

  return {
    total: products.length,
    inStock,
    lowStock,
    outOfStock,
    noStockTracked,
  };
}
