/**
 * SSOT pricing helper — usable fuera de React.
 *
 * Problema que resuelve: hoy `usePrice` (hook React) encapsula el cálculo
 * completo (rol → precio → descuento → IVA → etiquetas). Pero servicios,
 * scripts y rutas API no pueden usar hooks → acababan duplicando fragmentos
 * del cálculo (ej: `product.price * (1 + SITE_CONFIG.vatRate/100)`), lo que
 * creaba divergencia con la UI (cliente veía 24.20 €, el pedido quedaba
 * guardado con 24.00 €).
 *
 * Ahora: una sola función pura que cualquiera puede llamar. `usePrice` es
 * el adaptador React que la envuelve con los contextos de auth+descuentos.
 *
 * Reglas SSOT (ver memoria project_snapshot_architecture):
 *  - Precio base viene del `product` recibido (merge con overrides ya hecho).
 *  - Pedidos/facturas congelan el precio vía captureSellerSnapshot(); esta
 *    función es para el precio VIVO (catálogo, checkout en curso).
 */

import type { LocalProduct } from "@/data/products";
import type { ProductDiscount } from "@/lib/priceEngine";
import { computeEffectivePrice } from "@/lib/priceEngine";
import { SITE_CONFIG } from "@/config/siteConfig";
import { getMergedById } from "@/lib/productStore";

export type Role = "cliente" | "mayorista" | "tienda" | "admin" | null;

/** Descompone un precio CON IVA en base imponible + cuota IVA. Pura. */
export function calcVAT(priceWithVAT: number, vatRate = SITE_CONFIG.vatRate) {
  const priceWithoutVAT = priceWithVAT / (1 + vatRate / 100);
  const vatAmount = priceWithVAT - priceWithoutVAT;
  return { priceWithoutVAT, vatAmount, vatRate };
}

export interface PriceWithVat {
  displayPrice: number;          // precio final CON IVA para el rol
  comparePrice?: number;         // precio tachado (si aplica)
  hasDiscount: boolean;
  discountPct: number;
  priceLabel?: string;
  vatRate: number;               // %
  vatAmount: number;             // € de IVA
  priceWithoutVAT: number;       // base imponible
  etiquetaRol?: string;          // "Precio Mayoristas" / "Precio Tiendas TCG"
  showVATBreakdown: boolean;     // B2B ve desglose
  retailPrice?: number;          // PV Público (visible a roles superiores)
  wholesaleRef?: number;         // PV Mayoristas (visible a tienda/admin)
  costPrice?: number;            // Coste (solo admin)
}

const DISCOUNTS_KEY = "tcgacademy_discounts";

/** Carga descuentos del storage. Devuelve {} en SSR o si no hay datos. */
export function loadDiscounts(): Record<number, ProductDiscount> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DISCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as Record<number, ProductDiscount>) : {};
  } catch {
    return {};
  }
}

/**
 * Calcula el precio efectivo con IVA para un producto + rol. Función pura:
 * no toca React, no lee auth. Pásale el producto ya mergeado y los
 * descuentos (o deja que cargue desde storage).
 */
export function getEffectivePriceWithVat(
  product: LocalProduct,
  role: Role,
  discounts?: Record<number, ProductDiscount>,
): PriceWithVat {
  const discs = discounts ?? loadDiscounts();
  const base = computeEffectivePrice(product, role, discs);

  const vatRate = product.vatRate ?? SITE_CONFIG.vatRate;
  const { priceWithoutVAT, vatAmount } = calcVAT(base.displayPrice, vatRate);

  const showVATBreakdown =
    role === "mayorista" || role === "tienda" || role === "admin";

  const etiquetaRol =
    role === "mayorista"
      ? "Precio Mayoristas"
      : role === "tienda"
        ? "Precio Tiendas TCG"
        : undefined;

  const retailPrice =
    role === "mayorista" || role === "tienda" || role === "admin"
      ? product.price
      : undefined;

  const wholesaleRef =
    role === "tienda" || role === "admin" ? product.wholesalePrice : undefined;

  const costPrice = role === "admin" ? product.costPrice : undefined;

  return {
    ...base,
    vatRate,
    vatAmount,
    priceWithoutVAT,
    showVATBreakdown,
    etiquetaRol,
    retailPrice,
    wholesaleRef,
    costPrice,
  };
}

/**
 * Helper canónico "Vista 360°": precio efectivo dado un ID de producto.
 * Resuelve el producto (vía getMergedById) y los descuentos automáticamente.
 * Devuelve null si el producto no existe.
 */
export function getEffectivePriceById(
  productId: number,
  role: Role,
): PriceWithVat | null {
  const product = getMergedById(productId);
  if (!product) return null;
  return getEffectivePriceWithVat(product, role);
}
