import { PRODUCTS } from "@/data/products";
import { SITE_CONFIG } from "@/config/siteConfig";

interface CartItem {
  product_id: number;
  quantity: number;
  price: number; // client-submitted price
}

interface PriceVerificationResult {
  valid: boolean;
  verifiedTotal: number;
  clientTotal: number;
  discrepancies: Array<{
    productId: number;
    productName: string;
    clientPrice: number;
    serverPrice: number;
    difference: number;
  }>;
  items: Array<{
    productId: number;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

/**
 * Get the correct price for a product based on user role.
 * This is the server-side equivalent of the usePrice hook.
 */
function getProductPrice(productId: number, role: string): number | null {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return null;

  switch (role) {
    case "mayorista":
      return product.wholesalePrice;
    case "tienda":
      return product.storePrice;
    default:
      return product.price;
  }
}

/**
 * Verify all prices in a cart against the product catalog.
 * Prevents client-side price manipulation.
 *
 * Tolerance: 0.02€ per item (rounding differences).
 */
export function verifyCartPrices(
  items: CartItem[],
  userRole: string = "cliente",
): PriceVerificationResult {
  const TOLERANCE = 0.02;
  const discrepancies: PriceVerificationResult["discrepancies"] = [];
  const verifiedItems: PriceVerificationResult["items"] = [];
  let verifiedTotal = 0;
  let clientTotal = 0;

  for (const item of items) {
    const serverPrice = getProductPrice(item.product_id, userRole);
    const product = PRODUCTS.find((p) => p.id === item.product_id);

    if (serverPrice === null || !product) {
      discrepancies.push({
        productId: item.product_id,
        productName: "Producto no encontrado",
        clientPrice: item.price,
        serverPrice: 0,
        difference: item.price,
      });
      continue;
    }

    // Apply VAT to get final price (prices in catalog are VAT-inclusive for public)
    const finalPrice = serverPrice;
    const difference = Math.abs(item.price - finalPrice);

    if (difference > TOLERANCE) {
      discrepancies.push({
        productId: item.product_id,
        productName: product.name,
        clientPrice: item.price,
        serverPrice: finalPrice,
        difference,
      });
    }

    const lineTotal = finalPrice * item.quantity;
    verifiedTotal += lineTotal;
    clientTotal += item.price * item.quantity;

    verifiedItems.push({
      productId: item.product_id,
      name: product.name,
      quantity: item.quantity,
      unitPrice: finalPrice,
      lineTotal,
    });
  }

  return {
    valid: discrepancies.length === 0,
    verifiedTotal: Math.round(verifiedTotal * 100) / 100,
    clientTotal: Math.round(clientTotal * 100) / 100,
    discrepancies,
    items: verifiedItems,
  };
}

/**
 * Verify stock availability for all items in a cart.
 */
export function verifyStockAvailability(
  items: CartItem[],
): { available: boolean; issues: Array<{ productId: number; name: string; requested: number; available: number }> } {
  const issues: Array<{ productId: number; name: string; requested: number; available: number }> = [];

  // Read stock overrides from localStorage (in browser) or skip (in server)
  let overrides: Record<string, { stock?: number; inStock?: boolean }> = {};
  if (typeof window !== "undefined") {
    try {
      overrides = JSON.parse(localStorage.getItem("tcgacademy_product_overrides") ?? "{}");
    } catch { /* empty */ }
  }

  for (const item of items) {
    const product = PRODUCTS.find((p) => p.id === item.product_id);
    if (!product) {
      issues.push({ productId: item.product_id, name: "Desconocido", requested: item.quantity, available: 0 });
      continue;
    }

    // Check override first, then product data
    const override = overrides[String(item.product_id)];
    const currentStock = override?.stock ?? product.stock;
    const isInStock = override?.inStock ?? product.inStock;

    if (!isInStock) {
      issues.push({ productId: item.product_id, name: product.name, requested: item.quantity, available: 0 });
      continue;
    }

    if (currentStock !== undefined && item.quantity > currentStock) {
      issues.push({ productId: item.product_id, name: product.name, requested: item.quantity, available: currentStock });
    }
  }

  return { available: issues.length === 0, issues };
}

/**
 * Calculate shipping cost based on method and order total.
 */
export function calculateShipping(
  method: string,
  subtotal: number,
): number {
  if (method === "tienda") return 0;
  if (subtotal >= SITE_CONFIG.shippingThreshold) return 0; // Free shipping above threshold
  if (method === "express") return 6.99;
  return 3.99; // standard
}

/**
 * Full order verification: prices + stock + shipping.
 * Call this before creating an order.
 */
export function verifyOrder(
  items: CartItem[],
  shippingMethod: string,
  userRole: string = "cliente",
): {
  valid: boolean;
  priceResult: PriceVerificationResult;
  stockResult: ReturnType<typeof verifyStockAvailability>;
  shipping: number;
  total: number;
  errors: string[];
} {
  const priceResult = verifyCartPrices(items, userRole);
  const stockResult = verifyStockAvailability(items);
  const shipping = calculateShipping(shippingMethod, priceResult.verifiedTotal);
  const total = Math.round((priceResult.verifiedTotal + shipping) * 100) / 100;

  const errors: string[] = [];
  if (!priceResult.valid) {
    errors.push(`Discrepancia de precios detectada en ${priceResult.discrepancies.length} producto(s)`);
  }
  if (!stockResult.available) {
    for (const issue of stockResult.issues) {
      errors.push(`${issue.name}: solicitados ${issue.requested}, disponibles ${issue.available}`);
    }
  }

  return {
    valid: errors.length === 0,
    priceResult,
    stockResult,
    shipping,
    total,
    errors,
  };
}
