"use client";
import { useState, useMemo } from "react";
import {
  Receipt,
  Download,
  Search,
  ChevronDown,
  X,
  FileSpreadsheet,
  Calendar,
} from "lucide-react";
import { MOCK_INVOICES, type Invoice, type InvoiceItem } from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";
import { calcVAT } from "@/hooks/usePrice";
import { printInvoiceWithCSV, type InvoiceData } from "@/utils/invoiceGenerator";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function itemVAT(item: InvoiceItem) {
  const rate = item.vatRate ?? 21;
  const { priceWithoutVAT, vatAmount } = calcVAT(item.unitPrice, rate);
  return {
    unitPriceNet: priceWithoutVAT,
    totalNet: priceWithoutVAT * item.qty,
    vatRate: rate,
    vatAmount: vatAmount * item.qty,
    totalGross: item.total,
  };
}

function invoiceTotals(inv: Invoice) {
  const rows = inv.items.map(itemVAT);
  const baseTotal = rows.reduce((s, r) => s + r.totalNet, 0);
  const vatTotal = rows.reduce((s, r) => s + r.vatAmount, 0);
  return { baseTotal, vatTotal, grandTotal: inv.total };
}

// ─── Build InvoiceData from mock invoice and open professional PDF ─────────────

function buildInvoiceData(inv: Invoice): InvoiceData {
  return {
    invoiceNumber: inv.id,
    date: inv.date,
    paymentMethod: "Tarjeta",
    issuerName: "TCG Academy S.L.",
    issuerCIF: "B12345678",
    issuerAddress: "Av. Gabriel Miró 42, Local 3",
    issuerCity: "03710 Calpe, Alicante",
    issuerPhone: "+34 965 830 000",
    issuerEmail: "facturacion@tcgacademy.es",
    clientName: inv.clientName ?? "Cliente TCG Academy",
    clientCIF: inv.clientNif,
    clientAddress: inv.clientAddress,
    items: inv.items.map((item) => ({
      name: item.description,
      quantity: item.qty,
      unitPriceWithVAT: item.unitPrice,
      vatRate: item.vatRate ?? 21,
    })),
  };
}

function openInvoicePDF(inv: Invoice) {
  void printInvoiceWithCSV(buildInvoiceData(inv));
}

// ─── Generate purchase report CSV ─────────────────────────────────────────────

function downloadPurchaseReport(invoices: Invoice[], period: string) {
  const lines = [
    "Factura;Pedido;Fecha;Descripcion;Cant.;P.U. s/IVA;Total s/IVA;IVA %;IVA €;Total c/IVA",
    ...invoices.flatMap((inv) =>
      inv.items.map((item) => {
        const v = itemVAT(item);
        return [
          inv.id,
          inv.orderId,
          inv.date,
          `"${item.description}"`,
          item.qty,
          v.unitPriceNet.toFixed(2),
          v.totalNet.toFixed(2),
          `${v.vatRate}%`,
          v.vatAmount.toFixed(2),
          v.totalGross.toFixed(2),
        ].join(";");
      }),
    ),
  ].join("\n");

  const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `informe-compras-${period}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Invoice["status"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
        status === "pagada"
          ? "bg-green-100 text-green-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${status === "pagada" ? "bg-green-500" : "bg-amber-500"}`}
      />
      {status === "pagada" ? "Pagada" : "Pendiente"}
    </span>
  );
}

// ─── Invoice row with full professional table ──────────────────────────────────

