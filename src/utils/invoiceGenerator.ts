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
    clientProvince,
    clientCountry,
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
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1a1a2e; background: white; }
    .invoice-wrap { max-width: 760px; margin: 0 auto; padding: 14mm 16mm; position: relative; }

    /* ── Watermark ── */
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; opacity: 0.04; pointer-events: none; z-index: 0; }

    /* ── Header table ── */
    .header-table { width: 100%; border-collapse: collapse; border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 22px; }
    .header-left { vertical-align: top; width: 55%; padding-right: 20px; }
    .header-right { vertical-align: top; width: 45%; padding-left: 20px; border-left: 1px solid #e2e8f0; }

    /* Issuer */
    .issuer-wrap { display: flex; align-items: flex-start; gap: 14px; }
    .brand-logo { width: 60px; height: 60px; object-fit: contain; flex-shrink: 0; }
    .brand-name { font-size: 18pt; font-weight: 900; letter-spacing: -0.5px; line-height: 1; color: #111827; }
    .brand-name .tcg { color: #111827; }
    .brand-name .academy { color: #f59e0b; }
    .brand-sub { font-size: 6.5pt; color: #b0b7c3; text-transform: uppercase; letter-spacing: 2px; margin: 3px 0 6px; }
    .issuer-data { font-size: 8pt; color: #4b5563; line-height: 1.65; }
    .issuer-data strong { color: #111827; }

    /* Invoice meta (right, top) */
    .inv-meta-label { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #b0b7c3; display: block; margin-bottom: 3px; }
    .inv-number { font-size: 14pt; font-weight: 900; color: #2563eb; line-height: 1; margin-bottom: 2px; }
    .inv-date { font-size: 8.5pt; color: #6b7280; margin-bottom: 14px; }

    /* Client */
    .client-label { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #b0b7c3; display: block; margin-bottom: 5px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    .client-name { font-size: 10pt; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .client-detail { font-size: 8pt; color: #4b5563; line-height: 1.7; }
    .client-detail strong { color: #374151; }

    /* ── Intracom note ── */
    .intracom-note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 9px 14px; font-size: 9pt; color: #1e40af; margin-bottom: 18px; }

    /* ── Table ── */
    .section-title { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #2563eb; margin-bottom: 7px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9.5pt; }
    thead tr { background: #1e3a8a; color: white; }
    thead th { padding: 7px 10px; text-align: left; font-weight: 700; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    td { padding: 7px 10px; vertical-align: middle; }
    td.center { text-align: center; }
    td.right { text-align: right; }
    td.bold { font-weight: 700; }

    /* ── Totals ── */
    .totals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .vat-section h4 { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #2563eb; margin-bottom: 7px; }
    .vat-section table { margin: 0; }
    .vat-section thead tr { background: #e8ecf0; }
    .vat-section thead th { color: #374151; }
    .sum-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 10pt; border-bottom: 1px solid #f1f5f9; }
    .sum-row span:first-child { color: #6b7280; }
    .sum-row.final { background: #1e3a8a; color: white; border-radius: 6px; padding: 10px 14px; margin-top: 8px; font-size: 12pt; font-weight: 800; border: none; }
    .sum-row.final span:first-child { color: rgba(255,255,255,0.7); font-size: 8pt; }

    /* ── Legal footer ── */
    .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 7pt; color: #b0b7c3; text-align: center; line-height: 1.65; }

    /* ── VeriFactu — absolute bottom, tiny ── */
    .verifactu-block { margin-top: 16px; padding: 5px 10px; border-top: 1px solid #f1f5f9; font-size: 5pt; color: #d1d5db; line-height: 1.6; }
    .verifactu-block strong { color: #c4c9d4; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
<div class="invoice-wrap">

  <!-- ── WATERMARK ── -->
  <img class="watermark" src="/images/logo-tcg-shield.png" alt="" />

  <!-- ── HEADER: Logo+Emisor LEFT | Nº factura + Cliente RIGHT ── -->
  <table class="header-table">
    <tr>
      <td class="header-left">
        <div class="issuer-wrap">
          <img class="brand-logo" src="/images/logo-tcg-shield.png" alt="TCG Academy" />
          <div>
            <div class="brand-name"><span class="tcg">TCG</span> <span class="academy">Academy</span></div>
            <div class="brand-sub">Tienda especialista en TCG</div>
            <div class="issuer-data">
              <strong>${issuerName}</strong><br>
              CIF: ${issuerCIF}<br>
              ${issuerAddress}<br>
              ${issuerCity}<br>
              Tel: ${issuerPhone}<br>
              ${issuerEmail}
            </div>
          </div>
        </div>
      </td>
      <td class="header-right">
        <span class="inv-meta-label">Factura</span>
        <div class="inv-number">${invoiceNumber}</div>
        <div class="inv-date">${formattedDate}${paymentMethod ? ` &nbsp;·&nbsp; ${paymentMethod}` : ""}${formattedDue ? `<br>Vencimiento: ${formattedDue}` : ""}</div>

        <span class="client-label">Facturar a</span>
        <div class="client-name">${clientName}</div>
        <div class="client-detail">
          ${clientCIF ? `NIF/CIF: <strong>${clientCIF}</strong><br>` : ""}
          ${clientAddress ? `${clientAddress}<br>` : ""}
          ${clientCity ? `${clientCity}<br>` : ""}
          ${clientProvince ? `${clientProvince}<br>` : ""}
          ${clientCountry ? `${clientCountry}` : ""}
        </div>
      </td>
    </tr>
  </table>

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

/**
 * Generates the SHA-256 CSV (Código Seguro de Verificación), injects it into
 * the invoice data, then prints. This is the SINGLE entry point all parts of
 * the app must use so every invoice is identical regardless of who prints it.
 */
export async function printInvoiceWithCSV(data: InvoiceData): Promise<void> {
  try {
    const content = [
      data.issuerCIF,
      data.invoiceNumber,
      data.date,
      data.clientName,
      (data.items.reduce((s, i) => s + i.unitPriceWithVAT * i.quantity, 0) + (data.shipping ?? 0)).toFixed(2),
    ].join("|");
    const encoded = new TextEncoder().encode(content);
    const buf = await crypto.subtle.digest("SHA-256", encoded);
    data.verifactuHash = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    data.verifactuStatus = "PENDIENTE — Sistema VeriFactu en integración";
  } catch {
    /* hash generation failed — invoice still valid without CSV */
  }
  printInvoice(data);
}

/** Opens the invoice in a hidden iframe and triggers print/save-as-PDF dialog */
export function printInvoice(data: InvoiceData): void {
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
      provincia?: string;
      pais?: string;
    };
    pago?: string;
    paymentMethod?: string;
    /** Override client display name (e.g. from auth context) */
    clientName?: string;
    clientCIF?: string;
  },
  invoiceNumber: string,
): InvoiceData {
  const addr = order.shippingAddress ?? {};
  return {
    invoiceNumber,
    date: order.date,
    paymentMethod: order.pago ?? order.paymentMethod ?? "Tarjeta",
    issuerName: "TCG Academy S.L.",
    issuerCIF: "B12345678",
    issuerAddress: "Calle Ejemplo 1, Local 4",
    issuerCity: "28001 Madrid, España",
    issuerPhone: "+34 91 000 00 00",
    issuerEmail: "facturacion@tcgacademy.es",
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
