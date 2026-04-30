import { PRODUCTS, type LocalProduct } from "@/data/products";
import { SITE_CONFIG } from "@/config/siteConfig";
import { getRoleLimit, getPurchasedQty } from "@/services/purchaseLimitService";
import type { UserRole } from "@/types/user";
import { getDb, type CouponRecord } from "@/lib/db";
import { POINTS_PER_EURO_REDEMPTION } from "@/services/pointsService";
import {
  isEventVirtualId,
  resolveEventVirtualProduct,
} from "@/lib/eventProduct";

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
    /** Snapshot fields — congelados en el pedido para inmutabilidad fiscal. */
    category?: string;
    game?: string;
    language?: string;
    imageUrl?: string;
    vatRate?: number;
  }>;
}

/**
 * Aplica sobre un producto los overrides de localStorage (precio + stock +
 * límites). En servidor devuelve el producto tal cual — los overrides son
 * datos de cliente; el motor server-side real los leerá de BD.
 *
 * Incidente 2026-04-22: antes sólo `verifyPurchaseLimits` aplicaba overrides;
 * `getProductPrice` y `verifyStockAvailability` leían PRODUCTS crudo → el
 * precio editado por el admin en /admin/precios o /admin/stock no se
 * consideraba al verificar el carrito → factura con precio obsoleto.
 */
function applyOverrides(p: LocalProduct): LocalProduct {
  if (typeof window === "undefined") return p;
  try {
    const overrides = JSON.parse(
      localStorage.getItem("tcgacademy_product_overrides") ?? "{}",
    ) as Record<string, Partial<LocalProduct>>;
    const ov = overrides[String(p.id)];
    return ov ? { ...p, ...ov } : p;
  } catch {
    return p;
  }
}

/** Busca en PRODUCTS + productos creados por admin + aplica overrides.
 *  Eventos (rango virtual reservado) se resuelven directamente desde EVENTS. */
function getMergedProduct(id: number): LocalProduct | null {
  if (isEventVirtualId(id)) {
    return resolveEventVirtualProduct(id) ?? null;
  }
  const base = PRODUCTS.find((p) => p.id === id);
  if (base) return applyOverrides(base);
  if (typeof window !== "undefined") {
    try {
      const admins = JSON.parse(
        localStorage.getItem("tcgacademy_new_products") ?? "[]",
      ) as LocalProduct[];
      const found = admins.find((p) => p.id === id);
      if (found) return applyOverrides(found);
    } catch { /* empty */ }
  }
  return null;
}

/**
 * Get the correct price for a product based on user role.
 * This is the server-side equivalent of the usePrice hook.
 */
function getProductPrice(productId: number, role: string): number | null {
  const product = getMergedProduct(productId);
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
    const product = getMergedProduct(item.product_id);

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
      category: product.category,
      game: product.game,
      language: product.language,
      imageUrl: product.images?.[0],
      vatRate: SITE_CONFIG.vatRate,
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

  for (const item of items) {
    // getMergedProduct ya aplica los overrides (stock + inStock) y cubre
    // productos creados por el admin vía localStorage.
    const product = getMergedProduct(item.product_id);
    if (!product) {
      issues.push({ productId: item.product_id, name: "Desconocido", requested: item.quantity, available: 0 });
      continue;
    }

    if (!product.inStock) {
      issues.push({ productId: item.product_id, name: product.name, requested: item.quantity, available: 0 });
      continue;
    }

    if (product.stock !== undefined && item.quantity > product.stock) {
      issues.push({ productId: item.product_id, name: product.name, requested: item.quantity, available: product.stock });
    }
  }

  return { available: issues.length === 0, issues };
}

/**
 * Calcula el coste de envío aplicando la regla canónica de negocio.
 *
 * Invariante (SSOT): la única forma de obtener envío 0 € es recogida en tienda,
 * superar el umbral `shippingThreshold`, o un cupón `freeShippingCoupon`.
 * Cualquier pedido con `shipping === 0` y subtotal < threshold sin recogida ni
 * cupón es un BUG — el test de auditoría #25 lo detecta.
 */
export function calculateShipping(
  method: string,
  subtotal: number,
  opts: { freeShippingCoupon?: boolean } = {},
): number {
  if (method === "tienda" || method === "pickup" || method === "recogida") return 0;
  if (opts.freeShippingCoupon) return 0;
  if (subtotal >= SITE_CONFIG.shippingThreshold) return 0;
  if (method === "express") return SITE_CONFIG.expressShippingCost;
  return SITE_CONFIG.standardShippingCost;
}

/**
 * Verifica que ningún usuario supere su límite acumulado de por vida para
 * cada producto del carrito. Suma compras previas + qty del pedido actual.
 *
 * Devuelve los productos donde se ha excedido el tope (incluye cuánto puede
 * todavía comprar, si es que puede).
 */
