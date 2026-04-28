import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin, assertSameOrigin } from "@/lib/apiAuth";
import { logger } from "@/lib/logger";
import { renderEmailTemplate } from "@/services/emailService";
import { EMAIL_TEMPLATES } from "@/data/emailTemplates";
import { getPreviewVarsFor } from "@/data/emailPreviewVars";

// Resend free plan: 2 requests/seg. 600ms entre envíos = ~1.6 req/s, margen
// suficiente para no rebotar. Si subimos al plan de pago, podríamos bajarlo.
const RESEND_THROTTLE_MS = 600;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface SendOutcome {
  ok: boolean;
  emailId?: string;
  status?: number;
  error?: string;
}

/**
 * Llamada directa a Resend (sin pasar por el adapter) para poder capturar
 * el status HTTP y el cuerpo del error. El adapter es voluntariamente opaco
 * (devuelve solo `ok: boolean`), lo que dificulta el diagnóstico desde el
 * panel admin. Aquí queremos ver el motivo exacto.
 */
async function sendViaResend(opts: {
  apiKey: string;
  fromEmail: string;
  replyTo: string;
  to: string;
  subject: string;
  html: string;
}): Promise<SendOutcome> {
  try {
    const payload: Record<string, unknown> = {
      from: `TCG Academy <${opts.fromEmail}>`,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    };
    if (opts.replyTo) payload.reply_to = opts.replyTo;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let bodyText = await res.text();
      // Resend devuelve JSON en errores; intentamos extraer `message`.
      try {
        const parsed = JSON.parse(bodyText) as { message?: string; name?: string };
        if (parsed.message) bodyText = parsed.message;
        if (parsed.name && !bodyText.includes(parsed.name))
          bodyText = `${parsed.name}: ${bodyText}`;
      } catch {
        /* texto plano */
      }
      return {
        ok: false,
        status: res.status,
        error: `Resend ${res.status}: ${bodyText.slice(0, 280)}`,
      };
    }

    const data = (await res.json()) as { id: string };
    return { ok: true, emailId: data.id, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error de red contactando Resend",
    };
  }
}

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
 *   - Si el backend no está en server-mode, devuelve 412.
 *   - Si la primera plantilla falla por config (401/403/422), aborta el
 *     bucle para no quemar 24 intentos con el mismo error.
 *
 * Body: `{ targetEmail: string }`
 * Respuesta: `{ ok, total, sent, failed, firstError?, aborted?, results }`
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
  // vez de 24 fallos opacos.
  const apiKey = process.env.RESEND_API_KEY ?? "";
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "";
  const replyTo = process.env.RESEND_REPLY_TO ?? "";

  if (!apiKey) {
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

  const results: {
    templateId: string;
    name: string;
    ok: boolean;
    status?: number;
    error?: string;
  }[] = [];

  // Códigos que indican error de configuración (no transitorio): si el
  // primer intento falla con uno de éstos, abortamos. No tiene sentido
  // hacer 23 envíos más con la misma key/dominio mal configurados.
  const ABORT_STATUSES = new Set([401, 403, 404]);
  let aborted = false;

  for (let i = 0; i < EMAIL_TEMPLATES.length; i++) {
    const tpl = EMAIL_TEMPLATES[i];
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

    const outcome = await sendViaResend({
      apiKey,
      fromEmail,
      replyTo,
      to: targetEmail,
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
    });

    results.push({
      templateId: tpl.id,
      name: tpl.name,
      ok: outcome.ok,
      status: outcome.status,
      error: outcome.error,
    });

    // Si el primer envío revela un error de configuración (key/dominio),
    // aborta — todos los demás van a fallar con lo mismo.
    if (i === 0 && !outcome.ok && outcome.status && ABORT_STATUSES.has(outcome.status)) {
      aborted = true;
      logger.warn("Send-all abortado: error de configuración Resend", "admin/emails", {
        status: outcome.status,
        error: outcome.error,
      });
      break;
    }

    // Throttle entre envíos (excepto tras el último o si ya hemos abortado).
    if (i < EMAIL_TEMPLATES.length - 1) await sleep(RESEND_THROTTLE_MS);
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;
  const firstError = results.find((r) => !r.ok)?.error;

  return NextResponse.json({
    ok: failed === 0,
    total: EMAIL_TEMPLATES.length,
    attempted: results.length,
    sent,
    failed,
    aborted,
    firstError,
    results,
  });
}
