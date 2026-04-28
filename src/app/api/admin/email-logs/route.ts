/**
 * GET /api/admin/email-logs
 *
 * Lista los emails enviados desde la tabla `email_logs` (Supabase).
 * Sustituye al panel basado en localStorage que solo veía los envíos
 * disparados desde el navegador del propio admin.
 *
 * Query params:
 *   ?limit=200          — máximo 1000
 *   ?toEmail=foo@bar    — filtrar por destinatario exacto
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const limitRaw = searchParams.get("limit");
  const toEmail = searchParams.get("toEmail")?.trim() || undefined;
  const limit = limitRaw ? Math.min(Math.max(parseInt(limitRaw, 10) || 200, 1), 1000) : 200;

  try {
    const db = getDb();
    const logs = await db.getEmailLogs({ limit, toEmail });
    return NextResponse.json({ ok: true, logs });
  } catch (err) {
    logger.error("GET email-logs failed", "admin-email-logs", { err: String(err) });
    return NextResponse.json({ ok: true, logs: [] });
  }
}
