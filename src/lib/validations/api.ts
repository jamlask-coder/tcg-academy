/**
 * Zod schemas para validar bodies de las API routes.
 *
 * Usamos `safeParse` para que los inputs válidos se comporten exactamente
 * igual que antes (mismo shape, mismo flujo). Los inputs malformados se
 * rechazan con 400 sin alcanzar la lógica de negocio — es la única
 * diferencia visible.
 */

import { z } from "zod";
import { validateSpanishNIF } from "@/lib/validations/nif";

// ─── Auth ────────────────────────────────────────────────────────────────

export const authLoginSchema = z.object({
  action: z.literal("login"),
  email: z.string().min(1).max(254),
  password: z.string().min(1).max(200),
  rememberMe: z.boolean().optional(),
});

export const authRegisterSchema = z.object({
  action: z.literal("register"),
  name: z.string().min(1).max(120),
  lastName: z.string().max(120).optional(),
  email: z.string().email().max(254),
  // Longitud mínima delegada a validatePasswordForRole(role) server-side.
  // Aquí solo bloqueamos vacío y payloads grandes.
  password: z.string().min(1).max(200),
  phone: z.string().max(40).optional(),
  username: z.string().max(40).optional(),
  referralCode: z.string().max(40).optional(),
  marketingConsent: z.boolean().optional(),
  /**
   * NIF/NIE/CIF obligatorio en el registro — se valida con el
   * **mismo algoritmo** que en el cliente (mod-23 DNI/NIE + checksum CIF)
   * para que un atacante que salte el form no pueda meter basura.
   * El tipo se infiere server-side con `validateSpanishNIF`, por lo que
   * aquí aceptamos `nifType` sólo como hint opcional.
   */
  nif: z
    .string()
    .min(1, "NIF/NIE/CIF obligatorio")
    .max(12)
    .superRefine((v, ctx) => {
      const r = validateSpanishNIF(v);
      if (!r.valid) {
        ctx.addIssue({
          code: "custom",
          message: r.error ?? "NIF/NIE/CIF inválido",
        });
      }
    }),
  nifType: z.enum(["DNI", "NIE", "CIF"]).optional(),
  consent: z.array(z.string()).optional(),
  /** Cloudflare Turnstile token — verificado server-side si hay secret. */
  captchaToken: z.string().max(4096).optional(),
});

export const authResetRequestSchema = z.object({
  action: z.literal("reset-password"),
  email: z.string().email().max(254),
});

export const authResetConfirmSchema = z.object({
  action: z.literal("reset-confirm"),
  email: z.string().email().max(254),
  token: z.string().min(10).max(256),
  // Longitud mínima delegada a validatePasswordForRole(user.role) server-side.
  newPassword: z.string().min(1).max(200),
});

export const authChangePasswordSchema = z.object({
  action: z.literal("change-password"),
  userId: z.string().min(1).max(120),
  currentPassword: z.string().min(1).max(200),
  // La longitud mínima real depende del rol — la valida `validatePasswordForRole`
  // server-side. Aquí solo bloqueamos cadenas vacías y payloads enormes.
  newPassword: z.string().min(1).max(200),
});

export const authLogoutSchema = z.object({
  action: z.literal("logout"),
});

export const authVerifyEmailSchema = z.object({
  action: z.literal("verify-email"),
  email: z.string().email().max(254),
  token: z.string().min(10).max(256),
});

export const authResendVerificationSchema = z.object({
  action: z.literal("resend-verification"),
  email: z.string().email().max(254),
});

export const authBodySchema = z.discriminatedUnion("action", [
  authLoginSchema,
  authRegisterSchema,
  authResetRequestSchema,
  authResetConfirmSchema,
  authChangePasswordSchema,
  authLogoutSchema,
  authVerifyEmailSchema,
  authResendVerificationSchema,
]);

// ─── Orders ──────────────────────────────────────────────────────────────

const orderItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive().max(999),
  price: z.number().nonnegative().max(99999),
  name: z.string().max(200).optional(),
  image: z.string().max(500).optional(),
});

const orderCustomerSchema = z.object({
  nombre: z.string().min(1).max(80),
  apellidos: z.string().min(1).max(120),
  nif: z.string().min(9).max(9),
  email: z.string().email().max(254),
  telefono: z.string().max(40).optional(),
  direccion: z.string().min(1).max(200),
  numero: z.string().max(20).optional(),
  piso: z.string().max(20).optional(),
  ciudad: z.string().min(1).max(100),
  cp: z.string().min(1).max(10),
  provincia: z.string().max(100).optional(),
  pais: z.string().max(100).optional(),
});

export const orderCreateSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(100),
  customer: orderCustomerSchema,
  shipping: z.object({
    method: z.string().min(1).max(60),
    tiendaRecogida: z.string().max(60).optional(),
  }),
  payment: z.object({
    method: z.string().min(1).max(60),
  }),
  coupon: z
    .object({
      code: z.string().max(60),
      discount: z.number().nonnegative().max(99999),
    })
    .optional(),
  pointsDiscount: z.number().nonnegative().max(99999).optional(),
  clientTotal: z.number().nonnegative().max(999999).optional(),
});

export const orderStatusValues = [
  "pedido",
  "pagado",
  "pendiente_envio",
  "enviado",
  "cancelado",
  "incidencia",
  "devolucion",
] as const;

export const orderPatchSchema = z.object({
  status: z.enum(orderStatusValues),
  tracking: z.string().max(120).optional(),
  note: z.string().max(1000).optional(),
});

// ─── Payments ────────────────────────────────────────────────────────────

export const paymentCreateSchema = z.object({
  orderId: z.string().min(1).max(120),
  amount: z.number().positive().max(99999),
  method: z.enum(["tarjeta", "paypal", "bizum", "transferencia", "tienda"]),
  currency: z.string().length(3).optional(),
});

// ─── Returns ─────────────────────────────────────────────────────────────

const returnItemSchema = z.object({
  productId: z.union([z.string(), z.number()]),
  quantity: z.number().int().positive().max(999),
  reason: z.string().min(1).max(500),
});

export const returnCreateSchema = z.object({
  orderId: z.string().min(1).max(120),
  items: z.array(returnItemSchema).min(1).max(100),
});

export const returnStatusValues = [
  "solicitada",
  "aprobada",
  "en_transito",
  "recibida",
  "reembolsada",
  "rechazada",
  "cerrada",
] as const;

export const returnPatchSchema = z.object({
  rmaId: z.string().min(1).max(120),
  status: z.enum(returnStatusValues),
  note: z.string().max(1000).optional(),
  trackingNumber: z.string().max(120).optional(),
});

// ─── Notifications ──────────────────────────────────────────────────────

export const notificationSchema = z.object({
  orderId: z.string().min(1).max(120),
  status: z.string().min(1).max(60),
  customerEmail: z.string().email().max(254),
  customerName: z.string().max(200).optional(),
  tracking: z.string().max(120).optional(),
  note: z.string().max(1000).optional(),
});

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Mensaje breve y genérico a partir de un ZodError, sin exponer detalles
 * internos. El primer mensaje suele ser suficiente en UX.
 */
export function zodMessage(err: z.ZodError): string {
  const first = err.issues[0];
  if (!first) return "Datos inválidos";
  const field = first.path.join(".");
  return field ? `${field}: ${first.message}` : first.message;
}
