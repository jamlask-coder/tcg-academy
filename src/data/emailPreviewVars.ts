/**
 * Variables de preview por defecto para cada plantilla de email.
 *
 * SSOT compartido cliente/servidor:
 *   - cliente: `/admin/emails/automaticos` (preview en iframe).
 *   - servidor: `/api/admin/emails/send-all-test` (envío de prueba real).
 *
 * Vivían inline en la página, pero el endpoint admin las necesita para poder
 * renderizar cada plantilla con datos realistas. Extraerlas a un módulo
 * importable evita duplicar y garantiza que preview y envío real usan los
 * mismos valores.
 */

export const EMAIL_PREVIEW_VARS: Record<string, Record<string, string>> = {
  bienvenida: {
    nombre: "María García",
    email: "maria@ejemplo.com",
    unsubscribe_link: "#",
  },
  confirmacion_pedido: {
    nombre: "María García",
    order_id: "TCG-260412-A3BX9K",
    order_date: "12 de abril de 2026",
    items_html: `<tr><td style="padding:10px 0;font-size:14px">Pokémon EVS Booster Box ×1</td><td align="right" style="font-size:14px;font-weight:700;white-space:nowrap">89,95 €</td></tr>`,
    subtotal: "89,95",
    shipping: "0,00",
    total: "89,95",
    address: "Calle Mayor 1, 28013 Madrid",
    payment_method: "Tarjeta bancaria",
    unsubscribe_link: "#",
  },
  pedido_enviado: {
    nombre: "María García",
    order_id: "TCG-260412-A3BX9K",
    tracking_number: "ES2026041200001",
    carrier: "GLS",
    estimated_date: "14 de abril de 2026",
    tracking_url: "#",
    unsubscribe_link: "#",
  },
  factura_disponible: {
    nombre: "Carlos López",
    invoice_id: "FAC-2026-0042",
    order_id: "TCG-260412-A3BX9K",
    invoice_date: "12 de abril de 2026",
    total: "89,95",
    download_url: "#",
    unsubscribe_link: "#",
  },
  albaran_disponible: {
    nombre: "Carlos López",
    albaran_id: "ALB-2026-0017",
    albaran_date: "12 de abril de 2026",
    total: "89,95",
    unsubscribe_link: "#",
  },
  nuevo_cupon: {
    nombre: "María García",
    coupon_code: "PRIMAVERA15",
    coupon_description: "Descuento especial de primavera",
    coupon_value: "15%",
    expires_at: "30 de abril de 2026",
    shop_url: "#",
    unsubscribe_link: "#",
  },
  puntos_anadidos: {
    nombre: "María García",
    points: "90",
    reason: "Compra #TCG-260412-A3BX9K",
    current_balance: "350",
    redeem_url: "#",
    unsubscribe_link: "#",
  },
  devolucion_aceptada: {
    nombre: "María García",
    return_id: "RMA-260412-X7K2",
    order_id: "TCG-260412-A3BX9K",
    refund_amount: "89,95",
    refund_method: "Transferencia bancaria",
    refund_days: "3–5 días hábiles",
    unsubscribe_link: "#",
  },
  recuperar_contrasena: {
    nombre: "María García",
    reset_url: "#",
    expires_in: "2 horas",
    unsubscribe_link: "#",
  },
  carrito_abandonado: {
    nombre: "María García",
    items_html: `<tr><td style="padding:10px 0;font-size:14px">Pokémon EVS Booster Box ×1</td><td align="right" style="font-size:14px;font-weight:700">89,95 €</td></tr>`,
    cart_total: "89,95",
    cart_url: "#",
    coupon_code: "VUELVE10",
    unsubscribe_link: "#",
  },
  asociacion_invitacion: {
    toName: "Carlos",
    fromName: "María García",
    fromInitial: "M",
  },
  verificar_email: {
    nombre: "María García",
    verify_url: "#",
    expires_in: "24 horas",
    unsubscribe_link: "#",
  },
  devolucion_rechazada: {
    nombre: "María García",
    return_id: "RMA-260412-X7K2",
    order_id: "TCG-260412-A3BX9K",
    motivo: "El producto presenta signos de uso fuera del periodo de prueba.",
    unsubscribe_link: "#",
  },
  devolucion_reembolsada: {
    nombre: "María García",
    return_id: "RMA-260412-X7K2",
    order_id: "TCG-260412-A3BX9K",
    refund_amount: "89,95",
    rectificativa_number: "FAC-2026-R042",
    iban_masked: "ES•• •••• •••• •••• ••12 3456",
    unsubscribe_link: "#",
  },
  devolucion_cancelada: {
    nombre: "María García",
    return_id: "RMA-260412-X7K2",
    order_id: "TCG-260412-A3BX9K",
    motivo: "Cancelada a petición del cliente antes de enviar el paquete.",
    unsubscribe_link: "#",
  },
  restock_disponible: {
    nombre: "María García",
    producto: "Pokémon EVS Booster Box",
    producto_url: "#",
    producto_imagen: "#",
  },
  restock_suscripcion: {
    nombre: "María García",
    producto: "Pokémon EVS Booster Box",
    producto_url: "#",
    producto_imagen: "#",
    idioma: "Español",
  },
  fiscal_recordatorio: {
    nombre: "Luri",
    modelo: "303",
    period: "T1 2026",
    dias_texto: "Vence en 5 días",
    deadline: "20 de abril de 2026",
    severidad_label: "URGENTE",
    instrucciones: "1) Revisa el borrador en /admin/fiscal/trimestral\n2) Descarga el resumen para gestoría\n3) Presenta en sede AEAT",
    where: "Sede electrónica AEAT — formulario online",
    aeat_url: "https://sede.agenciatributaria.gob.es/",
    panel_url: "https://tcgacademy.es/admin/fiscal/trimestral",
  },
  invitacion_cuenta: {
    nombre: "Carlos López",
    numeroFactura: "FAC-2026-0042",
    urlActivacion: "https://tcgacademy.es/activar/abc123token",
    expiraEn: "7 días",
  },
  pedido_confirmado: {
    nombre: "María García",
    orderId: "TCG-260412-A3BX9K",
    total: "89,95",
    appUrl: "https://tcgacademy.es",
  },
  pedido_confirmado_recogida: {
    nombre: "María García",
    orderId: "TCG-260412-A3BX9K",
    total: "89,95",
    tiendaNombre: "TCG Academy Calpe",
    tiendaDireccion: "Calle Libertad 16, 03710 Calpe",
    appUrl: "https://tcgacademy.es",
  },
  pedido_listo_recoger: {
    nombre: "María García",
    orderId: "TCG-260412-A3BX9K",
    total: "89,95",
    tiendaNombre: "TCG Academy Calpe",
    tiendaDireccion: "Calle Libertad 16, 03710 Calpe",
    tiendaHorario: "L-V 10:00–20:00 · S 10:00–20:00 · D 10:00–14:00",
    appUrl: "https://tcgacademy.es",
  },
  pedido_cancelado: {
    nombre: "María García",
    orderId: "TCG-260412-A3BX9K",
    appUrl: "https://tcgacademy.es",
  },
  admin_nuevo_pedido: {
    orderId: "TCG-260412-A3BX9K",
    customerName: "María García",
    customerEmail: "maria@ejemplo.com",
    total: "89,95",
    appUrl: "https://tcgacademy.es",
  },
};

/**
 * Devuelve las variables de preview para una plantilla, con fallback a un
 * objeto vacío si la plantilla aún no tiene mock. El endpoint de envío masivo
 * usa esto + el array `template.variables` para garantizar que ninguna {{var}}
 * queda sin sustituir (rellena con un placeholder neutro las que falten).
 */
export function getPreviewVarsFor(
  templateId: string,
  expectedVars: readonly string[] = [],
): Record<string, string> {
  const known = EMAIL_PREVIEW_VARS[templateId] ?? {};
  const out: Record<string, string> = { ...known };
  for (const v of expectedVars) {
    if (!(v in out)) out[v] = `[${v}]`;
  }
  return out;
}
