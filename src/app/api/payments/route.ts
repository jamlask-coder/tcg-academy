import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/auth";
import { serverRateLimit } from "@/utils/sanitize";
import { paymentCreateSchema, zodMessage } from "@/lib/validations/api";
import { logger } from "@/lib/logger";

// POST /api/payments — Create payment intent
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = serverRateLimit(`payments:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
    }

    const rawBody = await req.json();
    const parsed = paymentCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: zodMessage(parsed.error) },
        { status: 400 },
      );
    }
    const { orderId, amount, method } = parsed.data;
    const currency = parsed.data.currency ?? "eur";

    const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";

    if (backendMode !== "server") {
      return NextResponse.json({
        ok: true,
        paymentId: `mock_${Date.now()}`,
        status: "succeeded",
        orderId,
        amount,
        method,
      });
    }

    // ── Stripe ────────────────────────────────────────────────────────────
    if (method === "tarjeta") {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return NextResponse.json({ error: "Pasarela de pago no configurada" }, { status: 501 });
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

      const intent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe uses cents
        currency,
        metadata: { orderId },
        automatic_payment_methods: { enabled: true },
      });

      return NextResponse.json({
        ok: true,
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
      });
    }

    // ── PayPal ────────────────────────────────────────────────────────────
    if (method === "paypal") {
      // PayPal payments are handled client-side via PayPal JS SDK.
      // The client creates the order via PayPal, then confirms on our API.
      return NextResponse.json({
        ok: true,
        method: "paypal",
        orderId,
        amount,
        message: "Proceder con PayPal JS SDK en el cliente.",
      });
    }

    // ── Bizum ─────────────────────────────────────────────────────────────
    if (method === "bizum") {
      // Bizum goes through Stripe payment intents with specific method
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return NextResponse.json({ error: "Pasarela de pago no configurada" }, { status: 501 });
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

      const intent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency,
        metadata: { orderId, method: "bizum" },
        automatic_payment_methods: { enabled: true },
      });

      return NextResponse.json({
        ok: true,
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
      });
    }

    // ── Transferencia / Recogida en tienda ────────────────────────────────
    if (method === "transferencia" || method === "tienda") {
      return NextResponse.json({
        ok: true,
        paymentId: `manual_${Date.now()}`,
        status: "pendiente",
        orderId,
        amount,
        method,
        message: method === "transferencia"
          ? "Realiza la transferencia y te confirmaremos el pedido."
          : "Paga al recoger en tienda.",
      });
    }

    return NextResponse.json({ error: "Método de pago no soportado" }, { status: 400 });
  } catch (err) {
    logger.error("payments POST failed", "payments", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Error al procesar el pago" }, { status: 500 });
  }
}
