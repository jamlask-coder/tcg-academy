"use client";
import { useState, useMemo } from "react";
import { Download, Globe, Info } from "lucide-react";
import { loadInvoices } from "@/services/invoiceService";
import type { InvoiceRecord, CompanyData } from "@/types/fiscal";

function formatDate(d: Date | string): string {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

interface EUOperation {
  invoiceId: string;
  invoiceNumber: string;
  date: Date;
  clientName: string;
  euVatNumber: string;
  countryCode: string;
  amount: number;
}

export default function IntracomunitarioPage() {
  const [invoices] = useState<InvoiceRecord[]>(() => loadInvoices());

  const euOperations = useMemo((): EUOperation[] => {
    return invoices
      .filter((inv) => {
        const r = inv.recipient as CompanyData;
        return r.isEU === true && r.countryCode !== "ES";
      })
      .map((inv): EUOperation => {
        const r = inv.recipient as CompanyData;
        return {
          invoiceId: inv.invoiceId,
          invoiceNumber: inv.invoiceNumber,
          date: new Date(inv.invoiceDate),
          clientName: r.name,
          euVatNumber: r.taxId ?? "—",
          countryCode: r.countryCode,
          amount: inv.totals.totalInvoice,
        };
      });
  }, [invoices]);

  const byCountry = useMemo(() => {
    const map = new Map<string, { ops: EUOperation[]; total: number }>();
    for (const op of euOperations) {
      const existing = map.get(op.countryCode);
      if (existing) {
        existing.ops.push(op);
        existing.total += op.amount;
      } else {
        map.set(op.countryCode, { ops: [op], total: op.amount });
      }
    }
    return map;
  }, [euOperations]);

  const grandTotal = useMemo(
    () => euOperations.reduce((s, op) => s + op.amount, 0),
    [euOperations],
  );

  function exportCSV() {
    const headers = [
      "Nº Factura",
      "Fecha",
      "Cliente",
      "NIF UE",
      "País",
      "Importe",
    ];
    const rows = euOperations.map((op) =>
      [
        op.invoiceNumber,
        formatDate(op.date),
        `"${op.clientName}"`,
        op.euVatNumber,
        op.countryCode,
        op.amount.toFixed(2),
      ].join(";"),
    );
    const csv = "\uFEFF" + [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "operaciones_intracomunitarias.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (euOperations.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Operaciones Intracomunitarias
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Modelo 349 — Declaración recapitulativa
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <Globe size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-semibold text-gray-600">
            Sin operaciones intracomunitarias
          </p>
          <div className="mx-auto mt-4 max-w-md rounded-xl border border-blue-100 bg-blue-50 p-4 text-left">
            <div className="flex gap-2">
              <Info size={16} className="mt-0.5 shrink-0 text-blue-600" />
              <p className="text-sm text-blue-800">
                Esta sección muestra las ventas a empresas de la Unión Europea
                (excluida España) con NIF intracomunitario. Estas operaciones
                tributan a IVA 0% por inversión del sujeto pasivo y deben
                declararse en el Modelo 349. Para que aparezcan aquí, el
                destinatario de la factura debe tener{" "}
                <strong>isEU: true</strong> y un código de país distinto a ES.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Operaciones Intracomunitarias
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Modelo 349 — Declaración recapitulativa de operaciones
            intracomunitarias
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex h-9 items-center gap-2 rounded-lg bg-[#1a3a5c] px-4 text-sm font-semibold text-white transition hover:bg-[#15304d]"
        >
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      {/* Note about Modelo 349 */}
      <div className="mb-6 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <Info size={16} className="mt-0.5 shrink-0 text-blue-600" />
        <p className="text-sm text-blue-800">
          Estas operaciones deben declararse en el <strong>Modelo 349</strong>{" "}
          de forma trimestral (o mensual si superan 50.000 €/trimestre). Aplica
          IVA 0% por inversión del sujeto pasivo cuando el destinatario es una
          empresa UE con NIF intracomunitario válido.
        </p>
      </div>

      {/* KPI */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Total operaciones
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {euOperations.length}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Países UE
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {byCountry.size}
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border border-gray-200 bg-white p-5 md:col-span-1">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Total facturado
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {grandTotal.toFixed(2)} €
          </p>
        </div>
      </div>

      {/* Group by country */}
      {Array.from(byCountry.entries()).map(([countryCode, { ops, total }]) => (
        <div
          key={countryCode}
          className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-[#1a3a5c]" />
              <span className="font-bold text-gray-900">
                País: {countryCode}
              </span>
              <span className="text-sm text-gray-500">
                ({ops.length} operaciones)
              </span>
            </div>
            <span className="font-bold text-gray-900">
              {total.toFixed(2)} €
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs tracking-wide text-gray-500 uppercase">
                  <th className="px-4 py-3 text-left font-semibold">
                    Nº Factura
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold">NIF UE</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Importe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ops.map((op) => (
                  <tr key={op.invoiceId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#1a3a5c]">
                      {op.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(op.date)}
                    </td>
                    <td className="px-4 py-3 text-gray-800">{op.clientName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {op.euVatNumber}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {op.amount.toFixed(2)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Grand total */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-right">
        <span className="mr-4 text-sm text-gray-500">Total general</span>
        <span className="text-lg font-bold text-gray-900">
          {grandTotal.toFixed(2)} €
        </span>
      </div>
    </div>
  );
}
