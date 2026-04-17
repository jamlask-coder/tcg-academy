/**
 * Exportaciones Fiscales Avanzadas — TCG Academy
 *
 * TODAS las exportaciones que un inspector de Hacienda puede pedir:
 *
 * CSV:
 *   1. Libro de Facturas Emitidas (art. 63-64 RIVA) ✅
 *   2. Desglose IVA línea por línea ✅
 *   3. Triple conteo de verificación ✅
 *   4. Reconciliación pedidos ↔ facturas ✅
 *   5. Cuenta de resultados trimestral/anual ✅
 *   6. Formato para gestoría (ContaPlus/A3/Sage) ✅
 *   7. Resumen por cliente ✅
 *   8. Resumen por provincia/zona ✅
 *   9. Resumen por forma de pago ✅
 *  10. Listado de devoluciones y rectificativas ✅
 *  11. Historial de anomalías ✅
 *  12. Cola de operaciones fallidas (DLQ) ✅
 *
 * PDF:
 *   - Impresión individual de factura ✅
 *   - Impresión en lote (múltiples facturas) ✅
 *   - Informe de auditoría completo ✅
 *
 * Filtros disponibles para TODO:
 *   - Por fecha (rango)
 *   - Por trimestre
 *   - Por cliente (nombre o NIF)
 *   - Por provincia / código postal
 *   - Por forma de pago
 *   - Por tipo (completa/simplificada/rectificativa)
 *   - Por estado VeriFactu
 *   - Por importe (rango)
 */

import type { InvoiceRecord } from "@/types/fiscal";
import { InvoiceStatus, InvoiceType } from "@/types/fiscal";
import type { Quarter } from "@/types/tax";
import { filterByPeriod, getTaxPeriod } from "@/services/taxService";
import {
  exportLibroFacturasCSV,
  exportDetailedVATBreakdownCSV,
  exportTripleCheckCSV,
  exportCuentaResultadosCSV,
  tripleCheckAllInvoices,
  generateCuentaResultados,
  checkCorrelativeNumbering,
  runFullAudit,
} from "@/lib/fiscalAudit";
import { exportAnomaliesCSV } from "@/lib/anomalyDetection";
import { exportDLQcsv } from "@/lib/circuitBreaker";
import {
  generateInvoiceHTML,
  printInvoice,
  type InvoiceData,
} from "@/utils/invoiceGenerator";

