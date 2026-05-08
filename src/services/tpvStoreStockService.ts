/**
 * tpvStoreStockService — Stock independiente por tienda standalone.
 *
 * Sólo se usa para tiendas con `sharesWebStock === false`
 * (Béjar / Madrid / Barcelona). Calpe NUNCA pasa por aquí — descuenta
 * directamente del catálogo central vía `persistProductPatch()`.
 *
 * Modelo: cada tienda lleva un map `{ [productId]: stock }` en su propia
 * clave. Si el producto no aparece en el map, su stock para esa tienda es
 * "desconocido" (la tienda no lo ha recibido todavía). Ventas de productos
 * con stock desconocido NO se permiten.
 *
 * Storage: `tcgacademy_tpv_<slug>_stock` → `{ [productId]: number }`
 * Evento: `tcga:tpv_stock:updated`
 *
 * NOTA: este servicio no inicializa el stock — eso lo hace el admin
 * manualmente desde `/admin/tpv/<slug>/stock` cuando recibe mercancía.
 */

import {
  TPV_STORES,
  tpvStockKey,
  type TpvStoreSlug,
} from "@/config/tpvStores";
import { DataHub } from "@/lib/dataHub";

// ─── Tipos internos ──────────────────────────────────────────────────────────

type StockMap = Record<string, number>;

// ─── Read ────────────────────────────────────────────────────────────────────

function loadStockMap(slug: TpvStoreSlug): StockMap {
  if (typeof window === "undefined") return {};
  if (!TPV_STORES[slug]) return {};
  try {
    const raw = localStorage.getItem(tpvStockKey(slug));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StockMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Stock disponible en una tienda standalone para un producto.
 * Devuelve `null` si la tienda no tiene fila para ese producto
 * (no se ha recibido). Devuelve `undefined` si el slug es Calpe
 * (no aplica — usa stock central).
 */
export function getStoreStock(
  slug: TpvStoreSlug,
  productId: number,
): number | null | undefined {
  const store = TPV_STORES[slug];
  if (!store) return undefined;
  if (store.sharesWebStock) return undefined;
  const map = loadStockMap(slug);
  const v = map[String(productId)];
  return Number.isFinite(v) ? v : null;
}

/** Map completo de stock para esa tienda. */
export function getStoreStockMap(slug: TpvStoreSlug): StockMap {
  const store = TPV_STORES[slug];
  if (!store || store.sharesWebStock) return {};
  return loadStockMap(slug);
}

// ─── Write ───────────────────────────────────────────────────────────────────

function persistStockMap(slug: TpvStoreSlug, map: StockMap): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(tpvStockKey(slug), JSON.stringify(map));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    throw new Error(`tpvStoreStockService: persist failed (${msg}).`);
  }
  DataHub.emit("tpv_stock");
}

/**
 * Establece (o sobrescribe) el stock de un producto en la tienda.
 * Usado al recibir mercancía o en ajustes manuales del admin.
 */
export function setStoreStock(
  slug: TpvStoreSlug,
  productId: number,
  quantity: number,
): void {
  const store = TPV_STORES[slug];
  if (!store) throw new Error(`tpvStoreStockService: slug desconocido "${slug}"`);
  if (store.sharesWebStock) {
    throw new Error(
      `tpvStoreStockService: ${slug} comparte stock con la web — usar persistProductPatch()`,
    );
  }
  const map = loadStockMap(slug);
  map[String(productId)] = Math.max(0, Math.floor(quantity));
  persistStockMap(slug, map);
}

/**
 * Decrementa el stock por una venta. Si el producto no estaba registrado
 * en la tienda devuelve `false` (la venta NO debe completarse — cada tienda
 * standalone debe declarar qué tiene antes de venderlo). Si hay stock
 * insuficiente también devuelve `false`.
 */
export function decrementStoreStock(
  slug: TpvStoreSlug,
  productId: number,
  quantity: number,
): { ok: true; newStock: number } | { ok: false; reason: string } {
  const store = TPV_STORES[slug];
  if (!store) return { ok: false, reason: `slug desconocido "${slug}"` };
  if (store.sharesWebStock) {
    return { ok: false, reason: `${slug} comparte stock con la web — no usar este servicio` };
  }
  const map = loadStockMap(slug);
  const key = String(productId);
  const current = map[key];
  if (!Number.isFinite(current)) {
    return {
      ok: false,
      reason: `producto ${productId} no registrado en stock de ${slug}`,
    };
  }
  if (current < quantity) {
    return {
      ok: false,
      reason: `stock insuficiente en ${slug} (disp: ${current}, req: ${quantity})`,
    };
  }
  const newStock = current - quantity;
  map[key] = newStock;
  persistStockMap(slug, map);
  return { ok: true, newStock };
}
