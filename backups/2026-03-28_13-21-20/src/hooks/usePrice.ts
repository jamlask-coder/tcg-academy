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
}

export function usePrice(product: LocalProduct): PriceInfo {
  const { role } = useAuth()
  const { getEffectivePrice } = useDiscounts()
  return getEffectivePrice(product, role)
}
