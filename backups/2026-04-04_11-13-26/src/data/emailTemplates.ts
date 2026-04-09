// ─── Email Templates ─────────────────────────────────────────────────────────
// Professional HTML email templates for TCG Academy.
// Variables are wrapped in {{double_braces}} for replacement at send time.
// No backend yet — these are ready for use with any email service (Resend, SendGrid, etc.)

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
    .hero { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 40px; text-align: center; }
    .hero h1 { color: white; font-size: 26px; font-weight: 800; margin: 0 0 8px; }
    .hero p { color: #bfdbfe; font-size: 15px; margin: 0; }
    .content { padding: 36px 40px; }
    .content p { color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
    .btn { display: inline-block; background: #2563eb; color: white !important; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 12px; text-decoration: none; margin: 8px 0; }
    .btn-secondary { display: inline-block; background: white; color: #2563eb !important; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none; border: 2px solid #2563eb; margin: 8px 0; }
    .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .order-table th { background: #f8fafc; padding: 10px 14px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb; }
    .order-table td { padding: 12px 14px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; }
    .total-row td { font-weight: 700; font-size: 16px; color: #111827; background: #f0f9ff; }
    .info-box { background: #f0f9ff; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 0 12px 12px 0; margin: 20px 0; }
    .badge { display: inline-block; background: #dbeafe; color: #1e40af; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; }
    .points-box { background: linear-gradient(135deg, #fef3c7, #fffbeb); border: 2px solid #f59e0b; border-radius: 16px; padding: 24px; text-align: center; margin: 20px 0; }
    .points-number { font-size: 48px; font-weight: 900; color: #d97706; line-height: 1; }
    .coupon-box { border: 3px dashed #2563eb; border-radius: 16px; padding: 24px; text-align: center; margin: 20px 0; background: #f0f9ff; }
    .coupon-code { font-size: 32px; font-weight: 900; color: #2563eb; letter-spacing: 4px; font-family: 'Courier New', monospace; }
    .footer { background: #f8fafc; padding: 28px 40px; border-top: 1px solid #e5e7eb; }
    .footer p { color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0 0 8px; }
    .footer a { color: #6b7280; text-decoration: none; }
    .social-links { margin: 16px 0; }
    .social-links a { display: inline-block; background: #2563eb; color: white; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-size: 12px; margin: 0 4px; text-decoration: none; font-weight: 700; }
    @media (max-width: 600px) {
      .content { padding: 24px 20px; }
      .header { padding: 20px 24px; }
      .hero { padding: 28px 24px; }
      .footer { padding: 20px 24px; }
      .hero h1 { font-size: 20px; }
    }
  </style>
`;

const FOOTER_HTML = `
  <div class="footer">
    <div class="social-links">
      <a href="#">Ig</a>
      <a href="#">Tw</a>
      <a href="#">Yt</a>
      <a href="#">Dc</a>
    </div>
    <p><strong>TCG Academy S.L.</strong> · CIF: B12345678</p>
    <p>Av. Gabriel Miró 42, 03710 Calpe, Alicante, España</p>
    <p>
      <a href="mailto:hola@tcgacademy.es">hola@tcgacademy.es</a> ·
      <a href="tel:+34965000001">+34 965 000 001</a>
    </p>
    <p style="margin-top:12px; font-size:11px; color:#d1d5db;">
      Has recibido este email porque tienes una cuenta en TCG Academy.
      <a href="{{unsubscribe_link}}">Cancelar suscripción</a> ·
      <a href="https://tcgacademy.es/politica-privacidad">Política de privacidad</a>
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
        <p>Si tienes cualquier duda, estamos aquí para ayudarte en <a href="mailto:hola@tcgacademy.es">hola@tcgacademy.es</a>.</p>
        <p>¡Buenas partidas! 🎴<br/><strong>El equipo de TCG Academy</strong></p>
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
      <div class="hero">
        <h1>¡Pedido confirmado! ✅</h1>
        <p>Estamos preparando tu pedido con todo el cariño</p>
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
      "estimated_date",
      "tracking_url",
      "unsubscribe_link",
    ],
    html: wrapEmail(`
      <div class="hero" style="background: linear-gradient(135deg, #059669, #10b981);">
        <h1>¡Tu pedido está en camino! 🚚</h1>
        <p>Pronto llegará a tus manos</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>¡Buenas noticias! Tu pedido <strong>#{{order_id}}</strong> ha salido de nuestro almacén y está en camino.</p>
        <div class="info-box">
          <p style="margin:0;"><strong>Transportista:</strong> {{carrier}}</p>
          <p style="margin:8px 0 0;"><strong>Número de seguimiento:</strong> <span style="font-family: monospace; font-size:16px; font-weight:700; color:#2563eb;">{{tracking_number}}</span></p>
          <p style="margin:8px 0 0;"><strong>Fecha estimada de entrega:</strong> {{estimated_date}}</p>
        </div>
        <p style="text-align:center; margin: 28px 0;">
          <a href="{{tracking_url}}" class="btn">Seguir mi pedido</a>
        </p>
        <p>Si tienes algún problema con la entrega, contacta con nosotros en <a href="mailto:pedidos@tcgacademy.es">pedidos@tcgacademy.es</a>.</p>
        <p><strong>El equipo de TCG Academy</strong></p>
      </div>
    `),
  },
  {
    id: "pedido_entregado",
    name: "Pedido entregado",
    subject: "¡Tu pedido #{{order_id}} ha llegado! ¿Cómo ha ido? 🎴",
    description: "Se envía cuando el pedido es marcado como entregado.",
    variables: [
      "nombre",
      "order_id",
      "points_earned",
      "current_balance",
      "review_url",
      "unsubscribe_link",
    ],
    html: wrapEmail(`
      <div class="hero" style="background: linear-gradient(135deg, #7c3aed, #9333ea);">
        <h1>¡Pedido entregado! 📦</h1>
        <p>Esperamos que disfrutes de tu compra</p>
      </div>
      <div class="content">
        <p>Hola {{nombre}},</p>
        <p>Tu pedido <strong>#{{order_id}}</strong> ha sido entregado. ¡Esperamos que estés disfrutando de tus nuevas cartas!</p>
        <div class="points-box">
          <div class="points-number">+{{points_earned}}</div>
          <p style="color:#92400e; font-weight:600; margin:8px 0 0;">puntos añadidos a tu cuenta</p>
          <p style="color:#b45309; font-size:13px; margin:4px 0 0;">Saldo total: <strong>{{current_balance}} puntos</strong></p>
        </div>
        <p style="text-align:center;">
          <a href="{{review_url}}" class="btn">Dejar una reseña</a>
        </p>
        <p style="font-size:13px; color:#6b7280; text-align:center;">Tu opinión nos ayuda a mejorar y a otros compradores a elegir.</p>
        <p>¡Hasta la próxima partida!<br/><strong>El equipo de TCG Academy</strong></p>
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
        <p style="font-size:13px; color:#6b7280; text-align:center;">Recuerda: 100 puntos = 1€ de descuento en tu próxima compra.</p>
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
        <p>Disculpa los inconvenientes.<br/><strong>El equipo de TCG Academy</strong></p>
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
];
