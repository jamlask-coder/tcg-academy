"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getMergedById } from "@/lib/productStore";
import { useAuth } from "@/context/AuthContext";
import { getRoleLimit, getPurchasedQty } from "@/services/purchaseLimitService";
import { logger } from "@/lib/logger";

const LEGACY_CART_KEY = "tcga_cart";
const ANON_CART_KEY = "tcga_cart_anon";
const cartKeyFor = (userId?: string) =>
  userId ? `tcga_cart_${userId}` : ANON_CART_KEY;

export interface CartItem {
  key: string;
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

function parseCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

function mergeCartItems(
  existing: CartItem[],
  incoming: CartItem[],
  cap: number,
): CartItem[] {
  const map = new Map<string, CartItem>();
  for (const it of existing) map.set(it.key, { ...it });
  for (const it of incoming) {
    const ex = map.get(it.key);
    if (ex) {
      map.set(it.key, {
        ...ex,
        quantity: Math.min(cap, ex.quantity + it.quantity),
      });
    } else {
      map.set(it.key, { ...it, quantity: Math.min(cap, it.quantity) });
    }
  }
  return [...map.values()];
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
  const storageKey = cartKeyFor(user?.id);
  const [items, setItems] = useState<CartItem[]>([]);
  // Guarda el último userId visto para detectar la transición anon → logged-in.
  // En ese instante fusionamos el carrito anónimo con el del usuario, sin
  // pérdida de productos (cantidades sumadas, tope MAX_QTY_PER_LINE).
  const prevUserIdRef = useRef<string | undefined>(undefined);

  // Carga/recarga cuando cambia el usuario (login / register / logout / switch).
  // - Migra la clave legacy "tcga_cart" al slot actual (una sola vez).
  // - En login/register: fusiona el carrito anónimo con el del usuario para
  //   que nada de lo que el invitado metió antes de identificarse se pierda.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // Legacy cart migration (histórica, pre-multiusuario).
      const legacy = localStorage.getItem(LEGACY_CART_KEY);
      if (legacy && !localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, legacy);
      }
      if (legacy) localStorage.removeItem(LEGACY_CART_KEY);

      // Transición anon → logged-in: fusionar carritos.
      const justLoggedIn = !prevUserIdRef.current && Boolean(user?.id);
      if (justLoggedIn) {
        const anonItems = parseCart(localStorage.getItem(ANON_CART_KEY));
        if (anonItems.length > 0) {
          const userItems = parseCart(localStorage.getItem(storageKey));
          const merged = mergeCartItems(userItems, anonItems, MAX_QTY_PER_LINE);
          localStorage.setItem(storageKey, JSON.stringify(merged));
          localStorage.removeItem(ANON_CART_KEY);
        }
      }

      prevUserIdRef.current = user?.id;
      const raw = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems(parseCart(raw));
    } catch {
      setItems([]);
    }
  }, [storageKey, user?.id]);

  const save = (next: CartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (err) {
      logger.warn("No se pudo guardar carrito", "cart", { err: String(err) });
    }
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
