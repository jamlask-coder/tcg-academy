/**
 * Email service abstraction with adapter pattern.
 *
 * Local mode: stores sent emails in localStorage.
 * Server mode: sends real emails via Resend API.
 */

import { SITE_CONFIG } from "@/config/siteConfig";

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

// ─── Local adapter (localStorage) ───────────────────────────────────────────

export class LocalEmailAdapter implements EmailAdapter {
  async sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
    const emailId = generateEmailId();
    logToLocalStorage({ id: emailId, to, subject, html, sentAt: new Date().toISOString() });
    return { ok: true, emailId };
  }

  async sendTemplatedEmail(
    templateId: string,
    to: string,
    vars: TemplatedEmailVars,
  ): Promise<SendResult> {
    const template = EMAIL_TEMPLATES[templateId];
    if (template) {
      const subject = replaceVars(template.subject, vars);
      const html = replaceVars(template.html, vars);
      return this.sendEmail(to, subject, html);
    }
    const subject = `[Template: ${templateId}] Email to ${to}`;
    const html = `<p>Template: ${templateId}</p><pre>${JSON.stringify(vars, null, 2)}</pre>`;
    return this.sendEmail(to, subject, html);
  }
}

// ─── Resend adapter (production) ────────────────────────────────────────────

export class ResendEmailAdapter implements EmailAdapter {
  private apiKey: string;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY ?? "";
    this.fromEmail = process.env.RESEND_FROM_EMAIL ?? SITE_CONFIG.email;
  }

  async sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
    if (!this.apiKey) {
      return { ok: false, emailId: "" };
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: `TCG Academy <${this.fromEmail}>`,
          to: [to],
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Resend API error ${res.status}: ${errorBody}`);
      }

      const data = (await res.json()) as { id: string };
      return { ok: true, emailId: data.id };
    } catch {
      return { ok: false, emailId: "" };
    }
  }

  async sendTemplatedEmail(
    templateId: string,
    to: string,
    vars: TemplatedEmailVars,
  ): Promise<SendResult> {
    const template = EMAIL_TEMPLATES[templateId];
    if (!template) {
      return { ok: false, emailId: "" };
    }
    const subject = replaceVars(template.subject, vars);
    const html = replaceVars(template.html, vars);
    return this.sendEmail(to, subject, html);
  }
}

// ─── Email Templates ────────────────────────────────────────────────────────

function replaceVars(text: string, vars: TemplatedEmailVars): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

const BRAND_HEADER = `
  <div style="background:#1e40af;padding:20px 24px;text-align:center">
    <span style="color:white;font-size:22px;font-weight:900;letter-spacing:0.5px">TCG <span style="color:#fbbf24">Academy</span></span>
  </div>
`;

const BRAND_FOOTER = `
  <div style="padding:20px 24px;text-align:center;color:#999;font-size:11px;border-top:1px solid #eee">
    <p>${SITE_CONFIG.legalName} — La mejor tienda TCG de España</p>
    <p>CIF: ${SITE_CONFIG.cif} · ${SITE_CONFIG.address}</p>
    <p>Si no deseas recibir estos emails, puedes gestionar tus preferencias desde tu cuenta.</p>
  </div>
`;

function wrap(content: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    ${BRAND_HEADER}
    <div style="padding:24px">${content}</div>
    ${BRAND_FOOTER}
  </div>`;
}

