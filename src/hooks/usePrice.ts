"use client";
import { useAuth } from "@/context/AuthContext";
import { useDiscounts } from "@/context/DiscountContext";
import type { LocalProduct } from "@/data/products";
import { SITE_CONFIG } from "@/config/siteConfig";
import {
  getEffectivePriceWithVat,
  calcVAT as calcVATCore,
  type PriceWithVat,
} from "@/lib/pricing";

export type PriceInfo = PriceWithVat;

/** @deprecated Use SITE_CONFIG.vatRate */
export const IVA_GENERAL = SITE_CONFIG.vatRate;

/** Re-export conveniente del helper puro. Los consumidores existentes
 *  siguen importando `calcVAT` desde `@/hooks/usePrice` sin cambios. */
export const calcVAT = calcVATCore;

/**
 * Hook React: precio efectivo con IVA, tomando auth+descuentos del contexto.
 * Internamente delega en getEffectivePriceWithVat (pura, reutilizable fuera
 * de React). Si necesitas calcular precios en un servicio/API, usa la pura.
 */
export function usePrice(product: LocalProduct): PriceInfo {
  const { role } = useAuth();
  const { discounts } = useDiscounts();
  return getEffectivePriceWithVat(product, role, discounts);
}
