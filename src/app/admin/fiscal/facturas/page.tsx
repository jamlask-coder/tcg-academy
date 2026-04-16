"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Plus,
  Printer,
  Shield,
  Search,
  Filter,
} from "lucide-react";
// ChevronDown, ChevronUp used by SortIcon
import { loadInvoices, createInvoice } from "@/services/invoiceService";
import { printInvoiceWithCSV } from "@/utils/invoiceGenerator";
import type { InvoiceData } from "@/utils/invoiceGenerator";
import type { InvoiceLineItem } from "@/types/fiscal";
import {
  generateCSVForAdvisor,
  filterByPeriod,
  getTaxPeriod,
} from "@/services/taxService";
import type { InvoiceRecord } from "@/types/fiscal";
import { InvoiceStatus, VerifactuStatus, InvoiceType, PaymentMethod } from "@/types/fiscal";
import type { Quarter } from "@/types/tax";
import { ADMIN_ORDERS, ORDER_STORAGE_KEY, type AdminOrder } from "@/data/mockData";
import {
  downloadLibroFacturas,
  downloadVATDetail,
  downloadTripleCheck,
  downloadCuentaResultados,
  downloadResumenClientes,
  downloadResumenZonas,
  downloadResumenPago,
  downloadRectificativas,
  downloadAnomalias,
  downloadDLQ,
  printBatchInvoicesPDF,
  printAuditReportPDF,
} from "@/lib/fiscalExports";
import {
  generateAgingReport,
  exportAgingCSV,
  generateTaxCalendar,
  exportTaxCalendarCSV,
  generateModelo347,
  exportModelo347CSV,
} from "@/accounting/advancedAccounting";

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

function mapPaymentMethod(method: string): PaymentMethod {
  const m = method.toLowerCase();
  if (m.includes("paypal")) return PaymentMethod.PAYPAL;
  if (m.includes("bizum")) return PaymentMethod.BIZUM;
  if (m.includes("transferencia")) return PaymentMethod.TRANSFERENCIA;
  if (m.includes("tienda") || m.includes("efectivo")) return PaymentMethod.EFECTIVO;
  return PaymentMethod.TARJETA;
}

function buildLineItems(order: AdminOrder): InvoiceLineItem[] {
  return order.items.map((item, i) => {
    const priceWithVat = item.price * item.qty;
    const unitWithoutVat = item.price / 1.21;
    const base = unitWithoutVat * item.qty;
    const vat = priceWithVat - base;
    return {
      lineNumber: i + 1,
      productId: String(item.id),
      description: item.name,
      quantity: item.qty,
      unitPrice: Math.round(unitWithoutVat * 100) / 100,
      discount: 0,
      discountAmount: 0,
      taxableBase: Math.round(base * 100) / 100,
      vatRate: 21 as const,
      vatAmount: Math.round(vat * 100) / 100,
      surchargeRate: 0 as const,
      surchargeAmount: 0,
      totalLine: Math.round(priceWithVat * 100) / 100,
    };
  });
}

async function syncPaidOrdersAsInvoices() {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY);
    const orders: AdminOrder[] = raw ? JSON.parse(raw) : ADMIN_ORDERS;
    const existingInvoices = loadInvoices();
    const invoicedOrderIds = new Set(existingInvoices.map((inv) => inv.sourceOrderId).filter(Boolean));

    // Payment status
    const paymentStatus = JSON.parse(localStorage.getItem("tcgacademy_payment_status") ?? "{}");

    // Only create invoices for paid orders (not cancelled/returned, and payment confirmed)
    const paidOrders = orders.filter((o) => {
      if (invoicedOrderIds.has(o.id)) return false;
      if (o.adminStatus === "cancelado" || o.adminStatus === "devolucion") return false;
      const method = o.paymentMethod.toLowerCase();
      const isManual = method.includes("transferencia") || method.includes("tienda") || method.includes("recogida");
      if (isManual && paymentStatus[o.id] !== "cobrado") return false;
      return true;
    });

    for (const order of paidOrders) {
      await createInvoice({
        recipient: {
          name: order.userName,
          countryCode: "ES",
          email: order.userEmail,
          address: { street: order.address, postalCode: "", city: "", province: "", country: "España", countryCode: "ES" },
        },
        items: buildLineItems(order),
        paymentMethod: mapPaymentMethod(order.paymentMethod),
        sourceOrderId: order.id,
        invoiceDate: new Date(order.statusHistory[0]?.date ?? order.date),
      });
    }
  } catch { /* ignore */ }
}

