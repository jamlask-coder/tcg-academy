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
  // Reference prices — visible only to the roles described below
  retailPrice?: number;   // PVP Público — visible a mayorista, tienda y admin (para ver margen)
  wholesaleRef?: number;  // PVP Mayoristas — visible a tienda y admin
  costPrice?: number;     // Precio de coste — SOLO admin
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

  // Reference prices — each role sees only what corresponds to them
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
