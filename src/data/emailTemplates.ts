// ─── Email Templates ─────────────────────────────────────────────────────────
// Plantillas HTML transaccionales de TCG Academy.
// Variables entre {{dobles_llaves}} se sustituyen al enviar.
// Estilo: paleta del footer real de la web — dark navy (#0a1530), mid blue
// (#15306b) y acento (#2549a8). El logo de cabecera es el escudo oficial
// servido como URL absoluta (los clientes de email no resuelven rutas
// relativas al dominio).

import { SITE_CONFIG } from "@/config/siteConfig";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  variables: string[];
  html: string;
}

// URL absoluta del escudo (los emails se abren fuera del dominio).
// `-trimmed` es la versión sin padding transparente alrededor — evita que
// algunos clientes (Outlook, Gmail-app) lo recorten al ajustarlo a 72px.
const SHIELD_URL = "https://tcgacademy.es/images/logo-tcg-shield-trimmed.png";
const SITE_URL = "https://tcgacademy.es";

// ─── PALETA OFICIAL (la misma de la web) ─────────────────────────────────────
//  Navy header  : #132B5F   (Header.tsx — color sólido, sin gradiente)
//  Navy footer  : #0a1530   (Footer.tsx — fondo navy oscuro)
//  Mid blue     : #15306b   (gradiente medio del site)
//  Accent blue  : #2549a8   (links, focus)
//  Amber CTA    : #fbbf24   (botones primarios, igual a "Crear cuenta" del site)
//  Amber dark   : #0a1628   (texto sobre amber, alto contraste)
//  Bg soft      : #f5f7fb   (fondo fuera del wrapper)
//  Ink-900      : #0f172a   (texto principal sobre blanco)
//  Ink-600      : #475569   (texto secundario)
//  Ink-400      : #94a3b8   (terciario)
//  Line         : #e2e8f0   (bordes suaves)

const BASE_STYLES = `
  <style>
    body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f7fb; -webkit-font-smoothing: antialiased; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }

    /* ── Header (escudo + marca) — sólido #132B5F, igual a la web ────────── */
    .header {
      background: #132B5F;
      padding: 16px 40px 14px;
      text-align: center;
    }
    .header-shield { display: block; margin: 0 auto 6px; width: 52px; height: 52px; border: 0; outline: none; }
    .header-logo { color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; }
    .header-sub { display: none; }

    /* ── Top buttons (acceso rápido) — barra ámbar fina ─────────────────── */
    .top-btns { background: #fbbf24; padding: 10px 40px; text-align: center; }
    .top-btns a {
      display: inline-block;
      color: #0a1628 !important;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      text-decoration: none;
      margin: 0 6px;
    }
    .top-btns a + a { border-left: 1px solid rgba(10, 22, 40, 0.25); padding-left: 16px; }

    /* ── Progreso del pedido (table-based para compat. Outlook/Gmail-app) ── */
    .progress { padding: 26px 24px 22px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .progress-table { width: 100%; max-width: 520px; margin: 0 auto; border-collapse: collapse; }
    .progress-table td { padding: 0; vertical-align: middle; }
    .prog-cell { width: 68px; text-align: center; }
    .prog-icon {
      width: 44px; height: 44px; line-height: 44px;
      border-radius: 50%; margin: 0 auto;
      font-size: 20px; text-align: center;
      mso-line-height-rule: exactly;
    }
    .prog-icon.done { background: #2549a8; color: #ffffff; box-shadow: 0 0 0 4px rgba(37, 73, 168, 0.14); }
    .prog-icon.pending { background: #e2e8f0; color: #94a3b8; border: 2px solid #cbd5e1; line-height: 40px; }
    .prog-label { font-size: 11px; font-weight: 700; color: #94a3b8; padding-top: 8px; letter-spacing: 0.02em; }
    .prog-label.done { color: #2549a8; }
    .prog-line-cell { padding: 0 4px; }
    .prog-line { height: 3px; border-radius: 2px; font-size: 0; line-height: 3px; }
    .prog-line.done { background: #2549a8; }
    .prog-line.pending { background: #e2e8f0; }

    /* ── Hero (cabecera del mensaje) — blanco, título oscuro, sin bloque ─ */
    .hero {
      background: #ffffff;
      padding: 32px 40px 8px;
      text-align: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .hero h1 { color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.3px; }
    .hero p { color: #64748b; font-size: 14px; margin: 0 0 18px; }
    /* Variante: barra superior de color para tipo de email (success / error / info) */
    .hero-accent { display: inline-block; height: 3px; width: 48px; border-radius: 2px; background: #fbbf24; margin: 0 0 14px; }
    .hero-accent.ok { background: #16a34a; }
    .hero-accent.err { background: #dc2626; }
    .hero-accent.info { background: #2549a8; }
    .hero-accent.muted { background: #94a3b8; }

    /* ── Contenido ───────────────────────────────────────────────────────── */
    .content { padding: 32px 40px; }
    .content p { color: #334155; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
    .content a { color: #2549a8; }

    /* ── Botones — ámbar igual al CTA "Crear cuenta" de la web ──────────── */
    .btn {
      display: inline-block;
      background: #fbbf24;
      color: #0a1628 !important;
      font-weight: 800;
      font-size: 15px;
      padding: 13px 32px;
      border-radius: 999px;
      text-decoration: none;
      margin: 8px 0;
    }
    .btn-secondary {
      display: inline-block;
      background: #ffffff;
      color: #132B5F !important;
      font-weight: 700;
      font-size: 14px;
      padding: 11px 26px;
      border-radius: 999px;
      text-decoration: none;
      border: 1.5px solid #132B5F;
      margin: 8px 0;
    }

    /* ── Tablas ──────────────────────────────────────────────────────────── */
    .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .order-table th {
      background: #f1f5f9;
      padding: 10px 14px;
      text-align: left;
      font-size: 11px;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 2px solid #e2e8f0;
    }
    .order-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; }
    .total-row td { font-weight: 800; font-size: 16px; color: #0f172a; background: #eef2fb; border-top: 2px solid #2549a8; }

    /* ── Cajas de información ────────────────────────────────────────────── */
    .info-box {
      background: #f4f7fc;
      border-left: 4px solid #2549a8;
      padding: 16px 20px;
      border-radius: 0 12px 12px 0;
      margin: 20px 0;
      color: #1e293b;
    }
    .badge {
      display: inline-block;
      background: #dde6f7;
      color: #15306b;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ── Tracking ────────────────────────────────────────────────────────── */
    .tracking-box {
      background: #f4f7fc;
      border: 2px solid #2549a8;
      border-radius: 16px;
      padding: 22px;
      text-align: center;
      margin: 22px 0;
    }
    .tracking-num {
      font-size: 28px;
      font-weight: 900;
      color: #15306b;
      letter-spacing: 2px;
      font-family: 'Courier New', monospace;
    }

    /* ── Puntos ──────────────────────────────────────────────────────────── */
    .points-box {
      background: #132B5F;
      border-radius: 16px;
      padding: 26px;
      text-align: center;
      margin: 22px 0;
      color: #ffffff;
    }
    .points-number { font-size: 48px; font-weight: 900; color: #ffffff; line-height: 1; }
    .points-box p { color: #c7d4ef !important; }

    /* ── Cupón ───────────────────────────────────────────────────────────── */
    .coupon-box {
      border: 3px dashed #2549a8;
      border-radius: 16px;
      padding: 26px;
      text-align: center;
      margin: 22px 0;
      background: #f4f7fc;
    }
    .coupon-code {
      font-size: 32px;
      font-weight: 900;
      color: #15306b;
      letter-spacing: 4px;
      font-family: 'Courier New', monospace;
    }

    /* ── Caja legal ──────────────────────────────────────────────────────── */
    .legal-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 24px 0 0; }
    .legal-box p { color: #94a3b8 !important; font-size: 10px !important; line-height: 1.55; margin: 0 0 6px !important; }

    /* ── Footer — sólido #0a1530 (igual a la web), sin radial gradients ── */
    .footer {
      background: #0a1530;
      padding: 22px 40px 20px;
      text-align: center;
      color: #c7d4ef;
    }
    .footer p { color: #c7d4ef; font-size: 12px; line-height: 1.6; margin: 0 0 6px; }
    .footer a { color: #ffffff; text-decoration: underline; }
    .footer .legal { color: #93a3c2 !important; font-size: 11px !important; }
    .footer-divider { height: 1px; background: rgba(255, 255, 255, 0.12); margin: 14px 0; }

    @media (max-width: 600px) {
      .content { padding: 24px 22px; }
      .header { padding: 14px 22px 12px; }
      .top-btns { padding: 8px 22px; }
      .footer { padding: 20px 22px; }
      .hero { padding: 24px 22px 6px; }
      .hero h1 { font-size: 20px; }
      .header-shield { width: 48px !important; height: 48px !important; }
      .header-logo { font-size: 12px; letter-spacing: 2.5px; }
      .progress { padding: 22px 12px 18px; }
      .prog-cell { width: 56px; }
      .prog-icon { width: 38px; height: 38px; line-height: 38px; font-size: 16px; }
      .prog-icon.pending { line-height: 34px; }
      .prog-label { font-size: 10px; }
    }
  </style>
`;

