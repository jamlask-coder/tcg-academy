/**
 * Email service abstraction with adapter pattern.
 *
 * Local mode: stores sent emails in localStorage (mirrors emailService.ts).
 * Server mode: stub for Resend API integration.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface TemplatedEmailVars {
  [key: string]: string;
}

export interface SendResult {
  ok: boolean;
  emailId: string;
}

export interface SentEmailEntry {
  id: string;
  to: string;
  subject: string;
  html: string;
  sentAt: string;
}

// ─── Adapter interface ──────────────────────────────────────────────────────

export interface EmailAdapter {
  sendEmail(to: string, subject: string, html: string): Promise<SendResult>;
  sendTemplatedEmail(
    templateId: string,
    to: string,
    vars: TemplatedEmailVars,
  ): Promise<SendResult>;
}

// ─── localStorage keys ──────────────────────────────────────────────────────

const SENT_EMAILS_KEY = "tcgacademy_sent_emails";
const MAX_LOG = 200;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateEmailId(): string {
  return `em_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function logToLocalStorage(entry: SentEmailEntry): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(SENT_EMAILS_KEY);
    const emails: SentEmailEntry[] = raw ? (JSON.parse(raw) as SentEmailEntry[]) : [];
    emails.unshift(entry);
    localStorage.setItem(SENT_EMAILS_KEY, JSON.stringify(emails.slice(0, MAX_LOG)));
  } catch {
    // Storage full or unavailable — silently skip
  }
}

// ─── Local adapter (localStorage) ───────────────────────────────────────────

export class LocalEmailAdapter implements EmailAdapter {
  async sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
    const emailId = generateEmailId();
    logToLocalStorage({
      id: emailId,
      to,
      subject,
      html,
      sentAt: new Date().toISOString(),
    });
    return { ok: true, emailId };
  }

  async sendTemplatedEmail(
    templateId: string,
    to: string,
    vars: TemplatedEmailVars,
  ): Promise<SendResult> {
    const subject = `[Template: ${templateId}] Email to ${to}`;
    const html = `<p>Template: ${templateId}</p><pre>${JSON.stringify(vars, null, 2)}</pre>`;
    return this.sendEmail(to, subject, html);
  }
}

// ─── Resend adapter (stub) ──────────────────────────────────────────────────

export class ResendEmailAdapter implements EmailAdapter {
  async sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
    // TODO: Implement with Resend API
    //
    // const res = await fetch("https://api.resend.com/emails", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    //   },
    //   body: JSON.stringify({
    //     from: process.env.RESEND_FROM_EMAIL,
    //     to,
    //     subject,
    //     html,
    //   }),
    // });
    //
    // if (!res.ok) {
    //   return { ok: false, emailId: "" };
    // }
    //
    // const data = (await res.json()) as { id: string };
    // return { ok: true, emailId: data.id };

    void to;
    void subject;
    void html;

    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn("[ResendEmailAdapter] Resend not configured — email not sent");
    }
    return { ok: false, emailId: "" };
  }

  async sendTemplatedEmail(
    templateId: string,
    to: string,
    vars: TemplatedEmailVars,
  ): Promise<SendResult> {
    // TODO: Implement with Resend templates or render server-side
    //
    // Option A: Use Resend's built-in templates
    // const res = await fetch("https://api.resend.com/emails", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    //   },
    //   body: JSON.stringify({
    //     from: process.env.RESEND_FROM_EMAIL,
    //     to,
    //     template_id: templateId,
    //     data: vars,
    //   }),
    // });
    //
    // Option B: Render template locally and send as HTML
    // import { renderEmailTemplate } from "@/services/emailService";
    // const rendered = renderEmailTemplate(templateId, vars);
    // if (!rendered) return { ok: false, emailId: "" };
    // return this.sendEmail(to, rendered.subject, rendered.html);

    void templateId;
    void to;
    void vars;

    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn("[ResendEmailAdapter] Resend not configured — templated email not sent");
    }
    return { ok: false, emailId: "" };
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

let _instance: EmailAdapter | null = null;

export function getEmailService(): EmailAdapter {
  if (_instance) return _instance;

  const mode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";
  _instance = mode === "server" ? new ResendEmailAdapter() : new LocalEmailAdapter();
  return _instance;
}

// ─── Order notification helper ──────────────────────────────────────────────

const ORDER_TEMPLATE_MAP: Record<string, string> = {
  confirmado: "pedido_confirmado",
  procesando: "pedido_procesando",
  enviado: "pedido_enviado",
  entregado: "pedido_entregado",
  cancelado: "pedido_cancelado",
};

export async function sendOrderNotification(
  orderId: string,
  status: string,
  customerEmail: string,
  vars: TemplatedEmailVars,
): Promise<SendResult> {
  const service = getEmailService();
  const templateId = ORDER_TEMPLATE_MAP[status];

  if (!templateId) {
    return { ok: false, emailId: "" };
  }

  const enrichedVars: TemplatedEmailVars = {
    ...vars,
    orderId,
    status,
  };

  return service.sendTemplatedEmail(templateId, customerEmail, enrichedVars);
}
