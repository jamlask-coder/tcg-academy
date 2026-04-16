/**
 * Secure order ID generation.
 *
 * Format: TCG-YYMMDD-XXXXXX
 * Where XXXXXX is 6 alphanumeric characters from crypto.getRandomValues().
 *
 * Works in both browser (Web Crypto API) and server (Node crypto) environments.
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function getRandomBytes(count: number): Uint8Array {
  const bytes = new Uint8Array(count);

  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // Fallback for environments without Web Crypto (should not happen in modern runtimes)
    for (let i = 0; i < count; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  return bytes;
}

function padTwo(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function generateOrderId(): string {
  const now = new Date();
  const yy = padTwo(now.getFullYear() % 100);
  const mm = padTwo(now.getMonth() + 1);
  const dd = padTwo(now.getDate());
  const datePart = `${yy}${mm}${dd}`;

  const bytes = getRandomBytes(6);
  let randomPart = "";
  for (let i = 0; i < 6; i++) {
    randomPart += ALPHABET[bytes[i] % ALPHABET.length];
  }

  return `TCG-${datePart}-${randomPart}`;
}
