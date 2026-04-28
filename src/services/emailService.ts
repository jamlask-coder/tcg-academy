// ── Email Service ─────────────────────────────────────────────────────────────
// Client-side mock that stores sent emails in localStorage.
// Ready for backend integration — replace sendEmail() body with a fetch() call.
//
// Integration example (Resend):
//   const res = await fetch('/api/send-email', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ to, subject, html }),
//   });

import { EMAIL_TEMPLATES, type EmailTemplate } from "@/data/emailTemplates";

// ── Custom template persistence ────────────────────────────────────────────────
// En local-mode las plantillas customizadas viven en localStorage.
// En server-mode se persisten en `settings.email_custom_templates_json` y el
// browser sólo cachea para evitar parpadeo en /admin/emails. La fuente de
// verdad para el envío real es la BD (sendAppEmail tira siempre de BD).

const CUSTOM_TEMPLATES_KEY = "tcgacademy_email_custom_templates";
const SETTINGS_DB_KEY = "email_custom_templates_json";

type CustomOverrides = Record<string, { subject: string; html: string }>;

function loadCustomOverrides(): CustomOverrides {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(
      localStorage.getItem(CUSTOM_TEMPLATES_KEY) ?? "{}",
    ) as CustomOverrides;
  } catch {
    return {};
  }
}

/** Lee overrides desde BD (server-mode). Devuelve {} si no hay nada. */
async function loadCustomOverridesFromDb(): Promise<CustomOverrides> {
  try {
    const { getDb } = await import("@/lib/db");
    const raw = await getDb().getSetting(SETTINGS_DB_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as CustomOverrides;
    return {};
  } catch {
    return {};
  }
}

export function saveCustomTemplate(
  id: string,
  subject: string,
  html: string,
): void {
  if (typeof window === "undefined") return;
  const all = loadCustomOverrides();
  all[id] = { subject, html };
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(all));
}

export function resetCustomTemplate(id: string): void {
  if (typeof window === "undefined") return;
  const all = loadCustomOverrides();
  delete all[id];
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(all));
}

/**
 * Persiste todos los overrides en BD vía /api/admin/email-templates.
 * Solo tiene efecto en server-mode; en local-mode resuelve no-op (las
 * customizaciones ya están guardadas en localStorage).
 */
export async function syncCustomTemplatesToDb(): Promise<{ ok: boolean }> {
  const isServerMode =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
  if (!isServerMode || typeof window === "undefined") return { ok: true };
  try {
    const overrides = loadCustomOverrides();
    const r = await fetch("/api/admin/email-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ overrides }),
    });
    return { ok: r.ok };
  } catch {
    return { ok: false };
  }
}

/**
 * Hidrata localStorage con los overrides guardados en BD. Llamar al montar
 * /admin/emails para que el admin vea sus customizaciones aunque cambie de
 * navegador o limpie el storage.
 */
export async function hydrateCustomTemplatesFromDb(): Promise<void> {
  const isServerMode =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
  if (!isServerMode || typeof window === "undefined") return;
  try {
    const r = await fetch("/api/admin/email-templates", { credentials: "include" });
    if (!r.ok) return;
    const data = (await r.json()) as { overrides?: CustomOverrides };
    if (!data.overrides) return;
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(data.overrides));
  } catch {
    // Si falla, dejamos lo que ya hay en localStorage.
  }
}

/** Returns all templates with user customizations applied (cliente, sync). */
export function getEffectiveTemplates(): EmailTemplate[] {
  const overrides = loadCustomOverrides();
  return EMAIL_TEMPLATES.map((t) => {
    const o = overrides[t.id];
    return o ? { ...t, subject: o.subject, html: o.html } : t;
  });
}

/**
 * Versión async usada en server-mode: lee overrides desde BD para que los
 * envíos hechos desde rutas API/cron/webhook respeten las plantillas
 * customizadas por el admin (antes solo veían las defaults).
 */
