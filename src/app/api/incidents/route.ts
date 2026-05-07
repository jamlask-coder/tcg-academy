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
import { persistentRateLimit } from "@/lib/rateLimitStore";

const MAX_TITLE_LEN = 200;
const MAX_BODY_LEN = 5000;

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

  // Rate limit: 5 incidencias/h por usuario (gestión humana detrás).
  if (auth.role !== "admin") {
    const rl = await persistentRateLimit(`incidents:user:${auth.id}`, 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Has alcanzado el máximo de incidencias por hora." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
      );
    }
  }

  try {
    const body = (await req.json()) as Partial<IncidentRecord>;
    if (!body.orderId || !body.title || !body.body || !body.category) {
      return NextResponse.json(
        { error: "orderId, category, title, body requeridos" },
        { status: 400 },
      );
    }
    if (body.title.length > MAX_TITLE_LEN || body.body.length > MAX_BODY_LEN) {
      return NextResponse.json({ error: "Campos demasiado largos" }, { status: 400 });
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
