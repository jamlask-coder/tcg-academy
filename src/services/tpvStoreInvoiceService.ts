/**
 * tpvStoreInvoiceService — Libro fiscal independiente por tienda standalone.
 *
 * Aplica únicamente a tiendas con `sharesWebInvoicing === false`
 * (Béjar / Madrid / Barcelona). Calpe NUNCA pasa por aquí — sus facturas
 * van al libro central de TCG Academy SL vía `createInvoice()`.
 *
 * Cada tienda mantiene:
 *   - Su propio array de InvoiceRecord (`tpv_<slug>_invoices`)
 *   - Su propia cadena hash SHA-256 (`tpv_<slug>_inv_chain`)
 *   - Su propio contador correlativo anual (derivado del array)
 *   - Su propia empresa emisora (snapshot inmutable de `TpvStore.company`)
 *
 * Las cadenas de las tiendas standalone son TOTALMENTE INDEPENDIENTES entre
 * sí y de la cadena central. Manipular una factura de Béjar NO altera
 * Madrid ni el libro central — y al revés.
 */

import {
  TPV_STORES,
  tpvInvoicesKey,
  tpvInvoiceChainKey,
  tpvInvoiceCounterKey,
  type TpvStore,
  type TpvStoreSlug,
} from "@/config/tpvStores";
import {
  InvoiceType,
  InvoiceStatus,
  VerifactuStatus,
  AuditAction,
  CorrectionType,
  InvoiceOrigin,
  type InvoiceRecord,
  type InvoiceLineItem,
  type CompanyData,
  type CustomerData,
  type PaymentMethod,
  type CorrectionData,
} from "@/types/fiscal";
import {
  buildLineItem as buildLineItemCanonical,
  calculateTotals,
} from "@/services/invoiceService";
import { calculateTaxBreakdown } from "@/services/taxService";
import { DataHub } from "@/lib/dataHub";

// ─── Read ────────────────────────────────────────────────────────────────────

function deserializeDates(inv: InvoiceRecord): InvoiceRecord {
  return {
    ...inv,
    invoiceDate: new Date(inv.invoiceDate),
    operationDate: new Date(inv.operationDate),
    paymentDate: inv.paymentDate ? new Date(inv.paymentDate) : null,
    verifactuTimestamp: inv.verifactuTimestamp
      ? new Date(inv.verifactuTimestamp)
      : null,
    createdAt: new Date(inv.createdAt),
    updatedAt: new Date(inv.updatedAt),
    auditLog: inv.auditLog.map((e) => ({
      ...e,
      timestamp: new Date(e.timestamp),
    })),
  };
}

export function loadStoreInvoices(slug: TpvStoreSlug): InvoiceRecord[] {
  if (typeof window === "undefined") return [];
  if (!TPV_STORES[slug] || TPV_STORES[slug].sharesWebInvoicing) return [];
  try {
    const raw = localStorage.getItem(tpvInvoicesKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InvoiceRecord[];
    return Array.isArray(parsed) ? parsed.map(deserializeDates) : [];
  } catch {
    return [];
  }
}

function getLastChainHash(slug: TpvStoreSlug): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(tpvInvoiceChainKey(slug));
}

// ─── Write ───────────────────────────────────────────────────────────────────

function persistStoreInvoices(slug: TpvStoreSlug, list: InvoiceRecord[]): void {
  try {
    localStorage.setItem(tpvInvoicesKey(slug), JSON.stringify(list));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    throw new Error(
      `tpvStoreInvoiceService(${slug}): persist failed (${msg}).`,
    );
  }
  DataHub.emit("tpv_invoices");
}

// ─── Numeración propia (correlativa por tienda y año) ────────────────────────

/**
 * Genera el siguiente número de factura para esa tienda. Formato:
 *   `<PREFIX>-YYYY-NNNNN`
 * Sin dígitos de control — la cadena hash garantiza integridad y la cadena
 * es por-tienda. El prefijo (PB/PM/PX) impide que se confunda con una
 * factura del libro central (FAC) o de otra tienda.
 */
