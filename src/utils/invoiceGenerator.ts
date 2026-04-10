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
    @page { size: A4; margin: 16mm 18mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1a1a2e; background: white; }
    .invoice-wrap { max-width: 760px; margin: 0 auto; }

    /* ── Top header bar: logo+issuer LEFT | client RIGHT ── */
    .top-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 18px; border-bottom: 3px solid #2563eb; margin-bottom: 0; }

    .issuer-block { display: flex; align-items: flex-start; gap: 14px; }
    .brand-logo { width: 52px; height: 52px; object-fit: contain; flex-shrink: 0; }
    .brand-text { display: flex; flex-direction: column; gap: 1px; }
    .brand-name { font-size: 17pt; font-weight: 900; color: #2563eb; letter-spacing: -0.5px; line-height: 1; }
    .brand-name span { color: #f59e0b; }
    .brand-sub { font-size: 7pt; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px; }
    .issuer-data { font-size: 8.5pt; color: #4b5563; line-height: 1.65; }
    .issuer-data strong { color: #111827; font-size: 9pt; }

    .client-block { text-align: right; max-width: 240px; }
    .client-label { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #9ca3af; margin-bottom: 5px; }
    .client-name { font-size: 10.5pt; font-weight: 700; color: #111827; }
    .client-detail { font-size: 8.5pt; color: #4b5563; line-height: 1.65; margin-top: 2px; }

    /* ── Invoice banner: centered below header ── */
    .invoice-banner { background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px; padding: 14px 24px; margin-bottom: 24px; display: flex; justify-content: center; gap: 48px; }
    .banner-item { text-align: center; }
    .banner-label { font-size: 7pt; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; font-weight: 700; display: block; margin-bottom: 3px; }
    .banner-value { font-size: 10pt; font-weight: 700; color: #111827; }
    .banner-value.num { font-size: 13pt; color: #2563eb; }

    /* ── Intracom note ── */
    .intracom-note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 9px 14px; font-size: 9pt; color: #1e40af; margin-bottom: 18px; }

    /* ── Table ── */
    .section-title { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #2563eb; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9.5pt; }
    thead tr { background: #1e3a8a; color: white; }
    thead th { padding: 8px 11px; text-align: left; font-weight: 700; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    td { padding: 8px 11px; vertical-align: middle; }
    td.desc { max-width: 260px; }
    td.center { text-align: center; }
    td.right { text-align: right; }
    td.bold { font-weight: 700; }

    /* ── Totals ── */
    .totals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .vat-section h4 { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #2563eb; margin-bottom: 8px; }
    .vat-section table { margin: 0; }
    .vat-section thead tr { background: #e8ecf0; }
    .vat-section thead th { color: #374151; }

    .summary-section { }
    .sum-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 10pt; border-bottom: 1px solid #f1f5f9; }
    .sum-row span:first-child { color: #6b7280; }
    .sum-row.final { background: #1e3a8a; color: white; border-radius: 8px; padding: 11px 16px; margin-top: 8px; font-size: 12pt; font-weight: 800; border: none; }
    .sum-row.final span:first-child { color: rgba(255,255,255,0.7); font-size: 8.5pt; }

    /* ── Footer ── */
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 7.5pt; color: #9ca3af; text-align: center; line-height: 1.65; }

    /* ── VeriFactu / CSV — small, at the very bottom ── */
    .verifactu-block { margin-top: 14px; padding: 8px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 7pt; color: #9ca3af; line-height: 1.6; }
    .verifactu-block strong { color: #6b7280; font-size: 7pt; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
<div class="invoice-wrap">

  <!-- ── TOP HEADER: Logo+Issuer LEFT | Client RIGHT ── -->
  <div class="top-header">
    <div class="issuer-block">
      <img class="brand-logo" src="/images/logo-tcg-shield.svg" alt="TCG Academy" />
      <div class="brand-text">
        <span class="brand-name">TCG <span>Academy</span></span>
        <span class="brand-sub">Tienda especialista en TCG</span>
        <div class="issuer-data">
          <strong>${issuerName}</strong><br>
          CIF: ${issuerCIF}<br>
          ${issuerAddress}<br>
          ${issuerCity}<br>
          Tel: ${issuerPhone} &middot; ${issuerEmail}
        </div>
      </div>
    </div>
    <div class="client-block">
      <p class="client-label">Facturar a</p>
      <p class="client-name">${clientName}</p>
      <div class="client-detail">
        ${clientCIF ? `NIF/CIF: <strong>${clientCIF}</strong><br>` : ""}
        ${clientAddress ? `${clientAddress}<br>` : ""}
        ${clientCity ? `${clientCity}` : ""}
      </div>
    </div>
  </div>

  <!-- ── INVOICE BANNER: centered below header ── -->
  <div class="invoice-banner">
    <div class="banner-item">
      <span class="banner-label">Nº Factura</span>
      <span class="banner-value num">${invoiceNumber}</span>
    </div>
    <div class="banner-item">
      <span class="banner-label">Fecha emisión</span>
      <span class="banner-value">${formattedDate}</span>
    </div>
    ${formattedDue ? `<div class="banner-item"><span class="banner-label">Vencimiento</span><span class="banner-value">${formattedDue}</span></div>` : ""}
    ${paymentMethod ? `<div class="banner-item"><span class="banner-label">Forma de pago</span><span class="banner-value">${paymentMethod}</span></div>` : ""}
  </div>

  ${intracomunitario ? `<div class="intracom-note">⚠️ <strong>Operación intracomunitaria exenta de IVA</strong> — Art. 25 LIVA (Ley 37/1992). CIF intracomunitario verificado: ${clientCIF}</div>` : ""}

  <!-- ── LINE ITEMS ── -->
  <p class="section-title">Detalle de productos y servicios</p>
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
      ${shipping > 0 ? `
      <tr>
        <td class="desc">Gastos de envío</td>
        <td class="center">1</td>
        <td class="right">${shippingBase.toFixed(2)} €</td>
        <td class="right">${shippingVATRate}%</td>
        <td class="right bold">${shippingBase.toFixed(2)} €</td>
      </tr>` : ""}
      ${couponDiscount > 0 ? `
      <tr>
        <td class="desc" colspan="4" style="color:#16a34a">Descuento cupón ${couponCode ? `(${couponCode})` : ""}</td>
        <td class="right bold" style="color:#16a34a">-${couponDiscount.toFixed(2)} €</td>
      </tr>` : ""}
      ${pointsDiscount > 0 ? `
      <tr>
        <td class="desc" colspan="4" style="color:#d97706">Canje de puntos</td>
        <td class="right bold" style="color:#d97706">-${pointsDiscount.toFixed(2)} €</td>
      </tr>` : ""}
    </tbody>
  </table>

  <!-- ── TOTALS ── -->
  <div class="totals-grid">
    <div class="vat-section">
      <h4>Resumen IVA</h4>
      <table>
        <thead><tr><th>Tipo IVA</th><th class="right">Base Imp.</th><th class="right">Cuota IVA</th></tr></thead>
        <tbody>${vatRows}</tbody>
      </table>
    </div>
    <div class="summary-section">
      <div class="sum-row"><span>Base imponible</span><span>${subtotalBase.toFixed(2)} €</span></div>
      <div class="sum-row"><span>IVA (${intracomunitario ? "0% — exento" : "21%"})</span><span>${subtotalVAT.toFixed(2)} €</span></div>
      ${discounts > 0 ? `<div class="sum-row"><span>Descuentos aplicados</span><span>-${discounts.toFixed(2)} €</span></div>` : ""}
      <div class="sum-row final"><span>TOTAL FACTURA</span><span>${totalFinal.toFixed(2)} €</span></div>
    </div>
  </div>

  <!-- ── LEGAL FOOTER ── -->
  <div class="footer">
    Factura expedida conforme al Reglamento de facturación (Real Decreto 1619/2012, de 30 de noviembre).${intracomunitario ? "<br>Operación exenta de IVA. Inversión del sujeto pasivo (art. 25 LIVA, Ley 37/1992)." : ""}
    <br>${issuerName} &mdash; CIF: ${issuerCIF} &mdash; ${issuerEmail} &mdash; Tel: ${issuerPhone}
  </div>

  <!-- ── VERIFACTU / CSV — smallest, bottom ── -->
  ${verifactuHash || verifactuQR ? `
  <div class="verifactu-block">
    <strong>Verificación VeriFactu &mdash;</strong>
    ${verifactuHash ? ` SHA-256: <span style="font-family:monospace">${verifactuHash.slice(0, 40)}…</span>` : ""}
    ${verifactuStatus ? ` &middot; Estado: ${verifactuStatus}` : ""}
    ${verifactuQR ? `<br>Código QR verificación: <span style="font-family:monospace;word-break:break-all">${verifactuQR}</span>` : ""}
  </div>` : ""}

</div>
</body>
</html>`;
}

/** Opens the invoice in a new window and triggers print dialog */
export function printInvoice(data: InvoiceData): void {
  const html = generateInvoiceHTML(data);
  // Inject a <base> tag so relative image paths (logo, etc.) resolve from the origin
  const baseTag = `<base href="${window.location.origin}">`;
  const htmlWithBase = html.replace("<head>", `<head>${baseTag}`);
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(htmlWithBase);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 600);
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
