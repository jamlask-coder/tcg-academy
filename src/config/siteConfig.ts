/**
 * Business constants for TCG Academy.
 * Single source of truth — change here and it propagates everywhere.
 */

export const SITE_CONFIG = {
  name: "TCG Academy",
  legalName: "TCG HOBBY, S.L.",
  cif: "B26979302",
  address: "Av. del Norte 40, 2ª planta, puerta B, 03710 Calpe, Alicante",
  email: "tcgacademycalpe@gmail.com",
  phone: "+34 648 63 57 23",

  // Logistics
  carrier: "GLS",
  shippingThreshold: 149, // free shipping above this (€)
  dispatchHours: 24, // "enviamos en menos de X horas"

  // Tax
  vatRate: 21, // IVA General Spain (Ley 37/1992)

  // Product display
  newProductDays: 45, // badge "NUEVO" expires after N days

  // Sesión
  sessionExpiryHours: 24, // duración por defecto de la sesión
  rememberMeDays: 30, // duración con "Recordarme"
};
