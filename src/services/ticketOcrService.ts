/**
 * Ticket OCR service — Lectura automática de facturas/tickets de proveedor.
 * =========================================================================
 *
 * El admin sube una foto del ticket o de la factura recibida. Tesseract.js
 * (re-utilizado del flujo de productos) extrae el texto y este módulo aplica
 * heurísticas regex para identificar:
 *   - Razón social y CIF del proveedor.
 *   - Número de factura.
 *   - Fecha (dd/mm/yyyy).
 *   - Bases imponibles e IVA por tipo (21/10/4/0).
 *   - Total.
 *   - Retenciones (-15% IRPF, alquileres -19%).
 *
 * El resultado se mapea a un esqueleto de `SupplierInvoiceRecord` que el
 * admin valida en el formulario antes de persistir vía supplierInvoiceService.
 *
 * Funciones puras: este módulo NO escribe nada.
 */

import { runOcrOnImages } from "@/lib/productIdentifier";

export interface OcrTicketLine {
  vatRate: 0 | 4 | 10 | 21;
  taxableBase: number;
  vatAmount: number;
}

export interface OcrTicketDraft {
  /** Razón social estimada del emisor (primeras líneas en mayúsculas) */
  supplierName: string;
  /** CIF/NIF detectado (puede no estar) */
  supplierCif: string;
  /** Dirección detectada (best-effort) */
  supplierAddress: string;
  /** Número visible: "Factura nº A-2026-0001", "Ticket 0123/45"… */
  invoiceNumber: string;
  /** Fecha en ISO YYYY-MM-DD */
  invoiceDate: string;
  /** Bases imponibles e IVA por tipo */
  lines: OcrTicketLine[];
  totalTaxableBase: number;
  totalVAT: number;
  /** Total factura (con IVA, antes de retención) */
  totalAmount: number;
  /** Retención detectada (importe positivo) — 0 si no hay */
  retentionAmount: number;
  /** Tipo de retención detectado: 15 (IRPF profesionales), 19 (alquileres), 0 */
  retentionPct: number;
  /** Confianza global (0-1) según cuántos campos se encontraron */
  confidence: number;
  /** Texto OCR bruto — para revisión manual */
  rawText: string;
  /** Avisos de campos no detectados */
  warnings: string[];
}

// ── Helpers regex ─────────────────────────────────────────────────────────

