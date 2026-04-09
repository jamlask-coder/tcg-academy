"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { LocalProduct } from "@/data/products";

export interface ProductDiscount {
  productId: number;
  pct: number; // 0–100, applied to all price tiers
  active: boolean;
  startsAt?: string; // ISO date string, no start restriction if undefined
  endsAt?: string; // ISO date string, auto-deactivated after this date
}

export interface PriceOverride {
  productId: number;
  price?: number;
  wholesalePrice?: number;
  storePrice?: number;
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

function isActive(d: ProductDiscount): boolean {
  if (!d.active) return false;
  const now = new Date();
  if (d.startsAt && new Date(d.startsAt) > now) return false;
  if (d.endsAt && new Date(d.endsAt) < now) return false;
  return true;
}

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
    ) => {
      const override = priceOverrides[product.id];
      const basePrice = override?.price ?? product.price;
      const baseWholesale = override?.wholesalePrice ?? product.wholesalePrice;
      const baseStore = override?.storePrice ?? product.storePrice;

      let displayPrice: number;
      let priceLabel: string | undefined;

      if (role === "mayorista") {
        displayPrice = baseWholesale;
        priceLabel = "PVP Mayoristas";
      } else if (role === "tienda") {
        displayPrice = baseStore;
        priceLabel = "PVP Tiendas TCG";
      } else if (role === "admin") {
        displayPrice = basePrice;
        priceLabel = "PVP Público";
      } else {
        displayPrice = basePrice;
      }

      // Apply discount
      const disc = discounts[product.id];
      if (disc && isActive(disc) && disc.pct > 0) {
        const discounted = displayPrice * (1 - disc.pct / 100);
        return {
          displayPrice: Math.round(discounted * 100) / 100,
          comparePrice: displayPrice,
          hasDiscount: true,
          discountPct: disc.pct,
          priceLabel,
        };
      }

      // No active discount — compare to public price for privileged roles
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
    },
    [discounts, priceOverrides],
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