const EMAIL_TEMPLATES: Record<string, { subject: string; html: string }> = {
  bienvenida: {
    subject: "¡Bienvenido a TCG Academy, {{nombre}}!",
    html: wrap(`
      <h2 style="color:#1e40af;margin:0 0 12px">¡Hola {{nombre}}!</h2>
      <p>Tu cuenta en TCG Academy ha sido creada correctamente.</p>
      <p>Ya puedes explorar nuestra tienda con más de 10.000 productos TCG, acumular puntos y disfrutar de envío gratis en pedidos superiores a ${SITE_CONFIG.shippingThreshold}€.</p>
      <a href="{{appUrl}}/catalogo" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
        Explorar catálogo
      </a>
    `),
  },
  pedido_confirmado: {
    subject: "Pedido {{orderId}} confirmado — TCG Academy",
    html: wrap(`
      <h2 style="color:#1e40af;margin:0 0 12px">¡Pedido confirmado!</h2>
      <p>Hemos recibido tu pedido <strong>{{orderId}}</strong> correctamente.</p>
      <p>Total: <strong>{{total}}€</strong></p>
      <p>Te enviaremos un email cuando tu pedido sea enviado.</p>
      <a href="{{appUrl}}/cuenta/pedidos" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
        Ver mis pedidos
      </a>
    `),
  },
  pedido_confirmado_recogida: {
    subject: "Pedido {{orderId}} recibido — Recogida en {{tiendaNombre}}",
    html: wrap(`
      <h2 style="color:#1e40af;margin:0 0 12px">¡Pedido recibido!</h2>
      <p>Hemos recibido tu pedido <strong>{{orderId}}</strong> para recogida en nuestra tienda <strong>{{tiendaNombre}}</strong>.</p>
      <p>Total: <strong>{{total}}€</strong> — Pago al recoger.</p>
      <p>Te avisaremos por email cuando tu pedido esté preparado para recoger.</p>
      <p style="color:#6b7280;font-size:13px">Dirección de recogida: {{tiendaDireccion}}</p>
      <a href="{{appUrl}}/cuenta/pedidos" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
        Ver mis pedidos
      </a>
    `),
  },
  pedido_listo_recoger: {
    subject: "Tu pedido {{orderId}} está listo para recoger",
    html: wrap(`
      <h2 style="color:#16a34a;margin:0 0 12px">¡Listo para recoger!</h2>
      <p>Tu pedido <strong>{{orderId}}</strong> ya está preparado en <strong>{{tiendaNombre}}</strong>.</p>
      <p style="color:#6b7280;font-size:13px">{{tiendaDireccion}} — Horario: {{tiendaHorario}}</p>
      <p>Recuerda llevar tu DNI y el número de pedido. Pago en tienda: <strong>{{total}}€</strong>.</p>
    `),
  },
  pedido_enviado: {
    subject: "Tu pedido {{orderId}} ha sido enviado",
    html: wrap(`
      <h2 style="color:#16a34a;margin:0 0 12px">¡Pedido enviado!</h2>
      <p>Tu pedido <strong>{{orderId}}</strong> está de camino.</p>
      <p>Seguimiento: <strong>{{tracking}}</strong></p>
      <a href="{{trackingUrl}}" style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
        Seguir envío
      </a>
    `),
  },
  pedido_cancelado: {
    subject: "Pedido {{orderId}} cancelado — TCG Academy",
    html: wrap(`
      <h2 style="color:#dc2626;margin:0 0 12px">Pedido cancelado</h2>
      <p>Tu pedido <strong>{{orderId}}</strong> ha sido cancelado.</p>
      <p>Si tienes alguna duda, no dudes en contactarnos.</p>
    `),
  },
  recuperar_contrasena: {
    subject: "Restablece tu contraseña — TCG Academy",
    html: wrap(`
      <h2 style="color:#1e40af;margin:0 0 12px">Restablecer contraseña</h2>
      <p>Has solicitado restablecer tu contraseña.</p>
      <p>Haz clic en el siguiente enlace (válido durante 1 hora):</p>
      <a href="{{resetLink}}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
        Restablecer contraseña
      </a>
      <p style="color:#666;font-size:13px">Si no has solicitado este cambio, ignora este email.</p>
    `),
  },
  devolucion_aceptada: {
    subject: "Devolución {{rmaNumber}} aceptada — TCG Academy",
    html: wrap(`
      <h2 style="color:#f59e0b;margin:0 0 12px">Devolución aceptada</h2>
      <p>Tu solicitud de devolución <strong>{{rmaNumber}}</strong> ha sido aceptada.</p>
      <p>Por favor, envía los productos a la dirección indicada. Una vez recibidos, procesaremos el reembolso.</p>
    `),
  },
  admin_nuevo_pedido: {
    subject: "[Admin] Nuevo pedido {{orderId}}",
    html: wrap(`
      <h2 style="color:#1e40af;margin:0 0 12px">Nuevo pedido recibido</h2>
      <p>Pedido: <strong>{{orderId}}</strong></p>
      <p>Cliente: {{customerName}} ({{customerEmail}})</p>
      <p>Total: <strong>{{total}}€</strong></p>
      <a href="{{appUrl}}/admin/pedidos" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
        Ver en admin
      </a>
    `),
  },
};

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
