import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getDb } from "@/lib/db";
import { sendOrderNotification } from "@/lib/email";
import { logger } from "@/lib/logger";

// Stripe sends raw body — disable Next.js body parsing for signature verification
export const dynamic = "force-dynamic";

// ── Idempotencia de webhooks (audit P0 C-09) ──────────────────────────────
// Stripe reintenta hasta 3 días si no recibimos 200. Sin dedupe el mismo
// `payment_intent.succeeded` doblaría la confirmación, mailing y crédito de
// puntos. Mantenemos un Set en memoria con TTL — suficiente para los rangos
// de retry de Stripe (segundos a minutos), evita migración DB.
//
// LIMITACIÓN: si el proceso reinicia, perdemos el Set. Para producción se
// recomienda persistir en una tabla `processed_webhooks(event_id PK, seen_at)`
// con `ON CONFLICT DO NOTHING`. La función `markWebhookSeen()` está aislada
// para reemplazo trivial cuando se conecte la tabla.
const PROCESSED_WEBHOOKS = new Map<string, number>();
const WEBHOOK_TTL_MS = 24 * 60 * 60 * 1000; // 24h
function markWebhookSeen(eventId: string): boolean {
  // Limpieza: borra entries > TTL.
  const now = Date.now();
  for (const [id, ts] of PROCESSED_WEBHOOKS) {
    if (now - ts > WEBHOOK_TTL_MS) PROCESSED_WEBHOOKS.delete(id);
  }
  if (PROCESSED_WEBHOOKS.has(eventId)) return false;
  PROCESSED_WEBHOOKS.set(eventId, now);
  return true;
}

// POST /api/payments/webhook — Stripe webhook handler
export async function POST(req: NextRequest) {
  try {
    const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";

    if (backendMode !== "server") {
      return NextResponse.json({ received: true, mode: "local" });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeKey || !webhookSecret) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });
    }

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook signature
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Idempotencia: Stripe reintenta hasta 3 días si no recibimos 200. Sin dedupe
    // el mismo `payment_intent.succeeded` doblaría confirmación, mailing y créditos.
    if (!markWebhookSeen(event.id)) {
      return NextResponse.json({ received: true, deduped: true, eventId: event.id });
    }

    const db = getDb();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tcgacademy.es";

    switch (event.type) {
      // ── Payment succeeded ─────────────────────────────────────────────
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const orderId = intent.metadata?.orderId;
        if (!orderId) break;

        // Update order status + authoritative payment date from Stripe
        // (webhook is the ground truth for when cobro actually happened).
        const paymentDate = new Date(
          (intent.created ?? Math.floor(Date.now() / 1000)) * 1000,
        ).toISOString();
        await db.updateOrderStatus(orderId, "confirmado", {
          paymentStatus: "cobrado",
          paymentIntent: intent.id,
          paymentDate,
        });

        // Fetch order to get customer email
        const order = await db.getOrder(orderId);
        if (order) {
          // Send confirmation email to customer
          await sendOrderNotification(orderId, "confirmado", order.customerEmail, {
            total: order.total.toFixed(2),
            customerName: order.customerName,
            appUrl,
          });

          // Notify admin
          const adminEmail = await db.getSetting("notification_email") ?? "tcgacademycalpe@gmail.com";
          await sendOrderNotification(orderId, "confirmado", adminEmail, {
            total: order.total.toFixed(2),
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            appUrl,
          });
        }

        await db.logAudit({
          entityType: "order",
          entityId: orderId,
          action: "payment_succeeded",
          field: "payment_status",
          oldValue: "pendiente",
          newValue: "cobrado",
        });

        break;
      }

      // ── Payment failed ────────────────────────────────────────────────
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const orderId = intent.metadata?.orderId;
        if (!orderId) break;

        await db.updateOrderStatus(orderId, "pendiente", {
          paymentStatus: "fallido",
        });

        const order = await db.getOrder(orderId);
        if (order) {
          const emailService = (await import("@/lib/email")).getEmailService();
          await emailService.sendEmail(
            order.customerEmail,
            `Problema con el pago del pedido ${orderId} — TCG Academy`,
            `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px">
              <h2 style="color:#dc2626">Problema con el pago</h2>
              <p>No hemos podido procesar el pago de tu pedido <strong>${orderId}</strong>.</p>
              <p>Por favor, inténtalo de nuevo o elige otro método de pago.</p>
              <a href="${appUrl}/cuenta/pedidos" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
                Ver mis pedidos
              </a>
            </div>
            `,
          );
        }

        await db.logAudit({
          entityType: "order",
          entityId: orderId,
          action: "payment_failed",
          field: "payment_status",
          newValue: "fallido",
        });

        break;
      }

      // ── Refund processed ──────────────────────────────────────────────
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const orderId = charge.metadata?.orderId;
        if (!orderId) break;

        await db.updateOrderStatus(orderId, "devuelto", {
          paymentStatus: "reembolsado",
        });

        const order = await db.getOrder(orderId);
        if (order) {
          const emailService = (await import("@/lib/email")).getEmailService();
          await emailService.sendEmail(
            order.customerEmail,
            `Reembolso procesado — Pedido ${orderId}`,
            `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px">
              <h2 style="color:#16a34a">Reembolso procesado</h2>
              <p>Hemos procesado el reembolso de tu pedido <strong>${orderId}</strong>.</p>
              <p>El importe aparecerá en tu cuenta en los próximos 5-10 días hábiles.</p>
            </div>
            `,
          );
        }

        await db.logAudit({
          entityType: "order",
          entityId: orderId,
          action: "refund_processed",
          field: "payment_status",
          newValue: "reembolsado",
        });

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("Webhook processing failed", "payments-webhook", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
