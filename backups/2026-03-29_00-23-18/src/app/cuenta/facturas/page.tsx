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

// ─── Generate downloadable invoice HTML ───────────────────────────────────────

function downloadInvoicePDF(inv: Invoice) {
  const { baseTotal, vatTotal, grandTotal } = invoiceTotals(inv);
  const rows = inv.items
    .map((item) => {
      const v = itemVAT(item);
      return `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;text-align:center">${item.qty}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0">${item.description}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;text-align:right">${v.unitPriceNet.toFixed(2)} €</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;text-align:right">${v.totalNet.toFixed(2)} €</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;text-align:center">${v.vatRate}%</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;text-align:right">${v.vatAmount.toFixed(2)} €</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${v.totalGross.toFixed(2)} €</td>
    </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<title>Factura ${inv.id}</title>
<style>body{font-family:sans-serif;margin:0;padding:32px;color:#111}
table{width:100%;border-collapse:collapse}th{background:#1a3a5c;color:white;padding:8px 10px;font-size:12px;text-align:left}
.header{display:flex;justify-content:space-between;margin-bottom:32px}
.totals{margin-top:12px;margin-left:auto;width:300px}
.totals tr td{padding:5px 10px;font-size:13px}
.totals .grand td{font-weight:700;font-size:15px;border-top:2px solid #1a3a5c;padding-top:8px}
</style></head><body>
<div class="header">
  <div>
    <div style="font-size:22px;font-weight:700;color:#1a3a5c">TCG Academy S.L.</div>
    <div style="font-size:12px;color:#555;margin-top:4px">CIF: B12345678<br>
    Av. Gabriel Miró 42, 03710 Calpe, Alicante<br>
    info@tcgacademy.es · tcgacademy.es</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:18px;font-weight:700">FACTURA</div>
    <div style="font-size:13px;color:#555;margin-top:4px">
      Nº: <strong>${inv.id}</strong><br>
      Fecha: ${inv.date}<br>
      Pedido: ${inv.orderId}
    </div>
  </div>
</div>
<div style="margin-bottom:24px;font-size:13px">
  <strong>Cliente:</strong> ${inv.clientName ?? "Cliente TCG Academy"}<br>
  ${inv.clientNif ? `<strong>NIF/CIF:</strong> ${inv.clientNif}<br>` : ""}
  ${inv.clientAddress ? inv.clientAddress : ""}
</div>
<table>
  <thead><tr>
    <th style="width:50px;text-align:center">Cant.</th>
    <th>Descripción</th>
    <th style="text-align:right">P.U. s/IVA</th>
    <th style="text-align:right">Total s/IVA</th>
    <th style="text-align:center">IVA %</th>
    <th style="text-align:right">IVA €</th>
    <th style="text-align:right">Total c/IVA</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<table class="totals"><tbody>
  <tr><td>Base imponible</td><td style="text-align:right">${baseTotal.toFixed(2)} €</td></tr>
  <tr><td>IVA (21%)</td><td style="text-align:right">${vatTotal.toFixed(2)} €</td></tr>
  <tr class="grand"><td>TOTAL FACTURA</td><td style="text-align:right;color:#1a3a5c">${grandTotal.toFixed(2)} €</td></tr>
</tbody></table>
<p style="margin-top:40px;font-size:11px;color:#999;text-align:center">
  TCG Academy S.L. · CIF B12345678 · Inscrita en el Registro Mercantil de Alicante · Régimen general IVA
</p>
</body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${inv.id}.html`;
  a.click();
  URL.revokeObjectURL(url);
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
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
        status === "pagada"
          ? "bg-green-100 text-green-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${status === "pagada" ? "bg-green-500" : "bg-amber-500"}`}
      />
      {status === "pagada" ? "Pagada" : "Pendiente"}
    </span>
  );
}

// ─── Invoice row with full professional table ──────────────────────────────────

function InvoiceCard({ inv }: { inv: Invoice }) {
  const { baseTotal, vatTotal, grandTotal } = invoiceTotals(inv);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-sm transition">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-gray-900 font-mono">{inv.id}</span>
            <StatusBadge status={inv.status} />
          </div>
          <p className="text-xs text-gray-500">
            Pedido:{" "}
            <span className="font-medium text-gray-700">{inv.orderId}</span> ·{" "}
            {inv.date}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xl font-bold text-[#1a3a5c]">
            {grandTotal.toFixed(2)}€
          </span>
          <button
            onClick={() => downloadInvoicePDF(inv)}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#1a3a5c] hover:bg-blue-50 px-3 py-2 rounded-lg transition min-h-[44px]"
          >
            <Download size={15} /> Descargar
          </button>
        </div>
      </div>

      {/* Professional table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left border-b border-gray-100">
              <th className="px-4 py-2.5 font-semibold text-gray-600 text-center w-12">
                Cant.
              </th>
              <th className="px-4 py-2.5 font-semibold text-gray-600">
                Descripción
              </th>
              <th className="px-4 py-2.5 font-semibold text-gray-600 text-right hidden sm:table-cell">
                P.U. s/IVA
              </th>
              <th className="px-4 py-2.5 font-semibold text-gray-600 text-right hidden sm:table-cell">
                Total s/IVA
              </th>
              <th className="px-4 py-2.5 font-semibold text-gray-600 text-center hidden md:table-cell">
                IVA %
              </th>
              <th className="px-4 py-2.5 font-semibold text-gray-600 text-right hidden md:table-cell">
                IVA €
              </th>
              <th className="px-4 py-2.5 font-semibold text-gray-600 text-right">
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
                  <td className="px-4 py-2.5 text-right text-gray-500 hidden sm:table-cell">
                    {v.unitPriceNet.toFixed(2)}€
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500 hidden sm:table-cell">
                    {v.totalNet.toFixed(2)}€
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-500 hidden md:table-cell">
                    {v.vatRate}%
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500 hidden md:table-cell">
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
                className="px-4 py-2.5 text-right hidden sm:table-cell"
              >
                Base imponible:
              </td>
              <td
                colSpan={2}
                className="px-4 py-2.5 text-right hidden sm:table-cell font-medium text-gray-700"
              >
                {baseTotal.toFixed(2)}€
              </td>
              <td className="sm:hidden" />
            </tr>
            <tr className="text-xs text-gray-500">
              <td
                colSpan={4}
                className="px-4 py-1.5 text-right hidden sm:table-cell"
              >
                IVA total:
              </td>
              <td
                colSpan={2}
                className="px-4 py-1.5 text-right hidden sm:table-cell font-medium text-gray-700"
              >
                {vatTotal.toFixed(2)}€
              </td>
              <td className="sm:hidden" />
            </tr>
            <tr>
              <td
                colSpan={5}
                className="px-4 py-2.5 text-right font-bold text-gray-900 hidden sm:table-cell"
              >
                TOTAL FACTURA:
              </td>
              <td
                colSpan={2}
                className="px-4 py-2.5 text-right font-bold text-[#1a3a5c] text-base"
              >
                {grandTotal.toFixed(2)}€
              </td>
            </tr>
          </tfoot>
        </table>
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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt size={22} className="text-[#1a3a5c]" /> Mis Facturas
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Descarga tus facturas con desglose de IVA
          </p>
        </div>
        {isB2B && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="month"
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
              className="h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] text-gray-700"
            />
            <button
              onClick={() =>
                downloadPurchaseReport(filtered, reportPeriod || "completo")
              }
              className="flex items-center gap-1.5 bg-[#1a3a5c] text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-[#15304d] transition min-h-[44px]"
            >
              <FileSpreadsheet size={15} /> Informe de compras (CSV)
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[160px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar factura o pedido..."
            className="w-full h-10 pl-8 pr-8 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
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
            className="h-10 pl-3 pr-8 border border-gray-200 rounded-xl text-sm bg-white appearance-none focus:outline-none focus:border-[#1a3a5c] text-gray-700"
          >
            <option value="">Todos los estados</option>
            <option value="pagada">Pagada</option>
            <option value="pendiente">Pendiente</option>
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>
        <div className="relative">
          <Calendar
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="month"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-10 pl-8 pr-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1a3a5c] text-gray-700"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <Receipt size={48} className="mx-auto text-gray-200 mb-3" />
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
