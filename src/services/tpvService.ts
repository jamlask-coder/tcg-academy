/**
 * tpvService — Cierre de venta presencial (Terminal Punto de Venta).
 *
 * UNA VENTA TPV NO ES UN PEDIDO. No aparece en `/admin/pedidos`. Es una
 * operación cerrada inmediatamente: el cliente sale con la mercancía y se
 * registra en el histórico de la tienda + se emite ticket/factura.
 *
 * Bifurcación según `TpvStore.sharesWebStock` y `TpvStore.sharesWebInvoicing`:
 *
 *   ─ Calpe (sharesWeb*=true) ────────────────────────────────────────────
 *     • Stock: descuenta del catálogo central (`persistProductPatch`).
 *     • Factura: libro central de TCG Academy SL (`createInvoice`) con
 *       `metadata.salesChannel="CALPE"` y serie "PC".
 *     • Sales registry: `tcgacademy_tpv_calpe_sales` (su propio histórico).
 *
 *   ─ Béjar / Madrid / Barcelona (sharesWeb*=false) ──────────────────────
 *     • Stock: independiente (`tpvStoreStockService`).
 *     • Factura: libro propio de la tienda (`tpvStoreInvoiceService`),
 *       cadena hash propia, contador propio, empresa emisora propia.
 *     • Sales registry: `tcgacademy_tpv_<slug>_sales`.
 *
 * Si la factura falla, la venta queda registrada en el sales registry con
 * `invoiceId: null` para que el admin pueda regenerarla manualmente.
 */

import { persistProductPatch } from "@/lib/productPersist";
import { getMergedById } from "@/lib/productStore";
import { isSnackId } from "@/data/tpvSnacks";
import { isEventVirtualId } from "@/lib/eventProduct";

/**
 * Rango reservado para "líneas manuales" del TPV — productos que el operador
 * teclea a mano (ej: carta suelta "Pikachu 281", artículo no catalogado).
 * No están en el catálogo, no llevan stock y se identifican por ID en este
 * rango para que el flujo de cobro/factura los trate sin tocar inventario.
 */
export const MANUAL_LINE_ID_BASE = 70_000_000;
const MANUAL_LINE_ID_LIMIT = 79_999_999;
export function isManualLineId(id: number): boolean {
  return id >= MANUAL_LINE_ID_BASE && id <= MANUAL_LINE_ID_LIMIT;
}
/** Genera un ID único en el rango manual para una línea recién creada. */
export function newManualLineId(): number {
  // Pseudo-único: timestamp ms acotado a 8M + random — colisiones improbables
  // en una misma venta y, aún si pasan, sólo merge-ríamos cantidades de dos
  // ítems que el operador ya quería separados (impacto cero).
  const t = Date.now() % 8_000_000;
  const r = Math.floor(Math.random() * 1_000_000);
  return MANUAL_LINE_ID_BASE + t + r;
}
import { createInvoice } from "@/services/invoiceService";
import { calcVAT } from "@/lib/pricing";
import { SITE_CONFIG } from "@/config/siteConfig";
import {
  InvoiceType,
  InvoiceOrigin,
  TaxIdType,
  PaymentMethod,
  type CompanyData,
  type CustomerData,
  type InvoiceLineItem,
} from "@/types/fiscal";
import {
  TPV_STORES,
  type TpvStore,
  type TpvStoreSlug,
} from "@/config/tpvStores";
import {
  appendTpvSale,
  attachInvoiceToSale,
  type TpvStoreSale,
  type TpvStoreSaleLine,
  type TpvStoreSaleCustomer,
} from "@/services/tpvStoreSalesService";
import {
  decrementStoreStock,
} from "@/services/tpvStoreStockService";
import {
  createStoreInvoice,
  buildInvoiceItemsFromSaleLines,
} from "@/services/tpvStoreInvoiceService";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

/** Línea del carrito TPV. Snapshot del precio al añadir — inmutable después. */
export interface TpvSaleLine {
  productId: number;
  name: string;
  quantity: number;
  /** Precio unitario CON IVA (lo que ve el cliente). */
  unitPriceWithVat: number;
  /** Tipo IVA aplicado (4/10/21). */
  vatRate: 0 | 4 | 10 | 21;
}

/** Cliente identificado para factura completa. Opcional. */
export interface TpvCustomer {
  /** Nombre completo o razón social. */
  name: string;
  /** NIF/CIF/NIE — obligatorio si `mode === "factura"`. */
  taxId?: string;
  taxIdType?: "DNI" | "NIE" | "CIF";
  email?: string;
  phone?: string;
  /** Dirección postal — obligatoria en factura COMPLETA. */
  address?: {
    street: string;
    city: string;
    postalCode: string;
    province: string;
    country?: string;
  };
}

