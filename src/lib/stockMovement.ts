/**
 * Stock movements triggered by fiscal documents (manual invoices + albaranes).
 *
 * Web checkout already decrements stock in `src/app/finalizar-compra/page.tsx`
 * right before saving the order. Manual emission from `/admin/fiscal` (factura
 * manual o albarán) historically NO tocaba el stock → riesgo de sobreventa.
 *
 * Regla: el stock se resta UNA SOLA VEZ, al primer documento que represente
 * la salida física del producto:
 *   - Albarán manual → resta aquí. Si luego se convierte a factura vía
 *     `convertToInvoice()`, NO se vuelve a restar (el albarán ya lo hizo).
 *   - Factura manual directa (sin albarán previo) → resta aquí.
 *   - Factura web (checkout) → resta en `/finalizar-compra`, no aquí.
 *
 * Las líneas sintéticas (`"manual"` para texto libre, `"shipping"`, `"coupon"`,
 * `"global-discount"`) no son productos del catálogo — se filtran sin tocar
 * stock.
 */

import type { InvoiceLineItem } from "@/types/fiscal";
import { getMergedById } from "@/lib/productStore";
import { persistProductPatch } from "@/lib/productPersist";

/** IDs sintéticos que las formas fiscales insertan como líneas NO-producto. */
const SYNTHETIC_LINE_IDS = new Set([
  "manual",
  "shipping",
  "coupon",
  "global-discount",
]);

function toCatalogId(productId: string): number | null {
  if (SYNTHETIC_LINE_IDS.has(productId)) return null;
  const n = Number.parseInt(productId, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Descuenta stock de los productos reales del catálogo presentes en `items`.
 * Silencioso ante IDs sintéticos o productos no encontrados (no es crítico).
 * Emite un único `tcga:products:updated` al final para refrescar vistas.
 */
export function deductStockForInvoiceItems(items: InvoiceLineItem[]): void {
  if (typeof window === "undefined") return;
  for (const item of items) {
    const catalogId = toCatalogId(item.productId);
    if (catalogId === null) continue;
    const product = getMergedById(catalogId);
    if (!product || typeof product.stock !== "number") continue;
    const newStock = Math.max(0, product.stock - item.quantity);
    // persistProductPatch emite DataHub("products") por iteración.
    persistProductPatch(catalogId, {
      stock: newStock,
      inStock: newStock > 0,
    });
  }
}