export function verifyPurchaseLimits(
  items: CartItem[],
  userId: string,
  userRole: UserRole,
): {
  valid: boolean;
  issues: Array<{
    productId: number;
    name: string;
    requested: number;
    purchased: number;
    limit: number;
    remaining: number;
  }>;
} {
  const issues: Array<{
    productId: number;
    name: string;
    requested: number;
    purchased: number;
    limit: number;
    remaining: number;
  }> = [];

  if (!userId) return { valid: true, issues };

  for (const item of items) {
    // getMergedProduct cubre PRODUCTS + productos creados por admin + overrides
    // (precio, stock, maxPerClient/Wholesaler/Store editados en vivo).
    const product = getMergedProduct(item.product_id);
    if (!product) continue;
    const limit = getRoleLimit(product, userRole);
    if (limit === undefined) continue;

    const purchased = getPurchasedQty(userId, item.product_id);
    const remaining = Math.max(0, limit - purchased);
    if (item.quantity > remaining) {
      issues.push({
        productId: item.product_id,
        name: product.name,
        requested: item.quantity,
        purchased,
        limit,
        remaining,
      });
    }
  }

  return { valid: issues.length === 0, issues };
}

// ─── Discount validation (canonical, server-side) ────────────────────────────
// Antes de este bloque, /api/orders confiaba en `body.coupon.discount` y
// `body.pointsDiscount` tal cual los enviaba el cliente — un atacante podía
// poner 99999€ y obtener el pedido gratis. La regla ahora es:
//
//   1. Cualquier cantidad enviada por el cliente se IGNORA y se RECALCULA aquí.
//   2. En modo `server`, el cupón se busca en BD (DbAdapter.getCouponByCode)
//      y los puntos se leen de BD (DbAdapter.getPoints). El valor canónico
//      se usa siempre.
//   3. En modo `local`, no podemos contrastar contra BD (todo vive en
//      localStorage del cliente). Aplicamos clamps duros para que ni un
//      `pointsDiscount` ni un `coupon.discount` puedan superar el subtotal,
//      y rechazamos cualquier intento de aplicar puntos sin usuario logueado.
//   4. Si el cliente envía un valor distinto al canónico, registramos el
//      hecho en `warnings` para que la respuesta lo refleje.

export interface DiscountValidationInput {
  /** Subtotal verificado en servidor — base sobre la que aplicar descuentos. */
  subtotal: number;
  /** Cupón enviado por el cliente — solo el `code` se respeta. */
  coupon?: { code: string; discount: number };
  /** Puntos a canjear declarados por el cliente — solo se respeta el límite. */
  pointsDiscount?: number;
  /** Usuario autenticado (server-side). Sin él, no se aceptan puntos. */
  userId?: string;
  /** Indica si la API está en modo server (Supabase) o local (localStorage). */
  serverMode: boolean;
}

export interface DiscountValidationResult {
  /** Descuento del cupón aplicable (€), recalculado server-side. */
  couponDiscount: number;
  /** Descuento por puntos aplicable (€), validado contra el saldo real. */
  pointsDiscount: number;
  /** Lista de motivos por los que se rechazaron descuentos solicitados. */
  errors: string[];
  /** Avisos no bloqueantes (p. ej. cliente envió 50€ pero canónico es 30€). */
  warnings: string[];
  /** Cupón canónico encontrado en BD, si existe. */
  resolvedCoupon: CouponRecord | null;
}

function calcCanonicalCouponDiscount(
  coupon: CouponRecord,
  subtotal: number,
): number {
  if (!coupon.isActive) return 0;
  if (coupon.minOrder && subtotal < coupon.minOrder) return 0;
  if (coupon.validUntil) {
    const expiry = new Date(coupon.validUntil).getTime();
    if (Number.isFinite(expiry) && Date.now() > expiry) return 0;
  }
  if (coupon.discountType === "percentage") {
    return Math.round(subtotal * (coupon.discountValue / 100) * 100) / 100;
  }
  if (coupon.discountType === "fixed") {
    return Math.min(
      Math.round(coupon.discountValue * 100) / 100,
      subtotal,
    );
  }
  return 0;
}

/**
 * Valida + recalcula los descuentos (cupón + puntos) ANTES de aplicarlos al
 * pedido. Reemplaza el patrón inseguro `subtotal -= body.coupon.discount`.
 *
 * Promesas:
 *   - Devuelve siempre valores ≥ 0 y ≤ subtotal.
 *   - En server mode, ignora valores del cliente y usa BD.
 *   - En local mode, aplica clamps duros + bloqueo de puntos sin sesión.
 *   - Nunca lanza — los problemas se reportan en `errors[]`.
 */
