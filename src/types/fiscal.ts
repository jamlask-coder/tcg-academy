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
  DATAFONO = "datafono",
  TRANSFERENCIA = "transferencia",
  EFECTIVO = "efectivo",
  BIZUM = "bizum",
  PAYPAL = "paypal",
  /** Mantenido por compatibilidad con facturas históricas. No usar para nuevas. */
  CONTRA_REEMBOLSO = "contra_reembolso",
}

/**
 * Origen de la factura — se refleja como sufijo letra en el número
 * (FAC-YYYY-NNNNNXXXXX<O>). Determinista e inmutable una vez emitida.
 *
 * - E = Electrónica / web (pedido desde la tienda online)
 * - P = Presencial (venta en tienda física, da igual medio de pago)
 *
 * Los valores T (TPV), M (Manual) y B (B2B) se mantienen sólo para facturas
 * históricas que ya hubieran podido emitirse con esos sufijos. NO usar
 * para nuevas facturas — el operador elige E o P.
 */
export enum InvoiceOrigin {
  WEB = "E",
  PRESENCIAL = "P",
  /**
   * Factura rectificativa — Art. 15 RD 1619/2012. Sufijo "R" en el número de
   * factura para distinguirla visualmente en el libro y en el 303/390/349.
   * Se aplica automáticamente al usar `rectifyInvoice()`; no es seleccionable
   * en los forms de emisión normal.
   */
  RECTIFICATIVA = "R",
  /** @deprecated Usar PRESENCIAL. Se conserva para compat de facturas antiguas. */
  TPV = "T",
  /** @deprecated Usar PRESENCIAL. Se conserva para compat de facturas antiguas. */
  MANUAL = "M",
  /** @deprecated Usar PRESENCIAL. Se conserva para compat de facturas antiguas. */
  B2B = "B",
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

// ─── Albaranes (delivery notes) ──────────────────────────────────────────────

// ─── Facturas recibidas (proveedores) ───────────────────────────────────────

/**
 * Estado de pago de una factura de proveedor.
 * - PENDIENTE: registrada pero aún sin pagar.
 * - PAGADA: liquidada (transferencia/efectivo/etc.).
 * - DISPUTADA: en disputa con el proveedor (no se considera deducible hasta resolverse).
 */
export enum SupplierInvoiceStatus {
  PENDIENTE = "pendiente",
  PAGADA = "pagada",
  DISPUTADA = "disputada",
}

/**
 * Categoría operativa de la compra — útil para reporting interno y para el
 * libro registro IRPF/IS, no afecta al cálculo IVA.
 */
export type SupplierInvoiceCategory =
  | "mercaderias" // sobres/cartas/displays para reventa
  | "alquiler" // local físico (genera Mod 115)
  | "suministros" // luz/agua/internet
  | "servicios_profesionales" // gestoría, abogados (genera Mod 111)
  | "transporte"
  | "marketing"
  | "material_oficina"
  | "amortizable" // inmovilizado (>300€ y >1 año vida útil)
  | "otros";

/**
 * Línea de una factura de proveedor.
 * Estructura simétrica a {@link InvoiceLineItem} pero pensada para el lado
 * "soportado": deductiblePct permite reflejar prorrata o gastos mixtos
 * (ej: móvil 50% empresa / 50% personal).
 */
export interface SupplierInvoiceLine {
  description: string;
  /** Cantidad — opcional, normalmente 1 para servicios */
  quantity: number;
  /** Importe sin IVA */
  taxableBase: number;
  vatRate: 0 | 4 | 10 | 21;
  vatAmount: number;
  /**
   * Porcentaje deducible (0-100). Habitual: 100 para mercadería, 50 para
   * gastos mixtos (ej. móvil), 0 para gastos no deducibles fiscalmente.
   */
  deductiblePct: number;
  /** vatAmount × deductiblePct/100 */
  deductibleVAT: number;
  /**
   * Retención IRPF practicada en factura (solo proveedores profesionales,
   * habitualmente 15% — alimenta Modelo 111). 0 si no aplica.
   */
  retentionPct: number;
  retentionAmount: number;
  /** Total de la línea = base + IVA − retención */
  totalLine: number;
}

/**
 * Factura recibida de proveedor.
 *
 * NO entra en la cadena VeriFactu (esa es solo para emitidas). Pero alimenta:
 *  - Modelo 303 → IVA soportado deducible (casillas 28-39)
 *  - Modelo 390 → resumen anual IVA soportado
 *  - Modelo 347 → terceros con quien se opera >3.005,06€/año
 *  - Modelo 111/115 → retenciones practicadas a profesionales/arrendadores
 *  - P&G → gastos deducibles (afecta Modelo 200/202)
 *
 * Inmutable una vez registrada (excepto status de pago); para correcciones,
 * registrar una nueva línea con valores negativos o anular y re-registrar.
 */
export interface SupplierInvoiceRecord {
  /** ID interno (sin relevancia fiscal externa) */
  id: string;
  /**
   * Número de factura tal como lo emitió el proveedor — texto libre porque no
   * controlamos su numeración (puede ser "F2026/123", "INV-0001", etc.).
   */
  supplierInvoiceNumber: string;
  /** Fecha de expedición (la del documento del proveedor) */
  invoiceDate: string; // ISO date "YYYY-MM-DD"
  /** Fecha de recepción (cuándo nos llegó/registramos) */
  receivedDate: string;
  /** Datos completos del proveedor (snapshot inmutable) */
  supplier: CompanyData;
  category: SupplierInvoiceCategory;
  lines: SupplierInvoiceLine[];
  /** Suma de todas las bases imponibles */
  totalTaxableBase: number;
  /** Suma de cuotas de IVA */
  totalVAT: number;
  /** Suma de IVA realmente deducible (puede ser inferior si hay prorrata) */
  totalDeductibleVAT: number;
  /** Suma de retenciones practicadas */
  totalRetention: number;
  /** Total a pagar al proveedor */
  totalInvoice: number;
  status: SupplierInvoiceStatus;
  paymentMethod: PaymentMethod | null;
  paymentDate: string | null;
  /** Notas internas (no fiscales) */
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Conciliación bancaria ───────────────────────────────────────────────────

/**
 * Tipo de movimiento bancario.
 * - "income": ingreso (cobros de clientes, devoluciones de proveedor, etc.).
 * - "expense": cargo (pagos a proveedores, comisiones, transferencias salientes).
 */
export type BankMovementType = "income" | "expense";

/**
 * Estado de conciliación de un movimiento bancario.
 * - "unmatched": sin emparejar — no hay candidato claro.
 * - "auto-matched": el sistema sugiere un emparejamiento (pendiente de revisar).
 * - "confirmed": el admin lo confirmó — se aplicaron los efectos (orden cobrada / factura pagada).
 * - "ignored": movimiento descartado (comisiones bancarias, transferencias internas, etc.).
 */
export type BankMovementStatus =
  | "unmatched"
  | "auto-matched"
  | "confirmed"
  | "ignored";

/** Confianza del emparejamiento automático. */
export type BankMatchConfidence = "exact" | "high" | "low";

/** Tipo de objetivo emparejado (a qué entidad apunta el movimiento). */
export type BankMatchTargetType = "order" | "supplier_invoice";

/**
 * Vínculo movimiento ↔ entidad.
 * `confidence` describe la calidad del match cuando es automático.
 * `method` distingue auto vs intervención manual del admin.
 */
export interface BankMatchTarget {
  type: BankMatchTargetType;
  /** ID de la entidad (orderId o supplierInvoiceId). */
  id: string;
  /** Importe del documento emparejado (para detectar discrepancias). */
  expectedAmount: number;
  confidence: BankMatchConfidence;
  method: "auto" | "manual";
}

/**
 * Movimiento bancario individual (una línea del extracto).
 *
 * `amount` es siempre con signo: positivo = ingreso, negativo = cargo.
 * `concept` es el campo de texto libre del banco (referencia, contrapartida, etc.).
 */
export interface BankMovement {
  id: string;
  /** Fecha contable (YYYY-MM-DD) */
  date: string;
  /** Fecha valor opcional (YYYY-MM-DD) */
  valueDate: string | null;
  /** Importe con signo: + ingreso, − cargo */
  amount: number;
  /** Tipo derivado del signo del importe */
  type: BankMovementType;
  /** Concepto/descripción del banco */
  concept: string;
  /** Referencia/numero documento si lo da el banco */
  reference: string;
  /** Contrapartida (titular del otro lado de la transferencia) */
  counterparty: string;
  /** IBAN contrapartida (si está) */
  counterpartyIban: string;
  status: BankMovementStatus;
  /** Vínculo con pedido o factura proveedor (si aplica) */
  matchedTo: BankMatchTarget | null;
  /** ID del lote de importación */
  importBatchId: string;
  importedAt: string;
  /** Notas manuales del admin */
  notes: string;
}

/**
 * Lote de importación CSV — agrupa los movimientos cargados juntos
 * para auditar y permitir deshacer.
 */
export interface BankImportBatch {
  id: string;
  importedAt: string;
  /** Origen del fichero (nombre del CSV o etiqueta) */
  source: string;
  /** Banco detectado (BBVA, Santander, etc.) o "generic" */
  bank: string;
  movementCount: number;
  totalIncome: number;
  totalExpense: number;
  /** Filas que no se pudieron parsear */
  errors: string[];
}

// ─── Albaranes (delivery notes) ──────────────────────────────────────────────

/**
 * Estado del albarán.
 * - PENDIENTE: emitido pero todavía sin facturar.
 * - FACTURADO: ya se generó una factura a partir de él (`invoiceId` no null).
 * - ANULADO: descartado manualmente (no se puede facturar).
 */
export enum DeliveryNoteStatus {
  PENDIENTE = "pendiente",
  FACTURADO = "facturado",
  ANULADO = "anulado",
}

/**
 * Albarán / nota de entrega.
 *
 * Documento de entrega que NO es una factura: no entra en la cadena VeriFactu,
 * no genera hash encadenado, no aparece en el Libro de Facturas ni en los
 * modelos 303/390/349. Su único propósito es documentar la entrega y, si
 * posteriormente se factura, queda trazado por `invoiceId` / `invoiceNumber`.
 *
 * La conversión a factura llama a `createInvoice()` del servicio canónico y
 * transfiere items/cliente/totales — solo entonces se crea el asiento,
 * la cadena VeriFactu y el registro en el libro.
 */
export interface DeliveryNoteRecord {
  /** ID único interno (UUID) */
  deliveryNoteId: string;
  /** Número visible: ALB-YYYY-NNNN (correlativo anual) */
  deliveryNoteNumber: string;
  /** Fecha de emisión del albarán */
  deliveryNoteDate: Date;
  /** Fecha de la operación (si es distinta a la emisión) */
  operationDate: Date;
  /** Emisor (snapshot igual que en factura) */
  issuer: CompanyData;
  /** Receptor (empresa o particular) */
  recipient: CompanyData | CustomerData;
  items: InvoiceLineItem[];
  taxBreakdown: TaxBreakdown[];
  totals: InvoiceTotals;
  paymentMethod: PaymentMethod;
  paymentDate: Date | null;
  status: DeliveryNoteStatus;
  /** ID del pedido de origen, si aplica */
  sourceOrderId: string | null;
  /**
   * Si el albarán ya se facturó: id y número de la factura resultante.
   * Null mientras el albarán esté PENDIENTE.
   */
  invoiceId: string | null;
  invoiceNumber: string | null;
  /** Timestamp del momento en que se convirtió a factura */
  invoicedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  auditLog: AuditLogEntry[];
  metadata: Record<string, unknown>;
}