export type TpvPaymentMethod = "efectivo" | "tarjeta";
export type TpvSaleMode = "ticket" | "factura";

export interface CompleteSaleParams {
  /** Slug de la tienda donde se realiza la venta (calpe/bejar/madrid/barcelona). */
  storeSlug: TpvStoreSlug;
  lines: TpvSaleLine[];
  payment: TpvPaymentMethod;
  /** Importe entregado por el cliente (sólo efectivo, para calcular cambio). */
  cashTendered?: number;
  mode: TpvSaleMode;
  customer?: TpvCustomer;
  /** ID del operador (admin logueado) que cobra. */
  operatorId: string;
  operatorName: string;
}

export interface CompleteSaleResult {
  ok: boolean;
  /** ID de la venta TPV (NO es un orderId — TPV no genera pedidos). */
  saleId: string;
  /** Slug de la tienda — devuelto para que la UI pueda routear a su panel. */
  storeSlug: TpvStoreSlug;
  /** Sólo si se emitió factura. */
  invoiceId?: string;
  invoiceNumber?: string;
  /** Cambio a devolver al cliente (sólo efectivo). 0 si no aplica. */
  change: number;
  error?: string;
}

// ─── Helpers internos ────────────────────────────────────────────────────────

/**
 * Genera un ID estable para la venta TPV. Formato `<PREFIX>-YYYYMMDD-XXXX`.
 * El prefijo coincide con la serie de factura para que sale↔factura sean
 * fácilmente cruzables en logs.
 */
function generateSaleId(store: TpvStore): string {
  const d = new Date();
  const ymd =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const arr = new Uint8Array(3);
  crypto.getRandomValues(arr);
  const rand = Array.from(arr)
    .map((b) => b.toString(36))
    .join("")
    .slice(0, 4)
    .toUpperCase();
  return `${store.invoiceSeriesPrefix}-${ymd}-${rand}`;
}

/** Total con IVA del carrito (suma directa de las líneas). */
export function computeTpvTotal(lines: TpvSaleLine[]): number {
  return lines.reduce(
    (sum, l) => sum + l.unitPriceWithVat * l.quantity,
    0,
  );
}

/**
 * Convierte líneas TPV → InvoiceLineItem[] para el libro central.
 * El precio CON IVA se descompone hacia atrás vía `calcVAT()` para que el
 * total no pierda céntimos por redondeo.
 */
function buildCentralInvoiceLines(lines: TpvSaleLine[]): InvoiceLineItem[] {
  return lines.map((l, i) => {
    const totalLineWithVat = l.unitPriceWithVat * l.quantity;
    const { priceWithoutVAT: taxableBase, vatAmount } = calcVAT(
      totalLineWithVat,
      l.vatRate,
    );
    const unitPriceWithoutVat = calcVAT(l.unitPriceWithVat, l.vatRate)
      .priceWithoutVAT;
    return {
      lineNumber: i + 1,
      productId: String(l.productId),
      description: l.name,
      quantity: l.quantity,
      unitPrice: unitPriceWithoutVat,
      discount: 0,
      discountAmount: 0,
      taxableBase,
      vatRate: l.vatRate,
      vatAmount,
      surchargeRate: 0,
      surchargeAmount: 0,
      totalLine: totalLineWithVat,
    };
  });
}

/** Normaliza nifType del UI al enum fiscal. */
function toTaxIdType(t?: "DNI" | "NIE" | "CIF"): TaxIdType {
  if (t === "CIF") return TaxIdType.CIF;
  if (t === "NIE") return TaxIdType.NIE;
  return TaxIdType.NIF;
}

function toSaleLines(lines: TpvSaleLine[]): TpvStoreSaleLine[] {
  return lines.map((l) => ({
    productId: l.productId,
    name: l.name,
    quantity: l.quantity,
    unitPriceWithVat: l.unitPriceWithVat,
    vatRate: l.vatRate,
  }));
}

