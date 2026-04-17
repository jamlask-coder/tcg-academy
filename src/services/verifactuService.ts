/**
 * Servicio VeriFactu — Interfaz y proveedor mock.
 *
 * Patrón: inyección de dependencias.
 * Cambiar de mock a real: sustituir `new MockVerifactuProvider()` en `getVerifactuProvider()`.
 *
 * PARA CONECTAR PROVEEDOR REAL:
 * 1. Crea `src/services/providers/SeresVerifactuProvider.ts` implementando `VerifactuProvider`
 * 2. En `getVerifactuProvider()`, importa y devuelve tu proveedor real
 * 3. Rellena VERIFACTU_CONFIG con las credenciales del proveedor
 */

import type {
  InvoiceRecord,
  VerifactuResponse,
  VerifactuStatusDetail,
} from "@/types/fiscal";
import { VerifactuStatus } from "@/types/fiscal";
import { VERIFACTU_CONFIG } from "@/config/verifactuConfig";

// ─── Interfaz del proveedor ───────────────────────────────────────────────────

/**
 * Contrato que cualquier proveedor VeriFactu debe cumplir.
 * Implementa esta interfaz para conectar Seres, Edicom, B2Brouter, etc.
 */
export interface VerifactuProvider {
  /**
   * Envía una factura al sistema VeriFactu / AEAT.
   * En producción, el plazo máximo de envío es 4 días naturales.
   */
  sendInvoice(invoice: InvoiceRecord): Promise<VerifactuResponse>;

  /**
   * Consulta el estado actual de una factura en el sistema VeriFactu.
   */
  checkStatus(invoiceId: string): Promise<VerifactuStatusDetail>;

  /**
   * Cancela/anula una factura en el sistema VeriFactu.
   * Nota: en VeriFactu no se "borran" facturas, se emite un registro de anulación.
   */
  cancelInvoice(invoiceId: string, reason: string): Promise<VerifactuResponse>;

  /**
   * Obtiene la URL del código QR verificable ante la AEAT.
   * Este QR permite a cualquier persona verificar la factura en sede electrónica.
   */
  getQRUrl(invoice: InvoiceRecord): string;

  /**
   * Valida la integridad de la cadena de hashes de un conjunto de facturas.
   * Detecta si alguna factura ha sido manipulada.
   */
  validateChain(invoices: InvoiceRecord[]): Promise<boolean>;
}

// ─── Proveedor Mock ───────────────────────────────────────────────────────────

/**
 * Proveedor de simulación para desarrollo.
 * Simula las respuestas de un proveedor VeriFactu real con un delay artificial.
 * NO envía datos reales a la AEAT.
 */
export class MockVerifactuProvider implements VerifactuProvider {
  async sendInvoice(invoice: InvoiceRecord): Promise<VerifactuResponse> {
    // Simula latencia de red (50-200ms)
    await delay(50 + Math.random() * 150);

    // Simula un 95% de éxito
    const success = Math.random() > 0.05;

    return {
      success,
      invoiceId: invoice.invoiceId,
      providerId: `MOCK-${Date.now()}`,
      status: success ? VerifactuStatus.ACEPTADA : VerifactuStatus.RECHAZADA,
      aeatTimestamp: success ? new Date() : undefined,
      errorCode: success ? undefined : "ERR_MOCK_REJECTION",
      errorMessage: success
        ? undefined
        : "[MOCK] Rechazo simulado para pruebas",
      qrUrl: success ? this.getQRUrl(invoice) : undefined,
    };
  }

  async checkStatus(invoiceId: string): Promise<VerifactuStatusDetail> {
    await delay(30);
    return {
      invoiceId,
      status: VerifactuStatus.ACEPTADA,
      lastChecked: new Date(),
      aeatReference: `AEAT-MOCK-${invoiceId.slice(0, 8).toUpperCase()}`,
    };
  }

  async cancelInvoice(
    invoiceId: string,
    _reason: string,
  ): Promise<VerifactuResponse> {
    await delay(80);
    return {
      success: true,
      invoiceId,
      providerId: `MOCK-CANCEL-${Date.now()}`,
      status: VerifactuStatus.ACEPTADA,
      aeatTimestamp: new Date(),
    };
  }

  getQRUrl(invoice: InvoiceRecord): string {
    return buildVerifactuQRUrl(invoice);
  }

  async validateChain(invoices: InvoiceRecord[]): Promise<boolean> {
    await delay(20);
    if (invoices.length === 0) return true;

    // Verifica que cada factura referencia el hash encadenado de la anterior
    for (let i = 1; i < invoices.length; i++) {
      const prev = invoices[i - 1];
      const curr = invoices[i];
      if (curr.previousInvoiceChainHash !== prev.verifactuChainHash) {
        return false;
      }
    }
    return true;
  }
}

// ─── URL del QR VeriFactu ─────────────────────────────────────────────────────

/**
 * Construye la URL del código QR verificable ante la AEAT.
 * Formato oficial: https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR
 * Parámetros: nif, numserie, fecha (DD-MM-YYYY), importe (2 decimales)
 */
export function buildVerifactuQRUrl(invoice: InvoiceRecord): string {
  const nif = invoice.issuer.taxId;
  const numserie = invoice.invoiceNumber;
  const fecha = formatDateForQR(invoice.invoiceDate);
  const importe = invoice.totals.totalInvoice.toFixed(2);

  const params = new URLSearchParams({ nif, numserie, fecha, importe });
  return `https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?${params.toString()}`;
}

function formatDateForQR(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Devuelve el proveedor VeriFactu configurado.
 *
 * PARA CONECTAR PROVEEDOR REAL: sustituye `new MockVerifactuProvider()` por:
 * - `new SeresVerifactuProvider(VERIFACTU_CONFIG)`
 * - `new EdicomVerifactuProvider(VERIFACTU_CONFIG)`
 * - `new B2BrouterVerifactuProvider(VERIFACTU_CONFIG)`
 *
 * Solo necesitas cambiar UNA línea aquí.
 */
export function getVerifactuProvider(): VerifactuProvider {
  // Fail-safe: en producción real (NODE_ENV=production) el modo mock NO está permitido.
  // Esto evita enviar facturas simuladas cuando debería haberse conectado un proveedor real.
  if (
    typeof process !== "undefined" &&
    process.env.NODE_ENV === "production" &&
    VERIFACTU_CONFIG.mode === "mock" &&
    process.env.NEXT_PUBLIC_BACKEND_MODE === "server"
  ) {
    throw new Error(
      "[VeriFactu] modo 'mock' no permitido en producción. Configura un proveedor real (Seres, Edicom, B2Brouter) en src/services/verifactuService.ts.",
    );
  }

  if (VERIFACTU_CONFIG.mode === "mock") {
    return new MockVerifactuProvider();
  }
  // Pendiente: cuando se contrate proveedor real:
  // import { SeresVerifactuProvider } from "./providers/SeresVerifactuProvider";
  // return new SeresVerifactuProvider(VERIFACTU_CONFIG);
  return new MockVerifactuProvider();
}
