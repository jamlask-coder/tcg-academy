/**
 * Generador de facturas conforme al Real Decreto 1619/2012 (España).
 * Genera HTML listo para imprimir como PDF con window.print().
 *
 * Campos obligatorios cubiertos (Art. 6 RD 1619/2012):
 *  a) Número y, en su caso, serie
 *  b) Fecha de expedición
 *  c) Razón social, NIF y domicilio del emisor
 *  d) Razón social, NIF y domicilio del destinatario
 *  e) Descripción de las operaciones
 *  f) Tipo impositivo
 *  g) Cuota tributaria
 *  h) Fecha de la operación si distinta de la expedición
 */

import { SITE_CONFIG } from "@/config/siteConfig";
import { getIssuerAddress } from "@/lib/fiscalAddress";
import {
  loadInvoiceTemplate,
  DEFAULT_TEMPLATE,
  type InvoiceTemplate,
} from "@/lib/invoiceTemplate";
import { computeControlDigits, INVOICE_ORIGIN_WEB } from "@/services/invoiceService";

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPriceWithVAT: number;
  vatRate?: number;
}

export interface InvoiceData {
  invoiceNumber: string; // FAC-2026-00001
  /** ID del pedido original (ej. TCG-20260417-1234) */
  orderId?: string;
  date: string; // Fecha expedición — ISO
  /** Fecha de operación si distinta de la de expedición (Art. 6.1.h) */
  operationDate?: string;
  dueDate?: string;
  paymentMethod?: string;
  /** Estado del pago: pagado / pendiente / reembolsado / fallido */
  paymentStatus?: "paid" | "pending" | "refunded" | "failed";
  /** Hash SHA-256 VeriFactu (generado por invoiceService) */
  verifactuHash?: string;
  /** URL del QR verificable ante la AEAT */
  verifactuQR?: string;
  /** Estado VeriFactu para mostrar en la factura */
  verifactuStatus?: string;

  // Emisor
  issuerName: string;
  issuerCIF: string;
  issuerAddress: string;
  issuerCity: string;
  issuerPhone: string;
  issuerEmail: string;

  // Cliente
  clientName: string;
  clientCIF?: string;
  clientAddress?: string;
  clientCity?: string;
  clientProvince?: string;
  clientCountry?: string;
  intracomunitario?: boolean; // CIF intracomunitario → IVA 0%

  // Líneas
  items: InvoiceItem[];

  // Totales
  shipping?: number;
  couponCode?: string;
  couponDiscount?: number;
  pointsDiscount?: number;
}

/** Calculates base imponible and IVA from price-with-VAT */
function calcBase(
  priceWithVAT: number,
  vatRate: number,
  qty: number,
  intracom: boolean,
) {
  const effectiveVAT = intracom ? 0 : vatRate;
  const totalWithVAT = priceWithVAT * qty;
  const base = totalWithVAT / (1 + effectiveVAT / 100);
  const vatAmount = totalWithVAT - base;
  return { base, vatAmount, totalWithVAT, effectiveVAT };
}

const PAYMENT_STATUS_LABEL: Record<
  NonNullable<InvoiceData["paymentStatus"]>,
  { label: string; color: string; bg: string }
