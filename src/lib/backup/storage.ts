/**
 * Abstracción de almacenamiento para backups.
 *
 * Despacha entre dos backends:
 *  - **Drive** (preferente si `GOOGLE_DRIVE_SA_KEY` + `GOOGLE_DRIVE_BACKUP_FOLDER_ID`)
 *  - **S3-compat** (Cloudflare R2 / B2 / AWS) si `BACKUP_S3_*` están definidos
 *
 * El resto del pipeline (`backupJob.ts`, endpoints admin) habla SOLO con esta
 * interfaz — así cambiar de proveedor es 1 línea.
 */

import {
  isDriveConfigured,
  drivePut,
  driveGet,
  driveDelete,
  driveList,
} from "./driveStorage";
import {
  isBackupS3Configured as isS3Configured,
  getBackupLocation as getS3Location,
  getBackupCredentials as getS3Credentials,
  s3Put,
  s3Get,
  s3Delete,
  s3List,
} from "./s3Client";

export type StorageBackend = "drive" | "s3" | "none";

export interface StorageListEntry {
  key: string;
  size: number;
  lastModified: string;
}

const KEY_PREFIX = "tcgacademy-backups";

export function getBackupBackend(): StorageBackend {
  if (isDriveConfigured()) return "drive";
  if (isS3Configured()) return "s3";
  return "none";
}

export function isBackupConfigured(): boolean {
  return getBackupBackend() !== "none";
}

export function backupKeyPrefix(): string {
  return KEY_PREFIX;
}

export async function storagePut(key: string, body: Buffer, contentType?: string): Promise<void> {
  const backend = getBackupBackend();
  if (backend === "drive") {
    await drivePut(key, body, contentType);
    return;
  }
  if (backend === "s3") {
    const loc = getS3Location()!;
    const creds = getS3Credentials()!;
    await s3Put({
      endpoint: loc.endpoint,
      bucket: loc.bucket,
      key,
      body,
      contentType,
      credentials: creds,
    });
    return;
  }
  throw new Error("Ningún backend de backup configurado");
}

export async function storageGet(key: string): Promise<Buffer> {
  const backend = getBackupBackend();
  if (backend === "drive") return driveGet(key);
  if (backend === "s3") {
    const loc = getS3Location()!;
    const creds = getS3Credentials()!;
    return s3Get({
      endpoint: loc.endpoint,
      bucket: loc.bucket,
      key,
      credentials: creds,
    });
  }
  throw new Error("Ningún backend de backup configurado");
}

export async function storageDelete(key: string): Promise<void> {
  const backend = getBackupBackend();
  if (backend === "drive") {
    await driveDelete(key);
    return;
  }
  if (backend === "s3") {
    const loc = getS3Location()!;
    const creds = getS3Credentials()!;
    await s3Delete({
      endpoint: loc.endpoint,
      bucket: loc.bucket,
      key,
      credentials: creds,
    });
    return;
  }
  throw new Error("Ningún backend de backup configurado");
}

export async function storageList(prefix: string, maxKeys = 1000): Promise<StorageListEntry[]> {
  const backend = getBackupBackend();
  if (backend === "drive") return driveList(prefix, maxKeys);
  if (backend === "s3") {
    const loc = getS3Location()!;
    const creds = getS3Credentials()!;
    const list = await s3List({
      endpoint: loc.endpoint,
      bucket: loc.bucket,
      prefix,
      credentials: creds,
      maxKeys,
    });
    return list.map((e) => ({ key: e.key, size: e.size, lastModified: e.lastModified }));
  }
  return [];
}
