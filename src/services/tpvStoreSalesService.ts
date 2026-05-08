/**
 * tpvStoreSalesService — Histórico de ventas TPV por tienda.
 *
 * Cada venta presencial se registra aquí, en la clave de SU tienda. NUNCA
 * se mezcla con `/admin/pedidos` — una venta TPV NO es un pedido. Es una
 * operación cerrada en el momento (cliente sale con la mercancía).
 *
 * Calpe también usa este registro (aunque comparta stock y libro fiscal con
 * la web), porque queremos que cada tienda tenga su propio historial
 * operativo legible — caja, cierres por turno, ranking de productos, etc.
 *
 * Storage: `tcgacademy_tpv_<slug>_sales` (array de TpvStoreSale).
 * Evento: `tcga:tpv_sales:updated` (genérico — los listeners pueden
 *         re-leer todas las tiendas o filtrar por slug).
 */

import {
  TPV_STORES,
  tpvSalesKey,
  type TpvStoreSlug,
  type SalesChannel,
} from "@/config/tpvStores";
import { DataHub } from "@/lib/dataHub";

// ─── Tipos ───────────────────────────────────────────────────────────────────

/** Snapshot inmutable de una línea vendida. */
export interface TpvStoreSaleLine {
  productId: number;
  name: string;
  quantity: number;
  unitPriceWithVat: number;
  vatRate: 0 | 4 | 10 | 21;
}

/** Cliente identificado en la venta (opcional para tickets, obligatorio para factura). */
export interface TpvStoreSaleCustomer {
  name: string;
  taxId?: string;
  taxIdType?: "DNI" | "NIE" | "CIF";
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    province: string;
    country?: string;
  };
}

export interface TpvStoreSale {
  /** ID generado por la tienda. Formato: `<PREFIX>-YYYYMMDD-XXXX`. */
  id: string;
  /** Slug de la tienda donde se hizo la venta. */
  storeSlug: TpvStoreSlug;
  /** Canal grabado en la factura (espejo de TpvStore.channel). */
  channel: Exclude<SalesChannel, "WEB">;
  /** ISO timestamp de la operación. */
  timestamp: string;
  lines: TpvStoreSaleLine[];
  total: number;
  payment: "efectivo" | "tarjeta";
  /** Importe entregado en metálico (sólo efectivo) — para auditoría caja. */
  cashTendered: number | null;
  /** Cambio devuelto (sólo efectivo). */
  change: number;
  /** "ticket" → factura simplificada, "factura" → factura completa. */
  mode: "ticket" | "factura";
  customer: TpvStoreSaleCustomer | null;
  operatorId: string;
  operatorName: string;
  /** ID interno de la factura emitida (referencia cruzada al libro fiscal). */
  invoiceId: string | null;
  invoiceNumber: string | null;
}

// ─── Read ────────────────────────────────────────────────────────────────────

/** Carga todas las ventas de una tienda concreta. */
export function loadTpvSales(slug: TpvStoreSlug): TpvStoreSale[] {
  if (typeof window === "undefined") return [];
  if (!TPV_STORES[slug]) return [];
  try {
    const raw = localStorage.getItem(tpvSalesKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TpvStoreSale[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Carga ventas de TODAS las tiendas — útil para un dashboard global. */
export function loadAllTpvSales(): TpvStoreSale[] {
  const out: TpvStoreSale[] = [];
  for (const slug of Object.keys(TPV_STORES) as TpvStoreSlug[]) {
    out.push(...loadTpvSales(slug));
  }
  return out;
}

// ─── Write ───────────────────────────────────────────────────────────────────

/** Persiste una nueva venta. Idempotente sobre `id` (re-escribe si ya existe). */
export function appendTpvSale(sale: TpvStoreSale): void {
  if (typeof window === "undefined") return;
  if (!TPV_STORES[sale.storeSlug]) {
    throw new Error(`tpvStoreSalesService: slug desconocido "${sale.storeSlug}"`);
  }
  const existing = loadTpvSales(sale.storeSlug);
  const idx = existing.findIndex((s) => s.id === sale.id);
  const next = idx >= 0
    ? existing.map((s, i) => (i === idx ? sale : s))
    : [...existing, sale];
  try {
    localStorage.setItem(tpvSalesKey(sale.storeSlug), JSON.stringify(next));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    throw new Error(`tpvStoreSalesService: persist failed (${msg}).`);
  }
  DataHub.emit("tpv_sales");
}

/** Vincula la factura emitida a una venta ya persistida. */
export function attachInvoiceToSale(
  slug: TpvStoreSlug,
  saleId: string,
  invoiceId: string,
  invoiceNumber: string,
): void {
  const list = loadTpvSales(slug);
  const idx = list.findIndex((s) => s.id === saleId);
  if (idx < 0) return;
  const updated = { ...list[idx], invoiceId, invoiceNumber };
  appendTpvSale(updated); // re-escribe (id match → reemplaza)
}

// ─── KPIs / agregados ────────────────────────────────────────────────────────

/** Total facturado por una tienda en un rango (incl. fechas). */
export function totalRevenue(
  slug: TpvStoreSlug,
  fromIso?: string,
  toIso?: string,
): number {
  const list = loadTpvSales(slug);
  return list
    .filter((s) => {
      if (fromIso && s.timestamp < fromIso) return false;
      if (toIso && s.timestamp > toIso) return false;
      return true;
    })
    .reduce((sum, s) => sum + s.total, 0);
}

/** Cantidad de ventas (operaciones, no líneas). */
export function totalOperations(slug: TpvStoreSlug): number {
  return loadTpvSales(slug).length;
}
