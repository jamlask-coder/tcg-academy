import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/apiAuth";
import { logger } from "@/lib/logger";
import { orderPatchSchema, zodMessage } from "@/lib/validations/api";
import { getDb, type OrderStatus } from "@/lib/db";

/**
 * Mapea los estados del workflow UI (AdminOrderStatus) al enum
 * `order_status` de la BD. UI tiene refinamientos (`pendiente_envio`,
 * `incidencia`, `pedido`/`pagado`) que la BD no distingue — colapsamos al
 * estado equivalente más cercano. Cualquier estado UI extra (incidencias,
 * devoluciones parciales) se modela en sus tablas dedicadas; aquí sólo se
 * persiste la "fase" del pedido.
 */
function mapUiStatusToDbStatus(
  ui: "pedido" | "pagado" | "pendiente_envio" | "enviado" | "cancelado" | "incidencia" | "devolucion",
): OrderStatus {
  switch (ui) {
    case "pedido": return "pendiente";
    case "pagado": return "confirmado";
    case "pendiente_envio": return "procesando";
    case "enviado": return "enviado";
    case "cancelado": return "cancelado";
    case "incidencia": return "procesando";
    case "devolucion": return "devuelto";
  }
}

// GET /api/orders/[id] — Get a single order (ownership-checked)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";

  if (backendMode === "server") {
    // IDOR guard: fetch order and verify ownership. Admin bypasses.
    const order = await getDb().getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }
    const isOwner = order.userId && order.userId === authResult.id;
    const isAdmin = authResult.role === "admin";
    if (!isOwner && !isAdmin) {
      // 404 (no 403) para no filtrar la existencia del pedido a usuarios ajenos.
      logger.warn(
        `IDOR attempt on order ${id} by user ${authResult.id}`,
        "api/orders",
        { attemptedBy: authResult.id, role: authResult.role },
      );
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }
    logger.info(`Order detail requested: ${id}`, "api/orders", { userId: authResult.id });
    return NextResponse.json({ ok: true, order });
  }

  // Modo local: los pedidos viven en localStorage del navegador del propio
  // usuario; no cruzan a otros clientes vía esta ruta. Nada que servir aquí.
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
    const { status, tracking, note, adminNotes } = parsed.data;

    // Exigimos al menos un campo a cambiar. Sin esto, una llamada vacía
    // pasaría validación y registraría un audit-log sin sentido.
    if (
      status === undefined &&
      tracking === undefined &&
      note === undefined &&
      adminNotes === undefined
    ) {
      return NextResponse.json(
        { error: "Sin cambios — falta status, tracking, note o adminNotes" },
        { status: 400 },
      );
    }

    logger.info(
      `Order ${id} update`,
      "api/orders",
      { adminId: adminResult.id, adminName: adminResult.name, status, tracking, note },
    );

    const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";

    if (backendMode === "server") {
      const db = getDb();
      // Persistencia real — antes este bloque eran TODOs y la BD nunca se
      // actualizaba aunque el admin tocase el estado en /admin/pedidos/[id].
      const updateData: Record<string, unknown> = {};
      if (tracking !== undefined) updateData.trackingNumber = tracking;
      if (adminNotes !== undefined) updateData.notes = adminNotes;
      if (status !== undefined) {
        await db.updateOrderStatus(id, mapUiStatusToDbStatus(status), updateData);
      } else if (Object.keys(updateData).length > 0) {
        // Solo notas/tracking sin cambio de estado: leemos el estado actual
        // para que updateOrderStatus pueda persistir los demás campos.
        const current = await db.getOrder(id);
        if (current) {
          await db.updateOrderStatus(id, current.status, updateData);
        }
      }
      // Audit log — separar entityId del actor para queries posteriores.
      await db.logAudit({
        entityType: "order",
        entityId: id,
        action: status ? `status_change:${status}` : "update",
        performedBy: adminResult.id,
      });
    }

    return NextResponse.json({
      ok: true,
      orderId: id,
      status: status ?? null,
      updatedBy: adminResult.name,
      tracking: tracking ?? null,
      note: note ?? null,
      adminNotes: adminNotes ?? null,
    });
  } catch {
    logger.error("Failed to update order status", "api/orders");
    return NextResponse.json(
      { error: "Error al actualizar el pedido" },
      { status: 500 },
    );
  }
}
