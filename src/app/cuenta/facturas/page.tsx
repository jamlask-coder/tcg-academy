"use client";
import { useState, useMemo } from "react";
import { Receipt, Download, FileSpreadsheet, Calendar } from "lucide-react";
import { type Invoice, type InvoiceItem } from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";
import { calcVAT } from "@/hooks/usePrice";
import { printInvoiceWithCSV, type InvoiceData } from "@/utils/invoiceGenerator";
import { AccountTabs } from "@/components/cuenta/AccountTabs";
import { SITE_CONFIG } from "@/config/siteConfig";
import { getIssuerAddress } from "@/lib/fiscalAddress";

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
  const issuer = getIssuerAddress();
  return {
    invoiceNumber: inv.id,
    orderId: inv.orderId,
    date: inv.date,
    paymentMethod: "Tarjeta",
    paymentStatus: inv.status === "pagada" ? "paid" : "pending",
    issuerName: SITE_CONFIG.legalName,
    issuerCIF: SITE_CONFIG.cif,
    issuerAddress: issuer.street || SITE_CONFIG.address,
    issuerCity: issuer.cityLine,
    issuerCountry: SITE_CONFIG.country,
    issuerPhone: SITE_CONFIG.phone,
    issuerEmail: SITE_CONFIG.email,
    clientName: inv.clientName ?? "Cliente TCG Academy",
    clientCIF: inv.clientNif,
    clientAddress: inv.clientAddress,
    items: inv.items.map((item) => ({
      name: item.description,
      quantity: item.qty,
      unitPriceWithVAT: item.unitPrice,
      vatRate: item.vatRate ?? SITE_CONFIG.vatRate,
    })),
  };
}

function openInvoicePDF(inv: Invoice) {
  void printInvoiceWithCSV(buildInvoiceData(inv));
}

// ─── Quarter helper ───────────────────────────────────────────────────────────
// Trimestre natural: Q1 ene-mar, Q2 abr-jun, Q3 jul-sep, Q4 oct-dic.
// "Trimestre anterior" = el inmediatamente previo al que contiene `today`.
function getPreviousQuarter(today: Date = new Date()) {
  const m = today.getMonth();
  const currentQ = Math.floor(m / 3);
  let prevQ = currentQ - 1;
  let year = today.getFullYear();
  if (prevQ < 0) {
    prevQ = 3;
    year -= 1;
  }
  const startMonth = prevQ * 3;
  const endMonth = startMonth + 2;
  const pad = (n: number) => String(n + 1).padStart(2, "0");
  return {
    from: `${year}-${pad(startMonth)}`,
    to: `${year}-${pad(endMonth)}`,
  };
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
  const defaultQ = useMemo(() => getPreviousQuarter(), []);
  const [dateFrom, setDateFrom] = useState(defaultQ.from);
  const [dateTo, setDateTo] = useState(defaultQ.to);

  const isB2B =
    user?.role === "mayorista" ||
    user?.role === "tienda" ||
    user?.role === "admin";

  const filtered = useMemo(() => {
    // TODO: conectar con invoiceService.getInvoicesByUser(user.id).
    // Hasta entonces, lista vacía para todos los usuarios.
    const source: Invoice[] = [];
    return source.filter((inv) => {
      const ym = inv.date.slice(0, 7);
      if (dateFrom && ym < dateFrom) return false;
      if (dateTo && ym > dateTo) return false;
      return true;
    });
  }, [dateFrom, dateTo]);

  const periodLabel = dateFrom && dateTo ? `${dateFrom}_${dateTo}` : "completo";
  const showingAll = !dateFrom && !dateTo;

  return (
    <div>
      <AccountTabs group="pedidos" />
      <div className="mb-6 space-y-3">
        {/* Línea 1: Todas + rango de fechas */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className={`h-10 shrink-0 rounded-xl px-4 text-sm font-semibold transition ${
              showingAll
                ? "bg-[#2563eb] text-white"
                : "border border-gray-200 bg-white text-gray-700 hover:border-[#2563eb] hover:text-[#2563eb]"
            }`}
          >
            Todas
          </button>

          <div className="flex min-w-0 items-center gap-1.5">
            <div className="relative min-w-0">
              <Calendar
                size={14}
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-gray-400"
              />
              <input
                type="month"
                aria-label="Desde"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-10 w-full min-w-0 rounded-xl border border-gray-200 pr-2 pl-7 text-sm text-gray-700 focus:border-[#2563eb] focus:outline-none"
              />
            </div>
            <span className="shrink-0 text-sm text-gray-500">a</span>
            <div className="relative min-w-0">
              <Calendar
                size={14}
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-gray-400"
              />
              <input
                type="month"
                aria-label="Hasta"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-10 w-full min-w-0 rounded-xl border border-gray-200 pr-2 pl-7 text-sm text-gray-700 focus:border-[#2563eb] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Línea 2: Informe de compras CSV */}
        {isB2B && (
          <div className="flex">
            <button
              onClick={() => downloadPurchaseReport(filtered, periodLabel)}
              className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] sm:w-auto"
            >
              <FileSpreadsheet size={15} /> Informe de compras (CSV)
            </button>
          </div>
        )}
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
