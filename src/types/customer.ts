/**
 * CUSTOMER — fuente única de verdad para los datos del comprador.
 *
 * Contexto histórico: el proyecto evolucionó con varios modelos (User, Order,
 * AdminOrder, Invoice) cada uno con sus propios nombres para los mismos datos
 * del cliente:
 *
 *   User.email              ─┐
 *   Order.customerEmail      ├── TODOS APUNTAN AL MISMO DATO
 *   AdminOrder.userEmail     ├── (el email del comprador)
 *   Invoice.customerEmail   ─┘
 *
 *   User.nif             ─┐
 *   Order.customerTaxId  ├── Nombre incoherente para el mismo NIF
 *   Invoice.customerNif ─┘
 *
 *   User.name + User.lastName  ─┐
 *   Order.customerName         ├── En User están separados, en Order/Admin unidos
 *   AdminOrder.userName       ─┘
 *
 *   User.addresses[].calle  vs  Invoice.address.street
 *   User.addresses[].cp     vs  Invoice.address.postalCode
 *   User.addresses[].ciudad vs  Invoice.address.city
 *
 * Este archivo centraliza todo eso en UN tipo (`CustomerSnapshot`) y provee
 * helpers `buildCustomerSnapshot` / `formatFullName` / `formatAddressLine`
 * para convertir cualquier otro modelo en el formato canónico.
 *
 * REGLA DE ORO: cuando alguien escriba código nuevo que necesite datos del
 * comprador, debe usar `CustomerSnapshot`. Los modelos legacy (Order,
 * AdminOrder, Invoice) se mantienen por compatibilidad, pero el flujo
 * recomendado es:
 *
 *   const snap = buildCustomerSnapshot(user, address);
 *   // snap.email, snap.nif, snap.fullName, snap.addressLine...
 */

import type { User, Address } from "@/types/user";

/** Tipo de identificador fiscal español. */
export type CustomerTaxIdType = "DNI" | "NIE" | "CIF";

/** Dirección en formato canónico (español, con nombres coherentes). */
export interface CustomerAddress {
  /** Calle + número (o razón social si es empresa). */
  street: string;
  /** Piso, puerta, escalera, etc. — opcional. */
  floor?: string;
  /** Código postal de 5 dígitos. */
  postalCode: string;
  /** Municipio. */
  city: string;
  /** Provincia (ES) — opcional. */
  province?: string;
  /** Código país ISO-3166 (ES por defecto). */
  countryCode: string;
}

/**
 * Snapshot congelado de los datos del comprador en un momento dado.
 * Se usa para pedidos, facturas y comunicaciones — todos derivan de aquí.
 *
 * Intencionalmente NO referencia al User por id como única fuente:
 * los pedidos tienen que conservar una copia inmutable de los datos del
 * cliente en el momento de la compra (cumplimiento fiscal — si el usuario
 * cambia su NIF más tarde, la factura antigua debe mantener el NIF original).
 */
export interface CustomerSnapshot {
  /** ID de usuario si estaba logueado; null si fue checkout de invitado. */
  userId: string | null;
  /** Rol en el momento de la compra (para aplicar precios correctos). */
  role: "cliente" | "mayorista" | "tienda" | "guest";

  // ── Identidad ─────────────────────────────────────────────────────────
  /** Nombre. */
  firstName: string;
  /** Apellidos. */
  lastName: string;
  /** Email de contacto — canal principal de notificaciones. */
  email: string;
  /** Teléfono (opcional, pero muy recomendable para pickup). */
  phone?: string;

  // ── Identificación fiscal ─────────────────────────────────────────────
  /** NIF / NIE / CIF normalizado en mayúsculas. Obligatorio para factura. */
  taxId: string;
  /** Tipo detectado. */
  taxIdType: CustomerTaxIdType;