function toSaleCustomer(c: TpvCustomer | undefined): TpvStoreSaleCustomer | null {
  if (!c || !c.name) return null;
  return {
    name: c.name,
    taxId: c.taxId,
    taxIdType: c.taxIdType,
    email: c.email,
    phone: c.phone,
    address: c.address,
  };
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Cierra una venta TPV. Operación atómica desde el punto de vista del usuario:
 *  1. Validaciones (carrito no vacío, factura tiene NIF/dirección si aplica,
 *     stock disponible, efectivo suficiente).
 *  2. Descuenta stock — central o de tienda según `sharesWebStock`.
 *  3. Emite factura — libro central o libro propio según `sharesWebInvoicing`.
 *  4. Persiste la venta en `tpv_<slug>_sales` con referencia a la factura.
 *
 * Si la factura falla pero el resto va OK, devuelve `ok:true` con `error`
 * descriptivo y la venta queda registrada para regenerar la factura.
 */
export async function completeTpvSale(
  params: CompleteSaleParams,
): Promise<CompleteSaleResult> {
  const {
    storeSlug, lines, payment, cashTendered, mode, customer,
    operatorId, operatorName,
  } = params;

  const store = TPV_STORES[storeSlug];
  if (!store) {
    return {
      ok: false, saleId: "", storeSlug, change: 0,
      error: `Tienda desconocida: "${storeSlug}".`,
    };
  }

  if (lines.length === 0) {
    return { ok: false, saleId: "", storeSlug, change: 0, error: "Carrito vacío." };
  }
  if (mode === "factura") {
    if (!customer?.name?.trim()) {
      return { ok: false, saleId: "", storeSlug, change: 0, error: "Falta nombre del cliente para factura completa." };
    }
    if (!customer.taxId?.trim()) {
      return { ok: false, saleId: "", storeSlug, change: 0, error: "Falta NIF/CIF del cliente para factura completa." };
    }
    if (!customer.address?.street || !customer.address?.city || !customer.address?.postalCode) {
      return { ok: false, saleId: "", storeSlug, change: 0, error: "Falta dirección fiscal del cliente para factura completa." };
    }
  }

  const total = computeTpvTotal(lines);
  if (payment === "efectivo" && cashTendered !== undefined && cashTendered < total) {
    return { ok: false, saleId: "", storeSlug, change: 0, error: "Efectivo entregado insuficiente." };
  }
  const change = payment === "efectivo" && cashTendered !== undefined
    ? Math.max(0, +(cashTendered - total).toFixed(2))
    : 0;

  // ── 1) STOCK ─────────────────────────────────────────────────────────────
  // Pre-check stock antes de emitir factura — si falta, abortamos la venta
  // sin tocar nada (no hay rollback si ya hemos emitido factura standalone).
  if (store.sharesWebStock) {
    // Calpe: validar contra catálogo central.
    for (const l of lines) {
      // Líneas manuales (cartas sueltas tecleadas) no tocan stock central.
      if (isManualLineId(l.productId)) continue;
      const product = getMergedById(l.productId);
      if (!product) {
        return {
          ok: false, saleId: "", storeSlug, change: 0,
          error: `Producto ${l.productId} no encontrado en catálogo.`,
        };
      }
      if (product.stock !== undefined && product.stock < l.quantity) {
        return {
          ok: false, saleId: "", storeSlug, change: 0,
          error: `Stock insuficiente: ${l.name} (${product.stock} disp., ${l.quantity} solicitados).`,
        };
      }
    }
  } else {
    // Standalone: validar contra stock de tienda.
    // Hacemos un dry-run: leemos el map y comprobamos antes de decrementar.
    // Importamos lazy para no traer el módulo en builds sin TPV.
    const { getStoreStock } = await import("@/services/tpvStoreStockService");
    for (const l of lines) {
      // Snacks, entradas a eventos y líneas manuales no llevan stock por
      // tienda standalone: snacks ilimitados, entradas usan capacity global,
      // y líneas manuales (singles tecleadas) son fuera de inventario.
      if (
        isSnackId(l.productId) ||
        isEventVirtualId(l.productId) ||
        isManualLineId(l.productId)
      ) continue;
      const cur = getStoreStock(storeSlug, l.productId);
      if (cur === null) {
        return {
          ok: false, saleId: "", storeSlug, change: 0,
          error: `Producto ${l.name} no registrado en stock de ${store.name}.`,
        };
      }
      if (typeof cur !== "number" || cur < l.quantity) {
        return {
          ok: false, saleId: "", storeSlug, change: 0,
          error: `Stock insuficiente en ${store.name}: ${l.name} (${cur ?? 0} disp., ${l.quantity} solicitados).`,
        };
      }
    }
  }

  // Aplicamos descuento de stock.
  if (store.sharesWebStock) {
    for (const l of lines) {
      if (isManualLineId(l.productId)) continue; // fuera de catálogo
      const product = getMergedById(l.productId);
      if (!product) continue;
      if (product.stock === undefined) continue; // stock ilimitado
      const newStock = Math.max(0, product.stock - l.quantity);
      persistProductPatch(l.productId, {
        stock: newStock,
        inStock: newStock > 0,
      });
    }
  } else {
    for (const l of lines) {
      // Snacks/eventos/manuales: no decrementan stock standalone.
      if (
        isSnackId(l.productId) ||
        isEventVirtualId(l.productId) ||
        isManualLineId(l.productId)
      ) continue;
      const result = decrementStoreStock(storeSlug, l.productId, l.quantity);
      if (!result.ok) {
        // No debería ocurrir tras el pre-check, pero lo reportamos por seguridad.
        return {
          ok: false, saleId: "", storeSlug, change: 0,
          error: `Error decrementando stock: ${result.reason}`,
        };
      }
    }
  }

  // ── 2) Sales registry — antes de la factura para no perder la venta si
  //       la factura explota. Se actualiza al final con invoiceId.
  const saleId = generateSaleId(store);
  const sale: TpvStoreSale = {
    id: saleId,
    storeSlug,
    channel: store.channel,
    timestamp: new Date().toISOString(),
    lines: toSaleLines(lines),
    total,
    payment,
    cashTendered: payment === "efectivo" && cashTendered !== undefined ? cashTendered : null,
    change,
    mode,
    customer: toSaleCustomer(customer),
    operatorId,
    operatorName,
    invoiceId: null,
    invoiceNumber: null,
  };
  appendTpvSale(sale);

  // ── 3) FACTURA ───────────────────────────────────────────────────────────
  const paymentMethod = payment === "efectivo"
    ? PaymentMethod.EFECTIVO
    : PaymentMethod.DATAFONO;

  let invoiceId: string | undefined;
  let invoiceNumber: string | undefined;

  try {
    if (store.sharesWebInvoicing) {
      // CALPE — libro central, canal "CALPE", origen PRESENCIAL.
      const items = buildCentralInvoiceLines(lines);
      const recipient: CompanyData | CustomerData = mode === "ticket"
        ? {
            name: customer?.name?.trim() || "Cliente final",
            countryCode: "ES",
          } satisfies CustomerData
        : buildCompleteRecipient(customer!);
      const inv = await createInvoice({
        recipient,
        items,
        paymentMethod,
        sourceOrderId: saleId, // referencia cruzada al sales registry
        invoiceType: mode === "ticket" ? InvoiceType.SIMPLIFICADA : InvoiceType.COMPLETA,
        origin: InvoiceOrigin.PRESENCIAL,
        salesChannel: "CALPE",
      });
      invoiceId = inv.invoiceId;
      invoiceNumber = inv.invoiceNumber;
      // saveInvoice se invoca desde el flujo standard de invoiceService al
      // crear, pero createInvoice no persiste — lo hacemos aquí para
      // mantener el contrato: una venta TPV cerrada → factura ya en libro.
      const { saveInvoice } = await import("@/services/invoiceService");
      saveInvoice(inv);
    } else {
      // STANDALONE — libro propio de la tienda.
      const items = buildInvoiceItemsFromSaleLines(toSaleLines(lines));
      const recipient: CompanyData | CustomerData = mode === "ticket"
        ? {
            name: customer?.name?.trim() || "Cliente final",
            countryCode: "ES",
          } satisfies CustomerData
        : buildCompleteRecipient(customer!);
      const inv = await createStoreInvoice({
        store,
        recipient,
        items,
        paymentMethod,
        invoiceType: mode === "ticket" ? InvoiceType.SIMPLIFICADA : InvoiceType.COMPLETA,
        sourceSaleId: saleId,
      });
      invoiceId = inv.invoiceId;
      invoiceNumber = inv.invoiceNumber;
    }

    // 4) Vincular factura a la venta.
    if (invoiceId && invoiceNumber) {
      attachInvoiceToSale(storeSlug, saleId, invoiceId, invoiceNumber);
    }
  } catch (err) {
    return {
      ok: true,
      saleId,
      storeSlug,
      change,
      error:
        err instanceof Error
          ? `Venta cobrada pero la factura falló: ${err.message}. Regenérala desde el panel de la tienda.`
          : "Venta cobrada pero la factura falló — regenérala desde el panel de la tienda.",
    };
  }

  return { ok: true, saleId, storeSlug, change, invoiceId, invoiceNumber };
}

/** Construye un CompanyData válido a partir de TpvCustomer (factura completa). */
function buildCompleteRecipient(c: TpvCustomer): CompanyData {
  return {
    name: c.name,
    taxId: c.taxId!,
    taxIdType: toTaxIdType(c.taxIdType),
    address: {
      street: c.address!.street,
      city: c.address!.city,
      postalCode: c.address!.postalCode,
      province: c.address!.province,
      country: c.address?.country ?? "España",
      countryCode: "ES",
    },
    phone: c.phone ?? "",
    email: c.email ?? "",
    isEU: false,
    countryCode: "ES",
    recargoEquivalencia: false,
  };
}

// SITE_CONFIG referenciado para mantener simetría con la implementación
// previa (si se quisiera leer datos del local). Marcado como void para
// evitar tree-shake warnings y no romper imports al refactorizar.
void SITE_CONFIG;
