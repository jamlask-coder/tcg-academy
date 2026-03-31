/**
 * Configuración del sistema VeriFactu.
 *
 * VeriFactu es el sistema de verificación de facturas de la AEAT (Agencia Tributaria española).
 * Regulado por el Real Decreto 1007/2023 sobre sistemas informáticos de facturación.
 *
 * CÓMO CONECTAR UN PROVEEDOR REAL:
 * 1. Cambia `mode` a "sandbox" para pruebas con el proveedor
 * 2. Rellena `apiUrl` y `apiKey` con los datos del proveedor contratado
 * 3. Cambia `mode` a "production" para producción real
 * 4. Sustituye `MockVerifactuProvider` por el proveedor real en verifactuService.ts (1 línea)
 *
 * PROVEEDORES CERTIFICADOS COMPATIBLES:
 * - Seres (https://www.seres.es) — líder en España, muy usado en grandes empresas
 * - Edicom (https://www.edicomgroup.com) — solución completa e-factura + VeriFactu
 * - B2Brouter (https://www.b2brouter.net) — enfocado en PYMEs, API REST simple
 * - Facturae (https://www.facturae.gob.es) — formato oficial de la AEAT, gratuito
 * - Wolters Kluwer (https://www.wolterskluwer.es) — integrado con A3 y otros ERP
 */

export type VerifactuMode = "mock" | "sandbox" | "production";

export interface VerifactuConfig {
  /** Modo de operación. "mock" para desarrollo, "sandbox" para pruebas, "production" para real */
  mode: VerifactuMode;
  /** URL base de la API del proveedor (dejar vacío en modo mock) */
  apiUrl: string;
  /** Clave API del proveedor (dejar vacío en modo mock) */
  apiKey: string;
  /** Identificador de la empresa en el proveedor */
  companyId: string;
  /**
   * Tiempo máximo de espera para envío a AEAT en producción.
   * VeriFactu requiere envío en tiempo real o cuasi-real (máximo 4 días naturales).
   */
  maxSendDelayDays: number;
  /** Reintentos automáticos en caso de fallo de red */
  retryAttempts: number;
  /** Tiempo entre reintentos en milisegundos */
  retryDelayMs: number;
}

/**
 * CONFIGURACIÓN ACTIVA.
 * Para pasar a producción: cambia mode, apiUrl y apiKey.
 * El resto del sistema se adapta automáticamente sin más cambios.
 */
export const VERIFACTU_CONFIG: VerifactuConfig = {
  mode: "mock",
  apiUrl: "", // TODO: URL del proveedor contratado (ej: https://api.seres.es/verifactu/v1)
  apiKey: "", // TODO: API key del proveedor (guardar en .env.local como VERIFACTU_API_KEY)
  companyId: "", // TODO: ID de la empresa en el proveedor
  maxSendDelayDays: 4,
  retryAttempts: 3,
  retryDelayMs: 5000,
};

/**
 * Clave localStorage para el almacenamiento del registro de facturas.
 * Preparado para ser sustituido por llamadas a base de datos.
 */
export const INVOICE_STORAGE_KEY = "tcgacademy_invoices";

/**
 * Clave para el hash de integridad del conjunto de facturas.
 * Permite detectar manipulaciones en el almacenamiento local.
 */
export const INVOICE_INTEGRITY_KEY = "tcgacademy_invoices_hash";

/**
 * Formato del número de factura.
 * FAC-YYYY-NNNNN donde YYYY es el año y NNNNN es el número correlativo.
 * VeriFactu requiere numeración correlativa sin saltos dentro de cada serie.
 */
export const INVOICE_NUMBER_FORMAT = "FAC";

/**
 * Serie de factura para VeriFactu.
 * Se puede cambiar si la empresa necesita múltiples series (ej: FAC para ventas, REC para rectificativas).
 */
export const INVOICE_SERIES = "FAC";
