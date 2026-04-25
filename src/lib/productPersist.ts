// Utility canónica para persistir cambios de producto (merge por campo).
//
// Regla SSOT: un producto vive en UNA de dos colecciones:
//   - Estático  → PRODUCTS[]  (inmutable) + overrides en `tcgacademy_product_overrides[id]`
//   - Admin-created → `tcgacademy_new_products[]` (mutable in-place)
//
// `getMergedProducts` solo aplica los overrides a los productos estáticos;
// a los admin-created los devuelve directamente del array. Por eso un patch
// que se escriba al key "overrides" para un producto admin-created queda
// huérfano — nunca se lee.
//
// Incidente StrixHaven 2026-04-22 (6ª iteración): `ProductDetailClient`
// siempre escribía a `overrides[id]` desde su `persistPatch` inline.
// Para StrixHaven (producto admin-created, ruta `/producto/<slug>`) el
// precio editado desde el detalle quedaba guardado en un key que nadie
// consulta. El mismo producto editado desde `/admin/precios` sí persistía
// porque ese panel SÍ distingue ambos casos. Fix: extraer a esta utility
// y usarla en TODOS los editores para que ambos tipos de producto se
// persistan en la colección correcta.
// Ver: feedback_catalog_detail_consistency.md GOTCHA 5.

import type { LocalProduct } from "@/data/products";
import { DataHub } from "@/lib/dataHub";

const OVERRIDES_KEY = "tcgacademy_product_overrides";
const NEW_PRODUCTS_KEY = "tcgacademy_new_products";

export function persistProductPatch(
  productId: number,
  patch: Partial<LocalProduct>,
): void {
  if (typeof window === "undefined") return;
  let adminCreated: LocalProduct[] = [];
  let overrides: Record<string, Partial<LocalProduct>> = {};
  try {
    adminCreated = JSON.parse(
      localStorage.getItem(NEW_PRODUCTS_KEY) ?? "[]",
    ) as LocalProduct[];
  } catch {
    adminCreated = [];
  }
  try {
    overrides = JSON.parse(
      localStorage.getItem(OVERRIDES_KEY) ?? "{}",
    ) as Record<string, Partial<LocalProduct>>;
  } catch {
    overrides = {};
  }

  const adminIdx = adminCreated.findIndex((p) => p.id === productId);
  if (adminIdx >= 0) {
    adminCreated[adminIdx] = {
      ...adminCreated[adminIdx],
      ...patch,
    } as LocalProduct;
    localStorage.setItem(NEW_PRODUCTS_KEY, JSON.stringify(adminCreated));
  } else {
    const key = String(productId);
    overrides[key] = { ...(overrides[key] ?? {}), ...patch };
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  }

  DataHub.emit("products");
}

/**
 * Añade un producto admin-creado nuevo al store y emite el evento canónico.
 * El llamador es responsable de generar el `id` único (ver `generateLocalProductId`).
 */
export function persistNewProduct(product: LocalProduct): void {
  if (typeof window === "undefined") return;
  let adminCreated: LocalProduct[] = [];
  try {
    adminCreated = JSON.parse(
      localStorage.getItem(NEW_PRODUCTS_KEY) ?? "[]",
    ) as LocalProduct[];
  } catch {
    adminCreated = [];
  }
  adminCreated.push(product);
  localStorage.setItem(NEW_PRODUCTS_KEY, JSON.stringify(adminCreated));
  DataHub.emit("products");
}
