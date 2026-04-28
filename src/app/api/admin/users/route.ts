/**
 * GET /api/admin/users
 *
 * Devuelve el listado real de usuarios desde la BD para el panel
 * `/admin/usuarios`. Antes el panel leía de `tcgacademy_registered`
 * (localStorage del propio admin), por lo que en server-mode los usuarios
 * importados desde WP / registrados desde otro navegador no aparecían.
 *
 * Sólo accesible para `role = "admin"` — `requireAdmin` lo bloquea con 401/403.
 *
 * Query params:
 *   - role:   filtro por rol (cliente|mayorista|tienda|admin)
 *   - limit:  máx 5000 (cap defensivo en el adapter)
 *
 * Respuesta:
 *   { ok: true, users: AdminUser[] }
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { getDb, type UserRecord } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { AdminUser } from "@/data/mockData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** UserRecord (BD) → AdminUser (UI). Nunca filtramos `passwordHash`. */
function toAdminUser(u: UserRecord): AdminUser {
  // Para B2B (mayorista/tienda) el NIF es realmente CIF de empresa: lo
  // proyectamos también a `cif` para que la página detalle muestre los datos
  // fiscales B2B sin lookups adicionales. `company` queda undefined hasta que
  // exista la columna `company` en BD (TODO Fase 4).
  const isB2B = u.role === "mayorista" || u.role === "tienda";
  return {
    id: u.id,
    username: u.username ?? u.email.split("@")[0] ?? u.id,
    name: u.name,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    registeredAt: (u.createdAt ?? "").slice(0, 10),
    totalOrders: 0, // se cruza en el front con readAdminOrdersMergedAsync
    totalSpent: 0,
    points: 0, // se cruza en el front con loadPoints()
    active: true,
    phone: u.phone,
    birthDate: u.birthDate,
    cif: isB2B ? u.nif : undefined,
  };
}

export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin(req);
  if (adminResult instanceof NextResponse) return adminResult;

  const url = new URL(req.url);
  const roleParam = url.searchParams.get("role");
  const limitParam = url.searchParams.get("limit");

  const validRoles: UserRecord["role"][] = ["cliente", "mayorista", "tienda", "admin"];
  const role =
    roleParam && validRoles.includes(roleParam as UserRecord["role"])
      ? (roleParam as UserRecord["role"])
      : undefined;
  const limit = limitParam ? Math.min(Math.max(Number(limitParam) || 0, 1), 5000) : undefined;

  try {
    const records = await getDb().listAllUsers({ role, limit });
    const users = records.map(toAdminUser);
    logger.info(`Admin users list returned ${users.length} rows`, "api/admin/users", {
      adminId: adminResult.id,
      role,
      limit,
    });
    return NextResponse.json({ ok: true, users });
  } catch (err) {
    logger.error("Failed to list admin users", "api/admin/users", {
      adminId: adminResult.id,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, error: "Error al cargar usuarios" },
      { status: 500 },
    );
  }
}
