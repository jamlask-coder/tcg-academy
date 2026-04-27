import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, assertSameOrigin } from "@/lib/apiAuth";
import { logger } from "@/lib/logger";
import { renderEmailTemplate } from "@/services/emailService";
import { getEmailService } from "@/lib/email";
import { EMAIL_TEMPLATES } from "@/data/emailTemplates";
import { getPreviewVarsFor } from "@/data/emailPreviewVars";

// Resend free plan: 2 requests/seg. 600ms entre envíos = ~1.6 req/s, margen
// suficiente para no rebotar. Si subimos al plan de pago, podríamos bajarlo.
const RESEND_THROTTLE_MS = 600;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  // Pre-checks de configuración Resend para devolver un mensaje útil en
  // vez de 24 fallos opacos. `sendAppEmail` se traga el error y solo expone
  // un boolean — aquí miramos directamente las env vars antes de empezar.
  const hasResendKey = Boolean(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "";
  if (!hasResendKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "RESEND_API_KEY no está configurada en Vercel. Sin esa clave Resend rechaza todos los envíos. Añádela en Settings → Environment Variables y redeploy.",
      },
      { status: 412 },
    );
  }
  if (!fromEmail) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "RESEND_FROM_EMAIL no está configurada. Resend exige un dominio verificado para el campo From. Configúrala (p.ej. hola@tcgacademy.es) y redeploy.",
      },
      { status: 412 },
    );
  }

  logger.info("Envío masivo de plantillas de prueba", "admin/emails", {
    adminId: admin.id,
    target: targetEmail,
    total: EMAIL_TEMPLATES.length,
  });

  const emailService = getEmailService();
  const results: { templateId: string; name: string; ok: boolean; error?: string }[] = [];

  for (let i = 0; i < EMAIL_TEMPLATES.length; i++) {
    const tpl = EMAIL_TEMPLATES[i];
    try {
      const vars = getPreviewVarsFor(tpl.id, tpl.variables);
      const rendered = renderEmailTemplate(tpl.id, vars);
      if (!rendered) {
        results.push({
          templateId: tpl.id,
          name: tpl.name,
          ok: false,
          error: "Plantilla no encontrada",
        });
        continue;
      }
      // Llamamos al adapter directamente (no `sendAppEmail`) para poder
      // capturar el mensaje exacto del fallo cuando ocurre.
      const res = await emailService.sendEmail(
        targetEmail,
        `[TEST] ${rendered.subject}`,
        rendered.html,
      );
      if (res.ok) {
        results.push({ templateId: tpl.id, name: tpl.name, ok: true });
      } else {
        // El adapter logea el detalle a stderr; aquí no tenemos el mensaje
        // pero podemos diferenciarlo del catch.
        results.push({
          templateId: tpl.id,
          name: tpl.name,
          ok: false,
          error: "Resend devolvió ok=false (revisa logs Vercel)",
        });
      }
    } catch (err) {
      results.push({
        templateId: tpl.id,
        name: tpl.name,
        ok: false,
        error: err instanceof Error ? err.message : "error desconocido",
      });
    }
    // Throttle entre envíos (excepto tras el último).
    if (i < EMAIL_TEMPLATES.length - 1) await sleep(RESEND_THROTTLE_MS);
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;
  const firstError = results.find((r) => !r.ok)?.error;

  return NextResponse.json({
    ok: failed === 0,
    total: results.length,
    sent,
    failed,
    firstError,
    results,
  });
}
