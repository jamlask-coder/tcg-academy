/**
 * Email service abstraction with adapter pattern.
 *
 * Local mode: stores sent emails in localStorage.
 * Server mode: sends real emails via Resend API.
 *
 * Las plantillas (subject + HTML) se resuelven desde `src/data/emailTemplates.ts`
 * — fuente única de verdad admin-editable. Si una plantilla no existe allí,
 * `sendTemplatedEmail` devuelve {ok:false} (no envía fallback genérico).
 */

import { SITE_CONFIG } from "@/config/siteConfig";
import { EMAIL_TEMPLATES as ADMIN_EMAIL_TEMPLATES } from "@/data/emailTemplates";

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

/**
 * Attachment binario para el email. `content` es el payload en base64 SIN
 * prefijo `data:` (formato esperado por Resend). En modo local no se envía,
 * solo se registra en el log para auditoría.
 */
export interface EmailAttachment {
  filename: string;
  content: string; // base64
  contentType?: string; // p. ej. "application/pdf"
}

export interface SendEmailOptions {
  attachments?: EmailAttachment[];
}

export interface EmailAdapter {
  sendEmail(
    to: string,
    subject: string,
    html: string,
    opts?: SendEmailOptions,
  ): Promise<SendResult>;
  sendTemplatedEmail(
    templateId: string,
    to: string,
    vars: TemplatedEmailVars,
    opts?: SendEmailOptions,
  ): Promise<SendResult>;
}

// ─── localStorage keys ──────────────────────────────────────────────────────

// Canonical storage key: `tcgacademy_email_log`.
// The legacy `tcgacademy_sent_emails` was a duplicate and has been eliminated
// (see dataHub/registry.ts → "logs" entity).
const SENT_EMAILS_KEY = "tcgacademy_email_log";
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
    // Storage full or unavailable
  }
}

// ─── Template resolver (única SSOT: src/data/emailTemplates.ts) ─────────────

function resolveTemplate(
  templateId: string,
): { subject: string; html: string } | null {
  const tpl = ADMIN_EMAIL_TEMPLATES.find((t) => t.id === templateId);
  if (tpl) return { subject: tpl.subject, html: tpl.html };
  // Fallback a las plantillas legacy hardcoded (transición). Si no está en
  // ninguno de los dos, devolvemos null — el adapter falla explícito en vez
  // de enviar HTML genérico a producción.
  const legacy = LEGACY_TEMPLATES[templateId];
  return legacy ?? null;
}

// ─── Local adapter (localStorage) ───────────────────────────────────────────

export class LocalEmailAdapter implements EmailAdapter {
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    opts?: SendEmailOptions,
  ): Promise<SendResult> {
    const emailId = generateEmailId();
    const attachInfo =
      opts?.attachments && opts.attachments.length > 0
        ? `<p style="margin-top:16px;padding:10px;background:#f3f4f6;border-radius:8px;font-size:12px;color:#6b7280">📎 Adjuntos (modo local — no se envían): ${opts.attachments.map((a) => a.filename).join(", ")}</p>`
        : "";
    logToLocalStorage({
      id: emailId,
      to,
      subject,
      html: html + attachInfo,
      sentAt: new Date().toISOString(),
    });
    return { ok: true, emailId };
  }

  async sendTemplatedEmail(
    templateId: string,
    to: string,
    vars: TemplatedEmailVars,
    opts?: SendEmailOptions,
  ): Promise<SendResult> {
    const template = resolveTemplate(templateId);
    if (!template) {
      // No enviamos HTML genérico — fallar explícito facilita detectar
      // plantillas faltantes en vez de enviar basura al cliente.
      return { ok: false, emailId: "" };
    }
    const subject = replaceVars(template.subject, vars);
    const html = replaceVars(template.html, vars);
    return this.sendEmail(to, subject, html, opts);
  }
}

// ─── Resend adapter (production) ────────────────────────────────────────────

