/**
 * POST /api/payments/redsys/notify
 *
 * Endpoint de notificación on-line de Redsys (server-to-server). Esta es la
 * única fuente fiable del estado real del pago — la URL de retorno OK/KO al
 * navegador puede no llegar (cliente cierra pestaña).
 *
 * Requisitos del banco:
 *  - HTTPS, accesible públicamente sin auth, sin IP allowlist agresiva.
 *  - Responde 200 OK incluso si el pedido ya estaba procesado (idempotencia).
 *  - Tiempo de respuesta < 5s.
 *  - Verificación de firma OBLIGATORIA antes de tocar BD (ataque de
 *    spoofing trivial si no se valida).
 *
 * Idempotencia: usamos un Set en memoria con TTL 24h por `Ds_Order` —
 * mismo patrón que el webhook de Stripe en /api/payments/webhook.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendOrderNotification } from "@/lib/email";
import { logger } from "@/lib/logger";
import { verifyRedsysNotification } from "@/services/providers/redsysProvider";
import { isRedsysConfigured } from "@/config/redsysConfig";

export const dynamic = "force-dynamic";

// ── Idempotencia ──────────────────────────────────────────────────────────
const PROCESSED_NOTIFICATIONS = new Map<string, number>();
const NOTIFY_TTL_MS = 24 * 60 * 60 * 1000;
function markNotificationSeen(key: string): boolean {
  const now = Date.now();
  for (const [k, ts] of PROCESSED_NOTIFICATIONS) {
    if (now - ts > NOTIFY_TTL_MS) PROCESSED_NOTIFICATIONS.delete(k);
  }
  if (PROCESSED_NOTIFICATIONS.has(key)) return false;
  PROCESSED_NOTIFICATIONS.set(key, now);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";
    if (backendMode !== "server") {
      // En modo local solo confirmamos recepción para que el banco no
      // reintente. La actualización de pedidos se hace en el frontend.
      return NextResponse.json({ received: true, mode: "local" });
    }

    if (!isRedsysConfigured()) {
      logger.warn("Redsys notify recibido pero TPV no configurado", "payments-redsys-notify");
      return NextResponse.json({ error: "Not configured" }, { status: 501 });
    }

    // Redsys envía application/x-www-form-urlencoded.
    const form = await req.formData();
    const merchantParameters = String(form.get("Ds_MerchantParameters") ?? "");
    const signature = String(form.get("Ds_Signature") ?? "");
    const signatureVersion = String(form.get("Ds_SignatureVersion") ?? "");

    if (signatureVersion !== "HMAC_SHA256_V1") {
      logger.warn("Redsys notify con versión de firma inesperada", "payments-redsys-notify", {
        signatureVersion,
      });
      return NextResponse.json({ error: "Unsupported signature version" }, { status: 400 });
    }

    const result = verifyRedsysNotification(merchantParameters, signature);
    if (!result.ok) {
      // ATENCIÓN: nunca devolver 4xx con detalle del error de firma. El banco
      // reintenta si recibe 4xx — devolvemos 400 genérico y logueamos.
      logger.error("Redsys notify firma inválida", "payments-redsys-notify");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const dedupeKey = `${result.orderId}:${result.responseCode}:${result.amountCents}`;
    if (!markNotificationSeen(dedupeKey)) {
      return NextResponse.json({ received: true, deduped: true });
    }

    const db = getDb();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tcgacademy.es";

    // El `Ds_Order` que devuelve Redsys es el normalizado por
    // `normalizeOrderId()`. Si el orderId interno cumple las reglas Redsys
    // (4-12 chars, 4 primeros numéricos) entonces dsOrder === orderId y el
    // lookup directo funciona. Si NO cumple, hay que persistir un mapping
    // al iniciar el pago — TODO cuando se conecte el provider en producción.
    const order = await db.getOrder(result.orderId);
    if (!order) {
      logger.warn("Redsys notify sin pedido asociado", "payments-redsys-notify", {
        dsOrder: result.orderId,
      });
      // Devolvemos 200 igualmente para que el banco no reintente
      // indefinidamente. La incidencia queda en logs para conciliación manual.
      return NextResponse.json({ received: true, unknown_order: true });
    }

    if (result.authorized) {
      const paymentDate = new Date().toISOString();
      await db.updateOrderStatus(order.id, "confirmado", {
        paymentStatus: "cobrado",
        paymentIntent: `redsys_${result.authorizationCode ?? result.orderId}`,
        paymentDate,
      });

      await sendOrderNotification(order.id, "confirmado", order.customerEmail, {
        total: order.total.toFixed(2),
        customerName: order.customerName,
        appUrl,
      });

      const adminEmail =
        (await db.getSetting("notification_email")) ?? "tcgacademycalpe@gmail.com";
      await sendOrderNotification(order.id, "confirmado", adminEmail, {
        total: order.total.toFixed(2),
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        appUrl,
      });

      await db.logAudit({
        entityType: "order",
        entityId: order.id,
        action: "redsys_payment_succeeded",
        field: "payment_status",
        oldValue: "pendiente",
        newValue: "cobrado",
      });
    } else {
      await db.updateOrderStatus(order.id, "pendiente", {
        paymentStatus: "fallido",
      });
      await db.logAudit({
        entityType: "order",
        entityId: order.id,
        action: "redsys_payment_failed",
        field: "payment_status",
        newValue: `fallido (Ds_Response=${result.responseCode})`,
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("Redsys notify processing failed", "payments-redsys-notify", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Notification processing failed" }, { status: 500 });
  }
}
