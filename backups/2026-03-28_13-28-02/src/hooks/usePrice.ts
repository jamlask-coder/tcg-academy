"use client"
import { useAuth } from "@/context/AuthContext"
import { useDiscounts } from "@/context/DiscountContext"
import type { LocalProduct } from "@/data/products"

export interface PriceInfo {
  displayPrice: number
  comparePrice?: number
  hasDiscount: boolean
  discountPct: number
  priceLabel?: string
  // VAT breakdown — populated for non-client roles
  vatRate: number          // e.g. 21
  vatAmount: number        // cuota IVA (displayPrice * vatRate / (100 + vatRate))
  priceWithoutVAT: number  // base imponible (displayPrice / 1.vatRate)
  showVATBreakdown: boolean // true for mayorista, tienda, admin
}

/** IVA type for Spain (Ley 37/1992). TCG/games = IVA General 21% */
export const IVA_GENERAL = 21

export function calcVAT(priceWithVAT: number, vatRate = IVA_GENERAL) {
  const priceWithoutVAT = priceWithVAT / (1 + vatRate / 100)
  const vatAmount = priceWithVAT - priceWithoutVAT
  return { priceWithoutVAT, vatAmount, vatRate }
}

export function usePrice(product: LocalProduct): PriceInfo {
  const { role } = useAuth()
  const { getEffectivePrice } = useDiscounts()
  const base = getEffectivePrice(product, role)

  const vatRate = product.vatRate ?? IVA_GENERAL
  const { priceWithoutVAT, vatAmount } = calcVAT(base.displayPrice, vatRate)
  const showVATBreakdown = role === "mayorista" || role === "tienda" || role === "admin"

  return {
    ...base,
    vatRate,
    vatAmount,
    priceWithoutVAT,
    showVATBreakdown,
  }
}
