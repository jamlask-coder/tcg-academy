import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/apiAuth";
import { logger } from "@/lib/logger";
import { orderPatchSchema, zodMessage } from "@/lib/validations/api";

// GET /api/orders/[id] — Get a single order
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";

  if (backendMode === "server") {
    // TODO: Fetch from database via getDb().getOrder(id)
    // TODO: Verify order belongs to user (or user is admin)
    logger.info(`Order detail requested: ${id}`, "api/orders", { userId: authResult.id });
  }

  return NextResponse.json({
    ok: true,
    orderId: id,
    message: "Modo local: pedido en localStorage del navegador.",
  });
}

// PATCH /api/orders/[id] — Update order status (admin only)
// Triggers: audit log, customer notification, stock restoration (if cancelled)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const adminResult = await requireAdmin(req);
    if (adminResult instanceof NextResponse) return adminResult;

    const rawBody = await req.json();
    const parsed = orderPatchSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: zodMessage(parsed.error) },
        { status: 400 },
      );
    }
    const { status, tracking, note } = parsed.data;

    logger.info(
      `Order ${id} status changed to ${status}`,
      "api/orders",
      { adminId: adminResult.id, adminName: adminResult.name, tracking, note },
    );

    const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";

    if (backendMode === "server") {
      // TODO: 1. getDb().updateOrderStatus(id, status, { tracking, note })
      // TODO: 2. logAudit({ entityType: 'order', entityId: id, action: 'status_change', ... })
      // TODO: 3. Fetch order to get customer email
      // TODO: 4. Send notification email via getEmailService()
      // TODO: 5. If cancelled/returned: restore stock
      // TODO: 6. If cancelled/returned: generate rectificative invoice
      // TODO: 7. Create in-app notification
    }

    return NextResponse.json({
      ok: true,
      orderId: id,
      status,
      updatedBy: adminResult.name,
      tracking: tracking ?? null,
      note: note ?? null,
    });
  } catch {
    logger.error("Failed to update order status", "api/orders");
    return NextResponse.json(
      { error: "Error al actualizar el pedido" },
      { status: 500 },
    );
  }
}
