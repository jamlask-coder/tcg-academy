"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { LocalProduct } from "@/data/products";
import { computeEffectivePrice, type ProductDiscount as ProductDiscountCore } from "@/lib/priceEngine";

export type ProductDiscount = ProductDiscountCore;

export interface PriceOverride {
  productId: number;
  price?: number;
  wholesalePrice?: number;
  storePrice?: number;
  costPrice?: number;
}

interface DiscountContextValue {
  discounts: Record<number, ProductDiscount>;
  priceOverrides: Record<number, PriceOverride>;
  setDiscount: (
    productId: number,
    d: Partial<Omit<ProductDiscount, "productId">>,
  ) => void;
  removeDiscount: (productId: number) => void;
  setPriceOverride: (
    productId: number,
    prices: Partial<Omit<PriceOverride, "productId">>,
  ) => void;
  bulkSetDiscount: (
    productIds: number[],
    pct: number,
    active: boolean,
    endsAt?: string,
  ) => void;
  getEffectivePrice: (
    product: LocalProduct,
    role: "cliente" | "mayorista" | "tienda" | "admin" | null,
  ) => {
    displayPrice: number;
    comparePrice?: number;
    hasDiscount: boolean;
    discountPct: number;
    priceLabel?: string;
  };
  saveToStorage: () => void;
}

const STORAGE_KEY = "tcgacademy_discounts";
const OVERRIDE_KEY = "tcgacademy_price_overrides";

const DiscountContext = createContext<DiscountContextValue | null>(null);

export function DiscountProvider({ children }: { children: ReactNode }) {
  const [discounts, setDiscounts] = useState<Record<number, ProductDiscount>>(
    () => {
      try {
        const d =
          typeof window !== "undefined"
            ? localStorage.getItem(STORAGE_KEY)
            : null;
        return d ? (JSON.parse(d) as Record<number, ProductDiscount>) : {};
      } catch {
        return {};
      }
    },
  );
  const [priceOverrides, setPriceOverrides] = useState<
    Record<number, PriceOverride>
  >(() => {
    try {
      const o =
        typeof window !== "undefined"
          ? localStorage.getItem(OVERRIDE_KEY)
          : null;
      return o ? (JSON.parse(o) as Record<number, PriceOverride>) : {};
    } catch {
      return {};
    }
  });

  const saveToStorage = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(discounts));
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify(priceOverrides));
    } catch {
      /* ignore */
    }
  }, [discounts, priceOverrides]);

  const setDiscount = useCallback(
    (productId: number, d: Partial<Omit<ProductDiscount, "productId">>) => {
      setDiscounts((prev) => ({
        ...prev,
        [productId]: Object.assign(
          { pct: 0, active: false },
          prev[productId],
          d,
          { productId },
        ) as ProductDiscount,
      }));
    },
    [],
  );

  const removeDiscount = useCallback((productId: number) => {
    setDiscounts((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  const setPriceOverride = useCallback(
    (productId: number, prices: Partial<Omit<PriceOverride, "productId">>) => {
      setPriceOverrides((prev) => ({
        ...prev,
        [productId]: Object.assign({}, prev[productId], prices, {
          productId,
        }) as PriceOverride,
      }));
    },
    [],
  );

  const bulkSetDiscount = useCallback(
    (productIds: number[], pct: number, active: boolean, endsAt?: string) => {
      setDiscounts((prev) => {
        const next = { ...prev };
        for (const id of productIds) {
          next[id] = { productId: id, pct, active, endsAt };
        }
        return next;
      });
    },
    [],
  );

  const getEffectivePrice = useCallback(
    (
      product: LocalProduct,
      role: "cliente" | "mayorista" | "tienda" | "admin" | null,
    ) => computeEffectivePrice(product, role, discounts),
    // priceOverrides se mantiene en el context value por compatibilidad con
    // el registry de DataHub, pero NO entra en las deps: computeEffectivePrice
    // NO consulta el canal legacy `tcgacademy_price_overrides`.
    // Ver: feedback_catalog_detail_consistency.md GOTCHA 4
    [discounts],
  );

  return (
    <DiscountContext.Provider
      value={{
        discounts,
        priceOverrides,
        setDiscount,
        removeDiscount,
        setPriceOverride,
        bulkSetDiscount,
        getEffectivePrice,
        saveToStorage,
      }}
    >
      {children}
    </DiscountContext.Provider>
  );
}

export function useDiscounts() {
  const ctx = useContext(DiscountContext);
  if (!ctx)
    throw new Error("useDiscounts must be used within DiscountProvider");
  return ctx;
}
