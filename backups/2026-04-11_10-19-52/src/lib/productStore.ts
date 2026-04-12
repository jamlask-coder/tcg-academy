import type { LocalProduct } from "@/data/products";
import { PRODUCTS } from "@/data/products";

const LS_NEW = "tcgacademy_new_products";
const LS_OVERRIDES = "tcgacademy_product_overrides";
const LS_DELETED = "tcgacademy_deleted_products";

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Compare products by createdAt descending — newest first.
 *  Admin products without createdAt fall back to their timestamp-based ID. */
function byDateDesc(a: LocalProduct, b: LocalProduct): number {
  const getTime = (p: LocalProduct) =>
    p.createdAt
      ? new Date(p.createdAt).getTime()
      : p.id > 1_700_000_000_000
        ? p.id
        : 0;
  return getTime(b) - getTime(a);
}

/** Returns all products sorted newest-first: static + admin-created, with overrides applied, deleted removed */
export function getMergedProducts(): LocalProduct[] {
  const newProducts = safeGet<LocalProduct[]>(LS_NEW, []);
  const overrides = safeGet<Record<string, Partial<LocalProduct>>>(
    LS_OVERRIDES,
    {},
  );
  const deleted = new Set(safeGet<number[]>(LS_DELETED, []));

  const base = PRODUCTS.filter((p) => !deleted.has(p.id)).map((p) => {
    const ov = overrides[String(p.id)];
    return ov ? { ...p, ...ov } : p;
  });

  // Normalize admin products: infer createdAt from timestamp-based ID for
  // products created before the field was added to the form.
  const extra = newProducts
    .filter((p) => !deleted.has(p.id))
    .map((p) => ({
      ...p,
      createdAt: p.createdAt ?? new Date(p.id).toISOString().slice(0, 10),
    }));

  return [...base, ...extra].sort(byDateDesc);
}

export function getMergedByGame(game: string): LocalProduct[] {
  return getMergedProducts().filter((p) => p.game === game);
}

export function getMergedByGameAndCategory(
  game: string,
  category: string,
): LocalProduct[] {
  return getMergedProducts().filter(
    (p) => p.game === game && p.category === category,
  );
}

export function getMergedById(id: number): LocalProduct | undefined {
  return getMergedProducts().find((p) => p.id === id);
}

export function isLocalProduct(id: number): boolean {
  return id > 1_700_000_000_000; // Date.now() IDs are > 1.7 trillion
}
