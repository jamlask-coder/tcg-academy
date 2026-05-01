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
import { slugifyName } from "@/lib/userHandle";

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
  /** Último heartbeat del cliente — el admin lo usa para el indicador online. */
  lastSeenAt?: string;
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
    lastSeenAt: u.lastSeenAt,
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
    // 4. slug derivado de name+lastName — cubre el caso de usuarios Google
    //    históricos sin `username` (bug pre-2026-05-01: el handle de la URL
    //    es slug(name lastName) pero la BD no lo tenía indexado). Listamos
    //    usuarios y matcheamos por slug para no romper la navegación admin
    //    sin necesidad de migración.
    if (!user) {
      const slug = decoded.toLowerCase();
      const all = await db.listAllUsers({ limit: 1000 });
      user =
        all.find((u) => {
          const full = [u.name, u.lastName].filter(Boolean).join(" ");
          return full && slugifyName(full) === slug;
        }) ?? null;
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
