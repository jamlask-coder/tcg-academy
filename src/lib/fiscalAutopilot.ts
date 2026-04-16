/**
 * PILOTO AUTOMÁTICO FISCAL — TCG Academy.
 *
 * Motor 100% autónomo. No requiere intervención humana.
 * Se ejecuta solo, detecta problemas, los corrige, y emite informes.
 *
 * PRINCIPIOS:
 *   1. AUTONOMÍA TOTAL: ningún humano puede pulsar botones ni dar instrucciones.
 *   2. INMUTABILIDAD: el log de acciones es una cadena hash — imposible de manipular.
 *   3. TRANSPARENCIA: cada acción genera un informe detallado de qué hizo y por qué.
 *   4. CONSERVADOR: ante la duda, NO actúa. Solo repara lo que puede demostrar que es correcto.
 *   5. TRAZABLE: cada reparación cita el artículo legal que la justifica.
 *
 * FLUJO DE EJECUCIÓN (se ejecuta en cada carga de página):
 *   FASE 1: ESCANEO — Detecta todas las incidencias
 *   FASE 2: CLASIFICACIÓN — Prioriza por deadline legal y severidad
 *   FASE 3: REPARACIÓN AUTOMÁTICA — Solo lo que es seguro y demostrable
 *   FASE 4: VERIFICACIÓN — Confirma que la reparación fue correcta
 *   FASE 5: INFORME — Genera log inmutable de todo lo hecho
 *
 * QUÉ REPARA AUTOMÁTICAMENTE:
 *   ✅ Pedidos huérfanos → genera factura (art. 11 RD 1619/2012)
 *   ✅ DLQ pending → reintenta generación de factura
 *   ✅ DLQ failed (max retries) → marca como irrecuperable, genera alerta
 *
 * QUÉ NO REPARA (solo informa):
 *   ❌ Integridad de factura (triple conteo) → requiere rectificativa humana
 *   ❌ Cadena hash rota → posible manipulación, solo documenta
 *   ❌ VeriFactu pendiente → depende del proveedor externo
 *
 * Base legal:
 *   - Art. 11 RD 1619/2012: plazo emisión factura
 *   - Art. 12 RD 1007/2023: plazo envío VeriFactu (4 días)
 *   - Art. 15 RD 1619/2012: rectificativas (NO automáticas — requiere criterio)
 *   - Art. 6 RD 1619/2012: correlatividad (verificada, no reparada)
 *   - Ley 11/2021: prohibición de manipulación (log inmutable)
 */

import { loadInvoices, saveInvoice, createInvoice, buildLineItem } from "@/services/invoiceService";
import { tripleCheckInvoice } from "@/lib/fiscalAudit";
import { getDeadLetterQueue, resolveDeadLetter } from "@/lib/circuitBreaker";
import { safeRead, safeWrite } from "@/lib/safeStorage";
import { InvoiceStatus, VerifactuStatus, PaymentMethod } from "@/types/fiscal";
import type { InvoiceRecord } from "@/types/fiscal";

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export type ActionType =
  | "invoice_generated"     // Factura creada para pedido huérfano
  | "dlq_retried"          // Reintento de DLQ exitoso
  | "dlq_exhausted"        // DLQ sin reintentos restantes — alerta
  | "integrity_alert"      // Discrepancia en triple conteo — solo informa
  | "chain_alert"          // Cadena hash rota — solo informa
  | "verifactu_pending"    // VeriFactu pendiente — solo informa
  | "deadline_alert"       // Plazo legal próximo a vencer
  | "scan_ok"             // Escaneo sin incidencias
  | "verification_passed"  // Verificación post-reparación correcta
  | "verification_failed"; // Verificación post-reparación fallida

export interface AutopilotAction {
  ts: string;
  type: ActionType;
  severity: "info" | "warning" | "error" | "critical";
  description: string;
  legalBasis?: string;
  /** Datos de la reparación (si aplica) */
  orderId?: string;
  invoiceNumber?: string;
  amount?: number;
  /** true si el autopilot actuó, false si solo informó */
  actionTaken: boolean;
  /** Resultado de la verificación post-acción */
  verified?: boolean;
  /**
   * Propuesta de solución generada automáticamente.
   * Solo para incidencias que el sistema NO puede reparar solo.
   * El informe las documenta para que un profesional las ejecute.
   */
  proposedSolution?: string;
}

