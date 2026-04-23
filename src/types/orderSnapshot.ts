/**
 * Order snapshot types — SSOT architecture for immutable purchase records.
 *
 * CONCEPTO 1 — FUENTE ÚNICA DE VERDAD (SSOT):
 *   Los datos VIVOS (empresa, productos, precios) residen en UN solo lugar:
 *   `SITE_CONFIG`, `PRODUCTS`, `priceEngine`. Este archivo NO los duplica —
 *   solo aporta los tipos y la utilidad para CONGELAR esos datos en el
 *   momento de la compra.
 *
 * CONCEPTO 2 — SNAPSHOT EN EL MOMENTO DE LA COMPRA:
 *   Al crear un pedido, copiamos los datos relevantes y los congelamos.
 *   Si mañana cambia el CIF, la dirección, o el precio de un producto, los
 *   pedidos/facturas históricos NO se alteran nunca. Requisito legal:
 *   Art. 6 RD 1619/2012 (factura = fotografía fiscal del momento).
 */
import { SITE_CONFIG } from "@/config/siteConfig";

/**
 * Copia congelada del emisor (la tienda) en el momento del pedido.
 * Se persiste dentro de `OrderRecord.sellerSnapshot` y se reutiliza al
 * generar la factura — así una mudanza / rebranding posterior no reescribe
 * retroactivamente facturas ya emitidas.
 */
export interface SellerSnapshot {
  /** Marca comercial — puede rebrandear en el futuro. */
  name: string;
  /** Razón social legal — lo que aparece en factura. */
  legalName: string;
  /** CIF/NIF del emisor — solo cambia en casos excepcionales (fusión). */
  cif: string;
  /** Dirección fiscal completa, sin parsear. */
  address: string;
  email: string;
  phone: string;
  /** Tipo de IVA general aplicable (%). */
  vatRate: number;
  /** ISO timestamp del instante en que se tomó la foto. */
  capturedAt: string;
}

/**
 * Lee SITE_CONFIG AHORA MISMO y devuelve un objeto plano e inmutable.
 * Es un WRAPPER — no una copia paralela — de la SSOT (`SITE_CONFIG`).
 * Tras llamarla, el objeto resultante ya no está ligado a cambios futuros.
 */
export function captureSellerSnapshot(): SellerSnapshot {
  return Object.freeze({
    name: SITE_CONFIG.name,
    legalName: SITE_CONFIG.legalName,
    cif: SITE_CONFIG.cif,
    address: SITE_CONFIG.address,
    email: SITE_CONFIG.email,
    phone: SITE_CONFIG.phone,
    vatRate: SITE_CONFIG.vatRate,
    capturedAt: new Date().toISOString(),
  });
}

/** Rol aplicado al calcular los precios del pedido — se guarda por auditoría. */
export type CustomerRoleSnapshot = "cliente" | "mayorista" | "tienda" | "admin";

/** Entrada de historial de estado del pedido — append-only. */
export interface OrderStatusHistoryEntry {
  status: string;
  changedAt: string;
  changedBy?: string;
  note?: string;
}
