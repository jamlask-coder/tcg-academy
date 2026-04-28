/**
 * Cliente Google Drive (Service Account) para backups off-site RGPD.
 *
 * Usa `googleapis` con auth JWT (Service Account) — sin OAuth interactivo.
 * Sube cada objeto como un fichero plano dentro de la carpeta dada por
 * `GOOGLE_DRIVE_BACKUP_FOLDER_ID`. La "key" se usa literal como nombre del
 * fichero (puede llevar `/` — Drive permite cualquier carácter).
 *
 * Ventajas vs S3:
 *  - 0€ (15 GB Drive gratis cubren años de backups cifrados)
 *  - Off-site real (provider distinto de Supabase)
 *  - Compatible con la política 3-2-1 de la AEPD
 *
 * Limitaciones:
 *  - Drive no es S3: no hay listado nativo "starts-with"; usamos `name contains`
 *    + filtrado por prefijo cliente-side (ok para <1000 ficheros).
 *  - Drive cifra at-rest del lado de Google, pero los datos se cifran ANTES con
 *    AES-GCM via `encryption.ts` (clave bajo nuestro control).
 */

import { Readable } from "node:stream";
import { google, type drive_v3 } from "googleapis";
import { JWT } from "google-auth-library";

interface DriveCreds {
  client_email: string;
  private_key: string;
}

let cachedClient: drive_v3.Drive | null = null;
let cachedFolderId: string | null = null;

function loadCreds(): DriveCreds | null {
  const raw = process.env.GOOGLE_DRIVE_SA_KEY;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DriveCreds;
    if (!parsed.client_email || !parsed.private_key) return null;
    // En Vercel los \n del private_key llegan literales — los normalizamos.
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    return parsed;
  } catch {
    return null;
  }
}

export function isDriveConfigured(): boolean {
  return Boolean(loadCreds()) && Boolean(process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID);
}

export function getDriveFolderId(): string | null {
  const id = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  return id ? id : null;
}

function getClient(): { drive: drive_v3.Drive; folderId: string } {
  const folderId = getDriveFolderId();
  if (!folderId) throw new Error("GOOGLE_DRIVE_BACKUP_FOLDER_ID no configurado");
  const creds = loadCreds();
  if (!creds) throw new Error("GOOGLE_DRIVE_SA_KEY no configurado o inválido");

  if (cachedClient && cachedFolderId === folderId) {
    return { drive: cachedClient, folderId };
  }

  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  cachedClient = google.drive({ version: "v3", auth });
  cachedFolderId = folderId;
  return { drive: cachedClient, folderId };
}

/**
 * Busca el fileId de un objeto por nombre dentro de la carpeta. Devuelve
 * null si no existe.
 */
async function findFileId(drive: drive_v3.Drive, folderId: string, key: string): Promise<string | null> {
  // Drive necesita escapado de comillas simples en `q`.
  const escaped = key.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `'${folderId}' in parents and name = '${escaped}' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 1,
  });
  const f = res.data.files?.[0];
  return f?.id ?? null;
}

export async function drivePut(key: string, body: Buffer, contentType?: string): Promise<void> {
  const { drive, folderId } = getClient();
  // Si ya existe, lo borramos y recreamos (idempotencia + simpler que update).
  const existing = await findFileId(drive, folderId, key);
  if (existing) {
    await drive.files.delete({ fileId: existing });
  }
  await drive.files.create({
    requestBody: {
      name: key,
      parents: [folderId],
      mimeType: contentType ?? "application/octet-stream",
    },
    media: {
      mimeType: contentType ?? "application/octet-stream",
      body: Readable.from(body),
    },
    fields: "id",
  });
}

export async function driveGet(key: string): Promise<Buffer> {
  const { drive, folderId } = getClient();
  const fileId = await findFileId(drive, folderId, key);
  if (!fileId) throw new Error(`Drive GET ${key} → 404 (no existe)`);
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" },
  );
  return Buffer.from(res.data as ArrayBuffer);
}

export async function driveDelete(key: string): Promise<void> {
  const { drive, folderId } = getClient();
  const fileId = await findFileId(drive, folderId, key);
  if (!fileId) return; // ya no existe — idempotente
  await drive.files.delete({ fileId });
}

export interface DriveListEntry {
  key: string;
  size: number;
  lastModified: string;
}

export async function driveList(prefix: string, maxKeys = 1000): Promise<DriveListEntry[]> {
  const { drive, folderId } = getClient();
  const out: DriveListEntry[] = [];
  let pageToken: string | undefined;
  // Drive no soporta "starts-with" nativo. Usamos `name contains` + filtro
  // cliente-side por prefijo. Para <10k ficheros es eficiente.
  // Si prefix tiene `/`, Drive solo permite buscar el primer segmento útil.
  // Tomamos el primer "tramo" antes del / como hint para `contains`.
  const containsHint = prefix.split("/")[0]?.replace(/'/g, "\\'") ?? "";
  const q = containsHint
    ? `'${folderId}' in parents and name contains '${containsHint}' and trashed = false`
    : `'${folderId}' in parents and trashed = false`;

  do {
    const res = await drive.files.list({
      q,
      fields: "nextPageToken, files(name, size, modifiedTime)",
      pageSize: Math.min(maxKeys - out.length, 1000),
      pageToken,
    });
    for (const f of res.data.files ?? []) {
      const name = f.name ?? "";
      if (!name.startsWith(prefix)) continue;
      out.push({
        key: name,
        size: f.size ? Number(f.size) : 0,
        lastModified: f.modifiedTime ?? new Date().toISOString(),
      });
      if (out.length >= maxKeys) break;
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken && out.length < maxKeys);

  return out;
}
