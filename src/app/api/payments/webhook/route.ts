import { NextRequest, NextResponse } from "next/server";

// POST /api/payments/webhook — Payment provider webhook handler
// Stripe, Redsys, or PayPal sends confirmation here
export async function POST(req: NextRequest) {
  try {
    const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";

    if (backendMode !== "server") {
      return NextResponse.json({ received: true, mode: "local" });
    }

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    // TODO: Stripe webhook verification
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const event = stripe.webhooks.constructEvent(
    //   body,
    //   signature!,
    //   process.env.STRIPE_WEBHOOK_SECRET!,
    // );
    //
    // switch (event.type) {
    //   case "payment_intent.succeeded": {
    //     const intent = event.data.object;
    //     const orderId = intent.metadata.orderId;
    //     // 1. Update order payment status to "cobrado"
    //     // 2. Generate invoice
    //     // 3. Send confirmation email to customer
    //     // 4. Notify admin
    //     break;
    //   }
    //   case "payment_intent.payment_failed": {
    //     const intent = event.data.object;
    //     const orderId = intent.metadata.orderId;
    //     // 1. Update order payment status to "fallido"
    //     // 2. Send failure notification to customer
    //     break;
    //   }
    //   case "charge.refunded": {
    //     const charge = event.data.object;
    //     // 1. Update order status to "devolucion"
    //     // 2. Generate rectificative invoice
    //     // 3. Notify customer of refund
    //     break;
    //   }
    // }

    return NextResponse.json({
      received: true,
      signature: !!signature,
      message: "Webhook handler preparado. Configurar STRIPE_WEBHOOK_SECRET.",
    });
  } catch {
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
