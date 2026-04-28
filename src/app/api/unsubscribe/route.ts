/**
 * POST /api/unsubscribe
 *
 * Endpoint público (sin auth de sesión) que da de baja a un usuario de las
 * comunicaciones comerciales. La autenticación es el propio token firmado
 * incluido en el enlace del email — verificable por HMAC con SESSION_SECRET.
 *
 * Flujo:
 *   email → enlace `{{unsubscribe_link}}` con token → /unsubscribe?token=...
 *   página llama a este endpoint con el token → registra consent revoked.
 *
 * Decisión de diseño: el "estado" de unsubscribe vive en la tabla `consents`
 * (RGPD Art. 7) y NO en una columna `marketing_opt_in` aparte. Motivo:
 *   - una sola fuente de verdad → el registro append-only de consents.
 *   - cumple Art. 7 (rastro auditable de cuándo se otorgó/revocó).
 *   - cualquier consultor ve el opt-out sin tocar dos sitios.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/apiAuth";
import { verifyUnsubscribeToken } from "@/lib/unsubscribeToken";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const sameOrigin = assertSameOrigin(req);
  if (sameOrigin) return sameOrigin;

  // ─── Validar input ──────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido" },
      { status: 400 },
    );
  }

  const token =
    typeof body === "object" &&
    body !== null &&
    "token" in body &&
    typeof (body as { token: unknown }).token === "string"
      ? (body as { token: string }).token
      : "";

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Token requerido" },
      { status: 400 },
    );
  }

  // ─── Verificar token (HMAC + scope + caducidad) ─────────────────────────
  const email = await verifyUnsubscribeToken(token);
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Enlace caducado o no válido" },
      { status: 400 },
    );
  }

  // ─── Registrar baja ─────────────────────────────────────────────────────
  // En server-mode escribimos en `consents` vía DbAdapter. Si el email no
  // coincide con ningún usuario (newsletter de email-only), devolvemos 200
  // igualmente — el usuario ve "te has dado de baja" y el sistema queda
  // listo para extender a una tabla de suscriptores anónimos cuando exista.
  const isServerMode =
    (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";

  if (isServerMode) {
    try {
      const { getDb } = await import("@/lib/db");
      const db = getDb();
      const user = await db.getUserByEmail(email);
      if (user) {
        await db.createConsent({
          userId: user.id,
          type: "marketing_email",
          status: "revoked",
          method: "email_unsubscribe_link",
          version: "2026-04",
          ipAddress:
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            req.headers.get("x-real-ip") ??
            undefined,
          userAgent: req.headers.get("user-agent") ?? undefined,
        });
        logger.info("Baja comunicaciones registrada", "unsubscribe", {
          userId: user.id,
        });
      } else {
        logger.info("Unsubscribe sin usuario asociado", "unsubscribe", {
          emailHash: email.length, // no logueamos el email en claro
        });
      }
    } catch (err) {
      logger.error("Fallo registrando unsubscribe", "unsubscribe", {
        error: err instanceof Error ? err.message : String(err),
      });
      // No revelamos el error al cliente — el usuario ya hizo su acción.
    }
  }

  return NextResponse.json({ ok: true, email });
}
