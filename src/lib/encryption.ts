/**
 * ENCRYPTION — cifrado AES-GCM para backups sensibles (RGPD).
 *
 * Los snapshots del negocio contienen NIFs, emails, direcciones, historial
 * de pedidos — todo PII bajo RGPD. Cuando se descargan al disco del admin o
 * se envían a almacenamiento remoto, DEBEN ir cifrados en reposo.
 *
 * Esquema:
 *   - Clave derivada con PBKDF2-SHA-256 (200.000 iteraciones) desde una
 *     frase secreta que sólo el admin conoce. NO almacenamos la clave.
 *   - Cifrado AES-GCM 256 bits, IV aleatorio de 12 bytes por archivo.
 *   - Sal aleatoria de 16 bytes por archivo (evita ataques rainbow).
 *   - Formato de salida JSON con Base64: fácil de leer, fácil de transportar.
 *
 * Por qué PBKDF2 y no Argon2:
 *   Web Crypto API nativo en el navegador sólo implementa PBKDF2. Argon2
 *   requeriría añadir una dependencia WASM de ~200KB. 200k iteraciones SHA-256
 *   es aceptable para frases de paso fuertes en un panel admin (no es un login
 *   masivo de usuarios, donde sí valdría la pena Argon2).
 *
 * Por qué AES-GCM y no AES-CBC:
 *   GCM es AEAD (autenticación integrada) — si el atacante modifica el
 *   criptograma, decrypt() falla. CBC necesitaría añadir HMAC aparte.
 *
 * Responsabilidad del admin:
 *   - Elegir una frase de paso FUERTE (>= 16 caracteres, mezcla).
 *   - GUARDARLA EN OTRO SITIO (si la pierde, el backup es irrecuperable).
 *   - No reusar la misma frase para diferentes backups si es posible.
 */

// ─── Constantes ─────────────────────────────────────────────────────────────

const PBKDF2_ITERATIONS = 200_000;
const PBKDF2_HASH = "SHA-256";
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BITS = 256;
const AES_ALGO = "AES-GCM";

/** Versión del formato cifrado. Incrementar si cambia el esquema. */
export const ENCRYPTION_FORMAT_VERSION = 1;

// ─── Tipos ──────────────────────────────────────────────────────────────────

/**
 * Estructura serializada de un blob cifrado.
 * Se guarda como JSON legible para facilitar auditoría del formato,
 * aunque el `ciphertext` sea opaco.
 */
export interface EncryptedPayload {
  version: number;
  algo: "AES-GCM";
  kdf: "PBKDF2";
  kdfHash: "SHA-256";
  iterations: number;
  /** Sal Base64 (16 bytes). Única por archivo. */
  salt: string;
  /** IV Base64 (12 bytes). Único por archivo. */
  iv: string;
  /** Criptograma Base64 (incluye tag GCM al final). */
  ciphertext: string;
  /** Metadatos en claro — NUNCA poner PII aquí. */
  meta?: {
    createdAt: string;
    purpose: "snapshot" | "export";
    hint?: string; // p.ej. "Frase de paso del 2026-04-17"
  };
}

export type EncryptionErrorCode =
  | "EMPTY_PASSPHRASE"
  | "WEAK_PASSPHRASE"
  | "CRYPTO_UNAVAILABLE"
  | "DECRYPT_FAILED"
  | "BAD_FORMAT";

export class EncryptionError extends Error {
  code: EncryptionErrorCode;
  constructor(code: EncryptionErrorCode, message: string) {
    super(message);
    this.name = "EncryptionError";
    this.code = code;
  }
}

// ─── Helpers base64 ─────────────────────────────────────────────────────────

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  // Chunk para evitar RangeError con buffers grandes (>100KB).
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK)),
    );
  }
  return btoa(binary);
}

function b64ToBuf(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Devuelve un ArrayBuffer puro (no SharedArrayBuffer) con el contenido
 * de la vista dada. Necesario para contentar a Web Crypto en TS estricto.
 */
function toArrayBuffer(u: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u.byteLength);
  new Uint8Array(ab).set(u);
  return ab;
}

// ─── Fortaleza de la frase de paso ──────────────────────────────────────────

/**
 * Evaluación rápida de fortaleza. No es un zxcvbn completo — sólo filtra
 * frases obviamente débiles. El admin no debería usar "admin1234".
 */
export interface PassphraseStrength {
  score: 0 | 1 | 2 | 3 | 4;
  issues: string[];
  ok: boolean;
}

export function evaluatePassphrase(pass: string): PassphraseStrength {
  const issues: string[] = [];
  if (!pass) {
    return { score: 0, issues: ["La frase está vacía"], ok: false };
  }
  if (pass.length < 12) issues.push("Usa al menos 12 caracteres");
  if (!/[a-z]/.test(pass)) issues.push("Añade minúsculas");
  if (!/[A-Z]/.test(pass)) issues.push("Añade mayúsculas");
  if (!/\d/.test(pass)) issues.push("Añade dígitos");
  if (!/[^A-Za-z0-9]/.test(pass)) issues.push("Añade algún símbolo");
  const commonPatterns = /^(1234|qwerty|admin|password|tcgacademy|pokemon)/i;
  if (commonPatterns.test(pass)) issues.push("Evita patrones comunes");

  const satisfied = 5 - Math.min(5, issues.length);
  const score = Math.max(0, Math.min(4, satisfied - 1)) as 0 | 1 | 2 | 3 | 4;
  return { score, issues, ok: issues.length === 0 };
}

// ─── Derivación de clave ────────────────────────────────────────────────────

