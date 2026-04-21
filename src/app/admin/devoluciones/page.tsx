"use client";

/**
 * Panel admin de Devoluciones (RMA).
 *
 * Flujo operativo:
 *  1. Lista de RMAs con filtro por estado.
 *  2. Detalle: items, IBAN, timeline, factura original/rectificativa.
 *  3. Acciones admin (transiciones de estado).
 *
 * REGLA DE NEGOCIO CRÍTICA (ver memoria feedback_returns_transferencia):
 *  - TODAS las devoluciones se reembolsan por TRANSFERENCIA BANCARIA.
 *  - IBAN del cliente obligatorio antes de marcar como "reembolsada".
 *  - "Reembolsar" es IRREVERSIBLE → genera rectificativa (cadena VeriFactu),
 *    afecta Modelo 303 del trimestre + asiento contable + Libro de facturas.
 *  - SIEMPRE modal de confirmación explícito antes de ejecutar.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Package,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react";
import { DataHub } from "@/lib/dataHub";
import {
  getReturns,
  getReturnStats,
  markAsRefunded,
  setRefundBankInfo,
  updateReturnStatus,
  type ReturnRequest,
  type ReturnStatus,
} from "@/services/returnService";
import { validateIban, formatIbanForDisplay, maskIban } from "@/lib/validations/iban";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

const STATUS_CFG: Record<
  ReturnStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  solicitada:   { label: "Solicitada",   color: "#d97706", bg: "#fef3c7", icon: Clock       },
  aprobada:     { label: "Aprobada",     color: "#2563eb", bg: "#dbeafe", icon: CheckCircle },
  en_transito:  { label: "En tránsito",  color: "#7c3aed", bg: "#ede9fe", icon: Truck       },
  recibida:     { label: "Recibida",     color: "#0891b2", bg: "#cffafe", icon: Package     },
  reembolsada:  { label: "Reembolsada",  color: "#16a34a", bg: "#dcfce7", icon: Banknote    },
  rechazada:    { label: "Rechazada",    color: "#dc2626", bg: "#fee2e2", icon: XCircle     },
  cerrada:      { label: "Cerrada",      color: "#64748b", bg: "#e2e8f0", icon: CheckCircle },
};

const TABS: { key: ReturnStatus | "todas"; label: string }[] = [
  { key: "todas",       label: "Todas"        },
  { key: "solicitada",  label: "Solicitadas"  },
  { key: "aprobada",    label: "Aprobadas"    },
  { key: "en_transito", label: "En tránsito"  },
  { key: "recibida",    label: "Recibidas"    },
  { key: "reembolsada", label: "Reembolsadas" },
  { key: "rechazada",   label: "Rechazadas"   },
];

export default function AdminDevolucionesPage() {
  // Lazy initializer — lee storage UNA vez durante el render inicial
  // (en vez de en useEffect, que dispararía cascading render). Ejecuta
  // sólo en cliente: en SSR getReturns() devuelve [] porque window es undefined.
  const [returns, setReturns] = useState<ReturnRequest[]>(() => getReturns());
  const [tab, setTab] = useState<ReturnStatus | "todas">("todas");

  const reload = useCallback(() => {
    setReturns(getReturns());
  }, []);

  useEffect(() => {
    // Suscripción a eventos: refresh cuando cambia el storage.
    const unsubscribe = DataHub.on("returns", reload);
    return unsubscribe;
  }, [reload]);

  const filtered = useMemo(
    () => (tab === "todas" ? returns : returns.filter((r) => r.status === tab)),
    [returns, tab],
  );

  // Stats derivadas del mismo snapshot → se recalculan cuando cambia `returns`.
  const stats = useMemo(() => getReturnStats(), [returns]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Devoluciones (RMA)</h1>
        <p className="mt-1 text-sm text-slate-600">
          Gestión de solicitudes de devolución. Todas los reembolsos se emiten{" "}
          <strong>por transferencia bancaria</strong> — el IBAN del cliente es obligatorio.
          Reembolsar es irreversible: genera factura rectificativa y afecta al Modelo 303.
        </p>
      </header>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiCard label="Total" value={stats.total} />
        <KpiCard label="Pendientes" value={stats.pending} tone="warn" />
        <KpiCard label="En gestión" value={stats.approved} tone="info" />
        <KpiCard label="Reembolsadas" value={stats.completed} tone="ok" />
        <KpiCard
          label="Total reembolsado"
          value={`${stats.totalRefundAmount.toFixed(2)} €`}
          tone="ok"
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === t.key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={reload}
          className="ml-auto flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
          aria-label="Refrescar devoluciones"
        >
          <RefreshCw size={14} /> Refrescar
        </button>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
          No hay devoluciones en este estado.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((rma) => (
            <ReturnCard key={rma.id} rma={rma} onChange={reload} />
          ))}
        </ul>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "warn" | "info" | "ok";
}) {
  const toneCls = {
    neutral: "bg-white border-slate-200 text-slate-900",
    warn: "bg-amber-50 border-amber-200 text-amber-900",
    info: "bg-blue-50 border-blue-200 text-blue-900",
    ok: "bg-emerald-50 border-emerald-200 text-emerald-900",
  }[tone];
  return (
    <div className={`rounded-xl border p-3 ${toneCls}`}>
      <div className="text-xs font-medium opacity-70">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function ReturnCard({
  rma,
  onChange,
}: {
  rma: ReturnRequest;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [ibanInput, setIbanInput] = useState(rma.refundIban ?? "");
  const [holderInput, setHolderInput] = useState(rma.refundHolderName ?? "");
  const [ibanError, setIbanError] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);

  const [confirmRefund, setConfirmRefund] = useState(false);
  const [feedback, setFeedback] = useState<
    | { type: "success"; title: string; message?: string }
    | { type: "error"; title: string; errors: string[] }
    | null
  >(null);

  const stCfg = STATUS_CFG[rma.status];
  const StatusIcon = stCfg.icon;

  const createdStr = new Date(rma.createdAt).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // IBAN válido para permitir reembolso.
  const ibanOk = rma.refundIban ? validateIban(rma.refundIban).valid : false;
  const canRefund = rma.status === "recibida" && ibanOk;

  const handleSaveIban = () => {
    setIbanError(null);
    try {
      setRefundBankInfo(rma.id, ibanInput, holderInput || undefined);
      onChange();
      setFeedback({
        type: "success",
        title: "IBAN guardado",
        message: "El IBAN ha sido validado y guardado correctamente.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setIbanError(msg);
    }
  };

  const handleTransition = (newStatus: ReturnStatus, note: string) => {
    updateReturnStatus(rma.id, newStatus, note);
    onChange();
  };

  const handleRefund = async () => {
    setBusy(true);
    try {
      const result = await markAsRefunded(rma.id, { adminNote });
      onChange();
      setFeedback({
        type: "success",
        title: "Reembolso procesado",
        message: `Factura rectificativa ${result.rectificativeInvoiceNumber} generada. El Modelo 303 del trimestre se actualiza automáticamente.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setFeedback({
        type: "error",
        title: "No se pudo procesar el reembolso",
        errors: [msg],
      });
    } finally {
      setBusy(false);
      setConfirmRefund(false);
    }
  };

  return (
    <li className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Cabecera */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: stCfg.bg }}
          >
            <StatusIcon size={18} style={{ color: stCfg.color }} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{rma.id}</span>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: stCfg.bg, color: stCfg.color }}
              >
                {stCfg.label}
              </span>
            </div>
            <div className="mt-0.5 truncate text-xs text-slate-500">
              Pedido {rma.orderId} · {rma.customerName} · {createdStr}
            </div>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <span className="text-sm font-semibold text-slate-900">
            {rma.totalRefundAmount.toFixed(2)} €
          </span>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Detalle */}
      {open && (
        <div className="border-t border-slate-200 px-4 py-4">
          {/* Productos */}
          <section className="mb-4">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Productos a devolver
            </h3>
            <ul className="space-y-1 text-sm">
              {rma.items.map((it, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="truncate">
                    {it.quantity} × {it.productName}
                  </span>
                  <span className="font-medium">
                    {(it.unitPrice * it.quantity).toFixed(2)} €
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* IBAN — obligatorio para reembolsar */}
          <section className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-amber-900 uppercase">
              <Banknote size={14} /> Datos bancarios del reembolso
            </h3>
            {rma.refundIban && ibanOk ? (
              <div className="text-sm text-amber-900">
                <div>
                  IBAN guardado:{" "}
                  <span className="font-mono font-semibold">
                    {maskIban(rma.refundIban)}
                  </span>
                </div>
                {rma.refundHolderName && (
                  <div className="mt-0.5">Titular: {rma.refundHolderName}</div>
                )}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs underline">
                    Editar IBAN
                  </summary>
                  <IbanEditor
                    ibanInput={ibanInput}
                    setIbanInput={setIbanInput}
                    holderInput={holderInput}
                    setHolderInput={setHolderInput}
                    onSave={handleSaveIban}
                    ibanError={ibanError}
                  />
                </details>
              </div>
            ) : (
              <IbanEditor
                ibanInput={ibanInput}
                setIbanInput={setIbanInput}
                holderInput={holderInput}
                setHolderInput={setHolderInput}
                onSave={handleSaveIban}
                ibanError={ibanError}
              />
            )}
          </section>

          {/* Timeline */}
          <section className="mb-4">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Historial
            </h3>
            <ol className="space-y-1.5 border-l-2 border-slate-200 pl-3 text-sm">
              {rma.statusHistory.map((h, i) => {
                const cfg = STATUS_CFG[h.status];
                const ts = new Date(h.timestamp).toLocaleString("es-ES", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <li key={i} className="relative -ml-4 pl-4">
                    <span
                      className="absolute top-1.5 -left-[5px] h-2 w-2 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                      aria-hidden="true"
                    />
                    <div className="font-medium text-slate-800">
                      {cfg.label}{" "}
                      <span className="ml-1 text-xs font-normal text-slate-500">
                        {ts}
                      </span>
                    </div>
                    {h.note && (
                      <div className="text-xs text-slate-600">{h.note}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Factura rectificativa (si ya reembolsada) */}
          {rma.rectificativeInvoiceNumber && (
            <section className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <div className="flex items-center gap-1.5 font-semibold">
                <FileText size={14} /> Factura rectificativa generada
              </div>
              <div className="mt-1 font-mono">
                {rma.rectificativeInvoiceNumber}
              </div>
              <div className="mt-1 text-xs">
                Ha sido registrada en el Libro de facturas y afecta al Modelo 303
                del trimestre actual (importe con signo negativo).
              </div>
            </section>
          )}

          {/* Acciones de transición */}
          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Acciones
            </h3>
            <div className="flex flex-wrap gap-2">
              {rma.status === "solicitada" && (
                <>
                  <ActionButton
                    color="#2563eb"
                    onClick={() =>
                      handleTransition("aprobada", "Aprobada por el admin")
                    }
                  >
                    Aprobar
                  </ActionButton>
                  <ActionButton
                    color="#dc2626"
                    onClick={() =>
                      handleTransition("rechazada", "Rechazada por el admin")
                    }
                  >
                    Rechazar
                  </ActionButton>
                </>
              )}
              {rma.status === "aprobada" && (
                <ActionButton
                  color="#7c3aed"
                  onClick={() =>
                    handleTransition(
                      "en_transito",
                      "Cliente ha enviado el paquete",
                    )
                  }
                >
                  Marcar en tránsito
                </ActionButton>
              )}
              {rma.status === "en_transito" && (
                <ActionButton
                  color="#0891b2"
                  onClick={() =>
                    handleTransition("recibida", "Paquete recibido y revisado")
                  }
                >
                  Marcar recibido
                </ActionButton>
              )}
              {rma.status === "recibida" && (
                <>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Nota del reembolso (opcional, queda en el historial y en la rectificativa)"
                    className="w-full rounded-lg border border-slate-200 p-2 text-sm"
                    rows={2}
                  />
                  {!ibanOk && (
                    <p className="flex w-full items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-xs text-amber-900">
                      <AlertTriangle size={14} /> Guarda un IBAN válido antes de
                      reembolsar.
                    </p>
                  )}
                  <ActionButton
                    color="#16a34a"
                    disabled={!canRefund || busy}
                    onClick={() => setConfirmRefund(true)}
                  >
                    Reembolsar por transferencia
                  </ActionButton>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Modal confirmación reembolso (IRREVERSIBLE) */}
      {confirmRefund && (
        <RefundConfirmModal
          rma={rma}
          adminNote={adminNote}
          busy={busy}
          onCancel={() => setConfirmRefund(false)}
          onConfirm={handleRefund}
        />
      )}

      {/* Feedback (éxito / error) */}
      <ConfirmationModal
        isOpen={feedback !== null}
        type={feedback?.type ?? "success"}
        title={feedback?.title ?? ""}
        message={feedback?.type === "success" ? feedback.message : undefined}
        errors={feedback?.type === "error" ? feedback.errors : undefined}
        onClose={() => setFeedback(null)}
        actions={[{ label: "Cerrar", variant: "primary" }]}
      />
    </li>
  );
}

function IbanEditor({
  ibanInput,
  setIbanInput,
  holderInput,
  setHolderInput,
  onSave,
  ibanError,
}: {
  ibanInput: string;
  setIbanInput: (v: string) => void;
  holderInput: string;
  setHolderInput: (v: string) => void;
  onSave: () => void;
  ibanError: string | null;
}) {
  // Feedback en vivo del IBAN mientras el admin escribe.
  const live = ibanInput.trim().length >= 6 ? validateIban(ibanInput) : null;
  return (
    <div className="mt-2 space-y-2">
      <div>
        <label className="block text-xs font-medium text-amber-900">
          IBAN del cliente
        </label>
        <input
          type="text"
          value={ibanInput}
          onChange={(e) => setIbanInput(e.target.value.toUpperCase())}
          placeholder="ES91 2100 0418 4502 0005 1332"
          className="mt-1 w-full rounded-lg border border-amber-300 bg-white p-2 font-mono text-sm"
          aria-label="IBAN del cliente"
        />
        {live && (
          <p
            className={`mt-1 text-xs ${
              live.valid ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {live.valid
              ? `IBAN válido (${live.countryCode}) — ${live.formatted}`
              : live.error}
          </p>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-amber-900">
          Titular (opcional)
        </label>
        <input
          type="text"
          value={holderInput}
          onChange={(e) => setHolderInput(e.target.value)}
          placeholder="Nombre completo del titular"
          className="mt-1 w-full rounded-lg border border-amber-300 bg-white p-2 text-sm"
          aria-label="Titular de la cuenta"
        />
      </div>
      {ibanError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          {ibanError}
        </p>
      )}
      <button
        onClick={onSave}
        className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
      >
        Guardar IBAN
      </button>
    </div>
  );
}

function ActionButton({
  children,
  color,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="min-h-[40px] rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
      style={{ backgroundColor: color }}
    >
      {children}
    </button>
  );
}

/**
 * Modal de confirmación EXPLÍCITA antes de emitir un reembolso.
 * Requiere:
 *  - Mostrar IBAN + importe + consecuencias fiscales.
 *  - Usuario debe hacer clic adicional ("Confirmar reembolso").
 *  - Botón cancelar siempre disponible y es la opción por defecto.
 */
function RefundConfirmModal({
  rma,
  adminNote,
  busy,
  onCancel,
  onConfirm,
}: {
  rma: ReturnRequest;
  adminNote: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-confirm-title"
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
      >
        <div className="rounded-t-2xl bg-red-50 px-6 py-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 flex-shrink-0 text-red-600"
              size={28}
            />
            <div>
              <h2
                id="refund-confirm-title"
                className="text-lg font-bold text-red-900"
              >
                Confirmar reembolso — acción IRREVERSIBLE
              </h2>
              <p className="mt-1 text-sm text-red-800">
                Vas a emitir una transferencia bancaria y generar una factura
                rectificativa. <strong>Esta acción NO se puede deshacer.</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-6 py-5 text-sm">
          <div className="space-y-1 rounded-lg border border-slate-200 p-3">
            <Row label="Devolución" value={rma.id} />
            <Row label="Pedido" value={rma.orderId} />
            <Row label="Cliente" value={rma.customerName} />
            <Row
              label="Importe a transferir"
              value={`${rma.totalRefundAmount.toFixed(2)} €`}
              strong
            />
            <Row
              label="IBAN destino"
              value={
                rma.refundIban
                  ? formatIbanForDisplay(rma.refundIban)
                  : "— (no guardado)"
              }
              mono
            />
            {rma.refundHolderName && (
              <Row label="Titular" value={rma.refundHolderName} />
            )}
          </div>

          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            <strong className="block">Consecuencias fiscales:</strong>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>Se crea factura rectificativa con signo negativo.</li>
              <li>
                Se resta del Modelo 303 del trimestre en curso y del Modelo 390
                anual.
              </li>
              <li>
                Se genera asiento contable doble (reversión ingresos + IVA
                repercutido).
              </li>
              <li>Entra en la cadena VeriFactu inmutable.</li>
              <li>Se restaura el stock de los productos devueltos.</li>
            </ul>
          </div>

          {adminNote && (
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
              <strong>Nota:</strong> {adminNote}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onCancel}
              disabled={busy}
              className="min-h-[44px] rounded-xl border-2 border-slate-200 px-5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className="min-h-[44px] rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "Procesando…" : "Confirmar reembolso"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  mono,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span
        className={`text-right ${strong ? "font-bold text-slate-900" : "text-slate-800"} ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
