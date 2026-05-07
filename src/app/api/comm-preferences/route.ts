/**
 * GET /api/comm-preferences — preferencias de canales de comunicación del
 * usuario autenticado. Si no tiene fila aún, devuelve los defaults
 * RGPD-safe (transaccional ON, marketing OFF).
 *
 * PUT /api/comm-preferences — guarda las preferencias. Los canales
 * transaccionales (orders, shipping) se fuerzan a true a nivel servidor —
 * el cliente NO puede desactivarlos (base legal: contrato, Art. 6.1.b RGPD).
 *
 * Local-mode → 501 (el `consentService` resuelve por localStorage).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isServerMode = () =>
  (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";

const putSchema = z.object({
  emailMarketing: z.boolean(),
  emailNewsletter: z.boolean(),
  emailOffers: z.boolean(),
});

export async function GET(req: NextRequest) {
  if (!isServerMode()) {
    return NextResponse.json(
      { ok: false, error: "local_mode" },
      { status: 501 },
    );
  }
  const session = await getSessionFromRequest(req);
  if (!session?.sub) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }
  try {
    const db = getDb();
    const prefs = await db.getCommPreferences(session.sub);
    return NextResponse.json({ ok: true, preferences: prefs });
  } catch (err) {
    logger.error("GET /api/comm-preferences failed", "api/comm-preferences", {
      userId: session.sub,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  if (!isServerMode()) {
    return NextResponse.json(
      { ok: false, error: "local_mode" },
      { status: 501 },
    );
  }
  const session = await getSessionFromRequest(req);
  if (!session?.sub) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_payload", details: parsed.error.format() },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const saved = await db.saveCommPreferences(session.sub, {
      // Servidor fuerza estos a true (contractual). Cualquier intento de
      // ponerlos a false en payload se ignora — saveCommPreferences los
      // sobreescribe, pero los pasamos para tipado.
      emailOrders: true,
      emailShipping: true,
      emailMarketing: parsed.data.emailMarketing,
      emailNewsletter: parsed.data.emailNewsletter,
      emailOffers: parsed.data.emailOffers,
    });
    return NextResponse.json({ ok: true, preferences: saved });
  } catch (err) {
    logger.error("PUT /api/comm-preferences failed", "api/comm-preferences", {
      userId: session.sub,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }
}
