/**
 * Return Management (RMA) Service for TCG Academy.
 *
 * Handles the complete return workflow:
 * 1. Customer requests return
 * 2. Admin reviews and approves/rejects
 * 3. If approved: generates RMA number, optional return label
 * 4. Customer ships back the item
 * 5. Admin confirms receipt and processes refund
 * 6. Rectificative invoice generated
 * 7. Stock restored
 */

import { DataHub } from "@/lib/dataHub";
import { validateIban } from "@/lib/validations/iban";
import { getMergedById } from "@/lib/productStore";
import { persistProductPatch } from "@/lib/productPersist";
import { sendAppEmail } from "@/services/emailService";

const RETURNS_KEY = "tcgacademy_returns";
const RETURN_WINDOW_DAYS = 14; // Legal return window in Spain

export type ReturnStatus =
  | "solicitada"     // Customer requested
  | "aprobada"       // Admin approved
  | "en_transito"    // Customer shipped back
  | "recibida"       // Admin received the return
  | "reembolsada"    // Refund processed
  | "rechazada"      // Admin rejected
  | "cerrada";       // Closed/resolved

export type ReturnReason =
  | "defectuoso"
  | "incorrecto"
  | "no_deseado"
  | "danado_envio"
  | "falta_producto"
  | "otro";

/**
 * Método de reembolso.
 *
 * Canales soportados:
 *  - `transferencia` — canal por defecto para RMAs web (cliente ausente).
 *    Requiere IBAN validado antes de emitir.
 *  - `efectivo`      — devolución en mano en ventanilla/tienda. Solo admin
 *    presencial. No requiere IBAN.
 *  - `tarjeta`       — reintegro al mismo TPV por el que se cobró. Solo admin
 *    presencial. Se registra `refundPaymentRef` si aplica.
 *  - `bizum`         — envío Bizum al teléfono del cliente. No requiere IBAN.
 *  - `mismo_medio`   — genérico: se reembolsa por el mismo canal con el que se
 *    cobró la factura original. El detalle queda en `refundPaymentRef`.
 *
 * Regla fiscal-IBAN: IBAN es OBLIGATORIO si `refundMethod === "transferencia"`.
 * Para cualquier otro método el IBAN es opcional (el detalle contable queda en
 * `refundPaymentRef`).
 */
export type RefundMethod =
  | "transferencia"
  | "efectivo"
  | "tarjeta"
  | "bizum"
  | "mismo_medio";
/** Default histórico (flujo RMA web): transferencia bancaria. */
export const REFUND_METHOD: RefundMethod = "transferencia";

/** Etiquetas visibles (ES) por método de reembolso — usadas en UI y notas. */
export const REFUND_METHOD_LABEL: Record<RefundMethod, string> = {
  transferencia: "Transferencia bancaria",
  efectivo: "Efectivo",
  tarjeta: "Reintegro a tarjeta",
  bizum: "Bizum",
  mismo_medio: "Mismo medio que el pago original",
};

export interface ReturnItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  reason: ReturnReason;
  reasonDetail?: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  items: ReturnItem[];
  totalRefundAmount: number;
  status: ReturnStatus;
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
  /** Canal de reembolso (ver docstring RefundMethod) */
  refundMethod: RefundMethod;
  /** IBAN del cliente — obligatorio SI refundMethod === "transferencia". */
  refundIban?: string;
  /** Titular de la cuenta bancaria (opcional, por claridad en registros contables). */
  refundHolderName?: string;
  /**
   * Referencia libre del reembolso cuando el método no es transferencia.
   * Ejemplos: "TPV ref 8472", "Bizum 612345678", "Efectivo — tienda Madrid".
   * Sirve como rastro contable/auditoría; no reemplaza al asiento en el journal.
   */
  refundPaymentRef?: string;
  /** Timestamp ISO del momento en el que se marcó como reembolsada (transferencia emitida). */
  refundedAt?: string;
  trackingNumber?: string; // return shipment tracking
  /** ID interno de la factura rectificativa generada al marcar como reembolsada. */
  rectificativeInvoiceId?: string;
  /** Número visible de la factura rectificativa (FAC-YYYY-NNNNNXXXXXE). */
  rectificativeInvoiceNumber?: string;
  /**
   * ID de la factura original a rectificar. Tiene prioridad sobre `orderId` en
   * `markAsRefunded()` — útil para devoluciones iniciadas desde el libro de
   * facturas (facturas manuales que pueden no tener `sourceOrderId`).
   */
  sourceInvoiceId?: string;
  /**
   * Iniciada directamente por admin desde el libro de facturas (atajo).
   * `true` cuando la devolución nació en /admin/fiscal/facturas, sin pasar por
   * el flujo RMA web solicitada→aprobada→en_transito→recibida.
   */
  adminInitiated?: boolean;
  statusHistory: Array<{
    status: ReturnStatus;
    timestamp: string;
    note?: string;
  }>;
}

