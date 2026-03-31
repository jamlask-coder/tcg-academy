/**
 * Generador de facturas conforme al Real Decreto 1619/2012 (España).
 * Genera HTML listo para imprimir como PDF con window.print().
 */

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPriceWithVAT: number;
  vatRate?: number;
}

export interface InvoiceData {
  invoiceNumber: string; // FAC-2026-00001
  date: string; // ISO date string
  dueDate?: string;
  paymentMethod?: string;
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

export function generateInvoiceHTML(data: InvoiceData): string {
  const {
    invoiceNumber,
    date,
    dueDate,
    paymentMethod,
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
    intracomunitario = false,
    items,
    shipping = 0,
    couponCode,
    couponDiscount = 0,
    pointsDiscount = 0,
  } = data;

  const formattedDate = new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const formattedDue = dueDate
    ? new Date(dueDate).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  // Per-line calculations
  const lines = items.map((item) => {
    const vatRate = item.vatRate ?? 21;
    const { base, vatAmount, totalWithVAT, effectiveVAT } = calcBase(
      item.unitPriceWithVAT,
      vatRate,
      item.quantity,
      intracomunitario,
    );
    return { ...item, vatRate: effectiveVAT, base, vatAmount, totalWithVAT };
  });

  // Shipping VAT
  const shippingVATRate = intracomunitario ? 0 : 21;
  const shippingBase = shipping / (1 + shippingVATRate / 100);
  const shippingVAT = shipping - shippingBase;

  // Totals
  const subtotalBase = lines.reduce((s, l) => s + l.base, 0) + shippingBase;
  const subtotalVAT = lines.reduce((s, l) => s + l.vatAmount, 0) + shippingVAT;
  const discounts = couponDiscount + pointsDiscount;
  const totalFinal =
    lines.reduce((s, l) => s + l.totalWithVAT, 0) + shipping - discounts;

  // Group by VAT rate
  const vatGroups: Record<number, { base: number; vat: number }> = {};
  for (const l of lines) {
    if (!vatGroups[l.vatRate]) vatGroups[l.vatRate] = { base: 0, vat: 0 };
    vatGroups[l.vatRate].base += l.base;
    vatGroups[l.vatRate].vat += l.vatAmount;
  }
  if (shipping > 0) {
    if (!vatGroups[shippingVATRate])
      vatGroups[shippingVATRate] = { base: 0, vat: 0 };
    vatGroups[shippingVATRate].base += shippingBase;
    vatGroups[shippingVATRate].vat += shippingVAT;
  }

  const lineRows = lines
    .map(
      (l) => `
    <tr>
      <td class="desc">${l.name}</td>
      <td class="center">${l.quantity}</td>
      <td class="right">${(l.unitPriceWithVAT / (1 + l.vatRate / 100)).toFixed(2)} €</td>
      <td class="right">${l.vatRate}%</td>
      <td class="right bold">${l.base.toFixed(2)} €</td>
    </tr>
  `,
    )
    .join("");

  const vatRows = Object.entries(vatGroups)
    .map(
      ([rate, { base, vat }]) => `
    <tr>
      <td>${rate}%</td>
      <td class="right">${base.toFixed(2)} €</td>
      <td class="right">${vat.toFixed(2)} €</td>
    </tr>
  `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura ${invoiceNumber}</title>
  <style>
    @page { size: A4; margin: 18mm 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; font-size: 10pt; color: #1a1a2e; background: white; }
    .invoice-wrap { max-width: 800px; margin: 0 auto; padding: 24px; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #1a3a5c; }
    .brand { display: flex; flex-direction: column; gap: 2px; }
    .brand-name { font-size: 20pt; font-weight: 900; color: #1a3a5c; letter-spacing: -0.5px; }
    .brand-sub { font-size: 8pt; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; }
    .issuer-data { text-align: right; font-size: 9pt; color: #374151; line-height: 1.6; }

    /* Invoice info */
    .invoice-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; }
    .meta-box h4 { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #1a3a5c; margin-bottom: 8px; }
    .meta-row { display: flex; justify-content: space-between; font-size: 9.5pt; color: #374151; margin-bottom: 3px; }
    .meta-row span:first-child { color: #6b7280; }
    .meta-row span:last-child { font-weight: 600; }
    .invoice-number { font-size: 14pt; font-weight: 800; color: #1a3a5c; }

    /* Table */
    .items-section h4 { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #1a3a5c; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 9.5pt; }
    thead tr { background: #1a3a5c; color: white; }
    thead th { padding: 8px 12px; text-align: left; font-weight: 700; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:hover { background: #f8fafc; }
    td { padding: 9px 12px; vertical-align: middle; }
    td.desc { max-width: 280px; }
    td.center { text-align: center; }
    td.right { text-align: right; }
    td.bold { font-weight: 700; }

    /* Totals */
    .totals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .vat-table { font-size: 9pt; }
    .vat-table h4 { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #1a3a5c; margin-bottom: 8px; }
    .vat-table table { margin: 0; }
    .vat-table thead tr { background: #e8ecf0; }
    .vat-table thead th { color: #374151; }

    .totals-summary { }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 10pt; border-bottom: 1px solid #f1f5f9; }
    .total-row span:first-child { color: #6b7280; }
    .total-row.final { background: #1a3a5c; color: white; border-radius: 8px; padding: 12px 16px; margin-top: 8px; font-size: 13pt; font-weight: 800; border: none; }
    .total-row.final span:first-child { color: rgba(255,255,255,0.8); font-size: 9pt; }

    /* Footer */
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #9ca3af; text-align: center; line-height: 1.6; }
    .intracom-note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 14px; font-size: 9pt; color: #1e40af; margin-bottom: 20px; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
<div class="invoice-wrap">

  <!-- Header -->
  <div class="header">
    <div class="brand">
      <span class="brand-name">TCG Academy</span>
      <span class="brand-sub">Tu tienda especialista en TCG</span>
    </div>
    <div class="issuer-data">
      <strong>${issuerName}</strong><br>
      CIF: ${issuerCIF}<br>
      ${issuerAddress}<br>
      ${issuerCity}<br>
      Tel: ${issuerPhone}<br>
      ${issuerEmail}
    </div>
  </div>

  <!-- Invoice meta -->
  <div class="invoice-meta">
    <div class="meta-box">
      <h4>Datos de Factura</h4>
      <div class="meta-row"><span>Número</span><span class="invoice-number">${invoiceNumber}</span></div>
      <div class="meta-row"><span>Fecha emisión</span><span>${formattedDate}</span></div>
      ${formattedDue ? `<div class="meta-row"><span>Vencimiento</span><span>${formattedDue}</span></div>` : ""}
      ${paymentMethod ? `<div class="meta-row"><span>Forma de pago</span><span>${paymentMethod}</span></div>` : ""}
    </div>
    <div class="meta-box">
      <h4>Datos del Cliente</h4>
      <div class="meta-row"><span>Nombre</span><span>${clientName}</span></div>
      ${clientCIF ? `<div class="meta-row"><span>NIF/CIF</span><span>${clientCIF}</span></div>` : ""}
      ${clientAddress ? `<div class="meta-row"><span>Dirección</span><span>${clientAddress}</span></div>` : ""}
      ${clientCity ? `<div class="meta-row"><span>Ciudad</span><span>${clientCity}</span></div>` : ""}
    </div>
  </div>

  ${intracomunitario ? `<div class="intracom-note">⚠️ <strong>Operación intracomunitaria exenta de IVA</strong> — Art. 25 LIVA (Ley 37/1992). CIF intracomunitario verificado: ${clientCIF}</div>` : ""}

  <!-- Line items -->
  <div class="items-section">
    <h4>Detalle de Productos y Servicios</h4>
    <table>
      <thead>
        <tr>
          <th>Descripción</th>
          <th class="center">Cant.</th>
          <th class="right">P. Unit. (s/IVA)</th>
          <th class="right">IVA</th>
          <th class="right">Base Imp.</th>
        </tr>
      </thead>
      <tbody>
        ${lineRows}
        ${
          shipping > 0
            ? `
        <tr>
          <td class="desc">Gastos de envío</td>
          <td class="center">1</td>
          <td class="right">${shippingBase.toFixed(2)} €</td>
          <td class="right">${shippingVATRate}%</td>
          <td class="right bold">${shippingBase.toFixed(2)} €</td>
        </tr>`
            : ""
        }
        ${
          couponDiscount > 0
            ? `
        <tr>
          <td class="desc" colspan="4" style="color:#16a34a">Descuento cupón ${couponCode ? `(${couponCode})` : ""}</td>
          <td class="right bold" style="color:#16a34a">-${couponDiscount.toFixed(2)} €</td>
        </tr>`
            : ""
        }
        ${
          pointsDiscount > 0
            ? `
        <tr>
          <td class="desc" colspan="4" style="color:#d97706">Canje de puntos</td>
          <td class="right bold" style="color:#d97706">-${pointsDiscount.toFixed(2)} €</td>
        </tr>`
            : ""
        }
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="totals-grid">
    <div class="vat-table">
      <h4>Resumen IVA</h4>
      <table>
        <thead><tr><th>Tipo IVA</th><th class="right">Base Imp.</th><th class="right">Cuota IVA</th></tr></thead>
        <tbody>${vatRows}</tbody>
      </table>
    </div>
    <div class="totals-summary">
      <div class="total-row"><span>Base imponible</span><span>${subtotalBase.toFixed(2)} €</span></div>
      <div class="total-row"><span>IVA (${intracomunitario ? "0% — exento" : "21%"})</span><span>${subtotalVAT.toFixed(2)} €</span></div>
      ${discounts > 0 ? `<div class="total-row"><span>Descuentos</span><span>-${discounts.toFixed(2)} €</span></div>` : ""}
      <div class="total-row final"><span>TOTAL FACTURA</span><span>${totalFinal.toFixed(2)} €</span></div>
    </div>
  </div>

  <!-- VeriFactu QR + hash -->
  ${
    verifactuHash || verifactuQR
      ? `
  <div style="margin-top:24px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:flex;gap:20px;align-items:flex-start;">
    <div style="flex:1;">
      <p style="font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a3a5c;margin-bottom:6px;">Verificación VeriFactu</p>
      ${verifactuHash ? `<p style="font-size:7.5pt;color:#6b7280;margin-bottom:3px;">Hash SHA-256: <span style="font-family:monospace;color:#374151;">${verifactuHash.slice(0, 32)}…</span></p>` : ""}
      ${verifactuStatus ? `<p style="font-size:7.5pt;color:#6b7280;">Estado: <span style="font-weight:600;">${verifactuStatus}</span></p>` : ""}
      ${verifactuQR ? `<p style="font-size:7pt;color:#9ca3af;margin-top:4px;word-break:break-all;">Verificar en: ${verifactuQR}</p>` : ""}
    </div>
  </div>`
      : ""
  }

  <!-- Footer legal -->
  <div class="footer">
    Factura expedida conforme al Reglamento de facturación (Real Decreto 1619/2012, de 30 de noviembre).<br>
    ${intracomunitario ? "Operación exenta de IVA. Inversión del sujeto pasivo (art. 25 LIVA, Ley 37/1992).<br>" : ""}
    ${issuerName} &mdash; CIF: ${issuerCIF} &mdash; ${issuerEmail} &mdash; Tel: ${issuerPhone}
  </div>

</div>
</body>
</html>`;
}

/** Opens the invoice in a new window and triggers print dialog */
export function printInvoice(data: InvoiceData): void {
  const html = generateInvoiceHTML(data);
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 500);
}

/** Build invoice data from a localStorage order object */
export function buildInvoiceFromOrder(
  order: {
    id: string;
    date: string;
    items: { name: string; quantity?: number; qty?: number; price: number }[];
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
      pais?: string;
    };
    pago?: string;
  },
  invoiceNumber: string,
): InvoiceData {
  const addr = order.shippingAddress ?? {};
  return {
    invoiceNumber,
    date: order.date,
    paymentMethod: order.pago ?? "Tarjeta",
    issuerName: "TCG Academy S.L.",
    issuerCIF: "B12345678",
    issuerAddress: "Calle Ejemplo 1, Local 4",
    issuerCity: "28001 Madrid, España",
    issuerPhone: "+34 91 000 00 00",
    issuerEmail: "facturacion@tcgacademy.es",
    clientName:
      `${addr.nombre ?? ""} ${addr.apellidos ?? ""}`.trim() || "Cliente",
    clientAddress: addr.direccion,
    clientCity: addr.cp
      ? `${addr.cp} ${addr.ciudad ?? ""}`.trim()
      : addr.ciudad,
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity ?? i.qty ?? 1,
      unitPriceWithVAT: i.price,
      vatRate: 21,
    })),
    shipping: order.shipping ?? 0,
    couponCode: order.coupon?.code,
    couponDiscount: order.couponDiscount ?? 0,
    pointsDiscount: order.pointsDiscount ?? 0,
  };
}

/** Generate sequential invoice number */
export function generateInvoiceNumber(orderId: string): string {
  // Extract year from order ID (TCG-20260328-1234 → 2026)
  const match = orderId.match(/TCG-(\d{4})/);
  const year = match ? match[1] : new Date().getFullYear().toString();
  // Use last 5 chars of order ID as sequence
  const seq = orderId.slice(-5).replace(/\D/g, "").padStart(5, "0");
  return `FAC-${year}-${seq}`;
}
