/**
 * Business constants for TCG Academy.
 * Single source of truth — change here and it propagates everywhere.
 */

export const SITE_CONFIG = {
  name: "TCG Academy",
  legalName: "TCG HOBBY, S.L.",
  cif: "B26979302",
  address: "Av. del Norte 40, 2ªB, 03710 Calpe, Alicante",
  country: "España",
  email: "hola@tcgacademy.es",
  phone: "+34 648 635 723",

  // Logistics
  carrier: "GLS",
  shippingThreshold: 149, // free shipping above this (€)
  standardShippingCost: 4.95, // coste envío estándar (IVA incl.) cuando subtotal < threshold
  expressShippingCost: 6.99, // coste envío express (IVA incl.)
  dispatchHours: 24, // "enviamos en menos de X horas"

  // Tax
  vatRate: 21, // IVA General Spain (Ley 37/1992)

  // Product display
  newProductDays: 0, // badge "NUEVO" — 0 desactiva globalmente (todos los productos llevan >50d)

  // Sesión
  sessionExpiryHours: 24, // duración por defecto de la sesión
  rememberMeDays: 30, // duración con "Recordarme"

  // Registro Mercantil — rellenar cuando la SL termine de inscribirse.
  // Mientras esté vacío, el aviso legal muestra "En trámite de inscripción".
  registroMercantil: {
    provincia: "Alicante",
    tomo: "",
    folio: "",
    hoja: "",
  },
};
