"use client";
import { useState, useMemo } from "react";
import { Download, Euro, TrendingUp, FileText, Calendar } from "lucide-react";
import { loadInvoices } from "@/services/invoiceService";
import {
  generateQuarterlyReport,
  generateCSVForAdvisor,
  getTaxPeriod,
} from "@/services/taxService";
import type { InvoiceRecord } from "@/types/fiscal";
import type { TaxSummary, Quarter } from "@/types/tax";

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function TrimestralPage() {
  const [invoices] = useState<InvoiceRecord[]>(() => loadInvoices());
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [quarter, setQuarter] = useState<Quarter>(
    Math.ceil((new Date().getMonth() + 1) / 3) as Quarter,
  );

  const report: TaxSummary = useMemo(
    () => generateQuarterlyReport(invoices, year, quarter),
    [invoices, year, quarter],
  );

  const period = useMemo(() => getTaxPeriod(year, quarter), [year, quarter]);

  const quarterLabels: Record<Quarter, string> = {
    1: "T1 (Ene-Mar)",
    2: "T2 (Abr-Jun)",
    3: "T3 (Jul-Sep)",
    4: "T4 (Oct-Dic)",
  };

  function exportCSV() {
    const csv = generateCSVForAdvisor(invoices, {
      period,
      format: "CSV",
      includeLineItems: false,
      includeRecipientData: true,
      filterByVatRate: null,
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `modelo303_${year}_T${quarter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpis = [
    {
      label: "Total facturado",
      value: `${report.totalInvoiced.toFixed(2)} €`,
      icon: FileText,
      color: "#2563eb",
    },
    {
      label: "Base imponible",
      value: `${report.totalTaxableBase.toFixed(2)} €`,
      icon: Euro,
      color: "#16a34a",
    },
    {
      label: "IVA repercutido",
      value: `${report.totalOutputVAT.toFixed(2)} €`,
      icon: TrendingUp,
      color: "#dc2626",
    },
    {
      label: "Resultado (a ingresar)",
      value: `${report.result.toFixed(2)} €`,
      icon: Calendar,
      color: "#d97706",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Informe Trimestral — Modelo 303
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Autoliquidación del IVA — Ley 37/1992
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex h-9 items-center gap-2 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
        >
          <Download size={15} /> Exportar CSV para Modelo 303
        </button>
      </div>

      {/* Selectors */}
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="h-9 rounded-lg border border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={quarter}
          onChange={(e) => setQuarter(Number(e.target.value) as Quarter)}
          className="h-9 rounded-lg border border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none"
        >
          <option value={1}>T1 (Ene-Mar)</option>
          <option value={2}>T2 (Abr-Jun)</option>
          <option value={3}>T3 (Jul-Sep)</option>
          <option value={4}>T4 (Oct-Dic)</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-200 bg-white p-5"
          >
            <div className="mb-2 flex items-center gap-2">
              <Icon size={16} style={{ color }} />
              <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                {label}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* VAT Breakdown */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-bold text-gray-900">
          Desglose IVA repercutido — {quarterLabels[quarter]} {year}
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({report.invoiceCount} facturas)
          </span>
        </h2>
        {report.outputVAT.length === 0 ? (
          <p className="text-sm text-gray-400">
            Sin operaciones en este período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs tracking-wide text-gray-500 uppercase">
                  <th className="pb-3 text-left font-semibold">Tipo IVA</th>
                  <th className="pb-3 text-right font-semibold">
                    Base imponible
                  </th>
                  <th className="pb-3 text-right font-semibold">Cuota IVA</th>
                  <th className="pb-3 text-right font-semibold">Nº Facturas</th>
                </tr>
              </thead>
              <tbody>
                {report.outputVAT.map((row) => (
                  <tr key={row.vatRate} className="border-b border-gray-50">
                    <td className="py-3 font-semibold text-gray-700">
                      {row.vatRate}% (
                      {"general,reducido,superreducido,exento".split(",")[
                        [21, 10, 4, 0].indexOf(row.vatRate)
                      ] ?? ""}
                      )
                    </td>
                    <td className="py-3 text-right text-gray-800">
                      {row.taxableBase.toFixed(2)} €
                    </td>
                    <td className="py-3 text-right font-medium text-red-600">
                      {row.vatAmount.toFixed(2)} €
                    </td>
                    <td className="py-3 text-right text-gray-600">
                      {row.invoiceCount}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200 font-bold">
                  <td className="pt-3 text-gray-900">TOTAL</td>
                  <td className="pt-3 text-right text-gray-900">
                    {report.totalTaxableBase.toFixed(2)} €
                  </td>
                  <td className="pt-3 text-right text-red-600">
                    {report.totalOutputVAT.toFixed(2)} €
                  </td>
                  <td className="pt-3 text-right text-gray-900">
                    {report.invoiceCount}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Intra-community */}
      {report.intraCommunityAmount > 0 && (
        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="mb-2 font-bold text-blue-900">
            Operaciones intracomunitarias
          </h2>
          <p className="text-sm text-blue-800">
            Importe total:{" "}
            <strong>{report.intraCommunityAmount.toFixed(2)} €</strong> — IVA 0%
            por inversión del sujeto pasivo (Modelo 349).
          </p>
        </div>
      )}

      {/* Due date & IVA soportado note */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-2 font-bold text-gray-900">Próximo vencimiento</h2>
          <p className="text-sm text-gray-600">
            Plazo presentación {quarterLabels[quarter]}:{" "}
            <strong className="text-[#2563eb]">
              {formatDate(period.dueDate)}
            </strong>
          </p>
          <p className="mt-1 text-xs text-gray-400">
            20 días naturales tras el final del trimestre.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6">
          <h2 className="mb-2 font-bold text-amber-900">IVA soportado</h2>
          <p className="text-sm text-amber-800">
            IVA soportado (compras) pendiente de implementación cuando se
            registren facturas de proveedores. El resultado actual solo refleja
            el IVA repercutido.
          </p>
        </div>
      </div>
    </div>
  );
}
