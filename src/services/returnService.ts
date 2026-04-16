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
  refundMethod?: string; // original payment method
  trackingNumber?: string; // return shipment tracking
  rectificativeInvoiceId?: string;
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
 */
export function createReturnRequest(
  orderId: string,
  customerId: string,
  customerEmail: string,
  customerName: string,
  items: ReturnItem[],
  refundMethod?: string,
): ReturnRequest {
  const totalRefundAmount = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

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
    refundMethod,
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
 * Update return request status.
 */
export function updateReturnStatus(
  rmaId: string,
  newStatus: ReturnStatus,
  note?: string,
  extras?: Partial<Pick<ReturnRequest, "adminNotes" | "trackingNumber" | "rectificativeInvoiceId">>,
): ReturnRequest | null {
  const returns = loadReturns();
  const idx = returns.findIndex((r) => r.id === rmaId);
  if (idx === -1) return null;

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
  return returns[idx];
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
 * Restore stock for returned items.
 */
export function restoreStockForReturn(items: ReturnItem[]): void {
  if (typeof window === "undefined") return;

  const overridesRaw = localStorage.getItem("tcgacademy_product_overrides");
  const overrides: Record<string, Record<string, unknown>> = overridesRaw
    ? JSON.parse(overridesRaw)
    : {};

  for (const item of items) {
    const key = String(item.productId);
    if (!overrides[key]) overrides[key] = {};
    const current = (overrides[key].stock as number) ?? 0;
    overrides[key].stock = current + item.quantity;
    overrides[key].inStock = true;
  }

  localStorage.setItem("tcgacademy_product_overrides", JSON.stringify(overrides));
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
