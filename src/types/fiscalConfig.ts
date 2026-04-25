/**
 * Configuración fiscal de la empresa — datos NO derivables del catálogo
 * que el sistema necesita conocer para auto-generar borradores de modelos
 * fiscales (115/180, 123/193, 202, 232, 369, 720, INTRASTAT).
 *
 * Persiste en localStorage bajo `tcgacademy_fiscal_config`.
 * Entidad SSOT: `fiscalConfig` en dataHub/registry.
 */

// ─── 115 / 180 — Retenciones por arrendamientos urbanos ─────────────────────

export interface RentalAgreement {
  id: string;
  /** Identificador del arrendador */
  arrendadorNif: string;
  arrendadorName: string;
  /** Dirección del inmueble alquilado */
  immuebleDireccion: string;
  /** Referencia catastral del inmueble (obligatorio en 115/180) */
  refCatastral?: string;
  /** Importe MENSUAL de alquiler (base imponible, sin IVA) */
  rentaMensualBase: number;
  /** Tipo de IVA aplicable (21% por defecto en alquileres locales no exentos) */
  vatRate: number;
  /** Tipo de retención IRPF aplicable (19% general) */
  retentionRate: number;
  /** Fecha de inicio del contrato (YYYY-MM-DD) */
  startDate: string;
  /** Fecha de fin (vacía si indefinido) */
  endDate?: string;
  /** ¿Está exento de retención? (caso muy raro: arrendamientos exentos cf. art. 75.3 RIRPF) */
  retentionExempt?: boolean;
  notes?: string;
}

// ─── 123 / 193 — Capital mobiliario (dividendos / intereses) ─────────────────

export interface DividendDistribution {
  id: string;
  /** YYYY-MM-DD del acuerdo de reparto */
  date: string;
  /** Beneficiario (NIF + nombre) */
  recipientNif: string;
  recipientName: string;
  /** Importe bruto del dividendo (base imponible) */
  grossAmount: number;
  /** Tipo de retención (19% general en IRPF) */
  retentionRate: number;
  notes?: string;
}

// ─── 202 — Pago fraccionado IS ──────────────────────────────────────────────

export type Modelo202Method =
  | "cuota" /** Art. 40.2 LIS — 18% sobre cuota última 200 */
  | "base"; /** Art. 40.3 LIS — % sobre resultado del período (obligatorio si CN >6M€) */

export interface Modelo202Config {
  method: Modelo202Method;
  /** Solo método "cuota": cuota íntegra del último modelo 200 presentado */
  lastIsCuota?: number;
  /** Solo método "base": tipo aplicable (17% general, 24% multinacional, etc.) */
  basePercentage?: number;
  /** Año del último 200 ingresado (para informar el cálculo) */
  lastIsYear?: number;
}

// ─── 232 — Operaciones vinculadas / paraísos fiscales ───────────────────────

export interface RelatedPartyOperation {
  id: string;
  /** Tipo de vinculación */
  relationship: "socio" | "administrador" | "grupo" | "paraiso" | "otra";
  /** Identificador de la parte vinculada */
  nif: string;
  name: string;
  /** Importe anual acumulado de operaciones con esta parte */
  annualAmount: number;
  /** Tipo de operación */
  opType: "venta" | "compra" | "servicio" | "prestamo" | "alquiler" | "otra";
  fiscalYear: number;
  notes?: string;
}

// ─── 720 — Bienes en el extranjero ──────────────────────────────────────────

export interface ForeignAsset {
  id: string;
  /** Bloque del 720 */
  block: "C" /** Cuentas */ | "V" /** Valores */ | "I"; /** Inmuebles */
  /** País donde se encuentra */
  country: string;
  /** Identificación del activo (IBAN, ISIN, dirección...) */
  identifier: string;
  /** Entidad gestora */
  entity: string;
  /** Saldo / valor a 31-12 del año fiscal */
  yearEndValue: number;
  /** Saldo medio del último trimestre (solo cuentas) */
  q4AverageBalance?: number;
  fiscalYear: number;
  notes?: string;
}

// ─── 369 — OSS Ventanilla Única ─────────────────────────────────────────────

export interface OssRegistration {
  /** ¿Estamos dados de alta en OSS? */
  registered: boolean;
  /** Fecha de alta vía modelo 035 */
  registrationDate?: string;
  /** Esquema OSS aplicado */
  scheme: "union" | "no-union" | "import";
  /** Umbral 10.000€/año común UE — superado o no */
  thresholdExceeded: boolean;
}

// ─── INTRASTAT ──────────────────────────────────────────────────────────────

export interface IntrastatConfig {
  /** Umbral anual superado en introducciones (compras UE) */
  thresholdIntroducciones: boolean;
  /** Umbral anual superado en expediciones (ventas UE) */
  thresholdExpediciones: boolean;
  /** Código TARIC por defecto para cartas TCG */
  defaultTaricCode?: string;
}

// ─── Datos de la empresa para liquidaciones ─────────────────────────────────

export interface CompanyFiscalData {
  /** Cierre fiscal (default 12-31) */
  fiscalYearEnd: string; // formato MM-DD
  /** ¿La empresa está acogida a recargo de equivalencia? */
  recargoEquivalencia: boolean;
  /** ¿La empresa puede acogerse al tipo reducido del 15% (nueva creación)? */
  tipoReducidoIS: boolean;
  /** Año en el que se constituyó (para tipo reducido) */
  yearOfIncorporation?: number;
  /** Cifra de negocios del año anterior (para método 202) */
  lastYearTurnover?: number;
}

// ─── Tareas pendientes / hechos confirmados ─────────────────────────────────

export interface PendingFiscalTask {
  id: string;
  title: string;
  description?: string;
  priority: "urgent" | "high" | "medium" | "low";
  /** YYYY-MM-DD de creación */
  createdAt: string;
  /** YYYY-MM-DD si está cerrado */
  resolvedAt?: string;
  /** Categoría libre para agrupar (ej: "estructura", "alquiler", "OSS") */
  category?: string;
}

// ─── Configuración fiscal completa ──────────────────────────────────────────

export interface FiscalConfig {
  company: CompanyFiscalData;
  rentals: RentalAgreement[];
  dividends: DividendDistribution[];
  modelo202: Modelo202Config;
  relatedParties: RelatedPartyOperation[];
  foreignAssets: ForeignAsset[];
  oss: OssRegistration;
  intrastat: IntrastatConfig;
  /** Tareas pendientes que el admin debe resolver (datos a aportar, verificaciones) */
  pendingTasks: PendingFiscalTask[];
  /** Si la siembra inicial ya se aplicó (para no sobreescribir cambios del usuario) */
  seeded?: boolean;
  /** Última actualización */
  updatedAt: string;
}

export const DEFAULT_FISCAL_CONFIG: FiscalConfig = {
  company: {
    fiscalYearEnd: "12-31",
    recargoEquivalencia: false,
    tipoReducidoIS: false,
  },
  rentals: [],
  dividends: [],
  modelo202: {
    method: "cuota",
  },
  relatedParties: [],
  foreignAssets: [],
  oss: {
    registered: false,
    scheme: "union",
    thresholdExceeded: false,
  },
  intrastat: {
    thresholdIntroducciones: false,
    thresholdExpediciones: false,
  },
  pendingTasks: [],
  seeded: false,
  updatedAt: new Date(0).toISOString(),
};
