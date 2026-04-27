/**
 * /api/complaints — Hoja de reclamaciones (público crea, admin gestiona).
 *
 * GET    → lista (admin only)
 * POST   { claimantName, claimantEmail, facts, claim, ... } → público
 * PATCH  { id, status, resolution, ... } → admin
 */

import { type NextRequest, NextResponse } from "next/server";
import { getDb, type ComplaintRecord } from "@/lib/db";
import { requireAdmin, getApiUser } from "@/lib/apiAuth";
import { logger } from "@/lib/logger";

function isServerMode(): boolean {
  return process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
}

export async function GET(req: NextRequest) {
  if (!isServerMode()) return NextResponse.json({ complaints: [] });
  const adminCheck = await requireAdmin(req);
  if (adminCheck instanceof NextResponse) return adminCheck;
  try {
    const complaints = await getDb().getComplaints();
    return NextResponse.json({ complaints });
  } catch (err) {
    logger.error("api/complaints GET failed", "api.complaints", { err: String(err) });
    return NextResponse.json({ error: "fallback" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isServerMode()) return NextResponse.json({ ok: true, mode: "local" });
  // Público: cualquiera puede registrar una reclamación. Si hay sesión la
  // asociamos al userId; si no, queda anónima (legal: la hoja de
  // reclamaciones no exige cuenta).
  const user = await getApiUser(req);

  try {
    const body = (await req.json()) as Partial<ComplaintRecord>;
    if (!body.claimantName || !body.claimantEmail || !body.facts || !body.claim) {
      return NextResponse.json(
        { error: "claimantName, claimantEmail, facts, claim requeridos" },
        { status: 400 },
      );
    }
    const complaint = await getDb().createComplaint({
      userId: user?.id,
      orderId: body.orderId,
      claimantName: body.claimantName,
      claimantEmail: body.claimantEmail,
      claimantTaxId: body.claimantTaxId,
      claimantAddress: body.claimantAddress,
      status: "recibida",
      facts: body.facts,
      claim: body.claim,
    });
    return NextResponse.json({ complaint });
  } catch (err) {
    logger.error("api/complaints POST failed", "api.complaints", { err: String(err) });
    return NextResponse.json({ error: "fallback" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isServerMode()) return NextResponse.json({ ok: true, mode: "local" });
  const adminCheck = await requireAdmin(req);
  if (adminCheck instanceof NextResponse) return adminCheck;
  try {
    const { id, ...patch } = (await req.json()) as { id?: string } & Partial<ComplaintRecord>;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    await getDb().updateComplaint(id, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("api/complaints PATCH failed", "api.complaints", { err: String(err) });
    return NextResponse.json({ error: "fallback" }, { status: 500 });
  }
}
