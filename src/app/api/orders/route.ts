import { NextRequest, NextResponse } from "next/server";
import { verifyOrder } from "@/lib/priceVerification";
import { getApiUser } from "@/lib/apiAuth";
import { generateOrderId } from "@/lib/orderIds";

interface OrderItem {
  product_id: number;
  quantity: number;
  price: number;
}

interface OrderBody {
  items: OrderItem[];
  customer: {
    nombre: string;
    apellidos: string;
    email: string;
    telefono?: string;
    direccion: string;
    ciudad: string;
    cp: string;
    provincia?: string;
  };
  shipping: {
    method: string;
    tiendaRecogida?: string;
  };
  payment: {
    method: string;
  };
  coupon?: {
    code: string;
    discount: number;
  };
  pointsDiscount?: number;
  clientTotal?: number;
}

// POST /api/orders — Create a new order with server-side price verification
export async function POST(req: NextRequest) {
  try {
    const body: OrderBody = await req.json();
    const { items, customer, shipping, payment, coupon, pointsDiscount } = body;

    // 1. Basic validation
    if (!items?.length) {
      return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });
    }
    if (!customer?.email || !customer?.nombre || !customer?.direccion) {
      return NextResponse.json({ error: "Datos del cliente incompletos" }, { status: 400 });
    }
    if (!payment?.method) {
      return NextResponse.json({ error: "Método de pago requerido" }, { status: 400 });
    }

    // 2. Determine user role for pricing
    const apiUser = getApiUser(req);
    const userRole = apiUser?.role ?? "cliente";

    // 3. Server-side price + stock verification
    const verification = verifyOrder(items, shipping?.method ?? "estandar", userRole);

    if (!verification.priceResult.valid) {
      return NextResponse.json({
        error: "Discrepancia de precios detectada. Los precios han podido cambiar.",
        discrepancies: verification.priceResult.discrepancies,
      }, { status: 409 });
    }

    if (!verification.stockResult.available) {
      return NextResponse.json({
        error: "Algunos productos no tienen stock suficiente",
        stockIssues: verification.stockResult.issues,
      }, { status: 409 });
    }

    // 4. Calculate final total
    let subtotal = verification.priceResult.verifiedTotal;
    const shippingCost = verification.shipping;

    // Apply coupon discount
    if (coupon?.discount && coupon.discount > 0) {
      subtotal = Math.max(0, subtotal - coupon.discount);
    }

    // Apply points discount
    if (pointsDiscount && pointsDiscount > 0) {
      subtotal = Math.max(0, subtotal - pointsDiscount);
    }

    const total = Math.round((subtotal + shippingCost) * 100) / 100;

    // 5. Generate secure order ID
    const orderId = generateOrderId();

    // 6. Build order object
    const order = {
      id: orderId,
      customer,
      items: verification.priceResult.items,
      shipping: { method: shipping.method, cost: shippingCost, tiendaRecogida: shipping.tiendaRecogida },
      payment: { method: payment.method, status: (payment.method === "transferencia" || payment.method === "tienda") ? "pendiente" : "cobrado" },
      coupon: coupon ?? null,
      pointsDiscount: pointsDiscount ?? 0,
      subtotal: verification.priceResult.verifiedTotal,
      shippingCost,
      total,
      status: "pedido",
      createdAt: new Date().toISOString(),
    };

    const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";

    if (backendMode === "server") {
      // TODO: Persist order to database via getDb().createOrder(order)
      // TODO: Create invoice via invoiceService
      // TODO: Send confirmation email via getEmailService()
      // TODO: Notify admin
      // TODO: Deduct stock in database
      // TODO: Award loyalty points
    }

    // Return verified order — client persists to localStorage in local mode
    return NextResponse.json({
      ok: true,
      order,
      verifiedTotal: total,
    });
  } catch {
    return NextResponse.json(
      { error: "Error al procesar el pedido" },
      { status: 500 },
    );
  }
}

// GET /api/orders — List orders (admin or user-specific)
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";

  if (backendMode === "server") {
    // TODO: Fetch from database via getDb().getOrders(userId)
    // TODO: Verify auth token — only return user's orders (or all if admin)
  }

  return NextResponse.json({
    ok: true,
    orders: [],
    userId,
    message: "Modo local: pedidos en localStorage del navegador.",
  });
}