export async function getEffectiveTemplatesAsync(): Promise<EmailTemplate[]> {
  const isServerMode =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
  const overrides = isServerMode
    ? await loadCustomOverridesFromDb()
    : loadCustomOverrides();
  return EMAIL_TEMPLATES.map((t) => {
    const o = overrides[t.id];
    return o ? { ...t, subject: o.subject, html: o.html } : t;
  });
}

/** Returns true if the template has been customized by the admin. */
export function isCustomized(id: string): boolean {
  const overrides = loadCustomOverrides();
  return id in overrides;
}

// ── Invitation email ───────────────────────────────────────────────────────────

const REGISTERED_KEY = "tcgacademy_registered";

interface RegisteredEntry {
  password: string;
  user: { id: string; name: string; lastName: string; email: string };
}

function lookupUser(userId: string): { name: string; email: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const registered = JSON.parse(
      localStorage.getItem(REGISTERED_KEY) ?? "{}",
    ) as Record<string, RegisteredEntry>;
    for (const [email, entry] of Object.entries(registered)) {
      if (entry.user.id === userId) {
        return { name: `${entry.user.name} ${entry.user.lastName}`, email };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Abre el email de invitación al grupo en una nueva pestaña (demo).
 * Usa la plantilla "asociacion_invitacion" (editable desde /admin/emails).
 * En producción: reemplazar por una llamada a Resend / EmailJS / SendGrid.
 */
export function openInvitationEmail(toUserId: string, fromUserId: string): void {
  if (typeof window === "undefined") return;

  const toInfo = lookupUser(toUserId);
  const fromInfo = lookupUser(fromUserId);

  const toName = toInfo?.name.split(" ")[0] ?? "amigo/a";
  const fromName = fromInfo?.name ?? "Un usuario";
  const toEmail = toInfo?.email ?? null;

  const rendered = renderEmailTemplate("asociacion_invitacion", {
    toName,
    fromName,
    fromInitial: fromName.charAt(0).toUpperCase(),
  });
  const html = rendered?.html ?? "";

  openHtmlInNewTab(html);

  if (!html && toEmail) {
    const subject = encodeURIComponent(
      `${fromName} te invita a unirte a su grupo en TCG Academy`,
    );
    const body = encodeURIComponent(
      `Hola ${toName},\n\n${fromName} te ha enviado una invitación para unirse a su grupo en TCG Academy.\n\nEntra en tu cuenta para aceptarla:\nhttps://tcgacademy.es/cuenta/grupo`,
    );
    window.open(`mailto:${toEmail}?subject=${subject}&body=${body}`, "_blank");
  }
}

/** Opens raw HTML in a new browser tab (demo mode). */
export function openHtmlInNewTab(html: string): void {
  if (typeof window === "undefined" || !html) return;
  try {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  } catch {
    /* ignore */
  }
}

// ── Sent email log ─────────────────────────────────────────────────────────────

// Canonical key: `tcgacademy_email_log` (see dataHub/registry.ts, "logs").
// Consolidates the previous duplicate `tcgacademy_sent_emails`.
const SENT_EMAILS_KEY = "tcgacademy_email_log";
const MAX_LOG = 200;

export interface SentEmailLog {
  id: string;
  to: string;
  toName: string;
  subject: string;
  templateId: string;
  sentAt: string;    // ISO timestamp
  preview: string;   // one-line human summary shown in admin panel
}

export function loadSentEmails(): SentEmailLog[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(
      localStorage.getItem(SENT_EMAILS_KEY) ?? "[]",
    ) as SentEmailLog[];
  } catch {
    return [];
  }
}

export function logSentEmail(entry: SentEmailLog): void {
  if (typeof window === "undefined") return;
  const all = loadSentEmails();
  all.unshift(entry);
  localStorage.setItem(SENT_EMAILS_KEY, JSON.stringify(all.slice(0, MAX_LOG)));
}

// ── Canonical send helper ──────────────────────────────────────────────────────
//
// SIEMPRE usar esta función para notificaciones a usuarios/tiendas. NUNCA llamar
// a `logSentEmail()` directamente desde código fuera de este módulo — el test
// de auditoría (tests/audit/run-audit.mjs) falla si detecta `logSentEmail(` en
// otros archivos.
//
// Motivación: `logSentEmail()` solo escribe en localStorage. En modo server
// (NEXT_PUBLIC_BACKEND_MODE=server) eso implica que los emails NO salen nunca.
// `sendAppEmail()` renderiza la plantilla admin-editable, envía vía Resend si
// procede, y siempre registra en el log canónico para visibilidad en
// /admin/emails.

export interface SendAppEmailAttachment {
  filename: string;
  content: string; // base64 SIN prefijo data:
  contentType?: string;
}

export interface SendAppEmailParams {
  toEmail: string;
  toName: string;
  templateId: string;
  vars: Record<string, string>;
  preview?: string;
  /** Adjuntos opcionales (p. ej. PDF de la factura). En modo local no se
   *  envían físicamente, pero quedan listados en el log de /admin/emails. */
  attachments?: SendAppEmailAttachment[];
}

export async function sendAppEmail(
  params: SendAppEmailParams,
): Promise<{ ok: boolean; emailId: string }> {
  // Inyección automática del enlace "Cancelar suscripción". El placeholder
  // `{{unsubscribe_link}}` está presente en casi todas las plantillas (footer
  // legal RGPD), pero los call-sites nunca lo rellenan — antes acababa como
  // literal en el email enviado, dejando el botón sin URL. Aquí lo construimos
  // con un token HMAC firmado contra el `toEmail`.
  if (!params.vars.unsubscribe_link && params.toEmail) {
    try {
      const { getUnsubscribeUrl } = await import("@/lib/unsubscribeToken");
      params.vars = {
        ...params.vars,
        unsubscribe_link: await getUnsubscribeUrl(params.toEmail),
      };
    } catch {
      // SESSION_SECRET ausente o entorno sin crypto — degradamos a "#"
      // (mejor un enlace muerto que un literal `{{unsubscribe_link}}`).
      params.vars = { ...params.vars, unsubscribe_link: "#" };
    }
  }

  // En server-mode, lee plantillas customizadas desde BD; en local-mode,
  // desde localStorage. Antes solo se usaba la sync-version, lo que dejaba al
  // server enviando siempre la plantilla por defecto, ignorando los cambios
  // del admin.
  const rendered = await renderEmailTemplateAsync(params.templateId, params.vars);
  if (!rendered) {
    return { ok: false, emailId: "" };
  }

  let emailId = `em_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let sendOk = true;

  const backendMode =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_BACKEND_MODE
      : undefined;

  if (backendMode === "server") {
    try {
      const { getEmailService } = await import("@/lib/email");
      const res = await getEmailService().sendEmail(
        params.toEmail,
        rendered.subject,
        rendered.html,
        params.attachments && params.attachments.length > 0
          ? { attachments: params.attachments }
          : undefined,
      );
      sendOk = res.ok;
      if (res.emailId) emailId = res.emailId;
    } catch {
      sendOk = false;
    }
  }

  // Log canónico:
  //   - cliente (window): localStorage (legacy) — sigue por compatibilidad,
  //     pero NO es la fuente de verdad en server-mode.
  //   - server-mode (Node): BD `email_log` vía DbAdapter.logEmail.
  // Antes solo se escribía a localStorage, lo que dejaba sin auditoría los
  // envíos disparados por el server (cron/webhook/admin actions del API)
  // y desincronizaba historiales entre dispositivos del admin.
  const sentAtIso = new Date().toISOString();
  logSentEmail({
    id: emailId,
    to: params.toEmail,
    toName: params.toName,
    subject: rendered.subject,
    templateId: params.templateId,
    sentAt: sentAtIso,
    preview: params.preview ?? rendered.subject,
  });

  if (backendMode === "server") {
    try {
      const { getDb } = await import("@/lib/db");
      await getDb().logEmail({
        toEmail: params.toEmail,
        toName: params.toName,
        subject: rendered.subject,
        templateId: params.templateId,
        providerId: emailId,
        status: sendOk ? "sent" : "failed",
      });
    } catch {
      // Fallo en BD no debe romper el envío. El email ya salió o no salió;
      // un log perdido es preferible a abortar la respuesta al usuario.
    }
  }

  return { ok: sendOk, emailId };
}

// ── Template rendering ─────────────────────────────────────────────────────────

export function renderEmailTemplate(
  templateId: string,
  vars: Record<string, string>,
): { subject: string; html: string } | null {
  // Use effective templates (which include any admin customizations)
  const templates = getEffectiveTemplates();
  const tpl = templates.find((t) => t.id === templateId);
  if (!tpl) return null;

  const replace = (str: string): string =>
    Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
      str,
    );

  return {
    subject: replace(tpl.subject),
    html: replace(tpl.html),
  };
}

/**
 * Versión async usada por server-side senders. Lee customizaciones desde BD
 * en server-mode y desde localStorage en local-mode.
 */
export async function renderEmailTemplateAsync(
  templateId: string,
  vars: Record<string, string>,
): Promise<{ subject: string; html: string } | null> {
  const templates = await getEffectiveTemplatesAsync();
  const tpl = templates.find((t) => t.id === templateId);
  if (!tpl) return null;

  const replace = (str: string): string =>
    Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v),
      str,
    );

  return {
    subject: replace(tpl.subject),
    html: replace(tpl.html),
  };
}

// ── Incident reply email ───────────────────────────────────────────────────────

export interface IncidentReplyEmailData {
  toEmail: string;
  toName: string;
  orderId: string;
  incidentTypeLabel: string;
  adminReply: string;
  repliedAt: string;
}

export async function sendIncidentReplyEmail(
  _data: IncidentReplyEmailData,
): Promise<void> {
  // ── PRODUCTION ──────────────────────────────────────────────────────────
  // const emailjs = await import("@emailjs/browser");
  // await emailjs.send(
  //   "YOUR_SERVICE_ID",
  //   "YOUR_TEMPLATE_ID",
  //   {
  //     to_email:      data.toEmail,
  //     to_name:       data.toName,
  //     order_id:      data.orderId,
  //     incident_type: data.incidentTypeLabel,
  //     admin_reply:   data.adminReply,
  //     replied_at:    data.repliedAt,
  //   },
  //   "YOUR_PUBLIC_KEY",
  // );
  // ────────────────────────────────────────────────────────────────────────

}

// ── Coupon email ───────────────────────────────────────────────────────────────

export interface CouponEmailParams {
  toEmail: string;
  toName: string;
  couponCode: string;
  couponDescription: string;
  couponValue: string;      // "15%", "5.00€" or "Envío gratis"
  expiresAt: string;        // formatted: "31 de diciembre de 2025"
  personalMessage?: string; // optional note from the admin
  shopUrl?: string;
}

export async function sendCouponEmail(
  params: CouponEmailParams,
): Promise<{ ok: boolean; emailId: string }> {
  const description = params.personalMessage
    ? `${params.couponDescription}<br><br><em style="color:#6b7280">${params.personalMessage}</em>`
    : params.couponDescription;

  const shopUrl =
    params.shopUrl ??
    (typeof window !== "undefined" ? window.location.origin : "https://tcgacademy.es");

  return sendAppEmail({
    toEmail: params.toEmail,
    toName: params.toName,
    templateId: "nuevo_cupon",
    vars: {
      nombre: params.toName,
      coupon_code: params.couponCode,
      coupon_description: description,
      coupon_value: params.couponValue,
      expires_at: params.expiresAt,
      shop_url: shopUrl,
    },
    preview: `Cupón ${params.couponCode}: ${params.couponValue}`,
  });
}
