"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Plus,
} from "lucide-react";
import { loadInvoices } from "@/services/invoiceService";
import {
  generateCSVForAdvisor,
  filterByPeriod,
  getTaxPeriod,
} from "@/services/taxService";
import type { InvoiceRecord } from "@/types/fiscal";
import { InvoiceStatus, VerifactuStatus, InvoiceType } from "@/types/fiscal";
import type { Quarter } from "@/types/tax";

function formatDate(d: Date | string): string {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

function statusBadge(status: InvoiceStatus) {
  const map: Record<InvoiceStatus, { label: string; cls: string }> = {
    [InvoiceStatus.EMITIDA]: {
      label: "Emitida",
      cls: "bg-amber-100 text-amber-800",
    },
    [InvoiceStatus.ENVIADA_AEAT]: {
      label: "Enviada",
      cls: "bg-blue-100 text-blue-800",
    },
    [InvoiceStatus.VERIFICADA]: {
      label: "Verificada",
      cls: "bg-green-100 text-green-800",
    },
    [InvoiceStatus.RECHAZADA]: {
      label: "Rechazada",
      cls: "bg-red-100 text-red-800",
    },
    [InvoiceStatus.ANULADA]: {
      label: "Anulada",
      cls: "bg-red-100 text-red-700",
    },
  };
  const { label, cls } = map[status] ?? {
    label: status,
    cls: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function verifactuBadge(status: VerifactuStatus) {
  const map: Record<VerifactuStatus, { label: string; cls: string }> = {
    [VerifactuStatus.PENDIENTE]: {
      label: "Pendiente",
      cls: "bg-amber-100 text-amber-800",
    },
    [VerifactuStatus.ENVIADA]: {
      label: "Enviada",
      cls: "bg-blue-100 text-blue-800",
    },
    [VerifactuStatus.ACEPTADA]: {
      label: "Aceptada",
      cls: "bg-green-100 text-green-800",
    },
    [VerifactuStatus.RECHAZADA]: {
      label: "Rechazada",
      cls: "bg-red-100 text-red-800",
    },
  };
  const { label, cls } = map[status] ?? {
    label: status,
    cls: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

type SortKey = "invoiceNumber" | "invoiceDate" | "total";

function SortIcon({
  k,
  sortKey,
  sortAsc,
}: {
  k: SortKey;
  sortKey: SortKey;
  sortAsc: boolean;
}) {
  return sortKey === k ? (
    sortAsc ? (
      <ChevronUp size={13} className="inline" />
    ) : (
      <ChevronDown size={13} className="inline" />
    )
  ) : (
    <ArrowUpDown size={13} className="inline opacity-40" />
  );
}

export default function FacturasPage() {
  const [invoices] = useState<InvoiceRecord[]>(() => loadInvoices());
  const [yearFilter, setYearFilter] = useState<number>(
    new Date().getFullYear(),
  );
  const [quarterFilter, setQuarterFilter] = useState<Quarter | "all">("all");
  const [typeFilter, setTypeFilter] = useState<InvoiceType | "all">("all");
  const [verifactuFilter, setVerifactuFilter] = useState<
    VerifactuStatus | "all"
  >("all");
  const [sortKey, setSortKey] = useState<SortKey>("invoiceDate");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = invoices.filter(
      (inv) => new Date(inv.invoiceDate).getFullYear() === yearFilter,
    );
    if (quarterFilter !== "all") {
      const period = getTaxPeriod(yearFilter, quarterFilter);
      list = filterByPeriod(list, period);
    }
    if (typeFilter !== "all")
      list = list.filter((inv) => inv.invoiceType === typeFilter);
    if (verifactuFilter !== "all")
      list = list.filter((inv) => inv.verifactuStatus === verifactuFilter);
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "invoiceNumber")
        cmp = a.invoiceNumber.localeCompare(b.invoiceNumber);
      else if (sortKey === "invoiceDate")
        cmp =
          new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime();
      else cmp = a.totals.totalInvoice - b.totals.totalInvoice;
      return sortAsc ? cmp : -cmp;
    });
  }, [
    invoices,
    yearFilter,
    quarterFilter,
    typeFilter,
    verifactuFilter,
    sortKey,
    sortAsc,
  ]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function exportAll() {
    const csv = generateCSVForAdvisor(filtered, {
      period: null,
      format: "CSV",
      includeLineItems: false,
      includeRecipientData: true,
      filterByVatRate: null,
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facturas_${yearFilter}${quarterFilter !== "all" ? `_T${quarterFilter}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportSingle(inv: InvoiceRecord) {
    const csv = generateCSVForAdvisor([inv], {
      period: null,
      format: "CSV",
      includeLineItems: false,
      includeRecipientData: true,
      filterByVatRate: null,
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.invoiceNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Libro de Facturas
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Registro completo de facturas emitidas — RD 1619/2012
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/fiscal/nueva-factura"
            className="flex h-9 items-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            <Plus size={15} /> Emitir factura manual
          </Link>
          <button
            onClick={exportAll}
            className="flex h-9 items-center gap-2 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
          >
            <Download size={15} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(Number(e.target.value))}
          className="h-9 rounded-lg border border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={quarterFilter}
          onChange={(e) =>
            setQuarterFilter(
              e.target.value === "all"
                ? "all"
                : (Number(e.target.value) as Quarter),
            )
          }
          className="h-9 rounded-lg border border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none"
        >
          <option value="all">Todos los trimestres</option>
          <option value={1}>T1 (Ene-Mar)</option>
          <option value={2}>T2 (Abr-Jun)</option>
          <option value={3}>T3 (Jul-Sep)</option>
          <option value={4}>T4 (Oct-Dic)</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as InvoiceType | "all")}
          className="h-9 rounded-lg border border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none"
        >
          <option value="all">Todos los tipos</option>
          <option value={InvoiceType.COMPLETA}>Completa</option>
          <option value={InvoiceType.SIMPLIFICADA}>Simplificada</option>
          <option value={InvoiceType.RECTIFICATIVA}>Rectificativa</option>
        </select>
        <select
          value={verifactuFilter}
          onChange={(e) =>
            setVerifactuFilter(e.target.value as VerifactuStatus | "all")
          }
          className="h-9 rounded-lg border border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none"
        >
          <option value="all">Todos los estados VeriFactu</option>
          <option value={VerifactuStatus.PENDIENTE}>Pendiente</option>
          <option value={VerifactuStatus.ENVIADA}>Enviada</option>
          <option value={VerifactuStatus.ACEPTADA}>Aceptada</option>
          <option value={VerifactuStatus.RECHAZADA}>Rechazada</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <span className="text-sm font-semibold text-gray-700">
            {filtered.length} facturas
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileText size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-600">No hay facturas</p>
            <p className="mt-1 text-sm text-gray-400">
              Las facturas se generan automáticamente al confirmar pedidos.
              Ajusta los filtros o genera una factura de prueba desde la sección
              de pedidos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs tracking-wide text-gray-500 uppercase">
                  <th
                    className="cursor-pointer px-4 py-3 text-left font-semibold"
                    onClick={() => handleSort("invoiceNumber")}
                  >
                    Nº Factura{" "}
                    <SortIcon
                      k="invoiceNumber"
                      sortKey={sortKey}
                      sortAsc={sortAsc}
                    />
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left font-semibold"
                    onClick={() => handleSort("invoiceDate")}
                  >
                    Fecha{" "}
                    <SortIcon
                      k="invoiceDate"
                      sortKey={sortKey}
                      sortAsc={sortAsc}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold">NIF/CIF</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Base Imp.
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">IVA</th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right font-semibold"
                    onClick={() => handleSort("total")}
                  >
                    Total{" "}
                    <SortIcon k="total" sortKey={sortKey} sortAsc={sortAsc} />
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-center font-semibold">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    VeriFactu
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((inv) => {
                  const recipient = inv.recipient as {
                    name?: string;
                    taxId?: string;
                  };
                  const isExpanded = expandedId === inv.invoiceId;
                  return (
                    <>
                      <tr
                        key={inv.invoiceId}
                        className="transition hover:bg-gray-50"
                      >
                        <td
                          className="cursor-pointer px-4 py-3 font-mono text-xs font-bold text-[#2563eb]"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : inv.invoiceId)
                          }
                        >
                          {inv.invoiceNumber}
                          {isExpanded ? (
                            <ChevronUp size={12} className="ml-1 inline" />
                          ) : (
                            <ChevronDown size={12} className="ml-1 inline" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatDate(inv.invoiceDate)}
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {recipient.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {recipient.taxId ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-800">
                          {inv.totals.totalTaxableBase.toFixed(2)} €
                        </td>
                        <td className="px-4 py-3 text-right text-red-600">
                          {inv.totals.totalVAT.toFixed(2)} €
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          {inv.totals.totalInvoice.toFixed(2)} €
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-600 capitalize">
                          {inv.invoiceType}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {statusBadge(inv.status)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {verifactuBadge(inv.verifactuStatus)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                /* PDF view – not yet implemented */
                              }}
                              className="rounded border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                            >
                              PDF
                            </button>
                            <button
                              onClick={() => exportSingle(inv)}
                              className="rounded border border-[#2563eb]/20 px-2 py-1 text-xs font-semibold text-[#2563eb] hover:bg-blue-50"
                            >
                              CSV
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr
                          key={`${inv.invoiceId}-detail`}
                          className="bg-gray-50"
                        >
                          <td colSpan={11} className="px-6 py-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div>
                                <p className="mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">
                                  Líneas de factura
                                </p>
                                {inv.items.map((item) => (
                                  <div
                                    key={item.lineNumber}
                                    className="flex justify-between py-0.5 text-xs text-gray-700"
                                  >
                                    <span>
                                      {item.quantity}× {item.description}
                                    </span>
                                    <span className="font-semibold">
                                      {item.totalLine.toFixed(2)} €
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div>
                                <p className="mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">
                                  Desglose fiscal
                                </p>
                                {inv.taxBreakdown.map((b) => (
                                  <div
                                    key={b.vatRate}
                                    className="flex justify-between py-0.5 text-xs text-gray-700"
                                  >
                                    <span>
                                      IVA {b.vatRate}% — Base:{" "}
                                      {b.taxableBase.toFixed(2)} €
                                    </span>
                                    <span className="font-semibold">
                                      Cuota: {b.vatAmount.toFixed(2)} €
                                    </span>
                                  </div>
                                ))}
                                {inv.verifactuQR && (
                                  <p className="mt-2 text-xs break-all text-gray-400">
                                    QR: {inv.verifactuQR.slice(0, 80)}…
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
