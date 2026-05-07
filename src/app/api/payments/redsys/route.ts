/**
 * POST /api/payments/redsys
 *
 * Construye el form Redsys (parámetros + firma HMAC-SHA256) y lo devuelve
 * al cliente, que debe hacer auto-submit a `endpoint` en el frontend.
 *
 * El navegador acaba en el TPV alojado por Redsys / banco — TCG Academy
 * NO ve datos de tarjeta en ningún momento (PCI-DSS SAQ-A).
 *
 * El estado del pedido se actualizará SOLO al recibir la notificación
 * server-to-server en /api/payments/redsys/notify (ground truth).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/auth";
import { serverRateLimit } from "@/utils/sanitize";
import { zodMessage } from "@/lib/validations/api";
import { logger } from "@/lib/logger";
import { isRedsysConfigured } from "@/config/redsysConfig";
import { buildRedsysPayment } from "@/services/providers/redsysProvider";

const bodySchema = z.object({
  orderId: z.string().min(1).max(120),
  /** Importe en EUROS (con decimales). Lo convertimos a céntimos internamente. */
  amount: z.number().positive().max(99999),
  description: z.string().min(1).max(125),
  cardholder: z
    .object({
      name: z.string().min(1).max(60),
      email: z.string().email().max(254).optional(),
      phone: z.string().max(20).optional(),
      addressLine1: z.string().max(200).optional(),
      city: z.string().max(80).optional(),
      postalCode: z.string().max(15).optional(),
      countryNumeric: z.string().length(3).optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = serverRateLimit(`redsys:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes." },
        { status: 429 },
      );
    }

    if (!isRedsysConfigured()) {
      return NextResponse.json(
        {
          error: "Redsys no configurado",
          hint: "Rellena REDSYS_MERCHANT_CODE / REDSYS_SECRET_KEY / REDSYS_MODE en el entorno.",
        },
        { status: 501 },
      );
    }

    const rawBody = await req.json();
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: zodMessage(parsed.error) },
        { status: 400 },
      );
    }
    const { orderId, amount, description, cardholder } = parsed.data;

    const amountCents = String(Math.round(amount * 100));

    const payload = buildRedsysPayment({
      orderId,
      amountCents,
      productDescription: description,
      cardholderEmail: cardholder?.email,
      cardholder: cardholder
        ? {
            name: cardholder.name,
            phone: cardholder.phone,
            addressLine1: cardholder.addressLine1,
            city: cardholder.city,
            postalCode: cardholder.postalCode,
            country: cardholder.countryNumeric,
          }
        : undefined,
      clientIp: ip,
    });

    return NextResponse.json({ ok: true, ...payload });
  } catch (err) {
    logger.error("redsys POST failed", "payments-redsys", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "No se pudo iniciar el pago Redsys" },
      { status: 500 },
    );
  }
}
