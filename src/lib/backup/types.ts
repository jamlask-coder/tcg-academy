/**
 * Tipos compartidos del sistema de backups RGPD/LOPDGDD.
 *
 * Flujo: supabaseDump → encryption → s3Client (sube a Cloudflare R2 / AWS S3).
 * Manifest encadenado (hash SHA-256) detecta manipulaciones, igual que VeriFactu.
 */

export type BackupTableName = string;

export interface TableDump {
  table: BackupTableName;
  rowCount: number;
  bytes: number;
  sha256: string;
  objectKey: string;
}

export interface BackupManifest {
  id: string;
  startedAt: string;
  finishedAt: string;
  supabaseUrl: string;
  totalRows: number;
  totalBytes: number;
  tables: TableDump[];
  manifestSha256: string;
  chainSha256: string;
  previousChainSha256: string | null;
  encryptionAlgorithm: "aes-256-gcm";
  retentionDays: number;
  versionTag: string;
}

export interface BackupLocation {
  endpoint: string;
  bucket: string;
  region: string;
  keyPrefix: string;
}

export interface EncryptedPayload {
  iv: string;
  tag: string;
  ciphertext: Buffer;
  algorithm: "aes-256-gcm";
}

export interface BackupJobResult {
  ok: boolean;
  manifest?: BackupManifest;
  error?: string;
  durationMs: number;
}

export interface BackupListEntry {
  id: string;
  startedAt: string;
  finishedAt: string;
  totalRows: number;
  totalBytes: number;
  tableCount: number;
  chainSha256: string;
  objectKey: string;
}

export interface BackupVerifyResult {
  id: string;
  ok: boolean;
  checkedTables: number;
  manifestHashOk: boolean;
  chainHashOk: boolean;
  tableHashMismatches: string[];
  message: string;
}

export interface BackupRestoreRequest {
  backupId: string;
  tables?: BackupTableName[];
  confirmToken: string;
}

export interface BreachIncident {
  id: string;
  detectedAt: string;
  reportedAt: string | null;
  notifiedAepdAt: string | null;
  severity: "low" | "medium" | "high" | "critical";
  affectedSubjects: number;
  dataCategories: string[];
  description: string;
  measuresTaken: string;
  dpoEmail: string;
  status: "detected" | "contained" | "reported" | "closed";
  deadlineAt: string;
}
