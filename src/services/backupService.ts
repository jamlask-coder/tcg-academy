/**
 * BACKUP SERVICE — sistema profesional de snapshots de datos.
 *
 * Objetivo: cero pérdida de información. Toda la información del negocio
 * (usuarios, pedidos, facturas, puntos, consentimientos, audit trail) se puede
 * exportar, descargar, cifrar, restaurar y — cuando el backend esté en modo
 * servidor — subir al almacenamiento remoto.
 *
 * Niveles de defensa:
 *  1. Snapshot local rotativo (últimos N en localStorage).
 *  2. Descarga manual a archivo .json (o cifrado .tcga-backup).
 *  3. Auto-backup programado al entrar en /admin.
 *  4. Endpoint /api/admin/backup para volcado al servidor (Supabase/S3).
 *
 * CRÍTICO: cada snapshot incluye su propio checksum SHA-256 de las claves,
 * timestamp, versión de esquema y hash encadenado con el anterior (audit trail
 * tipo blockchain-lite). Al restaurar, el checksum se valida ANTES de escribir.
 */

import { safeRead, robustWrite } from "@/lib/safeStorage";
import { getBackupTrackedKeys, type BackupTrackedKey } from "@/lib/dataHub";

// ─── Esquema ────────────────────────────────────────────────────────────────

/** Versión del formato de snapshot. Incrementar ante cambios incompatibles. */
export const BACKUP_SCHEMA_VERSION = 1;

/** Clave local para el historial de snapshots rotativos. */
const SNAPSHOT_INDEX_KEY = "tcgacademy_backup_index";
const SNAPSHOT_PREFIX = "tcgacademy_backup_";
const MAX_LOCAL_SNAPSHOTS = 7; // retención por defecto (una semana diaria)

/**
 * Catálogo completo de claves que DEBEN entrar en un snapshot.
 *
 * SSOT: derivado del registry de DataHub (`src/lib/dataHub/registry.ts`).
 * Para añadir/quitar una clave del backup: edita la entidad correspondiente
 * en el registry — aquí no se hardcodea nada.
 */
export type TrackedKey = BackupTrackedKey;

export const TRACKED_KEYS: readonly TrackedKey[] = getBackupTrackedKeys();

/** Tipo del manifiesto del snapshot (metadatos sin los datos). */
export interface SnapshotManifest {
  id: string;
  createdAt: string;
  schemaVersion: number;
  size: number;
  checksum: string;
  prevChecksum: string | null;
  keyCount: number;
  piiKeyCount: number;
  trigger: "manual" | "auto" | "scheduled";
  note?: string;
}

/** Snapshot completo (manifest + payload). */
export interface Snapshot extends SnapshotManifest {
  /** Clave → JSON-serialized value (string). */
  data: Record<string, string>;
}

// ─── Utilidades ─────────────────────────────────────────────────────────────

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Calcula SHA-256 de un string y lo devuelve en hex. */
export async function sha256(input: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    // Fallback muy básico — si el runtime no tiene Web Crypto, no garantizamos integridad.
    let h = 0;
    for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
    return `fallback-${h.toString(16).padStart(8, "0")}`;
  }
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function byteSize(obj: unknown): number {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch {
    return JSON.stringify(obj ?? "").length;
  }
}

// ─── Crear snapshot ─────────────────────────────────────────────────────────

/**
 * Captura un snapshot de TODAS las claves rastreadas y devuelve el objeto
 * completo con checksum. No lo persiste todavía — eso lo hace `saveSnapshot`.
 */
export async function createSnapshot(
  trigger: SnapshotManifest["trigger"] = "manual",
  note?: string,
): Promise<Snapshot> {
  if (typeof window === "undefined") {
    throw new Error("createSnapshot sólo disponible en el navegador");
  }

  const data: Record<string, string> = {};
  let piiCount = 0;

  for (const entry of TRACKED_KEYS) {
    const raw = localStorage.getItem(entry.key);
    if (raw === null) continue;
    data[entry.key] = raw;
    if (entry.pii) piiCount++;
  }

  const prevChecksum = latestChecksum();
  const payload = JSON.stringify(data);
  const checksum = await sha256(`${payload}|${prevChecksum ?? ""}`);

  const snap: Snapshot = {
    id: uid(),
    createdAt: new Date().toISOString(),
    schemaVersion: BACKUP_SCHEMA_VERSION,
    size: byteSize(data),
    checksum,
    prevChecksum,
    keyCount: Object.keys(data).length,
    piiKeyCount: piiCount,
    trigger,
    note,
    data,
  };
  return snap;
}

// ─── Persistencia local rotativa ────────────────────────────────────────────

/** Lista de manifiestos (sin payload) — barato de leer. */
export function listSnapshots(): SnapshotManifest[] {
  if (typeof window === "undefined") return [];
  return safeRead<SnapshotManifest[]>(SNAPSHOT_INDEX_KEY, []);
}

