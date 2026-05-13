/**
 * tpvSeller — gestiona el vendedor activo dentro de una sesión TPV.
 *
 * Diseño:
 *   - El "seller activo" vive en sessionStorage (no localStorage). Cada
 *     pestaña/ventana del navegador puede tener un seller diferente — útil
 *     cuando la tienda tiene dos cajas abiertas en el mismo PC.
 *   - El seller activo se elige ANTES de que el TPV permita facturar:
 *     `TpvSellerGate` se monta como overlay y bloquea la UI hasta que se
 *     selecciona (owner o worker autenticado).
 *   - Persiste hasta logout manual (`clearActiveSeller`) o cierre de pestaña.
 *
 * El seller se inyecta como `operatorId` + `operatorName` en cada venta. Eso
 * queda registrado en la BD para auditoría, aunque de momento no se muestra
 * en otros listados.
 */

import type { TpvActiveSeller } from "@/types/tpvWorker";
import type { TpvStoreSlug } from "@/config/tpvStores";

const STORAGE_KEY = "tcgacademy_tpv_active_seller";

function isSeller(x: unknown): x is TpvActiveSeller {
  if (!x || typeof x !== "object") return false;
  const v = x as Record<string, unknown>;
  return (
    (v.kind === "owner" || v.kind === "worker") &&
    typeof v.id === "string" &&
    typeof v.label === "string" &&
    typeof v.storeSlug === "string" &&
    typeof v.selectedAt === "string"
  );
}

/** Lee el seller activo del sessionStorage. Devuelve null si no hay o es inválido. */
export function getActiveSeller(): TpvActiveSeller | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isSeller(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Devuelve el seller activo SI corresponde a la tienda indicada. Si la URL
 * está en `/tpv/madrid` pero el seller guardado es de Calpe (por ejemplo,
 * porque el operador cambió de tienda) → devolvemos null para forzar nueva
 * selección.
 */
export function getActiveSellerForStore(
  slug: TpvStoreSlug,
): TpvActiveSeller | null {
  const seller = getActiveSeller();
  if (!seller) return null;
  if (seller.storeSlug !== slug) return null;
  return seller;
}

/** Persiste el seller activo. */
export function setActiveSeller(seller: TpvActiveSeller): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(seller));
}

/** Limpia el seller activo — fuerza reaparición del gate. */
export function clearActiveSeller(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
