"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { getMergedById } from "@/lib/productStore";
import { useAuth } from "@/context/AuthContext";
import { getRoleLimit, getPurchasedQty } from "@/services/purchaseLimitService";

export interface CartItem {
  key: string;
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface AddItemResult {
  added: boolean;
  reason?: string;
}

interface CartCtx {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (
    id: number,
    name: string,
    price: number,
    image: string,
    qty?: number,
  ) => AddItemResult;
  removeItem: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  clearCart: () => void;
}

const MAX_QTY_PER_LINE = 99;

const CartContext = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const s =
        typeof window !== "undefined"
          ? localStorage.getItem("tcga_cart")
          : null;
      return s ? (JSON.parse(s) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const save = (next: CartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem("tcga_cart", JSON.stringify(next));
    } catch {}
  };

  const addItem = (
    id: number,
    name: string,
    price: number,
    image: string,
    qty = 1,
  ): AddItemResult => {
    const key = `item_${id}`;
    const ex = items.find((i) => i.key === key);
    const currentQty = ex ? ex.quantity : 0;
    const product = getMergedById(id);

    let effectiveQty = qty;

    // Límite acumulado de por vida por rol (maxPerClient / maxPerWholesaler /
    // maxPerStore, con fallback a maxPerUser). Se suman compras históricas +
    // carrito actual, y el usuario nunca puede superar ese tope.
    const roleLimit = product ? getRoleLimit(product, role) : undefined;
    const absoluteMax = roleLimit !== undefined
      ? Math.min(roleLimit, MAX_QTY_PER_LINE)
      : MAX_QTY_PER_LINE;

    const purchased = roleLimit !== undefined && user?.id
      ? getPurchasedQty(user.id, id)
      : 0;

    // Cupo restante por rol, descontando compras ya realizadas.
    const roleRemaining = roleLimit !== undefined
      ? Math.max(0, roleLimit - purchased - currentQty)
      : Infinity;

    if (roleLimit !== undefined && roleRemaining <= 0) {
      const whoLabel = role === "mayorista" ? "mayorista" : role === "tienda" ? "tienda" : "cliente";
      return {
        added: false,
        reason: `Ya alcanzaste el máximo por ${whoLabel} para este producto (${roleLimit} uds, incluyendo pedidos anteriores).`,
      };
    }

    if (currentQty >= absoluteMax) {
      return { added: false, reason: `Límite por persona alcanzado (máx. ${absoluteMax} uds)` };
    }
    if (currentQty + effectiveQty > absoluteMax) {
      effectiveQty = absoluteMax - currentQty;
    }
    // Aplicar también el remaining acumulado
    if (effectiveQty > roleRemaining) {
      effectiveQty = roleRemaining;
    }

    if (product?.stock !== undefined && typeof product.stock === "number") {
      if (currentQty >= product.stock) {
        return { added: false, reason: `Stock agotado (solo ${product.stock} uds disponibles)` };
      }
      if (currentQty + effectiveQty > product.stock) {
        effectiveQty = product.stock - currentQty;
      }
    }

    if (effectiveQty <= 0) {
      return { added: false, reason: "No se pueden añadir más unidades de este producto." };
    }

    if (ex) {
      save(
        items.map((i) =>
          i.key === key ? { ...i, quantity: i.quantity + effectiveQty } : i,
        ),
      );
    } else {
      save([
        ...items,
        { key, product_id: id, name, price, quantity: effectiveQty, image },
      ]);
    }
    return { added: true };
  };

  const removeItem = (key: string) => save(items.filter((i) => i.key !== key));
  const updateQty = (key: string, qty: number) => {
    if (qty <= 0) {
      removeItem(key);
      return;
    }
    const capped = Math.min(qty, MAX_QTY_PER_LINE);
    save(items.map((i) => (i.key === key ? { ...i, quantity: capped } : i)));
  };

  return (
    <CartContext.Provider
      value={{
        items,
        count: items.reduce((s, i) => s + i.quantity, 0),
        total: items.reduce((s, i) => s + i.price * i.quantity, 0),
        addItem,
        removeItem,
        updateQty,
        clearCart: () => save([]),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
};
