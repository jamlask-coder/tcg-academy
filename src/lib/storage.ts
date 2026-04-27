/**
 * Supabase Storage helper — upload + URL público + delete.
 *
 * Server-side: usa el cliente admin (service_role) → bypassa RLS, OK desde
 * API routes.
 *
 * Buckets públicos: `product-images` y `hero-images` (creados como public con
 * policy de lectura abierta). Los path internos son
 *   product-images/<productId>/<timestamp>-<safeName>.<ext>
 *   hero-images/<slug>.<ext>
 *
 * Solo se debe llamar desde server (la subida real cruza el service_role); el
 * cliente sube via /api/admin/upload-image (pendiente Fase 4 si hace falta UI).
 */

import { getSupabaseAdmin } from "@/lib/supabase";

export type StorageBucket = "product-images" | "hero-images";

export interface UploadResult {
  path: string;
  publicUrl: string;
}

/** Sanitiza un nombre de fichero para que sea seguro como path en Storage. */
function safeFileName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Sube un buffer/Blob al bucket indicado y devuelve URL público.
 * `keyPrefix` permite organizar (ej: el ID del producto). El nombre final
 * lleva timestamp para evitar colisiones de cache.
 */
export async function uploadImage(
  bucket: StorageBucket,
  file: Blob | Buffer | ArrayBuffer,
  opts: {
    fileName: string;
    keyPrefix?: string;
    contentType?: string;
    upsert?: boolean;
  },
): Promise<UploadResult> {
  const sb = getSupabaseAdmin();
  const stamp = Date.now();
  const safe = safeFileName(opts.fileName);
  const path = opts.keyPrefix
    ? `${opts.keyPrefix}/${stamp}-${safe}`
    : `${stamp}-${safe}`;

  const body =
    file instanceof ArrayBuffer
      ? Buffer.from(file)
      : Buffer.isBuffer(file)
        ? file
        : (file as Blob);

  const { error } = await sb.storage.from(bucket).upload(path, body, {
    contentType: opts.contentType,
    upsert: opts.upsert ?? false,
  });
  if (error) throw error;

  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/** URL público a partir de un path ya almacenado. */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  return getSupabaseAdmin().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Borra un objeto del bucket. */
export async function deleteImage(bucket: StorageBucket, path: string): Promise<void> {
  const { error } = await getSupabaseAdmin().storage.from(bucket).remove([path]);
  if (error) throw error;
}

/**
 * Helper para subir una URL externa (ej: Scryfall) a nuestro bucket. Útil para
 * el seed inicial cuando los productos vienen de fuentes externas y queremos
 * tener las imágenes bajo control.
 */
export async function importImageFromUrl(
  bucket: StorageBucket,
  url: string,
  opts: { fileName: string; keyPrefix?: string },
): Promise<UploadResult> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  const ct = res.headers.get("content-type") ?? "image/jpeg";
  return uploadImage(bucket, arrayBuf, {
    fileName: opts.fileName,
    keyPrefix: opts.keyPrefix,
    contentType: ct,
    upsert: true,
  });
}
