/**
 * Orquestador de backups: dump → encrypt → upload → manifest → retention.
 *
 * Se ejecuta desde /api/cron/backup-supabase (diario) o desde /admin/herramientas
 * (manual). Siempre cifrado y siempre con manifest encadenado.
 *
 * Contrato:
 *   - Sin credenciales S3 configuradas → devuelve { ok: false, error: "s3_not_configured" }.
 *   - Sin clave de cifrado → devuelve { ok: false, error: "encryption_not_configured" }.
 *   - Sin Supabase admin → devuelve { ok: false, error: "supabase_not_configured" }.
 *   - Error en una tabla → se incluye en el manifest como "error" pero no aborta el resto.
 */

import {
  encryptBuffer,
  serializeEncrypted,
  deserializeEncrypted,
  decryptBuffer,
  hasEncryptionKey,
} from "./encryption";
import {
  chainManifestHash,
  computeManifestHash,
  sha256Hex,
} from "./integrity";
import {
  getBackupCredentials,
  getBackupLocation,
  isBackupS3Configured,
  s3Delete,
  s3Get,
  s3List,
  s3Put,
} from "./s3Client";
import { BACKUP_TABLES, dumpTable, restoreTable } from "./supabaseDump";
import type {
  BackupJobResult,
  BackupListEntry,
  BackupManifest,
  BackupVerifyResult,
  TableDump,
} from "./types";
import { isSupabaseConfigured } from "@/lib/supabase";

const VERSION_TAG = "v1";

function retentionDays(): number {
  const raw = process.env.BACKUP_RETENTION_DAYS;
  const n = raw ? Number.parseInt(raw, 10) : 90;
  return Number.isFinite(n) && n > 0 ? n : 90;
}

function backupId(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14); // YYYYMMDDHHmmss
}

function tableKey(prefix: string, id: string, table: string): string {
  return `${prefix}/${id}/tables/${table}.ndjson.enc`;
}

function manifestKey(prefix: string, id: string): string {
  return `${prefix}/${id}/manifest.json`;
}

async function loadPreviousChainHash(): Promise<string | null> {
  const location = getBackupLocation();
  const credentials = getBackupCredentials();
  if (!location || !credentials) return null;

  const list = await s3List({
    endpoint: location.endpoint,
    bucket: location.bucket,
    prefix: `${location.keyPrefix}/`,
    credentials,
    maxKeys: 1000,
  });
  // Filtramos solo manifiestos y ordenamos por clave descendente (la clave
  // incluye el timestamp, así que basta con el orden lexicográfico).
  const manifests = list
    .filter((e) => e.key.endsWith("/manifest.json"))
    .sort((a, b) => b.key.localeCompare(a.key));
  if (manifests.length === 0) return null;

  const latest = manifests[0];
  try {
    const body = await s3Get({
      endpoint: location.endpoint,
      bucket: location.bucket,
      key: latest.key,
      credentials,
    });
    const parsed = JSON.parse(body.toString("utf8")) as BackupManifest;
    return parsed.chainSha256;
  } catch {
    return null;
  }
}

