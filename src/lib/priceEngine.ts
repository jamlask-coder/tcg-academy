// Cálculo puro del precio efectivo. Extraído de DiscountContext para permitir
// tests directos sin montar React.
//
// Regla SSOT: el precio base SIEMPRE viene del `product` recibido (que quien
// llama ya mergeó vía getMergedById/getMergedProducts desde
// tcgacademy_product_overrides). NO consultamos aquí ningún otro storage key.
//
// Incidente 2026-04-22 StrixHaven: existía un canal legacy paralelo
// `tcgacademy_price_overrides` en DiscountContext que ganaba al precio
// mergeado → cambios del admin no se propagaban. Fix: esta función ignora
// cualquier cache legacy y usa exclusivamente `product.*`.
// Ver: feedback_catalog_detail_consistency.md GOTCHA 4

import type { LocalProduct } from "@/data/products";

export interface ProductDiscount {
  productId: number;
  pct: number;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
}

export function isDiscountActive(
  d: ProductDiscount,
  now: Date = new Date(),
): boolean {
  if (!d.active) return false;
  if (d.startsAt && new Date(d.startsAt) > now) return false;
  if (d.endsAt && new Date(d.endsAt) < now) return false;
  return true;
}

export interface EffectivePrice {
  displayPrice: number;
  comparePrice?: number;
  hasDiscount: boolean;
  discountPct: number;
  priceLabel?: string;
}

export function computeEffectivePrice(
  product: LocalProduct,
  role: "cliente" | "mayorista" | "tienda" | "admin" | null,
  discounts: Record<number, ProductDiscount>,
): EffectivePrice {
  const basePrice = product.price;
  const baseWholesale = product.wholesalePrice;
  const baseStore = product.storePrice;

  let displayPrice: number;
  let priceLabel: string | undefined;

  if (role === "mayorista") {
    displayPrice = baseWholesale;
    priceLabel = "PV Mayorista";
  } else if (role === "tienda") {
    displayPrice = baseStore;
    priceLabel = "PV Tiendas";
  } else if (role === "admin") {
    displayPrice = basePrice;
    priceLabel = "PV Público";
  } else {
    displayPrice = basePrice;
  }

  const disc = discounts[product.id];
  if (disc && isDiscountActive(disc) && disc.pct > 0) {
    const discounted = displayPrice * (1 - disc.pct / 100);
    return {
      displayPrice: Math.round(discounted * 100) / 100,
      comparePrice: displayPrice,
      hasDiscount: true,
      discountPct: disc.pct,
      priceLabel,
    };
  }

  const compareRef =
    role === "mayorista" || role === "tienda"
      ? basePrice
      : product.comparePrice;

  const hasDiscount = compareRef !== undefined && compareRef > displayPrice;
  const discountPct = hasDiscount
    ? Math.round((1 - displayPrice / compareRef!) * 100)
    : 0;

  return {
    displayPrice,
    comparePrice: hasDiscount ? compareRef : undefined,
    hasDiscount,
    discountPct,
    priceLabel,
  };
}