function generateStoreInvoiceNumber(store: TpvStore): string {
  const year = new Date().getFullYear();
  const prefix = `${store.invoiceSeriesPrefix}-${year}-`;
  const list = loadStoreInvoices(store.slug);
  let maxN = 0;
  for (const inv of list) {
    if (!inv.invoiceNumber.startsWith(prefix)) continue;
    const tail = inv.invoiceNumber.slice(prefix.length);
    const n = parseInt(tail, 10);
    if (Number.isFinite(n) && n > maxN) maxN = n;
  }
  // Persistimos contador para diagnóstico (no es la fuente — es derivado).
  const next = maxN + 1;
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(tpvInvoiceCounterKey(store.slug), String(next));
    }
  } catch { /* non-critical */ }
  return `${prefix}${String(next).padStart(5, "0")}`;
}

// ─── Hash + cadena ───────────────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function generateContentHash(invoice: InvoiceRecord): Promise<string> {
  const content = [
    invoice.issuer.taxId,
    invoice.invoiceNumber,
    formatDateForHash(invoice.invoiceDate),
    invoice.totals.totalInvoice.toFixed(2),
    "taxId" in invoice.recipient ? (invoice.recipient.taxId ?? "") : "",
  ].join("|");
  return sha256(content);
}

function formatDateForHash(d: Date | string): string {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function chainHash(
  current: string,
  previous: string | null,
): Promise<string> {
  return sha256(current + (previous ?? ""));
}

// ─── API pública ─────────────────────────────────────────────────────────────

export interface CreateStoreInvoiceParams {
  store: TpvStore;
  recipient: CompanyData | CustomerData;
  items: InvoiceLineItem[];
  paymentMethod: PaymentMethod;
  /** Marca tipo simplificada vs completa. */
  invoiceType?: InvoiceType;
  /** Vincula la venta de origen (referencia cruzada). */
  sourceSaleId?: string;
  invoiceDate?: Date;
}

/**
 * Crea + persiste una factura en el libro propio de la tienda standalone.
 * Devuelve el InvoiceRecord ya con hashes encadenados.
 *
 * NO llama a `createJournalFromInvoice()` central ni a VeriFactu — las
 * tiendas standalone tienen contabilidad/AEAT separadas (cuando lleguen).
 */
export async function createStoreInvoice(
  params: CreateStoreInvoiceParams,
): Promise<InvoiceRecord> {
  const {
    store,
    recipient,
    items,
    paymentMethod,
    invoiceType = InvoiceType.COMPLETA,
    sourceSaleId,
    invoiceDate = new Date(),
  } = params;

  if (store.sharesWebInvoicing) {
    throw new Error(
      `tpvStoreInvoiceService: ${store.slug} comparte facturación con la web — usar createInvoice() central`,
    );
  }
  if (!store.company) {
    throw new Error(
      `tpvStoreInvoiceService: ${store.slug} no tiene CompanyData configurada`,
    );
  }

  const taxBreakdown = calculateTaxBreakdown(items);
  const totals = calculateTotals(items);
  const invoiceNumber = generateStoreInvoiceNumber(store);

  const invoice: InvoiceRecord = {
    invoiceId: `inv_${store.slug}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    invoiceNumber,
    invoiceDate,
    operationDate: invoiceDate,
    invoiceType,
    issuer: store.company,
    recipient,
    items,
    taxBreakdown,
    totals,
    paymentMethod,
    paymentDate: new Date(),
    status: InvoiceStatus.EMITIDA,
    verifactuHash: null,
    verifactuChainHash: null,
    verifactuQR: null,
    verifactuStatus: VerifactuStatus.PENDIENTE,
    verifactuTimestamp: null,
    verifactuError: null,
    previousInvoiceChainHash: null,
    correctionData: null,
    sourceOrderId: sourceSaleId ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
    auditLog: [
      {
        timestamp: new Date(),
        userId: "system",
        userName: `Sistema TPV ${store.name}`,
        action: AuditAction.CREADA,
        detail: `Factura ${invoiceNumber} creada en libro propio de ${store.name}`,
      },
    ],
    // Canal grabado en metadata — visible al filtrar en /admin/tpv/<slug>.
    metadata: {
      salesChannel: store.channel,
      tpvStoreSlug: store.slug,
    },
  };

  // Hash de contenido + cadena PROPIA de la tienda.
  const contentHash = await generateContentHash(invoice);
  invoice.verifactuHash = contentHash;
  const previousChain = getLastChainHash(store.slug);
  const newChain = await chainHash(contentHash, previousChain);
  invoice.verifactuChainHash = newChain;
  invoice.previousInvoiceChainHash = previousChain;

  // Persiste
  const list = loadStoreInvoices(store.slug);
  persistStoreInvoices(store.slug, [...list, invoice]);
  try {
    localStorage.setItem(tpvInvoiceChainKey(store.slug), newChain);
  } catch { /* non-critical */ }

  return invoice;
}

// ─── Rectificativas standalone ───────────────────────────────────────────────

export interface RectifyStoreInvoiceParams {
  storeSlug: TpvStoreSlug;
  /** invoiceId de la factura ORIGINAL en el libro propio de la tienda. */
  originalId: string;
  correctionData: CorrectionData;
  /** Si se omiten, copia las líneas/recipient/método de pago de la original. */
  items?: InvoiceLineItem[];
  recipient?: CompanyData | CustomerData;
  paymentMethod?: PaymentMethod;
  userId?: string;
  userName?: string;
}

/**
 * Crea una factura rectificativa en el libro PROPIO de la tienda standalone.
 * Análogo a `rectifyInvoice()` central pero usando `createStoreInvoice` y
 * el array `tpv_<slug>_invoices`.
 *
 * Modo SUSTITUCION → marca la original como ANULADA (devolución total típica
 * del TPV de mostrador). Modo DIFERENCIAS → original sigue vigente.
 */
export async function rectifyStoreInvoice(
  params: RectifyStoreInvoiceParams,
): Promise<InvoiceRecord> {
  const { storeSlug, originalId, correctionData } = params;
  const store = TPV_STORES[storeSlug];
  if (!store) throw new Error(`rectifyStoreInvoice: tienda ${storeSlug} desconocida`);
  if (store.sharesWebInvoicing) {
    throw new Error(
      `rectifyStoreInvoice: ${storeSlug} usa libro central — usar rectifyInvoice() en su lugar`,
    );
  }
  if (!correctionData?.reason?.trim()) {
    throw new Error("rectifyStoreInvoice: motivo de rectificación obligatorio");
  }

  const list = loadStoreInvoices(storeSlug);
  const original = list.find((inv) => inv.invoiceId === originalId);
  if (!original) throw new Error(`Factura ${originalId} no encontrada en ${storeSlug}`);
  if (original.status === InvoiceStatus.ANULADA) {
    throw new Error(`Factura ${original.invoiceNumber} ya está anulada.`);
  }
  if (original.invoiceType === InvoiceType.RECTIFICATIVA) {
    throw new Error(
      `${original.invoiceNumber} ya es rectificativa — emitir nueva sobre la original`,
    );
  }

  const fullCorrection: CorrectionData = {
    ...correctionData,
    originalInvoiceId: original.invoiceId,
    originalInvoiceNumber: original.invoiceNumber,
    originalInvoiceDate: new Date(original.invoiceDate),
  };

  // Crear la rectificativa como factura nueva en el libro propio.
  const rectificativa = await createStoreInvoice({
    store,
    recipient: params.recipient ?? original.recipient,
    items: params.items ?? original.items,
    paymentMethod: params.paymentMethod ?? original.paymentMethod,
    invoiceType: InvoiceType.RECTIFICATIVA,
    sourceSaleId: original.sourceOrderId ?? undefined,
  });

  // Re-etiquetar con sufijo "R" + correctionData + origen RECTIFICATIVA.
  // Como createStoreInvoice ya persistió, releer y patch in-place.
  const isSubstitution =
    fullCorrection.correctionType === CorrectionType.SUSTITUCION;
  const actorId = params.userId ?? "admin";
  const actorName = params.userName ?? "Administrador";

  const updatedList = loadStoreInvoices(storeSlug).map((inv) => {
    if (inv.invoiceId === rectificativa.invoiceId) {
      return {
        ...inv,
        invoiceNumber: `${inv.invoiceNumber}R`,
        correctionData: fullCorrection,
        auditLog: [
          ...inv.auditLog,
          {
            timestamp: new Date(),
            userId: actorId,
            userName: actorName,
            action: AuditAction.CREADA,
            detail: `Rectificativa de ${original.invoiceNumber} (${fullCorrection.reasonCode}: ${fullCorrection.reason})`,
          },
        ],
      };
    }
    if (inv.invoiceId === original.invoiceId && isSubstitution) {
      return {
        ...inv,
        status: InvoiceStatus.ANULADA,
        updatedAt: new Date(),
        auditLog: [
          ...inv.auditLog,
          {
            timestamp: new Date(),
            userId: actorId,
            userName: actorName,
            action: AuditAction.RECTIFICADA,
            detail: `Sustituida por rectificativa ${rectificativa.invoiceNumber}R (${fullCorrection.reasonCode}: ${fullCorrection.reason})`,
          },
        ],
      };
    }
    if (inv.invoiceId === original.invoiceId) {
      return {
        ...inv,
        updatedAt: new Date(),
        auditLog: [
          ...inv.auditLog,
          {
            timestamp: new Date(),
            userId: actorId,
            userName: actorName,
            action: AuditAction.RECTIFICADA,
            detail: `Rectificada por diferencias mediante ${rectificativa.invoiceNumber}R. Original sigue vigente.`,
          },
        ],
      };
    }
    return inv;
  });
  persistStoreInvoices(storeSlug, updatedList);

  // Devolver la versión final (con sufijo R + correctionData).
  const final = updatedList.find((inv) => inv.invoiceId === rectificativa.invoiceId);
  return final ?? rectificativa;
}

// Avoid unused-import warning when InvoiceOrigin is referenced symbolically only.
void InvoiceOrigin;

// ─── Verificación cadena ─────────────────────────────────────────────────────

/**
 * Recalcula la cadena hash de la tienda y detecta tampering. Devuelve la
 * lista de facturas con discrepancia. Útil en `/admin/tpv/<slug>/fiscal`.
 */
export async function verifyStoreChain(
  slug: TpvStoreSlug,
): Promise<Array<{ invoiceNumber: string; expected: string; stored: string }>> {
  const list = loadStoreInvoices(slug);
  const issues: Array<{ invoiceNumber: string; expected: string; stored: string }> = [];
  let prev: string | null = null;
  for (const inv of list) {
    if (!inv.verifactuHash || !inv.verifactuChainHash) continue;
    const expected = await chainHash(inv.verifactuHash, prev);
    if (expected !== inv.verifactuChainHash) {
      issues.push({
        invoiceNumber: inv.invoiceNumber,
        expected,
        stored: inv.verifactuChainHash,
      });
    }
    prev = inv.verifactuChainHash;
  }
  return issues;
}

// ─── Helper: construye InvoiceLineItem[] desde líneas de venta TPV ───────────

/**
 * Convierte líneas de venta TPV (precio CON IVA) en InvoiceLineItem[]
 * fiscales. Reutiliza `buildLineItem` canónico para evitar divergencias
 * de cálculo con el libro central.
 */
export function buildInvoiceItemsFromSaleLines(
  lines: Array<{
    productId: number;
    name: string;
    quantity: number;
    unitPriceWithVat: number;
    vatRate: 0 | 4 | 10 | 21;
  }>,
): InvoiceLineItem[] {
  return lines.map((l, i) =>
    buildLineItemCanonical({
      lineNumber: i + 1,
      productId: String(l.productId),
      description: l.name,
      quantity: l.quantity,
      unitPriceWithVAT: l.unitPriceWithVat,
      vatRate: l.vatRate,
    }),
  );
}
