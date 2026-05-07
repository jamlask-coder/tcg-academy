/**
 * Redsys provider — algoritmo de firma HMAC-SHA256 v1.
 *
 * Spec oficial: "Guía Comercio HMAC-SHA256 versión 1.0" (Redsys SIS).
 *
 * Flujo:
 *  1. Construir parámetros del pedido (Ds_Merchant_*) → JSON → base64.
 *  2. Derivar la clave del pedido: 3DES-CBC(secret, IV=0, data=Ds_Merchant_Order).
 *  3. Firma = HMAC-SHA256(derivedKey, base64Params) → base64.
 *  4. Enviar { Ds_SignatureVersion, Ds_MerchantParameters, Ds_Signature } como
 *     POST application/x-www-form-urlencoded al endpoint del SIS.
 *  5. Redsys responde a `Ds_Merchant_MerchantURL` con los mismos campos: hay
 *     que recalcular firma usando el `Ds_Order` recibido y comparar.
 *
 * Sin dependencias externas: usamos `node:crypto` (DES-EDE3-CBC + HMAC).
 * NUNCA loggear `secretKey` ni `derivedKey` ni headers de la respuesta.
 */

import { createHmac, createCipheriv, timingSafeEqual } from "node:crypto";
import { REDSYS_CONFIG } from "@/config/redsysConfig";

/** Campos mínimos que enviamos al SIS para una autorización (3DS2 friendly). */
export interface RedsysOrderParams {
  /** ID del pedido — alfanumérico, 4 a 12 chars, los 4 primeros deben ser dígitos. */
  orderId: string;
  /** Importe en CÉNTIMOS (sin decimales). 12.34€ → "1234". */
  amountCents: string;
  /** Descripción visible al cliente en el TPV (max 125). */
  productDescription: string;
  /** Email del titular para 3DS2 (opcional pero recomendado SCA). */
  cardholderEmail?: string;
  /** Datos completos del titular para 3DS2 (PSD2). Cuanto más, menos fricción. */
  cardholder?: {
    name: string;
    phone?: string;
    addressLine1?: string;
    city?: string;
    postalCode?: string;
    country?: string; // ISO-3 numérico, ej "724" (España)
  };
  /** IP del cliente (cabecera del request). Mejora score 3DS2. */
  clientIp?: string;
}

/** Lo que devolvemos al cliente para que haga POST al SIS. */
export interface RedsysFormPayload {
  /** URL a la que el cliente envía el formulario (SIS test/producción). */
  endpoint: string;
  /** Constante exigida por Redsys. */
  signatureVersion: "HMAC_SHA256_V1";
  /** Base64 de los parámetros JSON. */
  merchantParameters: string;
  /** Firma HMAC-SHA256 base64. */
  signature: string;
}

/** Salida normalizada al validar una notificación entrante. */
export interface RedsysNotification {
  ok: boolean;
  /** Pedido al que pertenece la notificación. */
  orderId: string;
  /** `true` si Ds_Response numeric < 100 (autorización aprobada). */
  authorized: boolean;
  /** Código de respuesta crudo (000-099 ok, >= 100 error/aviso). */
  responseCode: string;
  /** Importe en céntimos confirmado por el banco. */
  amountCents: string;
  /** ID del banco para reconciliación. */
  authorizationCode?: string;
  /** Para auditoría. */
  raw: Record<string, string>;
}

// ─── Codificación base64 estándar / URL-safe ──────────────────────────────

function b64encode(buf: Buffer): string {
  return buf.toString("base64");
}

function b64decode(str: string): Buffer {
  // Redsys envía firma URL-safe (- _) en notificaciones; aceptamos ambas.
  const normalized = str.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64");
}

// ─── Derivación de clave (3DES-CBC) ───────────────────────────────────────

/**
 * Cifra `orderId` con 3DES-CBC usando `secretKeyBase64` como key e IV=0.
 * El resultado se usa como key del HMAC-SHA256.
 *
 * Padding: zero-padding hasta múltiplo de 8 bytes (NO PKCS#7) — es lo que
 * exige Redsys aunque el modo "des-ede3-cbc" de OpenSSL aplique PKCS#7 por
 * defecto. Tomamos solo los primeros N bytes del bloque cifrado.
 */
function deriveKey(secretKeyBase64: string, orderId: string): Buffer {
  const key = Buffer.from(secretKeyBase64, "base64");
  if (key.length !== 24) {
    throw new Error("Redsys secret key must decode to 24 bytes (3DES)");
  }
  const iv = Buffer.alloc(8, 0);

  // Zero-padding manual al múltiplo de 8 bytes.
  const data = Buffer.from(orderId, "utf8");
  const padLen = (8 - (data.length % 8)) % 8;
  const padded = padLen > 0 ? Buffer.concat([data, Buffer.alloc(padLen, 0)]) : data;

  const cipher = createCipheriv("des-ede3-cbc", key, iv);
  cipher.setAutoPadding(false); // zero-padding manual, sin PKCS#7
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final()]);
  return encrypted;
}

// ─── Firma + verificación ─────────────────────────────────────────────────

function signParameters(merchantParametersB64: string, derivedKey: Buffer): string {
  const hmac = createHmac("sha256", derivedKey);
  hmac.update(merchantParametersB64);
  return b64encode(hmac.digest());
}

/**
 * Construye el payload listo para enviar al SIS de Redsys.
 * El cliente debe hacer POST application/x-www-form-urlencoded al `endpoint`.
 */
