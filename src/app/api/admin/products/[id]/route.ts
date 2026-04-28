/**
 * DELETE /api/admin/products/[id]
 *
 * Soft-delete de un producto en BD (Supabase) — marca `deleted_at` sin
 * borrar el registro. El catálogo público (`GET /api/products`) ya filtra
 * `deleted_at IS NULL`, así que el producto desaparece del frontend sin
 * romper FKs históricas (líneas de pedido, facturas, snapshots de stock).
 *
 * Usado por `/admin/stock` (botón "Eliminar"). En modo local-mode esta ruta
 * no se llama — el cliente soft-deletea via `tcgacademy_deleted_products`
 * en localStorage. En server-mode esa lista local sigue actualizándose como
 * cache optimista para que la UI no parpadee, pero la verdad vive en BD.
 *
 * Sólo accesible para `role = "admin"`.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminResult = await requireAdmin(req);
  if (adminResult instanceof NextResponse) return adminResult;

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json(
      { ok: false, error: "ID de producto inválido" },
      { status: 400 },
    );
  }

  try {
    await getDb().softDeleteProduct(numericId);
    logger.info("Admin soft-deleted product", "api/admin/products/[id]", {
      adminId: adminResult.id,
      productId: numericId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("Failed to soft-delete product", "api/admin/products/[id]", {
      adminId: adminResult.id,
      productId: numericId,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, error: "Error al eliminar producto" },
      { status: 500 },
    );
  }
}
