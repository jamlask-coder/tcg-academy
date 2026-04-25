"use client";
/**
 * Conciliación bancaria — admin.
 *
 * Importa extractos CSV del banco y los empareja automáticamente con:
 *  - Pedidos pendientes de cobro (transferencia / tienda).
 *  - Facturas de proveedores PENDIENTE.
 *
 * El admin revisa, ajusta o ignora movimientos. Al confirmar, el sistema
 * marca el pedido como cobrado o la factura proveedor como pagada (con
 * paymentDate = fecha del movimiento).
 *
 * Toda la lógica vive en `bankReconciliationService`. Esta página es UI.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  RefreshCw,
  CheckCircle2,
  X,
  Search,
  EyeOff,
  Trash2,
  Banknote,
  TrendingDown,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import {
  loadBankMovements,
  loadImportBatches,
  importCSV,
  confirmMatch,
  unmatch,
  markIgnored,
  setManualMatch,
  rematchAll,
  deleteBatch,
} from "@/services/bankReconciliationService";
import type {
  BankMovement,
  BankMovementStatus,
  BankImportBatch,
} from "@/types/fiscal";
import {
  readAdminOrdersMerged,
  getOrderPaymentStatus,
} from "@/lib/orderAdapter";
import { loadSupplierInvoices } from "@/services/supplierInvoiceService";
import { SupplierInvoiceStatus } from "@/types/fiscal";
import { DataHub } from "@/lib/dataHub";

const fmt = (n: number) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_LABEL: Record<BankMovementStatus, string> = {
  unmatched: "Sin emparejar",
  "auto-matched": "Sugerido",
  confirmed: "Confirmado",
  ignored: "Ignorado",
};

const STATUS_CLS: Record<BankMovementStatus, string> = {
  unmatched: "bg-gray-100 text-gray-700",
  "auto-matched": "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  ignored: "bg-gray-100 text-gray-400",
};

const CONF_LABEL = {
  exact: "Exacto",
  high: "Alto",
  low: "Bajo",
} as const;

const CONF_CLS = {
  exact: "bg-green-100 text-green-700",
  high: "bg-blue-100 text-blue-700",
  low: "bg-amber-100 text-amber-800",
} as const;

export default function ConciliacionPage() {
  const [movements, setMovements] = useState<BankMovement[]>([]);
  const [batches, setBatches] = useState<BankImportBatch[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | BankMovementStatus>(
    "auto-matched",
  );
  const [search, setSearch] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [errorList, setErrorList] = useState<string[]>([]);
  const [manualEditingId, setManualEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = () => {
    setMovements(loadBankMovements());
    setBatches(loadImportBatches());
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación inicial desde localStorage
    reload();
    const off1 = DataHub.on("bankMovements", reload);
    const off2 = DataHub.on("orders", reload);
    const off3 = DataHub.on("supplierInvoices", reload);
    return () => {
      off1();
      off2();
      off3();
    };
  }, []);

  const stats = useMemo(() => {
    let unmatched = 0;
    let autoMatched = 0;
    let confirmed = 0;
    let ignored = 0;
    let totalIncome = 0;
    let totalExpense = 0;
    for (const m of movements) {
      if (m.status === "unmatched") unmatched++;
      else if (m.status === "auto-matched") autoMatched++;
      else if (m.status === "confirmed") confirmed++;
      else if (m.status === "ignored") ignored++;
      if (m.type === "income") totalIncome += m.amount;
      else totalExpense += Math.abs(m.amount);
    }
    return {
      total: movements.length,
      unmatched,
      autoMatched,
      confirmed,
      ignored,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
    };
  }, [movements]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return movements
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .filter((m) => statusFilter === "all" || m.status === statusFilter)
      .filter((m) =>
        q
          ? `${m.concept} ${m.reference} ${m.counterparty}`
              .toLowerCase()
              .includes(q)
          : true,
      );
  }, [movements, statusFilter, search]);

  // ── File upload ─────────────────────────────────────────────────────────
  const onFileSelected = async (file: File) => {
    setImportMsg(null);
    setErrorList([]);
    try {
      const text = await file.text();
      const result = importCSV(text, file.name);
      setImportMsg(
        `Importadas ${result.movementsAdded} líneas desde ${file.name} (${result.batch.bank}).`,
      );
      setErrorList(result.errors);
    } catch (e) {
      setImportMsg(`Error leyendo el fichero: ${(e as Error).message}`);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div>
      <Link
        href="/admin/fiscal"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] hover:underline"
      >
        <ArrowLeft size={14} /> Volver a Fiscal
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Banknote size={22} className="text-[#0891b2]" /> Conciliación
            bancaria
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Importa el extracto del banco y empareja cobros y pagos con un click
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const n = rematchAll();
              setImportMsg(`Re-emparejados: ${n} movimientos.`);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Re-emparejar
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0891b2] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0e7490]"
          >
            <Upload size={14} /> Importar CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFileSelected(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Mensajes de importación */}
      {importMsg && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {importMsg}
        </div>
      )}
      {errorList.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Avisos del parser:</p>
          <ul className="ml-5 list-disc text-xs">
            {errorList.slice(0, 8).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
            {errorList.length > 8 && (
              <li>… y {errorList.length - 8} más</li>
            )}
          </ul>
        </div>
      )}

      {/* KPI */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Movimientos" value={stats.total} />
        <Kpi label="Sin emparejar" value={stats.unmatched} tone="amber" />
        <Kpi label="Sugeridos" value={stats.autoMatched} tone="blue" />
        <Kpi label="Confirmados" value={stats.confirmed} tone="green" />
        <Kpi label="Ignorados" value={stats.ignored} tone="gray" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
          <TrendingUp size={18} className="text-green-600" />
          <div>
            <p className="text-xs text-gray-500">Ingresos importados</p>
            <p className="text-lg font-bold text-gray-900">{fmt(stats.totalIncome)} €</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
          <TrendingDown size={18} className="text-red-600" />
          <div>
            <p className="text-xs text-gray-500">Gastos importados</p>
            <p className="text-lg font-bold text-gray-900">{fmt(stats.totalExpense)} €</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute top-2.5 left-3 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar concepto, contrapartida…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white py-2 pr-3 pl-9 text-sm placeholder-gray-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | BankMovementStatus)
          }
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
        >
          <option value="all">Todos los estados</option>
          <option value="unmatched">Sin emparejar</option>
          <option value="auto-matched">Sugeridos (revisar)</option>
          <option value="confirmed">Confirmados</option>
          <option value="ignored">Ignorados</option>
        </select>
        <p className="text-xs text-gray-500">
          Mostrando {filtered.length} de {movements.length}
        </p>
      </div>

      {/* Tabla movimientos */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
          <Banknote size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-600">
            {movements.length === 0
              ? "No hay movimientos importados todavía"
              : "Ningún movimiento coincide con los filtros"}
          </p>
          {movements.length === 0 && (
            <p className="mt-1 text-sm text-gray-400">
              Importa un CSV del banco con columnas Fecha; Concepto; Importe.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold">Concepto</th>
                <th className="px-4 py-3 text-right font-semibold">Importe</th>
                <th className="px-4 py-3 text-left font-semibold">Estado</th>
                <th className="px-4 py-3 text-left font-semibold">Match</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((m) => (
                <MovementRow
                  key={m.id}
                  mov={m}
                  editingManual={manualEditingId === m.id}
                  onStartManual={() => setManualEditingId(m.id)}
                  onCancelManual={() => setManualEditingId(null)}
                  onConfirm={() => {
                    confirmMatch(m.id);
                    setManualEditingId(null);
                  }}
                  onUnmatch={() => unmatch(m.id)}
                  onIgnore={() => markIgnored(m.id)}
                  onPickManual={(type, id) => {
                    setManualMatch(m.id, type, id);
                    setManualEditingId(null);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lotes importados */}
      {batches.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-bold text-gray-900">Lotes importados</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs tracking-wide text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Importado</th>
                  <th className="px-4 py-3 text-left font-semibold">Origen</th>
                  <th className="px-4 py-3 text-left font-semibold">Banco</th>
                  <th className="px-4 py-3 text-right font-semibold">Movs.</th>
                  <th className="px-4 py-3 text-right font-semibold">Ingresos</th>
                  <th className="px-4 py-3 text-right font-semibold">Gastos</th>
                  <th className="px-4 py-3 text-right font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches
                  .slice()
                  .sort((a, b) => (a.importedAt < b.importedAt ? 1 : -1))
                  .map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-3 text-gray-700">
                        {new Date(b.importedAt).toLocaleString("es-ES")}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{b.source}</td>
                      <td className="px-4 py-3 text-gray-700">{b.bank}</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {b.movementCount}
                      </td>
                      <td className="px-4 py-3 text-right text-green-700">
                        {fmt(b.totalIncome)} €
                      </td>
                      <td className="px-4 py-3 text-right text-red-700">
                        {fmt(b.totalExpense)} €
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              confirm(
                                "Eliminar el lote y sus movimientos no confirmados?",
                              )
                            ) {
                              deleteBatch(b.id);
                            }
                          }}
                          className="text-gray-400 hover:text-red-500"
                          aria-label="Eliminar lote"
                          title="Eliminar lote"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Subcomponentes ─────────────────────────────────────────────────────────

function Kpi({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "amber" | "blue" | "green" | "gray";
}) {
  const cls =
    tone === "amber"
      ? "text-amber-700"
      : tone === "blue"
        ? "text-blue-700"
        : tone === "green"
          ? "text-green-700"
          : tone === "gray"
            ? "text-gray-500"
            : "text-gray-900";
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${cls}`}>{value}</p>
    </div>
  );
}

function MovementRow({
  mov,
  editingManual,
  onStartManual,
  onCancelManual,
  onConfirm,
  onUnmatch,
  onIgnore,
  onPickManual,
}: {
  mov: BankMovement;
  editingManual: boolean;
  onStartManual: () => void;
  onCancelManual: () => void;
  onConfirm: () => void;
  onUnmatch: () => void;
  onIgnore: () => void;
  onPickManual: (type: "order" | "supplier_invoice", id: string) => void;
}) {
  const target = mov.matchedTo;
  const targetLabel = getMatchTargetLabel(target);
  const fmtAmount = (mov.amount >= 0 ? "+" : "") + fmt(mov.amount);
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
        {mov.date}
      </td>
      <td className="px-4 py-3 text-xs">
        <p className="font-medium text-gray-900">{mov.concept || "(sin concepto)"}</p>
        {(mov.counterparty || mov.reference) && (
          <p className="mt-0.5 text-[11px] text-gray-500">
            {[mov.counterparty, mov.reference].filter(Boolean).join(" · ")}
          </p>
        )}
      </td>
      <td
        className={`px-4 py-3 text-right text-sm font-semibold whitespace-nowrap ${
          mov.amount >= 0 ? "text-green-700" : "text-red-700"
        }`}
      >
        {fmtAmount} €
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[mov.status]}`}
        >
          {STATUS_LABEL[mov.status]}
        </span>
      </td>
      <td className="px-4 py-3 text-xs">
        {editingManual ? (
          <ManualPicker
            type={mov.type}
            onPick={onPickManual}
            onCancel={onCancelManual}
          />
        ) : target ? (
          <div>
            <p className="font-medium text-gray-800">{targetLabel}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${CONF_CLS[target.confidence]}`}
              >
                {CONF_LABEL[target.confidence]}
              </span>
              {Math.abs(target.expectedAmount - Math.abs(mov.amount)) >
                0.02 && (
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                  Δ {fmt(target.expectedAmount - Math.abs(mov.amount))} €
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {mov.status !== "confirmed" && (
            <>
              {target && (
                <button
                  type="button"
                  onClick={onConfirm}
                  className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700"
                  title="Confirmar emparejamiento"
                >
                  <CheckCircle2 size={12} /> Confirmar
                </button>
              )}
              {!editingManual && (
                <button
                  type="button"
                  onClick={onStartManual}
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  title="Emparejar manualmente"
                >
                  Manual
                </button>
              )}
              {target && (
                <button
                  type="button"
                  onClick={onUnmatch}
                  className="rounded-md p-1 text-gray-400 hover:text-red-500"
                  aria-label="Quitar match"
                  title="Quitar match"
                >
                  <X size={14} />
                </button>
              )}
              {mov.status !== "ignored" && (
                <button
                  type="button"
                  onClick={onIgnore}
                  className="rounded-md p-1 text-gray-400 hover:text-gray-700"
                  aria-label="Ignorar"
                  title="Ignorar (comisión, transferencia interna…)"
                >
                  <EyeOff size={14} />
                </button>
              )}
            </>
          )}
          {mov.status === "confirmed" && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
              <CheckCircle2 size={12} /> Aplicado
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function getMatchTargetLabel(target: BankMovement["matchedTo"]): string {
  if (!target) return "";
  if (target.type === "order") {
    const o = readAdminOrdersMerged().find((x) => x.id === target.id);
    if (!o) return `Pedido ${target.id} (no encontrado)`;
    return `Pedido ${o.id} · ${o.userName}`;
  }
  const s = loadSupplierInvoices().find((x) => x.id === target.id);
  if (!s) return `Factura ${target.id} (no encontrada)`;
  return `Factura ${s.supplierInvoiceNumber} · ${s.supplier.name}`;
}

function ManualPicker({
  type,
  onPick,
  onCancel,
}: {
  type: BankMovement["type"];
  onPick: (type: "order" | "supplier_invoice", id: string) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState("");
  const candidates = useMemo(() => {
    if (type === "income") {
      return readAdminOrdersMerged()
        .filter((o) => getOrderPaymentStatus(o.id) === "pendiente")
        .map((o) => ({
          id: o.id,
          label: `${o.id} · ${o.userName} · ${fmt(o.total)} €`,
          type: "order" as const,
        }));
    }
    return loadSupplierInvoices()
      .filter((s) => s.status === SupplierInvoiceStatus.PENDIENTE)
      .map((s) => ({
        id: s.id,
        label: `${s.supplierInvoiceNumber} · ${s.supplier.name} · ${fmt(s.totalInvoice)} €`,
        type: "supplier_invoice" as const,
      }));
  }, [type]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return candidates.filter((c) => (t ? c.label.toLowerCase().includes(t) : true));
  }, [candidates, q]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={type === "income" ? "Buscar pedido…" : "Buscar factura proveedor…"}
          className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-700"
          aria-label="Cancelar"
        >
          <X size={14} />
        </button>
      </div>
      <ul className="max-h-40 overflow-y-auto text-[11px]">
        {filtered.length === 0 ? (
          <li className="px-2 py-1 text-gray-400">
            <AlertCircle size={11} className="mr-1 inline" /> Sin candidatos
          </li>
        ) : (
          filtered.slice(0, 30).map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(c.type, c.id)}
                className="block w-full rounded px-2 py-1 text-left hover:bg-gray-100"
              >
                {c.label}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
