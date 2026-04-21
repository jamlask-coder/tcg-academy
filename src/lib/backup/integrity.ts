/**
 * Hash encadenado de manifiestos de backup (patrón VeriFactu).
 *
 * Cada backup diario genera un manifest JSON con los hashes SHA-256 de cada
 * tabla. El `manifestSha256` firma el contenido; `chainSha256` = SHA-256
 * (manifestSha256 + previousChainSha256). Si alguien manipula un backup viejo,
 * todos los posteriores quedan con la cadena rota → alerta en /admin/herramientas.
 */

import { createHash } from "node:crypto";
import type { BackupManifest, TableDump } from "./types";

export function sha256Hex(input: Buffer | string): string {
  const h = createHash("sha256");
  h.update(input);
  return h.digest("hex");
}

export function hashTableDump(rawNdjson: Buffer): string {
  return sha256Hex(rawNdjson);
}

/**
 * Hash canónico del manifest: serializa los campos fijos en orden determinista
 * y los pasa por SHA-256. Excluye `manifestSha256` y `chainSha256` (que se
 * calculan después) para evitar circularidad.
 */
export function computeManifestHash(
  manifest: Omit<BackupManifest, "manifestSha256" | "chainSha256">,
): string {
  const canonical = {
    id: manifest.id,
    startedAt: manifest.startedAt,
    finishedAt: manifest.finishedAt,
    supabaseUrl: manifest.supabaseUrl,
    totalRows: manifest.totalRows,
    totalBytes: manifest.totalBytes,
    retentionDays: manifest.retentionDays,
    previousChainSha256: manifest.previousChainSha256,
    encryptionAlgorithm: manifest.encryptionAlgorithm,
    versionTag: manifest.versionTag,
    tables: [...manifest.tables]
      .sort((a, b) => a.table.localeCompare(b.table))
      .map((t) => ({
        table: t.table,
        rowCount: t.rowCount,
        bytes: t.bytes,
        sha256: t.sha256,
        objectKey: t.objectKey,
      })),
  };
  return sha256Hex(JSON.stringify(canonical));
}

export function chainManifestHash(
  currentManifestHash: string,
  previousChainHash: string | null,
): string {
  return sha256Hex(currentManifestHash + (previousChainHash ?? ""));
}

/**
 * Verifica la integridad de un manifest: recalcula manifestSha256 y chainSha256
 * a partir de los campos originales y compara con los guardados.
 */
export function verifyManifestIntegrity(
  manifest: BackupManifest,
): { manifestHashOk: boolean; chainHashOk: boolean } {
  const recomputedManifestHash = computeManifestHash(manifest);
  const manifestHashOk = recomputedManifestHash === manifest.manifestSha256;
  const recomputedChain = chainManifestHash(
    manifest.manifestSha256,
    manifest.previousChainSha256,
  );
  const chainHashOk = recomputedChain === manifest.chainSha256;
  return { manifestHashOk, chainHashOk };
}

export function verifyTableHash(dump: TableDump, rawNdjson: Buffer): boolean {
  return sha256Hex(rawNdjson) === dump.sha256;
}
