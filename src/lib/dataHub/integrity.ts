/**
 * DataHub — Integrity layer
 * =========================
 * Detecta:
 *   - Claves huérfanas: localStorage real que nadie registra → señal de zombie key
 *   - Claves registradas ausentes: entidad declarada pero sin datos (no es error)
 *   - Entidades con storage vacío que deberían estar sembradas
 *   - Duplicados potenciales: entidades cuyo contenido se solapa
 *
 * Uso:
 *   - /admin/herramientas muestra el reporte
 *   - Tests automatizados pueden verificar que no hay keys huérfanas
 */

import { ENTITIES, allRegisteredKeys } from "./registry";

export interface IntegrityReport {
  orphanKeys: string[];              // keys en localStorage que ningún registry declara
  emptyEntities: string[];           // entidades registradas con todas sus keys vacías
  registeredCount: number;
  localStorageKeyCount: number;
  timestamp: string;
}

/**
 * Prefijos que consideramos parte del dominio. Una key fuera de estos prefijos
 * la ignoramos (pertenece a terceros, Next.js devtools, etc.).
 */
const DOMAIN_PREFIXES = ["tcgacademy_", "tcga_"];

function isDomainKey(k: string): boolean {
  return DOMAIN_PREFIXES.some((p) => k.startsWith(p));
}

/**
 * Keys conocidas que NO están en el registry pero son legítimas (infra, locks, UI).
 * No son entidades con semántica de datos sino estado transitorio/telemetría.
 * Mantener esta lista corta; si crece, probablemente falta un registry entry.
 */
const KNOWN_INFRA_KEYS: ReadonlySet<string> = new Set([
  "tcgacademy_backup_index",
  "tcgacademy_checkout_lock",
  "tcgacademy_recent_order_ids",
  "tcgacademy_anomalies",
  "tcgacademy_circuits",
  "tcgacademy_dlq",
  "tcgacademy_reset_tokens",
  "tcgacademy_backup_scheduler_last",
  "tcgacademy_invoice_count_watermark",
  "tcgacademy_last_known_time",
  "tcgacademy_storage_errors",
  "tcgacademy_pending_checkout",
  "tcgacademy_demo_pedidos_dismissed",
  "tcgacademy_demo_fiscal_dismissed",
  "tcga_cookie_consent",
  "tcga_recent_searches",
  "tcga_session",
  "tcga_restock_subs",
]);

/** Construye el reporte de integridad contra localStorage real. */
export function buildIntegrityReport(): IntegrityReport {
  if (typeof window === "undefined") {
    return {
      orphanKeys: [],
      emptyEntities: [],
      registeredCount: ENTITIES.length,
      localStorageKeyCount: 0,
      timestamp: new Date().toISOString(),
    };
  }

  const registered = new Set(allRegisteredKeys());
  const realKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && isDomainKey(k)) realKeys.push(k);
  }

  const orphanKeys = realKeys.filter(
    (k) => !registered.has(k) && !KNOWN_INFRA_KEYS.has(k) && !k.startsWith("tcgacademy_backup_"),
  );

  const emptyEntities: string[] = [];
  for (const entity of ENTITIES) {
    if (entity.maturity === "stub") continue;
    const anyHasData = entity.storageKeys.some((k) => {
      const raw = localStorage.getItem(k);
      if (!raw) return false;
      if (raw === "[]" || raw === "{}" || raw === "null") return false;
      return true;
    });
    if (!anyHasData) emptyEntities.push(entity.key);
  }

  return {
    orphanKeys,
    emptyEntities,
    registeredCount: ENTITIES.length,
    localStorageKeyCount: realKeys.length,
    timestamp: new Date().toISOString(),
  };
}

/** Devuelve solo las claves huérfanas (wrapper útil para UI). */
export function findOrphanKeys(): string[] {
  return buildIntegrityReport().orphanKeys;
}

/**
 * Elimina una clave huérfana. Segura: solo si realmente es huérfana.
 * Devuelve true si se borró.
 */
export function removeOrphanKey(key: string): boolean {
  if (typeof window === "undefined") return false;
  const orphans = findOrphanKeys();
  if (!orphans.includes(key)) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
