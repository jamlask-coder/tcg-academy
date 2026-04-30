import type { LocalProduct } from "@/data/products";
import { PRODUCTS } from "@/data/products";
import { DataHub } from "@/lib/dataHub";
import { getProductCache } from "@/lib/productCache";
import {
  isEventVirtualId,
  resolveEventVirtualProduct,
  resolveEventVirtualProductBySlug,
} from "@/lib/eventProduct";

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

/**
 * Fuente del catálogo "base":
 * - Server mode: cache hidratado desde Supabase (vía /api/products). Si aún
 *   no se ha hidratado en este render, fallback a PRODUCTS estático para no
 *   pintar vacío. ProductsHydrator dispara la primera fetch al montar.
 * - Local mode: PRODUCTS estático tal cual.
 */
function getBaseCatalog(): LocalProduct[] {
  const cached = getProductCache();
  return cached ?? PRODUCTS;
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

  const base = getBaseCatalog().filter((p) => !deleted.has(p.id)).map((p) => {
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
  // Eventos viven en su propio rango reservado y se resuelven on-the-fly
  // desde EVENTS — no aparecen en getMergedProducts() para no contaminar
  // listados de catálogo, pero el carrito/checkout/facturas los encuentran
  // por ID virtual.
  if (isEventVirtualId(id)) return resolveEventVirtualProduct(id);
  return getMergedProducts().find((p) => p.id === id);
}

/**
 * Helper canónico "Vista 360°": resuelve un array de IDs de producto a
 * LocalProducts (los no encontrados se filtran). Útil para User.favorites[]
 * y cualquier entidad que guarde solo IDs.
 */
export function getProductsByIds(ids: number[]): LocalProduct[] {
  if (!ids.length) return [];
  const all = getMergedProducts();
  const byId = new Map(all.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter((p): p is LocalProduct => !!p);
}

export function getMergedBySlug(slug: string): LocalProduct | undefined {
  if (slug.startsWith("evento-")) {
    return resolveEventVirtualProductBySlug(slug);
  }
  return getMergedProducts().find((p) => p.slug === slug);
}

export function isLocalProduct(id: number): boolean {
  return id > 1_700_000_000_000; // Date.now() IDs are > 1.7 trillion
}

/**
 * Soft-delete canónico de un producto (cualquier origen: estático o admin).
 * Marca el id como borrado y emite el evento DataHub correspondiente para
 * que el catálogo, carrito y wishlists se actualicen.
 *
 * En server-mode replica el borrado a BD vía DELETE /api/admin/products/[id]
 * (fire-and-forget) para que otros admins/dispositivos también lo vean. La
 * lista local sigue actualizándose como cache optimista para que la UI no
 * parpadee.
 */
export function softDeleteProduct(id: number): void {
  if (typeof window === "undefined") return;
  try {
    const deleted = safeGet<number[]>(LS_DELETED, []);
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem(LS_DELETED, JSON.stringify(deleted));
      DataHub.emit("products");
    }
  } catch {
    /* ignore */
  }

  const isServerMode =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
  if (isServerMode) {
    void fetch(`/api/admin/products/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
      credentials: "include",
    }).catch(() => {
      // optimista: la lista local ya está actualizada, un reload reconciliará
    });
  }
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
