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
  Info,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import DevolucionModal from "@/components/admin/fiscal/DevolucionModal";
import { DataHub } from "@/lib/dataHub";
// ChevronDown, ChevronUp used by SortIcon
import {
  loadInvoices,
  createInvoice,
  saveInvoice,
  verifyInvoiceNumber,
  migrateInvoiceNumbersIfNeeded,
  type InvoiceMigrationReport,
} from "@/services/invoiceService";
import { TaxIdType } from "@/types/fiscal";
import { validateSpanishNIF } from "@/lib/validations/nif";
import { printInvoiceWithCSV } from "@/utils/invoiceGenerator";
import type { InvoiceData } from "@/utils/invoiceGenerator";
import { SITE_CONFIG } from "@/config/siteConfig";
import { getIssuerAddress } from "@/lib/fiscalAddress";
import type { InvoiceLineItem } from "@/types/fiscal";
import {
  generateCSVForAdvisor,
  filterByPeriod,
  getTaxPeriod,
} from "@/services/taxService";
import type { InvoiceRecord } from "@/types/fiscal";
import { InvoiceStatus, VerifactuStatus, InvoiceType, PaymentMethod } from "@/types/fiscal";
import type { Quarter } from "@/types/tax";
import { ADMIN_ORDERS, type AdminOrder } from "@/data/mockData";
import { readAdminOrdersMerged, getPaymentStatusMap } from "@/lib/orderAdapter";
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
import { formatDateShort as formatDate } from "@/lib/format";

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
  // Usamos el IVA del SITE_CONFIG como fuente única; si cambia el tipo, toda la
  // aplicación debe cambiar consistentemente sin tocar este cálculo.
  const vatDivisor = 1 + SITE_CONFIG.vatRate / 100;
  return order.items.map((item, i) => {
    const priceWithVat = item.price * item.qty;
    const unitWithoutVat = item.price / vatDivisor;
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

export interface SyncResult {
  created: number;
  skippedNoNif: number;
  failed: number;
  errors: string[];
}

async function syncPaidOrdersAsInvoices(): Promise<SyncResult> {
  const result: SyncResult = { created: 0, skippedNoNif: 0, failed: 0, errors: [] };
  try {
    // Merge: incluye pedidos del checkout aunque el mirror al inbox fallara.
    // Así ningún pedido pagado queda sin factura emitida (cumplimiento fiscal).
    const orders = readAdminOrdersMerged(ADMIN_ORDERS);
    const existingInvoices = loadInvoices();
    const invoicedOrderIds = new Set(existingInvoices.map((inv) => inv.sourceOrderId).filter(Boolean));

    // SSOT: estado de cobro leído desde AdminOrder vía orderAdapter (antes: clave paralela).
    const paymentStatus = getPaymentStatusMap();

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
      // Guard: sin NIF válido no se emite factura (Art. 6.1.d RD 1619/2012).
      if (!order.nif) {
        result.skippedNoNif++;
        result.errors.push(`Pedido ${order.id}: sin NIF, factura omitida.`);
        continue;
      }
      const nifCheck = validateSpanishNIF(order.nif);
      if (!nifCheck.valid) {
        result.skippedNoNif++;
        result.errors.push(`Pedido ${order.id}: NIF inválido (${order.nif}), factura omitida.`);
        continue;
      }
      const taxIdType =
        nifCheck.type === "NIE"
          ? TaxIdType.NIE
          : nifCheck.type === "CIF"
            ? TaxIdType.CIF
            : TaxIdType.NIF;
      try {
        const invoice = await createInvoice({
          recipient: {
            name: order.userName,
            taxId: nifCheck.normalized,
            taxIdType,
            countryCode: "ES",
            email: order.userEmail,
            address: { street: order.address, postalCode: "", city: "", province: "", country: "España", countryCode: "ES" },
          },
          items: buildLineItems(order),
          paymentMethod: mapPaymentMethod(order.paymentMethod),
          sourceOrderId: order.id,
          invoiceDate: new Date(order.statusHistory[0]?.date ?? order.date),
        });
        saveInvoice(invoice);
        result.created++;
      } catch (err) {
        result.failed++;
        result.errors.push(
          `Pedido ${order.id}: ${err instanceof Error ? err.message : "error desconocido"}`,
        );
      }
    }
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : "Error en sync");
  }
  return result;
}