export default function FacturasPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(() => loadInvoices());

  useEffect(() => {
    syncPaidOrdersAsInvoices().then(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInvoices(loadInvoices());
    });
  }, []);
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

  function downloadPDF(inv: InvoiceRecord) {
    const recipient = inv.recipient as { name?: string; taxId?: string; address?: { street?: string; postalCode?: string; city?: string; province?: string; country?: string }; email?: string; phone?: string; isEU?: boolean };
    const addr = recipient.address;
    const issuer = inv.issuer as { name?: string; taxId?: string; address?: { street?: string; postalCode?: string; city?: string; province?: string; country?: string }; email?: string; phone?: string };
    const issuerAddr = issuer.address;
    const data: InvoiceData = {
      invoiceNumber: inv.invoiceNumber,
      date: new Date(inv.invoiceDate).toISOString(),
      paymentMethod: inv.paymentMethod,
      verifactuHash: inv.verifactuHash ?? undefined,
      verifactuQR: inv.verifactuQR ?? undefined,
      verifactuStatus: inv.verifactuStatus ?? undefined,
      issuerName: issuer.name ?? "TCG Academy S.L.",
      issuerCIF: issuer.taxId ?? "B12345678",
      issuerAddress: issuerAddr?.street ?? "Calle Ejemplo 1, Local 4",
      issuerCity: issuerAddr ? `${issuerAddr.postalCode ?? ""} ${issuerAddr.city ?? ""}`.trim() : "28001 Madrid, España",
      issuerPhone: issuer.phone ?? "+34 91 000 00 00",
      issuerEmail: issuer.email ?? "facturacion@tcgacademy.es",
      clientName: recipient.name ?? "—",
      clientCIF: recipient.taxId,
      clientAddress: addr?.street,
      clientCity: addr ? `${addr.postalCode ?? ""} ${addr.city ?? ""}`.trim() : undefined,
      clientProvince: addr?.province,
      clientCountry: addr?.country ?? "España",
      intracomunitario: !!recipient.isEU,
      items: inv.items.map((item) => ({
        name: item.description,
        quantity: item.quantity,
        unitPriceWithVAT: item.totalLine / item.quantity,
        vatRate: item.vatRate,
      })),
    };
    printInvoiceWithCSV(data);
  }

  const [showExportPanel, setShowExportPanel] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Advanced filtered list (client search + amount range)
  const advancedFiltered = useMemo(() => {
    let list = filtered;
    if (clientSearch.trim()) {
      const term = clientSearch.toLowerCase();
      list = list.filter((inv) => {
        const r = inv.recipient as { name?: string; taxId?: string };
        return (
          (r.name ?? "").toLowerCase().includes(term) ||
          (r.taxId ?? "").toLowerCase().includes(term)
        );
      });
    }
    if (amountMin) {
      const min = parseFloat(amountMin);
      if (Number.isFinite(min)) list = list.filter((inv) => inv.totals.totalInvoice >= min);
    }
    if (amountMax) {
      const max = parseFloat(amountMax);
      if (Number.isFinite(max)) list = list.filter((inv) => inv.totals.totalInvoice <= max);
    }
    return list;
  }, [filtered, clientSearch, amountMin, amountMax]);

  const selectedInvoices = useMemo(
    () => advancedFiltered.filter((inv) => selectedIds.has(inv.invoiceId)),
    [advancedFiltered, selectedIds],
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(advancedFiltered.map((inv) => inv.invoiceId)));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  const filterLabel = `${yearFilter}${quarterFilter !== "all" ? `_T${quarterFilter}` : ""}`;

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
            className="flex h-9 items-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-semibold !text-white transition hover:bg-green-700"
          >
            <Plus size={15} /> Emitir factura manual
          </Link>
          <Link
            href="/admin/fiscal/presupuesto"
            className="flex h-9 items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold !text-white transition hover:bg-amber-600"
          >
            <Plus size={15} /> Emitir presupuesto
          </Link>
          <button
            onClick={exportAll}
            className="flex h-9 items-center gap-2 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold !text-white transition hover:bg-[#1d4ed8]"
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

      {/* ── Advanced search: client + amount ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente o NIF..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm focus:border-[#2563eb] focus:outline-none"
          />
        </div>
        <input
          type="number"
          placeholder="Importe mín."
          value={amountMin}
          onChange={(e) => setAmountMin(e.target.value)}
          className="h-9 w-28 rounded-lg border border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none"
        />
        <input
          type="number"
          placeholder="Importe máx."
          value={amountMax}
          onChange={(e) => setAmountMax(e.target.value)}
          className="h-9 w-28 rounded-lg border border-gray-200 px-3 text-sm focus:border-[#2563eb] focus:outline-none"
        />
        <button
          onClick={() => setShowExportPanel(!showExportPanel)}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          <Filter size={14} />
          Exportar avanzado
          <ChevronDown size={14} className={`transition ${showExportPanel ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* ── Export panel ── */}
      {showExportPanel && (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Shield size={16} className="text-[#2563eb]" />
              Herramientas de Exportación Fiscal
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <button onClick={selectAll} className="text-[#2563eb] hover:underline">Seleccionar todas</button>
              <span>·</span>
              <button onClick={selectNone} className="text-[#2563eb] hover:underline">Ninguna</button>
              <span className="ml-2 font-semibold text-gray-700">{selectedIds.size} seleccionadas</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {/* CSV Exports */}
            <button
              onClick={() => downloadLibroFacturas(advancedFiltered, filterLabel)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left text-xs font-semibold text-gray-700 transition hover:border-[#2563eb] hover:bg-blue-50"
            >
              <Download size={14} className="flex-shrink-0 text-[#2563eb]" />
              <div><div>Libro de Facturas</div><div className="font-normal text-gray-400">Art. 63-64 RIVA</div></div>
            </button>
            <button
              onClick={() => downloadVATDetail(advancedFiltered, filterLabel)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left text-xs font-semibold text-gray-700 transition hover:border-[#2563eb] hover:bg-blue-50"
            >
              <Download size={14} className="flex-shrink-0 text-green-600" />
              <div><div>Desglose IVA</div><div className="font-normal text-gray-400">Línea por línea</div></div>
            </button>
            <button
              onClick={() => downloadTripleCheck(advancedFiltered, filterLabel)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left text-xs font-semibold text-gray-700 transition hover:border-[#2563eb] hover:bg-blue-50"
            >
              <Download size={14} className="flex-shrink-0 text-purple-600" />
              <div><div>Triple Conteo</div><div className="font-normal text-gray-400">3 métodos verificación</div></div>
            </button>
            <button
              onClick={() => downloadCuentaResultados(invoices, yearFilter)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left text-xs font-semibold text-gray-700 transition hover:border-[#2563eb] hover:bg-blue-50"
            >
              <Download size={14} className="flex-shrink-0 text-amber-600" />
              <div><div>Cuenta Resultados</div><div className="font-normal text-gray-400">Trimestral + anual</div></div>
            </button>
            <button
              onClick={() => downloadResumenClientes(advancedFiltered, filterLabel)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left text-xs font-semibold text-gray-700 transition hover:border-[#2563eb] hover:bg-blue-50"
            >
              <Download size={14} className="flex-shrink-0 text-teal-600" />
              <div><div>Por Cliente</div><div className="font-normal text-gray-400">Facturación agrupada</div></div>
            </button>
            <button
              onClick={() => downloadResumenZonas(advancedFiltered, filterLabel)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left text-xs font-semibold text-gray-700 transition hover:border-[#2563eb] hover:bg-blue-50"
            >
              <Download size={14} className="flex-shrink-0 text-orange-600" />
              <div><div>Por Zona/Provincia</div><div className="font-normal text-gray-400">Distribución geográfica</div></div>
            </button>
            <button
              onClick={() => downloadResumenPago(advancedFiltered, filterLabel)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left text-xs font-semibold text-gray-700 transition hover:border-[#2563eb] hover:bg-blue-50"
            >
              <Download size={14} className="flex-shrink-0 text-pink-600" />
              <div><div>Por Forma de Pago</div><div className="font-normal text-gray-400">Tarjeta, Bizum, etc.</div></div>
            </button>
            <button
              onClick={() => downloadRectificativas(advancedFiltered, filterLabel)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left text-xs font-semibold text-gray-700 transition hover:border-[#2563eb] hover:bg-blue-50"
            >
              <Download size={14} className="flex-shrink-0 text-red-600" />
              <div><div>Rectificativas</div><div className="font-normal text-gray-400">Devoluciones y anulaciones</div></div>
            </button>

            {/* PDF Exports */}
            <button
              onClick={() => printBatchInvoicesPDF(selectedIds.size > 0 ? selectedInvoices : advancedFiltered)}
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs font-semibold text-gray-700 transition hover:border-amber-400 hover:bg-amber-100"
            >
              <Printer size={14} className="flex-shrink-0 text-amber-600" />
              <div><div>Imprimir PDF lote</div><div className="font-normal text-gray-400">{selectedIds.size > 0 ? `${selectedIds.size} seleccionadas` : `Todas (${advancedFiltered.length})`}</div></div>
            </button>
            <button
              onClick={() => printAuditReportPDF(yearFilter)}
              className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-left text-xs font-semibold text-gray-700 transition hover:border-green-400 hover:bg-green-100"
            >
              <Shield size={14} className="flex-shrink-0 text-green-600" />
              <div><div>Auditoría completa</div><div className="font-normal text-gray-400">PDF con triple conteo</div></div>
            </button>

            {/* System exports */}
            <button
              onClick={downloadAnomalias}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left text-xs font-semibold text-gray-700 transition hover:border-[#2563eb] hover:bg-blue-50"
            >
              <Download size={14} className="flex-shrink-0 text-gray-500" />
              <div><div>Anomalías</div><div className="font-normal text-gray-400">Incidencias detectadas</div></div>
            </button>
            <button
              onClick={downloadDLQ}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left text-xs font-semibold text-gray-700 transition hover:border-[#2563eb] hover:bg-blue-50"
            >
              <Download size={14} className="flex-shrink-0 text-gray-500" />
              <div><div>Ops. Fallidas</div><div className="font-normal text-gray-400">Cola de reintentos</div></div>
            </button>

            {/* Advanced accounting exports */}
            <button
              onClick={() => { const r = generateAgingReport(advancedFiltered); const csv = exportAgingCSV(r); const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `antiguedad_saldos_${filterLabel}.csv`; a.click(); URL.revokeObjectURL(url); }}
              className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 p-3 text-left text-xs font-semibold text-gray-700 transition hover:border-purple-400 hover:bg-purple-100"
            >
              <Download size={14} className="flex-shrink-0 text-purple-600" />
              <div><div>Deudores Morosos</div><div className="font-normal text-gray-400">Aging report (art. 13.1 LIS)</div></div>
            </button>
            <button
              onClick={() => { const cal = generateTaxCalendar(yearFilter); const csv = exportTaxCalendarCSV(cal); const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `calendario_fiscal_${yearFilter}.csv`; a.click(); URL.revokeObjectURL(url); }}
              className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 p-3 text-left text-xs font-semibold text-gray-700 transition hover:border-purple-400 hover:bg-purple-100"
            >
              <Download size={14} className="flex-shrink-0 text-purple-600" />
              <div><div>Calendario Fiscal</div><div className="font-normal text-gray-400">Todos los modelos + plazos</div></div>
            </button>
            <button
              onClick={() => { const m = generateModelo347(invoices, yearFilter); const csv = exportModelo347CSV(m); const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `modelo347_${yearFilter}.csv`; a.click(); URL.revokeObjectURL(url); }}
              className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 p-3 text-left text-xs font-semibold text-gray-700 transition hover:border-purple-400 hover:bg-purple-100"
            >
              <Download size={14} className="flex-shrink-0 text-purple-600" />
              <div><div>Modelo 347</div><div className="font-normal text-gray-400">Terceros &gt;3.005€ (art. 33 RGAT)</div></div>
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {advancedFiltered.length} facturas
            {clientSearch || amountMin || amountMax ? <span className="ml-1 text-xs text-gray-400">(filtrado)</span> : null}
          </span>
          {selectedIds.size > 0 && (
            <span className="text-xs font-semibold text-[#2563eb]">
              {selectedIds.size} seleccionadas
            </span>
          )}
        </div>
        {advancedFiltered.length === 0 ? (
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
                  <th className="w-8 px-2 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === advancedFiltered.length && advancedFiltered.length > 0}
                      onChange={() => selectedIds.size === advancedFiltered.length ? selectNone() : selectAll()}
                      className="accent-[#2563eb]"
                      aria-label="Seleccionar todas"
                    />
                  </th>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {advancedFiltered.map((inv) => {
                  const recipient = inv.recipient as {
                    name?: string;
                    taxId?: string;
                  };
                  return (
                    <tr
                      key={inv.invoiceId}
                      className={`cursor-pointer transition hover:bg-blue-50 ${selectedIds.has(inv.invoiceId) ? "bg-blue-50/50" : ""}`}
                      onClick={() => downloadPDF(inv)}
                      title="Haz clic para descargar PDF"
                    >
                      <td className="w-8 px-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(inv.invoiceId)}
                          onChange={() => toggleSelect(inv.invoiceId)}
                          className="accent-[#2563eb]"
                          aria-label={`Seleccionar ${inv.invoiceNumber}`}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-[#2563eb]">
                        {inv.invoiceNumber}
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
                    </tr>
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
