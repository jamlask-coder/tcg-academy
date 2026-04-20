/**
 * Tipos fiscales completos para el sistema VeriFactu / facturación española.
 *
 * Base legal:
 * - Real Decreto 1619/2012 (Reglamento de facturación)
 * - Ley 11/2021 (Ley Antifraude)
 * - Real Decreto 1007/2023 (Reglamento VeriFactu / Sistemas informáticos de facturación)
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

/** Tipo de factura según RD 1619/2012 */
export enum InvoiceType {
  /** Factura completa con todos los datos del receptor */
  COMPLETA = "completa",
  /** Factura simplificada (antes "ticket") — art. 10 RD 1619/2012 */
  SIMPLIFICADA = "simplificada",
  /** Factura rectificativa — art. 15 RD 1619/2012 */
  RECTIFICATIVA = "rectificativa",
}

/** Estado del ciclo de vida de la factura */
export enum InvoiceStatus {
  /** Factura generada pero no procesada */
  EMITIDA = "emitida",
  /** Enviada al sistema AEAT / VeriFactu */
  ENVIADA_AEAT = "enviada_aeat",
  /** Aceptada y verificada por AEAT */
  VERIFICADA = "verificada",
  /** Rechazada por AEAT (requiere corrección y reenvío) */
  RECHAZADA = "rechazada",
  /** Factura anulada — debe acompañarse de rectificativa si procede */
  ANULADA = "anulada",
}

/** Estado de la factura en el sistema VeriFactu */
export enum VerifactuStatus {
  /** Pendiente de envío al proveedor VeriFactu */
  PENDIENTE = "pendiente",
  /** Enviada al proveedor, esperando confirmación */
  ENVIADA = "enviada",
  /** Aceptada por el sistema VeriFactu / AEAT */
  ACEPTADA = "aceptada",
  /** Rechazada — ver campo `verifactuError` para detalle */
  RECHAZADA = "rechazada",
}

/** Tipo de identificación fiscal */
export enum TaxIdType {
  /** NIF español (personas físicas) */
  NIF = "NIF",
  /** CIF español (personas jurídicas) */
  CIF = "CIF",
  /** NIE (extranjeros residentes) */
  NIE = "NIE",
  /** VAT número intracomunitario (empresas UE) */
  VAT_EU = "VAT_EU",
  /** Pasaporte (extranjeros sin NIF/NIE) */
  PASSPORT = "PASSPORT",
}

/** Tipo de corrección en facturas rectificativas — art. 15.3 RD 1619/2012 */
export enum CorrectionType {
  /** La rectificativa recoge solo las diferencias respecto a la original */
  DIFERENCIAS = "diferencias",
  /** La rectificativa sustituye íntegramente a la original */
  SUSTITUCION = "sustitucion",
}

/** Método de pago */
export enum PaymentMethod {
  TARJETA = "tarjeta",
  TRANSFERENCIA = "transferencia",
  EFECTIVO = "efectivo",
  BIZUM = "bizum",
  PAYPAL = "paypal",
  CONTRA_REEMBOLSO = "contra_reembolso",
}

// ─── Direcciones y datos empresa ────────────────────────────────────────────

/** Dirección fiscal completa */
export interface FiscalAddress {
  street: string;
  /** Número, piso, puerta (puede ir en street o separado) */
  streetExtra?: string;
  city: string;
  postalCode: string;
  province: string;
  country: string;
  /** Código ISO 3166-1 alpha-2 (ES, FR, DE…) */
  countryCode: string;
}

/** Datos de empresa / persona jurídica */
export interface CompanyData {
  /** Razón social o nombre completo */
  name: string;
  /** NIF, CIF, NIE, VAT intracomunitario… */
  taxId: string;
  taxIdType: TaxIdType;
  address: FiscalAddress;
  phone: string;
  email: string;
  /** true si el NIF es intracomunitario (IVA 0% en B2B UE) */
  isEU: boolean;
  /** Código ISO 3166-1 alpha-2 */
  countryCode: string;
  /**
   * Receptor en régimen especial de recargo de equivalencia (RE).
   * Obliga a añadir recargo a cada línea: 21%→5.2% / 10%→1.4% / 4%→0.5%.
   * Normalmente minoristas personas físicas o comunidades de bienes.
   */
  recargoEquivalencia?: boolean;
}

