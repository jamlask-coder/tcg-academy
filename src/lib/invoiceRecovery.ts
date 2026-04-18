/**
 * Sistema de Recuperación de Facturas — TCG Academy.
 *
 * Centro de control para facturas pendientes, fallidas o con problemas.
 *
 * FLUJO LEGAL (RD 1007/2023 + RD 1619/2012):
 *   1. Cada venta genera una factura automáticamente
 *   2. Si falla → DLQ (Dead Letter Queue) → reintento automático
 *   3. Si persiste → zona de confinamiento → revisión manual
 *   4. El admin puede: regenerar, vincular, rectificar o resolver
 *   5. Plazo máximo envío VeriFactu: 4 días naturales (art. 12 RD 1007/2023)
 *   6. Plazo máximo emisión factura: hasta el 16 del mes siguiente (art. 11 RD 1619/2012)
 *
 * ESTADOS DE UNA FACTURA PENDIENTE:
 *   pending_generation → La factura no se generó (error en createInvoice)
 *   pending_save       → Se generó pero no se guardó (error en saveInvoice)
 *   pending_verifactu  → Se guardó pero no se envió a VeriFactu
 *   integrity_error    → La factura tiene discrepancias en el triple conteo
 *   orphan_order       → Pedido pagado sin factura vinculada
 *   chain_broken       → Factura con hash chain roto
 */

import { InvoiceStatus, VerifactuStatus } from "@/types/fiscal";
import { loadInvoices, saveInvoice, createInvoice } from "@/services/invoiceService";
import { tripleCheckInvoice } from "@/lib/fiscalAudit";
import { getDeadLetterQueue, resolveDeadLetter } from "@/lib/circuitBreaker";
import { safeRead, safeWrite } from "@/lib/safeStorage";
import { getPaymentStatusMap, getOrderPaymentStatus } from "@/lib/orderAdapter";

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export type IssueType =
  | "pending_generation"
  | "pending_save"
  | "pending_verifactu"
  | "integrity_error"
  | "orphan_order"
  | "chain_broken"
  | "deadline_warning"
  | "resolved";

export type IssueSeverity = "info" | "warning" | "error" | "critical";

export interface FiscalIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  detail: string;
  /** ID del pedido relacionado */
  orderId?: string;
  /** ID de la factura relacionada (si existe) */
  invoiceId?: string;
  /** Número de factura (si existe) */
  invoiceNumber?: string;
  /** Referencia al item en DLQ (si aplica) */
  dlqItemId?: string;
  /** Importe afectado */
  amount?: number;
  /** Fecha del problema */
  detectedAt: string;
  /** Fecha límite legal para resolver */
  deadline?: string;
  /** Días restantes para el deadline */
  daysRemaining?: number;
  /** Acciones disponibles para resolver */
  actions: IssueAction[];
  /** Estado de resolución */
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

export interface IssueAction {
  id: string;
  label: string;
  description: string;
  type: "retry" | "regenerate" | "link" | "rectify" | "dismiss" | "manual";
  /** true si requiere confirmación del admin */
  requiresConfirmation: boolean;
}

export interface RecoveryDashboard {
  generatedAt: string;
  /** Resumen de estado */
  summary: {
    totalIssues: number;
    critical: number;
    errors: number;
    warnings: number;
    info: number;
    resolved: number;
    pendingDeadline: number;
  };
  /** Todas las incidencias detectadas */
  issues: FiscalIssue[];
  /** Estado general */
  overallStatus: "ok" | "warning" | "error" | "critical";
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const RESOLUTION_KEY = "tcgacademy_fiscal_resolutions";

function loadResolutions(): Record<string, { resolvedAt: string; resolvedBy: string; note: string }> {
  return safeRead(RESOLUTION_KEY, {});
}

function saveResolution(issueId: string, resolvedBy: string, note: string): void {
  const all = loadResolutions();
  all[issueId] = { resolvedAt: new Date().toISOString(), resolvedBy, note };
  safeWrite(RESOLUTION_KEY, all);
}

/**
 * Calcula la fecha límite de emisión de factura.
 * Art. 11 RD 1619/2012: antes del 16 del mes siguiente a la operación.
 */
function getInvoiceDeadline(operationDate: string): Date {
  const d = new Date(operationDate);
  const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 16);
  return nextMonth;
}

/**
 * Calcula la fecha límite de envío VeriFactu.
 * Art. 12 RD 1007/2023: 4 días naturales desde la emisión.
 */
function getVerifactuDeadline(invoiceDate: string): Date {
  const d = new Date(invoiceDate);
  d.setDate(d.getDate() + 4);
  return d;
}