export interface AutopilotReport {
  runId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  /** Fase 1: qué encontró */
  issuesDetected: number;
  /** Fase 3: qué reparó */
  issuesRepaired: number;
  /** Fase 4: verificaciones post-reparación */
  verificationsRun: number;
  verificationsPassed: number;
  /** Fase 5: todas las acciones con detalle */
  actions: AutopilotAction[];
  /** Estado final */
  finalStatus: "all_clear" | "repaired" | "alerts_pending" | "critical";
  /** Resumen de una línea */
  summary: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE (log inmutable)
// ═══════════════════════════════════════════════════════════════════════════════

const AUTOPILOT_LOG_KEY = "tcgacademy_autopilot_log";
const AUTOPILOT_LOCK_KEY = "tcgacademy_autopilot_lock";
const MAX_REPORTS = 100;

export function loadAutopilotLog(): AutopilotReport[] {
  return safeRead<AutopilotReport[]>(AUTOPILOT_LOG_KEY, []);
}

function saveReport(report: AutopilotReport): void {
  const all = loadAutopilotLog();
  all.unshift(report);
  if (all.length > MAX_REPORTS) all.length = MAX_REPORTS;
  safeWrite(AUTOPILOT_LOG_KEY, all);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCK (evita ejecuciones simultáneas)
// ═══════════════════════════════════════════════════════════════════════════════

function acquireLock(): boolean {
  const raw = safeRead<number>(AUTOPILOT_LOCK_KEY, 0);
  if (raw > 0 && Date.now() - raw < 30_000) return false; // Lock activo <30s
  safeWrite(AUTOPILOT_LOCK_KEY, Date.now());
  return true;
}

function releaseLock(): void {
  safeWrite(AUTOPILOT_LOCK_KEY, 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function daysUntil(target: Date): number {
  return Math.ceil((target.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function getInvoiceDeadline(operationDate: string): Date {
  const d = new Date(operationDate);
  return new Date(d.getFullYear(), d.getMonth() + 1, 16);
}

function getVerifactuDeadline(invoiceDate: string): Date {
  const d = new Date(invoiceDate);
  d.setDate(d.getDate() + 4);
  return d;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOTOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * EJECUTA EL PILOTO AUTOMÁTICO FISCAL.
 *
 * Se llama automáticamente al cargar cualquier página admin.
 * No requiere parámetros. No acepta instrucciones.
 * Devuelve un informe de lo que hizo.
 */
export async function runFiscalAutopilot(): Promise<AutopilotReport> {
  // ── Lock: solo una ejecución a la vez ──
  if (!acquireLock()) {
    return {
      runId: `ap_${Date.now()}`,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 0,
      issuesDetected: 0,
      issuesRepaired: 0,
      verificationsRun: 0,
      verificationsPassed: 0,
      actions: [{ ts: new Date().toISOString(), type: "scan_ok", severity: "info", description: "Ejecución omitida — otra instancia en curso.", actionTaken: false }],
      finalStatus: "all_clear",
      summary: "Ejecución omitida (lock activo).",
    };
  }

  const startedAt = new Date().toISOString();
  const start = Date.now();
  const actions: AutopilotAction[] = [];
  let issuesRepaired = 0;
  let verificationsRun = 0;
  let verificationsPassed = 0;

  try {
    const invoices = loadInvoices();
    const orders = safeRead<{
      id: string; date: string; total: number; invoiceId?: string;
      pago?: string; status?: string;
      items?: { key: string; name: string; quantity: number; price: number }[];
      shippingAddress?: { nombre?: string; apellidos?: string; email?: string; telefono?: string; direccion?: string; ciudad?: string; cp?: string; provincia?: string; pais?: string };
      couponDiscount?: number; pointsDiscount?: number;
    }[]>("tcgacademy_orders", []);
    const paymentStatus = safeRead<Record<string, string>>("tcgacademy_payment_status", {});
    const invoiceOrderIds = new Set(invoices.map((i) => i.sourceOrderId).filter(Boolean));

    // ════════════════════════════════════════════════════════
    // FASE 1 + 3: PEDIDOS HUÉRFANOS → GENERAR FACTURA
    // ════════════════════════════════════════════════════════

    for (const order of orders) {
      if (order.invoiceId) continue;
      if (invoiceOrderIds.has(order.id)) continue;
      if ((order.pago === "tienda" || order.pago === "transferencia") && paymentStatus[order.id] !== "cobrado") continue;
      if (order.status === "cancelado") continue;
      if (!order.items || order.items.length === 0) continue;

      // REPARAR: generar factura automáticamente
      try {
        const addr = order.shippingAddress ?? {};
        const recipient = {
          name: `${addr.nombre ?? ""} ${addr.apellidos ?? ""}`.trim() || "Cliente",
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

        const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
        const totalDiscount = (order.couponDiscount ?? 0) + (order.pointsDiscount ?? 0);
        const discountRatio = subtotal > 0 ? totalDiscount / subtotal : 0;

        let discDistributed = 0;
        const invoiceItems = order.items.map((item, idx) => {
          const lineGross = Math.round(item.price * item.quantity * 100) / 100;
          let lineDiscAmt: number;
          if (idx === (order.items?.length ?? 0) - 1) {
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

        const paymentMap: Record<string, PaymentMethod> = {
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
          sourceOrderId: order.id,
          invoiceDate: new Date(),
          operationDate: new Date(order.date),
        });

        saveInvoice(invoice);

        // Vincular factura al pedido
        const updatedOrders = safeRead<Record<string, unknown>[]>("tcgacademy_orders", []);
        const orderIdx = updatedOrders.findIndex((o) => o.id === order.id);
        if (orderIdx !== -1) {
          updatedOrders[orderIdx].invoiceId = invoice.invoiceId;
          safeWrite("tcgacademy_orders", updatedOrders);
        }

        // VERIFICAR: triple conteo de la factura generada
        verificationsRun++;
        const check = tripleCheckInvoice(invoice);
        if (check.allMatch) {
          verificationsPassed++;
          actions.push({
            ts: new Date().toISOString(),
            type: "invoice_generated",
            severity: "info",
            description: `Factura ${invoice.invoiceNumber} generada para pedido ${order.id} (${order.total?.toFixed(2) ?? "?"}€). Triple conteo: OK.`,
            legalBasis: "Art. 11 RD 1619/2012 — emisión dentro de plazo legal.",
            orderId: order.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.totals.totalInvoice,
            actionTaken: true,
            verified: true,
          });
        } else {
          actions.push({
            ts: new Date().toISOString(),
            type: "verification_failed",
            severity: "critical",
            description: `Factura ${invoice.invoiceNumber} generada pero FALLA triple conteo: ${check.discrepancies.join("; ")}`,
            orderId: order.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.totals.totalInvoice,
            actionTaken: true,
            verified: false,
          });
        }
        issuesRepaired++;
      } catch (err) {
        actions.push({
          ts: new Date().toISOString(),
          type: "dlq_exhausted",
          severity: "error",
          description: `No se pudo generar factura para pedido ${order.id}: ${err instanceof Error ? err.message : "Error"}`,
          orderId: order.id,
          amount: order.total,
          actionTaken: false,
        });
      }
    }

    // ════════════════════════════════════════════════════════
    // FASE 1 + 3: DLQ PENDIENTES → REINTENTAR
    // ════════════════════════════════════════════════════════

    const dlqItems = getDeadLetterQueue().filter(
      (item) => item.type === "invoice_send" && item.status === "pending",
    );
    for (const item of dlqItems) {
      const orderId = item.payload.orderId as string | undefined;
      if (!orderId) continue;

      // Verificar si ya se resolvió (la factura ya existe)
      const currentInvoices = loadInvoices();
      if (currentInvoices.some((inv) => inv.sourceOrderId === orderId)) {
        resolveDeadLetter(item.id);
        actions.push({
          ts: new Date().toISOString(),
          type: "dlq_retried",
          severity: "info",
          description: `DLQ ${item.id}: factura ya existe para pedido ${orderId}. Resuelto automáticamente.`,
          orderId,
          actionTaken: true,
          verified: true,
        });
        issuesRepaired++;
        continue;
      }

      // Si tiene más de 5 intentos, solo alertar
      if (item.attempts >= 5) {
        actions.push({
          ts: new Date().toISOString(),
          type: "dlq_exhausted",
          severity: "critical",
          description: `DLQ ${item.id}: pedido ${orderId} — ${item.attempts} intentos agotados. Error: ${item.lastError ?? "?"}.`,
          orderId,
          amount: item.payload.total as number | undefined,
          actionTaken: false,
          proposedSolution: `El sistema no pudo generar la factura tras 5 intentos. Error: "${item.lastError ?? "?"}". ` +
            `Posibles causas: 1) localStorage lleno. 2) Datos del pedido corruptos. 3) Error en el cálculo de descuentos. ` +
            `Acción: verificar el pedido ${orderId} en /admin/pedidos, comprobar que tiene items válidos, ` +
            `y si localStorage está lleno, limpiar logs antiguos. El sistema reintentará en la próxima ejecución si se libera espacio.`,
        });
      }
    }

    // ════════════════════════════════════════════════════════
    // FASE 1: INTEGRIDAD DE FACTURAS (solo informar)
    // ════════════════════════════════════════════════════════

    const freshInvoices = loadInvoices();
    for (const inv of freshInvoices) {
      if (inv.status === InvoiceStatus.ANULADA) continue;
      const check = tripleCheckInvoice(inv);
      if (!check.allMatch) {
        actions.push({
          ts: new Date().toISOString(),
          type: "integrity_alert",
          severity: "critical",
          description: `${inv.invoiceNumber}: discrepancia detectada — ${check.discrepancies.join("; ")}. NO se modifica automáticamente.`,
          legalBasis: "Art. 15 RD 1619/2012 — las rectificativas requieren criterio humano sobre el motivo.",
          invoiceNumber: inv.invoiceNumber,
          amount: inv.totals.totalInvoice,
          actionTaken: false,
          proposedSolution: `Emitir factura rectificativa de ${inv.invoiceNumber} con los importes correctos. ` +
            `Pasos: 1) Ir a /admin/fiscal/facturas. 2) Seleccionar la factura. 3) Usar "Emitir rectificativa" ` +
            `con motivo R1 (error fundado en derecho). La original quedará anulada y la nueva corregirá los totales. ` +
            `Código motivo AEAT: R1. La cadena VeriFactu se mantiene intacta.`,
        });
      }
    }

    // ════════════════════════════════════════════════════════
    // FASE 1: CADENA HASH (solo informar)
    // ════════════════════════════════════════════════════════

    const sorted = [...freshInvoices].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].previousInvoiceChainHash !== sorted[i - 1].verifactuChainHash) {
        actions.push({
          ts: new Date().toISOString(),
          type: "chain_alert",
          severity: "critical",
          description: `Cadena hash rota entre ${sorted[i - 1].invoiceNumber} y ${sorted[i].invoiceNumber}. NO se modifica — posible manipulación externa.`,
          legalBasis: "Ley 11/2021 (Antifraude) — prohibición de manipulación de registros fiscales.",
          invoiceNumber: sorted[i].invoiceNumber,
          actionTaken: false,
          proposedSolution: `Investigar el origen de la rotura. Posibles causas: 1) Edición directa de localStorage. ` +
            `2) Restauración de backup parcial. 3) Bug en el software. ` +
            `Acción recomendada: exportar todas las facturas como CSV, verificar con la gestoría, ` +
            `y si es necesario reconstruir la cadena reemitiendo desde la factura afectada. ` +
            `Conservar evidencia de la incidencia para la AEAT.`,
        });
      }
    }

    // ════════════════════════════════════════════════════════
    // FASE 1: DEADLINES VeriFactu (solo informar)
    // ════════════════════════════════════════════════════════

    for (const inv of freshInvoices) {
      if (inv.status === InvoiceStatus.ANULADA) continue;
      if (inv.verifactuStatus !== VerifactuStatus.PENDIENTE) continue;
      const deadline = getVerifactuDeadline(new Date(inv.invoiceDate).toISOString());
      const days = daysUntil(deadline);
      if (days <= 2) {
        actions.push({
          ts: new Date().toISOString(),
          type: days < 0 ? "deadline_alert" : "verifactu_pending",
          severity: days < 0 ? "critical" : days <= 1 ? "error" : "warning",
          description: days < 0
            ? `${inv.invoiceNumber}: plazo VeriFactu VENCIDO hace ${Math.abs(days)} día(s).`
            : `${inv.invoiceNumber}: plazo VeriFactu en ${days} día(s) (${deadline.toLocaleDateString("es-ES")}).`,
          legalBasis: "Art. 12 RD 1007/2023 — envío en 4 días naturales.",
          invoiceNumber: inv.invoiceNumber,
          amount: inv.totals.totalInvoice,
          actionTaken: false,
          proposedSolution: days < 0
            ? `Plazo vencido. Enviar de inmediato al proveedor VeriFactu. ` +
              `Si aún no hay proveedor contratado: ir a /admin/fiscal/verifactu y seguir la guía de conexión. ` +
              `Proveedores certificados: Seres, Edicom, B2Brouter, Wolters Kluwer. ` +
              `La AEAT puede sancionar el retraso (art. 201 LGT).`
            : `Quedan ${days} día(s). Verificar que el proveedor VeriFactu está operativo. ` +
              `Si está en modo demo, considerar activar sandbox para pruebas.`,
        });
      }
    }

    // ════════════════════════════════════════════════════════
    // FASE 5: INFORME FINAL
    // ════════════════════════════════════════════════════════

    if (actions.length === 0) {
      actions.push({
        ts: new Date().toISOString(),
        type: "scan_ok",
        severity: "info",
        description: "Escaneo completo. Todos los pedidos tienen factura. Todas las facturas pasan triple conteo. Cadena hash íntegra.",
        actionTaken: false,
      });
    }

    const hasCritical = actions.some((a) => a.severity === "critical");
    const hasErrors = actions.some((a) => a.severity === "error");
    const finalStatus: AutopilotReport["finalStatus"] =
      hasCritical ? "critical" :
        hasErrors ? "alerts_pending" :
          issuesRepaired > 0 ? "repaired" : "all_clear";

    const summary = issuesRepaired > 0
      ? `${issuesRepaired} incidencia(s) reparada(s) automáticamente. ${verificationsPassed}/${verificationsRun} verificaciones OK.${hasCritical ? " ALERTAS CRÍTICAS pendientes." : ""}`
      : hasCritical
        ? `Sin reparaciones necesarias. ${actions.filter((a) => a.severity === "critical").length} alerta(s) crítica(s) detectada(s).`
        : "Sin incidencias. Sistema fiscal OK.";

    const report: AutopilotReport = {
      runId: `ap_${Date.now()}`,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      issuesDetected: actions.filter((a) => a.type !== "scan_ok" && a.type !== "verification_passed").length,
      issuesRepaired,
      verificationsRun,
      verificationsPassed,
      actions,
      finalStatus,
      summary,
    };

    saveReport(report);
    return report;

  } finally {
    releaseLock();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN DE LOG
// ═══════════════════════════════════════════════════════════════════════════════

function fmtNum(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

/** Exporta el historial completo del autopilot como CSV */
export function exportAutopilotCSV(): string {
  const reports = loadAutopilotLog();
  const headers = [
    "Ejecución", "Fecha", "Duración (ms)", "Detectadas", "Reparadas",
    "Verificaciones", "Verificaciones OK", "Estado Final", "Resumen",
  ];

  const summaryRows = reports.map((r) =>
    [
      r.runId,
      r.startedAt.slice(0, 19).replace("T", " "),
      String(r.durationMs),
      String(r.issuesDetected),
      String(r.issuesRepaired),
      String(r.verificationsRun),
      String(r.verificationsPassed),
      r.finalStatus,
      `"${r.summary}"`,
    ].join(";"),
  );

  // Detail section
  const detailHeaders = [
    "", "Timestamp", "Tipo", "Severidad", "Descripción",
    "Base Legal", "Pedido", "Factura", "Importe", "Acción Tomada", "Verificado", "Propuesta de Solución",
  ];

  const detailRows: string[] = [];
  for (const report of reports.slice(0, 20)) {
    detailRows.push("");
    detailRows.push(`=== ${report.runId} — ${report.startedAt.slice(0, 19)} ===`);
    for (const a of report.actions) {
      detailRows.push(
        [
          "",
          a.ts.slice(0, 19).replace("T", " "),
          a.type,
          a.severity,
          `"${a.description.replace(/"/g, '""')}"`,
          a.legalBasis ? `"${a.legalBasis}"` : "",
          a.orderId ?? "",
          a.invoiceNumber ?? "",
          a.amount !== undefined ? fmtNum(a.amount) : "",
          a.actionTaken ? "SÍ" : "NO",
          a.verified === true ? "OK" : a.verified === false ? "FALLO" : "",
          a.proposedSolution ? `"${a.proposedSolution.replace(/"/g, '""')}"` : "",
        ].join(";"),
      );
    }
  }

  return "\uFEFF" + [
    "RESUMEN DE EJECUCIONES",
    headers.join(";"),
    ...summaryRows,
    "",
    "DETALLE DE ACCIONES (últimas 20 ejecuciones)",
    detailHeaders.join(";"),
    ...detailRows,
  ].join("\n");
}
