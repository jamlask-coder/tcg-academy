"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getMergedById } from "@/lib/productStore";
import { useAuth } from "@/context/AuthContext";
import { useDiscounts } from "@/context/DiscountContext";
import { getRoleLimit, getPurchasedQty } from "@/services/purchaseLimitService";
import { logger } from "@/lib/logger";
import type { LocalProduct } from "@/data/products";
import type { UserRole } from "@/types/user";

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

export interface UpdateQtyResult {
  applied: number; // cantidad finalmente aplicada (puede ser menor a la pedida)
  capped: boolean; // true si tuvimos que recortar
  reason?: string;
}

export interface ItemLimitInfo {
  max: number; // tope total permitido en esta línea (considerando stock + roleLimit + MAX_QTY_PER_LINE)
  reason: "stock" | "roleLimit" | "lineCap" | "none";
  stock?: number;
  roleLimit?: number;
  purchased?: number;
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
  updateQty: (key: string, qty: number) => UpdateQtyResult;
  clearCart: () => void;
  /** Devuelve el tope permitido para una línea del carrito (stock + roleLimit + MAX_QTY_PER_LINE). */
  getLimitForItem: (productId: number) => ItemLimitInfo;
}

const MAX_QTY_PER_LINE = 99;

const CartContext = createContext<CartCtx | null>(null);

/**
 * Calcula el tope total permitido para un producto dado el rol + compras
 * históricas del usuario. Contempla:
 *  - MAX_QTY_PER_LINE (99 uds hard cap del carrito)
 *  - product.stock (si está definido y es número)
 *  - product.inStock (si false → 0)
 *  - roleLimit (maxPerClient/Wholesaler/Store) descontando compras históricas
 *
 * Devuelve también el motivo del tope, para poder mostrar un mensaje claro
 * al usuario ("Stock agotado", "Ya alcanzaste tu máximo por cliente", etc).
 */
function computeItemLimit(
  product: LocalProduct | null | undefined,
  role: UserRole | null | undefined,
  userId: string | undefined,
): ItemLimitInfo {
  if (!product) return { max: 0, reason: "stock" };
  if (product.inStock === false) return { max: 0, reason: "stock", stock: 0 };
  const roleOrDefault: UserRole = role ?? "cliente";

  let max = MAX_QTY_PER_LINE;
  let reason: ItemLimitInfo["reason"] = "lineCap";

  const roleLimit = getRoleLimit(product, roleOrDefault);
  let purchased = 0;
  if (roleLimit !== undefined) {
    purchased = userId ? getPurchasedQty(userId, product.id) : 0;
    const roleRemaining = Math.max(0, roleLimit - purchased);
    if (roleRemaining < max) {
      max = roleRemaining;
      reason = "roleLimit";
    }
  }

  if (typeof product.stock === "number" && product.stock < max) {
    max = Math.max(0, product.stock);
    reason = "stock";
  }

  if (max >= MAX_QTY_PER_LINE) reason = "none";

  return {
    max,
    reason,
    stock: typeof product.stock === "number" ? product.stock : undefined,
    roleLimit,
    purchased,
  };
}

