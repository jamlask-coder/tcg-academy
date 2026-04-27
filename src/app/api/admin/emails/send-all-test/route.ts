import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, assertSameOrigin } from "@/lib/apiAuth";
import { logger } from "@/lib/logger";
import { sendAppEmail } from "@/services/emailService";
import { EMAIL_TEMPLATES } from "@/data/emailTemplates";
import { getPreviewVarsFor } from "@/data/emailPreviewVars";

/**
 * POST /api/admin/emails/send-all-test
 *
 * Envía cada plantilla activa de `EMAIL_TEMPLATES` al destinatario indicado,
 * usando los datos de preview de `EMAIL_PREVIEW_VARS`. Pensado para QA
 * visual end-to-end del catálogo de emails desde el panel admin.
 *
 * Restricciones:
 *   - Solo rol admin (vía `requireAdmin`).
 *   - Solo origen propio (`assertSameOrigin`) — sin CSRF cross-site.
 *   - Si el backend no está en server-mode, devuelve 412 (Precondition Failed)
 *     porque sin Resend configurado no llegaría ningún correo real.
 *
 * Body: `{ targetEmail: string }`
 * Respuesta: `{ ok, total, sent, failed, results: [{templateId, ok, error?}] }`
 */
export async function POST(req: NextRequest) {
  // CSRF dura: rechazar cualquier request cuyo origen no sea el dominio propio.
  const origin = assertSameOrigin(req);
  if (origin) return origin;

  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  // Sin server-mode (Resend) los correos no salen físicamente. En ese caso
  // bloqueamos en vez de simular, para no engañar al admin.
  const isServerMode =
    (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";
  if (!isServerMode) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "El envío masivo requiere NEXT_PUBLIC_BACKEND_MODE=server (Resend).",
      },
      { status: 412 },
    );
  }

  // Validación de input.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido" },
      { status: 400 },
    );
  }
  const targetEmail =
    typeof body === "object" &&
    body !== null &&
    "targetEmail" in body &&
    typeof (body as { targetEmail: unknown }).targetEmail === "string"
      ? (body as { targetEmail: string }).targetEmail.trim()
      : "";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(targetEmail)) {
    return NextResponse.json(
      { ok: false, error: "Email destinatario inválido" },
      { status: 400 },
    );
  }

  logger.info("Envío masivo de plantillas de prueba", "admin/emails", {
    adminId: admin.id,
    target: targetEmail,
    total: EMAIL_TEMPLATES.length,
  });

  const results: { templateId: string; name: string; ok: boolean; error?: string }[] = [];

  for (const tpl of EMAIL_TEMPLATES) {
    try {
      const vars = getPreviewVarsFor(tpl.id, tpl.variables);
      const res = await sendAppEmail({
        toEmail: targetEmail,
        toName: "Test Admin",
        templateId: tpl.id,
        vars,
        preview: `[TEST] ${tpl.name}`,
      });
      results.push({ templateId: tpl.id, name: tpl.name, ok: res.ok });
    } catch (err) {
      results.push({
        templateId: tpl.id,
        name: tpl.name,
        ok: false,
        error: err instanceof Error ? err.message : "error desconocido",
      });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;

  return NextResponse.json({
    ok: failed === 0,
    total: results.length,
    sent,
    failed,
    results,
  });
}
