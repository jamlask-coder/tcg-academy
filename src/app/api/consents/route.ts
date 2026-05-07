/**
 * GET  /api/consents — historial completo de consentimientos del usuario auth.
 * POST /api/consents — registra un nuevo evento (granted o revoked).
 *
 * Trazabilidad RGPD Art. 7: cada acción del usuario sobre su consentimiento
 * queda como append-only en la tabla `consents`. Nunca se sobreescribe — el
 * estado actual se calcula como "el último registro por (userId,type)".
 *
 * Auth: cookie httpOnly `tcga_session` o `Authorization: Bearer`. Anónimos → 401.
 *
 * Local-mode: el endpoint NO está disponible (el `consentService` sigue
 * leyendo localStorage). Devolvemos 501 para que el cliente sepa que debe
 * hacer fallback a localStorage.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest, getClientIp } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isServerMode = () =>
  (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";

const VALID_TYPES = [
  "terms",
  "privacy",
  "marketing_email",
  "cookies_analytics",
  "cookies_marketing",
  "data_processing",
] as const;

const recordSchema = z.object({
  type: z.enum(VALID_TYPES),
  status: z.enum(["granted", "revoked"]),
  method: z.string().min(1).max(64),
  version: z.string().min(1).max(32).optional(),
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
    const consents = await db.getConsents(session.sub);
    return NextResponse.json({ ok: true, consents });
  } catch (err) {
    logger.error("GET /api/consents failed", "api/consents", {
      userId: session.sub,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
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

  // Permitimos batch (array) o single (object) — UI envía ambos.
  const items = Array.isArray(body) ? body : [body];
  const parsed: Array<z.infer<typeof recordSchema>> = [];
  for (const item of items) {
    const r = recordSchema.safeParse(item);
    if (!r.success) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload", details: r.error.format() },
        { status: 400 },
      );
    }
    parsed.push(r.data);
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? undefined;

  try {
    const db = getDb();
    for (const c of parsed) {
      await db.createConsent({
        userId: session.sub,
        type: c.type,
        status: c.status,
        method: c.method,
        version: c.version ?? "2026-04",
        ipAddress: ip,
        userAgent,
      });
    }
    return NextResponse.json({ ok: true, recorded: parsed.length });
  } catch (err) {
    logger.error("POST /api/consents failed", "api/consents", {
      userId: session.sub,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 },
    );
  }
}
