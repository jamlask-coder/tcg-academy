/**
 * TPV Stores — SSOT del catálogo de tiendas físicas.
 *
 * Cada tienda es un origen de venta independiente. Dos modelos:
 *
 *   1. SHARED (sólo Calpe): la venta TPV alimenta el mismo stock central que
 *      la web y la factura entra en el libro fiscal central de TCG Academy SL.
 *      La venta queda registrada en `tpv_calpe_sales` para que la tienda tenga
 *      su propio histórico, pero contablemente es indistinguible de una venta
 *      web (mismo emisor, mismas obligaciones AEAT). Se diferencian por
 *      `salesChannel: "WEB" | "CALPE"` y por la serie de factura.
 *
 *   2. STANDALONE (Béjar / Madrid / Barcelona): tienda totalmente separada.
 *      Stock propio, libro fiscal propio (cadena hash propia, contador propio,
 *      empresa emisora propia), histórico de ventas propio. NO toca nada
 *      del sistema central. Cada tienda lleva su contabilidad como si fuese
 *      una empresa distinta.
 *
 * Antes de añadir una tienda nueva: registrar aquí + en `dataHub/registry.ts`
 * (claves storage) + en `dataHub/events.ts` (no hace falta evento por tienda,
 * basta el genérico `TPV_*_UPDATED`).
 */

import type { CompanyData } from "@/types/fiscal";
import { TaxIdType } from "@/types/fiscal";
import { SITE_CONFIG } from "@/config/siteConfig";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type TpvStoreSlug = "calpe" | "bejar" | "madrid" | "barcelona";

/** Canal del que proviene la factura emitida — visible en el libro central. */
export type SalesChannel = "WEB" | "CALPE" | "BEJAR" | "MADRID" | "BARCELONA";

export interface TpvStore {
  slug: TpvStoreSlug;
  /** Nombre humano para UI. */
  name: string;
  /**
   * Si true, las ventas de esta tienda descuentan stock del catálogo central
   * (mismo path que el checkout web). Si false, mantiene stock propio
   * independiente.
   */
  sharesWebStock: boolean;
  /**
   * Si true, las facturas se escriben en el libro central de TCG Academy SL
   * (`createInvoice()`). Si false, libro fiscal propio con cadena hash y
   * contador independientes (`tpvStoreInvoiceService`).
   */
  sharesWebInvoicing: boolean;
  /**
   * Prefijo de serie de factura. WEB usa "FAC" (legacy) — Calpe usa "PC"
   * para distinguirla en el libro central. Béjar/Madrid/Barcelona tienen
   * el suyo en sus libros propios.
   */
  invoiceSeriesPrefix: string;
  /** Canal grabado en `InvoiceRecord.metadata.salesChannel`. */
  channel: Exclude<SalesChannel, "WEB">;
  /**
   * Empresa emisora — solo se usa si `sharesWebInvoicing === false`.
   * Calpe usa el `buildIssuer()` central (TCG Academy SL).
   */
  company: CompanyData | null;
  /** Dirección física de la tienda — visible en tickets impresos. */
  physicalAddress: string;
  /**
   * Perfil público de la tienda en Cardmarket. `null` si todavía no tiene
   * cuenta abierta. Se usa para enlazar desde la web hacia la reputación
   * pública de la tienda.
   */
  cardmarketUrl: string | null;
}

// ─── Datos fiscales placeholders para tiendas standalone ─────────────────────
//
// IMPORTANTE: estos datos son MOCK hasta que cada tienda esté constituida con
// su propia entidad jurídica. Mientras tanto, las tiendas standalone usan un
// CIF placeholder ("PENDIENTE") y emiten igualmente sus tickets/facturas
// internas — pero NO se envían a AEAT. La integración VeriFactu por tienda
// se activará cuando cada tienda tenga su CIF real.

const STANDALONE_PLACEHOLDER_ISSUER = (params: {
  name: string;
  street: string;
  city: string;
  postalCode: string;
  province: string;
}): CompanyData => ({
  name: params.name,
  // Placeholder reconocible — la auditoría fiscal lo detectará y bloqueará
  // envío a AEAT hasta que se ponga el CIF real.
  taxId: "PENDIENTE",
  taxIdType: TaxIdType.CIF,
  address: {
    street: params.street,
    city: params.city,
    postalCode: params.postalCode,
    province: params.province,
    country: "España",
    countryCode: "ES",
  },
  phone: "",
  email: "",
  isEU: false,
  countryCode: "ES",
});