/** Datos de cliente particular (sin NIF obligatorio) */
export interface CustomerData {
  name: string;
  /** Puede estar vacío en facturas simplificadas */
  taxId?: string;
  taxIdType?: TaxIdType;
  address?: FiscalAddress;
  email?: string;
  phone?: string;
  countryCode: string;
  /** Ver {@link CompanyData.recargoEquivalencia}. */
  recargoEquivalencia?: boolean;
}

// ─── Líneas de factura ───────────────────────────────────────────────────────

/** Una línea de la factura */
export interface InvoiceLineItem {
  lineNumber: number;
  /** ID del producto en el sistema */
  productId: string;
  description: string;
  quantity: number;
  /** Precio unitario SIN IVA */
  unitPrice: number;
  /** Porcentaje de descuento (0-100) */
  discount: number;
  /** Importe del descuento calculado */
  discountAmount: number;
  /** Base imponible de la línea (unitPrice × qty − discount) */
  taxableBase: number;
  /** Tipo de IVA aplicable: 21 (general), 10 (reducido), 4 (superreducido), 0 (exento) */
  vatRate: 0 | 4 | 10 | 21;
  /** Cuota de IVA de la línea */
  vatAmount: number;
  /**
   * Recargo de equivalencia (solo para mayoristas / régimen especial).
   * Tipos: 21% → 5.2%, 10% → 1.4%, 4% → 0.5%, 0% → 0%
   */
  surchargeRate: 0 | 0.5 | 1.4 | 5.2;
  surchargeAmount: number;
  /** Total de la línea incluyendo IVA y recargo */
  totalLine: number;
}

// ─── Desglose fiscal ─────────────────────────────────────────────────────────

/**
 * Desglose de impuestos por tipo de IVA.
 * Una factura puede tener múltiples TaxBreakdown si tiene líneas con distintos tipos.
 */
export interface TaxBreakdown {
  vatRate: 0 | 4 | 10 | 21;
  taxableBase: number;
  vatAmount: number;
  surchargeRate: 0 | 0.5 | 1.4 | 5.2;
  surchargeAmount: number;
  total: number;
}

// ─── Totales de factura ───────────────────────────────────────────────────────

/** Totales globales de la factura */
export interface InvoiceTotals {
  /** Suma de todas las bases imponibles */
  totalTaxableBase: number;
  /** Suma de todas las cuotas de IVA */
  totalVAT: number;
  /** Suma de todos los recargos de equivalencia */
  totalSurcharge: number;
  /** Total de la factura = base + IVA + recargo */
  totalInvoice: number;
  /** Importe ya pagado (puede ser parcial) */
  totalPaid: number;
  /** Importe pendiente de pago */
  totalPending: number;
  /** Siempre EUR para operaciones en España */
  currency: "EUR";
}

// ─── Datos de rectificación ───────────────────────────────────────────────────

/** Datos requeridos en facturas rectificativas — art. 15 RD 1619/2012 */
export interface CorrectionData {
  /** ID interno de la factura original que se rectifica */
  originalInvoiceId: string;
  /** Número de factura original (visible en el documento) */
  originalInvoiceNumber: string;
  /** Fecha de la factura original */
  originalInvoiceDate: Date;
  correctionType: CorrectionType;
  /** Descripción del motivo de la rectificación */
  reason: string;
  /**
   * Código de causa según AEAT VeriFactu:
   * R1 = Error fundado en derecho
   * R2 = Concurso de acreedores
   * R3 = Deudor no establecido en TAI
   * R4 = Otras causas
   * R5 = Factura simplificada
   */
  reasonCode: "R1" | "R2" | "R3" | "R4" | "R5";
}

// ─── Registro de factura principal ───────────────────────────────────────────

/**
 * Registro completo de una factura verificable.
 * Almacena todos los datos necesarios para VeriFactu y el libro de facturas.
 */
