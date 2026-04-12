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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _buildInvitationHtml_DEPRECATED(toName: string, fromName: string): string {
  const fromInitial = fromName.charAt(0).toUpperCase();
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Invitación al grupo — TCG Academy</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b}
    .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.10)}
    .hdr{background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:40px 32px 36px;text-align:center;position:relative;overflow:hidden}
    .hdr::before{content:'';position:absolute;top:-40px;right:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.06)}
    .badge{display:inline-block;background:#f59e0b;color:#fff;font-size:11px;font-weight:800;padding:5px 16px;border-radius:999px;letter-spacing:.8px;text-transform:uppercase;margin-bottom:18px}
    .logo{font-size:26px;font-weight:900;color:#fff;margin-bottom:6px}
    .logo-sub{font-size:14px;color:#bfdbfe}
    .body{padding:36px 32px 28px}
    .greeting{font-size:22px;font-weight:800;color:#0f172a;margin-bottom:10px}
    .intro{font-size:15px;color:#475569;line-height:1.75;margin-bottom:28px}
    .box{background:linear-gradient(135deg,#eff6ff 0%,#f0fdf4 100%);border:2px solid #bfdbfe;border-radius:16px;padding:24px;margin-bottom:28px}
    .sender-row{display:flex;align-items:center;gap:14px;margin-bottom:20px}
    .av{width:54px;height:54px;background:#2563eb;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#fff;flex-shrink:0}
    .sender-name{font-size:17px;font-weight:800;color:#0f172a}
    .sender-lbl{font-size:12px;color:#64748b;margin-top:3px}
    hr{border:none;border-top:1px solid #e2e8f0;margin:0 0 16px}
    .ben{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid #e2e8f0}
    .ben:last-child{border-bottom:none;padding-bottom:0}
    .ben-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
    .ben-text{font-size:14px;color:#374151;line-height:1.6}
    .cta-wrap{text-align:center;margin:28px 0 24px}
    .cta{display:inline-block;background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;font-size:16px;font-weight:800;padding:15px 40px;border-radius:14px;text-decoration:none;box-shadow:0 4px 16px rgba(37,99,235,.35)}
    .note{background:#fef9c3;border-left:4px solid #f59e0b;border-radius:10px;padding:14px 18px;font-size:13px;color:#92400e;line-height:1.7;margin-bottom:24px}
    .small{font-size:13px;color:#94a3b8;line-height:1.65}
    .ftr{background:#f8fafc;border-top:1px solid #e9edf2;padding:24px 32px;text-align:center}
    .ftr p{font-size:12px;color:#94a3b8;line-height:1.75}
    .ftr a{color:#2563eb;text-decoration:none}
  </style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="badge">Invitación al grupo</div>
    <div class="logo">🎮 TCG Academy</div>
    <div class="logo-sub">Tu tienda de cartas coleccionables</div>
  </div>
  <div class="body">
    <p class="greeting">¡Hola, ${toName}!</p>
    <p class="intro">Has recibido una <strong>solicitud de asociación</strong> en TCG Academy. Si la aceptas, ambos ganaréis puntos automáticamente cada vez que cualquiera de vosotros realice una compra. Sin coste, sin obligaciones.</p>
    <div class="box">
      <div class="sender-row">
        <div class="av">${fromInitial}</div>
        <div>
          <div class="sender-name">${fromName}</div>
          <div class="sender-lbl">te invita a unirte a su grupo</div>
        </div>
      </div>
      <hr/>
      <div class="ben"><div class="ben-icon" style="background:#eff6ff">🛒</div><div class="ben-text">Cuando <strong>${fromName}</strong> compre, <strong>tú recibes 50 pts por cada €100</strong> de su pedido (= €0.50 de descuento) — automáticamente</div></div>
      <div class="ben"><div class="ben-icon" style="background:#f0fdf4">💰</div><div class="ben-text">Cuando <strong>tú compres</strong>, <strong>${fromName} recibe 50 pts por cada €100</strong> de tu pedido (= €0.50 de descuento)</div></div>
      <div class="ben"><div class="ben-icon" style="background:#fef3c7">⭐</div><div class="ben-text"><strong>100 puntos = €1 de descuento</strong> en cualquier compra. Los puntos se acumulan sin fecha límite</div></div>
    </div>
    <div class="cta-wrap"><a href="https://tcgacademy.es/cuenta/grupo" class="cta">Ver solicitud →</a></div>
    <div class="note">💡 <strong>¿Cómo funciona?</strong> Accede a tu cuenta en TCG Academy, entra en <em>Mi grupo</em> y acepta o rechaza la solicitud. Puedes tener hasta <strong>4 personas en tu grupo</strong>.</div>
    <p class="small">Si no conoces a <strong>${fromName}</strong> o no esperabas esta solicitud, simplemente ignórala o recházala desde tu cuenta.</p>
  </div>
  <div class="ftr">
    <p>© 2026 TCG Academy — Tu tienda de cartas coleccionables<br/><a href="https://tcgacademy.es">tcgacademy.es</a> · <a href="https://tcgacademy.es/cuenta/grupo">Mi grupo</a></p>
    <p style="margin-top:8px">Este correo fue generado automáticamente. Por favor, no respondas a este mensaje.</p>
  </div>
</div>
</body>
</html>`;
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

  // DEV: log only
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info("[emailService] Incident reply (dev stub):", data);
  }
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
