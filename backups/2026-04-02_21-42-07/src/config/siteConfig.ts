/**
 * Business constants for TCG Academy.
 * Single source of truth — change here and it propagates everywhere.
 */

export const SITE_CONFIG = {
  name: "TCG Academy",
  cif: "B12345678",
  email: "hola@tcgacademy.es",
  phone: "+34 965 83 00 01",

  // Logistics
  carrier: "GLS",
  shippingThreshold: 149, // free shipping above this (€)
  dispatchHours: 24, // "enviamos en menos de X horas"

  // Tax
  vatRate: 21, // IVA General Spain (Ley 37/1992)

  // Product display
  newProductDays: 45, // badge "NUEVO" expires after N days
};
