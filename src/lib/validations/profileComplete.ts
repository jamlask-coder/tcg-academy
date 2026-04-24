/**
 * ── Completitud del perfil fiscal ────────────────────────────────────────────
 *
 * SSOT de qué datos son legalmente obligatorios para que un usuario pueda
 * finalizar una compra y recibir factura válida.
 *
 * Base legal:
 *  - Art. 6.1.c RD 1619/2012 — Nombre y apellidos / razón social
 *  - Art. 6.1.d RD 1619/2012 — NIF / NIE / CIF del destinatario (factura completa)
 *  - Art. 6.1.e RD 1619/2012 — Domicilio fiscal del destinatario
 *
 * Usuarios creados vía Google OAuth (`loginWithGoogle` en AuthContext) llegan
 * con `phone:""`, `addresses:[]` y sin `nif`. Este helper detecta ese caso y
 * permite bloquear checkout + redirigir a `/cuenta/completar-datos`.
 */

import type { User, Address } from "@/types/user";
import { validateSpanishNIF } from "@/lib/validations/nif";

export type FiscalMissingField =
  | "name"
  | "lastName"
  | "nif"
  | "phone"
  | "address";

export interface FiscalCompletenessResult {
  ok: boolean;
  missing: FiscalMissingField[];
}

/** Verifica que una dirección tiene los 5 campos postales obligatorios. */
export function isAddressComplete(addr: Address | null | undefined): boolean {
  if (!addr) return false;
  return (
    !!addr.calle?.trim() &&
    !!addr.cp?.trim() &&
    !!addr.ciudad?.trim() &&
    !!addr.provincia?.trim() &&
    !!addr.pais?.trim()
  );
}

/**
 * Comprueba si el perfil de un usuario contiene todos los datos legalmente
 * obligatorios para finalizar una compra B2C.
 *
 * Devuelve `{ok, missing}`. Si `ok=false`, `missing` contiene los campos
 * concretos que faltan — útil para mensajes de error en UI.
 */
export function isFiscalProfileComplete(
  user: User | null | undefined,
): FiscalCompletenessResult {
  if (!user) return { ok: false, missing: ["name", "lastName", "nif", "phone", "address"] };

  const missing: FiscalMissingField[] = [];

  if (!user.name?.trim()) missing.push("name");
  if (!user.lastName?.trim()) missing.push("lastName");

  // NIF: obligatorio Y válido (con checksum)
  const nifRes = validateSpanishNIF(user.nif ?? "");
  if (!nifRes.valid) missing.push("nif");

  // Teléfono: al menos 9 dígitos. No es legalmente obligatorio en la factura
  // pero sí para contacto logístico (envío, incidencias). Se considera parte
  // del perfil completo mínimo — política del proyecto.
  if (!user.phone || user.phone.trim().length < 9) missing.push("phone");

  // Al menos una dirección con los 5 campos postales obligatorios.
  const hasValidAddress = (user.addresses ?? []).some(isAddressComplete);
  if (!hasValidAddress) missing.push("address");

  return { ok: missing.length === 0, missing };
}

/** Etiquetas legibles en español para cada campo faltante. */
export const FISCAL_FIELD_LABELS: Record<FiscalMissingField, string> = {
  name: "Nombre",
  lastName: "Apellidos",
  nif: "NIF / NIE / CIF",
  phone: "Teléfono",
  address: "Dirección fiscal",
};
