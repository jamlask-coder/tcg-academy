"use client";
import { useAuth } from "@/context/AuthContext";
import { useDiscounts } from "@/context/DiscountContext";
import type { LocalProduct } from "@/data/products";
import { SITE_CONFIG } from "@/config/siteConfig";

export interface PriceInfo {
  displayPrice: number;
  comparePrice?: number;
  hasDiscount: boolean;
  discountPct: number;
  priceLabel?: string;
  etiquetaRol?: string; // "Precio Mayoristas" | "Precio Tiendas TCG" | undefined
  vatRate: number;
  vatAmount: number;
  priceWithoutVAT: number;
  showVATBreakdown: boolean;
}

/** @deprecated Use SITE_CONFIG.vatRate */
export const IVA_GENERAL = SITE_CONFIG.vatRate;

export function calcVAT(priceWithVAT: number, vatRate = SITE_CONFIG.vatRate) {
  const priceWithoutVAT = priceWithVAT / (1 + vatRate / 100);
  const vatAmount = priceWithVAT - priceWithoutVAT;
  return { priceWithoutVAT, vatAmount, vatRate };
}

export function usePrice(product: LocalProduct): PriceInfo {
  const { role } = useAuth();
  const { getEffectivePrice } = useDiscounts();
  const base = getEffectivePrice(product, role);

  const vatRate = product.vatRate ?? IVA_GENERAL;
  const { priceWithoutVAT, vatAmount } = calcVAT(base.displayPrice, vatRate);
  const showVATBreakdown =
    role === "mayorista" || role === "tienda" || role === "admin";
  const etiquetaRol =
    role === "mayorista"
      ? "Precio Mayoristas"
      : role === "tienda"
        ? "Precio Tiendas TCG"
        : undefined;

  return {
    ...base,
    vatRate,
    vatAmount,
    priceWithoutVAT,
    showVATBreakdown,
    etiquetaRol,
  };
}
