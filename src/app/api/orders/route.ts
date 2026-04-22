import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { verifyOrder } from "@/lib/priceVerification";
import { getApiUser, requireAuth } from "@/lib/apiAuth";
import { generateOrderId } from "@/lib/orderIds";
import { serverRateLimit } from "@/utils/sanitize";
import { getDb, type OrderRecord } from "@/lib/db";
import { sendOrderNotification, getEmailService } from "@/lib/email";
import { getClientIp } from "@/lib/auth";
import { validateSpanishNIF } from "@/lib/validations/nif";
import { orderCreateSchema, zodMessage } from "@/lib/validations/api";

interface OrderItem {
  product_id: number;
  quantity: number;
  price: number;
  name?: string;
  image?: string;
}

interface OrderBody {
  items: OrderItem[];
  customer: {
    nombre: string;
    apellidos: string;
    /** NIF / NIE / CIF — OBLIGATORIO para facturación (Art. 6.1.d RD 1619/2012) */
    nif: string;
    email: string;
    telefono?: string;
    direccion: string;
    numero?: string;
    piso?: string;
    ciudad: string;
    cp: string;
    provincia?: string;
    pais?: string;
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

const MAX_BODY_SIZE = 64 * 1024;

// POST /api/orders — Create a new order with server-side price verification
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = serverRateLimit(`orders:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Espera un momento." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
      );
    }

    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "La solicitud es demasiado grande" }, { status: 413 });
    }

    const rawBody = await req.json();
    const parsed = orderCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: zodMessage(parsed.error) },
        { status: 400 },
      );
    }
    const body: OrderBody = rawBody;
    const { items, customer, shipping, payment, coupon, pointsDiscount } = body;

    // ── Validation ────────────────────────────────────────────────────────
    if (!items?.length) return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });
    if (items.length > 100) return NextResponse.json({ error: "Demasiados productos" }, { status: 400 });
    if (!customer?.email || !customer?.nombre || !customer?.direccion) {
      return NextResponse.json({ error: "Datos del cliente incompletos" }, { status: 400 });
    }
    // NIF obligatorio (legal — Art. 6.1.d RD 1619/2012)
    const nifCheck = validateSpanishNIF(customer?.nif ?? "");
    if (!nifCheck.valid) {
      return NextResponse.json(
        {
          error:
            nifCheck.error ??
            "NIF / NIE / CIF del cliente obligatorio para emitir la factura",
          code: "NIF_REQUIRED",
          legalBasis: "Art. 6.1.d RD 1619/2012",
        },
        { status: 400 },
      );
    }
    if (!payment?.method) return NextResponse.json({ error: "Método de pago requerido" }, { status: 400 });

    for (const item of items) {
      if (!Number.isFinite(item.price) || item.price <= 0 || item.price > 99999) {
        return NextResponse.json({ error: "Precio de producto inválido" }, { status: 400 });
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        return NextResponse.json({ error: "Cantidad de producto inválida" }, { status: 400 });
      }
      if (!Number.isFinite(item.product_id) || item.product_id <= 0) {
        return NextResponse.json({ error: "ID de producto inválido" }, { status: 400 });
      }
    }

    if (coupon?.discount !== undefined && (!Number.isFinite(coupon.discount) || coupon.discount < 0)) {
      return NextResponse.json({ error: "Descuento de cupón inválido" }, { status: 400 });
    }
    if (pointsDiscount !== undefined && (!Number.isFinite(pointsDiscount) || pointsDiscount < 0)) {
      return NextResponse.json({ error: "Descuento de puntos inválido" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(customer.email)) {
      return NextResponse.json({ error: "Email del cliente no válido" }, { status: 400 });
    }

    const MAX_STR = 500;
    if (customer.nombre.length > MAX_STR || customer.direccion.length > MAX_STR || customer.email.length > 254) {
      return NextResponse.json({ error: "Datos demasiado largos" }, { status: 400 });
    }

    // ── Price verification ────────────────────────────────────────────────
    const apiUser = await getApiUser(req);
    const userRole = apiUser?.role ?? "cliente";

    const verification = verifyOrder(
      items,
      shipping?.method ?? "estandar",
      userRole,
      apiUser?.id ?? "",
    );

    if (!verification.priceResult.valid) {
      return NextResponse.json({
        error: "Discrepancia de precios detectada.",
        discrepancies: verification.priceResult.discrepancies,
      }, { status: 409 });
    }

    if (!verification.stockResult.available) {
      return NextResponse.json({
        error: "Algunos productos no tienen stock suficiente",
        stockIssues: verification.stockResult.issues,
      }, { status: 409 });
    }

    if (!verification.limitResult.valid) {
      return NextResponse.json({
        error: "Alguno de los productos supera el máximo permitido por usuario",
        limitIssues: verification.limitResult.issues,
      }, { status: 409 });
    }

    // ── Calculate final total ─────────────────────────────────────────────
    let subtotal = verification.priceResult.verifiedTotal;
    const shippingCost = verification.shipping;

    if (coupon?.discount && coupon.discount > 0) {
      subtotal = Math.max(0, subtotal - coupon.discount);
    }
    if (pointsDiscount && pointsDiscount > 0) {
      subtotal = Math.max(0, subtotal - pointsDiscount);
    }

    const total = Math.round((subtotal + shippingCost) * 100) / 100;

    // Blindaje anti-colisión: con 6 chars sobre alfabeto 32 (≈1G combos) la
    // probabilidad es <10⁻⁸ por pedido, pero si alguna vez repite, reintentamos.
    // Sin este check, un POST simultáneo podría sobrescribir un pedido existente.
    const db = getDb();
    let orderId = generateOrderId();
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await db.getOrder(orderId);
      if (!existing) break;
      orderId = generateOrderId();
    }

    // ── Build order record ────────────────────────────────────────────────
    const order: OrderRecord = {
      id: orderId,
      userId: apiUser?.id,
      customerEmail: customer.email,
      customerName: `${customer.nombre} ${customer.apellidos ?? ""}`.trim(),
      customerTaxId: nifCheck.normalized,
      customerPhone: customer.telefono,
      items: verification.priceResult.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      subtotal: verification.priceResult.verifiedTotal,
      shippingCost,
      couponCode: coupon?.code,
      couponDiscount: coupon?.discount ?? 0,
      pointsDiscount: pointsDiscount ?? 0,
      total,
      status: "pendiente",
      shippingMethod: shipping.method,
      paymentMethod: payment.method,
      paymentStatus: (payment.method === "transferencia" || payment.method === "tienda") ? "pendiente" : "pendiente",
      shippingAddress: {
        calle: customer.direccion,
        numero: customer.numero ?? "",
        piso: customer.piso,
        cp: customer.cp,
        ciudad: customer.ciudad,
        provincia: customer.provincia,
        pais: customer.pais ?? "ES",
      },
      tiendaRecogida: shipping.tiendaRecogida,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // ── Persist ───────────────────────────────────────────────────────────
    const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";

    if (backendMode === "server") {
      await db.createOrder(order);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tcgacademy.es";

      // Send confirmation email to customer (pickup-aware)
      const isStorePickup = shipping?.method === "tienda";
      await sendOrderNotification(
        orderId,
        "confirmado",
        customer.email,
        {
          total: total.toFixed(2),
          customerName: order.customerName,
          appUrl,
          tiendaNombre: shipping?.tiendaRecogida ?? "",
        },
        { isStorePickup },
      );

      // Notify admin
      const adminEmail = await db.getSetting("notification_email") ?? "admin@tcgacademy.es";
      const emailService = getEmailService();
      await emailService.sendTemplatedEmail("admin_nuevo_pedido", adminEmail, {
        orderId,
        customerName: order.customerName,
        customerEmail: customer.email,
        total: total.toFixed(2),
        appUrl,
      });

      // Audit log
      await db.logAudit({
        entityType: "order",
        entityId: orderId,
        action: "create",
        performedBy: apiUser?.id,
        ipAddress: ip,
      });
    }

    return NextResponse.json({ ok: true, order, verifiedTotal: total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al procesar el pedido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/orders — List orders
export async function GET(req: NextRequest) {
  const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";

  if (backendMode !== "server") {
    return NextResponse.json({
      ok: true,
      orders: [],
      message: "Modo local: pedidos en localStorage.",
    });
  }

  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const db = getDb();
  const isAdmin = authResult.role === "admin";
  const orders = await db.getOrders(isAdmin ? undefined : authResult.id);

  return NextResponse.json({ ok: true, orders });
}
