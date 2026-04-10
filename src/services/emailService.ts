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

import { EMAIL_TEMPLATES } from "@/data/emailTemplates";

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

function logSentEmail(entry: SentEmailLog): void {
  const all = loadSentEmails();
  all.unshift(entry);
  localStorage.setItem(SENT_EMAILS_KEY, JSON.stringify(all.slice(0, MAX_LOG)));
}

// ── Template rendering ─────────────────────────────────────────────────────────

export function renderEmailTemplate(
  templateId: string,
  vars: Record<string, string>,
): { subject: string; html: string } | null {
  const tpl = EMAIL_TEMPLATES.find((t) => t.id === templateId);
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