export async function runBackup(): Promise<BackupJobResult> {
  const start = Date.now();
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "supabase_not_configured", durationMs: 0 };
  }
  if (!hasEncryptionKey()) {
    return { ok: false, error: "encryption_not_configured", durationMs: 0 };
  }
  if (!isBackupS3Configured()) {
    return { ok: false, error: "s3_not_configured", durationMs: 0 };
  }

  const location = getBackupLocation()!;
  const credentials = getBackupCredentials()!;

  const startedAt = new Date().toISOString();
  const id = backupId(new Date(startedAt));

  const tables: TableDump[] = [];
  let totalRows = 0;
  let totalBytes = 0;

  for (const table of BACKUP_TABLES) {
    try {
      const dump = await dumpTable(table);
      if (dump.rowCount === 0) continue; // no subir tablas vacías
      const encrypted = encryptBuffer(dump.ndjson);
      const blob = serializeEncrypted(encrypted);
      const key = tableKey(location.keyPrefix, id, table);
      await s3Put({
        endpoint: location.endpoint,
        bucket: location.bucket,
        key,
        body: blob,
        credentials,
      });
      tables.push({
        table,
        rowCount: dump.rowCount,
        bytes: dump.ndjson.byteLength,
        sha256: sha256Hex(dump.ndjson),
        objectKey: key,
      });
      totalRows += dump.rowCount;
      totalBytes += dump.ndjson.byteLength;
    } catch (err) {
      // Fallo puntual en una tabla: lo dejamos reflejado en el manifest.
      tables.push({
        table,
        rowCount: -1,
        bytes: 0,
        sha256: `error:${err instanceof Error ? err.message.slice(0, 120) : String(err).slice(0, 120)}`,
        objectKey: "",
      });
    }
  }

  const finishedAt = new Date().toISOString();
  const previousChainSha256 = await loadPreviousChainHash();

  const manifestBase: Omit<BackupManifest, "manifestSha256" | "chainSha256"> = {
    id,
    startedAt,
    finishedAt,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    totalRows,
    totalBytes,
    tables,
    previousChainSha256,
    encryptionAlgorithm: "aes-256-gcm",
    retentionDays: retentionDays(),
    versionTag: VERSION_TAG,
  };

  const manifestSha256 = computeManifestHash(manifestBase);
  const chainSha256 = chainManifestHash(manifestSha256, previousChainSha256);

  const manifest: BackupManifest = {
    ...manifestBase,
    manifestSha256,
    chainSha256,
  };

  await s3Put({
    endpoint: location.endpoint,
    bucket: location.bucket,
    key: manifestKey(location.keyPrefix, id),
    body: Buffer.from(JSON.stringify(manifest, null, 2), "utf8"),
    contentType: "application/json",
    credentials,
  });

  // Purge de backups antiguos (RGPD: minimización de datos).
  await pruneOldBackups();

  return {
    ok: true,
    manifest,
    durationMs: Date.now() - start,
  };
}

export async function listBackups(): Promise<BackupListEntry[]> {
  if (!isBackupS3Configured()) return [];
  const location = getBackupLocation()!;
  const credentials = getBackupCredentials()!;

  const list = await s3List({
    endpoint: location.endpoint,
    bucket: location.bucket,
    prefix: `${location.keyPrefix}/`,
    credentials,
    maxKeys: 1000,
  });
  const manifestKeys = list
    .filter((e) => e.key.endsWith("/manifest.json"))
    .sort((a, b) => b.key.localeCompare(a.key));

  const out: BackupListEntry[] = [];
  for (const m of manifestKeys.slice(0, 90)) {
    try {
      const body = await s3Get({
        endpoint: location.endpoint,
        bucket: location.bucket,
        key: m.key,
        credentials,
      });
      const parsed = JSON.parse(body.toString("utf8")) as BackupManifest;
      out.push({
        id: parsed.id,
        startedAt: parsed.startedAt,
        finishedAt: parsed.finishedAt,
        totalRows: parsed.totalRows,
        totalBytes: parsed.totalBytes,
        tableCount: parsed.tables.length,
        chainSha256: parsed.chainSha256,
        objectKey: m.key,
      });
    } catch {
      // manifest corrupto — lo ignoramos en el listing
    }
  }
  return out;
}