// ─── Catálogo ────────────────────────────────────────────────────────────────

export const TPV_STORES: Record<TpvStoreSlug, TpvStore> = {
  calpe: {
    slug: "calpe",
    name: "Calpe",
    sharesWebStock: true,
    sharesWebInvoicing: true,
    invoiceSeriesPrefix: "PC",
    channel: "CALPE",
    company: null, // usa el issuer central (TCG Academy SL)
    physicalAddress: SITE_CONFIG.address,
    cardmarketUrl: "https://www.cardmarket.com/en/Magic/Users/TCGAcademy",
  },
  bejar: {
    slug: "bejar",
    name: "Béjar",
    sharesWebStock: false,
    sharesWebInvoicing: false,
    invoiceSeriesPrefix: "PB",
    channel: "BEJAR",
    company: STANDALONE_PLACEHOLDER_ISSUER({
      name: "TCG Academy Béjar",
      street: "—",
      city: "Béjar",
      postalCode: "37700",
      province: "Salamanca",
    }),
    physicalAddress: "Béjar (Salamanca)",
    cardmarketUrl: "https://www.cardmarket.com/en/Magic/Users/TCGACADEMYBEJAR",
  },
  madrid: {
    slug: "madrid",
    name: "Madrid",
    sharesWebStock: false,
    sharesWebInvoicing: false,
    invoiceSeriesPrefix: "PM",
    channel: "MADRID",
    company: STANDALONE_PLACEHOLDER_ISSUER({
      name: "TCG Academy Madrid",
      street: "—",
      city: "Madrid",
      postalCode: "28001",
      province: "Madrid",
    }),
    physicalAddress: "Madrid",
    cardmarketUrl: "https://www.cardmarket.com/es/Pokemon/Users/TcgAcademyMadrid",
  },
  barcelona: {
    slug: "barcelona",
    name: "Barcelona",
    sharesWebStock: false,
    sharesWebInvoicing: false,
    invoiceSeriesPrefix: "PX",
    channel: "BARCELONA",
    company: STANDALONE_PLACEHOLDER_ISSUER({
      name: "TCG Academy Barcelona",
      street: "—",
      city: "Barcelona",
      postalCode: "08001",
      province: "Barcelona",
    }),
    physicalAddress: "Barcelona",
    cardmarketUrl: null,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Devuelve la tienda o null si el slug no existe. */
export function getTpvStore(slug: string): TpvStore | null {
  if (slug in TPV_STORES) return TPV_STORES[slug as TpvStoreSlug];
  return null;
}

/** Lista de slugs válidos. Útil para validación de rutas. */
export const TPV_STORE_SLUGS: readonly TpvStoreSlug[] = Object.keys(
  TPV_STORES,
) as TpvStoreSlug[];

/** Tiendas que mantienen libro fiscal y stock independientes. */
export function getStandaloneStores(): TpvStore[] {
  return Object.values(TPV_STORES).filter(
    (s) => !s.sharesWebInvoicing || !s.sharesWebStock,
  );
}

// ─── Storage keys ────────────────────────────────────────────────────────────

/** Sales registry — cada tienda lleva su histórico (incluida Calpe). */
export function tpvSalesKey(slug: TpvStoreSlug): string {
  return `tcgacademy_tpv_${slug}_sales`;
}

/**
 * Stock independiente — sólo aplica a stores con sharesWebStock=false.
 * Calpe NO tiene esta clave: usa el catálogo central.
 */
export function tpvStockKey(slug: TpvStoreSlug): string {
  return `tcgacademy_tpv_${slug}_stock`;
}

/**
 * Libro fiscal independiente — sólo aplica a stores con sharesWebInvoicing=false.
 * Calpe NO tiene esta clave: usa el libro central.
 */
export function tpvInvoicesKey(slug: TpvStoreSlug): string {
  return `tcgacademy_tpv_${slug}_invoices`;
}

/** Último hash de la cadena fiscal de la tienda standalone. */
export function tpvInvoiceChainKey(slug: TpvStoreSlug): string {
  return `tcgacademy_tpv_${slug}_inv_chain`;
}

/** Último número de factura de la serie de la tienda standalone. */
export function tpvInvoiceCounterKey(slug: TpvStoreSlug): string {
  return `tcgacademy_tpv_${slug}_inv_counter`;
}