function latestChecksum(): string | null {
  const list = listSnapshots();
  return list.length > 0 ? list[0].checksum : null;
}

/**
 * Guarda el snapshot en localStorage con rotación: mantiene sólo los últimos
 * `MAX_LOCAL_SNAPSHOTS`. Los snapshots antiguos se purgan. Si hay quota
 * insuficiente ni siquiera para uno, devuelve false y quien llama debe ofrecer
 * descarga directa al usuario.
 */
export function saveSnapshot(snap: Snapshot): boolean {
  if (typeof window === "undefined") return false;

  const { data, ...manifest } = snap;
  const index = listSnapshots();

  // Escribir el payload primero
  const payloadKey = `${SNAPSHOT_PREFIX}${snap.id}`;
  const payloadOk = robustWrite(payloadKey, data);
  if (!payloadOk) return false;

  // Actualizar el índice (manifiestos ordenados del más reciente al más antiguo)
  const nextIndex = [manifest, ...index].slice(0, MAX_LOCAL_SNAPSHOTS);

  // Purgar payloads de los que ya no están en el índice
  const keepIds = new Set(nextIndex.map((m) => m.id));
  for (const m of index) {
    if (!keepIds.has(m.id)) {
      try {
        localStorage.removeItem(`${SNAPSHOT_PREFIX}${m.id}`);
      } catch {
        /* ignore */
      }
    }
  }

  return robustWrite(SNAPSHOT_INDEX_KEY, nextIndex);
}

/** Carga un snapshot completo (manifest + payload) por id. */
export function loadSnapshot(id: string): Snapshot | null {
  if (typeof window === "undefined") return null;
  const manifest = listSnapshots().find((m) => m.id === id);
  if (!manifest) return null;
  const data = safeRead<Record<string, string>>(`${SNAPSHOT_PREFIX}${id}`, {});
  if (!data) return null;
  return { ...manifest, data };
}

/** Borra un snapshot local por id. */
export function deleteSnapshot(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.removeItem(`${SNAPSHOT_PREFIX}${id}`);
  } catch {
    /* ignore */
  }
  const index = listSnapshots().filter((m) => m.id !== id);
  return robustWrite(SNAPSHOT_INDEX_KEY, index);
}

// ─── Restauración ───────────────────────────────────────────────────────────

export interface RestorePreview {
  valid: boolean;
  checksumOk: boolean;
  schemaOk: boolean;
  keysToWrite: string[];
  keysToDelete: string[];
  unknownKeys: string[];
  manifest: SnapshotManifest;
  errors: string[];
}

/**
 * Valida un snapshot SIN escribir nada. Usar antes de `restoreSnapshot` para
 * enseñar al admin qué va a cambiar.
 */
export async function previewRestore(snap: Snapshot): Promise<RestorePreview> {
  const errors: string[] = [];
  let schemaOk = true;
  let checksumOk = true;

  if (snap.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    schemaOk = false;
    errors.push(
      `Versión de esquema distinta: snapshot=${snap.schemaVersion} actual=${BACKUP_SCHEMA_VERSION}`,
    );
  }

  // Re-calcular el checksum
  const recomputed = await sha256(
    `${JSON.stringify(snap.data)}|${snap.prevChecksum ?? ""}`,
  );
  if (recomputed !== snap.checksum) {
    checksumOk = false;
    errors.push(
      `Checksum no coincide — el backup puede estar corrupto o alterado.`,
    );
  }

  const tracked = new Set(TRACKED_KEYS.map((t) => t.key));
  const incoming = new Set(Object.keys(snap.data));
  const currentTracked = new Set<string>();
  if (typeof window !== "undefined") {
    for (const t of TRACKED_KEYS) {
      if (localStorage.getItem(t.key) !== null) currentTracked.add(t.key);
    }
  }

  const keysToWrite = [...incoming];
  const keysToDelete = [...currentTracked].filter((k) => !incoming.has(k));
  const unknownKeys = [...incoming].filter((k) => !tracked.has(k));

  const { data: _data, ...manifest } = snap;

  return {
    valid: schemaOk && checksumOk,
    checksumOk,
    schemaOk,
    keysToWrite,
    keysToDelete,
    unknownKeys,
    manifest,
    errors,
  };
}

export interface RestoreResult {
  ok: boolean;
  written: string[];
  deleted: string[];
  skipped: string[];
  preSnapshotId?: string;
  errors: string[];
}

/**
 * Restaura un snapshot ENTERO reemplazando el estado actual.
 *
 * Protecciones:
 *  1. Valida checksum antes de tocar nada.
 *  2. Crea un "pre-snapshot" del estado actual (rollback en 1 click).
 *  3. Escribe con `robustWrite` (fallbacks de cuota).
 *  4. Borra claves rastreadas que no estén en el snapshot (el snapshot es la
 *     fuente de verdad — si algo no está, no debe quedar).
 *  5. Jamás toca claves de sistema (snapshots, errores, session) — sólo las
 *     claves en `TRACKED_KEYS`.
 */
