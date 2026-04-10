"use client";
import { createContext, useContext, useState, type ReactNode } from "react";

export interface CartItem {
  key: string;
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
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
  ) => void;
  removeItem: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
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
  ) => {
    const key = `item_${id}`;
    const ex = items.find((i) => i.key === key);
    if (ex)
      save(
        items.map((i) =>
          i.key === key ? { ...i, quantity: i.quantity + qty } : i,
        ),
      );
    else
      save([
        ...items,
        { key, product_id: id, name, price, quantity: qty, image },
      ]);
  };

  const removeItem = (key: string) => save(items.filter((i) => i.key !== key));
  const updateQty = (key: string, qty: number) => {
    if (qty <= 0) {
      removeItem(key);
      return;
    }
    save(items.map((i) => (i.key === key ? { ...i, quantity: qty } : i)));
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
