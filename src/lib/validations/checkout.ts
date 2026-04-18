/**
 * Zod validation schemas for the checkout flow.
 *
 * Used for client-side validation and ready for server-side reuse.
 *
 * HARDENED: max lengths, Spanish CP range, email format, name character sets.
 */

import { z } from "zod";
import { validateSpanishNIF } from "./nif";

// ─── Shared refinements ─────────────────────────────────────────────────────

/** Only letters, spaces, hyphens, apostrophes, and common accents */
const NAME_REGEX = /^[\p{L}\s'\-.,]+$/u;

/** Valid Spanish postal code range: 01000–52999 */
function isValidSpanishCP(cp: string): boolean {
  const num = parseInt(cp, 10);
  return num >= 1000 && num <= 52999;
}

// ─── Personal data ──────────────────────────────────────────────────────────

export const personalSchema = z.object({
  nombre: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre es demasiado largo (máx. 80)")
    .refine((v) => NAME_REGEX.test(v.trim()), "El nombre contiene caracteres no permitidos"),
  apellidos: z
    .string()
    .min(2, "Los apellidos deben tener al menos 2 caracteres")
    .max(120, "Los apellidos son demasiado largos (máx. 120)")
    .refine((v) => NAME_REGEX.test(v.trim()), "Los apellidos contienen caracteres no permitidos"),
  email: z
    .string()
    .email("Introduce un email válido")
    .max(254, "El email es demasiado largo")
    .refine(
      (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v),
      "El formato de email no es válido",
    ),
  telefono: z
    .string()
    .regex(/^(\+34\s?)?[6-9]\d{8}$/, "Introduce un teléfono español válido"),
  /**
   * NIF / NIE / CIF — OBLIGATORIO para factura (Art. 6.1.d RD 1619/2012).
   * Validado con algoritmo oficial (mod-23 para DNI/NIE, CIF con dígito/letra de control).
   */
  nif: z
    .string()
    .min(9, "El NIF / NIE / CIF debe tener 9 caracteres")
    .max(9, "El NIF / NIE / CIF debe tener 9 caracteres")
    .refine((v) => validateSpanishNIF(v).valid, {
      message: "NIF / NIE / CIF español no válido",
    }),
});

export type PersonalData = z.infer<typeof personalSchema>;

// ─── Shipping address ───────────────────────────────────────────────────────

export const addressSchema = z.object({
  direccion: z
    .string()
    .min(5, "La dirección debe tener al menos 5 caracteres")
    .max(200, "La dirección es demasiado larga (máx. 200)")
    .refine(
      (v) => /\d/.test(v),
      "La dirección debe incluir un número (portal, piso, etc.)",
    ),
  cp: z
    .string()
    .regex(/^\d{5}$/, "El código postal debe tener 5 dígitos")
    .refine(isValidSpanishCP, "Código postal fuera de rango español (01000–52999)"),
  ciudad: z
    .string()
    .min(2, "La ciudad debe tener al menos 2 caracteres")
    .max(100, "El nombre de ciudad es demasiado largo"),
  provincia: z
    .string()
    .max(100, "Nombre de provincia demasiado largo")
    .optional()
    .or(z.literal("")),
});

export type AddressData = z.infer<typeof addressSchema>;

// ─── Shipping method ────────────────────────────────────────────────────────

export const shippingSchema = z
  .object({
    envio: z.enum(["estandar", "express", "tienda"]),
    tiendaRecogida: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => data.envio !== "tienda" || (data.tiendaRecogida && data.tiendaRecogida.length > 0),
    {
      message: "Selecciona una tienda de recogida",
      path: ["tiendaRecogida"],
    },
  );

export type ShippingData = z.infer<typeof shippingSchema>;

// ─── Payment method ─────────────────────────────────────────────────────────

export const paymentSchema = z.object({
  pago: z.enum(["tarjeta", "paypal", "bizum", "tienda"]),
});

export type PaymentData = z.infer<typeof paymentSchema>;

// ─── Combined checkout schema ───────────────────────────────────────────────
//
// La dirección es CONDICIONAL: sólo se valida si el método de envío no es
// recogida en tienda. No tiene sentido exigir dirección de entrega cuando el
// cliente va a recoger el pedido en uno de nuestros puntos físicos.

const partialAddressSchema = z.object({
  direccion: z.string().max(200).optional().or(z.literal("")),
  cp: z.string().max(10).optional().or(z.literal("")),
  ciudad: z.string().max(100).optional().or(z.literal("")),
  provincia: z.string().max(100).optional().or(z.literal("")),
});

export const checkoutSchema = z
  .object({
    personal: personalSchema,
    address: partialAddressSchema,
    shipping: z.object({
      envio: z.enum(["estandar", "express", "tienda"]),
      tiendaRecogida: z.string().optional().or(z.literal("")),
    }),
    payment: paymentSchema,
  })
  .refine(
    (data) =>
      data.shipping.envio !== "tienda" ||
      (data.shipping.tiendaRecogida && data.shipping.tiendaRecogida.length > 0),
    {
      message: "Selecciona una tienda de recogida",
      path: ["shipping", "tiendaRecogida"],
    },
  )
  // Si es envío a domicilio, dirección completa obligatoria.
  .refine(
    (data) => {
      if (data.shipping.envio === "tienda") return true;
      const r = addressSchema.safeParse(data.address);
      return r.success;
    },
    {
      message:
        "Para envío a domicilio necesitamos dirección, código postal y ciudad válidos",
      path: ["address"],
    },
  );

export type CheckoutData = z.infer<typeof checkoutSchema>;