  // ── Dirección ─────────────────────────────────────────────────────────
  /**
   * Dirección de envío. Puede ser null si la entrega es en tienda —
   * en ese caso los campos de dirección NO son requeridos.
   */
  shippingAddress: CustomerAddress | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Devuelve el nombre completo, limpio de dobles espacios. */
export function formatFullName(snap: Pick<CustomerSnapshot, "firstName" | "lastName">): string {
  return `${snap.firstName} ${snap.lastName}`.trim().replace(/\s+/g, " ");
}

/** Formatea la dirección como línea única: "C/ Mayor 12, 28001 Madrid, Madrid". */
export function formatAddressLine(addr: CustomerAddress | null): string {
  if (!addr) return "— Recogida en tienda —";
  const parts = [
    [addr.street, addr.floor].filter(Boolean).join(", "),
    [addr.postalCode, addr.city].filter(Boolean).join(" "),
    addr.province,
  ].filter((p): p is string => Boolean(p && p.trim()));
  return parts.join(", ");
}

/** Convierte una Address de usuario a CustomerAddress canónica. */
export function addressToCanonical(a: Address): CustomerAddress {
  const streetParts = [a.calle, a.numero].filter(Boolean).join(" ").trim();
  return {
    street: streetParts,
    floor: a.piso,
    postalCode: a.cp,
    city: a.ciudad,
    province: a.provincia,
    countryCode: a.pais || "ES",
  };
}

/**
 * Construye un CustomerSnapshot desde un User + una Address concreta.
 * Si el usuario es invitado (checkout sin cuenta) pasa `null` y los datos
 * del formulario se pueden montar manualmente con `guestSnapshot`.
 */
export function buildCustomerSnapshot(
  user: User,
  address: Address | null,
  opts: { includeAddress?: boolean } = { includeAddress: true },
): CustomerSnapshot {
  // Coerce: un admin nunca debería actuar como comprador, pero si lo hace
  // (ej. pedido de test) lo tratamos como cliente a efectos fiscales.
  const role: CustomerSnapshot["role"] =
    user.role === "admin" ? "cliente" : user.role;
  return {
    userId: user.id,
    role,
    firstName: user.name,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    taxId: (user.nif ?? "").toUpperCase(),
    taxIdType: (user.nifType ?? "DNI") as CustomerTaxIdType,
    shippingAddress:
      opts.includeAddress && address ? addressToCanonical(address) : null,
  };
}

/**
 * Construye un snapshot para un checkout de invitado a partir de los campos
 * del formulario. Útil en `/api/orders` cuando no hay `userId`.
 */
export function guestSnapshot(fields: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  taxId: string;
  taxIdType: CustomerTaxIdType;
  shippingAddress: CustomerAddress | null;
}): CustomerSnapshot {
  return {
    userId: null,
    role: "guest",
    firstName: fields.firstName,
    lastName: fields.lastName,
    email: fields.email,
    phone: fields.phone,
    taxId: fields.taxId.toUpperCase(),
    taxIdType: fields.taxIdType,
    shippingAddress: fields.shippingAddress,
  };
}

// ─── Adaptadores a modelos legacy ───────────────────────────────────────────
//
// Estos helpers permiten escribir código nuevo contra CustomerSnapshot y
// seguir alimentando los modelos legacy (OrderRecord, AdminOrder, Invoice)
// sin duplicación. Cuando un modelo se refactorice para usar Snapshot
// directamente, el adaptador se borra.

/** Forma mínima que OrderRecord / Order del checkout esperan. */
export interface LegacyOrderCustomerFields {
  userId?: string;
  customerEmail: string;
  customerName: string;
  customerTaxId: string;
  customerPhone?: string;
  shippingAddress: {
    calle: string;
    numero: string;
    piso?: string;
    cp: string;
    ciudad: string;
    provincia?: string;
    pais: string;
  } | null;
}

/** Convierte snapshot → campos legacy de OrderRecord. */
export function snapshotToLegacyOrder(snap: CustomerSnapshot): LegacyOrderCustomerFields {
  const addr = snap.shippingAddress;
  return {
    userId: snap.userId ?? undefined,
    customerEmail: snap.email,
    customerName: formatFullName(snap),
    customerTaxId: snap.taxId,
    customerPhone: snap.phone,
    shippingAddress: addr
      ? {
          calle: addr.street,
          numero: "",
          piso: addr.floor,
          cp: addr.postalCode,
          ciudad: addr.city,
          provincia: addr.province,
          pais: addr.countryCode,
        }
      : null,
  };
}