function describeLimit(info: ItemLimitInfo, role: UserRole | null | undefined): string {
  switch (info.reason) {
    case "stock":
      if (info.max === 0) return "Sin stock disponible";
      return `Solo quedan ${info.max} uds en stock`;
    case "roleLimit": {
      const who = role === "mayorista" ? "mayorista" : role === "tienda" ? "tienda" : "cliente";
      const roleLimit = info.roleLimit ?? 0;
      const purchased = info.purchased ?? 0;
      if (info.max === 0) {
        return `Ya alcanzaste el máximo por ${who} (${roleLimit} uds, incluyendo compras previas).`;
      }
      return `Máx. por ${who}: ${roleLimit} uds (${purchased} ya comprado, ${info.max} disponibles).`;
    }
    case "lineCap":
      return `Máximo ${MAX_QTY_PER_LINE} uds por línea.`;
    case "none":
    default:
      return "";
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const { getEffectivePrice } = useDiscounts();
  const storageKey = cartKeyFor(user?.id);
  const [items, setItems] = useState<CartItem[]>([]);
  // Tick para forzar re-derive cuando el admin edita productos.
  // Incidente 2026-04-22: el carrito mostraba el precio/nombre snapshot del
  // momento de añadir. Ahora cualquier `tcga:products:updated` hace que
  // `effectiveItems` re-lea el producto merged vía getMergedById.
  const [productsTick, setProductsTick] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => setProductsTick((t) => t + 1);
    window.addEventListener("tcga:products:updated", bump);
    return () => window.removeEventListener("tcga:products:updated", bump);
  }, []);
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
      setItems(parseCart(raw));
    } catch {
      setItems([]);
    }
  }, [storageKey, user?.id]);

  // Cuando cambia el stock / roleLimit / usuario, recapamos las líneas que
  // excedan el nuevo tope. Evita que un cambio de admin deje el carrito
  // con cantidades imposibles de pagar.
  useEffect(() => {
    if (items.length === 0) return;
    let changed = false;
    const next = items.map((it) => {
      const live = getMergedById(it.product_id);
      const info = computeItemLimit(live, role, user?.id);
      if (it.quantity > info.max) {
        changed = true;
        return { ...it, quantity: info.max };
      }
      return it;
    }).filter((it) => it.quantity > 0);
    if (changed) {
      setItems(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (err) {
        logger.warn("No se pudo recapar carrito", "cart", { err: String(err) });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsTick, role, user?.id, storageKey]);

  const save = useCallback(
    (next: CartItem[]) => {
      setItems(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (err) {
        logger.warn("No se pudo guardar carrito", "cart", { err: String(err) });
      }
    },
    [storageKey],
  );

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

    const info = computeItemLimit(product, role, user?.id);

    if (currentQty >= info.max) {
      return { added: false, reason: describeLimit(info, role) || "No se pueden añadir más unidades." };
    }

    const remaining = info.max - currentQty;
    const effectiveQty = Math.min(qty, remaining);

    if (effectiveQty <= 0) {
      return { added: false, reason: describeLimit(info, role) || "No se pueden añadir más unidades." };
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
    const capped = effectiveQty < qty;
    return {
      added: true,
      reason: capped ? describeLimit(info, role) : undefined,
    };
  };

  const removeItem = (key: string) => save(items.filter((i) => i.key !== key));

  const updateQty = (key: string, qty: number): UpdateQtyResult => {
    if (qty <= 0) {
      removeItem(key);
      return { applied: 0, capped: false };
    }
    const target = items.find((i) => i.key === key);
    if (!target) return { applied: 0, capped: false, reason: "Línea no encontrada" };

    const product = getMergedById(target.product_id);
    const info = computeItemLimit(product, role, user?.id);

    // Fix 2026-04-22: antes updateQty sólo cap al MAX_QTY_PER_LINE (99) y
    // permitía al usuario subir la cantidad por encima del stock real o del
    // límite por rol. Ahora aplica EXACTAMENTE los mismos límites que addItem.
    const capped = qty > info.max;
    const applied = Math.min(qty, info.max);

    if (applied <= 0) {
      removeItem(key);
      return { applied: 0, capped: true, reason: describeLimit(info, role) };
    }

    save(items.map((i) => (i.key === key ? { ...i, quantity: applied } : i)));
    return {
      applied,
      capped,
      reason: capped ? describeLimit(info, role) : undefined,
    };
  };

  const getLimitForItem = useCallback(
    (productId: number): ItemLimitInfo => {
      // Referenciamos productsTick para forzar recomputar tras evento admin;
      // getMergedById lee el estado en vivo de localStorage.
      void productsTick;
      const product = getMergedById(productId);
      return computeItemLimit(product, role, user?.id);
    },
    [role, user?.id, productsTick],
  );

  // ── Effective items (SSOT de precio/nombre/imagen) ─────────────────────────
  // Lo persistido en localStorage es un "snapshot" del producto en el momento
  // de añadirlo al carrito. En cada render resolvemos el producto merged
  // (PRODUCTS + overrides admin) y sobrescribimos price/name/image con los
  // valores ACTUALES. Así, si el admin edita precio/nombre/imagen, el carrito
  // refleja el cambio sin crear un desfase que acabe en facturas con precios
  // obsoletos. El snapshot sólo se usa como fallback si el producto ya no
  // existe en merged (p.ej. fue eliminado) — escenario raro pero válido.
  const effectiveItems = useMemo(() => {
    return items.map((it) => {
      const live = getMergedById(it.product_id);
      if (!live) return it;
      const { displayPrice } = getEffectivePrice(live, role);
      return {
        ...it,
        name: live.name,
        price: displayPrice,
        image: live.images[0] ?? it.image,
      };
    });
    // productsTick fuerza re-ejecución cuando el admin guarda cambios.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, role, getEffectivePrice, productsTick]);

  return (
    <CartContext.Provider
      value={{
        items: effectiveItems,
        count: effectiveItems.reduce((s, i) => s + i.quantity, 0),
        total: effectiveItems.reduce((s, i) => s + i.price * i.quantity, 0),
        addItem,
        removeItem,
        updateQty,
        clearCart: () => save([]),
        getLimitForItem,
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
