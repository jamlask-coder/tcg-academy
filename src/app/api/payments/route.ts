import { NextRequest, NextResponse } from "next/server";

// POST /api/payments — Create payment intent
// In local mode: returns mock success
// In server mode: creates Stripe PaymentIntent or Redsys session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, amount, method, currency = "eur" } = body;

    if (!orderId || !amount || !method) {
      return NextResponse.json(
        { error: "Datos de pago incompletos" },
        { status: 400 },
      );
    }

    const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";

    if (backendMode === "server") {
      // TODO: Implement real payment processing
      // For Stripe:
      //   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      //   const intent = await stripe.paymentIntents.create({
      //     amount: Math.round(amount * 100), // cents
      //     currency,
      //     metadata: { orderId },
      //     payment_method_types: getMethodTypes(method),
      //   });
      //   return NextResponse.json({ ok: true, clientSecret: intent.client_secret });
      //
      // For Redsys (Spanish banks):
      //   const redsysParams = buildRedsysParams(orderId, amount, method);
      //   return NextResponse.json({ ok: true, redsysForm: redsysParams });
      //
      // For Bizum:
      //   return through Redsys with BIZUM payment method
      //
      // For PayPal:
      //   const paypalOrder = await createPayPalOrder(orderId, amount);
      //   return NextResponse.json({ ok: true, paypalOrderId: paypalOrder.id });

      return NextResponse.json({
        error: "Pasarela de pago no configurada",
      }, { status: 501 });
    }

    // Local mode: simulate successful payment
    return NextResponse.json({
      ok: true,
      paymentId: `mock_${Date.now()}`,
      status: "succeeded",
      orderId,
      amount,
      method,
    });
  } catch {
    return NextResponse.json(
      { error: "Error al procesar el pago" },
      { status: 500 },
    );
  }
}
