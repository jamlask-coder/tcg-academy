// ─── Email Templates ─────────────────────────────────────────────────────────
// Professional HTML email templates for TCG Academy.
// Variables are wrapped in {{double_braces}} for replacement at send time.
// No backend yet — these are ready for use with any email service (Resend, SendGrid, etc.)

import { SITE_CONFIG } from "@/config/siteConfig";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  variables: string[];
  html: string;
}

const BASE_STYLES = `
  <style>
    body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background: #f0f4f8; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #2563eb; padding: 28px 40px; }
    .header-logo { color: white; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .header-sub { color: #93c5fd; font-size: 12px; margin-top: 4px; }
    .top-btns { background: #1e40af; padding: 12px 40px; text-align: center; }
    .top-btns a { display: inline-block; background: rgba(255,255,255,0.15); color: white !important; font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: 8px; text-decoration: none; margin: 3px; }
    .progress { padding: 24px 40px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
    .progress-track { display: flex; align-items: center; justify-content: center; gap: 0; }
    .prog-step { text-align: center; width: 80px; }
    .prog-dot { width: 16px; height: 16px; border-radius: 50%; margin: 0 auto 6px; }
    .prog-dot.done { background: #2563eb; }
    .prog-dot.pending { background: #e5e7eb; border: 2px solid #d1d5db; }
    .prog-label { font-size: 11px; font-weight: 600; color: #6b7280; }
    .prog-label.done { color: #2563eb; }
    .prog-line { flex: 1; height: 3px; margin-bottom: 22px; }
    .prog-line.done { background: #2563eb; }
    .prog-line.pending { background: #e5e7eb; }
    .hero { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 32px 40px; text-align: center; }
    .hero h1 { color: white; font-size: 24px; font-weight: 800; margin: 0 0 8px; }
    .hero p { color: #bfdbfe; font-size: 14px; margin: 0; }
    .content { padding: 32px 40px; }
    .content p { color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
    .btn { display: inline-block; background: #2563eb; color: white !important; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 12px; text-decoration: none; margin: 8px 0; }
    .btn-secondary { display: inline-block; background: white; color: #2563eb !important; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none; border: 2px solid #2563eb; margin: 8px 0; }
    .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .order-table th { background: #f8fafc; padding: 10px 14px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb; }
    .order-table td { padding: 12px 14px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; }
    .total-row td { font-weight: 700; font-size: 16px; color: #111827; background: #f0f9ff; }
    .info-box { background: #f0f9ff; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 0 12px 12px 0; margin: 20px 0; }
    .badge { display: inline-block; background: #dbeafe; color: #1e40af; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; }
    .tracking-box { background: #f0f9ff; border: 2px solid #2563eb; border-radius: 16px; padding: 20px; text-align: center; margin: 20px 0; }
    .tracking-num { font-size: 28px; font-weight: 900; color: #2563eb; letter-spacing: 2px; font-family: 'Courier New', monospace; }
    .points-box { background: linear-gradient(135deg, #fef3c7, #fffbeb); border: 2px solid #f59e0b; border-radius: 16px; padding: 24px; text-align: center; margin: 20px 0; }
    .points-number { font-size: 48px; font-weight: 900; color: #d97706; line-height: 1; }
    .coupon-box { border: 3px dashed #2563eb; border-radius: 16px; padding: 24px; text-align: center; margin: 20px 0; background: #f0f9ff; }
    .coupon-code { font-size: 32px; font-weight: 900; color: #2563eb; letter-spacing: 4px; font-family: 'Courier New', monospace; }
    .legal-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin: 24px 0 0; }
    .legal-box p { color: #9ca3af !important; font-size: 10px !important; line-height: 1.5; margin: 0 0 6px !important; }
    .footer { background: #f8fafc; padding: 28px 40px; border-top: 1px solid #e5e7eb; }
    .footer p { color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0 0 8px; }
    .footer a { color: #6b7280; text-decoration: none; }
    .social-links { margin: 12px 0 16px; }
    .social-links a { display: inline-block; background: #2563eb; color: white; width: 30px; height: 30px; border-radius: 50%; text-align: center; line-height: 30px; font-size: 11px; margin: 0 3px; text-decoration: none; font-weight: 700; }
    @media (max-width: 600px) {
      .content, .progress { padding: 20px; }
      .header, .top-btns, .footer { padding: 16px 20px; }
      .hero { padding: 24px 20px; }
      .hero h1 { font-size: 20px; }
    }
  </style>
`;

