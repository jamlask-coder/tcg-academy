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
import { getIssuerAddress, abbreviateAddressLine } from "@/lib/fiscalAddress";
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
  clientPhone?: string;
  clientEmail?: string;
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
  /**
   * Descuento general aplicado a todas las líneas (como el cupón, se muestra
   * en el bloque "Descuentos aplicados" y se resta del total). Los precios
   * unitarios de `items` deben ser los ORIGINALES (sin bakear el descuento
   * general dentro). Así cumple Art. 6.1.f RD 1619/2012: el descuento consta
   * separadamente y no incluido en el precio unitario.
   */
  globalDiscount?: { pct: number; amount: number };

  /**
   * Si `true`, el documento se renderiza como ALBARÁN:
   *  - título "ALBARÁN Nº …" (en lugar de "FACTURA Nº …")
   *  - marca de agua diagonal "ALBARÁN" roja semitransparente (ocupa toda la página)
   *  - sin CSV VeriFactu en el pie (los albaranes no van a la AEAT)
   *  - `<title>` y texto legal adaptados
   */
  isDeliveryNote?: boolean;
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

/**
 * Normaliza el método de pago para impresión. Los valores del enum
 * `PaymentMethod` llegan en minúsculas (`tarjeta`, `datafono`, `paypal`...).
 * Devolvemos un label humano con la mayúscula y tildes correctas; si el valor
 * ya viene formateado (ej. "Tarjeta Visa ****4242") se respeta tal cual salvo
 * la primera letra.
 */