function getCrypto(): Crypto {
  const g: { crypto?: Crypto } = globalThis as unknown as { crypto?: Crypto };
  if (!g.crypto || !g.crypto.subtle) {
    throw new EncryptionError(
      "CRYPTO_UNAVAILABLE",
      "Web Crypto API no disponible en este entorno",
    );
  }
  return g.crypto;
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const crypto = getCrypto();
  const enc = new TextEncoder();
  // TS strict: asegurar ArrayBuffer puro (no SharedArrayBuffer) para WebCrypto.
  const passBytes = enc.encode(passphrase);
  const baseKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(passBytes),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  const saltBuf = toArrayBuffer(salt);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuf,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    baseKey,
    { name: AES_ALGO, length: KEY_BITS },
    false,
    ["encrypt", "decrypt"],
  );
}

// ─── API pública ────────────────────────────────────────────────────────────

export interface EncryptOptions {
  /** Pista legible en claro (no-PII). Ejemplo: "Backup manual 2026-04-17". */
  hint?: string;
  /** "snapshot" para backups internos, "export" para descargas RGPD. */
  purpose?: "snapshot" | "export";
}

/**
 * Cifra un string (normalmente JSON) con la frase de paso del admin.
 * Devuelve un objeto EncryptedPayload serializable como JSON.
 */
export async function encryptString(
  plaintext: string,
  passphrase: string,
  opts: EncryptOptions = {},
): Promise<EncryptedPayload> {
  if (!passphrase || passphrase.length === 0) {
    throw new EncryptionError("EMPTY_PASSPHRASE", "Frase de paso vacía");
  }
  const strength = evaluatePassphrase(passphrase);
  if (!strength.ok) {
    // No bloqueamos, pero avisamos por consola en dev; el admin puede forzar.
    // Para prevenir despistes críticos lanzamos error si la score es 0–1.
    if (strength.score <= 1) {
      throw new EncryptionError(
        "WEAK_PASSPHRASE",
        `Frase demasiado débil: ${strength.issues.join(", ")}`,
      );
    }
  }

  const crypto = getCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);
  const enc = new TextEncoder();
  const plainBytes = enc.encode(plaintext);
  const cipher = await crypto.subtle.encrypt(
    { name: AES_ALGO, iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plainBytes),
  );

  return {
    version: ENCRYPTION_FORMAT_VERSION,
    algo: "AES-GCM",
    kdf: "PBKDF2",
    kdfHash: "SHA-256",
    iterations: PBKDF2_ITERATIONS,
    salt: bufToB64(salt),
    iv: bufToB64(iv),
    ciphertext: bufToB64(cipher),
    meta: {
      createdAt: new Date().toISOString(),
      purpose: opts.purpose ?? "snapshot",
      hint: opts.hint,
    },
  };
}

/**
 * Descifra un EncryptedPayload. Si la frase de paso es incorrecta o el
 * archivo está corrupto, el tag GCM falla y se lanza DECRYPT_FAILED.
 */
export async function decryptPayload(
  payload: EncryptedPayload,
  passphrase: string,
): Promise<string> {
  if (!passphrase) {
    throw new EncryptionError("EMPTY_PASSPHRASE", "Frase de paso vacía");
  }
  if (!payload || payload.algo !== "AES-GCM" || payload.kdf !== "PBKDF2") {
    throw new EncryptionError(
      "BAD_FORMAT",
      "El archivo no tiene el formato esperado",
    );
  }
  const crypto = getCrypto();
  let salt: Uint8Array;
  let iv: Uint8Array;
  let ct: Uint8Array;
  try {
    salt = b64ToBuf(payload.salt);
    iv = b64ToBuf(payload.iv);
    ct = b64ToBuf(payload.ciphertext);
  } catch {
    throw new EncryptionError("BAD_FORMAT", "Campos Base64 inválidos");
  }
  const key = await deriveKey(passphrase, salt);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: AES_ALGO, iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(ct),
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new EncryptionError(
      "DECRYPT_FAILED",
      "No se pudo descifrar: frase incorrecta o archivo alterado",
    );
  }
}

/**
 * Helper: serializa un payload cifrado como Blob descargable.
 * MIME type genérico para evitar que el navegador intente previsualizar.
 */
export function encryptedPayloadToBlob(payload: EncryptedPayload): Blob {
  const json = JSON.stringify(payload, null, 2);
  return new Blob([json], { type: "application/octet-stream" });
}

/**
 * Helper: parsea un archivo (texto JSON) y valida que cumpla el formato.
 */
export function parseEncryptedFile(text: string): EncryptedPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new EncryptionError("BAD_FORMAT", "El archivo no es JSON válido");
  }
  const p = parsed as Partial<EncryptedPayload>;
  if (
    typeof p.version !== "number" ||
    p.algo !== "AES-GCM" ||
    p.kdf !== "PBKDF2" ||
    typeof p.salt !== "string" ||
    typeof p.iv !== "string" ||
    typeof p.ciphertext !== "string"
  ) {
    throw new EncryptionError(
      "BAD_FORMAT",
      "Faltan campos requeridos en el archivo cifrado",
    );
  }
  return p as EncryptedPayload;
}

/**
 * Sugerencia de nombre de archivo para backups cifrados.
 * Formato: tcgacademy-backup-YYYYMMDD-HHmmss.enc.json
 */
export function suggestEncryptedFileName(prefix = "tcgacademy-backup"): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const h = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  return `${prefix}-${y}${m}${d}-${h}${mi}${s}.enc.json`;
}