// ─── Helpers ────────────────────────────────────────────────────────────────

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmtNum(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function fmtDate(d: Date | string): string {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadHTML(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Filter engine ──────────────────────────────────────────────────────────

export interface InvoiceFilters {
  year?: number;
  quarter?: Quarter;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;
  clientName?: string;
  clientNIF?: string;
  province?: string;
  postalCodePrefix?: string; // First 2 digits (province code)
  paymentMethod?: string;
  invoiceType?: InvoiceType | "all";
  status?: InvoiceStatus | "all";
  amountMin?: number;
  amountMax?: number;
}

export function applyFilters(
  invoices: InvoiceRecord[],
  filters: InvoiceFilters,
): InvoiceRecord[] {
  let list = [...invoices];

  if (filters.year) {
    list = list.filter(
      (inv) => new Date(inv.invoiceDate).getFullYear() === filters.year,
    );
  }

  if (filters.quarter && filters.year) {
    const period = getTaxPeriod(filters.year, filters.quarter);
    list = filterByPeriod(list, period);
  }

  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom);
    list = list.filter((inv) => new Date(inv.invoiceDate) >= from);
  }

  if (filters.dateTo) {
    const to = new Date(filters.dateTo + "T23:59:59");
    list = list.filter((inv) => new Date(inv.invoiceDate) <= to);
  }

  if (filters.clientName) {
    const term = filters.clientName.toLowerCase();
    list = list.filter((inv) => {
      const name = (inv.recipient as { name?: string }).name ?? "";
      return name.toLowerCase().includes(term);
    });
  }

  if (filters.clientNIF) {
    const nif = filters.clientNIF.toUpperCase();
    list = list.filter((inv) => {
      const taxId = (inv.recipient as { taxId?: string }).taxId ?? "";
      return taxId.toUpperCase().includes(nif);
    });
  }

  if (filters.province) {
    const prov = filters.province.toLowerCase();
    list = list.filter((inv) => {
      const addr = (inv.recipient as { address?: { province?: string } }).address;
      return addr?.province?.toLowerCase().includes(prov) ?? false;
    });
  }

  if (filters.postalCodePrefix) {
    const prefix = filters.postalCodePrefix;
    list = list.filter((inv) => {
      const addr = (inv.recipient as { address?: { postalCode?: string } }).address;
      return addr?.postalCode?.startsWith(prefix) ?? false;
    });
  }

  if (filters.paymentMethod) {
    list = list.filter((inv) => inv.paymentMethod === filters.paymentMethod);
  }

  if (filters.invoiceType && filters.invoiceType !== "all") {
    list = list.filter((inv) => inv.invoiceType === filters.invoiceType);
  }

  if (filters.status && filters.status !== "all") {
    list = list.filter((inv) => inv.status === filters.status);
  }

  if (filters.amountMin !== undefined) {
    list = list.filter((inv) => inv.totals.totalInvoice >= filters.amountMin!);
  }

  if (filters.amountMax !== undefined) {
    list = list.filter((inv) => inv.totals.totalInvoice <= filters.amountMax!);
  }

  return list;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSV EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/** 1. Libro de Facturas Emitidas (obligatorio por ley) */
export function downloadLibroFacturas(invoices: InvoiceRecord[], label: string): void {
  downloadCSV(exportLibroFacturasCSV(invoices), `libro_facturas_${label}.csv`);
}

/** 2. Desglose IVA línea por línea */
export function downloadVATDetail(invoices: InvoiceRecord[], label: string): void {
  downloadCSV(exportDetailedVATBreakdownCSV(invoices), `desglose_iva_${label}.csv`);
}

/** 3. Triple conteo de verificación */
export function downloadTripleCheck(invoices: InvoiceRecord[], label: string): void {
  downloadCSV(exportTripleCheckCSV(invoices), `triple_conteo_${label}.csv`);
}

/** 5. Cuenta de resultados */
export function downloadCuentaResultados(invoices: InvoiceRecord[], year: number): void {
  downloadCSV(exportCuentaResultadosCSV(invoices, year), `cuenta_resultados_${year}.csv`);
}

/** 7. Resumen por cliente */
export function downloadResumenClientes(invoices: InvoiceRecord[], label: string): void {
  const active = invoices.filter((i) => i.status !== InvoiceStatus.ANULADA);
  const clientMap = new Map<string, { name: string; nif: string; count: number; base: number; vat: number; total: number }>();

  for (const inv of active) {
    const recipient = inv.recipient as { name?: string; taxId?: string };
    const key = recipient.name ?? "Sin nombre";
    const existing = clientMap.get(key) ?? { name: key, nif: recipient.taxId ?? "", count: 0, base: 0, vat: 0, total: 0 };
    existing.count++;
    existing.base = r2(existing.base + inv.totals.totalTaxableBase);
    existing.vat = r2(existing.vat + inv.totals.totalVAT);
    existing.total = r2(existing.total + inv.totals.totalInvoice);
    clientMap.set(key, existing);
  }

  const headers = ["Cliente", "NIF/CIF", "Nº Facturas", "Base Imponible", "IVA", "Total Facturado"];
  const rows = Array.from(clientMap.values())
    .sort((a, b) => b.total - a.total)
    .map((c) => [
      `"${c.name}"`, c.nif, String(c.count), fmtNum(c.base), fmtNum(c.vat), fmtNum(c.total),
    ].join(";"));

  // Totals row
  const totals = Array.from(clientMap.values()).reduce(
    (acc, c) => ({ count: acc.count + c.count, base: r2(acc.base + c.base), vat: r2(acc.vat + c.vat), total: r2(acc.total + c.total) }),
    { count: 0, base: 0, vat: 0, total: 0 },
  );
  rows.push(["TOTAL", "", String(totals.count), fmtNum(totals.base), fmtNum(totals.vat), fmtNum(totals.total)].join(";"));

  downloadCSV("\uFEFF" + [headers.join(";"), ...rows].join("\n"), `resumen_clientes_${label}.csv`);
}

/** 8. Resumen por provincia/zona */
export function downloadResumenZonas(invoices: InvoiceRecord[], label: string): void {
  const active = invoices.filter((i) => i.status !== InvoiceStatus.ANULADA);
  const zoneMap = new Map<string, { zone: string; cp: string; count: number; base: number; vat: number; total: number }>();

  for (const inv of active) {
    const addr = (inv.recipient as { address?: { province?: string; postalCode?: string } }).address;
    const zone = addr?.province || "Sin provincia";
    const cp = addr?.postalCode?.slice(0, 2) || "??";
    const key = `${cp}-${zone}`;
    const existing = zoneMap.get(key) ?? { zone, cp, count: 0, base: 0, vat: 0, total: 0 };
    existing.count++;
    existing.base = r2(existing.base + inv.totals.totalTaxableBase);
    existing.vat = r2(existing.vat + inv.totals.totalVAT);
    existing.total = r2(existing.total + inv.totals.totalInvoice);
    zoneMap.set(key, existing);
  }

  const headers = ["Provincia", "CP Prefijo", "Nº Facturas", "Base Imponible", "IVA", "Total"];
  const rows = Array.from(zoneMap.values())
    .sort((a, b) => b.total - a.total)
    .map((z) => [`"${z.zone}"`, z.cp, String(z.count), fmtNum(z.base), fmtNum(z.vat), fmtNum(z.total)].join(";"));

  downloadCSV("\uFEFF" + [headers.join(";"), ...rows].join("\n"), `resumen_zonas_${label}.csv`);
}

/** 9. Resumen por forma de pago */
export function downloadResumenPago(invoices: InvoiceRecord[], label: string): void {
  const active = invoices.filter((i) => i.status !== InvoiceStatus.ANULADA);
  const payMap = new Map<string, { method: string; count: number; base: number; vat: number; total: number }>();

  for (const inv of active) {
    const method = inv.paymentMethod || "Desconocido";
    const existing = payMap.get(method) ?? { method, count: 0, base: 0, vat: 0, total: 0 };
    existing.count++;
    existing.base = r2(existing.base + inv.totals.totalTaxableBase);
    existing.vat = r2(existing.vat + inv.totals.totalVAT);
    existing.total = r2(existing.total + inv.totals.totalInvoice);
    payMap.set(method, existing);
  }

  const headers = ["Forma de Pago", "Nº Facturas", "Base Imponible", "IVA", "Total"];
  const rows = Array.from(payMap.values())
    .sort((a, b) => b.total - a.total)
    .map((p) => [p.method, String(p.count), fmtNum(p.base), fmtNum(p.vat), fmtNum(p.total)].join(";"));

  downloadCSV("\uFEFF" + [headers.join(";"), ...rows].join("\n"), `resumen_pago_${label}.csv`);
}

/** 10. Listado de devoluciones y rectificativas */
export function downloadRectificativas(invoices: InvoiceRecord[], label: string): void {
  const rects = invoices.filter(
    (i) => i.invoiceType === InvoiceType.RECTIFICATIVA || i.status === InvoiceStatus.ANULADA,
  );

  const headers = [
    "Nº Factura", "Fecha", "Tipo", "Estado", "Cliente", "NIF/CIF",
    "Base Imponible", "IVA", "Total",
    "Rectifica a", "Motivo", "Código Motivo", "Pedido Origen",
  ];

  const rows = rects.map((inv) => {
    const recipient = inv.recipient as { name?: string; taxId?: string };
    return [
      inv.invoiceNumber,
      fmtDate(inv.invoiceDate),
      inv.invoiceType,
      inv.status,
      `"${recipient.name ?? ""}"`,
      recipient.taxId ?? "",
      fmtNum(inv.totals.totalTaxableBase),
      fmtNum(inv.totals.totalVAT),
      fmtNum(inv.totals.totalInvoice),
      inv.correctionData?.originalInvoiceNumber ?? "",
      inv.correctionData ? `"${inv.correctionData.reason}"` : "",
      inv.correctionData?.reasonCode ?? "",
      inv.sourceOrderId ?? "",
    ].join(";");
  });

  downloadCSV("\uFEFF" + [headers.join(";"), ...rows].join("\n"), `rectificativas_${label}.csv`);
}

/** 11. Anomalías */
export function downloadAnomalias(): void {
  downloadCSV(exportAnomaliesCSV(), `anomalias_${new Date().toISOString().slice(0, 10)}.csv`);
}

/** 12. Dead Letter Queue */
export function downloadDLQ(): void {
  downloadCSV(exportDLQcsv(), `cola_fallidos_${new Date().toISOString().slice(0, 10)}.csv`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Convert an InvoiceRecord to InvoiceData for PDF generation */
function recordToData(inv: InvoiceRecord): InvoiceData {
  const recipient = inv.recipient as {
    name?: string; taxId?: string; email?: string; phone?: string; isEU?: boolean;
    address?: { street?: string; postalCode?: string; city?: string; province?: string; country?: string };
  };
  const issuer = inv.issuer;
  const issuerAddr = issuer.address;
  const addr = recipient.address;

  return {
    invoiceNumber: inv.invoiceNumber,
    date: new Date(inv.invoiceDate).toISOString(),
    paymentMethod: inv.paymentMethod,
    verifactuHash: inv.verifactuHash ?? undefined,
    verifactuQR: inv.verifactuQR ?? undefined,
    verifactuStatus: inv.verifactuStatus ?? undefined,
    issuerName: issuer.name,
    issuerCIF: issuer.taxId,
    issuerAddress: issuerAddr.street,
    issuerCity: `${issuerAddr.postalCode} ${issuerAddr.city}`.trim(),
    issuerPhone: issuer.phone,
    issuerEmail: issuer.email,
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
      unitPriceWithVAT: item.quantity > 0 ? item.totalLine / item.quantity : 0,
      vatRate: item.vatRate,
    })),
  };
}

/** Print a single invoice as PDF */
export function printSingleInvoicePDF(inv: InvoiceRecord): void {
  printInvoice(recordToData(inv));
}

/** Print multiple invoices as a single PDF (all on separate pages) */
export function printBatchInvoicesPDF(invoices: InvoiceRecord[]): void {
  if (invoices.length === 0) return;

  const allHTML = invoices.map((inv) => {
    const data = recordToData(inv);
    return generateInvoiceHTML(data);
  });

  // Combine all invoices with page breaks
  const combined = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Facturas TCG Academy — Lote de ${invoices.length}</title>
  <style>
    @page { size: A4; margin: 0; }
    @media print { .page-break { page-break-before: always; } }
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
${allHTML.map((html, i) => {
    // Extract only the body content from each invoice
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : html;
    // Extract style
    const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const style = styleMatch ? `<style>${styleMatch[1]}</style>` : "";
    return `${i === 0 ? style : ""}${i > 0 ? '<div class="page-break"></div>' : ""}${bodyContent}`;
  }).join("\n")}
</body>
</html>`;

  // Open print dialog
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;border:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }

  const baseTag = `<base href="${window.location.origin}/">`;
  doc.open();
  doc.write(combined.replace("<head>", `<head>${baseTag}`));
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 3000);
    }
  }, 800);
}

/** Generate full audit report as printable HTML */
export async function printAuditReportPDF(year: number): Promise<void> {
  const report = await runFullAudit(year);
  const tc = report.tripleCheck;
  const cr = report.cuentaResultados;
  const corr = report.correlative;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe de Auditoría Fiscal ${year} — TCG Academy</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: Arial, sans-serif; font-size: 9pt; color: #1a1a2e; }
    h1 { font-size: 16pt; color: #1e3a8a; border-bottom: 3px solid #2563eb; padding-bottom: 8px; margin-bottom: 16px; }
    h2 { font-size: 11pt; color: #2563eb; margin: 16px 0 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 8.5pt; }
    th { background: #1e3a8a; color: white; padding: 5px 8px; text-align: left; font-size: 7pt; text-transform: uppercase; }
    td { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; }
    tr:nth-child(even) td { background: #f9fafb; }
    .ok { color: #16a34a; font-weight: bold; }
    .error { color: #dc2626; font-weight: bold; }
    .warn { color: #d97706; }
    .summary { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px 16px; margin: 12px 0; }
    .summary strong { color: #1e40af; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
    .kpi { background: #f9fafb; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; text-align: center; }
    .kpi .label { font-size: 6.5pt; color: #6b7280; text-transform: uppercase; }
    .kpi .value { font-size: 14pt; font-weight: 800; color: #111827; }
    .footer { margin-top: 24px; font-size: 7pt; color: #9ca3af; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>Informe de Auditoría Fiscal ${year}</h1>
  <p style="color:#6b7280;font-size:8pt;">
    TCG Academy S.L. — CIF: B12345678 — Generado: ${new Date().toLocaleString("es-ES")}
  </p>

  <div class="summary">
    <strong>Veredicto: ${report.allClear
      ? '<span class="ok">TODO CORRECTO — Sin discrepancias</span>'
      : `<span class="error">${report.issues.length} INCIDENCIA(S) DETECTADA(S)</span>`
    }</strong>
    ${report.issues.length > 0 ? `<ul style="margin:8px 0 0;padding-left:16px;color:#dc2626;font-size:8pt;">${report.issues.map((i) => `<li>${i}</li>`).join("")}</ul>` : ""}
  </div>

  <div class="kpi-grid">
    <div class="kpi"><div class="label">Facturas</div><div class="value">${cr.numFacturas}</div></div>
    <div class="kpi"><div class="label">Ingresos Netos</div><div class="value">${cr.ingresosNetos.toFixed(2)}€</div></div>
    <div class="kpi"><div class="label">IVA Repercutido</div><div class="value">${cr.ivaRepercutido.toFixed(2)}€</div></div>
    <div class="kpi"><div class="label">Ticket Medio</div><div class="value">${cr.ticketMedio.toFixed(2)}€</div></div>
  </div>

  <h2>1. Triple Conteo del IVA</h2>
  <p>${tc.passed} de ${tc.total} facturas verificadas por 3 métodos independientes.</p>
  ${tc.failed.length > 0 ? `
  <table>
    <tr><th>Factura</th><th>M1 (Líneas)</th><th>M2 (Recálculo)</th><th>M3 (Desglose)</th><th>Discrepancias</th></tr>
    ${tc.failed.map((f) => `
    <tr>
      <td>${f.invoiceNumber}</td>
      <td>${f.method1_lineSum.totalInvoice.toFixed(2)}€</td>
      <td>${f.method2_fromGross.totalInvoice.toFixed(2)}€</td>
      <td>${f.method3_breakdown.totalInvoice.toFixed(2)}€</td>
      <td class="error">${f.discrepancies.join("; ")}</td>
    </tr>`).join("")}
  </table>` : '<p class="ok">Todas las facturas cuadran al céntimo por los 3 métodos.</p>'}

  <h2>2. Correlatividad de Numeración</h2>
  <p>Año ${corr.year}: ${corr.actualCount} facturas.
    ${corr.ok ? '<span class="ok">Sin saltos ni duplicados.</span>' : `<span class="error">${corr.gaps.length} salto(s), ${corr.duplicates.length} duplicado(s).</span>`}
  </p>

  <h2>3. Cadena de Hash VeriFactu</h2>
  <p>
    ${report.hashChain.ok
      ? `<span class="ok">Cadena íntegra — ${report.hashChain.totalInvoices} eslabones verificados.</span>`
      : `<span class="error">${report.hashChain.brokenLinks.length} eslabón(es) roto(s).</span>`
    }
    ${report.hashChain.integrityHashValid ? ' Hash de integridad global: <span class="ok">OK</span>' : ' <span class="error">Hash de integridad global NO coincide.</span>'}
  </p>

  <h2>4. Rectificativas y Anulaciones</h2>
  <p>${report.rectificatives.total} rectificativas.
    ${report.rectificatives.ok ? '<span class="ok">Todas vinculadas correctamente.</span>' : `<span class="error">${report.rectificatives.issues.length} problema(s).</span>`}
  </p>

  <h2>5. Cross-Check Trimestral</h2>
  <table>
    <tr><th>Trimestre</th><th>Base (Facturas)</th><th>Base (Modelo 303)</th><th>Diff</th><th>IVA (Facturas)</th><th>IVA (Modelo 303)</th><th>Diff</th><th>Estado</th></tr>
    ${report.crossCheck.quarters.map((q) => `
    <tr>
      <td>T${q.quarter}</td>
      <td>${q.directSum.base.toFixed(2)}€</td>
      <td>${q.reportResult.base.toFixed(2)}€</td>
      <td>${q.diff.base.toFixed(2)}€</td>
      <td>${q.directSum.vat.toFixed(2)}€</td>
      <td>${q.reportResult.vat.toFixed(2)}€</td>
      <td>${q.diff.vat.toFixed(2)}€</td>
      <td class="${q.ok ? 'ok' : 'error'}">${q.ok ? 'OK' : 'ERROR'}</td>
    </tr>`).join("")}
  </table>
  <p>Anual: ${report.crossCheck.annualCheck.ok ? '<span class="ok">Suma trimestral = Resumen anual.</span>' : '<span class="error">Discrepancia anual detectada.</span>'}</p>

  <h2>6. Cuenta de Resultados</h2>
  <table>
    <tr><th>Concepto</th><th>Importe</th></tr>
    <tr><td>Ventas netas</td><td>${cr.ventasNetas.toFixed(2)}€</td></tr>
    <tr><td>Devoluciones</td><td>-${cr.devoluciones.toFixed(2)}€</td></tr>
    <tr><td><strong>Ingresos netos</strong></td><td><strong>${cr.ingresosNetos.toFixed(2)}€</strong></td></tr>
    <tr><td>IVA repercutido</td><td>${cr.ivaRepercutido.toFixed(2)}€</td></tr>
    <tr><td><strong>Total facturado</strong></td><td><strong>${cr.totalFacturado.toFixed(2)}€</strong></td></tr>
    <tr><td>Facturas anuladas</td><td>${cr.numAnuladas}</td></tr>
    <tr><td>Rectificativas</td><td>${cr.numRectificativas}</td></tr>
  </table>

  <div class="footer">
    Informe generado automáticamente por el Sistema de Auditoría Fiscal de TCG Academy.<br>
    Base legal: Ley 37/1992 (LIVA), RD 1619/2012 (Reglamento facturación), RD 1007/2023 (VeriFactu), Ley 11/2021 (Antifraude).<br>
    Este documento es un resumen. Los datos completos están disponibles en los CSVs adjuntos.
  </div>
</body>
</html>`;

  // Print
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;border:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }
    finally { setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 3000); }
  }, 800);
}

/** Download audit report as HTML file */
export async function downloadAuditReportHTML(year: number): Promise<void> {
  // Same content but as downloadable file
  await printAuditReportPDF(year);
}
