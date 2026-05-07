/**
 * Redsys (TPV virtual bancario) — Configuración del comercio.
 *
 * Esta integración queda LISTA PARA ACTIVAR cuando el banco entregue las
 * credenciales. Mientras `mode === "off"`, el endpoint /api/payments/redsys
 * devuelve 501 y el método de pago "tarjeta-redsys" no debe ofrecerse en el
 * checkout.
 *
 * ── Pasos para activar (ver docs/SETUP_REDSYS.md) ─────────────────────────
 *  1. Pedir al banco TPV virtual con conexión Redsys SIS.
 *  2. El banco entrega:
 *     - Código de comercio (FUC) — 9 dígitos
 *     - Número de terminal — normalmente 001
 *     - Clave de cifrado SHA-256 — base64, ~32 bytes
 *  3. Rellenar las variables de entorno en Vercel:
 *     - REDSYS_MERCHANT_CODE=<FUC>
 *     - REDSYS_TERMINAL=001
 *     - REDSYS_SECRET_KEY=<clave base64>
 *     - REDSYS_MODE=test  (cambiar a "production" cuando el banco lo
 *                          autorice tras pruebas con tarjetas SIS)
 *  4. La URL de notificación on-line debe darse al banco como:
 *     https://tcgacademy.es/api/payments/redsys/notify
 *  5. La URL de retorno OK / KO:
 *     https://tcgacademy.es/cuenta/pedidos?pago=ok
 *     https://tcgacademy.es/cuenta/pedidos?pago=ko
 */

export type RedsysMode = "off" | "test" | "production";

export interface RedsysConfig {
  /** Estado de la integración. "off" mientras no haya credenciales del banco. */
  mode: RedsysMode;
  /** Código FUC del comercio (9 dígitos) — `REDSYS_MERCHANT_CODE`. */
  merchantCode: string;
  /** Número de terminal — `REDSYS_TERMINAL`. */
  terminal: string;
  /** Clave secreta SHA-256 en base64 — `REDSYS_SECRET_KEY`. NUNCA loggear. */
  secretKey: string;
  /** Moneda ISO 4217 numérica (978 = EUR). */
  currency: string;
  /** Idioma del TPV (001 = español). */
  consumerLanguage: string;
  /** Tipo de transacción (0 = autorización estándar). */
  transactionType: string;
  /** URL del SIS según el modo. */
  endpoint: string;
  /** URL pública para que Redsys notifique server-to-server. */
  notifyUrl: string;
  /** URL de retorno cuando el cliente acaba con éxito. */
  urlOk: string;
  /** URL de retorno cuando el cliente cancela o falla. */
  urlKo: string;
  /** Nombre comercial visible al cliente en el TPV. */
  merchantName: string;
}

const SIS_TEST = "https://sis-t.redsys.es:25443/sis/realizarPago";
const SIS_PROD = "https://sis.redsys.es/sis/realizarPago";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://tcgacademy.es").replace(/\/$/, "");

const ENV_MODE = (process.env.REDSYS_MODE ?? "off").toLowerCase() as RedsysMode;

export const REDSYS_CONFIG: RedsysConfig = {
  mode: ["off", "test", "production"].includes(ENV_MODE) ? ENV_MODE : "off",
  merchantCode: process.env.REDSYS_MERCHANT_CODE ?? "",
  terminal: process.env.REDSYS_TERMINAL ?? "001",
  secretKey: process.env.REDSYS_SECRET_KEY ?? "",
  currency: "978", // EUR
  consumerLanguage: "001", // ES
  transactionType: "0", // Autorización
  endpoint: ENV_MODE === "production" ? SIS_PROD : SIS_TEST,
  notifyUrl: `${APP_URL}/api/payments/redsys/notify`,
  urlOk: `${APP_URL}/cuenta/pedidos?pago=ok`,
  urlKo: `${APP_URL}/cuenta/pedidos?pago=ko`,
  merchantName: "TCG Academy",
};

/**
 * `true` solo cuando hay clave + FUC y el modo no es "off".
 * El endpoint /api/payments/redsys debe rechazar (501) si esto es false.
 */
export function isRedsysConfigured(): boolean {
  return (
    REDSYS_CONFIG.mode !== "off" &&
    REDSYS_CONFIG.merchantCode.length > 0 &&
    REDSYS_CONFIG.secretKey.length > 0
  );
}
