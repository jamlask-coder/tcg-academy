"use client";
import { useState, useMemo } from "react";
import { Download, Euro, TrendingUp, FileText, BarChart3 } from "lucide-react";
import { loadInvoices } from "@/services/invoiceService";
import {
  generateAnnualReport,
  generateCSVForAdvisor,
} from "@/services/taxService";
import type { InvoiceRecord } from "@/types/fiscal";
import type { AnnualSummary, Quarter } from "@/types/tax";

const QUARTER_LABELS: Record<Quarter, string> = {
  1: "T1 (Ene-Mar)",
  2: "T2 (Abr-Jun)",
  3: "T3 (Jul-Sep)",
  4: "T4 (Oct-Dic)",
};

export default function AnualPage() {
  const [invoices] = useState<InvoiceRecord[]>(() => loadInvoices());
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const report: AnnualSummary = useMemo(
    () => generateAnnualReport(invoices, year),
    [invoices, year],
  );

  function exportCSV() {
    const yearInvoices = invoices.filter(
      (inv) => new Date(inv.invoiceDate).getFullYear() === year,
    );
    const csv = generateCSVForAdvisor(yearInvoices, {
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
    a.download = `modelo390_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpis = [
    {
      label: "Total facturas",
      value: String(report.totalInvoices),
      icon: FileText,
      color: "#2563eb",
    },
    {
      label: "Base imponible total",
      value: `${report.totalTaxableBase.toFixed(2)} €`,
      icon: Euro,
      color: "#16a34a",
    },
    {
      label: "IVA total",
      value: `${report.totalOutputVAT.toFixed(2)} €`,
      icon: TrendingUp,
      color: "#dc2626",
    },
    {
      label: "Resultado anual",
      value: `${report.annualResult.toFixed(2)} €`,
      icon: BarChart3,
      color: "#d97706",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Informe Anual — Modelo 390
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Resumen anual del IVA — Ley 37/1992
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex h-9 items-center gap-2 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
        >
          <Download size={15} /> Exportar CSV para Modelo 390
        </button>
      </div>

      {/* Year selector */}
      <div className="mb-6">
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

      {/* Quarterly breakdown */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-bold text-gray-900">
          Desglose por trimestres — {year}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs tracking-wide text-gray-500 uppercase">
                <th className="pb-3 text-left font-semibold">Trimestre</th>
                <th className="pb-3 text-right font-semibold">Nº Facturas</th>
                <th className="pb-3 text-right font-semibold">
                  Base imponible
                </th>
                <th className="pb-3 text-right font-semibold">
                  IVA repercutido
                </th>
                <th className="pb-3 text-right font-semibold">IVA soportado</th>
                <th className="pb-3 text-right font-semibold">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {report.quarters.map((q) => (
                <tr key={q.quarter} className="border-b border-gray-50">
                  <td className="py-3 font-semibold text-gray-700">
                    {QUARTER_LABELS[q.quarter]}
                  </td>
                  <td className="py-3 text-right text-gray-600">
                    {q.invoiceCount}
                  </td>
                  <td className="py-3 text-right text-gray-800">
                    {q.totalTaxableBase.toFixed(2)} €
                  </td>
                  <td className="py-3 text-right text-red-600">
                    {q.totalOutputVAT.toFixed(2)} €
                  </td>
                  <td className="py-3 text-right text-green-600">
                    {q.totalInputVAT.toFixed(2)} €
                  </td>
                  <td className="py-3 text-right font-bold text-gray-900">
                    {q.result.toFixed(2)} €
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-200 font-bold">
                <td className="pt-3 text-gray-900">TOTAL {year}</td>
                <td className="pt-3 text-right text-gray-900">
                  {report.totalInvoices}
                </td>
                <td className="pt-3 text-right text-gray-900">
                  {report.totalTaxableBase.toFixed(2)} €
                </td>
                <td className="pt-3 text-right text-red-600">
                  {report.totalOutputVAT.toFixed(2)} €
                </td>
                <td className="pt-3 text-right text-green-600">
                  {report.totalInputVAT.toFixed(2)} €
                </td>
                <td className="pt-3 text-right text-gray-900">
                  {report.annualResult.toFixed(2)} €
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* VAT type breakdown */}
      {report.vatBreakdown.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 font-bold text-gray-900">
            Desglose por tipo de IVA — {year}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs tracking-wide text-gray-500 uppercase">
                  <th className="pb-3 text-left font-semibold">Tipo IVA</th>
                  <th className="pb-3 text-right font-semibold">
                    Base imponible
                  </th>
                  <th className="pb-3 text-right font-semibold">Cuota IVA</th>
                  <th className="pb-3 text-right font-semibold">
                    Nº operaciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.vatBreakdown.map((row) => (
                  <tr key={row.vatRate} className="border-b border-gray-50">
                    <td className="py-3 font-semibold text-gray-700">
                      {row.vatRate}%
                    </td>
                    <td className="py-3 text-right text-gray-800">
                      {row.taxableBase.toFixed(2)} €
                    </td>
                    <td className="py-3 text-right text-red-600">
                      {row.vatAmount.toFixed(2)} €
                    </td>
                    <td className="py-3 text-right text-gray-600">
                      {row.invoiceCount}
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
