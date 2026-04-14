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

const CUSTOM_TEMPLATES_KEY = "tcgacademy_email_custom_templates";

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

/** Returns all templates with user customizations applied. */
export function getEffectiveTemplates(): EmailTemplate[] {
  const overrides = loadCustomOverrides();
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

const SENT_EMAILS_KEY = "tcgacademy_sent_emails";
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
  const all = loadSentEmails();
  all.unshift(entry);
  localStorage.setItem(SENT_EMAILS_KEY, JSON.stringify(all.slice(0, MAX_LOG)));
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
  data: IncidentReplyEmailData,
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

  const rendered = renderEmailTemplate("nuevo_cupon", {
    nombre: params.toName,
    coupon_code: params.couponCode,
    coupon_description: description,
    coupon_value: params.couponValue,
    expires_at: params.expiresAt,
    shop_url: shopUrl,
  });

  if (!rendered) return { ok: false, emailId: "" };

  // ── TODO: replace with real API call ──────────────────────────────────────
  // const res = await fetch('/api/emails/send', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ to: params.toEmail, subject: rendered.subject, html: rendered.html }),
  // });
  // if (!res.ok) return { ok: false, emailId: '' };
  // ─────────────────────────────────────────────────────────────────────────

  const emailId = `em_${Date.now()}`;
  logSentEmail({
    id: emailId,
    to: params.toEmail,
    toName: params.toName,
    subject: rendered.subject,
    templateId: "nuevo_cupon",
    sentAt: new Date().toISOString(),
    preview: `Cupón ${params.couponCode}: ${params.couponValue}`,
  });

  return { ok: true, emailId };
}