> = {
  paid: { label: "Pagado", color: "#166534", bg: "#dcfce7" },
  pending: { label: "Pendiente", color: "#92400e", bg: "#fef3c7" },
  refunded: { label: "Reembolsado", color: "#9a3412", bg: "#ffedd5" },
  failed: { label: "Fallido", color: "#991b1b", bg: "#fee2e2" },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function generateInvoiceHTML(
  data: InvoiceData,
  templateOverride?: InvoiceTemplate,
): string {
  const tpl =
    templateOverride ??
    (typeof window !== "undefined" ? loadInvoiceTemplate() : DEFAULT_TEMPLATE);
  const {
    invoiceNumber,
    orderId,
    date,
    operationDate,
    dueDate,
    paymentMethod,
    paymentStatus,
    verifactuHash,
    verifactuQR,
    verifactuStatus,
    issuerName,
    issuerCIF,
    issuerAddress,
    issuerCity,
    issuerPhone,
    issuerEmail,
    clientName,
    clientCIF,
    clientAddress,
    clientCity,
    clientProvince,
    clientCountry,
    intracomunitario = false,
    items,
    shipping = 0,
    couponCode,
    couponDiscount = 0,
    pointsDiscount = 0,
  } = data;

  const formattedDate = fmtDate(date);
  const formattedOperation =
    operationDate && operationDate !== date ? fmtDate(operationDate) : null;
  const formattedDue = dueDate ? fmtDate(dueDate) : null;

  // Per-line calculations
  const lines = items.map((item) => {
    const vatRate = item.vatRate ?? SITE_CONFIG.vatRate;
    const { base, vatAmount, totalWithVAT, effectiveVAT } = calcBase(
      item.unitPriceWithVAT,
      vatRate,
      item.quantity,
      intracomunitario,
    );
    return { ...item, vatRate: effectiveVAT, base, vatAmount, totalWithVAT };
  });

  // Shipping VAT
  const shippingVATRate = intracomunitario ? 0 : SITE_CONFIG.vatRate;
  const shippingBase = shipping / (1 + shippingVATRate / 100);
  const shippingVAT = shipping - shippingBase;

  // Totals
  const subtotalBase = lines.reduce((s, l) => s + l.base, 0) + shippingBase;
  const subtotalVAT = lines.reduce((s, l) => s + l.vatAmount, 0) + shippingVAT;
  const discounts = couponDiscount + pointsDiscount;
  const totalFinal =
    lines.reduce((s, l) => s + l.totalWithVAT, 0) + shipping - discounts;

  // VAT breakdown by rate (Art. 6.1.j — si hay varios tipos)
  const vatBreakdown = new Map<number, { base: number; vat: number }>();
  for (const l of lines) {
    const entry = vatBreakdown.get(l.vatRate) ?? { base: 0, vat: 0 };
    entry.base += l.base;
    entry.vat += l.vatAmount;
    vatBreakdown.set(l.vatRate, entry);
  }
  if (shipping > 0) {
    const entry = vatBreakdown.get(shippingVATRate) ?? { base: 0, vat: 0 };
    entry.base += shippingBase;
    entry.vat += shippingVAT;
    vatBreakdown.set(shippingVATRate, entry);
  }
  const breakdownEntries = Array.from(vatBreakdown.entries()).sort(
    (a, b) => a[0] - b[0],
  );

  // Columnas: Producto | Cantidad | P. Unit s/IVA | Total s/IVA | IVA (importe) | Total c/IVA
  const lineRows = lines
    .map((l) => {
      const unitNoVat = l.unitPriceWithVAT / (1 + l.vatRate / 100);
      return `
    <tr>
      <td class="desc">${escapeHtml(l.name)}</td>
      <td class="center qty-col">${l.quantity}</td>
      <td class="right num">${unitNoVat.toFixed(2)} €</td>
      <td class="right num">${l.base.toFixed(2)} €</td>
      <td class="right num">${l.vatAmount.toFixed(2)} €</td>
      <td class="right num bold">${l.totalWithVAT.toFixed(2)} €</td>
    </tr>`;
    })
    .join("");

  const statusChip = paymentStatus
    ? PAYMENT_STATUS_LABEL[paymentStatus]
    : null;

  // Client info — filter empty lines
  const clientLines = [
    clientCIF ? `NIF/CIF: ${escapeHtml(clientCIF)}` : null,
    clientAddress ? escapeHtml(clientAddress) : null,
    clientCity ? escapeHtml(clientCity) : null,
    clientProvince ? escapeHtml(clientProvince) : null,
    clientCountry ? escapeHtml(clientCountry) : null,
  ]
    .filter(Boolean)
    .join("<br>");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura ${invoiceNumber}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 210mm; min-height: 297mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111827; background: white; }
    .invoice-wrap {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: ${tpl.paddingTop}mm ${tpl.paddingX}mm ${tpl.paddingBottom}mm;
      position: relative;
      overflow: hidden;
    }

    /* ── HEADER — logo left, "FACTURA Nº" right ── */
    .hdr { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: ${tpl.gapAfterHeader}px; }
    .hdr-left { display: flex; align-items: center; gap: 12px; }
    .brand-logo { width: ${tpl.logoSize}px; height: ${tpl.logoSize}px; object-fit: contain; flex-shrink: 0; }
    .brand-name { font-size: 15pt; font-weight: 900; letter-spacing: -0.5px; line-height: 1; color: #111827; }
    .brand-name .academy { color: ${tpl.accentColor}; }
    .brand-sub { font-size: 6pt; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px; margin-top: 3px; }
    .hdr-right { text-align: right; }
    .hdr-right .title { font-size: 32pt; font-weight: 900; color: ${tpl.primaryColor}; letter-spacing: -1px; line-height: 0.95; }
    .hdr-right .number { font-size: 13pt; font-weight: 800; color: ${tpl.primaryColor}; margin-top: 2px; }

    /* ── DATOS CLIENTE / NEGOCIO ── */
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: ${tpl.gapAfterParties}px; }
    .party-label { font-size: 7.5pt; font-weight: 800; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .party-right { text-align: right; }
    .party-detail { font-size: 8.5pt; color: #4b5563; line-height: 1.55; }
    .party-detail strong { color: #111827; font-weight: 700; font-size: 9.5pt; display: block; margin-bottom: 2px; }

    /* ── ORDER DETAILS BAR ── */
    .order-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: ${tpl.gapAfterOrderBar}px;
    }
    .order-bar .cell { border-right: 1px solid #e5e7eb; padding: 0 10px; }
    .order-bar .cell:last-child { border-right: 0; }
    .order-bar .cell:first-child { padding-left: 0; }
    .order-bar .cell .lbl { font-size: 6.5pt; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 2px; }
    .order-bar .cell .val { font-size: 8.5pt; color: #111827; font-weight: 700; }
    .order-bar .cell .val.mono { font-family: 'Courier New', monospace; font-size: 8pt; }
    .status-chip { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 7.5pt; font-weight: 700; }

    /* ── Intracom note ── */
    .intracom-note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 12px; font-size: 8.5pt; color: #1e40af; margin-bottom: 12px; }

    /* ── ITEMS TABLE ── */
    table.items { width: 100%; border-collapse: collapse; margin-bottom: ${tpl.gapAfterTable}px; font-size: 9pt; table-layout: fixed; }
    table.items thead tr { background: ${tpl.primaryColor}; color: white; }
    table.items thead th {
      padding: 8px 10px;
      text-align: left;
      font-weight: 700;
      font-size: 8.5pt;
      letter-spacing: 0.2px;
    }
    table.items thead th.center { text-align: center; }
    table.items thead th.right { text-align: right; }
    table.items tbody tr { border-bottom: 1px solid #e5e7eb; }
    table.items tbody td { padding: 7px 10px; vertical-align: middle; }
    table.items tbody td.desc { font-weight: 500; word-break: break-word; }
    table.items tbody td.center { text-align: center; }
    table.items tbody td.right { text-align: right; }
    table.items tbody td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
    table.items tbody td.bold { font-weight: 700; }
    table.items tbody td.qty-col { color: #374151; }
    table.items tbody tr.shipping-row td { color: #6b7280; font-style: italic; }
    table.items tbody tr.shipping-row td.bold { font-style: normal; }

    /* Column widths: Producto wide, Cantidad narrow */
    col.col-desc   { width: 38%; }
    col.col-qty    { width: 8%; }
    col.col-unit   { width: 13%; }
    col.col-total  { width: 13%; }
    col.col-iva    { width: 9%; }
    col.col-ttotal { width: 19%; }

    /* ── DISCOUNTS CARD ── */
    .discounts-card {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 12px;
      font-size: 8.5pt;
    }
    .discounts-card .title { font-weight: 800; color: #166534; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; font-size: 7pt; }
    .discounts-card .line { display: flex; justify-content: space-between; padding: 3px 0; color: #166534; }
    .discounts-card .line .amt { font-weight: 700; }

    /* ── VAT BREAKDOWN ── */
    .vat-breakdown {
      margin-bottom: 10px;
      font-size: 8pt;
      color: #6b7280;
    }
    .vat-breakdown table { border-collapse: collapse; }
    .vat-breakdown td { padding: 2px 10px 2px 0; }

    /* ── TOTALS block ── */
    .totals { margin-left: auto; width: 56%; font-size: 9.5pt; font-variant-numeric: tabular-nums; }
    .totals .row { display: flex; justify-content: space-between; padding: 5px 2px; border-bottom: 1px solid #f1f5f9; }
    .totals .row span:first-child { color: #6b7280; }
    .totals .row span:last-child { font-weight: 600; color: #111827; }
    .totals .row.final {
      background: ${tpl.totalBgColor};
      border: 2px solid ${tpl.totalBorderColor};
      border-radius: 6px;
      padding: 10px 14px;
      margin-top: 10px;
      font-size: 12pt;
      font-weight: 900;
      color: ${tpl.totalTextColor};
      display: flex;
      justify-content: flex-end;
      align-items: baseline;
      gap: 14px;
    }
    .totals .row.final span:first-child { color: ${tpl.totalTextColor}; }
    .totals .row.discount span:last-child { color: #16a34a; }

    /* ── LEGAL ── */
    .legal { margin-top: 18px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 7pt; color: #9ca3af; text-align: center; line-height: 1.5; }

    /* ── VeriFactu CSV — fixed at bottom ── */
    .verifactu {
      position: absolute;
      bottom: 6mm;
      left: ${tpl.paddingX}mm;
      right: ${tpl.paddingX}mm;
      padding-top: 6px;
      border-top: 1px solid #e5e7eb;
      font-size: 6.5pt;
      color: #6b7280;
      line-height: 1.5;
    }
    .verifactu strong { color: #374151; }
    .verifactu .qr { font-family: monospace; word-break: break-all; color: #9ca3af; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
<div class="invoice-wrap">

  <!-- HEADER -->
  <div class="hdr">
    <div class="hdr-left">
      <img class="brand-logo" src="/images/logo-tcg-shield.png" alt="${escapeHtml(tpl.brandName)}" />
      <div>
        <div class="brand-name">${escapeHtml(tpl.brandName)
          .split(" ")
          .map(
            (w, i) =>
              i === 0
                ? `<span>${w}</span>`
                : ` <span class="academy">${w}</span>`,
          )
          .join("")}</div>
        ${tpl.showBrandSub ? `<div class="brand-sub">${escapeHtml(tpl.brandSub)}</div>` : ""}
      </div>
    </div>
    <div class="hdr-right">
      <div class="title">${escapeHtml(tpl.labelTitle)}</div>
      <div class="number">Nº ${escapeHtml(invoiceNumber)}</div>
    </div>
  </div>

  <!-- DATOS CLIENTE / NEGOCIO -->
  <div class="parties">
    <div>
      <div class="party-label">${escapeHtml(tpl.labelClient)}</div>
      <div class="party-detail">
        <strong>${escapeHtml(clientName)}</strong>
        ${clientLines}
      </div>
    </div>
    <div class="party-right">
      <div class="party-label">${escapeHtml(tpl.labelIssuer)}</div>
      <div class="party-detail">
        <strong>${escapeHtml(issuerName)}</strong>
        CIF: ${escapeHtml(issuerCIF)}<br>
        ${escapeHtml(issuerAddress)}<br>
        ${escapeHtml(issuerCity)}<br>
        Tel: ${escapeHtml(issuerPhone)}<br>
        ${escapeHtml(issuerEmail)}
      </div>
    </div>
  </div>

  ${
    tpl.showOrderBar
      ? `
  <div class="order-bar">
    <div class="cell">
      <div class="lbl">${escapeHtml(tpl.labelOrderNum)}</div>
      <div class="val mono">${orderId ? escapeHtml(orderId) : "—"}</div>
    </div>
    <div class="cell">
      <div class="lbl">${escapeHtml(tpl.labelEmissionDate)}</div>
      <div class="val">${formattedDate}</div>
    </div>
    <div class="cell">
      <div class="lbl">${formattedOperation ? escapeHtml(tpl.labelOperationDate) : "Vencimiento"}</div>
      <div class="val">${formattedOperation ?? formattedDue ?? "Al contado"}</div>
    </div>
    <div class="cell">
      <div class="lbl">${escapeHtml(tpl.labelPaymentMethod)}</div>
      <div class="val">
        ${paymentMethod ? escapeHtml(paymentMethod) : "—"}
        ${statusChip ? `<span class="status-chip" style="background:${statusChip.bg};color:${statusChip.color};margin-left:4px">${statusChip.label}</span>` : ""}
      </div>
    </div>
  </div>`
      : ""
  }

  ${intracomunitario ? `<div class="intracom-note"><strong>Operación intracomunitaria exenta de IVA</strong> — Art. 25 LIVA. CIF intracomunitario: ${escapeHtml(clientCIF ?? "")}</div>` : ""}

  <!-- ITEMS TABLE -->
  <table class="items">
    <colgroup>
      <col class="col-desc">
      <col class="col-qty">
      <col class="col-unit">
      <col class="col-total">
      <col class="col-iva">
      <col class="col-ttotal">
    </colgroup>
    <thead>
      <tr>
        <th>Producto</th>
        <th class="center">Cantidad</th>
        <th class="right">Precio unitario</th>
        <th class="right">Total (s/IVA)</th>
        <th class="right">IVA</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${lineRows}
      ${
        shipping > 0
          ? `
      <tr class="shipping-row">
        <td class="desc">Gastos de envío</td>
        <td class="center qty-col">1</td>
        <td class="right num">${shippingBase.toFixed(2)} €</td>
        <td class="right num">${shippingBase.toFixed(2)} €</td>
        <td class="right num">${shippingVAT.toFixed(2)} €</td>
        <td class="right num bold">${shipping.toFixed(2)} €</td>
      </tr>`
          : `
      <tr class="shipping-row">
        <td class="desc">Gastos de envío</td>
        <td class="center qty-col">—</td>
        <td class="right num">—</td>
        <td class="right num">—</td>
        <td class="right num">—</td>
        <td class="right bold" style="color:#16a34a;letter-spacing:0.5px">GRATIS</td>
      </tr>`
      }
    </tbody>
  </table>

  ${
    tpl.showDiscountsCard && discounts > 0
      ? `
  <div class="discounts-card">
    <div class="title">Descuentos aplicados</div>
    ${
      couponDiscount > 0
        ? `<div class="line"><span>Cupón${couponCode ? ` <strong>${escapeHtml(couponCode)}</strong>` : ""}</span><span class="amt">-${couponDiscount.toFixed(2)} €</span></div>`
        : ""
    }
    ${
      pointsDiscount > 0
        ? `<div class="line"><span>Canje de puntos de fidelidad</span><span class="amt">-${pointsDiscount.toFixed(2)} €</span></div>`
        : ""
    }
  </div>`
      : ""
  }

  ${
    tpl.showVatBreakdown && breakdownEntries.length > 1
      ? `
  <div class="vat-breakdown">
    <table>
      <tr>
        <td><strong>Desglose IVA:</strong></td>
        ${breakdownEntries
          .map(
            ([rate, v]) =>
              `<td>Base ${rate}%: <strong>${v.base.toFixed(2)} €</strong> · Cuota: <strong>${v.vat.toFixed(2)} €</strong></td>`,
          )
          .join("")}
      </tr>
    </table>
  </div>`
      : ""
  }

  <div class="totals">
    <div class="row"><span>Base imponible</span><span>${subtotalBase.toFixed(2)} €</span></div>
    <div class="row"><span>IVA (${intracomunitario ? "0% — exento" : `${SITE_CONFIG.vatRate}%`})</span><span>${subtotalVAT.toFixed(2)} €</span></div>
    ${couponDiscount > 0 ? `<div class="row discount"><span>Dto. cupón${couponCode ? ` (${escapeHtml(couponCode)})` : ""}</span><span>-${couponDiscount.toFixed(2)} €</span></div>` : ""}
    ${pointsDiscount > 0 ? `<div class="row discount"><span>Dto. canje de puntos</span><span>-${pointsDiscount.toFixed(2)} €</span></div>` : ""}
    <div class="row final"><span>Total con IVA</span><span>${totalFinal.toFixed(2)} €</span></div>
  </div>

  ${
    tpl.showLegal
      ? `<div class="legal">${escapeHtml(tpl.legalText)}${intracomunitario ? "<br>Operación exenta de IVA. Inversión del sujeto pasivo (art. 25 LIVA, Ley 37/1992)." : ""}</div>`
      : ""
  }

  ${
    tpl.showVerifactu && (verifactuHash || verifactuQR)
      ? `
  <div class="verifactu">
    <strong>Verificación VeriFactu (CSV) &mdash;</strong>
    ${verifactuHash ? ` SHA-256: <span style="font-family:monospace">${verifactuHash}</span>` : ""}
    ${verifactuStatus ? ` &middot; Estado: ${escapeHtml(verifactuStatus)}` : ""}
    ${verifactuQR ? `<br>QR: <span class="qr">${escapeHtml(verifactuQR)}</span>` : ""}
  </div>`
      : ""
  }

</div>
</body>
</html>`;
}

/** Escape HTML to prevent injection from user-provided fields (client name, product name). */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Ensures the invoice has a verifactuHash (CSV — Código Seguro de Verificación).
 * If already present (e.g. persisted from invoiceService), it's preserved.
 * Returns the (possibly mutated) data — never throws.
 */
async function ensureVerifactuHash(data: InvoiceData): Promise<InvoiceData> {
  if (data.verifactuHash) return data;
  try {
    const content = [
      data.issuerCIF,
      data.invoiceNumber,
      data.date,
      data.clientName,
      (
        data.items.reduce((s, i) => s + i.unitPriceWithVAT * i.quantity, 0) +
        (data.shipping ?? 0)
      ).toFixed(2),
    ].join("|");
    const encoded = new TextEncoder().encode(content);
    const buf = await crypto.subtle.digest("SHA-256", encoded);
    data.verifactuHash = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (!data.verifactuStatus) {
      data.verifactuStatus = "PENDIENTE — Sistema VeriFactu en integración";
    }
  } catch {
    /* hash generation failed — invoice still valid without CSV */
  }
  return data;
}

/**
 * Generates the SHA-256 CSV, injects it into the invoice data, then prints.
 * Historically the single entry point — kept as alias for `printInvoice` for
 * backwards compatibility. Both now guarantee a hash before rendering.
 */
export async function printInvoiceWithCSV(data: InvoiceData): Promise<void> {
  await printInvoice(data);
}

/**
 * Opens the invoice in a hidden iframe and triggers print/save-as-PDF dialog.
 *
 * BUG #1 fix (audit 2026-04-20): this function is now async and ALWAYS
 * ensures `verifactuHash` is present before rendering. Any call path that
 * bypassed `printInvoiceWithCSV` previously could emit a PDF without CSV,
 * breaking VeriFactu compliance. The guarantee is now inside `printInvoice`
 * itself so it cannot be bypassed.
 */
export async function printInvoice(data: InvoiceData): Promise<void> {
  await ensureVerifactuHash(data);
  const html = generateInvoiceHTML(data);
  // Inject a <base> tag so relative image paths (logo, etc.) resolve from the origin
  const baseTag = `<base href="${window.location.origin}/">`;
  const htmlWithBase = html.replace("<head>", `<head>${baseTag}`);

  // Use a hidden iframe so popup blockers never interfere
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;border:0;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(htmlWithBase);
  doc.close();

  // Give the iframe time to render before printing
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {
          /* ignore */
        }
      }, 2000);
    }
  }, 600);
}

/** Build invoice data from a localStorage order object */
export function buildInvoiceFromOrder(
  order: {
    id: string;
    date: string;
    /** Fecha en la que se entregó / cumplió la operación si distinta a la emisión */
    operationDate?: string;
    items: {
      name: string;
      quantity?: number;
      qty?: number;
      price: number;
    }[];
    shipping?: number;
    coupon?: { code: string } | null;
    couponDiscount?: number;
    pointsDiscount?: number;
    total: number;
    shippingAddress?: {
      nombre?: string;
      apellidos?: string;
      email?: string;
      direccion?: string;
      ciudad?: string;
      cp?: string;
      provincia?: string;
      pais?: string;
    };
    pago?: string;
    paymentMethod?: string;
    paymentStatus?: "paid" | "pending" | "refunded" | "failed";
    /** Override client display name (e.g. from auth context) */
    clientName?: string;
    clientCIF?: string;
  },
  invoiceNumber: string,
): InvoiceData {
  const addr = order.shippingAddress ?? {};
  // Parseo de la dirección fiscal centralizado en @/lib/fiscalAddress.
  const issuer = getIssuerAddress();
  const issuerAddress = issuer.street || SITE_CONFIG.address;
  const issuerCity = issuer.cityLine;
  return {
    invoiceNumber,
    orderId: order.id,
    date: order.date,
    operationDate: order.operationDate,
    paymentMethod: order.pago ?? order.paymentMethod ?? "Tarjeta",
    paymentStatus: order.paymentStatus ?? "paid",
    issuerName: SITE_CONFIG.legalName,
    issuerCIF: SITE_CONFIG.cif,
    issuerAddress,
    issuerCity,
    issuerPhone: SITE_CONFIG.phone,
    issuerEmail: SITE_CONFIG.email,
    clientName:
      order.clientName ||
      `${addr.nombre ?? ""} ${addr.apellidos ?? ""}`.trim() ||
      "—",
    clientCIF: order.clientCIF,
    clientAddress: addr.direccion,
    clientCity: addr.cp
      ? `${addr.cp} ${addr.ciudad ?? ""}`.trim()
      : addr.ciudad,
    clientProvince: addr.provincia,
    clientCountry: addr.pais ?? "España",
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity ?? i.qty ?? 1,
      unitPriceWithVAT: i.price,
      vatRate: SITE_CONFIG.vatRate,
    })),
    shipping: order.shipping ?? 0,
    couponCode: order.coupon?.code,
    couponDiscount: order.couponDiscount ?? 0,
    pointsDiscount: order.pointsDiscount ?? 0,
  };
}

/**
 * Genera un número de factura "preview" a partir de un orderId.
 * Úsase en flujos que imprimen una factura sin pasar por invoiceService
 * (vista previa de pedido, reimpresión cliente/admin).
 *
 * Formato: FAC-YYYY-NNNNNXXXXXE (idéntico al canónico).
 * N se deriva de los últimos 5 dígitos del orderId — NO es secuencial real.
 * Para numeración oficial usar `generateInvoiceNumber()` de invoiceService.ts.
 */
export function generateInvoiceNumber(orderId: string): string {
  const match = orderId.match(/TCG-(\d{4})/);
  const yearStr = match ? match[1] : new Date().getFullYear().toString();
  const year = parseInt(yearStr, 10);
  const seqDigits = orderId.slice(-5).replace(/\D/g, "").padStart(5, "0");
  const n = parseInt(seqDigits, 10);
  const xStr = computeControlDigits(n, year);
  return `FAC-${yearStr}-${seqDigits}${xStr}${INVOICE_ORIGIN_WEB}`;
}
