/**
 * TPV access control helpers — per-store authorization.
 *
 * Reglas:
 *   - `admin` puede acceder a cualquier TPV (sin restricción de tienda).
 *   - Super-usuarios (`TPV_SUPER_USER_EMAILS`) también pueden acceder a todas
 *     las tiendas, independientemente de su rol o `tpvStoreSlug`.
 *   - `tienda` SÓLO puede acceder a la tienda indicada por `tpvStoreSlug` en
 *     su sesión.
 *   - Cualquier otro rol no tiene acceso a TPV.
 *
 * Este módulo es PUNTO ÚNICO de verdad para "¿quién entra a qué TPV?".
 * Lo consumen: `proxy.ts` (edge), `app/tpv/layout.tsx` (server component) y
 * `app/tpv/[store]/page.tsx` (deep-link).
 */

import {
  TPV_STORE_SLUGS,
  type TpvStoreSlug,
} from "@/config/tpvStores";

/**
 * Emails con acceso global a TODAS las tiendas TPV, sin depender del rol
 * o de `tpvStoreSlug`. Se compara case-insensitive y trimeado.
 *
 * Añadir aquí solo cuentas que realmente necesiten saltarse la
 * restricción por tienda — cada entrada es una excepción de seguridad
 * que sale de la regla "1 usuario tienda = 1 TPV".
 */
export const TPV_SUPER_USER_EMAILS: readonly string[] = [
  "ricardoluri@gmail.com",
];

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** True si el email pertenece al allowlist de super-usuarios TPV. */
export function isTpvSuperUser(email: string | null | undefined): boolean {
  const e = normalizeEmail(email);
  if (!e) return false;
  return TPV_SUPER_USER_EMAILS.some((s) => s.toLowerCase() === e);
}

/**
 * Determina si un usuario puede acceder al TPV de una tienda concreta.
 *
 * @param session Datos de la sesión (rol + email + slug asignado).
 * @param targetSlug Slug de la tienda a la que se intenta acceder.
 */
export function canAccessTpvStore(
  session: {
    role: string;
    email: string;
    tpvStoreSlug?: string;
  },
  targetSlug: TpvStoreSlug,
): boolean {
  // Super-usuario: acceso total.
  if (isTpvSuperUser(session.email)) return true;
  // Admin: acceso total.
  if (session.role === "admin") return true;
  // Tienda: sólo su tienda asignada.
  if (session.role === "tienda") {
    return session.tpvStoreSlug === targetSlug;
  }
  return false;
}

/**
 * Lista de tiendas TPV a las que el usuario tiene acceso.
 * Para admins/super-users → todas. Para `tienda` → sólo la suya (si tiene
 * un slug válido asignado). Resto → array vacío.
 *
 * El selector `/tpv` lo usa para mostrar solo lo que el usuario puede abrir.
 */
export function getAllowedTpvStores(session: {
  role: string;
  email: string;
  tpvStoreSlug?: string;
}): TpvStoreSlug[] {
  if (isTpvSuperUser(session.email) || session.role === "admin") {
    return [...TPV_STORE_SLUGS];
  }
  if (session.role === "tienda" && session.tpvStoreSlug) {
    const slug = session.tpvStoreSlug;
    if ((TPV_STORE_SLUGS as readonly string[]).includes(slug)) {
      return [slug as TpvStoreSlug];
    }
  }
  return [];
}
