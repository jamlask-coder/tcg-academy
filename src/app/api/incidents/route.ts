/**
 * /api/incidents — Incidencias de pedido (cliente reporta, admin gestiona).
 *
 * GET    ?userId=&orderId= → lista filtrada
 * POST   { orderId, type, detail, ... } → crea
 * PATCH  { id, ...patch } → admin actualiza
 */

import { type NextRequest, NextResponse } from "next/server";
import { getDb, type IncidentRecord } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/apiAuth";
import { logger } from "@/lib/logger";

function isServerMode(): boolean {
  return process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
}

export async function GET(req: NextRequest) {
  if (!isServerMode()) return NextResponse.json({ incidents: [] });
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get("userId") ?? undefined;
  const orderId = searchParams.get("orderId") ?? undefined;

  // Cliente solo ve las suyas; admin puede filtrar libremente.
  const userId =
    auth.role === "admin"
      ? userIdParam
      : userIdParam && userIdParam !== auth.id
        ? null
        : auth.id;
  if (userId === null) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const incidents = await getDb().getIncidents({ userId, orderId });
    return NextResponse.json({ incidents });
  } catch (err) {
    logger.error("api/incidents GET failed", "api.incidents", { err: String(err) });
    return NextResponse.json({ error: "fallback" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isServerMode()) return NextResponse.json({ ok: true, mode: "local" });
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as Partial<IncidentRecord>;
    if (!body.orderId || !body.title || !body.body || !body.category) {
      return NextResponse.json(
        { error: "orderId, category, title, body requeridos" },
        { status: 400 },
      );
    }
    const inc = await getDb().createIncident({
      orderId: body.orderId,
      userId: auth.id,
      status: body.status ?? "abierta",
      category: body.category,
      title: body.title,
      body: body.body,
      adminNote: body.adminNote,
    });
    return NextResponse.json({ incident: inc });
  } catch (err) {
    logger.error("api/incidents POST failed", "api.incidents", { err: String(err) });
    return NextResponse.json({ error: "fallback" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isServerMode()) return NextResponse.json({ ok: true, mode: "local" });
  const adminCheck = await requireAdmin(req);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id, ...patch } = (await req.json()) as { id?: string } & Partial<IncidentRecord>;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    await getDb().updateIncident(id, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("api/incidents PATCH failed", "api.incidents", { err: String(err) });
    return NextResponse.json({ error: "fallback" }, { status: 500 });
  }
}