export default function FacturasPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(() => loadInvoices());
  const [syncReport, setSyncReport] = useState<SyncResult | null>(null);
  const [migrationReport, setMigrationReport] = useState<InvoiceMigrationReport | null>(null);
  // Factura sobre la que se está emitiendo devolución (null = modal cerrado).
  const [refundingInvoice, setRefundingInvoice] = useState<InvoiceRecord | null>(null);

  // Tras una emisión (rectificativa, sync, etc.) otra pestaña o el propio flujo
  // DevolucionModal publican "invoices" por DataHub → refrescamos la lista.
  useEffect(() => {
    const off = DataHub.on("invoices", () => setInvoices(loadInvoices()));
    return off;
  }, []);

  useEffect(() => {
    (async () => {
      // 1. Migrar numeración al formato v2 (FAC-YYYY-NNNNNXXXXXE) si procede.
      //    Idempotente: no-op si ya está al día.
      const migration = await migrateInvoiceNumbersIfNeeded();
      if (!migration.alreadyUpToDate && (migration.migrated > 0 || migration.errors.length > 0)) {
        setMigrationReport(migration);
      }
      // 2. Sincronizar pedidos pagados a facturas.
      const report = await syncPaidOrdersAsInvoices();
      setInvoices(loadInvoices());
      if (report.created > 0 || report.skippedNoNif > 0 || report.failed > 0) {
        setSyncReport(report);
      }
    })();
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
      // Desempate: si dos facturas comparten la clave primaria (p. ej. mismo
      // día en invoiceDate, mismo total), la más recientemente CREADA manda.
      // Sin esto, al emitir dos facturas el mismo día se quedaba ordenada la
      // primera que se insertó, no la última — contraintuitivo para el admin.
      if (cmp === 0) {
        cmp =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
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
    // Issuer data is ALWAYS sourced from SITE_CONFIG — never from stored records,
    // which may contain stale / legacy data.
    const issuer = getIssuerAddress();
    const issuerAddress = issuer.street || SITE_CONFIG.address;
    const issuerCity = issuer.cityLine;
    const data: InvoiceData = {
      invoiceNumber: inv.invoiceNumber,
      orderId: inv.sourceOrderId ?? undefined,
      date: new Date(inv.invoiceDate).toISOString(),
      paymentMethod: inv.paymentMethod,
      paymentStatus: "paid",
      verifactuHash: inv.verifactuHash ?? undefined,
      verifactuQR: inv.verifactuQR ?? undefined,
      verifactuStatus: inv.verifactuStatus ?? undefined,
      issuerName: SITE_CONFIG.legalName,
      issuerCIF: SITE_CONFIG.cif,
      issuerAddress,
      issuerCity,
      issuerPhone: SITE_CONFIG.phone,
      issuerEmail: SITE_CONFIG.email,
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

  // ── Verificador de numeración ──
  const [showFormatDocs, setShowFormatDocs] = useState(false);
  const [verifierInput, setVerifierInput] = useState("");
  const verifierResult = useMemo(() => {
    const value = verifierInput.trim().toUpperCase();
    if (!value) return null;
    const format = verifyInvoiceNumber(value);
    const existsInBook = invoices.some((inv) => inv.invoiceNumber === value);
    return { format, existsInBook, value };
  }, [verifierInput, invoices]);

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
          <button
            onClick={exportAll}
            className="flex h-9 items-center gap-2 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold !text-white transition hover:bg-[#1d4ed8]"
          >
            <Download size={15} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Migration banner — solo aparece la primera vez tras re-numeración */}
      {migrationReport && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm text-blue-900">
              <strong>Migración de numeración a formato FAC-YYYY-NNNNNXXXXXE:</strong>{" "}
              <span className="mr-2">✓ {migrationReport.migrated} facturas re-numeradas</span>
              <span className="mr-2">↻ {migrationReport.rechained} encadenadas</span>
              {migrationReport.preserved > 0 && (
                <span className="mr-2 text-gray-600">• {migrationReport.preserved} ya en formato</span>
              )}
              {migrationReport.errors.length > 0 && (
                <span className="text-red-700">✗ {migrationReport.errors.length} errores</span>
              )}
              <p className="mt-1 text-xs text-blue-800">
                Las facturas anteriores se han renumerado con el nuevo sistema y la cadena de hashes VeriFactu
                se ha regenerado en orden cronológico. Cada cambio queda en el auditLog de la factura.
              </p>
            </div>
            <button
              onClick={() => setMigrationReport(null)}
              className="text-blue-700 hover:text-blue-900"
              aria-label="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Sync report banner */}
      {syncReport && (syncReport.skippedNoNif > 0 || syncReport.failed > 0 || syncReport.created > 0) && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm text-amber-900">
              <strong>Sincronización de facturas:</strong>{" "}
              {syncReport.created > 0 && <span className="mr-2">✓ {syncReport.created} creadas</span>}
              {syncReport.skippedNoNif > 0 && (
                <span className="mr-2 text-red-700">⚠ {syncReport.skippedNoNif} omitidas sin NIF</span>
              )}
              {syncReport.failed > 0 && (
                <span className="text-red-700">✗ {syncReport.failed} con error</span>
              )}
              {syncReport.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold">Ver detalles ({syncReport.errors.length})</summary>
                  <ul className="mt-1 ml-4 list-disc text-xs">
                    {syncReport.errors.slice(0, 20).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {syncReport.errors.length > 20 && <li>…y {syncReport.errors.length - 20} más</li>}
                  </ul>
                </details>
              )}
            </div>
            <button
              onClick={() => setSyncReport(null)}
              className="text-amber-700 hover:text-amber-900"
              aria-label="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-800">
                        {inv.totals.totalTaxableBase.toFixed(2)}&nbsp;€
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-red-600">
                        {inv.totals.totalVAT.toFixed(2)}&nbsp;€
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-gray-900">
                        {inv.totals.totalInvoice.toFixed(2)}&nbsp;€
                      </td>
                      <td className="px-4 py-3 text-center">
                        {statusBadge(inv.status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {verifactuBadge(inv.verifactuStatus)}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {inv.status !== InvoiceStatus.ANULADA &&
                        inv.invoiceType !== InvoiceType.RECTIFICATIVA ? (
                          <button
                            type="button"
                            onClick={() => setRefundingInvoice(inv)}
                            className="inline-flex items-center justify-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 transition hover:border-red-400 hover:bg-red-100"
                            title="Emitir devolución — genera factura rectificativa"
                            aria-label={`Devolución de ${inv.invoiceNumber}`}
                          >
                            <RotateCcw size={11} />
                            Devolución
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Documentación del formato + verificador interno ── */}
      <div className="mt-8 rounded-2xl border border-gray-200 bg-white">
        <button
          onClick={() => setShowFormatDocs(!showFormatDocs)}
          className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition hover:bg-gray-50"
          aria-expanded={showFormatDocs}
          aria-controls="invoice-format-docs"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Info size={16} className="text-[#2563eb]" />
            Formato de numeración de facturas + verificador interno
          </span>
          <ChevronDown
            size={16}
            className={`text-gray-400 transition ${showFormatDocs ? "rotate-180" : ""}`}
          />
        </button>
        {showFormatDocs && (
          <div id="invoice-format-docs" className="border-t border-gray-100 p-6 text-sm text-gray-700">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* ── Explicación del formato ── */}
              <div>
                <h3 className="mb-3 text-base font-bold text-gray-900">Formato oficial</h3>
                <div className="rounded-lg bg-gray-50 px-4 py-3 font-mono text-sm text-gray-900">
                  FAC-YYYY-NNNNNXXXXXE
                </div>
                <dl className="mt-4 space-y-2 text-xs">
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 font-mono font-bold text-[#2563eb]">FAC</dt>
                    <dd>Serie de facturación. Identifica el libro de ventas general.</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 font-mono font-bold text-[#2563eb]">YYYY</dt>
                    <dd>Año natural de expedición (4 dígitos). La numeración reinicia cada año.</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 font-mono font-bold text-[#2563eb]">NNNNN</dt>
                    <dd>
                      Número correlativo real, 5 dígitos con ceros a la izquierda (00001, 00002, …).
                      <strong> Sin saltos ni huecos</strong> — requisito del art. 6 RD 1619/2012.
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 font-mono font-bold text-[#2563eb]">XXXXX</dt>
                    <dd>
                      <strong>Dígitos de control</strong> de 5 posiciones. Se derivan de (N, año) mediante
                      aritmética modular sobre una terna de números primos secretos:
                      <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 font-mono">
                        (N · P₁ + año · P₂ + P₃) mod P₄
                      </code>.
                      <br />
                      El resultado es <em>determinista</em> (la misma factura produce siempre los mismos
                      dígitos) pero <em>impredecible</em> sin conocer los primos: un tercero no puede
                      fabricar un número de factura válido aunque conozca la serie y el año.
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 font-mono font-bold text-[#2563eb]">E</dt>
                    <dd>
                      Letra de origen — <strong>E</strong> = emitida por la web (canal electrónico).
                      Reservado para futuras series: T = tienda física, B = B2B manual, etc.
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                  <strong>Ejemplo:</strong> la factura nº 525 del año 2026 tendría la forma
                  <code className="mx-1 rounded bg-white px-1 py-0.5 font-mono">FAC-2026-00525XXXXXE</code>
                  donde los XXXXX se calculan automáticamente y son únicos para esa combinación (525, 2026).
                </div>
                <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                  <strong>Por qué este sistema:</strong> cumple la correlatividad exigida por el RIVA, añade
                  un chequeo de integridad propio (detectar una factura falsificada mirando solo el número)
                  y no depende de terceros. El encadenamiento SHA-256 del sistema VeriFactu opera por encima
                  de este formato y sigue siendo la prueba fiscal principal.
                </div>
              </div>

              {/* ── Verificador interno ── */}
              <div>
                <h3 className="mb-3 text-base font-bold text-gray-900">Verificador interno</h3>
                <p className="mb-3 text-xs text-gray-600">
                  Comprueba si un número de factura cumple el formato y los dígitos de control, y si
                  corresponde a una factura realmente emitida en este libro.
                </p>
                <input
                  type="text"
                  placeholder="FAC-2026-00001XXXXXE"
                  value={verifierInput}
                  onChange={(e) => setVerifierInput(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 font-mono text-sm uppercase focus:border-[#2563eb] focus:outline-none"
                  aria-label="Número de factura a verificar"
                />
                {verifierResult && (
                  <div className="mt-4 space-y-2 text-xs">
                    {/* Formato + dígitos de control */}
                    <div
                      className={`flex items-start gap-2 rounded-lg border p-3 ${
                        verifierResult.format.valid
                          ? "border-green-200 bg-green-50 text-green-900"
                          : "border-red-200 bg-red-50 text-red-900"
                      }`}
                    >
                      {verifierResult.format.valid ? (
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
                      ) : (
                        <XCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
                      )}
                      <div>
                        <div className="font-semibold">
                          {verifierResult.format.valid
                            ? verifierResult.format.reason === "legacy"
                              ? "Formato legacy válido"
                              : "Formato + dígitos de control correctos"
                            : "Formato inválido"}
                        </div>
                        {verifierResult.format.reason && (
                          <div className="mt-0.5 opacity-80">Detalle: {verifierResult.format.reason}</div>
                        )}
                      </div>
                    </div>

                    {/* Existencia en el libro */}
                    <div
                      className={`flex items-start gap-2 rounded-lg border p-3 ${
                        verifierResult.existsInBook
                          ? "border-blue-200 bg-blue-50 text-blue-900"
                          : "border-gray-200 bg-gray-50 text-gray-700"
                      }`}
                    >
                      {verifierResult.existsInBook ? (
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-blue-600" />
                      ) : (
                        <XCircle size={16} className="mt-0.5 shrink-0 text-gray-400" />
                      )}
                      <div>
                        <div className="font-semibold">
                          {verifierResult.existsInBook
                            ? "Factura registrada en el libro"
                            : "No existe en el libro"}
                        </div>
                        <div className="mt-0.5 opacity-80">
                          {verifierResult.existsInBook
                            ? "El número aparece en el libro de facturas emitidas."
                            : "El número puede ser válido en formato pero no ha sido emitido aquí."}
                        </div>
                      </div>
                    </div>

                    {/* Veredicto combinado */}
                    <div className="rounded-lg bg-gray-900 p-3 font-mono text-xs text-white">
                      <div className="text-gray-400">Veredicto:</div>
                      <div className="mt-1">
                        {verifierResult.format.valid && verifierResult.existsInBook
                          ? "AUTÉNTICA — formato OK y registrada"
                          : verifierResult.format.valid && !verifierResult.existsInBook
                            ? "SOSPECHOSA — formato OK pero no consta en el libro"
                            : "INVÁLIDA — no puede ser una factura emitida por nosotros"}
                      </div>
                    </div>
                  </div>
                )}
                <p className="mt-4 text-[11px] leading-relaxed text-gray-500">
                  Este verificador es una comprobación interna. La validación oficial ante la AEAT
                  (una vez VeriFactu esté en producción) se realiza mediante el código QR de cada
                  factura, que apunta a la sede electrónica.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de devolución — se abre desde la fila de cada factura. Emite
          rectificativa + reembolso en un solo paso. */}
      {refundingInvoice && (
        <DevolucionModal
          invoice={refundingInvoice}
          onClose={() => setRefundingInvoice(null)}
          onSuccess={() => setInvoices(loadInvoices())}
        />
      )}
    </div>
  );
}