function InvoiceCard({ inv }: { inv: Invoice }) {
  const { baseTotal, vatTotal, grandTotal } = invoiceTotals(inv);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-mono font-bold text-gray-900">{inv.id}</span>
            <StatusBadge status={inv.status} />
          </div>
          <p className="text-xs text-gray-500">
            Pedido:{" "}
            <span className="font-medium text-gray-700">{inv.orderId}</span> ·{" "}
            {inv.date}
          </p>
        </div>
        <button
          onClick={() => openInvoicePDF(inv)}
          className="flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#2563eb] transition hover:bg-blue-50"
        >
          <Download size={15} /> Imprimir / PDF
        </button>
      </div>

      {/* Professional table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="w-12 px-4 py-2.5 text-center font-semibold text-gray-600">
                Cant.
              </th>
              <th className="px-4 py-2.5 font-semibold text-gray-600">
                Descripción
              </th>
              <th className="hidden px-4 py-2.5 text-right font-semibold text-gray-600 sm:table-cell">
                P.U. s/IVA
              </th>
              <th className="hidden px-4 py-2.5 text-right font-semibold text-gray-600 sm:table-cell">
                Total s/IVA
              </th>
              <th className="hidden px-4 py-2.5 text-center font-semibold text-gray-600 md:table-cell">
                IVA %
              </th>
              <th className="hidden px-4 py-2.5 text-right font-semibold text-gray-600 md:table-cell">
                IVA €
              </th>
              <th className="px-4 py-2.5 text-right font-semibold text-gray-600">
                Total c/IVA
              </th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((item, i) => {
              const v = itemVAT(item);
              return (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 text-center text-gray-500">
                    {item.qty}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">
                    {item.description}
                  </td>
                  <td className="hidden px-4 py-2.5 text-right text-gray-500 sm:table-cell">
                    {v.unitPriceNet.toFixed(2)}€
                  </td>
                  <td className="hidden px-4 py-2.5 text-right text-gray-500 sm:table-cell">
                    {v.totalNet.toFixed(2)}€
                  </td>
                  <td className="hidden px-4 py-2.5 text-center text-gray-500 md:table-cell">
                    {v.vatRate}%
                  </td>
                  <td className="hidden px-4 py-2.5 text-right text-gray-500 md:table-cell">
                    {v.vatAmount.toFixed(2)}€
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                    {v.totalGross.toFixed(2)}€
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-gray-200 bg-gray-50">
            <tr className="text-xs text-gray-500">
              <td
                colSpan={4}
                className="hidden px-4 py-2.5 text-right sm:table-cell"
              >
                Base imponible:
              </td>
              <td
                colSpan={2}
                className="hidden px-4 py-2.5 text-right font-medium text-gray-700 sm:table-cell"
              >
                {baseTotal.toFixed(2)}€
              </td>
              <td className="sm:hidden" />
            </tr>
            <tr className="text-xs text-gray-500">
              <td
                colSpan={4}
                className="hidden px-4 py-1.5 text-right sm:table-cell"
              >
                IVA total:
              </td>
              <td
                colSpan={2}
                className="hidden px-4 py-1.5 text-right font-medium text-gray-700 sm:table-cell"
              >
                {vatTotal.toFixed(2)}€
              </td>
              <td className="sm:hidden" />
            </tr>
            <tr>
              <td
                colSpan={5}
                className="hidden px-4 py-2.5 text-right font-bold text-gray-900 sm:table-cell"
              >
                TOTAL FACTURA:
              </td>
              <td
                colSpan={2}
                className="px-4 py-2.5 text-right text-base font-bold text-[#2563eb]"
              >
                {grandTotal.toFixed(2)}€
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Bottom totals bar */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
        <div className="px-5 py-4 text-center">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Base imponible</p>
          <p className="text-base font-bold text-gray-700">{baseTotal.toFixed(2)}€</p>
        </div>
        <div className="px-5 py-4 text-center">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">IVA</p>
          <p className="text-base font-bold text-gray-700">{vatTotal.toFixed(2)}€</p>
        </div>
        <div className="px-5 py-4 text-center">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Total factura</p>
          <p className="text-2xl font-black text-[#2563eb] leading-none">{grandTotal.toFixed(2)}€</p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FacturasPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "pagada" | "pendiente">(
    "",
  );
  const [dateFilter, setDateFilter] = useState("");
  const [reportPeriod, setReportPeriod] = useState("");

  const isB2B =
    user?.role === "mayorista" ||
    user?.role === "tienda" ||
    user?.role === "admin";

  const filtered = useMemo(() => {
    return MOCK_INVOICES.filter((inv) => {
      if (statusFilter && inv.status !== statusFilter) return false;
      if (dateFilter && !inv.date.startsWith(dateFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          inv.id.toLowerCase().includes(q) ||
          inv.orderId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, statusFilter, dateFilter]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Receipt size={22} className="text-[#2563eb]" /> Mis Facturas
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Descarga tus facturas con desglose de IVA
          </p>
        </div>
        {isB2B && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 px-3 text-sm text-gray-700 focus:border-[#2563eb] focus:outline-none"
            />
            <button
              onClick={() =>
                downloadPurchaseReport(filtered, reportPeriod || "completo")
              }
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
            >
              <FileSpreadsheet size={15} /> Informe de compras (CSV)
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-[160px] flex-1">
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar factura o pedido..."
            className="h-10 w-full rounded-xl border border-gray-200 pr-8 pl-8 text-sm transition focus:border-[#2563eb] focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
            className="h-10 appearance-none rounded-xl border border-gray-200 bg-white pr-8 pl-3 text-sm text-gray-700 focus:border-[#2563eb] focus:outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="pagada">Pagada</option>
            <option value="pendiente">Pendiente</option>
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-gray-400"
          />
        </div>
        <div className="relative">
          <Calendar
            size={14}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
          />
          <input
            type="month"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-10 rounded-xl border border-gray-200 pr-3 pl-8 text-sm text-gray-700 focus:border-[#2563eb] focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <Receipt size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500">No se encontraron facturas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((inv) => (
            <InvoiceCard key={inv.id} inv={inv} />
          ))}
        </div>
      )}
    </div>
  );
}