function generateRmaId(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const arr = new Uint8Array(3);
  crypto.getRandomValues(arr);
  const rand = Array.from(arr).map((b) => b.toString(36)).join("").slice(0, 4).toUpperCase();
  return `RMA-${date}-${rand}`;
}

function loadReturns(): ReturnRequest[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RETURNS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveReturns(returns: ReturnRequest[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RETURNS_KEY, JSON.stringify(returns));
  // Canonical event so admin views refresh after RMA state changes.
  DataHub.emit("returns");
}

/**
 * Check if an order is within the return window.
 */
export function isWithinReturnWindow(orderDate: string): boolean {
  const orderTime = new Date(orderDate).getTime();
  const now = Date.now();
  const windowMs = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return now - orderTime <= windowMs;
}

/**
 * Create a new return request.
 *
 * El método de reembolso queda fijado a "transferencia" (única opción permitida
 * por regla de negocio). El IBAN se puede capturar ya en esta fase si el
 * cliente lo provee en el formulario, o más tarde antes de marcar "reembolsada".
 */
export function createReturnRequest(
  orderId: string,
  customerId: string,
  customerEmail: string,
  customerName: string,
  items: ReturnItem[],
  options?: { refundIban?: string; refundHolderName?: string },
): ReturnRequest {
  const totalRefundAmount = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  // Si el cliente pasa IBAN ya en la solicitud, lo normalizamos y validamos.
  let normalizedIban: string | undefined;
  if (options?.refundIban) {
    const v = validateIban(options.refundIban);
    if (!v.valid) {
      throw new Error(
        `IBAN no válido: ${v.error ?? "formato incorrecto"}. ` +
          `La devolución NO se creará hasta que se proporcione un IBAN correcto.`,
      );
    }
    normalizedIban = v.normalized;
  }

  const returnReq: ReturnRequest = {
    id: generateRmaId(),
    orderId,
    customerId,
    customerEmail,
    customerName,
    items,
    totalRefundAmount: Math.round(totalRefundAmount * 100) / 100,
    status: "solicitada",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    refundMethod: REFUND_METHOD,
    refundIban: normalizedIban,
    refundHolderName: options?.refundHolderName,
    statusHistory: [
      {
        status: "solicitada",
        timestamp: new Date().toISOString(),
        note: "Solicitud de devolución creada por el cliente",
      },
    ],
  };

  const returns = loadReturns();
  returns.unshift(returnReq);
  saveReturns(returns);

  return returnReq;
}

/**
 * Actualiza el IBAN (y opcionalmente titular) del reembolso de una devolución
 * ya existente. Valida el IBAN antes de guardar.
 *
 * Se usa cuando el cliente manda el IBAN después de haber creado la solicitud,
 * o cuando el admin lo corrige tras comunicarse con el cliente.
 */
export function setRefundBankInfo(
  rmaId: string,
  iban: string,
  holderName?: string,
): ReturnRequest {
  const v = validateIban(iban);
  if (!v.valid) {
    throw new Error(
      `IBAN no válido: ${v.error ?? "formato incorrecto"}. ` +
        `El IBAN NO se ha guardado.`,
    );
  }

  const returns = loadReturns();
  const idx = returns.findIndex((r) => r.id === rmaId);
  if (idx === -1) {
    throw new Error(`Devolución ${rmaId} no encontrada`);
  }

  returns[idx].refundIban = v.normalized;
  if (holderName !== undefined) {
    returns[idx].refundHolderName = holderName;
  }
  returns[idx].updatedAt = new Date().toISOString();

  saveReturns(returns);
  return returns[idx];
}

/**
 * Update return request status.
 *
 * Notifica por email al cliente en las transiciones relevantes:
 *  - aprobada   → `devolucion_aceptada`
 *  - rechazada  → `devolucion_rechazada`
 *  - cerrada    → `devolucion_cancelada` (solo si el status anterior no era
 *                 "reembolsada" — en ese caso ya se envió el email de reembolso)
 *
 * El estado "reembolsada" se gestiona desde `markAsRefunded()` que envía su
 * propio email tras emitir la factura rectificativa.
 */
export async function updateReturnStatus(
  rmaId: string,
  newStatus: ReturnStatus,
  note?: string,
  extras?: Partial<Pick<ReturnRequest, "adminNotes" | "trackingNumber" | "rectificativeInvoiceId">>,
): Promise<ReturnRequest | null> {
  const returns = loadReturns();
  const idx = returns.findIndex((r) => r.id === rmaId);
  if (idx === -1) return null;

  const previousStatus = returns[idx].status;
  returns[idx].status = newStatus;
  returns[idx].updatedAt = new Date().toISOString();
  returns[idx].statusHistory.push({
    status: newStatus,
    timestamp: new Date().toISOString(),
    note,
  });

  if (extras?.adminNotes !== undefined) returns[idx].adminNotes = extras.adminNotes;
  if (extras?.trackingNumber) returns[idx].trackingNumber = extras.trackingNumber;
  if (extras?.rectificativeInvoiceId) returns[idx].rectificativeInvoiceId = extras.rectificativeInvoiceId;

  saveReturns(returns);

  // Notificar al cliente en las transiciones relevantes. Non-critical: si falla,
  // no revertimos el cambio de estado (el estado es la fuente canónica).
  const rma = returns[idx];
  try {
    if (newStatus === "aprobada" && previousStatus !== "aprobada") {
      await sendAppEmail({
        toEmail: rma.customerEmail,
        toName: rma.customerName,
        templateId: "devolucion_aceptada",
        vars: {
          nombre: rma.customerName.split(" ")[0] ?? rma.customerName,
          return_id: rma.id,
          order_id: rma.orderId,
          refund_amount: rma.totalRefundAmount.toFixed(2),
          refund_method: rma.refundIban ? "Transferencia bancaria" : "Método original",
          refund_days: "3-5",
          unsubscribe_link: "#",
        },
        preview: `Devolución ${rma.id} aprobada · ${rma.totalRefundAmount.toFixed(2)}€`,
      });
    } else if (newStatus === "rechazada" && previousStatus !== "rechazada") {
      await sendAppEmail({
        toEmail: rma.customerEmail,
        toName: rma.customerName,
        templateId: "devolucion_rechazada",
        vars: {
          nombre: rma.customerName.split(" ")[0] ?? rma.customerName,
          return_id: rma.id,
          order_id: rma.orderId,
          motivo: note ?? extras?.adminNotes ?? "Tras revisión del equipo.",
          unsubscribe_link: "#",
        },
        preview: `Devolución ${rma.id} rechazada`,
      });
    } else if (
      newStatus === "cerrada" &&
      previousStatus !== "reembolsada" &&
      previousStatus !== "cerrada"
    ) {
      await sendAppEmail({
        toEmail: rma.customerEmail,
        toName: rma.customerName,
        templateId: "devolucion_cancelada",
        vars: {
          nombre: rma.customerName.split(" ")[0] ?? rma.customerName,
          return_id: rma.id,
          order_id: rma.orderId,
          motivo: note ?? "Solicitud cerrada sin reembolso.",
          unsubscribe_link: "#",
        },
        preview: `Devolución ${rma.id} cancelada`,
      });
    }
  } catch {
    /* email non-critical — el estado ya está persistido */
  }

  return rma;
}

/**
 * Get all return requests, optionally filtered.
 */
export function getReturns(filters?: {
  status?: ReturnStatus;
  orderId?: string;
  customerId?: string;
}): ReturnRequest[] {
  let returns = loadReturns();

  if (filters?.status) {
    returns = returns.filter((r) => r.status === filters.status);
  }
  if (filters?.orderId) {
    returns = returns.filter((r) => r.orderId === filters.orderId);
  }
  if (filters?.customerId) {
    returns = returns.filter((r) => r.customerId === filters.customerId);
  }

  return returns;
}

/**
 * Get a single return request by RMA ID.
 */
export function getReturnById(rmaId: string): ReturnRequest | null {
  return loadReturns().find((r) => r.id === rmaId) ?? null;
}

/**
 * Helper canónico "Vista 360°": todas las devoluciones de un usuario.
 * Wraps getReturns({customerId}) con nombre consistente con getOrdersByUser,
 * getInvoicesByUser, etc.
 */
export function getReturnsByUser(userId: string): ReturnRequest[] {
  return getReturns({ customerId: userId });
}

/**
 * Restore stock for returned items.
 */
export function restoreStockForReturn(items: ReturnItem[]): void {
  if (typeof window === "undefined") return;

  // Usa persistProductPatch para que la restauración llegue a la colección
  // correcta (admin-created → tcgacademy_new_products; estático → overrides).
  // Antes se escribía siempre a overrides y los productos admin-created
  // devueltos nunca recuperaban stock. Ver GOTCHA 5.
  for (const item of items) {
    const merged = getMergedById(item.productId);
    const current =
      typeof merged?.stock === "number" ? merged.stock : 0;
    persistProductPatch(item.productId, {
      stock: current + item.quantity,
      inStock: true,
    });
  }
}

/**
 * Marca una devolución como "reembolsada" y genera la factura rectificativa
 * correspondiente de forma atómica.
 *
 * ESTA ACCIÓN ES IRREVERSIBLE (afecta cadena VeriFactu, Libro de facturas,
 * Modelo 303 del trimestre, Modelo 390 anual, asiento contable).
 * La UI que la invoque DEBE mostrar modal de confirmación explícito.
 *
 * Requisitos:
 *  - La devolución debe tener `refundIban` válido (si no, lanza error).
 *  - Debe existir factura original vinculada al `orderId` del RMA.
 *
 * Flujo:
 *  1. Localiza factura original por `sourceOrderId === return.orderId`.
 *  2. Construye líneas rectificativas con CANTIDAD NEGATIVA — esto hace que
 *     `calculateTotals()` produzca base imponible + IVA NEGATIVOS, lo que
 *     se resta automáticamente del Modelo 303 del trimestre de emisión.
 *  3. Llama a `rectifyInvoice()` con `reasonCode: "R4"` (otras causas).
 *  4. Emite evento DataHub "invoices" (dispara refresh de paneles fiscales).
 *  5. Restaura stock de los productos devueltos.
 *  6. Actualiza el RMA → status "reembolsada" + referencias cruzadas.
 */
export async function markAsRefunded(
  rmaId: string,
  options?: { adminNote?: string; adminUserId?: string; adminUserName?: string },
): Promise<{ ok: true; rectificativeInvoiceNumber: string; refundedAt: string }> {
  const returns = loadReturns();
  const idx = returns.findIndex((r) => r.id === rmaId);
  if (idx === -1) throw new Error(`Devolución ${rmaId} no encontrada`);
  const rma = returns[idx];

  if (rma.status === "reembolsada") {
    throw new Error(
      `La devolución ${rmaId} ya está marcada como reembolsada. ` +
        `Las operaciones fiscales son irreversibles — no se pueden reejecutar.`,
    );
  }

  // IBAN obligatorio SOLO si el reembolso es por transferencia. Para otros
  // medios (efectivo, tarjeta, bizum, mismo_medio) el IBAN no aplica.
  if (rma.refundMethod === "transferencia") {
    if (!rma.refundIban) {
      throw new Error(
        `No se puede marcar como reembolsada sin IBAN. ` +
          `El cliente debe proporcionar IBAN → setRefundBankInfo() antes de continuar.`,
      );
    }
    const ibanCheck = validateIban(rma.refundIban);
    if (!ibanCheck.valid) {
      throw new Error(
        `El IBAN guardado (${rma.refundIban}) no es válido: ` +
          `${ibanCheck.error}. Corrige con setRefundBankInfo() y reintenta.`,
      );
    }
  }

  // Import dinámico para evitar ciclos y para que el servicio de devoluciones
  // pueda ejecutarse en contextos donde invoiceService no esté cargado.
  const { loadInvoices, rectifyInvoice, buildLineItem } =
    await import("@/services/invoiceService");
  const { CorrectionType, InvoiceStatus, InvoiceType } = await import("@/types/fiscal");

  // 1. Localizar factura original.
  //    Si el RMA trae `sourceInvoiceId` explícito (caso del atajo admin desde
  //    el libro de facturas, incluidas facturas manuales sin sourceOrderId),
  //    se usa ese. Si no, se resuelve por sourceOrderId como en el flujo RMA
  //    web clásico.
  const invoices = loadInvoices();
  const original = rma.sourceInvoiceId
    ? invoices.find(
        (inv) =>
          inv.invoiceId === rma.sourceInvoiceId &&
          inv.status !== InvoiceStatus.ANULADA &&
          inv.invoiceType !== InvoiceType.RECTIFICATIVA,
      )
    : invoices.find(
        (inv) =>
          inv.sourceOrderId === rma.orderId &&
          inv.status !== InvoiceStatus.ANULADA &&
          inv.invoiceType !== InvoiceType.RECTIFICATIVA,
      );
  if (!original) {
    throw new Error(
      `No se encontró factura original para el pedido ${rma.orderId}. ` +
        `No se puede generar rectificativa. Verifica que la factura existe ` +
        `y no está ya anulada.`,
    );
  }

  // 2. Construir líneas rectificativas con cantidad negativa.
  //    Para cada item devuelto busco la línea equivalente en la original
  //    (por productId) para heredar vatRate, unitPrice y descuentos.
  //    Si no la encuentro, asumo IVA 21% general (fallback conservador).
  const rectifiedItems = rma.items.map((returnItem, i) => {
    const matched = original.items.find(
      (line) => line.productId === String(returnItem.productId),
    );
    const vatRate: 0 | 4 | 10 | 21 = matched?.vatRate ?? 21;
    const unitPriceWithVAT = matched
      ? matched.quantity > 0
        ? matched.totalLine / matched.quantity
        : returnItem.unitPrice
      : returnItem.unitPrice;

    return buildLineItem({
      lineNumber: i + 1,
      productId: String(returnItem.productId),
      description: `[DEV] ${returnItem.productName}`,
      quantity: -Math.abs(returnItem.quantity), // NEGATIVO para restar en 303
      unitPriceWithVAT,
      vatRate,
      discount: matched?.discount ?? 0,
      applySurcharge: (matched?.surchargeRate ?? 0) > 0,
    });
  });

  // 3. Emitir rectificativa (hereda cadena VeriFactu; rectifyInvoice llama
  //    internamente a createInvoice + persistInvoices).
  const rectificativa = await rectifyInvoice(original.invoiceId, {
    items: rectifiedItems,
    paymentMethod: original.paymentMethod,
    correctionData: {
      originalInvoiceId: original.invoiceId,
      originalInvoiceNumber: original.invoiceNumber,
      originalInvoiceDate: original.invoiceDate,
      correctionType: CorrectionType.DIFERENCIAS,
      reason:
        `Devolución ${rma.id} — reembolso por ${REFUND_METHOD_LABEL[rma.refundMethod].toLowerCase()}` +
        (rma.refundMethod === "transferencia"
          ? " a IBAN del cliente."
          : rma.refundPaymentRef
            ? ` (${rma.refundPaymentRef}).`
            : ".") +
        " " +
        (options?.adminNote ? `Nota admin: ${options.adminNote}` : ""),
      reasonCode: "R4",
    },
  });

  // 4. rectifyInvoice() ya dispara los side-effects internos (asiento contable
  //    + VeriFactu dispatch) desde su propia implementación, por lo que aquí
  //    no hace falta llamada extra a saveInvoice (evitamos duplicación).

  // 5. Restaurar stock.
  restoreStockForReturn(rma.items);

  // 5a. Sincronizar el AdminOrder original con `adminStatus = "devolucion"`
  //     para que el KPI "Devoluciones" de /admin/pedidos refleje los RMA
  //     reembolsados. Non-blocking: si el RMA viene de una factura manual
  //     sin pedido web, simplemente no encuentra nada que actualizar.
  try {
    const { setAdminOrderStatus } = await import("@/lib/orderAdapter");
    setAdminOrderStatus(
      rma.orderId,
      "devolucion",
      `RMA ${rma.id} reembolsado · rectificativa ${rectificativa.invoiceNumber}`,
    );
  } catch {
    // Non-blocking — la rectificativa ya es el documento vinculante.
  }

  // 5b. Revertir los puntos de fidelidad ganados en la compra devuelta.
  //     Sin esto el cliente conservaba puntos por un importe que ya no le
  //     corresponde — discrepancia entre saldo de puntos y ventas netas.
  //     Fallo silencioso: la rectificativa ya está emitida y es el documento
  //     fiscal vinculante. Los puntos se pueden ajustar manualmente si falla.
  try {
    const { refundPurchasePoints } = await import("@/services/pointsService");
    refundPurchasePoints(rma.customerId, rma.totalRefundAmount);
  } catch {
    // Non-blocking — el admin puede ajustar saldo desde /admin/usuarios.
  }

  // 6. Actualizar RMA con referencias cruzadas + timestamp refundedAt.
  const refundedAt = new Date().toISOString();
  returns[idx] = {
    ...rma,
    status: "reembolsada",
    updatedAt: refundedAt,
    refundedAt,
    rectificativeInvoiceId: rectificativa.invoiceId,
    rectificativeInvoiceNumber: rectificativa.invoiceNumber,
    statusHistory: [
      ...rma.statusHistory,
      {
        status: "reembolsada",
        timestamp: refundedAt,
        note:
          (rma.refundMethod === "transferencia" && rma.refundIban
            ? `Transferencia emitida a IBAN ${maskIbanShort(rma.refundIban)}. `
            : `Reembolso por ${REFUND_METHOD_LABEL[rma.refundMethod]}` +
              (rma.refundPaymentRef ? ` (${rma.refundPaymentRef}). ` : ". ")) +
          `Factura rectificativa ${rectificativa.invoiceNumber} generada. ` +
          (options?.adminNote ?? ""),
      },
    ],
  };
  saveReturns(returns);

  // 7. Notificar al cliente (non-critical).
  try {
    await sendAppEmail({
      toEmail: rma.customerEmail,
      toName: rma.customerName,
      templateId: "devolucion_reembolsada",
      vars: {
        nombre: rma.customerName.split(" ")[0] ?? rma.customerName,
        return_id: rma.id,
        order_id: rma.orderId,
        refund_amount: rma.totalRefundAmount.toFixed(2),
        rectificativa_number: rectificativa.invoiceNumber,
        iban_masked: rma.refundIban ? maskIbanShort(rma.refundIban) : "",
        refund_method_label: REFUND_METHOD_LABEL[rma.refundMethod],
        unsubscribe_link: "#",
      },
      preview: `Reembolso emitido · ${rma.totalRefundAmount.toFixed(2)}€ · ${rectificativa.invoiceNumber}`,
    });
  } catch {
    /* email non-critical — la rectificativa ya es el documento vinculante */
  }

  return {
    ok: true,
    rectificativeInvoiceNumber: rectificativa.invoiceNumber,
    refundedAt,
  };
}

/**
 * Atajo admin: crear devolución desde el libro de facturas y reembolsar en el
 * mismo paso.
 *
 * Diferencias con el flujo RMA web (`createReturnRequest` → …):
 *  - El RMA nace directamente en status "recibida" — no pasa por
 *    solicitada→aprobada→en_transito→recibida (el admin lo emite directo).
 *  - `sourceInvoiceId` apunta a la factura original (prioritario sobre
 *    `orderId` al buscar la factura a rectificar — soporta facturas manuales
 *    sin pedido web).
 *  - Acepta cualquier `RefundMethod`: transferencia (obliga IBAN), efectivo,
 *    tarjeta, bizum o mismo medio.
 *  - Tras persistir el RMA, llama a `markAsRefunded()` para emitir la
 *    rectificativa, restaurar stock, revertir puntos y encadenar VeriFactu.
 *    Un único write fiscal. Un único camino.
 */
export async function createAdminInitiatedReturn(params: {
  invoiceId: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  orderId?: string;
  items: ReturnItem[];
  refundMethod: RefundMethod;
  refundIban?: string;
  refundHolderName?: string;
  refundPaymentRef?: string;
  adminNote?: string;
  adminUserId?: string;
  adminUserName?: string;
}): Promise<{ ok: true; rmaId: string; rectificativeInvoiceNumber: string; refundedAt: string }> {
  // 1. Validaciones de entrada que queremos atajar ANTES de crear el RMA
  //    — así no queda basura en el storage si el admin se equivocó.
  if (params.items.length === 0) {
    throw new Error("Debes seleccionar al menos un producto a devolver.");
  }
  for (const it of params.items) {
    if (it.quantity <= 0) {
      throw new Error(`La cantidad a devolver de "${it.productName}" debe ser > 0.`);
    }
    // NOTA: permitimos unitPrice negativo porque representa líneas-descuento
    // (cupones, descuento general, canje de puntos) reflejadas en la factura
    // original. La rectificativa debe mirroring fielmente la original.
  }

  // IBAN: obligatorio SOLO para transferencia.
  let normalizedIban: string | undefined;
  if (params.refundMethod === "transferencia") {
    if (!params.refundIban) {
      throw new Error(
        "Para reembolso por transferencia, el IBAN del cliente es obligatorio.",
      );
    }
    const v = validateIban(params.refundIban);
    if (!v.valid) {
      throw new Error(`IBAN no válido: ${v.error ?? "formato incorrecto"}.`);
    }
    normalizedIban = v.normalized;
  }

  // 2. Crear RMA directo en status "recibida" (bypass del flujo web).
  const totalRefundAmount =
    Math.round(
      params.items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0) * 100,
    ) / 100;

  const now = new Date().toISOString();
  const rma: ReturnRequest = {
    id: generateRmaId(),
    orderId: params.orderId ?? `INV-${params.invoiceId}`,
    sourceInvoiceId: params.invoiceId,
    customerId: params.customerId,
    customerEmail: params.customerEmail,
    customerName: params.customerName,
    items: params.items,
    totalRefundAmount,
    status: "recibida",
    createdAt: now,
    updatedAt: now,
    refundMethod: params.refundMethod,
    refundIban: normalizedIban,
    refundHolderName: params.refundHolderName,
    refundPaymentRef: params.refundPaymentRef,
    adminInitiated: true,
    adminNotes: params.adminNote,
    statusHistory: [
      {
        status: "recibida",
        timestamp: now,
        note:
          `Devolución iniciada directamente por admin desde libro de facturas ` +
          `(${REFUND_METHOD_LABEL[params.refundMethod]})` +
          (params.adminUserName ? ` — ${params.adminUserName}` : ""),
      },
    ],
  };

  const returns = loadReturns();
  returns.unshift(rma);
  saveReturns(returns);

  // 3. Emitir rectificativa + stock + puntos + VeriFactu, todo en la función
  //    canónica. No duplicamos lógica fiscal aquí.
  const { rectificativeInvoiceNumber, refundedAt } = await markAsRefunded(rma.id, {
    adminNote: params.adminNote,
    adminUserId: params.adminUserId,
    adminUserName: params.adminUserName,
  });

  return {
    ok: true,
    rmaId: rma.id,
    rectificativeInvoiceNumber,
    refundedAt,
  };
}

/**
 * Máscara IBAN compacta para notas/timeline (solo muestra primeros + últimos 4).
 * Formato: "ES91 •••• 1332". Evita loggear IBAN completo en el statusHistory.
 */
function maskIbanShort(iban: string): string {
  const clean = iban.replace(/\s+/g, "");
  if (clean.length < 8) return "••••";
  return `${clean.slice(0, 4)} •••• ${clean.slice(-4)}`;
}

/**
 * Get return statistics.
 */
export function getReturnStats(): {
  total: number;
  pending: number;
  approved: number;
  completed: number;
  rejected: number;
  totalRefundAmount: number;
} {
  const returns = loadReturns();
  return {
    total: returns.length,
    pending: returns.filter((r) => r.status === "solicitada").length,
    approved: returns.filter((r) => ["aprobada", "en_transito", "recibida"].includes(r.status)).length,
    completed: returns.filter((r) => r.status === "reembolsada").length,
    rejected: returns.filter((r) => r.status === "rechazada").length,
    totalRefundAmount: returns
      .filter((r) => r.status === "reembolsada")
      .reduce((sum, r) => sum + r.totalRefundAmount, 0),
  };
}
