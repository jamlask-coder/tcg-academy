import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/apiAuth";
import { logger } from "@/lib/logger";

// POST /api/returns — Create a return request (customer)
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const { orderId, items } = body;

    if (!orderId || !items?.length) {
      return NextResponse.json(
        { error: "Datos de devolución incompletos. Se requiere orderId e items." },
        { status: 400 },
      );
    }

    // Validate each item has required fields
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.reason) {
        return NextResponse.json(
          { error: "Cada artículo necesita productId, quantity y reason." },
          { status: 400 },
        );
      }
    }

    logger.info(
      `Return request created for order ${orderId}`,
      "api/returns",
      { userId: authResult.id, itemCount: items.length },
    );

    // TODO: In server mode:
    //   1. Verify order belongs to user
    //   2. Verify order is within return window (14 days)
    //   3. Create return via returnService.createReturnRequest()
    //   4. Send confirmation email to customer
    //   5. Notify admin of new return request

    return NextResponse.json({
      ok: true,
      orderId,
      message: "Solicitud de devolución registrada. El admin la revisará.",
    });
  } catch {
    logger.error("Failed to create return request", "api/returns");
    return NextResponse.json(
      { error: "Error al procesar la devolución" },
      { status: 500 },
    );
  }
}

// GET /api/returns — List returns (admin: all, customer: own)
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const status = req.nextUrl.searchParams.get("status");
  const orderId = req.nextUrl.searchParams.get("orderId");

  logger.info("Returns list requested", "api/returns", {
    userId: authResult.id,
    role: authResult.role,
    filters: { status, orderId },
  });

  // TODO: In server mode:
  //   - Admin: getReturns({ status, orderId })
  //   - Customer: getReturns({ customerId: authResult.id, status, orderId })

  return NextResponse.json({
    ok: true,
    returns: [],
    message: "Modo local: devoluciones en localStorage.",
  });
}

// PATCH /api/returns — Update return status (admin only)
export async function PATCH(req: NextRequest) {
  try {
    const adminResult = await requireAdmin(req);
    if (adminResult instanceof NextResponse) return adminResult;

    const body = await req.json();
    const { rmaId, status, note, trackingNumber } = body;

    if (!rmaId || !status) {
      return NextResponse.json(
        { error: "Se requiere rmaId y status" },
        { status: 400 },
      );
    }

    const validStatuses = [
      "solicitada", "aprobada", "en_transito",
      "recibida", "reembolsada", "rechazada", "cerrada",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Estado no válido: ${status}` },
        { status: 400 },
      );
    }

    logger.info(
      `Return ${rmaId} status changed to ${status}`,
      "api/returns",
      { adminId: adminResult.id, note, trackingNumber },
    );

    // TODO: In server mode:
    //   1. updateReturnStatus(rmaId, status, note, { trackingNumber })
    //   2. If "aprobada": send email with return instructions
    //   3. If "reembolsada": restore stock, generate rectificative invoice, send refund email
    //   4. Log audit entry

    return NextResponse.json({
      ok: true,
      rmaId,
      status,
      updatedBy: adminResult.name,
    });
  } catch {
    logger.error("Failed to update return status", "api/returns");
    return NextResponse.json(
      { error: "Error al actualizar la devolución" },
      { status: 500 },
    );
  }
}
