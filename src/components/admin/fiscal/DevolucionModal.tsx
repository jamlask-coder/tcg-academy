"use client";
/**
 * DevolucionModal — atajo admin para emitir una devolución desde el libro de
 * facturas (/admin/fiscal/facturas).
 *
 * Flujo:
 *  1. El admin elige alcance (total o parcial) y cantidades por línea.
 *  2. Elige motivo + medio de reembolso (transferencia, efectivo, tarjeta,
 *     bizum, mismo medio).
 *  3. Si transferencia → IBAN obligatorio (validado en el servicio).
 *     Si no, ref de pago opcional para trazabilidad contable.
 *  4. Confirma la irreversibilidad. Se emite factura rectificativa (entra en
 *     VeriFactu), se restaura stock y se revierten puntos.
 *
 * Delega toda la lógica fiscal en `createAdminInitiatedReturn()` — este
 * componente solo recoge inputs, valida mínimos y llama.
 */
import { useMemo, useState } from "react";
import { X, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { InvoiceRecord } from "@/types/fiscal";
import {
  createAdminInitiatedReturn,
  REFUND_METHOD_LABEL,
  type RefundMethod,
  type ReturnReason,
  type ReturnItem,
} from "@/services/returnService";

interface Props {
  invoice: InvoiceRecord;
  onClose: () => void;
  onSuccess?: (rectificativaNumber: string) => void;
}

type LineDraft = {
  selected: boolean;
  returnQty: number;
  maxQty: number;
  productId: number;
  productName: string;
  unitPrice: number; // precio unitario CON IVA (para mostrar reembolso al cliente)
  unitPriceBase: number; // precio unitario SIN IVA (lo que espera ReturnItem)
};

const REASON_OPTIONS: Array<{ value: ReturnReason; label: string }> = [
  { value: "defectuoso", label: "Defectuoso" },
  { value: "incorrecto", label: "Producto incorrecto" },
  { value: "no_deseado", label: "No deseado / arrepentimiento" },
  { value: "danado_envio", label: "Dañado en envío" },
  { value: "falta_producto", label: "Falta producto" },
  { value: "otro", label: "Otro" },
];

const METHOD_OPTIONS: RefundMethod[] = [
  "transferencia",
  "efectivo",
  "tarjeta",
  "bizum",
  "mismo_medio",
];

export default function DevolucionModal({ invoice, onClose, onSuccess }: Props) {
  // Semilla: todas las líneas del libro — exclusivo items reales (ya vienen
  // filtradas por invoiceService al buildear líneas).
  const [lines, setLines] = useState<LineDraft[]>(() =>
    invoice.items.map((l) => {
      const pid = Number.parseInt(l.productId, 10);
      const unitPriceWithVAT =
        l.quantity > 0 ? l.totalLine / l.quantity : l.unitPrice;
      return {
        selected: true,
        returnQty: l.quantity,
        maxQty: l.quantity,
        productId: Number.isFinite(pid) ? pid : 0,
        productName: l.description,
        unitPrice: Math.round(unitPriceWithVAT * 100) / 100,
        unitPriceBase: l.unitPrice,
      };
    }),
  );
  const [reason, setReason] = useState<ReturnReason>("defectuoso");
  const [reasonDetail, setReasonDetail] = useState("");
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("transferencia");
  const [refundIban, setRefundIban] = useState("");
  const [refundHolder, setRefundHolder] = useState("");
  const [refundPaymentRef, setRefundPaymentRef] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [confirmIrreversible, setConfirmIrreversible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const totalRefund = useMemo(
    () =>
      lines
        .filter((l) => l.selected && l.returnQty > 0)
        .reduce((sum, l) => sum + l.unitPrice * l.returnQty, 0),
    [lines],
  );

  const hasSelection = lines.some((l) => l.selected && l.returnQty > 0);
  const canSubmit =
    hasSelection &&
    confirmIrreversible &&
    !submitting &&
    (refundMethod !== "transferencia" || refundIban.trim().length > 0);

  function toggleAll(next: boolean) {
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        selected: next,
        returnQty: next ? l.maxQty : 0,
      })),
    );
  }

  function updateLine(idx: number, patch: Partial<LineDraft>) {
    setLines((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  }

  async function handleSubmit() {
    setError(null);
    if (!canSubmit) return;

    const items: ReturnItem[] = lines
      .filter((l) => l.selected && l.returnQty > 0)
      .map((l) => ({
        productId: l.productId,
        productName: l.productName,
        quantity: l.returnQty,
        unitPrice: l.unitPrice, // con IVA — criterio del ReturnItem existente
        reason,
        reasonDetail: reasonDetail.trim() || undefined,
      }));

    // Datos del receptor resueltos desde la factura. Para particulares
    // (CustomerData) no hay userId — usamos email como fallback de customerId.
    const recipient = invoice.recipient;
    const customerEmail = recipient.email ?? "";
    const customerName = recipient.name ?? "—";
    const customerId = customerEmail || `invoice-${invoice.invoiceId}`;

    setSubmitting(true);
    try {
      const res = await createAdminInitiatedReturn({
        invoiceId: invoice.invoiceId,
        customerId,
        customerEmail,
        customerName,
        orderId: invoice.sourceOrderId ?? undefined,
        items,
        refundMethod,
        refundIban: refundMethod === "transferencia" ? refundIban.trim() : undefined,
        refundHolderName: refundHolder.trim() || undefined,
        refundPaymentRef:
          refundMethod !== "transferencia"
            ? refundPaymentRef.trim() || undefined
            : undefined,
        adminNote: adminNote.trim() || undefined,
      });
      setSuccess(res.rectificativeInvoiceNumber);
      onSuccess?.(res.rectificativeInvoiceNumber);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo emitir la devolución.");
      setSubmitting(false);
    }
  }

  // Pantalla de éxito (tras emitir).
  if (success) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 size={22} className="text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Devolución emitida
            </h3>
          </div>
          <p className="mb-4 text-sm text-gray-700">
            Se ha generado la factura rectificativa{" "}
            <strong className="text-gray-900">{success}</strong> y entrado en la
            cadena VeriFactu. El stock y los puntos se han ajustado
            automáticamente.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="devolucion-title"
    >
      <div className="flex h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h3
            id="devolucion-title"
            className="flex items-center gap-2 text-base font-bold text-gray-900"
          >
            <AlertTriangle size={16} className="text-amber-600" />
            Emitir devolución · {invoice.invoiceNumber}
          </h3>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
            aria-label="Cerrar modal de devolución"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-gray-50 p-6">
          {/* Alcance */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">
                Productos a devolver
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => toggleAll(true)}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-gray-700 hover:bg-gray-50"
                >
                  Todo
                </button>
                <button
                  type="button"
                  onClick={() => toggleAll(false)}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-gray-700 hover:bg-gray-50"
                >
                  Ninguno
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {lines.map((l, idx) => (
                <div
                  key={`${l.productId}-${idx}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={l.selected}
                    onChange={(e) =>
                      updateLine(idx, {
                        selected: e.target.checked,
                        returnQty: e.target.checked ? l.maxQty : 0,
                      })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    aria-label={`Seleccionar ${l.productName}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {l.productName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {l.unitPrice.toFixed(2)} € · facturado {l.maxQty} ud.
                    </div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={l.maxQty}
                    step={1}
                    value={l.returnQty}
                    onChange={(e) => {
                      const raw = Number.parseInt(e.target.value, 10);
                      const clamped = Number.isFinite(raw)
                        ? Math.max(0, Math.min(l.maxQty, raw))
                        : 0;
                      updateLine(idx, {
                        returnQty: clamped,
                        selected: clamped > 0,
                      });
                    }}
                    disabled={!l.selected}
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-right text-sm font-semibold text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                    aria-label={`Cantidad a devolver de ${l.productName}`}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Motivo */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">Motivo</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  Causa
                </span>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReturnReason)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                >
                  {REASON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  Detalle (opcional)
                </span>
                <input
                  type="text"
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  placeholder="Ej. carta doblada en la esquina"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </label>
            </div>
          </section>

          {/* Medio de reembolso */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">
              Medio de reembolso
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  Canal
                </span>
                <select
                  value={refundMethod}
                  onChange={(e) =>
                    setRefundMethod(e.target.value as RefundMethod)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                >
                  {METHOD_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {REFUND_METHOD_LABEL[m]}
                    </option>
                  ))}
                </select>
              </label>
              {refundMethod === "transferencia" ? (
                <>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-medium text-gray-600">
                      IBAN del cliente <span className="text-red-600">*</span>
                    </span>
                    <input
                      type="text"
                      value={refundIban}
                      onChange={(e) => setRefundIban(e.target.value)}
                      placeholder="ES91 2100 0418 4502 0005 1332"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                      aria-required="true"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-medium text-gray-600">
                      Titular (opcional)
                    </span>
                    <input
                      type="text"
                      value={refundHolder}
                      onChange={(e) => setRefundHolder(e.target.value)}
                      placeholder="Nombre del titular de la cuenta"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                </>
              ) : (
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block text-xs font-medium text-gray-600">
                    Referencia del reembolso (opcional)
                  </span>
                  <input
                    type="text"
                    value={refundPaymentRef}
                    onChange={(e) => setRefundPaymentRef(e.target.value)}
                    placeholder={
                      refundMethod === "tarjeta"
                        ? "Ej. TPV ref 8472"
                        : refundMethod === "bizum"
                          ? "Ej. Bizum 612345678"
                          : refundMethod === "efectivo"
                            ? "Ej. Efectivo — tienda Madrid"
                            : "Detalle del canal original"
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </label>
              )}
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  Nota interna (opcional)
                </span>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={2}
                  placeholder="Queda registrada en el historial del RMA — no se envía al cliente."
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </label>
            </div>
          </section>

          {/* Resumen + confirmación */}
          <section className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-amber-900">
                Total a reembolsar
              </span>
              <span className="text-xl font-bold text-amber-900">
                {totalRefund.toFixed(2)} €
              </span>
            </div>
            <label className="flex cursor-pointer items-start gap-2 text-xs text-amber-900">
              <input
                type="checkbox"
                checked={confirmIrreversible}
                onChange={(e) => setConfirmIrreversible(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
              <span>
                Entiendo que esta acción es <strong>irreversible</strong>:
                emitirá factura rectificativa que entrará en la cadena VeriFactu
                y se reflejará en el Modelo 303 del trimestre.
              </span>
            </label>
          </section>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {submitting ? "Emitiendo…" : "Emitir devolución"}
          </button>
        </div>
      </div>
    </div>
  );
}
