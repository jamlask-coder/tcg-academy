/**
 * GET /api/admin/users/[handle]/activity
 *
 * Devuelve agregados de actividad REAL del usuario para el panel
 * `/admin/usuarios/[id]`. Sustituye los datos simulados (seed determinista)
 * que se mostraban antes — engañosos para tomar decisiones de negocio.
 *
 * Estrategia de resolución del usuario: idéntica a `/api/admin/users/[handle]`
 * (username → id → email → slug name+lastName → prefijo email). Centralizamos
 * en `resolveUserByHandle` para no divergir con el endpoint detalle.
 *
 * Respuesta:
 *   {
 *     ok: true,
 *     monthly: [{ month: "Ene", visitas: 12 }, ...]   // últimos 12 meses
 *     totalVisits: 142,
 *     pageViews: 142,
 *     avgVisitsPerMonth: 12,
 *     uniqueSessions: 28,
 *     firstVisit: "2025-11-04T10:23:00Z" | null,
 *     lastVisit:  "2026-04-30T18:55:12Z" | null,
 *     topPaths: [{ path: "/magic", visits: 23 }, ...] // top 10
 *   }
 *
 * Solo accesible para `role = "admin"`.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { getDb, type UserRecord } from "@/lib/db";
import { logger } from "@/lib/logger";
import { slugifyName } from "@/lib/userHandle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

async function resolveUser(handle: string): Promise<UserRecord | null> {
  const db = getDb();
  const decoded = decodeURIComponent(handle).trim();
  if (!decoded) return null;

  let user = await db.getUserByUsername(decoded);
  if (!user) user = await db.getUser(decoded);
  if (!user && decoded.includes("@")) user = await db.getUserByEmail(decoded);
  if (!user) {
    const needle = decoded.toLowerCase();
    const all = await db.listAllUsers({ limit: 5000 });
    user =
      all.find((u) => {
        const full = [u.name, u.lastName].filter(Boolean).join(" ");
        if (full && slugifyName(full) === needle) return true;
        const emailPrefix = u.email.split("@")[0]?.toLowerCase();
        if (emailPrefix && emailPrefix === needle) return true;
        return false;
      }) ?? null;
  }
  return user;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string }> },
) {
  const adminResult = await requireAdmin(req);
  if (adminResult instanceof NextResponse) return adminResult;

  const { handle } = await params;

  try {
    const user = await resolveUser(handle);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    const db = getDb();
    const visits = await db.getVisitsByUser(user.id, 12);

    // ── Agregar por mes (últimos 12 meses) ──────────────────────────────────
    const now = new Date();
    const monthly: { month: string; visitas: number; key: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthly.push({
        month: MONTH_LABELS[d.getMonth()] ?? key,
        visitas: 0,
        key,
      });
    }
    const monthIndex = new Map(monthly.map((m, idx) => [m.key, idx]));

    let firstVisit: string | null = null;
    let lastVisit: string | null = null;
    const sessionSet = new Set<string>();
    const pathCounts = new Map<string, number>();

    for (const v of visits) {
      const key = v.ts.slice(0, 7);
      const idx = monthIndex.get(key);
      if (typeof idx === "number") {
        const slot = monthly[idx];
        if (slot) slot.visitas += 1;
      }
      // visits ya viene ordenado DESC por ts, así que el primero es el último
      // y el último del array es el primero cronológico.
      if (!lastVisit) lastVisit = v.ts;
      firstVisit = v.ts;
      if (v.sessionHash) sessionSet.add(v.sessionHash);
      pathCounts.set(v.path, (pathCounts.get(v.path) ?? 0) + 1);
    }

    const totalVisits = visits.length;
    const avgVisitsPerMonth = Math.round(totalVisits / 12);
    const topPaths = Array.from(pathCounts.entries())
      .map(([path, visits]) => ({ path, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10);

    logger.info("Admin user activity returned", "api/admin/users/[handle]/activity", {
      adminId: adminResult.id,
      targetId: user.id,
      totalVisits,
    });

    return NextResponse.json({
      ok: true,
      monthly: monthly.map(({ month, visitas }) => ({ month, visitas })),
      totalVisits,
      // pageViews == totalVisits con esta versión del tracker (1 fila por path
      // visitado). Si en el futuro añadimos eventos extra (clicks, scroll),
      // este número subirá y diferirá de totalVisits.
      pageViews: totalVisits,
      avgVisitsPerMonth,
      uniqueSessions: sessionSet.size,
      firstVisit,
      lastVisit,
      topPaths,
    });
  } catch (err) {
    logger.error("Failed to fetch user activity", "api/admin/users/[handle]/activity", {
      adminId: adminResult.id,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, error: "Error al cargar actividad" },
      { status: 500 },
    );
  }
}