export class ResendEmailAdapter implements EmailAdapter {
  private apiKey: string;
  private fromEmail: string;
  private replyTo: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY ?? "";
    this.fromEmail = process.env.RESEND_FROM_EMAIL ?? SITE_CONFIG.email;
    // reply_to: cuando el dominio FROM (p. ej. hola@tcgacademy.es) no tiene
    // buzón asociado, ponemos aquí un email real (Gmail de soporte) para que
    // las respuestas de clientes lleguen a algún sitio. Sin esta variable,
    // Resend usará el `from` como reply_to y las respuestas se pierden.
    this.replyTo = process.env.RESEND_REPLY_TO ?? "";
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    opts?: SendEmailOptions,
  ): Promise<SendResult> {
    if (!this.apiKey) {
      return { ok: false, emailId: "" };
    }

    try {
      const payload: Record<string, unknown> = {
        from: `TCG Academy <${this.fromEmail}>`,
        to: [to],
        subject,
        html,
      };
      if (this.replyTo) payload.reply_to = this.replyTo;
      if (opts?.attachments && opts.attachments.length > 0) {
        // Formato Resend: https://resend.com/docs/api-reference/emails/send-email
        payload.attachments = opts.attachments.map((a) => ({
          filename: a.filename,
          content: a.content, // base64 sin prefijo data:
          content_type: a.contentType ?? "application/octet-stream",
        }));
      }
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Resend API error ${res.status}: ${errorBody}`);
      }

      const data = (await res.json()) as { id: string };
      return { ok: true, emailId: data.id };
    } catch (err) {
      // No silenciar — los fallos de Resend (dominio no verificado, rate
      // limit, payload mal formado) tienen que aparecer en logs para
      // diagnosticar. Antes este catch era mudo y cualquier error de envío
      // se perdía sin dejar rastro.
      // eslint-disable-next-line no-console
      console.error(`[ResendEmailAdapter] sendEmail failed to=${to} subject=${subject.slice(0, 60)}:`, err);
      return { ok: false, emailId: "" };
    }
  }

  async sendTemplatedEmail(
    templateId: string,
    to: string,
    vars: TemplatedEmailVars,
    opts?: SendEmailOptions,
  ): Promise<SendResult> {
    const template = resolveTemplate(templateId);
    if (!template) {
      return { ok: false, emailId: "" };
    }
    const subject = replaceVars(template.subject, vars);
    const html = replaceVars(template.html, vars);
    return this.sendEmail(to, subject, html, opts);
  }
}

// ─── Email Templates ────────────────────────────────────────────────────────

function replaceVars(text: string, vars: TemplatedEmailVars): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

// Vacío — todas las plantillas viven en src/data/emailTemplates.ts (SSOT,
// con escudo + paleta navy + progreso + footer legal). El antiguo wrap()
// + BRAND_HEADER/FOOTER + LEGACY_TEMPLATES se eliminó al consolidar
// pedido_confirmado / _recogida / _listo_recoger / cancelado y
// admin_nuevo_pedido en la SSOT.
const LEGACY_TEMPLATES: Record<string, { subject: string; html: string }> = {};

// ─── Factory ────────────────────────────────────────────────────────────────

let _instance: EmailAdapter | null = null;

export function getEmailService(): EmailAdapter {
  if (_instance) return _instance;
  // Decisión:
  //  1. En el navegador NUNCA podemos usar Resend (la API key es server-only).
  //     → siempre LocalEmailAdapter (log a localStorage para audit).
  //  2. En el servidor, si hay RESEND_API_KEY usamos Resend SIEMPRE, incluso
  //     en NEXT_PUBLIC_BACKEND_MODE=local. Así los flujos local-mode pueden
  //     pedir al servidor que mande emails reales (vía /api/auth, /api/notifications…).
  //  3. En el servidor sin RESEND_API_KEY caemos al adapter local (log only).
  const isBrowser = typeof window !== "undefined";
  const hasResend = !isBrowser && Boolean(process.env.RESEND_API_KEY);
  _instance = hasResend ? new ResendEmailAdapter() : new LocalEmailAdapter();
  return _instance;
}

// ─── Order notification helper ──────────────────────────────────────────────

const ORDER_TEMPLATE_MAP: Record<string, string> = {
  confirmado: "pedido_confirmado",
  procesando: "pedido_confirmado",
  enviado: "pedido_enviado",
  // "entregado" eliminado 2026-04-18 — "enviado" es el estado final del pipeline.
  cancelado: "pedido_cancelado",
  listo_recoger: "pedido_listo_recoger",
};

/** Pickup-specific map overrides when order is store pickup */
const PICKUP_TEMPLATE_MAP: Record<string, string> = {
  confirmado: "pedido_confirmado_recogida",
  procesando: "pedido_confirmado_recogida",
  listo_recoger: "pedido_listo_recoger",
  cancelado: "pedido_cancelado",
};

export async function sendOrderNotification(
  orderId: string,
  status: string,
  customerEmail: string,
  vars: TemplatedEmailVars,
  options?: { isStorePickup?: boolean },
): Promise<SendResult> {
  const service = getEmailService();
  const map = options?.isStorePickup ? PICKUP_TEMPLATE_MAP : ORDER_TEMPLATE_MAP;
  const templateId = map[status];
  if (!templateId) return { ok: false, emailId: "" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const enrichedVars: TemplatedEmailVars = { ...vars, orderId, status, appUrl };
  return service.sendTemplatedEmail(templateId, customerEmail, enrichedVars);
}
