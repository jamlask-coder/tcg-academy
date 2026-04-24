/**
 * Template personalizable de factura — guardado en localStorage.
 * Editable visualmente en /admin/fiscal/editor-factura
 */

export interface InvoiceTemplate {
  // ── Márgenes de página ──
  paddingTop: number; // mm — distancia desde el borde superior hasta el logo
  paddingX: number; // mm — margen horizontal
  paddingBottom: number; // mm

  // ── Colores ──
  primaryColor: string; // azul del encabezado "FACTURA" y cabecera de tabla
  accentColor: string; // naranja/amber de "Academy"
  totalBorderColor: string; // borde del cuadro TOTAL
  totalBgColor: string; // fondo del cuadro TOTAL
  totalTextColor: string; // texto del cuadro TOTAL

  // ── Logo / marca ──
  logoSize: number; // px
  brandName: string; // "TCG Academy"
  brandSub: string; // subtítulo bajo la marca
  showBrandSub: boolean;

  // ── Marca de agua ──
  watermarkEnabled: boolean;
  watermarkOpacity: number; // 0.01 - 0.5
  watermarkSize: number; // % del ancho del wrapper
  watermarkY: number; // % vertical (0=arriba, 50=centro, 100=abajo)

  // ── Espaciados (px) ──
  gapAfterHeader: number;
  gapAfterParties: number;
  gapAfterOrderBar: number;
  gapAfterTable: number;

  // ── Bloques visibles ──
  showOrderBar: boolean; // barra Nº pedido / fecha / pago
  showDiscountsCard: boolean; // tarjeta verde con descuentos
  showVatBreakdown: boolean; // desglose IVA por tipo
  showLegal: boolean; // nota legal al pie
  showVerifactu: boolean; // CSV + QR al pie

  // ── Etiquetas personalizables ──
  labelTitle: string; // "FACTURA"
  labelClient: string; // "Datos del cliente"
  labelIssuer: string; // "Datos del negocio"
  labelOrderNum: string; // "Nº Pedido"
  labelEmissionDate: string; // "Fecha emisión"
  labelOperationDate: string; // "Fecha operación"
  labelPaymentMethod: string; // "Forma de pago"
  legalText: string; // texto legal personalizable
}

export const DEFAULT_TEMPLATE: InvoiceTemplate = {
  paddingTop: 14,
  paddingX: 17,
  paddingBottom: 22,

  primaryColor: "#2563eb",
  accentColor: "#f59e0b",
  totalBorderColor: "#111827",
  totalBgColor: "#ffffff",
  totalTextColor: "#111827",

  logoSize: 190,
  brandName: "TCG Academy",
  brandSub: "Tienda especialista en TCG",
  showBrandSub: true,

  watermarkEnabled: true,
  watermarkOpacity: 0.08,
  watermarkSize: 55,
  watermarkY: 55,

  gapAfterHeader: 36,
  gapAfterParties: 14,
  gapAfterOrderBar: 18,
  gapAfterTable: 14,

  showOrderBar: true,
  showDiscountsCard: true,
  showVatBreakdown: true,
  showLegal: true,
  showVerifactu: true,

  labelTitle: "FACTURA",
  labelClient: "Datos del cliente",
  labelIssuer: "Datos del negocio",
  labelOrderNum: "Nº Pedido",
  labelEmissionDate: "Fecha emisión",
  labelOperationDate: "Fecha operación",
  labelPaymentMethod: "Forma de pago",
  legalText:
    "Factura expedida conforme al Reglamento de facturación (Real Decreto 1619/2012, de 30 de noviembre).",
};

const STORAGE_KEY = "tcgacademy_invoice_template";

export function loadInvoiceTemplate(): InvoiceTemplate {
  if (typeof window === "undefined") return DEFAULT_TEMPLATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TEMPLATE;
    const parsed = JSON.parse(raw) as Partial<InvoiceTemplate>;
    // Merge with defaults so new fields added later are backfilled
    return { ...DEFAULT_TEMPLATE, ...parsed };
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

function notifyTemplateUpdated(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event("tcga:invoice_template:updated"));
  } catch { /* non-fatal */ }
}

export function saveInvoiceTemplate(t: InvoiceTemplate): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    notifyTemplateUpdated();
  } catch {
    /* ignore */
  }
}

export function resetInvoiceTemplate(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    notifyTemplateUpdated();
  } catch {
    /* ignore */
  }
}
