"use client";
/**
 * Libro de facturas RECIBIDAS — admin.
 *
 * Permite registrar las facturas de proveedores (compras) que alimentan:
 *  - Modelo 303 / 390 (IVA soportado)
 *  - Modelo 111 (retenciones a profesionales)
 *  - Modelo 115 (retenciones por alquileres)
 *  - Modelo 347 (operaciones >3.005,06€)
 *  - P&G (gastos deducibles para IS / Modelo 200/202)
 *
 * Único punto de escritura: supplierInvoiceService. Esta página es solo UI.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  ArrowLeft,
  Truck,
  Download,
  Camera,
} from "lucide-react";
import {
  loadSupplierInvoices,
  addSupplierInvoice,
  deleteSupplierInvoice,
  markAsPaid,
  recomputeTotals,
} from "@/services/supplierInvoiceService";
import {
  SupplierInvoiceStatus,
  TaxIdType,
  PaymentMethod,
  type SupplierInvoiceRecord,
  type SupplierInvoiceLine,
  type SupplierInvoiceCategory,
} from "@/types/fiscal";
import { DataHub } from "@/lib/dataHub";

const CATEGORY_LABELS: Record<SupplierInvoiceCategory, string> = {
  mercaderias: "Mercadería (reventa)",
  alquiler: "Alquiler local",
  suministros: "Suministros (luz/agua/internet)",
  servicios_profesionales: "Servicios profesionales",
  transporte: "Transporte",
  marketing: "Marketing / publicidad",
  material_oficina: "Material de oficina",
  amortizable: "Inmovilizado (amortizable)",
  otros: "Otros",
};

const fmt = (n: number) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_STYLES: Record<
  SupplierInvoiceStatus,
  { label: string; cls: string; icon: typeof CheckCircle2 }
> = {
  [SupplierInvoiceStatus.PENDIENTE]: {
    label: "Pendiente de pago",
    cls: "bg-amber-100 text-amber-700",
    icon: Clock,
  },
  [SupplierInvoiceStatus.PAGADA]: {
    label: "Pagada",
    cls: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  [SupplierInvoiceStatus.DISPUTADA]: {
    label: "En disputa",
    cls: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
};

export default function SupplierInvoicesPage() {
  const [items, setItems] = useState<SupplierInvoiceRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SupplierInvoiceStatus>("all");

  const reload = () => setItems(loadSupplierInvoices());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación inicial desde localStorage
    reload();
    return DataHub.on("supplierInvoices", reload);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.supplier.name.toLowerCase().includes(q) ||
        s.supplier.taxId.toLowerCase().includes(q) ||
        s.supplierInvoiceNumber.toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, s) => {
        acc.base += s.totalTaxableBase;
        acc.iva += s.totalVAT;
        acc.deducible += s.totalDeductibleVAT;
        acc.retencion += s.totalRetention;
        acc.total += s.totalInvoice;
        return acc;
      },
      { base: 0, iva: 0, deducible: 0, retencion: 0, total: 0 },
    );
  }, [filtered]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link
        href="/admin/fiscal"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al panel fiscal
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Truck className="h-5 w-5 text-slate-600" />
            <h1 className="text-2xl font-bold text-gray-900">Facturas de proveedores</h1>
          </div>
          <p className="max-w-2xl text-sm text-gray-500">
            Libro registro de compras. Cada factura aquí registrada alimenta automáticamente el IVA
            soportado del Modelo 303/390, las retenciones del 111/115 y los gastos deducibles para el
            Impuesto sobre Sociedades.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Link
            href="/admin/fiscal/proveedores/escanear"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Camera className="h-4 w-4" />
            Escanear ticket
          </Link>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-bold text-white hover:bg-[#1d4ed8]"
          >
            <Plus className="h-4 w-4" />
            {showForm ? "Cerrar formulario" : "Registrar factura"}
          </button>
        </div>
      </div>

      {showForm && (
        <SupplierInvoiceForm
          onSaved={() => {
            reload();
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proveedor, CIF o nº de factura..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-[#2563eb] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | SupplierInvoiceStatus)
          }
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">Todos los estados</option>
          <option value={SupplierInvoiceStatus.PENDIENTE}>Pendientes</option>
          <option value={SupplierInvoiceStatus.PAGADA}>Pagadas</option>
          <option value={SupplierInvoiceStatus.DISPUTADA}>En disputa</option>
        </select>
        <button
          type="button"
          onClick={() => exportCsv(filtered)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          CSV
        </button>
      </div>

      {/* Resumen */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <SummaryTile label="Facturas" value={filtered.length.toString()} />
        <SummaryTile label="Base imponible" value={`${fmt(totals.base)}€`} />
        <SummaryTile label="IVA soportado" value={`${fmt(totals.iva)}€`} highlight />
        <SummaryTile label="IVA deducible" value={`${fmt(totals.deducible)}€`} />
        <SummaryTile label="Retenciones practicadas" value={`${fmt(totals.retencion)}€`} />
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Nº factura</th>
              <th className="px-3 py-2">Proveedor</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2 text-right">Base</th>
              <th className="px-3 py-2 text-right">IVA</th>
              <th className="px-3 py-2 text-right">Retención</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-12 text-center text-sm text-gray-400">
                  Aún no hay facturas registradas. Pulsa &quot;Registrar factura&quot; para añadir la primera.
                </td>
              </tr>
            )}
            {filtered.map((s) => {
              const StatusIcon = STATUS_STYLES[s.status].icon;
              return (
                <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-700">{s.invoiceDate}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">
                    {s.supplierInvoiceNumber}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-gray-800">{s.supplier.name}</div>
                    <div className="text-[11px] text-gray-400">{s.supplier.taxId}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {CATEGORY_LABELS[s.category]}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(s.totalTaxableBase)}€</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-600">
                    {fmt(s.totalVAT)}€
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-600">
                    {s.totalRetention > 0 ? `−${fmt(s.totalRetention)}€` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">
                    {fmt(s.totalInvoice)}€
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[s.status].cls}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {STATUS_STYLES[s.status].label}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      {s.status === SupplierInvoiceStatus.PENDIENTE && (
                        <button
                          type="button"
                          onClick={() => {
                            markAsPaid(s.id, PaymentMethod.TRANSFERENCIA);
                            reload();
                          }}
                          className="rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 hover:bg-green-100"
                          title="Marcar como pagada (transferencia)"
                        >
                          Marcar pagada
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Eliminar factura ${s.supplierInvoiceNumber}?`)) {
                            deleteSupplierInvoice(s.id);
                            reload();
                          }
                        }}
                        className="rounded-md p-1 text-red-500 hover:bg-red-50"
                        aria-label={`Eliminar factura ${s.supplierInvoiceNumber}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Summary tile ───────────────────────────────────────────────────────────

function SummaryTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${highlight ? "border-[#2563eb] bg-blue-50" : "border-gray-200 bg-white"}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`mt-1 text-lg font-bold ${highlight ? "text-[#2563eb]" : "text-gray-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

// ── Form ───────────────────────────────────────────────────────────────────

function emptyLine(): SupplierInvoiceLine {
  return {
    description: "",
    quantity: 1,
    taxableBase: 0,
    vatRate: 21,
    vatAmount: 0,
    deductiblePct: 100,
    deductibleVAT: 0,
    retentionPct: 0,
    retentionAmount: 0,
    totalLine: 0,
  };
}

function SupplierInvoiceForm({
  onSaved,
  onCancel,
}: {
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [supplierName, setSupplierName] = useState("");
  const [supplierTaxId, setSupplierTaxId] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [category, setCategory] = useState<SupplierInvoiceCategory>("mercaderias");
  const [lines, setLines] = useState<SupplierInvoiceLine[]>([emptyLine()]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => recomputeTotals({ lines }), [lines]);

  const updateLine = (idx: number, patch: Partial<SupplierInvoiceLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const submit = () => {
    setError(null);
    if (!supplierName.trim()) {
      setError("El nombre del proveedor es obligatorio.");
      return;
    }
    if (!supplierTaxId.trim()) {
      setError("El CIF/NIF del proveedor es obligatorio.");
      return;
    }
    if (!invoiceNumber.trim()) {
      setError("El número de factura es obligatorio.");
      return;
    }
    if (lines.every((l) => l.taxableBase === 0)) {
      setError("Añade al menos una línea con base > 0.");
      return;
    }

    addSupplierInvoice({
      supplierInvoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      supplier: {
        name: supplierName.trim(),
        taxId: supplierTaxId.trim().toUpperCase(),
        taxIdType: TaxIdType.CIF,
        address: {
          street: "",
          city: "",
          postalCode: "",
          province: "",
          country: "España",
          countryCode: "ES",
        },
        phone: "",
        email: supplierEmail.trim(),
        isEU: true,
        countryCode: "ES",
      },
      category,
      lines: totals.lines,
      notes,
    });
    onSaved();
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-bold text-gray-900">Registrar factura recibida</h2>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Proveedor (razón social)">
          <input
            type="text"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="Asmodee Ibérica, S.L."
            className="input"
          />
        </Field>
        <Field label="CIF / NIF proveedor">
          <input
            type="text"
            value={supplierTaxId}
            onChange={(e) => setSupplierTaxId(e.target.value.toUpperCase())}
            placeholder="B12345678"
            className="input font-mono"
          />
        </Field>
        <Field label="Email contacto (opcional)">
          <input
            type="email"
            value={supplierEmail}
            onChange={(e) => setSupplierEmail(e.target.value)}
            placeholder="facturacion@proveedor.es"
            className="input"
          />
        </Field>
        <Field label="Nº de factura del proveedor">
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="F2026/123"
            className="input font-mono"
          />
        </Field>
        <Field label="Fecha factura">
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Categoría">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SupplierInvoiceCategory)}
            className="input"
          >
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Líneas */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">Líneas</h3>
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
          >
            <Plus className="h-3 w-3" />
            Añadir línea
          </button>
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-xs">
            <thead className="border-b border-gray-100 bg-gray-50 text-left uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-2 py-1.5">Descripción</th>
                <th className="px-2 py-1.5 text-right">Base</th>
                <th className="px-2 py-1.5 text-right">IVA %</th>
                <th className="px-2 py-1.5 text-right">Deducible %</th>
                <th className="px-2 py-1.5 text-right">Retención %</th>
                <th className="px-2 py-1.5 text-right">Total</th>
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => {
                const computed = totals.lines[idx];
                return (
                  <tr key={idx} className="border-b border-gray-50 last:border-0">
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={l.description}
                        onChange={(e) =>
                          updateLine(idx, { description: e.target.value })
                        }
                        placeholder="Concepto"
                        className="input-sm w-full"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        step="0.01"
                        value={l.taxableBase}
                        onChange={(e) =>
                          updateLine(idx, { taxableBase: parseFloat(e.target.value) || 0 })
                        }
                        className="input-sm w-24 text-right"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={l.vatRate}
                        onChange={(e) =>
                          updateLine(idx, {
                            vatRate: parseInt(e.target.value, 10) as 0 | 4 | 10 | 21,
                          })
                        }
                        className="input-sm w-16 text-right"
                      >
                        <option value={21}>21</option>
                        <option value={10}>10</option>
                        <option value={4}>4</option>
                        <option value={0}>0</option>
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        step="1"
                        min={0}
                        max={100}
                        value={l.deductiblePct}
                        onChange={(e) =>
                          updateLine(idx, {
                            deductiblePct: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)),
                          })
                        }
                        className="input-sm w-16 text-right"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        max={100}
                        value={l.retentionPct}
                        onChange={(e) =>
                          updateLine(idx, {
                            retentionPct: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                          })
                        }
                        className="input-sm w-16 text-right"
                      />
                    </td>
                    <td className="px-2 py-1 text-right font-mono font-semibold">
                      {fmt(computed?.totalLine ?? 0)}€
                    </td>
                    <td className="px-2 py-1 text-center">
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="rounded p-0.5 text-red-500 hover:bg-red-50"
                          aria-label="Eliminar línea"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-gray-100 bg-gray-50 font-semibold">
              <tr>
                <td className="px-2 py-1.5 text-right" colSpan={5}>
                  Totales
                </td>
                <td className="px-2 py-1.5 text-right font-mono">
                  {fmt(totals.totalInvoice)}€
                </td>
                <td></td>
              </tr>
              <tr className="text-[10px] text-gray-500">
                <td className="px-2 py-1 text-right" colSpan={5}>
                  Base {fmt(totals.totalTaxableBase)}€ · IVA {fmt(totals.totalVAT)}€ · Deducible{" "}
                  {fmt(totals.totalDeductibleVAT)}€ · Retención {fmt(totals.totalRetention)}€
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Field label="Notas internas (opcional)" className="mt-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="input"
          placeholder="Ej: factura recibida con retraso, pagada en efectivo, etc."
        />
      </Field>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-bold text-white hover:bg-[#1d4ed8]"
        >
          Registrar factura
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 13px;
          background: white;
        }
        .input:focus {
          outline: none;
          border-color: #2563eb;
        }
        .input-sm {
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          padding: 3px 6px;
          font-size: 12px;
          background: white;
        }
        .input-sm:focus {
          outline: none;
          border-color: #2563eb;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </label>
      {children}
    </div>
  );
}

// ── CSV export ─────────────────────────────────────────────────────────────

function exportCsv(items: SupplierInvoiceRecord[]): void {
  if (typeof window === "undefined") return;
  const rows: string[] = [];
  rows.push(
    [
      "Fecha",
      "Nº factura",
      "Proveedor",
      "CIF",
      "Categoría",
      "Base",
      "IVA",
      "Deducible",
      "Retención",
      "Total",
      "Estado",
    ].join(";"),
  );
  for (const s of items) {
    rows.push(
      [
        s.invoiceDate,
        `"${s.supplierInvoiceNumber}"`,
        `"${s.supplier.name.replace(/"/g, '""')}"`,
        s.supplier.taxId,
        CATEGORY_LABELS[s.category],
        fmt(s.totalTaxableBase),
        fmt(s.totalVAT),
        fmt(s.totalDeductibleVAT),
        fmt(s.totalRetention),
        fmt(s.totalInvoice),
        STATUS_STYLES[s.status].label,
      ].join(";"),
    );
  }
  const csv = rows.join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `compras-proveedores-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