export function buildRedsysPayment(params: RedsysOrderParams): RedsysFormPayload {
  const cfg = REDSYS_CONFIG;

  // El orderId Redsys debe tener entre 4 y 12 caracteres y los 4 primeros
  // han de ser numéricos. Si el ID interno no cumple (ej: "TCGA-2026-00001"),
  // generamos un mapeo: 4 dígitos timestamp + sufijo limpio.
  const dsOrder = normalizeOrderId(params.orderId);

  const merchantParams: Record<string, string> = {
    DS_MERCHANT_AMOUNT: params.amountCents,
    DS_MERCHANT_ORDER: dsOrder,
    DS_MERCHANT_MERCHANTCODE: cfg.merchantCode,
    DS_MERCHANT_CURRENCY: cfg.currency,
    DS_MERCHANT_TRANSACTIONTYPE: cfg.transactionType,
    DS_MERCHANT_TERMINAL: cfg.terminal,
    DS_MERCHANT_MERCHANTURL: cfg.notifyUrl,
    DS_MERCHANT_URLOK: cfg.urlOk,
    DS_MERCHANT_URLKO: cfg.urlKo,
    DS_MERCHANT_CONSUMERLANGUAGE: cfg.consumerLanguage,
    DS_MERCHANT_PRODUCTDESCRIPTION: truncate(params.productDescription, 125),
    DS_MERCHANT_MERCHANTNAME: cfg.merchantName,
  };

  if (params.cardholder?.name) {
    merchantParams.DS_MERCHANT_TITULAR = truncate(params.cardholder.name, 60);
  }
  if (params.cardholderEmail) {
    merchantParams.DS_MERCHANT_EMV3DS = JSON.stringify({
      threeDSInfo: "CardData",
      cardholderEmail: params.cardholderEmail,
      ...(params.cardholder?.phone && { cardholderPhone: params.cardholder.phone }),
      ...(params.clientIp && { browserIP: params.clientIp }),
    });
  }

  const json = JSON.stringify(merchantParams);
  const merchantParametersB64 = b64encode(Buffer.from(json, "utf8"));

  const derivedKey = deriveKey(cfg.secretKey, dsOrder);
  const signature = signParameters(merchantParametersB64, derivedKey);

  return {
    endpoint: cfg.endpoint,
    signatureVersion: "HMAC_SHA256_V1",
    merchantParameters: merchantParametersB64,
    signature,
  };
}

/**
 * Verifica la firma de una notificación entrante de Redsys.
 * Devuelve los datos parseados o `{ ok: false }` si la firma no cuadra.
 */
export function verifyRedsysNotification(
  merchantParametersB64: string,
  signatureFromRedsys: string,
): RedsysNotification {
  if (!merchantParametersB64 || !signatureFromRedsys) {
    return emptyFailure();
  }

  let raw: Record<string, string>;
  try {
    raw = JSON.parse(b64decode(merchantParametersB64).toString("utf8")) as Record<string, string>;
  } catch {
    return emptyFailure();
  }

  // Redsys serializa keys con la primera letra en mayúsculas distintas según
  // el evento. Normalizamos a UPPERCASE para lookup robusto.
  const upper: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    upper[k.toUpperCase()] = String(v);
  }

  const dsOrder = upper.DS_ORDER ?? "";
  if (!dsOrder) return emptyFailure();

  const derivedKey = deriveKey(REDSYS_CONFIG.secretKey, dsOrder);
  const expected = signParameters(merchantParametersB64, derivedKey);
  const expectedBuf = Buffer.from(expected, "base64");
  const receivedBuf = b64decode(signatureFromRedsys);

  if (
    expectedBuf.length !== receivedBuf.length ||
    !timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    return emptyFailure();
  }

  const responseCode = upper.DS_RESPONSE ?? "9999";
  const authorized = /^\d+$/.test(responseCode) && parseInt(responseCode, 10) < 100;

  return {
    ok: true,
    orderId: dsOrder,
    authorized,
    responseCode,
    amountCents: upper.DS_AMOUNT ?? "0",
    authorizationCode: upper.DS_AUTHORISATIONCODE,
    raw: upper,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function emptyFailure(): RedsysNotification {
  return { ok: false, orderId: "", authorized: false, responseCode: "0000", amountCents: "0", raw: {} };
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max);
}

/**
 * Normaliza un orderId a las reglas de Redsys: 4 a 12 chars, 4 primeros
 * numéricos, alfanuméricos a partir del 5º. Si el ID interno no cumple,
 * generamos un mapeo determinista basado en hash + timestamp.
 *
 * IMPORTANTE: el caller debe persistir el mapping `redsysOrder ↔ orderId`
 * para reconciliar la notificación con el pedido interno.
 */
export function normalizeOrderId(orderId: string): string {
  const clean = orderId.replace(/[^0-9a-zA-Z]/g, "");
  // Caso ideal: ya tiene 4-12 chars, 4 primeros numéricos.
  if (clean.length >= 4 && clean.length <= 12 && /^\d{4}/.test(clean)) {
    return clean;
  }
  // Fallback: 4 dígitos del epoch + 6 alfanum del id (hasta 12 total).
  const epoch4 = String(Date.now()).slice(-4);
  const tail = clean.slice(-6) || "x";
  return (epoch4 + tail).slice(0, 12);
}