const FOOTER_HTML = `
  <div class="footer">
    <div class="social-links">
      <a href="https://instagram.com/tcgacademy" aria-label="Instagram">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
      </a>
      <a href="https://tiktok.com/@tcgacademy" aria-label="TikTok">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.88a8.2 8.2 0 004.84 1.56V7a4.85 4.85 0 01-1.07-.31z"/></svg>
      </a>
      <a href="https://x.com/tcgacademy" aria-label="X">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </a>
    </div>
    <p><strong>${SITE_CONFIG.name}</strong> · <a href="mailto:${SITE_CONFIG.email}">${SITE_CONFIG.email}</a> · <a href="tel:${SITE_CONFIG.phone.replace(/\s+/g, "")}">${SITE_CONFIG.phone}</a></p>
    <p>${SITE_CONFIG.address}</p>
    <p style="margin-top:12px; font-size:11px; color:#d1d5db;">
      Has recibido este email porque tienes una cuenta en ${SITE_CONFIG.name}.
      <a href="{{unsubscribe_link}}">Cancelar suscripción</a> ·
      <a href="https://tcgacademy.es/politica-privacidad">Política de privacidad</a>
    </p>
    <p style="margin-top:8px; font-size:10px; color:#d1d5db; line-height:1.5;">
      ${SITE_CONFIG.name} es una marca de ${SITE_CONFIG.legalName}, con domicilio social en ${SITE_CONFIG.address}. CIF: ${SITE_CONFIG.cif}. ©${new Date().getFullYear()} ${SITE_CONFIG.legalName}. Todos los derechos reservados. Los formularios de queja están disponibles a petición del consumidor.
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
      <div class="header-logo">🃏 TCG Academy</div>
      <div class="header-sub">La mejor tienda TCG de España</div>
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
    subject: "¡Bienvenido/a a TCG Academy, {{nombre}}! 🃏",
    description: "Se envía cuando un usuario se registra.",
    variables: ["nombre", "email", "unsubscribe_link"],
    html: wrapEmail(`
      <div class="hero">
        <h1>¡Bienvenido/a, {{nombre}}! 🎉</h1>
        <p>Tu cuenta en TCG Academy está lista</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Nos alegra que hayas decidido unirte a la comunidad TCG Academy. Aquí encontrarás todo lo que necesitas para disfrutar de tus juegos de cartas favoritos: Pokémon, Magic, One Piece, Naruto y muchos más.</p>
        <div class="info-box">
          <strong>🎁 Regalo de bienvenida</strong><br/>
          Hemos añadido <strong>50 puntos</strong> a tu cuenta y tienes un cupón de <strong>15% de descuento</strong> en tu primera compra esperándote.
        </div>
        <p style="text-align:center; margin: 28px 0;">
          <a href="https://tcgacademy.es/catalogo" class="btn">Empezar a explorar</a>
          <br/>
          <a href="https://tcgacademy.es/cuenta" class="btn-secondary" style="margin-top:12px;">Ver mi cuenta</a>
        </p>
        <p>Si tienes cualquier duda, estamos aquí para ayudarte en <a href="mailto:${SITE_CONFIG.email}">${SITE_CONFIG.email}</a>.</p>
        <p>¡Buenas partidas! 🎴<br/><strong>El equipo de ${SITE_CONFIG.name}</strong></p>
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
        <a href="https://tcgacademy.es/cuenta/pedidos">Mis pedidos</a>
        <a href="https://tcgacademy.es/cuenta">Mi cuenta</a>
        <a href="https://tcgacademy.es/catalogo">Volver a comprar</a>
      </div>
      <div class="hero">
        <h1>¡Pedido confirmado! ✅</h1>
        <p>Estamos preparando tu pedido con todo el cariño</p>
      </div>
      <div class="progress">
        <div class="progress-track">
          <div class="prog-step">
            <div class="prog-dot done"></div>
            <div class="prog-label done">Pedido</div>
          </div>
          <div class="prog-line pending"></div>
          <div class="prog-step">
            <div class="prog-dot pending"></div>
            <div class="prog-label">Enviado</div>
          </div>
          <div class="prog-line pending"></div>
          <div class="prog-step">
            <div class="prog-dot pending"></div>
            <div class="prog-label">Entregado</div>
          </div>
        </div>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Tu pedido ha sido recibido y está pendiente de envío. Aquí tienes el resumen:</p>
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
          <a href="https://tcgacademy.es/cuenta/pedidos/{{order_id}}" class="btn">Ver estado del pedido</a>
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
    subject: "Tu pedido #{{order_id}} está en camino 🚚",
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
        <a href="https://tcgacademy.es/cuenta/pedidos">Mis pedidos</a>
        <a href="https://tcgacademy.es/cuenta">Mi cuenta</a>
        <a href="https://tcgacademy.es/catalogo">Volver a comprar</a>
      </div>
      <div class="hero" style="background: linear-gradient(135deg, #059669, #10b981);">
        <h1>¡Tu pedido está en camino! 🚚</h1>
        <p>Lo recibirás en las próximas 48 horas</p>
      </div>
      <div class="progress">
        <div class="progress-track">
          <div class="prog-step">
            <div class="prog-dot done"></div>
            <div class="prog-label done">Pedido</div>
          </div>
          <div class="prog-line done"></div>
          <div class="prog-step">
            <div class="prog-dot done"></div>
            <div class="prog-label done">Enviado</div>
          </div>
          <div class="prog-line pending"></div>
          <div class="prog-step">
            <div class="prog-dot pending"></div>
            <div class="prog-label">En tus manos</div>
          </div>
        </div>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>¡Buenas noticias! Tu pedido <strong>#{{order_id}}</strong> ha salido de nuestro almacén y está en camino. Lo recibirás en las <strong>próximas 48 horas</strong>.</p>
        <div class="tracking-box">
          <p style="margin:0 0 8px; font-size:12px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em;">Número de seguimiento {{carrier}}</p>
          <div class="tracking-num">{{tracking_number}}</div>
          <p style="margin:12px 0 0; font-size:13px; color:#374151;"><strong>Transportista:</strong> {{carrier}}</p>
          <p style="margin:16px 0 0;">
            <a href="{{tracking_url}}" class="btn" style="font-size:13px; padding:10px 24px;">Seguir mi envío en {{carrier}}</a>
          </p>
        </div>
        <p>Si tienes algún problema con la entrega, contacta con nosotros en <a href="mailto:pedidos@tcgacademy.es">pedidos@tcgacademy.es</a>.</p>
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
        <h1>Tu factura está disponible 🧾</h1>
        <p>Pedido #{{order_id}}</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>La factura de tu pedido ya está disponible para su descarga:</p>
        <div class="info-box">
          <p style="margin:0;"><strong>Nº Factura:</strong> FAC-{{invoice_id}}</p>
          <p style="margin:8px 0 0;"><strong>Pedido:</strong> #{{order_id}}</p>
          <p style="margin:8px 0 0;"><strong>Fecha:</strong> {{invoice_date}}</p>
          <p style="margin:8px 0 0;"><strong>Importe:</strong> <span style="color:#2563eb; font-weight:700; font-size:18px;">{{total}}€</span></p>
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
    id: "nuevo_cupon",
    name: "Nuevo cupón",
    subject: "🎁 ¡Tienes un nuevo cupón de descuento, {{nombre}}!",
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
      <div class="hero" style="background: linear-gradient(135deg, #dc2626, #ef4444);">
        <h1>¡Un regalo para ti! 🎁</h1>
        <p>Hemos preparado un descuento exclusivo</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>{{coupon_description}} Aquí tienes tu código de descuento:</p>
        <div class="coupon-box">
          <p style="color:#6b7280; font-size:12px; margin:0 0 8px; text-transform:uppercase; letter-spacing:0.05em;">Tu código exclusivo</p>
          <div class="coupon-code">{{coupon_code}}</div>
          <p style="color:#2563eb; font-weight:700; font-size:20px; margin:12px 0 4px;">{{coupon_value}} de descuento</p>
          <p style="color:#9ca3af; font-size:12px; margin:0;">Válido hasta el {{expires_at}}</p>
        </div>
        <p style="text-align:center; margin: 24px 0;">
          <a href="{{shop_url}}" class="btn">Usar mi cupón ahora</a>
        </p>
        <p style="font-size:12px; color:#9ca3af;">Introduce el código en el carrito antes de finalizar tu compra. Un solo uso por cliente.</p>
        <p><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "puntos_anadidos",
    name: "Puntos añadidos",
    subject: "Has ganado {{points}} puntos en TCG Academy ⭐",
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
      <div class="hero" style="background: linear-gradient(135deg, #d97706, #f59e0b);">
        <h1>¡Puntos añadidos! ⭐</h1>
        <p>Sigue acumulando y canjéalos por descuentos</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>{{reason}} Te hemos añadido nuevos puntos a tu cuenta de fidelidad:</p>
        <div class="points-box">
          <div class="points-number">+{{points}}</div>
          <p style="color:#92400e; font-weight:600; margin:8px 0 0;">puntos ganados</p>
          <p style="color:#b45309; font-size:14px; margin:4px 0 0;">Tu saldo actual: <strong>{{current_balance}} puntos</strong></p>
        </div>
        <p style="text-align:center;">
          <a href="{{redeem_url}}" class="btn-secondary">Ver mis puntos y canjear</a>
        </p>
        <p style="font-size:13px; color:#6b7280; text-align:center;">Recuerda: 10.000 puntos = 1€ de descuento en tu próxima compra.</p>
        <p><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "devolucion_aceptada",
    name: "Devolución aceptada",
    subject: "Tu devolución #{{return_id}} ha sido aceptada ✅",
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
      <div class="hero" style="background: linear-gradient(135deg, #059669, #10b981);">
        <h1>Devolución aceptada ✅</h1>
        <p>Tu reembolso está en camino</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Hemos revisado tu solicitud de devolución <strong>#{{return_id}}</strong> del pedido <strong>#{{order_id}}</strong> y ha sido <strong>aceptada</strong>.</p>
        <div class="info-box">
          <p style="margin:0;"><strong>Importe del reembolso:</strong> <span style="color:#059669; font-size:20px; font-weight:700;">{{refund_amount}}€</span></p>
          <p style="margin:8px 0 0;"><strong>Método de reembolso:</strong> {{refund_method}}</p>
          <p style="margin:8px 0 0;"><strong>Plazo estimado:</strong> {{refund_days}} días hábiles</p>
        </div>
        <p>Recibirás el reembolso en el método de pago original. Si tienes alguna duda, escríbenos a <a href="mailto:devoluciones@tcgacademy.es">devoluciones@tcgacademy.es</a>.</p>
        <p>Disculpa las molestias.<br/><strong>El equipo de TCG Academy</strong></p>
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
        <h1>Recupera tu contraseña 🔑</h1>
        <p>Has solicitado restablecer tu contraseña</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Si fuiste tú, haz clic en el botón de abajo:</p>
        <p style="text-align:center; margin: 28px 0;">
          <a href="{{reset_url}}" class="btn">Restablecer contraseña</a>
        </p>
        <div class="info-box">
          ⚠️ Este enlace caducará en <strong>{{expires_in}}</strong>. Si no has solicitado este cambio, ignora este email y tu contraseña permanecerá sin cambios.
        </div>
        <p>Por seguridad, nunca te pediremos tu contraseña por email.</p>
        <p><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "carrito_abandonado",
    name: "Carrito abandonado",
    subject: "{{nombre}}, ¡tu carrito te echa de menos! 🛒",
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
      <div class="hero" style="background: linear-gradient(135deg, #7c3aed, #6d28d9);">
        <h1>¡Olvidaste algo! 🛒</h1>
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
          <p style="color:#374151; margin:0 0 8px; font-size:14px;">¡Te damos un empujoncito! Usa este código y llévate un</p>
          <div class="coupon-code" style="font-size:24px;">{{coupon_code}}</div>
          <p style="color:#6b7280; font-size:12px; margin:8px 0 0;">Válido 48 horas · Solo para completar esta compra</p>
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
    html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Invitación al grupo — TCG Academy</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b}
    .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.10)}
    .hdr{background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:40px 32px 36px;text-align:center}
    .badge{display:inline-block;background:#f59e0b;color:#fff;font-size:11px;font-weight:800;padding:5px 16px;border-radius:999px;letter-spacing:.8px;text-transform:uppercase;margin-bottom:18px}
    .logo{font-size:26px;font-weight:900;color:#fff;margin-bottom:6px}
    .logo-sub{font-size:14px;color:#bfdbfe}
    .body{padding:36px 32px 28px}
    .greeting{font-size:22px;font-weight:800;color:#0f172a;margin-bottom:10px}
    .intro{font-size:15px;color:#475569;line-height:1.75;margin-bottom:28px}
    .box{background:linear-gradient(135deg,#eff6ff 0%,#f0fdf4 100%);border:2px solid #bfdbfe;border-radius:16px;padding:24px;margin-bottom:28px}
    .sender-row{display:flex;align-items:center;gap:14px;margin-bottom:20px}
    .av{width:54px;height:54px;background:#2563eb;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#fff}
    .sender-name{font-size:17px;font-weight:800;color:#0f172a}
    .sender-lbl{font-size:12px;color:#64748b;margin-top:3px}
    hr{border:none;border-top:1px solid #e2e8f0;margin:0 0 16px}
    .ben{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid #e2e8f0}
    .ben:last-child{border-bottom:none;padding-bottom:0}
    .ben-icon{width:28px;height:28px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:14px}
    .ben-text{font-size:14px;color:#374151;line-height:1.6}
    .cta-wrap{text-align:center;margin:28px 0 24px}
    .cta{display:inline-block;background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;font-size:16px;font-weight:800;padding:15px 40px;border-radius:14px;text-decoration:none}
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
    <p class="greeting">¡Hola, {{toName}}!</p>
    <p class="intro">Has recibido una <strong>solicitud de asociación</strong> en TCG Academy. Si la aceptas, ambos ganaréis puntos automáticamente cada vez que cualquiera de vosotros realice una compra.</p>
    <div class="box">
      <div class="sender-row">
        <div class="av">{{fromInitial}}</div>
        <div>
          <div class="sender-name">{{fromName}}</div>
          <div class="sender-lbl">te invita a unirte a su grupo</div>
        </div>
      </div>
      <hr/>
      <div class="ben"><div class="ben-icon" style="background:#eff6ff">🛒</div><div class="ben-text">Cuando <strong>{{fromName}}</strong> compre, <strong>tú recibes 5.000 pts por cada €100</strong> de su pedido (= €0,50 de descuento)</div></div>
      <div class="ben"><div class="ben-icon" style="background:#f0fdf4">💰</div><div class="ben-text">Cuando <strong>tú compres</strong>, <strong>{{fromName}} recibe 5.000 pts por cada €100</strong> de tu pedido (= €0,50 de descuento)</div></div>
      <div class="ben"><div class="ben-icon" style="background:#fef3c7">⭐</div><div class="ben-text"><strong>10.000 puntos = €1 de descuento</strong> en cualquier compra. Los puntos no caducan</div></div>
    </div>
    <div class="cta-wrap"><a href="https://tcgacademy.es/cuenta/grupo" class="cta">Ver solicitud →</a></div>
    <div class="note">💡 <strong>¿Cómo funciona?</strong> Accede a tu cuenta, entra en <em>Mi grupo</em> y acepta o rechaza la solicitud. Puedes tener hasta <strong>4 personas en tu grupo</strong>.</div>
    <p class="small">Si no conoces a <strong>{{fromName}}</strong> o no esperabas esta solicitud, simplemente ignórala o recházala desde tu cuenta.</p>
  </div>
  <div class="ftr">
    <p>© 2026 TCG Academy — <a href="https://tcgacademy.es">tcgacademy.es</a> · <a href="https://tcgacademy.es/cuenta/grupo">Mi grupo</a></p>
    <p style="margin-top:8px">Este correo fue generado automáticamente.</p>
  </div>
</div>
</body>
</html>`,
  },
  {
    id: "restock_disponible",
    name: "Producto disponible (restock)",
    subject: "¡{{producto}} ya está disponible! — TCG Academy",
    description: "Se envía automáticamente cuando un producto vuelve a tener stock y el usuario pidió ser avisado.",
    variables: ["nombre", "producto", "producto_url", "producto_imagen"],
    html: wrapEmail(`
      <div class="hero">
        <h1>¡Ya está disponible! 🎉</h1>
        <p>El producto que esperabas ha vuelto</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Te escribimos porque nos pediste que te avisáramos cuando <strong>{{producto}}</strong> volviera a estar disponible. ¡Buenas noticias: ya puedes conseguirlo!</p>
        <div class="info-box" style="text-align:center">
          <img src="{{producto_imagen}}" alt="{{producto}}" style="max-height:180px;margin:0 auto 16px;display:block;border-radius:12px" />
          <strong style="font-size:16px">{{producto}}</strong><br/>
          <span style="color:#16a34a;font-weight:700">✅ En stock ahora</span>
        </div>
        <p style="text-align:center; margin: 28px 0;">
          <a href="{{producto_url}}" class="btn">Ver producto y comprar</a>
        </p>
        <p style="color:#6b7280;font-size:13px">Las unidades son limitadas y no podemos garantizar disponibilidad por mucho tiempo. Si lo quieres, te recomendamos no esperar.</p>
        <p>¡Buenas partidas! 🎴<br/><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "restock_suscripcion",
    name: "Confirmación de alerta de restock",
    subject: "🔔 Alerta activada — {{producto}} — TCG Academy",
    description: "Se envía cuando un usuario se suscribe para recibir aviso de restock de un producto agotado.",
    variables: ["nombre", "producto", "producto_url", "producto_imagen", "idioma"],
    html: wrapEmail(`
      <div class="hero">
        <h1>🔔 Alerta activada</h1>
        <p>Te avisaremos en cuanto llegue</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Hemos registrado tu alerta para <strong>{{producto}}</strong>. En cuanto volvamos a recibir unidades te enviaremos un email para que puedas conseguirlo antes que nadie.</p>
        <div class="info-box" style="text-align:center">
          <img src="{{producto_imagen}}" alt="{{producto}}" style="max-height:160px;margin:0 auto 16px;display:block;border-radius:12px" />
          <strong style="font-size:16px">{{producto}}</strong><br/>
          <span style="font-size:13px;color:#6b7280">Idioma: {{idioma}}</span><br/>
          <span style="color:#d97706;font-weight:700;font-size:14px;margin-top:8px;display:inline-block">🔔 Alerta activa — te avisaremos</span>
        </div>
        <div style="background:#fffbeb;border:2px solid #f59e0b;border-radius:16px;padding:20px;text-align:center;margin:24px 0">
          <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#92400e">¿Sabías que…?</p>
          <p style="margin:0;font-size:13px;color:#78350f">Los productos agotados suelen volver en cantidades muy limitadas. Al activar esta alerta tendrás ventaja para hacerte con él antes de que se agote de nuevo.</p>
        </div>
        <p style="text-align:center; margin: 24px 0;">
          <a href="{{producto_url}}" class="btn-secondary">Ver producto</a>
        </p>
        <p style="color:#6b7280;font-size:13px">Mientras tanto, puedes explorar el mismo producto en otros idiomas que sí tenemos disponibles. A veces la versión japonesa o coreana esconde las mismas cartas a un precio diferente.</p>
        <p>¡Buenas partidas! 🎴<br/><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
];