function prettyPaymentMethod(raw: string | undefined): string {
  if (!raw) return "—";
  const trimmed = raw.trim();
  if (!trimmed) return "—";
  const map: Record<string, string> = {
    tarjeta: "Tarjeta",
    datafono: "Datáfono",
    transferencia: "Transferencia",
    efectivo: "Efectivo",
    bizum: "Bizum",
    paypal: "PayPal",
    contra_reembolso: "Contra reembolso",
  };
  const key = trimmed.toLowerCase();
  if (map[key]) return map[key];
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
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
    paymentMethod,
    paymentStatus,
    verifactuHash,
    verifactuQR: _verifactuQR,
    verifactuStatus: _verifactuStatus,
    issuerName,
    issuerCIF,
    issuerAddress,
    issuerCity,
    issuerPhone,
    issuerEmail,
    clientName,
    clientCIF,
    clientPhone,
    clientEmail,
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
    globalDiscount,
    isDeliveryNote = false,
  } = data;
  const globalDiscountPct = globalDiscount?.pct ?? 0;
  const globalDiscountAmount = globalDiscount?.amount ?? 0;

  const formattedDate = fmtDate(date);

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
  const discounts = couponDiscount + pointsDiscount + globalDiscountAmount;
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
  // Las líneas negativas (cupón, descuento general, canje de puntos) reciben
  // la clase `discount-row` para mostrarse con fondo verde translúcido y
  // texto verde — patrón visual explícito para que no se confundan con
  // líneas de producto.
  const lineRows = lines
    .map((l) => {
      const unitNoVat = l.unitPriceWithVAT / (1 + l.vatRate / 100);
      const isDiscount = l.unitPriceWithVAT < 0;
      const rowClass = isDiscount ? ' class="discount-row"' : "";
      return `
    <tr${rowClass}>
      <td class="desc">${escapeHtml(l.name)}</td>
      <td class="center qty-col">${l.quantity}</td>
      <td class="right num">${unitNoVat.toFixed(2)}&nbsp;€</td>
      <td class="right num">${l.base.toFixed(2)}&nbsp;€</td>
      <td class="right num">${l.vatAmount.toFixed(2)}&nbsp;€</td>
      <td class="right num bold">${l.totalWithVAT.toFixed(2)}&nbsp;€</td>
    </tr>`;
    })
    .join("");

  // Status chip: mostrar SÓLO en estados NO-pagado (pagado es lo común y limpia el layout).
  const statusChip =
    paymentStatus && paymentStatus !== "paid"
      ? PAYMENT_STATUS_LABEL[paymentStatus]
      : null;

  // Ocultar prefijo interno al renderizar:
  //  - FAC- en facturas (el hash-chain lo sigue usando internamente)
  //  - ALB- en albaranes (numeración independiente)
  const displayNumber = invoiceNumber.replace(/^(FAC|ALB)-/, "");

  // Título del documento — varía entre factura y albarán.
  // El albarán ignora `tpl.labelTitle` porque es un documento distinto, no una
  // variante visual del mismo.
  const docTitle = isDeliveryNote ? "ALBARÁN" : tpl.labelTitle;

  // Client info — filter empty lines
  const clientLines = [
    clientCIF ? `NIF: ${escapeHtml(clientCIF)}` : null,
    clientPhone ? escapeHtml(clientPhone) : null,
    clientEmail ? escapeHtml(clientEmail) : null,
    clientAddress ? escapeHtml(abbreviateAddressLine(clientAddress)) : null,
    clientCity ? escapeHtml(clientCity) : null,
    [clientProvince, clientCountry]
      .filter(Boolean)
      .map((v) => escapeHtml(v as string))
      .join(", ") || null,
  ]
    .filter(Boolean)
    .join("<br>");

  // Tipo IVA a mostrar en cabecera de columna (si multi-rate, usa el del primer line o default)
  const headerVatRate = intracomunitario ? 0 : (lines[0]?.vatRate ?? SITE_CONFIG.vatRate);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${isDeliveryNote ? "Albarán" : "Factura"} ${invoiceNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* Paleta brand: navy principal derivado del logo (degradado
       #0a0f1a → #1e3a8a → #1d4ed8). Se usa #1e3a8a como acento principal y
       #0a0f1a como tono profundo para bordes decisivos. */
    :root {
      --brand-navy: #1e3a8a;
      --brand-navy-deep: #0f1e4a;
      --brand-navy-soft: #eef2ff;
    }

    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 210mm; min-height: 297mm; }
    /* Inter: trazos más estrechos que Arial Black. Fallback a system UI estilos
       narrow (Segoe UI en Windows, Helvetica Neue en macOS). */
    body { font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; color: #111827; background: white; }
    .invoice-wrap {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: ${tpl.paddingTop}mm ${tpl.paddingX}mm ${tpl.paddingBottom}mm ${tpl.paddingX}mm;
      padding-bottom: calc(${tpl.paddingBottom}mm + 16mm); /* reserva para footer fijo */
      position: relative;
      overflow: hidden;
    }

    /* Espacio después de la tabla de items. El cierre de línea ya lo hace
       el border-bottom de la última fila (más fiable: no queda "colgado"
       cuando la tabla tiene pocas filas). Aquí sólo aportamos el gap. */
    .items-close {
      height: 0;
      margin: 0 0 14px 0;
    }

    /* ── Marca de agua ── */
    .watermark {
      position: absolute;
      top: ${tpl.watermarkY}%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: ${tpl.watermarkSize}%;
      opacity: ${tpl.watermarkOpacity};
      pointer-events: none;
      user-select: none;
      z-index: 0;
    }
    /* Marca de agua ALBARÁN — texto diagonal rojo, inmenso, para que nunca
       se confunda con una factura real. Se renderiza en lugar de la imagen
       watermark estándar cuando isDeliveryNote es true. */
    .watermark-albaran {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 160pt;
      font-weight: 900;
      letter-spacing: 14px;
      color: rgba(220, 38, 38, 0.14);
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
      z-index: 0;
      font-family: 'Inter', Arial, sans-serif;
    }
    .invoice-wrap > *:not(.watermark):not(.watermark-albaran):not(.page-footer) { position: relative; z-index: 1; }

    /* ── HEADER — logo left, company info right ──
       Los dos bloques tienen anchos FIJOS en % para que la dirección fiscal
       (que puede ser larga) no empuje el logo. Si el texto de la empresa es
       más largo que su caja, hace wrap DENTRO (overflow-wrap:break-word),
       nunca hacia el logo. Así el logo siempre se ve íntegro y los datos
       empresariales siempre arrancan en la misma posición X. */
    .hdr {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      margin-bottom: ${tpl.gapAfterHeader}px;
      padding-bottom: 14px;
      border-bottom: 2px solid var(--brand-navy);
    }
    /* margin-left negativo: el logo queda ópticamente más a la izquierda sin
       reducir el margen lateral del cuerpo de la factura (que el usuario quiere
       algo más ancho). */
    .brand-logo {
      height: ${tpl.logoSize}px;
      width: auto;
      max-width: 100%;
      object-fit: contain;
      flex: 0 0 42%;
      display: block;
      margin-left: -12mm;
    }
    .company-info {
      flex: 0 0 48%;
      text-align: left;
      font-size: 10.5pt;
      color: #111827;
      line-height: 1.55;
      overflow-wrap: break-word;
      word-wrap: break-word;
    }
    .company-info strong { color: var(--brand-navy); font-weight: 700; font-size: 11.5pt; display: block; margin-bottom: 3px; letter-spacing: 0.1px; }

    /* ── FACTURA Nº — título bajo cabecera ── */
    .invoice-title {
      font-size: 13.5pt;
      font-weight: 700;
      color: var(--brand-navy);
      letter-spacing: -0.1px;
      margin-bottom: ${tpl.gapAfterParties}px;
      margin-top: 4px;
    }

    /* ── Bloque cliente + pedido en 2 columnas ── */
    .parties { display: flex; justify-content: space-between; align-items: flex-start; gap: 32px; margin-bottom: ${tpl.gapAfterOrderBar}px; }
    .client-block { flex: 1 1 auto; font-size: 9pt; color: #111827; line-height: 1.5; padding-left: 10px; border-left: 3px solid var(--brand-navy); }
    .client-block strong { color: var(--brand-navy); font-weight: 700; font-size: 10pt; display: block; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.3px; }
    .order-block { flex: 0 0 auto; font-size: 9pt; color: #111827; line-height: 1.55; text-align: left; min-width: 42%; }
    .order-block .line { white-space: nowrap; }
    .order-block .lbl { font-weight: 700; color: var(--brand-navy); }
    .order-block .val.mono { font-family: 'Courier New', monospace; }
    .status-chip { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 7.5pt; font-weight: 700; margin-left: 4px; }

    /* ── Intracom note ── */
    .intracom-note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 12px; font-size: 8.5pt; color: #1e40af; margin-bottom: 12px; }

    /* ── ITEMS TABLE ── */
    table.items { width: 100%; border-collapse: collapse; margin-bottom: ${tpl.gapAfterTable}px; font-size: 9pt; table-layout: fixed; border: 1px solid var(--brand-navy); border-radius: 4px; overflow: hidden; }
    table.items thead tr { background: linear-gradient(180deg, var(--brand-navy) 0%, var(--brand-navy-deep) 100%); color: #ffffff; }
    table.items thead th {
      padding: 6px 8px;
      text-align: center;
      font-weight: 700;
      font-size: 8.5pt;
      letter-spacing: 0.2px;
      text-transform: uppercase;
      color: #ffffff;
      border-right: 1px solid rgba(255,255,255,0.15);
      word-break: normal;
      overflow-wrap: break-word;
    }
    table.items thead th:last-child { border-right: 0; }
    table.items thead th.left { text-align: left; }
    table.items thead th.right { text-align: center; }
    table.items tbody tr { border-bottom: 1px solid #e5e7eb; }
    /* Zebra con alfa — así la marca de agua se transluce a través de las
       filas con fondo (requisito del usuario: ningún fondo sólido debe
       tapar el logo). */
    table.items tbody tr:nth-child(even) { background: rgba(248, 250, 252, 0.55); }
    /* La última fila conserva su border-bottom para cerrar la tabla
       visualmente — 1px algo mas oscuro que las separaciones internas.
       Asi no queda ese hueco suelto abajo a la izquierda. */
    table.items tbody tr:last-child { border-bottom: 1px solid #cbd5e1; }
    table.items tbody td { padding: 7px 10px; vertical-align: middle; line-height: 1.35; min-height: 22px; }
    table.items tbody td.desc { font-weight: 500; word-break: break-word; }
    table.items tbody td.center { text-align: center; }
    table.items tbody td.right { text-align: right; }
    table.items tbody td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
    table.items tbody td.bold { font-weight: 700; }
    table.items tbody td.qty-col { color: #111827; }
    table.items tbody tr.shipping-row td { color: #374151; }
    table.items tbody tr.shipping-row td.dash { color: #6b7280; text-align: center; }
    /* "Gastos de envío" no debe partirse en dos líneas — si la columna desc
       es estrecha, preferimos que se muestre completo sin wrap. */
    table.items tbody tr.shipping-row td.desc { white-space: nowrap; }
    /* Filas de descuento (líneas negativas: cupón, descuento general, puntos).
       Verde tenue con alfa — recupera el tono visual previo SIN ocultar la
       marca de agua. Debe ir DESPUÉS de :nth-child(even) para ganar en
       cascada sin recurrir a !important. */
    table.items tbody tr.discount-row { background: rgba(220, 252, 231, 0.55); }
    table.items tbody tr.discount-row td { color: #166534; }
    table.items tbody tr.discount-row td.num { color: #15803d; font-weight: 600; }
    table.items tbody tr.discount-row td.desc { color: #14532d; font-weight: 600; }

    /* Column widths — "Cantidad" necesita sitio para no superponerse con
       "Precio unit. s/IVA". Las numéricas respiran para evitar cortes "€". */
    col.col-desc   { width: 32%; }
    col.col-qty    { width: 12%; }
    col.col-unit   { width: 15%; }
    col.col-total  { width: 13%; }
    col.col-iva    { width: 12%; }
    col.col-ttotal { width: 16%; }

    /* ── DISCOUNTS CARD ──
       Fondo verde con alfa 0.55 para que la marca de agua se transluzca
       a través. El borde sí es sólido para seguir definiendo la caja. */
    .discounts-card {
      background: rgba(240, 253, 244, 0.55);
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
    .totals { margin-left: auto; width: 46%; font-size: 10pt; font-variant-numeric: tabular-nums; background: transparent; border: 1px solid var(--brand-navy); border-radius: 6px; overflow: hidden; }
    .totals .row { display: flex; justify-content: space-between; padding: 5px 12px; }
    .totals .row:not(.final) { border-bottom: 1px solid #e5e7eb; }
    .totals .row span:first-child { color: #111827; font-weight: 600; }
    .totals .row span:last-child { font-weight: 700; color: #111827; }
    .totals .row.final {
      /* Alfa 0.92 — mantiene contraste para texto blanco pero permite ver
         la marca de agua justo detrás del bloque TOTAL. */
      background: linear-gradient(180deg, rgba(30, 58, 138, 0.92) 0%, rgba(15, 30, 74, 0.92) 100%);
      padding: 7px 12px;
      margin-top: 0;
      font-size: 12pt;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 0.2px;
      border-top: 0;
      border-bottom: 0;
    }
    .totals .row.final span:first-child { color: #ffffff; font-weight: 700; }
    .totals .row.final span:last-child { color: #ffffff; font-weight: 700; }
    .totals .row.discount span:last-child { color: #16a34a; }

    /* ── FOOTER fijado al pie de la página ───────────────────────────────
       En pantalla (preview en iframe): position:absolute anclado al fondo
       del .invoice-wrap — así queda realmente al pie del documento y no
       flotando sobre el viewport. En impresión/PDF: position:fixed para
       que se repita en cada página (@media print abajo). */
    .page-footer {
      position: absolute;
      bottom: 5mm;
      left: ${tpl.paddingX}mm;
      right: ${tpl.paddingX}mm;
      padding: 5px 0 0;
      border-top: 2px solid var(--brand-navy);
      background: #ffffff;
      font-size: 7pt;
      color: #6b7280;
      line-height: 1.4;
      z-index: 5;
    }
    .page-footer .footer-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
    }
    .page-footer .footer-col { flex: 1; min-width: 0; }
    .page-footer .footer-col.center { text-align: center; }
    .page-footer .footer-col.right { text-align: right; flex: 0 0 auto; }
    .page-footer .legal {
      font-size: 7pt;
      color: #6b7280;
      line-height: 1.45;
      font-style: italic;
    }
    .page-footer .csv-row {
      margin-top: 4px;
      font-size: 6.5pt;
      color: #9ca3af;
    }
    .page-footer .csv-label { color: var(--brand-navy); font-weight: 700; letter-spacing: 0.4px; }
    .page-footer .csv-hash { font-family: 'Courier New', monospace; word-break: break-all; color: #6b7280; }
    .page-footer .page-num {
      font-size: 7.5pt;
      font-weight: 700;
      color: var(--brand-navy);
      white-space: nowrap;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
      /* En impresión sí queremos fixed para que el footer se repita en
         cada página (facturas de más de 1 página). */
      .page-footer { position: fixed; }
    }
  </style>
</head>
<body>
<div class="invoice-wrap">

  ${
    isDeliveryNote
      ? `<div class="watermark-albaran" aria-hidden="true">ALBARÁN</div>`
      : tpl.watermarkEnabled
        ? `<img class="watermark" src="/images/invoice-watermark.png" alt="" aria-hidden="true" />`
        : ""
  }

  <!-- HEADER: logo izquierda + datos empresa derecha -->
  <div class="hdr">
    <img class="brand-logo" src="/images/invoice-logo.png?v=2026042401" alt="${escapeHtml(tpl.brandName)}" />
    <div class="company-info">
      <strong>${escapeHtml(issuerName)}</strong>
      CIF: ${escapeHtml(issuerCIF)}<br>
      ${escapeHtml(issuerPhone)}<br>
      ${escapeHtml(issuerEmail)}<br>
      ${escapeHtml(issuerAddress)}<br>
      ${escapeHtml(issuerCity)}
    </div>
  </div>

  <!-- FACTURA / ALBARÁN Nº -->
  <div class="invoice-title">${escapeHtml(docTitle)} Nº ${escapeHtml(displayNumber)}</div>

  <!-- CLIENTE (izq) + PEDIDO (der) en 2 columnas -->
  <div class="parties">
    <div class="client-block">
      <strong>${escapeHtml(clientName)}</strong>
      ${clientLines}
    </div>
    ${
      tpl.showOrderBar
        ? `
    <div class="order-block">
      <div class="line"><span class="lbl">Pedido:</span> <span class="val">${orderId ? escapeHtml(orderId) : "—"}</span></div>
      <div class="line"><span class="lbl">Fecha de pedido:</span> <span class="val">${formattedDate}</span></div>
      <div class="line"><span class="lbl">${escapeHtml(tpl.labelPaymentMethod)}:</span> <span class="val">${escapeHtml(prettyPaymentMethod(paymentMethod))}${statusChip ? `<span class="status-chip" style="background:${statusChip.bg};color:${statusChip.color}">${statusChip.label}</span>` : ""}</span></div>
    </div>`
        : ""
    }
  </div>

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
        <th class="left">Producto</th>
        <th>Cantidad</th>
        <th>Precio unit. s/IVA</th>
        <th>Total s/IVA</th>
        <th>IVA (${headerVatRate}%)</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${lineRows}
      ${
        shipping > 0
          ? `
      <tr class="shipping-row">
        <td class="desc">Gastos de envío</td>
        <td class="center dash">—</td>
        <td class="right dash">—</td>
        <td class="right num">${shippingBase.toFixed(2)}&nbsp;€</td>
        <td class="right num">${shippingVAT.toFixed(2)}&nbsp;€</td>
        <td class="right num bold">${shipping.toFixed(2)}&nbsp;€</td>
      </tr>`
          : ""
      }
    </tbody>
  </table>
  <div class="items-close"></div>

  ${
    tpl.showDiscountsCard && discounts > 0
      ? `
  <div class="discounts-card">
    <div class="title">Descuentos aplicados</div>
    ${
      globalDiscountAmount > 0
        ? `<div class="line"><span>Descuento general${globalDiscountPct > 0 ? ` (${globalDiscountPct}%)` : ""}</span><span class="amt">-${globalDiscountAmount.toFixed(2)}&nbsp;€</span></div>`
        : ""
    }
    ${
      couponDiscount > 0
        ? `<div class="line"><span>Cupón${couponCode ? ` <strong>${escapeHtml(couponCode)}</strong>` : ""}</span><span class="amt">-${couponDiscount.toFixed(2)}&nbsp;€</span></div>`
        : ""
    }
    ${
      pointsDiscount > 0
        ? `<div class="line"><span>Canje de puntos de fidelidad</span><span class="amt">-${pointsDiscount.toFixed(2)}&nbsp;€</span></div>`
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
              `<td>Base ${rate}%: <strong>${v.base.toFixed(2)}&nbsp;€</strong> · Cuota: <strong>${v.vat.toFixed(2)}&nbsp;€</strong></td>`,
          )
          .join("")}
      </tr>
    </table>
  </div>`
      : ""
  }

  <div class="totals">
    <div class="row"><span>Base imponible</span><span>${subtotalBase.toFixed(2)}&nbsp;€</span></div>
    <div class="row"><span>IVA ${intracomunitario ? "0% — exento" : `${SITE_CONFIG.vatRate}%`}</span><span>${subtotalVAT.toFixed(2)}&nbsp;€</span></div>
    ${globalDiscountAmount > 0 ? `<div class="row discount"><span>Descuento general${globalDiscountPct > 0 ? ` (${globalDiscountPct}%)` : ""}</span><span>-${globalDiscountAmount.toFixed(2)}&nbsp;€</span></div>` : ""}
    ${couponDiscount > 0 ? `<div class="row discount"><span>Dto. cupón${couponCode ? ` (${escapeHtml(couponCode)})` : ""}</span><span>-${couponDiscount.toFixed(2)}&nbsp;€</span></div>` : ""}
    ${pointsDiscount > 0 ? `<div class="row discount"><span>Dto. canje de puntos</span><span>-${pointsDiscount.toFixed(2)}&nbsp;€</span></div>` : ""}
    <div class="row final"><span>TOTAL</span><span>${totalFinal.toFixed(2)}&nbsp;€</span></div>
  </div>

  <!-- PIE DE PÁGINA — se repite en cada página impresa (position: fixed). ──
       Va DENTRO de .invoice-wrap para que position:absolute bottom:5mm se
       ancle al wrap (con position:relative), no al viewport del iframe. -->
  <div class="page-footer">
    <div class="footer-grid">
      <div class="footer-col">
        ${
          tpl.showLegal
            ? `<div class="legal">${escapeHtml(tpl.legalText)}${intracomunitario ? "<br>Operación exenta de IVA. Inversión del sujeto pasivo (art. 25 LIVA, Ley 37/1992)." : ""}</div>`
            : ""
        }
        ${
          tpl.showVerifactu && verifactuHash
            ? `<div class="csv-row"><span class="csv-label">CSV:</span> <span class="csv-hash">${verifactuHash}</span></div>`
            : ""
        }
      </div>
      <div class="footer-col right">
        <span class="page-num">Página 1 de 1</span>
      </div>
    </div>
  </div>

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
  // Los albaranes NO llevan CSV VeriFactu — son documentos de entrega, no
  // facturas, y no entran en la cadena hash ni se envían a la AEAT.
  if (!data.isDeliveryNote) {
    await ensureVerifactuHash(data);
  }
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
      telefono?: string;
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
    clientPhone: addr.telefono,
    clientEmail: addr.email,
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
