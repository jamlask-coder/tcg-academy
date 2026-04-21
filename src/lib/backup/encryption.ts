/**
 * Cifrado de backups con AES-256-GCM (Node crypto, sin dependencias externas).
 *
 * La clave vive en BACKUP_ENCRYPTION_KEY (hex, 64 chars = 32 bytes). Sin ella
 * NO se pueden restaurar los backups — guardarla fuera del repo.
 *
 * Formato de objeto cifrado subido a S3:
 *   [12 bytes IV][16 bytes AUTH TAG][N bytes ciphertext]
 */

import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import type { EncryptedPayload } from "./types";

const ALGORITHM = "aes-256-gcm" as const;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const hex = process.env.BACKUP_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "BACKUP_ENCRYPTION_KEY no está configurado. Genera uno con: openssl rand -hex 32",
    );
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `BACKUP_ENCRYPTION_KEY debe tener ${KEY_LENGTH * 2} chars hex (${KEY_LENGTH} bytes). Recibidos: ${key.length} bytes.`,
    );
  }
  return key;
}

export function encryptBuffer(plaintext: Buffer): EncryptedPayload {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    ciphertext,
    algorithm: ALGORITHM,
  };
}

export function decryptBuffer(payload: EncryptedPayload): Buffer {
  const key = getKey();
  const iv = Buffer.from(payload.iv, "hex");
  const tag = Buffer.from(payload.tag, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(payload.ciphertext), decipher.final()]);
}

/**
 * Serializa el payload al formato plano usado para subir a S3.
 * [12 bytes IV][16 bytes TAG][N bytes ciphertext]
 */
export function serializeEncrypted(payload: EncryptedPayload): Buffer {
  const iv = Buffer.from(payload.iv, "hex");
  const tag = Buffer.from(payload.tag, "hex");
  return Buffer.concat([iv, tag, payload.ciphertext]);
}

export function deserializeEncrypted(blob: Buffer): EncryptedPayload {
  if (blob.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Blob cifrado demasiado corto para ser válido.");
  }
  const iv = blob.subarray(0, IV_LENGTH);
  const tag = blob.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = blob.subarray(IV_LENGTH + TAG_LENGTH);
  return {
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    ciphertext,
    algorithm: ALGORITHM,
  };
}

export function hasEncryptionKey(): boolean {
  const hex = process.env.BACKUP_ENCRYPTION_KEY;
  if (!hex) return false;
  try {
    return Buffer.from(hex, "hex").length === KEY_LENGTH;
  } catch {
    return false;
  }
}
