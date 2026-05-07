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
import { persistentRateLimit } from "@/lib/rateLimitStore";
import { getClientIp } from "@/lib/auth";
import { isValidEmail } from "@/utils/sanitize";

function isServerMode(): boolean {
  return process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
}

const MAX_BODY_SIZE = 32 * 1024;
const MAX_TEXT_FIELD = 5000;

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

  // Rate limit: 3/h por IP (anónimo). Si hay user, además 5/24h por usuario.
  const ip = getClientIp(req);
  const ipRl = await persistentRateLimit(`complaints:ip:${ip}`, 3, 60 * 60 * 1000);
  if (!ipRl.allowed) {
    return NextResponse.json(
      { error: "Demasiadas reclamaciones desde tu IP. Inténtalo más tarde." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((ipRl.resetAt - Date.now()) / 1000)) } },
    );
  }
  if (user?.id) {
    const userRl = await persistentRateLimit(`complaints:user:${user.id}`, 5, 24 * 60 * 60 * 1000);
    if (!userRl.allowed) {
      return NextResponse.json(
        { error: "Has alcanzado el máximo de reclamaciones diarias." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((userRl.resetAt - Date.now()) / 1000)) } },
      );
    }
  }

  // Tope de tamaño de body — defensa contra payloads enormes.
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
  }

  try {
    const body = (await req.json()) as Partial<ComplaintRecord>;
    if (!body.claimantName || !body.claimantEmail || !body.facts || !body.claim) {
      return NextResponse.json(
        { error: "claimantName, claimantEmail, facts, claim requeridos" },
        { status: 400 },
      );
    }
    if (!isValidEmail(body.claimantEmail)) {
      return NextResponse.json({ error: "Email no válido" }, { status: 400 });
    }
    if (
      body.facts.length > MAX_TEXT_FIELD ||
      body.claim.length > MAX_TEXT_FIELD ||
      body.claimantName.length > 200
    ) {
      return NextResponse.json({ error: "Campos demasiado largos" }, { status: 400 });
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