function parseAmount(raw: string): number {
  const cleaned = raw
    .replace(/€|EUR/gi, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Convierte fecha en formato dd/mm/yyyy o yyyy-mm-dd a ISO YYYY-MM-DD. */
function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  const dmy = trimmed.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const yyyy = y.length === 2 ? `20${y}` : y;
    return `${yyyy}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const ymd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

// ── Extractor principal ────────────────────────────────────────────────────

/**
 * Aplica las heurísticas regex sobre el texto OCR.
 * Devuelve un draft con los campos detectados; los que no aparezcan quedan
 * vacíos/0 con un warning correspondiente.
 */
export function extractTicketFields(ocrText: string): OcrTicketDraft {
  const text = ocrText.replace(/\u00a0/g, " ").replace(/\r/g, "");
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const warnings: string[] = [];

  // ── CIF / NIF ──
  // CIF empresarial: letra + 8 dígitos. NIF persona física: 8 dígitos + letra.
  // NIE: X/Y/Z + 7 dígitos + letra.
  const cifMatch = text.match(
    /\b([A-HJNPQRSUVW]\d{8}|[XYZ]\d{7}[A-Z]|\d{8}[A-Z])\b/i,
  );
  const supplierCif = cifMatch ? cifMatch[1].toUpperCase() : "";
  if (!supplierCif) warnings.push("CIF no detectado");

  // ── Razón social: primera línea no vacía con ≥3 chars y predominantemente
  //    mayúsculas (típico en headers de tickets). Limita a 80 chars.
  let supplierName = "";
  for (const ln of lines.slice(0, 6)) {
    const upperRatio =
      (ln.match(/[A-ZÑÁÉÍÓÚ]/g) ?? []).length / Math.max(1, ln.length);
    if (ln.length >= 3 && upperRatio > 0.5 && !/\d{6,}/.test(ln)) {
      supplierName = ln.slice(0, 80);
      break;
    }
  }
  if (!supplierName && lines.length > 0) supplierName = lines[0].slice(0, 80);
  if (!supplierName) warnings.push("Razón social no detectada");

  // ── Dirección (best-effort): primera línea con CP español + ciudad
  let supplierAddress = "";
  for (const ln of lines) {
    if (/\b\d{5}\b/.test(ln)) {
      supplierAddress = ln.slice(0, 160);
      break;
    }
  }

  // ── Número de factura ──
  const invMatch = text.match(
    /(?:factura|fact\.?|albar[áa]n|alb\.?|ticket|n[ºo°.])\s*(?:n[ºo°.])?\s*[:\-]?\s*([A-Z0-9][A-Z0-9/\-.]{2,20})/i,
  );
  const invoiceNumber = invMatch ? invMatch[1].trim() : "";
  if (!invoiceNumber) warnings.push("Número de factura no detectado");

  // ── Fecha ──
  let invoiceDate = "";
  const dateMatch = text.match(
    /\b(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})\b/,
  );
  if (dateMatch) {
    const iso = parseDate(dateMatch[1]);
    if (iso) invoiceDate = iso;
  }
  if (!invoiceDate) warnings.push("Fecha no detectada");

  // ── Líneas IVA ──
  // Patrones típicos en tickets:
  //   "IVA 21%  120,50 €"
  //   "Base imponible 21%   500,00"
  //   "BASE 100,00  IVA 21,00"
  const lineSet = new Map<number, OcrTicketLine>();
  // Variante 1: fila con tipo + base + cuota en la misma línea
  const tableRx =
    /(?:base|b\.imp|imponible)?[\s.]*?(?:al\s*)?(\d{1,2})\s*%[^\n]*?([\d.,]+)\s*€?[^\n]*?([\d.,]+)\s*€?/gi;
  // Variante 2 (más simple): "IVA NN% ... importe"
  const ivaRx = /\bIVA\s*(\d{1,2})\s*%[^\n]*?([\d.,]+)/gi;
  // Variante 3: "BASE 21% 500,00"
  const baseRx = /\b(?:base|imponible)[^\n]*?(\d{1,2})\s*%[^\n]*?([\d.,]+)/gi;

  const candidates: Array<{ rate: number; base?: number; vat?: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = ivaRx.exec(text)) !== null) {
    const rate = Number.parseInt(m[1], 10);
    const amt = parseAmount(m[2]);
    if ([0, 4, 10, 21].includes(rate)) candidates.push({ rate, vat: amt });
  }
  while ((m = baseRx.exec(text)) !== null) {
    const rate = Number.parseInt(m[1], 10);
    const amt = parseAmount(m[2]);
    if ([0, 4, 10, 21].includes(rate)) candidates.push({ rate, base: amt });
  }
  while ((m = tableRx.exec(text)) !== null) {
    const rate = Number.parseInt(m[1], 10);
    const amt1 = parseAmount(m[2]);
    const amt2 = parseAmount(m[3]);
    if ([0, 4, 10, 21].includes(rate) && amt1 > 0 && amt2 > 0) {
      // Asumimos que el menor es la cuota IVA
      const base = amt1 > amt2 ? amt1 : amt2;
      const vat = amt1 > amt2 ? amt2 : amt1;
      candidates.push({ rate, base, vat });
    }
  }

  for (const c of candidates) {
    if (!lineSet.has(c.rate)) {
      lineSet.set(c.rate, {
        vatRate: c.rate as OcrTicketLine["vatRate"],
        taxableBase: 0,
        vatAmount: 0,
      });
    }
    const ln = lineSet.get(c.rate)!;
    if (c.base !== undefined && ln.taxableBase === 0) ln.taxableBase = c.base;
    if (c.vat !== undefined && ln.vatAmount === 0) ln.vatAmount = c.vat;
  }

  // Si tenemos base sin cuota (o viceversa), completar por la fórmula.
  for (const [rate, ln] of lineSet) {
    if (ln.taxableBase > 0 && ln.vatAmount === 0) {
      ln.vatAmount = Math.round(((ln.taxableBase * rate) / 100) * 100) / 100;
    } else if (ln.vatAmount > 0 && ln.taxableBase === 0 && rate > 0) {
      ln.taxableBase = Math.round((ln.vatAmount / (rate / 100)) * 100) / 100;
    }
  }

  const ocrLines = Array.from(lineSet.values()).sort(
    (a, b) => b.vatRate - a.vatRate,
  );
  if (ocrLines.length === 0) warnings.push("Líneas IVA no detectadas");

  const totalTaxableBase =
    Math.round(ocrLines.reduce((s, l) => s + l.taxableBase, 0) * 100) / 100;
  const totalVAT =
    Math.round(ocrLines.reduce((s, l) => s + l.vatAmount, 0) * 100) / 100;

  // ── Total ──
  let totalAmount = 0;
  const totalMatch = text.match(
    /\b(?:total|importe\s*total|total\s*factura|total\s*a\s*pagar)\b[^\n]*?([\d.,]+)\s*€?/i,
  );
  if (totalMatch) totalAmount = parseAmount(totalMatch[1]);
  if (!totalAmount && totalTaxableBase > 0) {
    totalAmount = Math.round((totalTaxableBase + totalVAT) * 100) / 100;
  }
  if (!totalAmount) warnings.push("Total no detectado");

  // ── Retención ──
  let retentionPct = 0;
  let retentionAmount = 0;
  const retIrpf = text.match(/(?:IRPF|retenci[oó]n)\s*[\-\s]*(\d{1,2})\s*%/i);
  if (retIrpf) {
    retentionPct = Number.parseInt(retIrpf[1], 10);
    if (totalTaxableBase > 0) {
      retentionAmount =
        Math.round(((totalTaxableBase * retentionPct) / 100) * 100) / 100;
    }
  }

  // ── Confianza ──
  let conf = 0;
  if (supplierName) conf += 0.15;
  if (supplierCif) conf += 0.2;
  if (invoiceNumber) conf += 0.15;
  if (invoiceDate) conf += 0.15;
  if (ocrLines.length > 0) conf += 0.2;
  if (totalAmount > 0) conf += 0.15;

  return {
    supplierName,
    supplierCif,
    supplierAddress,
    invoiceNumber,
    invoiceDate,
    lines: ocrLines,
    totalTaxableBase,
    totalVAT,
    totalAmount,
    retentionAmount,
    retentionPct,
    confidence: Math.round(conf * 100) / 100,
    rawText: text,
    warnings,
  };
}

// ── API pública ────────────────────────────────────────────────────────────

/**
 * Procesa imágenes (data URLs / blob URLs) → OCR → extracción de campos.
 * Si tesseract.js no está disponible, devuelve un draft vacío con warning.
 */
export async function scanTicketImages(
  images: string[],
  onProgress?: (msg: string, pct: number) => void,
): Promise<OcrTicketDraft> {
  if (images.length === 0) {
    return emptyDraft(["Sin imágenes"]);
  }
  let ocrText = "";
  try {
    ocrText = await runOcrOnImages(images, (p) =>
      onProgress?.(p.message ?? "OCR", p.progress ?? 0),
    );
  } catch {
    return emptyDraft([
      "Tesseract no disponible — instala `tesseract.js` o introduce los datos manualmente",
    ]);
  }
  if (!ocrText.trim()) {
    return emptyDraft([
      "OCR sin texto reconocible — prueba con una foto más nítida",
    ]);
  }
  const draft = extractTicketFields(ocrText);
  return draft;
}

function emptyDraft(warnings: string[]): OcrTicketDraft {
  return {
    supplierName: "",
    supplierCif: "",
    supplierAddress: "",
    invoiceNumber: "",
    invoiceDate: "",
    lines: [],
    totalTaxableBase: 0,
    totalVAT: 0,
    totalAmount: 0,
    retentionAmount: 0,
    retentionPct: 0,
    confidence: 0,
    rawText: "",
    warnings,
  };
}