const FOOTER_HTML = `
  <div class="footer">
    <p><strong style="color:#ffffff;">${SITE_CONFIG.name}</strong> · <a href="mailto:${SITE_CONFIG.email}">${SITE_CONFIG.email}</a> · <a href="tel:${SITE_CONFIG.phone.replace(/\s+/g, "")}">${SITE_CONFIG.phone}</a></p>
    <p>${SITE_CONFIG.address}</p>
    <div class="footer-divider"></div>
    <p class="legal">
      Has recibido este email porque tienes una cuenta en ${SITE_CONFIG.name}.<br/>
      <a href="{{unsubscribe_link}}">Cancelar suscripción</a> ·
      <a href="${SITE_URL}/privacidad">Política de privacidad</a>
    </p>
    <p class="legal">
      ${SITE_CONFIG.name} es una marca de ${SITE_CONFIG.legalName}. CIF: ${SITE_CONFIG.cif}. ©${new Date().getFullYear()} ${SITE_CONFIG.legalName}. Todos los derechos reservados.
    </p>
  </div>
`;

function wrapEmail(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TCG Academy</title>
  ${BASE_STYLES}
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <img src="${SHIELD_URL}" alt="TCG Academy" class="header-shield" width="84" height="84" style="display:block;margin:0 auto 14px;width:84px;height:84px;border:0;outline:none;" />
      <div class="header-logo">TCG Academy</div>
      <div class="header-sub">Tu tienda de cartas coleccionables</div>
    </div>
    ${content}
    ${FOOTER_HTML}
  </div>
</body>
</html>`;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "bienvenida",
    name: "Bienvenida",
    subject: "¡Bienvenido/a a TCG Academy, {{nombre}}!",
    description: "Se envía cuando un usuario se registra.",
    variables: ["nombre", "email", "unsubscribe_link"],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent"></span>
        <h1>¡Bienvenido/a, {{nombre}}!</h1>
        <p>Tu cuenta en TCG Academy está lista</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Nos alegra que hayas decidido unirte a la comunidad TCG Academy. Aquí encontrarás todo lo que necesitas para disfrutar de tus juegos de cartas favoritos: Pokémon, Magic, One Piece, Yu-Gi-Oh y muchos más.</p>
        <div class="info-box">
          <strong>Regalo de bienvenida</strong><br/>
          Hemos añadido <strong>50 puntos</strong> a tu cuenta y tienes un cupón de <strong>15% de descuento</strong> en tu primera compra esperándote.
        </div>
        <p style="text-align:center; margin: 28px 0;">
          <a href="${SITE_URL}/catalogo" class="btn">Empezar a explorar</a>
          <br/>
          <a href="${SITE_URL}/cuenta" class="btn-secondary" style="margin-top:12px;">Ver mi cuenta</a>
        </p>
        <p>Si tienes cualquier duda, estamos aquí para ayudarte en <a href="mailto:${SITE_CONFIG.email}">${SITE_CONFIG.email}</a>.</p>
        <p>¡Buenas partidas!<br/><strong>El equipo de ${SITE_CONFIG.name}</strong></p>
      </div>
    `),
  },
  {
    id: "confirmacion_pedido",
    name: "Confirmación de pedido",
    subject: "Pedido #{{order_id}} confirmado — TCG Academy",
    description: "Se envía al confirmar un pedido.",
    variables: [
      "nombre",
      "order_id",
      "order_date",
      "items_html",
      "subtotal",
      "shipping",
      "total",
      "address",
      "payment_method",
      "unsubscribe_link",
    ],
    html: wrapEmail(`
      <div class="top-btns">
        <a href="${SITE_URL}/cuenta/pedidos">Mis pedidos</a>
        <a href="${SITE_URL}/cuenta">Mi cuenta</a>
        <a href="${SITE_URL}/catalogo">Volver a comprar</a>
      </div>
      <div class="hero">
        <span class="hero-accent"></span>
        <h1>¡Pedido confirmado!</h1>
        <p>Estamos preparando tu pedido con todo el cariño</p>
      </div>
      <div class="progress">
        <table role="presentation" class="progress-table" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="prog-cell"><div class="prog-icon done">🛒</div></td>
            <td class="prog-line-cell"><div class="prog-line done">&nbsp;</div></td>
            <td class="prog-cell"><div class="prog-icon done">💳</div></td>
            <td class="prog-line-cell"><div class="prog-line pending">&nbsp;</div></td>
            <td class="prog-cell"><div class="prog-icon pending">📦</div></td>
            <td class="prog-line-cell"><div class="prog-line pending">&nbsp;</div></td>
            <td class="prog-cell"><div class="prog-icon pending">🚚</div></td>
          </tr>
          <tr>
            <td class="prog-cell"><div class="prog-label done">Pedido</div></td>
            <td></td>
            <td class="prog-cell"><div class="prog-label done">Pagado</div></td>
            <td></td>
            <td class="prog-cell"><div class="prog-label">Preparando</div></td>
            <td></td>
            <td class="prog-cell"><div class="prog-label">Enviado</div></td>
          </tr>
        </table>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Hemos recibido y cobrado tu pedido. Ya está en nuestras manos para preparar el envío. Aquí tienes el resumen:</p>
        <div class="info-box">
          <span class="badge">Pedido #{{order_id}}</span>
          &nbsp; Fecha: <strong>{{order_date}}</strong>
        </div>
        <table class="order-table">
          <thead>
            <tr><th>Producto</th><th>Cant.</th><th>Precio</th></tr>
          </thead>
          <tbody>
            {{items_html}}
          </tbody>
          <tfoot>
            <tr><td colspan="2">Subtotal</td><td>{{subtotal}}€</td></tr>
            <tr><td colspan="2">Envío</td><td>{{shipping}}</td></tr>
            <tr class="total-row"><td colspan="2">TOTAL</td><td>{{total}}€</td></tr>
          </tfoot>
        </table>
        <p><strong>Dirección de envío:</strong><br/>{{address}}</p>
        <p><strong>Método de pago:</strong> {{payment_method}}</p>
        <p style="text-align:center; margin: 28px 0;">
          <a href="${SITE_URL}/cuenta/pedidos/{{order_id}}" class="btn">Ver estado del pedido</a>
        </p>
        <p>¡Gracias por confiar en nosotros!<br/><strong>El equipo de TCG Academy</strong></p>
        <div class="legal-box">
          <p>Este email confirma la recepción de tu pedido. El contrato de compraventa se perfecciona en el momento del pago. TCG Academy se reserva el derecho de cancelar pedidos en caso de error de precio o falta de stock.</p>
          <p>De conformidad con el art. 102 TRLGDCU, dispones de 14 días naturales para ejercer tu derecho de desistimiento desde la recepción del pedido, salvo productos precintados de contenido digital.</p>
          <p>${SITE_CONFIG.name} es una marca de ${SITE_CONFIG.legalName} · CIF: ${SITE_CONFIG.cif} · ${SITE_CONFIG.address} (España)</p>
        </div>
      </div>
    `),
  },
  {
    id: "pedido_enviado",
    name: "Pedido enviado",
    subject: "Tu pedido #{{order_id}} está en camino",
    description: "Se envía cuando el pedido sale del almacén.",
    variables: [
      "nombre",
      "order_id",
      "tracking_number",
      "carrier",
      "tracking_url",
      "unsubscribe_link",
    ],
    html: wrapEmail(`
      <div class="top-btns">
        <a href="${SITE_URL}/cuenta/pedidos">Mis pedidos</a>
        <a href="${SITE_URL}/cuenta">Mi cuenta</a>
        <a href="${SITE_URL}/catalogo">Volver a comprar</a>
      </div>
      <div class="hero">
        <span class="hero-accent ok"></span>
        <h1>¡Tu pedido está en camino!</h1>
        <p>Lo recibirás en las próximas 48 horas</p>
      </div>
      <div class="progress">
        <table role="presentation" class="progress-table" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="prog-cell"><div class="prog-icon done">🛒</div></td>
            <td class="prog-line-cell"><div class="prog-line done">&nbsp;</div></td>
            <td class="prog-cell"><div class="prog-icon done">💳</div></td>
            <td class="prog-line-cell"><div class="prog-line done">&nbsp;</div></td>
            <td class="prog-cell"><div class="prog-icon done">📦</div></td>
            <td class="prog-line-cell"><div class="prog-line done">&nbsp;</div></td>
            <td class="prog-cell"><div class="prog-icon done">🚚</div></td>
          </tr>
          <tr>
            <td class="prog-cell"><div class="prog-label done">Pedido</div></td>
            <td></td>
            <td class="prog-cell"><div class="prog-label done">Pagado</div></td>
            <td></td>
            <td class="prog-cell"><div class="prog-label done">Preparando</div></td>
            <td></td>
            <td class="prog-cell"><div class="prog-label done">Enviado</div></td>
          </tr>
        </table>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>¡Buenas noticias! Tu pedido <strong>#{{order_id}}</strong> ha salido de nuestro almacén y está en camino. Lo recibirás en las <strong>próximas 48 horas</strong>.</p>
        <div class="tracking-box">
          <p style="margin:0 0 8px; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.05em;">Número de seguimiento {{carrier}}</p>
          <div class="tracking-num">{{tracking_number}}</div>
          <p style="margin:12px 0 0; font-size:13px; color:#334155;"><strong>Transportista:</strong> {{carrier}}</p>
          <p style="margin:16px 0 0;">
            <a href="{{tracking_url}}" class="btn" style="font-size:13px; padding:10px 24px;">Seguir mi envío en {{carrier}}</a>
          </p>
        </div>
        <p>Si tienes algún problema con la entrega, contacta con nosotros en <a href="mailto:${SITE_CONFIG.email}">${SITE_CONFIG.email}</a>.</p>
        <p><strong>El equipo de TCG Academy</strong></p>
        <div class="legal-box">
          <p>El plazo de 48 horas es orientativo y puede variar por causas ajenas a TCG Academy. En caso de incidencia con el transportista, abriremos una reclamación en un plazo máximo de 24 h hábiles.</p>
          <p>${SITE_CONFIG.name} es una marca de ${SITE_CONFIG.legalName} · CIF: ${SITE_CONFIG.cif} · ${SITE_CONFIG.address} (España)</p>
        </div>
      </div>
    `),
  },
  {
    id: "factura_disponible",
    name: "Factura disponible",
    subject: "Tu factura FAC-{{invoice_id}} está disponible — TCG Academy",
    description: "Se envía cuando la factura de un pedido está lista.",
    variables: [
      "nombre",
      "invoice_id",
      "order_id",
      "invoice_date",
      "total",
      "download_url",
      "unsubscribe_link",
    ],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent"></span>
        <h1>Tu factura está disponible</h1>
        <p>Pedido #{{order_id}}</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>La factura de tu pedido ya está disponible para su descarga:</p>
        <div class="info-box">
          <p style="margin:0;"><strong>Nº Factura:</strong> FAC-{{invoice_id}}</p>
          <p style="margin:8px 0 0;"><strong>Pedido:</strong> #{{order_id}}</p>
          <p style="margin:8px 0 0;"><strong>Fecha:</strong> {{invoice_date}}</p>
          <p style="margin:8px 0 0;"><strong>Importe:</strong> <span style="color:#15306b; font-weight:800; font-size:18px;">{{total}}€</span></p>
        </div>
        <p style="text-align:center; margin: 28px 0;">
          <a href="{{download_url}}" class="btn">Descargar factura PDF</a>
        </p>
        <p>También puedes acceder a todas tus facturas desde tu área de cliente.</p>
        <p><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "albaran_disponible",
    name: "Albarán disponible",
    subject: "Tu albarán {{albaran_id}} — TCG Academy",
    description:
      "Se envía cuando se emite un albarán manual al cliente. Adjunta el PDF del albarán (no es factura, no entra en VeriFactu).",
    variables: [
      "nombre",
      "albaran_id",
      "albaran_date",
      "total",
      "unsubscribe_link",
    ],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent"></span>
        <h1>Albarán de entrega</h1>
        <p>Documento {{albaran_id}}</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Te adjuntamos en este email el albarán de entrega correspondiente a tu pedido:</p>
        <div class="info-box">
          <p style="margin:0;"><strong>Nº Albarán:</strong> {{albaran_id}}</p>
          <p style="margin:8px 0 0;"><strong>Fecha:</strong> {{albaran_date}}</p>
          <p style="margin:8px 0 0;"><strong>Importe:</strong> <span style="color:#15306b; font-weight:800; font-size:18px;">{{total}}€</span></p>
        </div>
        <p style="font-size:13px; color:#475569;">El albarán es un documento de entrega que acredita la salida de la mercancía. No es una factura ni sustituye a la factura — si necesitas factura para tus registros contables, indícanoslo y la emitiremos.</p>
        <p>Si tienes cualquier duda sobre la entrega, escríbenos a <a href="mailto:${SITE_CONFIG.email}">${SITE_CONFIG.email}</a>.</p>
        <p><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "nuevo_cupon",
    name: "Nuevo cupón",
    subject: "¡Tienes un nuevo cupón de descuento, {{nombre}}!",
    description: "Se envía cuando se asigna un cupón a un usuario.",
    variables: [
      "nombre",
      "coupon_code",
      "coupon_description",
      "coupon_value",
      "expires_at",
      "shop_url",
      "unsubscribe_link",
    ],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent"></span>
        <h1>Un regalo para ti</h1>
        <p>Hemos preparado un descuento exclusivo</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>{{coupon_description}} Aquí tienes tu código de descuento:</p>
        <div class="coupon-box">
          <p style="color:#475569; font-size:12px; margin:0 0 8px; text-transform:uppercase; letter-spacing:0.05em; font-weight:700;">Tu código exclusivo</p>
          <div class="coupon-code">{{coupon_code}}</div>
          <p style="color:#15306b; font-weight:700; font-size:20px; margin:12px 0 4px;">{{coupon_value}} de descuento</p>
          <p style="color:#94a3b8; font-size:12px; margin:0;">Válido hasta el {{expires_at}}</p>
        </div>
        <p style="text-align:center; margin: 24px 0;">
          <a href="{{shop_url}}" class="btn">Usar mi cupón ahora</a>
        </p>
        <p style="font-size:12px; color:#94a3b8;">Introduce el código en el carrito antes de finalizar tu compra. Un solo uso por cliente.</p>
        <p><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "puntos_anadidos",
    name: "Puntos añadidos",
    subject: "Has ganado {{points}} puntos en TCG Academy",
    description: "Se envía cuando se añaden puntos a la cuenta del usuario.",
    variables: [
      "nombre",
      "points",
      "reason",
      "current_balance",
      "redeem_url",
      "unsubscribe_link",
    ],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent"></span>
        <h1>¡Puntos añadidos!</h1>
        <p>Sigue acumulando y canjéalos por descuentos</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>{{reason}} Te hemos añadido nuevos puntos a tu cuenta de fidelidad:</p>
        <div class="points-box">
          <div class="points-number">+{{points}}</div>
          <p style="font-weight:600; margin:8px 0 0;">puntos ganados</p>
          <p style="font-size:14px; margin:4px 0 0;">Tu saldo actual: <strong style="color:#ffffff;">{{current_balance}} puntos</strong></p>
        </div>
        <p style="text-align:center;">
          <a href="{{redeem_url}}" class="btn-secondary">Ver mis puntos y canjear</a>
        </p>
        <p style="font-size:13px; color:#475569; text-align:center;">Recuerda: 10.000 puntos = 1€ de descuento en tu próxima compra.</p>
        <p><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "devolucion_aceptada",
    name: "Devolución aceptada",
    subject: "Tu devolución #{{return_id}} ha sido aceptada",
    description: "Se envía cuando una devolución es aprobada.",
    variables: [
      "nombre",
      "return_id",
      "order_id",
      "refund_amount",
      "refund_method",
      "refund_days",
      "unsubscribe_link",
    ],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent ok"></span>
        <h1>Devolución aceptada</h1>
        <p>Tu reembolso está en camino</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Hemos revisado tu solicitud de devolución <strong>#{{return_id}}</strong> del pedido <strong>#{{order_id}}</strong> y ha sido <strong>aceptada</strong>.</p>
        <div class="info-box">
          <p style="margin:0;"><strong>Importe del reembolso:</strong> <span style="color:#047857; font-size:20px; font-weight:800;">{{refund_amount}}€</span></p>
          <p style="margin:8px 0 0;"><strong>Método de reembolso:</strong> {{refund_method}}</p>
          <p style="margin:8px 0 0;"><strong>Plazo estimado:</strong> {{refund_days}} días hábiles</p>
        </div>
        <p>Recibirás el reembolso en el método de pago original. Si tienes alguna duda, escríbenos a <a href="mailto:${SITE_CONFIG.email}">${SITE_CONFIG.email}</a>.</p>
        <p>Disculpa las molestias.<br/><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "devolucion_rechazada",
    name: "Devolución rechazada",
    subject: "Tu devolución #{{return_id}} no ha sido aceptada",
    description:
      "Se envía cuando una devolución es rechazada tras revisión. Indica el motivo.",
    variables: ["nombre", "return_id", "order_id", "motivo", "unsubscribe_link"],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent err"></span>
        <h1>Devolución no aceptada</h1>
        <p>Tu solicitud ha sido revisada</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Sentimos comunicarte que tu solicitud de devolución <strong>#{{return_id}}</strong> del pedido <strong>#{{order_id}}</strong> no ha sido aceptada.</p>
        <div class="info-box" style="border-left-color:#b91c1c; background:#fef4f4;">
          <p style="margin:0;"><strong>Motivo:</strong></p>
          <p style="margin:8px 0 0;">{{motivo}}</p>
        </div>
        <p>Si crees que se trata de un error o tienes alguna duda, escríbenos a <a href="mailto:${SITE_CONFIG.email}">${SITE_CONFIG.email}</a> y revisaremos tu caso.</p>
        <p>Gracias por tu comprensión.<br/><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "devolucion_reembolsada",
    name: "Devolución reembolsada",
    subject: "Reembolso emitido — devolución #{{return_id}}",
    description:
      "Se envía cuando la devolución se marca como reembolsada y se emite factura rectificativa.",
    variables: [
      "nombre",
      "return_id",
      "order_id",
      "refund_amount",
      "rectificativa_number",
      "iban_masked",
      "unsubscribe_link",
    ],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent ok"></span>
        <h1>Reembolso emitido</h1>
        <p>Tu dinero está de camino</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Hemos procesado el reembolso de tu devolución <strong>#{{return_id}}</strong> (pedido <strong>#{{order_id}}</strong>).</p>
        <div class="info-box">
          <p style="margin:0;"><strong>Importe:</strong> <span style="color:#047857; font-size:20px; font-weight:800;">{{refund_amount}}€</span></p>
          <p style="margin:8px 0 0;"><strong>IBAN:</strong> {{iban_masked}}</p>
          <p style="margin:8px 0 0;"><strong>Factura rectificativa:</strong> {{rectificativa_number}}</p>
        </div>
        <p>La transferencia puede tardar 1–3 días hábiles en aparecer en tu banco, dependiendo de tu entidad.</p>
        <p>Gracias por tu paciencia.<br/><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "devolucion_cancelada",
    name: "Devolución cancelada",
    subject: "Devolución #{{return_id}} cancelada",
    description:
      "Se envía cuando se cancela una devolución (por el cliente o el admin).",
    variables: ["nombre", "return_id", "order_id", "motivo", "unsubscribe_link"],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent muted"></span>
        <h1>Devolución cancelada</h1>
        <p>La solicitud ya no está activa</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Te confirmamos que la devolución <strong>#{{return_id}}</strong> del pedido <strong>#{{order_id}}</strong> ha sido cancelada.</p>
        <div class="info-box" style="border-left-color:#475569; background:#f1f5f9;">
          <p style="margin:0;"><strong>Motivo:</strong></p>
          <p style="margin:8px 0 0;">{{motivo}}</p>
        </div>
        <p>Si quieres volver a iniciar una devolución, puedes hacerlo desde tu cuenta o escribiéndonos a <a href="mailto:${SITE_CONFIG.email}">${SITE_CONFIG.email}</a>.</p>
        <p><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "verificar_email",
    name: "Verifica tu email",
    subject: "Confirma tu email — TCG Academy",
    description:
      "Se envía al registrarse para verificar que el email es real y del usuario.",
    variables: ["nombre", "verify_url", "expires_in", "unsubscribe_link"],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent"></span>
        <h1>Confirma tu email</h1>
        <p>Un paso más para activar tu cuenta</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Acabas de crear una cuenta en TCG Academy. Para asegurarnos de que este email es tuyo, haz clic en el botón de abajo para confirmarlo:</p>
        <p style="text-align:center; margin: 28px 0;">
          <a href="{{verify_url}}" class="btn">Verificar mi email</a>
        </p>
        <div class="info-box">
          Este enlace caduca en <strong>{{expires_in}}</strong>. Si no lo solicitaste, ignora este email — nadie podrá iniciar sesión en tu nombre.
        </div>
        <p style="color:#475569; font-size:13px">¿El botón no funciona? Copia y pega este enlace en tu navegador:<br/><a href="{{verify_url}}" style="word-break:break-all; color:#2549a8">{{verify_url}}</a></p>
        <p><strong>El equipo de ${SITE_CONFIG.name}</strong></p>
      </div>
    `),
  },
  {
    id: "recuperar_contrasena",
    name: "Recuperar contraseña",
    subject: "Restablece tu contraseña de TCG Academy",
    description:
      "Se envía cuando el usuario solicita un reseteo de contraseña.",
    variables: ["nombre", "reset_url", "expires_in", "unsubscribe_link"],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent"></span>
        <h1>Recupera tu contraseña</h1>
        <p>Has solicitado restablecer tu contraseña</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Si fuiste tú, haz clic en el botón de abajo:</p>
        <p style="text-align:center; margin: 28px 0;">
          <a href="{{reset_url}}" class="btn">Restablecer contraseña</a>
        </p>
        <div class="info-box">
          Este enlace caducará en <strong>{{expires_in}}</strong>. Si no has solicitado este cambio, ignora este email y tu contraseña permanecerá sin cambios.
        </div>
        <p>Por seguridad, nunca te pediremos tu contraseña por email.</p>
        <p><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "carrito_abandonado",
    name: "Carrito abandonado",
    subject: "{{nombre}}, tu carrito te echa de menos",
    description:
      "Se envía cuando un usuario deja productos en el carrito sin completar la compra.",
    variables: [
      "nombre",
      "items_html",
      "cart_total",
      "cart_url",
      "coupon_code",
      "unsubscribe_link",
    ],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent info"></span>
        <h1>¡Olvidaste algo!</h1>
        <p>Tus cartas están esperando en el carrito</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Vimos que dejaste algunos productos en tu carrito sin finalizar la compra. ¡Están reservados para ti! Aquí tienes un resumen:</p>
        <table class="order-table">
          <tbody>
            {{items_html}}
          </tbody>
          <tfoot>
            <tr class="total-row"><td colspan="2">Total en carrito</td><td>{{cart_total}}€</td></tr>
          </tfoot>
        </table>
        <div class="coupon-box">
          <p style="color:#334155; margin:0 0 8px; font-size:14px;">¡Te damos un empujoncito! Usa este código y llévate un</p>
          <div class="coupon-code" style="font-size:24px;">{{coupon_code}}</div>
          <p style="color:#475569; font-size:12px; margin:8px 0 0;">Válido 48 horas · Solo para completar esta compra</p>
        </div>
        <p style="text-align:center; margin: 24px 0;">
          <a href="{{cart_url}}" class="btn">Completar mi pedido</a>
        </p>
        <p>Si tienes alguna duda sobre los productos o el envío, estamos aquí para ayudarte.</p>
        <p><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "asociacion_invitacion",
    name: "Invitación al grupo",
    subject: "{{fromName}} te invita a unirte a su grupo en TCG Academy",
    description: "Se envía cuando un usuario invita a otro a su grupo de fidelización.",
    variables: ["toName", "fromName", "fromInitial"],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent info"></span>
        <h1>¡Hola, {{toName}}!</h1>
        <p>Has recibido una invitación a un grupo</p>
      </div>
      <div class="content">
        <p>Has recibido una <strong>solicitud de asociación</strong> en TCG Academy. Si la aceptas, ambos ganaréis puntos automáticamente cada vez que cualquiera de vosotros realice una compra.</p>
        <div style="background:#f4f7fc; border:2px solid #dde6f7; border-radius:16px; padding:24px; margin:24px 0;">
          <div style="display:flex; align-items:center; gap:14px; margin-bottom:18px;">
            <div style="width:54px; height:54px; background:#2549a8; border-radius:999px; display:inline-flex; align-items:center; justify-content:center; font-size:20px; font-weight:900; color:#ffffff;">{{fromInitial}}</div>
            <div>
              <div style="font-size:17px; font-weight:800; color:#0f172a;">{{fromName}}</div>
              <div style="font-size:12px; color:#64748b; margin-top:3px;">te invita a unirte a su grupo</div>
            </div>
          </div>
          <hr style="border:none; border-top:1px solid #e2e8f0; margin:0 0 14px;"/>
          <div style="font-size:14px; color:#334155; line-height:1.7; padding:6px 0; border-bottom:1px solid #e2e8f0;">
            Cuando <strong>{{fromName}}</strong> compre, <strong>tú recibes 5.000 pts por cada €100</strong> de su pedido (= €0,50 de descuento)
          </div>
          <div style="font-size:14px; color:#334155; line-height:1.7; padding:10px 0; border-bottom:1px solid #e2e8f0;">
            Cuando <strong>tú compres</strong>, <strong>{{fromName}} recibe 5.000 pts por cada €100</strong> de tu pedido (= €0,50 de descuento)
          </div>
          <div style="font-size:14px; color:#334155; line-height:1.7; padding:10px 0 0;">
            <strong>10.000 puntos = €1 de descuento</strong> en cualquier compra. Los puntos no caducan
          </div>
        </div>
        <p style="text-align:center; margin: 28px 0;">
          <a href="${SITE_URL}/cuenta/grupo" class="btn">Ver solicitud</a>
        </p>
        <div class="info-box">
          <strong>¿Cómo funciona?</strong> Accede a tu cuenta, entra en <em>Mi grupo</em> y acepta o rechaza la solicitud. Puedes tener hasta <strong>4 personas en tu grupo</strong>.
        </div>
        <p style="font-size:13px; color:#94a3b8;">Si no conoces a <strong>{{fromName}}</strong> o no esperabas esta solicitud, simplemente ignórala o recházala desde tu cuenta.</p>
      </div>
    `),
  },
  {
    id: "restock_disponible",
    name: "Producto disponible (restock)",
    subject: "¡{{producto}} ya está disponible! — TCG Academy",
    description: "Se envía automáticamente cuando un producto vuelve a tener stock y el usuario pidió ser avisado.",
    variables: ["nombre", "producto", "producto_url", "producto_imagen"],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent"></span>
        <h1>¡Ya está disponible!</h1>
        <p>El producto que esperabas ha vuelto</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Te escribimos porque nos pediste que te avisáramos cuando <strong>{{producto}}</strong> volviera a estar disponible. ¡Buenas noticias: ya puedes conseguirlo!</p>
        <div class="info-box" style="text-align:center">
          <img src="{{producto_imagen}}" alt="{{producto}}" style="max-height:180px; margin:0 auto 16px; display:block; border-radius:12px" />
          <strong style="font-size:16px; color:#0f172a;">{{producto}}</strong><br/>
          <span style="color:#047857; font-weight:700;">En stock ahora</span>
        </div>
        <p style="text-align:center; margin: 28px 0;">
          <a href="{{producto_url}}" class="btn">Ver producto y comprar</a>
        </p>
        <p style="color:#475569; font-size:13px">Las unidades son limitadas y no podemos garantizar disponibilidad por mucho tiempo. Si lo quieres, te recomendamos no esperar.</p>
        <p>¡Buenas partidas!<br/><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "restock_suscripcion",
    name: "Confirmación de alerta de restock",
    subject: "Alerta activada — {{producto}} — TCG Academy",
    description: "Se envía cuando un usuario se suscribe para recibir aviso de restock de un producto agotado.",
    variables: ["nombre", "producto", "producto_url", "producto_imagen", "idioma"],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent"></span>
        <h1>Alerta activada</h1>
        <p>Te avisaremos en cuanto llegue</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Hemos registrado tu alerta para <strong>{{producto}}</strong>. En cuanto volvamos a recibir unidades te enviaremos un email para que puedas conseguirlo antes que nadie.</p>
        <div class="info-box" style="text-align:center">
          <img src="{{producto_imagen}}" alt="{{producto}}" style="max-height:160px; margin:0 auto 16px; display:block; border-radius:12px" />
          <strong style="font-size:16px; color:#0f172a;">{{producto}}</strong><br/>
          <span style="font-size:13px; color:#475569;">Idioma: {{idioma}}</span><br/>
          <span style="color:#15306b; font-weight:700; font-size:14px; margin-top:8px; display:inline-block;">Alerta activa — te avisaremos</span>
        </div>
        <div style="background:#eef2fb; border:2px solid #2549a8; border-radius:16px; padding:20px; text-align:center; margin:24px 0">
          <p style="margin:0 0 6px; font-size:14px; font-weight:700; color:#15306b;">¿Sabías que…?</p>
          <p style="margin:0; font-size:13px; color:#334155;">Los productos agotados suelen volver en cantidades muy limitadas. Al activar esta alerta tendrás ventaja para hacerte con él antes de que se agote de nuevo.</p>
        </div>
        <p style="text-align:center; margin: 24px 0;">
          <a href="{{producto_url}}" class="btn-secondary">Ver producto</a>
        </p>
        <p style="color:#475569; font-size:13px">Mientras tanto, puedes explorar el mismo producto en otros idiomas que sí tenemos disponibles. A veces la versión japonesa o coreana esconde las mismas cartas a un precio diferente.</p>
        <p>¡Buenas partidas!<br/><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "fiscal_recordatorio",
    name: "Recordatorio fiscal urgente (interno)",
    subject: "[Fiscal] {{severidad_label}} — Modelo {{modelo}} {{period}} ({{dias_texto}})",
    description:
      "Email interno automático que se envía al responsable fiscal cuando un modelo AEAT entra en estado urgente o vencido. Solo se envía una vez por notificación.",
    variables: [
      "nombre",
      "modelo",
      "period",
      "dias_texto",
      "deadline",
      "severidad_label",
      "instrucciones",
      "where",
      "aeat_url",
      "panel_url",
    ],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent err"></span>
        <h1>{{severidad_label}}</h1>
        <p>Modelo {{modelo}} — {{period}}</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Te avisamos de que el <strong>Modelo {{modelo}}</strong> correspondiente al período <strong>{{period}}</strong> está en estado <strong>{{severidad_label}}</strong>.</p>
        <div class="info-box" style="border-left-color:#b91c1c; background:#fef4f4;">
          <p style="margin:0;"><strong>Plazo:</strong> {{dias_texto}}</p>
          <p style="margin:8px 0 0;"><strong>Fecha límite:</strong> {{deadline}}</p>
          <p style="margin:8px 0 0;"><strong>Dónde presentar:</strong> {{where}}</p>
        </div>
        <p style="margin-top:20px"><strong>Pasos:</strong></p>
        <pre style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px; font-family:'Courier New', monospace; font-size:12px; color:#334155; white-space:pre-wrap;">{{instrucciones}}</pre>
        <p style="text-align:center; margin: 24px 0;">
          <a href="{{panel_url}}" class="btn">Abrir panel fiscal</a>
          &nbsp;
          <a href="{{aeat_url}}" class="btn-secondary">Ir a la sede AEAT</a>
        </p>
        <p style="color:#475569; font-size:13px">Este aviso lo genera automáticamente el motor fiscal de TCG Academy. El borrador del modelo ya está pre-calculado en el panel; solo necesitas validarlo y presentarlo.</p>
        <p><strong>Sistema fiscal — TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "invitacion_cuenta",
    name: "Invitación a crear cuenta (factura manual)",
    subject: "Activa tu cuenta en TCG Academy — factura {{numeroFactura}}",
    description:
      "Se envía automáticamente al emitir una factura manual a un cliente nuevo. Le invita a completar el alta online (contraseña, usuario, fecha de nacimiento).",
    variables: ["nombre", "numeroFactura", "urlActivacion", "expiraEn"],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent"></span>
        <h1>Bienvenido a TCG Academy</h1>
        <p>Completa tu cuenta para gestionar tus pedidos y facturas</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Acabamos de emitirte la factura <strong>{{numeroFactura}}</strong> y hemos creado un perfil de cliente con tus datos. Para que puedas consultar tus pedidos, descargar tus facturas y disfrutar del programa de puntos, sólo te falta activar tu acceso online.</p>
        <p style="text-align:center; margin: 28px 0;">
          <a href="{{urlActivacion}}" class="btn">Activar mi cuenta</a>
        </p>
        <div class="info-box">
          El enlace caduca en <strong>{{expiraEn}}</strong>. Al activarla, tendrás que elegir una contraseña, un nombre de usuario y confirmar tu fecha de nacimiento.
        </div>
        <p style="color:#475569; font-size:13px">¿El botón no funciona? Copia y pega este enlace en tu navegador:<br/><a href="{{urlActivacion}}" style="word-break:break-all; color:#2549a8">{{urlActivacion}}</a></p>
        <p style="color:#475569; font-size:13px">Si no reconoces esta compra o no quieres activar la cuenta, simplemente ignora este email — nadie podrá acceder en tu nombre.</p>
        <p><strong>El equipo de ${SITE_CONFIG.name}</strong></p>
      </div>
    `),
  },
  // ── Alias canónicos del flujo de pedidos (sustituyen a LEGACY_TEMPLATES).
  //    El estilo es el mismo wrapEmail() con escudo y paleta navy.
  {
    id: "pedido_confirmado",
    name: "Pedido confirmado (alias canónico)",
    subject: "Pedido #{{orderId}} confirmado — TCG Academy",
    description:
      "Alias del id usado por ORDER_TEMPLATE_MAP. Reemplaza al fallback legacy. Reutiliza la plantilla rica de confirmacion_pedido.",
    variables: ["nombre", "orderId", "total", "appUrl"],
    html: wrapEmail(`
      <div class="top-btns">
        <a href="${SITE_URL}/cuenta/pedidos">Mis pedidos</a>
        <a href="${SITE_URL}/cuenta">Mi cuenta</a>
        <a href="${SITE_URL}/catalogo">Volver a comprar</a>
      </div>
      <div class="hero">
        <span class="hero-accent"></span>
        <h1>¡Pedido confirmado!</h1>
        <p>Hemos recibido tu pedido y lo estamos preparando</p>
      </div>
      <div class="progress">
        <table role="presentation" class="progress-table" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="prog-cell"><div class="prog-icon done">🛒</div></td>
            <td class="prog-line-cell"><div class="prog-line done">&nbsp;</div></td>
            <td class="prog-cell"><div class="prog-icon done">💳</div></td>
            <td class="prog-line-cell"><div class="prog-line pending">&nbsp;</div></td>
            <td class="prog-cell"><div class="prog-icon pending">📦</div></td>
            <td class="prog-line-cell"><div class="prog-line pending">&nbsp;</div></td>
            <td class="prog-cell"><div class="prog-icon pending">🚚</div></td>
          </tr>
          <tr>
            <td class="prog-cell"><div class="prog-label done">Pedido</div></td>
            <td></td>
            <td class="prog-cell"><div class="prog-label done">Pagado</div></td>
            <td></td>
            <td class="prog-cell"><div class="prog-label">Preparando</div></td>
            <td></td>
            <td class="prog-cell"><div class="prog-label">Enviado</div></td>
          </tr>
        </table>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Hemos recibido tu pedido <strong>{{orderId}}</strong> correctamente. Total: <strong>{{total}}€</strong>.</p>
        <p>Te enviaremos un email cuando tu pedido salga del almacén con el número de seguimiento.</p>
        <p style="text-align:center; margin: 28px 0;">
          <a href="{{appUrl}}/cuenta/pedidos" class="btn">Ver mis pedidos</a>
        </p>
        <p>¡Gracias por confiar en TCG Academy!<br/><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "pedido_confirmado_recogida",
    name: "Pedido confirmado — Recogida en tienda",
    subject: "Pedido #{{orderId}} reservado — Recogida en {{tiendaNombre}}",
    description:
      "Pedido reservado para recogida en tienda. Pago al recoger. Reemplaza al legacy.",
    variables: [
      "nombre",
      "orderId",
      "total",
      "tiendaNombre",
      "tiendaDireccion",
      "appUrl",
    ],
    html: wrapEmail(`
      <div class="top-btns">
        <a href="${SITE_URL}/cuenta/pedidos">Mis pedidos</a>
        <a href="${SITE_URL}/tiendas">Nuestras tiendas</a>
      </div>
      <div class="hero">
        <span class="hero-accent"></span>
        <h1>¡Pedido reservado!</h1>
        <p>Te avisaremos cuando esté listo para recoger</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Hemos reservado tu pedido <strong>{{orderId}}</strong> para recogida en nuestra tienda <strong>{{tiendaNombre}}</strong>.</p>
        <div class="info-box">
          <strong>Total a pagar al recoger:</strong> {{total}}€<br/>
          <strong>Dirección:</strong> {{tiendaDireccion}}
        </div>
        <p>Cuando tu pedido esté preparado te enviaremos un nuevo email avisándote.</p>
        <p style="text-align:center; margin: 28px 0;">
          <a href="{{appUrl}}/cuenta/pedidos" class="btn">Ver mis pedidos</a>
        </p>
        <p>¡Gracias por elegir TCG Academy!<br/><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "pedido_listo_recoger",
    name: "Pedido listo para recoger",
    subject: "Tu pedido #{{orderId}} ya está listo para recoger",
    description:
      "Aviso de que el pedido está disponible en tienda para retirada. Reemplaza al legacy.",
    variables: [
      "nombre",
      "orderId",
      "total",
      "tiendaNombre",
      "tiendaDireccion",
      "tiendaHorario",
      "appUrl",
    ],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent ok"></span>
        <h1>¡Listo para recoger!</h1>
        <p>Tu pedido te está esperando en la tienda</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Tu pedido <strong>{{orderId}}</strong> ya está preparado en <strong>{{tiendaNombre}}</strong>.</p>
        <div class="info-box">
          <strong>Total a pagar:</strong> {{total}}€<br/>
          <strong>Dirección:</strong> {{tiendaDireccion}}<br/>
          <strong>Horario:</strong> {{tiendaHorario}}
        </div>
        <p>Recuerda llevar tu DNI/NIF y el número de pedido.</p>
        <p style="text-align:center; margin: 28px 0;">
          <a href="{{appUrl}}/cuenta/pedidos" class="btn">Ver mi pedido</a>
        </p>
        <p>¡Te esperamos!<br/><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "pedido_cancelado",
    name: "Pedido cancelado",
    subject: "Pedido #{{orderId}} cancelado — TCG Academy",
    description: "Confirmación de cancelación del pedido. Reemplaza al legacy.",
    variables: ["nombre", "orderId", "appUrl"],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent err"></span>
        <h1>Pedido cancelado</h1>
        <p>Tu pedido ha sido cancelado correctamente</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Confirmamos que tu pedido <strong>{{orderId}}</strong> ha sido cancelado.</p>
        <p>Si el pago se completó, el reembolso se gestionará en los próximos días por el mismo método de pago utilizado.</p>
        <p>Si tienes cualquier duda, escríbenos a <a href="mailto:${SITE_CONFIG.email}">${SITE_CONFIG.email}</a>.</p>
        <p style="text-align:center; margin: 28px 0;">
          <a href="{{appUrl}}/catalogo" class="btn">Volver a la tienda</a>
        </p>
        <p>Gracias por tu comprensión.<br/><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "admin_nuevo_pedido",
    name: "Admin — nuevo pedido recibido",
    subject: "[Admin] Nuevo pedido {{orderId}} ({{total}}€)",
    description:
      "Notificación interna a admin cuando entra un nuevo pedido. Reemplaza al legacy.",
    variables: ["orderId", "customerName", "customerEmail", "total", "appUrl"],
    html: wrapEmail(`
      <div class="hero">
        <span class="hero-accent"></span>
        <h1>Nuevo pedido recibido</h1>
        <p>Pedido #{{orderId}}</p>
      </div>
      <div class="content">
        <p>Se ha recibido un nuevo pedido en TCG Academy:</p>
        <div class="info-box">
          <strong>Pedido:</strong> {{orderId}}<br/>
          <strong>Cliente:</strong> {{customerName}}<br/>
          <strong>Email:</strong> {{customerEmail}}<br/>
          <strong>Total:</strong> {{total}}€
        </div>
        <p style="text-align:center; margin: 28px 0;">
          <a href="{{appUrl}}/admin/pedidos" class="btn">Abrir panel de pedidos</a>
        </p>
        <p style="color:#475569; font-size:13px">Notificación interna del sistema TCG Academy.</p>
      </div>
    `),
  },
];