export interface InvoiceRecord {
  /** ID único interno (UUID) */
  invoiceId: string;
  /** Número de factura visible: FAC-YYYY-NNNNN */
  invoiceNumber: string;
  /** Fecha de expedición de la factura */
  invoiceDate: Date;
  /**
   * Fecha de la operación (si es distinta a la fecha de factura).
   * Ejemplo: venta del 30/12, factura emitida el 02/01.
   */
  operationDate: Date;
  invoiceType: InvoiceType;
  /** Emisor: siempre TCG Academy (datos de SITE_CONFIG) */
  issuer: CompanyData;
  /** Receptor: empresa (CompanyData) o particular (CustomerData) */
  recipient: CompanyData | CustomerData;
  items: InvoiceLineItem[];
  /**
   * Desglose fiscal agrupado por tipo de IVA.
   * Puede haber 1-4 entradas (21%, 10%, 4%, 0%).
   */
  taxBreakdown: TaxBreakdown[];
  totals: InvoiceTotals;
  paymentMethod: PaymentMethod;
  paymentDate: Date | null;
  status: InvoiceStatus;
  /**
   * Hash SHA-256 del contenido de la factura.
   * Formato: campos clave concatenados y hasheados.
   * Inmutable una vez generado.
   */
  verifactuHash: string | null;
  /**
   * Hash encadenado = SHA-256(hash_actual + hash_anterior).
   * Garantiza la integridad de la cadena de facturas (VeriFactu).
   */
  verifactuChainHash: string | null;
  /**
   * URL para el código QR verificable ante la AEAT.
   * Formato: https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?...
   */
  verifactuQR: string | null;
  verifactuStatus: VerifactuStatus;
  /** Timestamp de la última comunicación con el sistema VeriFactu */
  verifactuTimestamp: Date | null;
  /** Mensaje de error de VeriFactu si fue rechazada */
  verifactuError: string | null;
  /** Hash encadenado de la factura ANTERIOR (permite verificar la cadena) */
  previousInvoiceChainHash: string | null;
  /** Datos de rectificación (solo si invoiceType === RECTIFICATIVA) */
  correctionData: CorrectionData | null;
  /** ID del pedido de origen (referencia cruzada) */
  sourceOrderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Registro de auditoría: acciones realizadas sobre esta factura */
  auditLog: AuditLogEntry[];
  /** Datos extra para necesidades futuras */
  metadata: Record<string, unknown>;
}

// ─── Auditoría ───────────────────────────────────────────────────────────────

/** Entrada del log de auditoría de una factura */
export interface AuditLogEntry {
  timestamp: Date;
  /** ID del usuario que realizó la acción */
  userId: string;
  userName: string;
  action: AuditAction;
  /** Descripción detallada de la acción */
  detail: string;
  /** IP del usuario (opcional, para trazabilidad) */
  ipAddress?: string;
}

export enum AuditAction {
  CREADA = "creada",
  IMPRESA = "impresa",
  DESCARGADA = "descargada",
  ENVIADA_VERIFACTU = "enviada_verifactu",
  RECTIFICADA = "rectificada",
  ANULADA = "anulada",
  EXPORTADA = "exportada",
  MIGRADA = "migrada",
}

// ─── Respuestas del proveedor VeriFactu ──────────────────────────────────────

/** Respuesta estándar del proveedor VeriFactu */
export interface VerifactuResponse {
  success: boolean;
  invoiceId: string;
  /** Identificador asignado por el proveedor */
  providerId?: string;
  status: VerifactuStatus;
  /** Timestamp de aceptación por AEAT */
  aeatTimestamp?: Date;
  /** Código de error AEAT si fue rechazada */
  errorCode?: string;
  errorMessage?: string;
  /** QR URL asignado por AEAT */
  qrUrl?: string;
}

/** Estado detallado de una factura en VeriFactu */
export interface VerifactuStatusDetail {
  invoiceId: string;
  status: VerifactuStatus;
  lastChecked: Date;
  aeatReference?: string;
}
