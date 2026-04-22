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

export function getMergedBySlug(slug: string): LocalProduct | undefined {
  return getMergedProducts().find((p) => p.slug === slug);
}

export function isLocalProduct(id: number): boolean {
  return id > 1_700_000_000_000; // Date.now() IDs are > 1.7 trillion
}

/**
 * Genera un `id` numérico único para un producto admin-creado.
 *
 * Problema resuelto: un admin con 2 pestañas abiertas que guardaba 2
 * productos en el mismo milisegundo generaba `Date.now()` duplicado →
 * el segundo sobrescribía al primero al hacer lookup por id.
 *
 * Diseño: `Date.now()*1000 + randomInt(0..999)` → 1M combinaciones por ms
 * (colisión ≈ 0,1 % si coinciden en el mismo ms). Si aun así colisiona
 * con un id existente, incrementamos +1 hasta que sea único.
 *
 * Garantías:
 *   · Siempre > 1.7·10¹⁵ → `isLocalProduct()` sigue devolviendo true.
 *   · Dentro de Number.MAX_SAFE_INTEGER (2⁵³-1 ≈ 9·10¹⁵) hasta ~2255.
 *   · Unicidad verificada contra `getMergedProducts()` al generar.
 */
export function generateLocalProductId(): number {
  const existing = new Set(getMergedProducts().map((p) => p.id));
  let id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  while (existing.has(id)) id++;
  return id;
}

/**
 * Verifica si un slug ya está en uso por OTRO producto (excluye `excludeId`
 * para permitir editar el mismo producto sin falsos positivos).
 *
 * Devuelve el producto que ya usa ese slug (para mostrar error claro), o
 * `undefined` si está libre.
 */
export function findProductBySlugExcluding(
  slug: string,
  excludeId?: number,
): LocalProduct | undefined {
  if (!slug) return undefined;
  const normalized = slug.toLowerCase().trim();
  return getMergedProducts().find(
    (p) =>
      p.id !== excludeId && p.slug.toLowerCase().trim() === normalized,
  );
}

/**
 * URL canónica para un producto. Siempre devuelve ruta legible con nombre
 * (`/producto/{slug}` para productos locales admin-created, `/game/cat/slug`
 * para estáticos). Nunca `?id=X`.
 */
export function getProductUrl(
  p: Pick<LocalProduct, "id" | "game" | "category" | "slug">,
): string {
  if (isLocalProduct(p.id)) return `/producto/${p.slug}`;
  return `/${p.game}/${p.category}/${p.slug}`;
}