export async function validateAndComputeDiscounts(
  input: DiscountValidationInput,
): Promise<DiscountValidationResult> {
  const { subtotal, coupon, pointsDiscount, userId, serverMode } = input;
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Cupón ──────────────────────────────────────────────────────────────
  let resolvedCoupon: CouponRecord | null = null;
  let canonicalCouponDiscount = 0;

  if (coupon?.code) {
    if (serverMode) {
      try {
        resolvedCoupon = await getDb().getCouponByCode(coupon.code);
      } catch {
        resolvedCoupon = null;
      }
      if (!resolvedCoupon) {
        errors.push(`Cupón "${coupon.code}" no existe o está inactivo`);
      } else {
        canonicalCouponDiscount = calcCanonicalCouponDiscount(
          resolvedCoupon,
          subtotal,
        );
        if (canonicalCouponDiscount === 0) {
          errors.push(
            `Cupón "${coupon.code}" no aplicable (caducado, mínimo no alcanzado o inactivo)`,
          );
        }
        // Si el cliente envió otro valor, lo registramos como warning.
        const claimed = Number(coupon.discount);
        if (
          Number.isFinite(claimed) &&
          claimed > 0 &&
          Math.abs(claimed - canonicalCouponDiscount) > 0.01
        ) {
          warnings.push(
            `Cliente declaró cupón ${claimed.toFixed(2)}€ pero canónico es ${canonicalCouponDiscount.toFixed(2)}€`,
          );
        }
      }
    } else {
      // Modo local: no hay BD server-side; nos limitamos a clamps. La
      // verificación dura del cupón se hace en cliente vía validateCoupon().
      // Esto es coherente con el modelo (local = demo, server = producción).
      const claimed = Number(coupon.discount ?? 0);
      if (Number.isFinite(claimed) && claimed > 0) {
        canonicalCouponDiscount = Math.min(claimed, subtotal);
        if (canonicalCouponDiscount !== claimed) {
          warnings.push(
            `Descuento de cupón limitado al subtotal (${claimed.toFixed(2)}€ → ${canonicalCouponDiscount.toFixed(2)}€)`,
          );
        }
      }
    }
  }

  // ── Puntos ─────────────────────────────────────────────────────────────
  let canonicalPointsDiscount = 0;
  const claimedPoints = Number(pointsDiscount ?? 0);

  if (Number.isFinite(claimedPoints) && claimedPoints > 0) {
    if (!userId) {
      errors.push("Para canjear puntos hay que iniciar sesión");
    } else if (serverMode) {
      let balance = 0;
      try {
        const record = await getDb().getPoints(userId);
        balance = record?.balance ?? 0;
      } catch {
        balance = 0;
      }
      // 10.000 pts = 1 €. El saldo en € es lo máximo que puede canjear.
      const maxFromBalance =
        Math.floor(balance) / POINTS_PER_EURO_REDEMPTION;
      // Cap por subtotal restante (después del cupón).
      const remainingAfterCoupon = Math.max(
        0,
        subtotal - canonicalCouponDiscount,
      );
      const cap = Math.min(maxFromBalance, remainingAfterCoupon);
      canonicalPointsDiscount = Math.min(claimedPoints, cap);
      canonicalPointsDiscount =
        Math.round(canonicalPointsDiscount * 100) / 100;
      if (claimedPoints > cap + 0.01) {
        warnings.push(
          `Cliente intentó canjear ${claimedPoints.toFixed(2)}€ en puntos; máximo permitido ${cap.toFixed(2)}€ (saldo ${balance} pts)`,
        );
      }
      if (cap === 0 && claimedPoints > 0) {
        errors.push(
          balance === 0
            ? "No tienes puntos disponibles para canjear"
            : "El subtotal restante no permite canjear puntos",
        );
      }
    } else {
      // Modo local: clamp al subtotal restante. El balance real lo gestionará
      // el cliente al `deductPoints` tras crear el pedido.
      const remaining = Math.max(0, subtotal - canonicalCouponDiscount);
      canonicalPointsDiscount = Math.min(claimedPoints, remaining);
      canonicalPointsDiscount =
        Math.round(canonicalPointsDiscount * 100) / 100;
      if (canonicalPointsDiscount !== claimedPoints) {
        warnings.push(
          `Descuento de puntos limitado al subtotal (${claimedPoints.toFixed(2)}€ → ${canonicalPointsDiscount.toFixed(2)}€)`,
        );
      }
    }
  }

  return {
    couponDiscount: Math.max(0, canonicalCouponDiscount),
    pointsDiscount: Math.max(0, canonicalPointsDiscount),
    errors,
    warnings,
    resolvedCoupon,
  };
}

/**
 * Full order verification: prices + stock + per-role lifetime limits + shipping.
 * Call this before creating an order.
 */
export function verifyOrder(
  items: CartItem[],
  shippingMethod: string,
  userRole: string = "cliente",
  userId: string = "",
): {
  valid: boolean;
  priceResult: PriceVerificationResult;
  stockResult: ReturnType<typeof verifyStockAvailability>;
  limitResult: ReturnType<typeof verifyPurchaseLimits>;
  shipping: number;
  total: number;
  errors: string[];
} {
  const priceResult = verifyCartPrices(items, userRole);
  const stockResult = verifyStockAvailability(items);
  const limitResult = verifyPurchaseLimits(items, userId, userRole as UserRole);
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
  if (!limitResult.valid) {
    for (const issue of limitResult.issues) {
      const who = userRole === "mayorista" ? "mayorista" : userRole === "tienda" ? "tienda" : "cliente";
      errors.push(
        `${issue.name}: máx. por ${who} alcanzado (${issue.purchased}/${issue.limit} ya comprado, solo ${issue.remaining} disponibles)`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    priceResult,
    stockResult,
    limitResult,
    shipping,
    total,
    errors,
  };
}