function daysUntil(target: Date): number {
  return Math.ceil((target.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function makeSeverity(daysRemaining: number): IssueSeverity {
  if (daysRemaining < 0) return "critical"; // Ya ha vencido
  if (daysRemaining <= 1) return "error";
  if (daysRemaining <= 3) return "warning";
  return "info";
}

/**
 * Escanea todo el sistema y detecta TODAS las incidencias fiscales.
 */
export function detectAllIssues(): FiscalIssue[] {
  const issues: FiscalIssue[] = [];
  const resolutions = loadResolutions();
  const invoices = loadInvoices();
  const now = new Date();

  // ── 1. Pedidos sin factura (orphan_order) ──
  const orders = safeRead<{ id: string; date: string; total: number; invoiceId?: string; pago?: string; status?: string }[]>(
    "tcgacademy_orders", [],
  );
  const invoiceOrderIds = new Set(invoices.map((i) => i.sourceOrderId).filter(Boolean));

  // SSOT: estado de cobro leído desde AdminOrder vía orderAdapter (antes: clave paralela).
  const paymentStatus = getPaymentStatusMap();
  for (const order of orders) {
    if (order.invoiceId) continue; // Tiene factura vinculada
    if (invoiceOrderIds.has(order.id)) continue; // Factura existe por sourceOrderId
    // Excluir pedidos con pago pendiente (tienda/transferencia sin cobrar)
    if ((order.pago === "tienda" || order.pago === "transferencia") && paymentStatus[order.id] !== "cobrado") {
      continue; // Pago pendiente — factura se emite al cobrar
    }
    if (order.status === "cancelado") continue;

    const deadline = getInvoiceDeadline(order.date);
    const days = daysUntil(deadline);
    const issueId = `orphan_${order.id}`;

    issues.push({
      id: issueId,
      type: "orphan_order",
      severity: makeSeverity(days),
      title: `Pedido ${order.id} sin factura`,
      detail: `Pedido de ${order.total?.toFixed(2) ?? "?"}€ del ${new Date(order.date).toLocaleDateString("es-ES")} sin factura emitida.`,
      orderId: order.id,
      amount: order.total,
      detectedAt: now.toISOString(),
      deadline: deadline.toISOString(),
      daysRemaining: days,
      actions: [
        { id: "regenerate", label: "Generar factura", description: "Crear factura automática a partir del pedido", type: "regenerate", requiresConfirmation: true },
        { id: "dismiss", label: "Ignorar", description: "Este pedido no requiere factura (cancelado, test, etc.)", type: "dismiss", requiresConfirmation: true },
      ],
      resolved: !!resolutions[issueId],
      ...(resolutions[issueId] ? { resolvedAt: resolutions[issueId].resolvedAt, resolvedBy: resolutions[issueId].resolvedBy, resolutionNote: resolutions[issueId].note } : {}),
    });
  }

  // ── 2. Facturas en DLQ (pending_generation) ──
  const dlqItems = getDeadLetterQueue().filter((item) => item.type === "invoice_send");
  for (const item of dlqItems) {
    if (item.status === "resolved") continue;
    const issueId = `dlq_${item.id}`;
    const orderId = item.payload.orderId as string | undefined;

    issues.push({
      id: issueId,
      type: "pending_generation",
      severity: item.status === "failed" ? "critical" : "error",
      title: `Factura no generada — Pedido ${orderId ?? "?"}`,
      detail: `Error: ${item.lastError ?? "desconocido"}. Intentos: ${item.attempts}/5.`,
      orderId,
      dlqItemId: item.id,
      amount: item.payload.total as number | undefined,
      detectedAt: item.createdAt,
      actions: [
        { id: "retry", label: "Reintentar", description: "Volver a intentar generar la factura", type: "retry", requiresConfirmation: false },
        { id: "manual", label: "Resolver manualmente", description: "Marcar como resuelto (factura creada por otro medio)", type: "manual", requiresConfirmation: true },
      ],
      resolved: !!resolutions[issueId],
      ...(resolutions[issueId] ? { resolvedAt: resolutions[issueId].resolvedAt, resolvedBy: resolutions[issueId].resolvedBy, resolutionNote: resolutions[issueId].note } : {}),
    });
  }

  // ── 3. Facturas pendientes de envío VeriFactu ──
  for (const inv of invoices) {
    if (inv.status === InvoiceStatus.ANULADA) continue;
    if (inv.verifactuStatus !== VerifactuStatus.PENDIENTE) continue;

    const deadline = getVerifactuDeadline(new Date(inv.invoiceDate).toISOString());
    const days = daysUntil(deadline);
    const issueId = `verifactu_${inv.invoiceId}`;

    issues.push({
      id: issueId,
      type: "pending_verifactu",
      severity: makeSeverity(days),
      title: `${inv.invoiceNumber} — pendiente VeriFactu`,
      detail: `Factura emitida el ${new Date(inv.invoiceDate).toLocaleDateString("es-ES")}. Plazo: 4 días naturales (art. 12 RD 1007/2023).`,
      invoiceId: inv.invoiceId,
      invoiceNumber: inv.invoiceNumber,
      amount: inv.totals.totalInvoice,
      detectedAt: now.toISOString(),
      deadline: deadline.toISOString(),
      daysRemaining: days,
      actions: [
        { id: "retry", label: "Reenviar a VeriFactu", description: "Intentar envío al proveedor VeriFactu", type: "retry", requiresConfirmation: false },
      ],
      resolved: !!resolutions[issueId],
      ...(resolutions[issueId] ? { resolvedAt: resolutions[issueId].resolvedAt, resolvedBy: resolutions[issueId].resolvedBy, resolutionNote: resolutions[issueId].note } : {}),
    });
  }

  // ── 4. Facturas con errores de integridad (triple conteo) ──
  for (const inv of invoices) {
    if (inv.status === InvoiceStatus.ANULADA) continue;
    const check = tripleCheckInvoice(inv);
    if (check.allMatch) continue;

    const issueId = `integrity_${inv.invoiceId}`;
    issues.push({
      id: issueId,
      type: "integrity_error",
      severity: "critical",
      title: `${inv.invoiceNumber} — discrepancia en totales`,
      detail: check.discrepancies.join("; "),
      invoiceId: inv.invoiceId,
      invoiceNumber: inv.invoiceNumber,
      amount: inv.totals.totalInvoice,
      detectedAt: now.toISOString(),
      actions: [
        { id: "rectify", label: "Emitir rectificativa", description: "Anular esta factura y emitir una correcta (art. 15 RD 1619/2012)", type: "rectify", requiresConfirmation: true },
        { id: "manual", label: "Resolver manualmente", description: "La discrepancia es por redondeo aceptable", type: "manual", requiresConfirmation: true },
      ],
      resolved: !!resolutions[issueId],
      ...(resolutions[issueId] ? { resolvedAt: resolutions[issueId].resolvedAt, resolvedBy: resolutions[issueId].resolvedBy, resolutionNote: resolutions[issueId].note } : {}),
    });
  }

  // ── 5. Cadena VeriFactu rota ──
  const sorted = [...invoices].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  for (let i = 1; i < sorted.length; i++) {
    const inv = sorted[i];
    const prev = sorted[i - 1];
    if (inv.previousInvoiceChainHash !== prev.verifactuChainHash) {
      const issueId = `chain_${inv.invoiceId}`;
      issues.push({
        id: issueId,
        type: "chain_broken",
        severity: "critical",
        title: `${inv.invoiceNumber} — cadena hash rota`,
        detail: `El hash anterior no coincide con ${prev.invoiceNumber}. La cadena VeriFactu está comprometida.`,
        invoiceId: inv.invoiceId,
        invoiceNumber: inv.invoiceNumber,
        detectedAt: now.toISOString(),
        actions: [
          { id: "manual", label: "Investigar", description: "Revisar manualmente — posible manipulación de datos", type: "manual", requiresConfirmation: true },
        ],
        resolved: !!resolutions[issueId],
        ...(resolutions[issueId] ? { resolvedAt: resolutions[issueId].resolvedAt, resolvedBy: resolutions[issueId].resolvedBy, resolutionNote: resolutions[issueId].note } : {}),
      });
    }
  }

  // ── 6. Deadlines próximos (warning preventivo) ──
  for (const inv of invoices) {
    if (inv.status === InvoiceStatus.ANULADA) continue;
    if (inv.verifactuStatus !== VerifactuStatus.PENDIENTE) continue;
    const deadline = getVerifactuDeadline(new Date(inv.invoiceDate).toISOString());
    const days = daysUntil(deadline);
    if (days <= 2 && days > 0) {
      const issueId = `deadline_${inv.invoiceId}`;
      if (!issues.some((i) => i.invoiceId === inv.invoiceId)) {
        issues.push({
          id: issueId,
          type: "deadline_warning",
          severity: "warning",
          title: `${inv.invoiceNumber} — plazo VeriFactu en ${days} día(s)`,
          detail: `La factura debe enviarse a AEAT antes del ${deadline.toLocaleDateString("es-ES")}.`,
          invoiceId: inv.invoiceId,
          invoiceNumber: inv.invoiceNumber,
          detectedAt: now.toISOString(),
          deadline: deadline.toISOString(),
          daysRemaining: days,
          actions: [],
          resolved: false,
        });
      }
    }
  }

  // Sort: critical first, then by deadline
  issues.sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    const sevOrder: Record<IssueSeverity, number> = { critical: 0, error: 1, warning: 2, info: 3 };
    const sevDiff = sevOrder[a.severity] - sevOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999);
  });

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export function buildRecoveryDashboard(): RecoveryDashboard {
  const issues = detectAllIssues();
  const unresolved = issues.filter((i) => !i.resolved);

  const summary = {
    totalIssues: unresolved.length,
    critical: unresolved.filter((i) => i.severity === "critical").length,
    errors: unresolved.filter((i) => i.severity === "error").length,
    warnings: unresolved.filter((i) => i.severity === "warning").length,
    info: unresolved.filter((i) => i.severity === "info").length,
    resolved: issues.filter((i) => i.resolved).length,
    pendingDeadline: unresolved.filter((i) => (i.daysRemaining ?? 999) <= 3).length,
  };

  let overallStatus: RecoveryDashboard["overallStatus"] = "ok";
  if (summary.info > 0) overallStatus = "warning";
  if (summary.warnings > 0) overallStatus = "warning";
  if (summary.errors > 0) overallStatus = "error";
  if (summary.critical > 0) overallStatus = "critical";

  return {
    generatedAt: new Date().toISOString(),
    summary,
    issues,
    overallStatus,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCIONES DE RESOLUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Marcar una incidencia como resuelta manualmente.
 */
export function resolveIssue(
  issueId: string,
  resolvedBy: string,
  note: string,
): void {
  saveResolution(issueId, resolvedBy, note);

  // Si es un item DLQ, resolverlo también
  if (issueId.startsWith("dlq_")) {
    const dlqId = issueId.replace("dlq_", "");
    resolveDeadLetter(dlqId);
  }
}

/**
 * Regenerar factura para un pedido huérfano.
 * Busca el pedido, construye los datos y crea la factura.
 */
export async function regenerateInvoiceForOrder(
  orderId: string,
): Promise<{ ok: boolean; invoiceNumber?: string; error?: string }> {
  try {
    const orders = safeRead<Record<string, unknown>[]>("tcgacademy_orders", []);
    const order = orders.find((o) => o.id === orderId) as {
      id: string;
      date: string;
      items: { key: string; name: string; quantity: number; price: number }[];
      total: number;
      shippingAddress?: { nombre?: string; apellidos?: string; email?: string; telefono?: string; direccion?: string; ciudad?: string; cp?: string; provincia?: string; pais?: string };
      pago?: string;
      couponDiscount?: number;
      pointsDiscount?: number;
      nif?: string;
      nifType?: "DNI" | "NIE" | "CIF";
    } | undefined;

    if (!order) return { ok: false, error: `Pedido ${orderId} no encontrado` };

    // Regla fiscal: sólo se emite factura tras cobro confirmado.
    // Los métodos diferidos (tienda, transferencia) requieren paymentStatus=cobrado.
    const pago = (order.pago ?? "").toLowerCase();
    const isDeferred = pago === "tienda" || pago === "transferencia" || pago === "recogida";
    if (isDeferred) {
      // SSOT: estado leído vía orderAdapter (antes: clave paralela `tcgacademy_payment_status`).
      if (getOrderPaymentStatus(orderId) !== "cobrado") {
        return {
          ok: false,
          error: `Pedido ${orderId} pendiente de cobro (pago=${pago}). No se emite factura hasta marcarlo como cobrado.`,
        };
      }
    }

    const { buildLineItem } = await import("@/services/invoiceService");
    const { PaymentMethod, TaxIdType } = await import("@/types/fiscal");
    const { validateSpanishNIF } = await import("@/lib/validations/nif");

    // Guard fiscal: sin NIF válido no se puede emitir factura (Art. 6.1.d RD 1619/2012).
    if (!order.nif) {
      return {
        ok: false,
        error: `Pedido ${orderId}: NIF/NIE/CIF ausente. Factura NO emitida (Art. 6.1.d RD 1619/2012).`,
      };
    }
    const nifCheck = validateSpanishNIF(order.nif);
    if (!nifCheck.valid) {
      return {
        ok: false,
        error: `Pedido ${orderId}: NIF/NIE/CIF inválido (${order.nif}). ${nifCheck.error ?? "Factura NO emitida."}`,
      };
    }
    const taxIdType =
      nifCheck.type === "NIE"
        ? TaxIdType.NIE
        : nifCheck.type === "CIF"
          ? TaxIdType.CIF
          : TaxIdType.NIF;

    const addr = order.shippingAddress ?? {};
    const recipient = {
      name: `${addr.nombre ?? ""} ${addr.apellidos ?? ""}`.trim() || "Cliente",
      taxId: nifCheck.normalized,
      taxIdType,
      email: addr.email,
      phone: addr.telefono,
      countryCode: addr.pais || "ES",
      address: {
        street: addr.direccion ?? "",
        city: addr.ciudad ?? "",
        postalCode: addr.cp ?? "",
        province: addr.provincia ?? "",
        country: addr.pais === "ES" ? "España" : (addr.pais ?? "España"),
        countryCode: addr.pais || "ES",
      },
    };

    // Calcular descuento proporcional
    const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const totalDiscount = (order.couponDiscount ?? 0) + (order.pointsDiscount ?? 0);
    const discountRatio = subtotal > 0 ? totalDiscount / subtotal : 0;

    let discDistributed = 0;
    const invoiceItems = order.items.map((item, idx) => {
      const lineGross = Math.round(item.price * item.quantity * 100) / 100;
      let lineDiscAmt: number;
      if (idx === order.items.length - 1) {
        lineDiscAmt = Math.round((totalDiscount - discDistributed) * 100) / 100;
      } else {
        lineDiscAmt = Math.round(lineGross * discountRatio * 100) / 100;
      }
      discDistributed = Math.round((discDistributed + lineDiscAmt) * 100) / 100;
      const pct = lineGross > 0 ? Math.min((lineDiscAmt / lineGross) * 100, 100) : 0;
      return buildLineItem({
        lineNumber: idx + 1,
        productId: item.key,
        description: item.name,
        quantity: item.quantity,
        unitPriceWithVAT: item.price,
        vatRate: 21,
        discount: pct,
      });
    });

    const paymentMap: Record<string, typeof PaymentMethod[keyof typeof PaymentMethod]> = {
      tarjeta: PaymentMethod.TARJETA,
      paypal: PaymentMethod.PAYPAL,
      bizum: PaymentMethod.BIZUM,
      efectivo: PaymentMethod.EFECTIVO,
      transferencia: PaymentMethod.TRANSFERENCIA,
      tienda: PaymentMethod.EFECTIVO,
    };

    const invoice = await createInvoice({
      recipient,
      items: invoiceItems,
      paymentMethod: paymentMap[order.pago ?? "tarjeta"] ?? PaymentMethod.TARJETA,
      sourceOrderId: orderId,
      invoiceDate: new Date(), // Fecha actual (dentro de plazo legal)
      operationDate: new Date(order.date), // Fecha de la operación original
    });

    saveInvoice(invoice);

    // Vincular factura al pedido
    const updatedOrders = safeRead<Record<string, unknown>[]>("tcgacademy_orders", []);
    const orderIdx = updatedOrders.findIndex((o) => o.id === orderId);
    if (orderIdx !== -1) {
      updatedOrders[orderIdx].invoiceId = invoice.invoiceId;
      safeWrite("tcgacademy_orders", updatedOrders);
    }

    // Resolver la incidencia
    resolveIssue(
      `orphan_${orderId}`,
      "system",
      `Factura ${invoice.invoiceNumber} generada automáticamente`,
    );

    return { ok: true, invoiceNumber: invoice.invoiceNumber };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

/**
 * Exportar informe de incidencias como CSV.
 */
export function exportIssuesCSV(): string {
  const issues = detectAllIssues();
  const headers = [
    "ID", "Tipo", "Severidad", "Título", "Detalle",
    "Pedido", "Factura", "Importe", "Detectado",
    "Deadline", "Días restantes", "Resuelto", "Resolución",
  ];
  const rows = issues.map((i) =>
    [
      i.id,
      i.type,
      i.severity,
      `"${i.title}"`,
      `"${i.detail.replace(/"/g, '""')}"`,
      i.orderId ?? "",
      i.invoiceNumber ?? "",
      i.amount?.toFixed(2) ?? "",
      i.detectedAt.slice(0, 10),
      i.deadline?.slice(0, 10) ?? "",
      i.daysRemaining?.toString() ?? "",
      i.resolved ? "Sí" : "No",
      i.resolutionNote ? `"${i.resolutionNote}"` : "",
    ].join(";"),
  );
  return "\uFEFF" + [headers.join(";"), ...rows].join("\n");
}