export async function restoreSnapshot(
  snap: Snapshot,
  opts: { skipValidation?: boolean; keepPreSnapshot?: boolean } = {},
): Promise<RestoreResult> {
  const result: RestoreResult = {
    ok: false,
    written: [],
    deleted: [],
    skipped: [],
    errors: [],
  };

  if (typeof window === "undefined") {
    result.errors.push("restoreSnapshot requiere navegador");
    return result;
  }

  if (!opts.skipValidation) {
    const preview = await previewRestore(snap);
    if (!preview.valid) {
      result.errors = preview.errors;
      return result;
    }
  }

  // 1. Pre-snapshot para rollback (si falla la restauración)
  let preSnapshotId: string | undefined;
  if (opts.keepPreSnapshot !== false) {
    try {
      const pre = await createSnapshot(
        "auto",
        `Pre-restauración antes de ${snap.id}`,
      );
      if (saveSnapshot(pre)) preSnapshotId = pre.id;
    } catch (e) {
      result.errors.push(
        `No se pudo crear pre-snapshot: ${e instanceof Error ? e.message : "?"}`,
      );
    }
  }
  result.preSnapshotId = preSnapshotId;

  // 2. Escribir claves del snapshot
  const tracked = new Set(TRACKED_KEYS.map((t) => t.key));
  for (const [key, rawValue] of Object.entries(snap.data)) {
    if (!tracked.has(key)) {
      result.skipped.push(key);
      continue;
    }
    try {
      // Persistimos el valor tal cual (ya es string JSON).
      localStorage.setItem(key, rawValue);
      result.written.push(key);
    } catch (e) {
      result.errors.push(
        `No se pudo escribir ${key}: ${e instanceof Error ? e.message : "?"}`,
      );
    }
  }

  // 3. Borrar claves rastreadas que no están en el snapshot
  const incoming = new Set(Object.keys(snap.data));
  for (const entry of TRACKED_KEYS) {
    if (!incoming.has(entry.key) && localStorage.getItem(entry.key) !== null) {
      try {
        localStorage.removeItem(entry.key);
        result.deleted.push(entry.key);
      } catch {
        /* ignore */
      }
    }
  }

  result.ok = result.errors.length === 0;
  return result;
}

// ─── Exportación / descarga ─────────────────────────────────────────────────

/**
 * Convierte un snapshot en un Blob descargable (JSON con indent 2).
 * Si se pasa contenido cifrado, marca el mime-type específico.
 */
export function snapshotToBlob(
  snap: Snapshot | string,
  opts: { encrypted?: boolean } = {},
): Blob {
  const payload =
    typeof snap === "string" ? snap : JSON.stringify(snap, null, 2);
  const type = opts.encrypted
    ? "application/octet-stream"
    : "application/json";
  return new Blob([payload], { type });
}

/**
 * Devuelve un nombre de archivo estándar para el snapshot.
 *   tcga-backup-2026-04-17T12-30-00Z-abc12345.json
 *   tcga-backup-...-abc12345.enc   (cifrado)
 */
export function snapshotFileName(
  manifest: SnapshotManifest,
  opts: { encrypted?: boolean } = {},
): string {
  const ts = manifest.createdAt.replace(/[:.]/g, "-");
  const shortId = manifest.id.slice(0, 8);
  const ext = opts.encrypted ? "enc" : "json";
  return `tcga-backup-${ts}-${shortId}.${ext}`;
}

/**
 * Parse de un archivo importado. Valida estructura mínima.
 */
export function parseSnapshotFile(text: string): Snapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Archivo no es JSON válido");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Contenido no es un snapshot");
  }
  const s = parsed as Partial<Snapshot>;
  if (
    !s.id ||
    !s.createdAt ||
    typeof s.schemaVersion !== "number" ||
    !s.checksum ||
    !s.data ||
    typeof s.data !== "object"
  ) {
    throw new Error("Snapshot con estructura inválida (faltan campos obligatorios)");
  }
  return s as Snapshot;
}

// ─── Estadísticas ───────────────────────────────────────────────────────────

export interface BackupStats {
  localCount: number;
  latestAt: string | null;
  totalSize: number;
  piiKeysTracked: number;
  totalKeysTracked: number;
  hoursSinceLastBackup: number | null;
}

export function getBackupStats(): BackupStats {
  const list = listSnapshots();
  const latest = list[0] ?? null;
  const totalSize = list.reduce((acc, m) => acc + m.size, 0);
  const hoursSinceLastBackup = latest
    ? (Date.now() - new Date(latest.createdAt).getTime()) / 3_600_000
    : null;
  return {
    localCount: list.length,
    latestAt: latest?.createdAt ?? null,
    totalSize,
    piiKeysTracked: TRACKED_KEYS.filter((k) => k.pii).length,
    totalKeysTracked: TRACKED_KEYS.length,
    hoursSinceLastBackup,
  };
}
