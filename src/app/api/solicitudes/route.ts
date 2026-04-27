/**
 * /api/solicitudes — Solicitudes B2B / franquicia / vending.
 *
 * GET    ?type= → admin only
 * POST   { type, companyName, contactName, contactEmail, ... } → público
 * PATCH  { id, status, adminNote } → admin
 */

import { type NextRequest, NextResponse } from "next/server";
import { getDb, type SolicitudRecord } from "@/lib/db";
import { requireAdmin } from "@/lib/apiAuth";
import { logger } from "@/lib/logger";

function isServerMode(): boolean {
  return process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
}

export async function GET(req: NextRequest) {
  if (!isServerMode()) return NextResponse.json({ solicitudes: [] });
  const adminCheck = await requireAdmin(req);
  if (adminCheck instanceof NextResponse) return adminCheck;
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") as SolicitudRecord["type"] | null) ?? undefined;
  try {
    const solicitudes = await getDb().getSolicitudes(type);
    return NextResponse.json({ solicitudes });
  } catch (err) {
    logger.error("api/solicitudes GET failed", "api.solicitudes", { err: String(err) });
    return NextResponse.json({ error: "fallback" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isServerMode()) return NextResponse.json({ ok: true, mode: "local" });
  try {
    const body = (await req.json()) as Partial<SolicitudRecord>;
    if (!body.type || !body.companyName || !body.contactName || !body.contactEmail) {
      return NextResponse.json(
        { error: "type, companyName, contactName, contactEmail requeridos" },
        { status: 400 },
      );
    }
    if (!["b2b", "franquicia", "vending"].includes(body.type)) {
      return NextResponse.json({ error: "type inválido" }, { status: 400 });
    }
    const solicitud = await getDb().createSolicitud({
      type: body.type,
      companyName: body.companyName,
      cif: body.cif,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      volume: body.volume,
      games: body.games ?? [],
      message: body.message,
      status: "nueva",
    });
    return NextResponse.json({ solicitud });
  } catch (err) {
    logger.error("api/solicitudes POST failed", "api.solicitudes", { err: String(err) });
    return NextResponse.json({ error: "fallback" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isServerMode()) return NextResponse.json({ ok: true, mode: "local" });
  const adminCheck = await requireAdmin(req);
  if (adminCheck instanceof NextResponse) return adminCheck;
  try {
    const { id, ...patch } = (await req.json()) as { id?: string } & Partial<SolicitudRecord>;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    await getDb().updateSolicitud(id, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("api/solicitudes PATCH failed", "api.solicitudes", { err: String(err) });
    return NextResponse.json({ error: "fallback" }, { status: 500 });
  }
}
