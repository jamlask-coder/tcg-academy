import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, assertSameOrigin } from "@/lib/apiAuth";
import { logger } from "@/lib/logger";
import { sendAppEmail, type SendAppEmailParams } from "@/services/emailService";

/**
 * POST /api/admin/email/send
 *
 * Proxy server-side para envíos transaccionales disparados desde componentes
 * admin en el navegador (SendCouponModal, SendMessageModal, FacturaAlbaranForm,
 * etc.).
 *
 * Por qué existe: `getEmailService()` en `@/lib/email` decide entre
 * ResendEmailAdapter y LocalEmailAdapter mirando `typeof window`. En browser,
 * SIEMPRE devuelve LocalEmailAdapter (el adapter real lee `RESEND_API_KEY`,
 * que es server-only). Resultado previo: en server-mode los modales de admin
 * mostraban "✓ Sent" pero el correo nunca llegaba a Resend, solo a
 * localStorage. `sendAppEmail()` ahora detecta browser+server-mode y proxifica
 * vía POST a este endpoint, donde la ejecución es Node y `RESEND_API_KEY`
 * está disponible.
 *
 * Restricciones:
 *   - Origen propio (assertSameOrigin) — sin CSRF cross-site.
 *   - Rol admin (requireAdmin) — un cliente no puede enviar correos arbitrarios
 *     a terceros usando esta vía.
 *
 * Body: SendAppEmailParams
 * Respuesta: { ok: boolean, emailId: string }
 */
export async function POST(req: NextRequest) {
  const origin = assertSameOrigin(req);
  if (origin) return origin;

  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido" },
      { status: 400 },
    );
  }

  // Validación mínima de forma — no queremos dejar pasar a `sendAppEmail`
  // un objeto sin los campos esperados.
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).toEmail !== "string" ||
    typeof (body as Record<string, unknown>).toName !== "string" ||
    typeof (body as Record<string, unknown>).templateId !== "string" ||
    typeof (body as Record<string, unknown>).vars !== "object" ||
    (body as Record<string, unknown>).vars === null
  ) {
    return NextResponse.json(
      { ok: false, error: "Faltan campos: toEmail, toName, templateId, vars" },
      { status: 400 },
    );
  }

  const params = body as SendAppEmailParams;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(params.toEmail)) {
    return NextResponse.json(
      { ok: false, error: "Email destinatario inválido" },
      { status: 400 },
    );
  }

  try {
    const res = await sendAppEmail(params);
    if (!res.ok) {
      logger.warn("sendAppEmail proxy: envío reportó fallo", "admin/email", {
        adminId: admin.id,
        templateId: params.templateId,
        toEmail: params.toEmail,
      });
    }
    return NextResponse.json(res);
  } catch (err) {
    logger.error("sendAppEmail proxy: excepción", "admin/email", {
      adminId: admin.id,
      templateId: params.templateId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, emailId: "", error: "Error interno enviando email" },
      { status: 500 },
    );
  }
}
