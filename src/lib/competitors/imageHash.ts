/**
 * Perceptual hashing (dHash) para matching de producto por imagen.
 *
 * dHash (difference hash): redimensiona a 9x8 grises, compara cada píxel con
 * su vecino derecho, 1 bit por comparación → 64 bits. Es robusto frente a:
 *  - Cambios de resolución / compresión JPEG
 *  - Pequeños ajustes de brillo/contraste
 *  - Marcos o bordes añadidos
 *
 * Distancia Hamming <=10 bits ≈ misma imagen (fotos de producto).
 * >=24 bits ≈ producto diferente.
 *
 * Internamente el hash se representa como `Uint8Array(8)` (8 bytes = 64 bits)
 * porque BigInt requiere target ES2020 y el proyecto apunta a ES2017.
 *
 * Requiere `sharp` (dep nativa). Sólo se usa server-side en la API de
 * competencia — nunca se importa en el cliente.
 */

import sharp from "sharp";

/** Usa el mismo UA que fetchHtml para no parecer bot al pedir imágenes. */
const IMG_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

/** Tamaño máximo de imagen aceptada (5 MB) — evita DoS y downloads lentas. */
const MAX_IMG_BYTES = 5 * 1024 * 1024;
/** Tamaño mínimo — imágenes de <300 B suelen ser placeholders 1x1. */
const MIN_IMG_BYTES = 300;

/** 64-bit dHash empaquetado en 8 bytes (big-endian por bit-index 63..0). */
export type DHash = Uint8Array;

/** Computa dHash desde un Buffer de imagen. Devuelve null si sharp falla. */
export async function dhashFromBuffer(buf: Buffer): Promise<DHash | null> {
  try {
    const { data } = await sharp(buf)
      .resize(9, 8, { fit: "fill" })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (data.length < 72) return null;
    const bytes = new Uint8Array(8);
    for (let y = 0; y < 8; y++) {
      let byte = 0;
      for (let x = 0; x < 8; x++) {
        const left = data[y * 9 + x] ?? 0;
        const right = data[y * 9 + x + 1] ?? 0;
        if (right > left) {
          byte |= 1 << (7 - x);
        }
      }
      bytes[y] = byte;
    }
    return bytes;
  } catch {
    return null;
  }
}

/** Descarga una imagen con timeout y le computa dHash. */
export async function dhashFromUrl(
  url: string,
  timeoutMs = 6000,
): Promise<DHash | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": IMG_UA,
        Accept: "image/webp,image/avif,image/png,image/jpeg,image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.startsWith("image/") && !ctype.startsWith("application/octet")) {
      return null;
    }
    const arr = await res.arrayBuffer();
    if (arr.byteLength < MIN_IMG_BYTES || arr.byteLength > MAX_IMG_BYTES) {
      return null;
    }
    return dhashFromBuffer(Buffer.from(arr));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Popcount de un byte (0..8). */
function popcount8(b: number): number {
  let v = b & 0xff;
  v = v - ((v >> 1) & 0x55);
  v = (v & 0x33) + ((v >> 2) & 0x33);
  return (v + (v >> 4)) & 0x0f;
}

/** Distancia Hamming entre dos hashes de 64 bits. 0 = idéntica, 64 = opuesta. */
export function hammingDistance(a: DHash, b: DHash): number {
  if (a.length !== 8 || b.length !== 8) return 64;
  let total = 0;
  for (let i = 0; i < 8; i++) {
    total += popcount8((a[i] ?? 0) ^ (b[i] ?? 0));
  }
  return total;
}

/**
 * Convierte la distancia Hamming a score 0..1.
 *   dist 0  → 1.0 (idéntica)
 *   dist 8  → 0.75
 *   dist 16 → 0.5
 *   dist 24 → 0.25
 *   dist 32+ → 0.0 (diferente)
 */
export function imageSimilarity(a: DHash, b: DHash): number {
  const d = hammingDistance(a, b);
  return Math.max(0, 1 - d / 32);
}