export async function verifyBackup(backupId: string): Promise<BackupVerifyResult> {
  if (!isBackupS3Configured()) {
    return {
      id: backupId,
      ok: false,
      checkedTables: 0,
      manifestHashOk: false,
      chainHashOk: false,
      tableHashMismatches: [],
      message: "S3 no configurado",
    };
  }
  const location = getBackupLocation()!;
  const credentials = getBackupCredentials()!;

  const manifestBody = await s3Get({
    endpoint: location.endpoint,
    bucket: location.bucket,
    key: manifestKey(location.keyPrefix, backupId),
    credentials,
  });
  const manifest = JSON.parse(manifestBody.toString("utf8")) as BackupManifest;

  const recomputedManifestHash = computeManifestHash(manifest);
  const manifestHashOk = recomputedManifestHash === manifest.manifestSha256;
  const recomputedChain = chainManifestHash(
    manifest.manifestSha256,
    manifest.previousChainSha256,
  );
  const chainHashOk = recomputedChain === manifest.chainSha256;

  const mismatches: string[] = [];
  for (const t of manifest.tables) {
    if (!t.objectKey) continue; // skip error rows
    try {
      const blob = await s3Get({
        endpoint: location.endpoint,
        bucket: location.bucket,
        key: t.objectKey,
        credentials,
      });
      const plaintext = decryptBuffer(deserializeEncrypted(blob));
      if (sha256Hex(plaintext) !== t.sha256) mismatches.push(t.table);
    } catch (err) {
      mismatches.push(`${t.table}:error:${err instanceof Error ? err.message.slice(0, 80) : "?"}`);
    }
  }

  const ok = manifestHashOk && chainHashOk && mismatches.length === 0;
  return {
    id: backupId,
    ok,
    checkedTables: manifest.tables.length,
    manifestHashOk,
    chainHashOk,
    tableHashMismatches: mismatches,
    message: ok
      ? "Backup íntegro"
      : `Inconsistencias detectadas — manifest:${manifestHashOk} chain:${chainHashOk} mismatch:${mismatches.length}`,
  };
}

export async function restoreBackup(
  backupId: string,
  tableFilter?: string[],
  opts: { truncateFirst?: boolean } = {},
): Promise<{ restoredTables: string[]; totalRows: number }> {
  if (!isBackupS3Configured()) {
    throw new Error("S3 no configurado");
  }
  if (!hasEncryptionKey()) {
    throw new Error("Clave de cifrado no disponible");
  }
  const location = getBackupLocation()!;
  const credentials = getBackupCredentials()!;

  const manifestBody = await s3Get({
    endpoint: location.endpoint,
    bucket: location.bucket,
    key: manifestKey(location.keyPrefix, backupId),
    credentials,
  });
  const manifest = JSON.parse(manifestBody.toString("utf8")) as BackupManifest;

  const tables = manifest.tables.filter(
    (t) => t.objectKey && (!tableFilter || tableFilter.includes(t.table)),
  );

  const restoredTables: string[] = [];
  let totalRows = 0;
  for (const t of tables) {
    const blob = await s3Get({
      endpoint: location.endpoint,
      bucket: location.bucket,
      key: t.objectKey,
      credentials,
    });
    const plaintext = decryptBuffer(deserializeEncrypted(blob));
    if (sha256Hex(plaintext) !== t.sha256) {
      throw new Error(`Hash mismatch en ${t.table} — backup corrupto`);
    }
    const rows = await restoreTable(t.table, plaintext, {
      truncateFirst: opts.truncateFirst,
      conflictColumn: "id",
    });
    restoredTables.push(t.table);
    totalRows += rows;
  }
  return { restoredTables, totalRows };
}

/**
 * Elimina backups cuyo `startedAt` supere BACKUP_RETENTION_DAYS.
 * Preserva los manifiestos de los últimos N días (ventana de retención).
 *
 * AVISO RGPD: facturas deben conservarse 72 meses. Como las facturas están
 * dentro del backup (tabla `invoices`) y el backup completo es la unidad, si
 * se quiere retención diferenciada por tabla habría que hacer backups
 * separados para fiscal (ver BACKUP_RECOVERY.md).
 */
export async function pruneOldBackups(): Promise<{ deleted: string[] }> {
  if (!isBackupS3Configured()) return { deleted: [] };
  const location = getBackupLocation()!;
  const credentials = getBackupCredentials()!;
  const keepDays = retentionDays();

  const list = await s3List({
    endpoint: location.endpoint,
    bucket: location.bucket,
    prefix: `${location.keyPrefix}/`,
    credentials,
    maxKeys: 1000,
  });
  const cutoff = Date.now() - keepDays * 86400_000;
  const deleted: string[] = [];

  for (const entry of list) {
    const d = new Date(entry.lastModified).getTime();
    if (Number.isFinite(d) && d < cutoff) {
      await s3Delete({
        endpoint: location.endpoint,
        bucket: location.bucket,
        key: entry.key,
        credentials,
      });
      deleted.push(entry.key);
    }
  }
  return { deleted };
}
