/**
 * Zod validation schemas for the checkout flow.
 *
 * Used for client-side validation and ready for server-side reuse.
 */

import { z } from "zod";

// ─── Personal data ──────────────────────────────────────────────────────────

export const personalSchema = z.object({
  nombre: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  apellidos: z
    .string()
    .min(2, "Los apellidos deben tener al menos 2 caracteres"),
  email: z
    .string()
    .email("Introduce un email válido"),
  telefono: z
    .string()
    .regex(/^(\+34\s?)?[6-9]\d{8}$/, "Introduce un teléfono español válido")
    .optional()
    .or(z.literal("")),
});

export type PersonalData = z.infer<typeof personalSchema>;

// ─── Shipping address ───────────────────────────────────────────────────────

export const addressSchema = z.object({
  direccion: z
    .string()
    .min(3, "La dirección debe tener al menos 3 caracteres"),
  cp: z
    .string()
    .regex(/^\d{5}$/, "El código postal debe tener 5 dígitos"),
  ciudad: z
    .string()
    .min(2, "La ciudad debe tener al menos 2 caracteres"),
  provincia: z
    .string()
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

export const checkoutSchema = z
  .object({
    personal: personalSchema,
    address: addressSchema,
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
  );

export type CheckoutData = z.infer<typeof checkoutSchema>;
