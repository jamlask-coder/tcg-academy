/**
 * GET /api/admin/users/[handle]
 *
 * Resuelve un usuario por handle (username) o por id directo. Usado en
 * `/admin/usuarios/[id]` y `/admin/notificaciones` para no leer
 * `tcgacademy_registered` desde localStorage del navegador admin.
 *
 * `handle` se prueba en este orden:
 *   1. username exacto (preferido)
 *   2. id exacto (UUID o id legacy)
 *   3. email exacto
 *
 * Sólo accesible para `role = "admin"`.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { getDb, type UserRecord } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AdminUserDetail {
  id: string;
  email: string;
  username?: string;
  name: string;
  lastName: string;
  phone?: string;
  role: UserRecord["role"];
  registeredAt: string;
  nif?: string;
  nifType?: UserRecord["nifType"];
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  referralCode?: string;
  referredBy?: string;
}

function toDetail(u: UserRecord): AdminUserDetail {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    name: u.name,
    lastName: u.lastName,
    phone: u.phone,
    role: u.role,
    registeredAt: (u.createdAt ?? "").slice(0, 10),
    nif: u.nif,
    nifType: u.nifType,
    emailVerified: u.emailVerified,
    emailVerifiedAt: u.emailVerifiedAt,
    referralCode: u.referralCode,
    referredBy: u.referredBy,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string }> },
) {
  const adminResult = await requireAdmin(req);
  if (adminResult instanceof NextResponse) return adminResult;

  const { handle } = await params;
  const decoded = decodeURIComponent(handle).trim();
  if (!decoded) {
    return NextResponse.json({ ok: false, error: "Handle vacío" }, { status: 400 });
  }

  try {
    const db = getDb();
    // 1. username
    let user = await db.getUserByUsername(decoded);
    // 2. id
    if (!user) user = await db.getUser(decoded);
    // 3. email (sólo si parece email — evita falsos positivos)
    if (!user && decoded.includes("@")) {
      user = await db.getUserByEmail(decoded);
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    logger.info(`Admin user detail returned`, "api/admin/users/[handle]", {
      adminId: adminResult.id,
      targetId: user.id,
    });
    return NextResponse.json({ ok: true, user: toDetail(user) });
  } catch (err) {
    logger.error("Failed to fetch admin user detail", "api/admin/users/[handle]", {
      adminId: adminResult.id,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, error: "Error al cargar usuario" },
      { status: 500 },
    );
  }
}
