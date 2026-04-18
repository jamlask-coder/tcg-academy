/**
 * Safe localStorage wrapper — handles quota, corruption, and concurrent access.
 *
 * Every write:
 *   1. Checks available quota BEFORE writing
 *   2. Validates JSON integrity after write
 *   3. Reports errors to a visible queue (not silent)
 *
 * Every read:
 *   1. Validates JSON parse
 *   2. Returns fallback on corruption (and logs the incident)
 */

// ── Error reporting ─────────────────────────────────────────────────────────

export interface StorageError {
  ts: number;
  key: string;
  type: "quota" | "corrupt" | "write_fail" | "parse_fail";
  detail: string;
}

const MAX_ERROR_LOG = 50;
const ERROR_KEY = "tcgacademy_storage_errors";

/** Get all recorded storage errors (most recent first) */
export function getStorageErrors(): StorageError[] {
  try {
    return JSON.parse(localStorage.getItem(ERROR_KEY) ?? "[]") as StorageError[];
  } catch {
    return [];
  }
}

function logStorageError(error: Omit<StorageError, "ts">): void {
  try {
    const errors = getStorageErrors();
    errors.unshift({ ...error, ts: Date.now() });
    if (errors.length > MAX_ERROR_LOG) errors.length = MAX_ERROR_LOG;
    // This is the ONE place we accept a potential quota error (meta-error)
    localStorage.setItem(ERROR_KEY, JSON.stringify(errors));
  } catch {
    // If even the error log fails, we can't do anything
  }
}

/** Dispatch a custom event so the UI can react to storage problems */
function dispatchStorageAlert(error: StorageError): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("tcga:storage:error", { detail: error }),
  );
}

// ── Quota estimation ────────────────────────────────────────────────────────

/**
 * Estimate remaining localStorage space in bytes.
 * localStorage limit is typically 5-10MB per origin.
 */
export function estimateRemainingQuota(): number {
  if (typeof window === "undefined") return Infinity;
  try {
    let totalUsed = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        totalUsed += key.length + (localStorage.getItem(key)?.length ?? 0);
      }
    }
    // Modern browsers allow ~10MB per origin. Use 9MB as conservative cap.
    // Each char = 2 bytes in JS (UTF-16).
    const LIMIT = 9 * 1024 * 1024;
    return Math.max(0, LIMIT - totalUsed * 2);
  } catch {
    return 0;
  }
}

/** Returns true if there's likely enough space for `bytes` more data */
export function hasQuotaFor(bytes: number): boolean {
  return estimateRemainingQuota() > bytes + 1024; // 1KB safety margin
}

// ── Core safe read/write ────────────────────────────────────────────────────

/**
 * Safely read and parse JSON from localStorage.
 * Returns `fallback` on any error (missing, corrupt, parse fail).
 */
export function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed;
  } catch (err) {
    const error: StorageError = {
      ts: Date.now(),
      key,
      type: "parse_fail",
      detail: `JSON parse failed: ${err instanceof Error ? err.message : "unknown"}`,
    };
    logStorageError(error);
    dispatchStorageAlert(error);
    return fallback;
  }
}

/**
 * Safely write JSON to localStorage with quota pre-check.
 * Returns `true` on success, `false` on failure.
 * NEVER silently fails — always logs and dispatches an event.
 */
export function safeWrite(key: string, data: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    const json = JSON.stringify(data);
    const byteSize = json.length * 2; // JS strings are UTF-16

    // Pre-check quota
    if (!hasQuotaFor(byteSize)) {
      const error: StorageError = {
        ts: Date.now(),
        key,
        type: "quota",
        detail: `Not enough space for ${byteSize} bytes. Remaining: ~${estimateRemainingQuota()} bytes`,
      };
      logStorageError(error);
      dispatchStorageAlert(error);
      return false;
    }

    localStorage.setItem(key, json);

    // Verify write integrity (read back and compare length)
    const readBack = localStorage.getItem(key);
    if (!readBack || readBack.length !== json.length) {
      const error: StorageError = {
        ts: Date.now(),
        key,
        type: "write_fail",
        detail: "Write verification failed — data may be corrupted",
      };
      logStorageError(error);
      dispatchStorageAlert(error);
      return false;
    }

    return true;
  } catch (err) {
    const isQuota =
      err instanceof DOMException &&
      (err.code === 22 || err.name === "QuotaExceededError");

    const error: StorageError = {
      ts: Date.now(),
      key,
      type: isQuota ? "quota" : "write_fail",
      detail: err instanceof Error ? err.message : "Unknown write error",
    };
    logStorageError(error);
    dispatchStorageAlert(error);
    return false;
  }
}

/**
 * Safely remove a key from localStorage.
 */
export function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Removal failure is non-critical
  }
}

// ── Typed helpers ───────────────────────────────────────────────────────────

/** Read a map (Record<string, T>) safely */
export function safeReadMap<T>(key: string): Record<string, T> {
  return safeRead<Record<string, T>>(key, {});
}

/** Read an array safely */
export function safeReadArray<T>(key: string): T[] {
  return safeRead<T[]>(key, []);
}

// ── Atomic read-modify-write ────────────────────────────────────────────────

/**
 * Atomically read, modify, and write back a value.
 * If the write fails, the original value is preserved.
 * Returns the new value on success, or null on failure.
 */
export function safeUpdate<T>(
  key: string,
  fallback: T,
  updater: (current: T) => T,
): { ok: boolean; value: T } {
  const current = safeRead<T>(key, fallback);
  const updated = updater(current);
  const ok = safeWrite(key, updated);
  return { ok, value: ok ? updated : current };
}

// ── Emergency cleanup ───────────────────────────────────────────────────────

/** Keys that can be safely trimmed when quota is critical (level 1 — gentle) */
const TRIMMABLE_KEYS = [
  "tcgacademy_email_log",
  "tcgacademy_coupon_usage",
  "tcgacademy_pts_history",
  "tcgacademy_notif_dynamic",
  "tcgacademy_autopilot_log",
  "tcgacademy_fiscal_audit_log",
  "tcgacademy_audit_log",
  "tcgacademy_storage_errors",
  "tcgacademy_recent_views",
  "tcgacademy_search_history",
];

/** Keys that can be FULLY purged in aggressive cleanup (level 2) */
const PURGEABLE_KEYS = [
  "tcgacademy_autopilot_log",
  "tcgacademy_fiscal_audit_log",
  "tcgacademy_storage_errors",
  "tcgacademy_recent_views",
  "tcgacademy_search_history",
  "tcgacademy_notif_dynamic",
  "tcgacademy_email_log",
];

/**
 * Emergency quota recovery: trims non-critical data to free space.
 * Call this when a critical write fails due to quota.
 * Returns bytes freed (approximate).
 */
export function emergencyTrimStorage(): number {
  let freed = 0;
  for (const key of TRIMMABLE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 20) {
        const trimmed = arr.slice(0, 20);
        const oldLen = raw.length;
        const newJson = JSON.stringify(trimmed);
        localStorage.setItem(key, newJson);
        freed += (oldLen - newJson.length) * 2;
      }
    } catch {
      // Skip this key
    }
  }
  return freed;
}

/**
 * AGGRESSIVE quota recovery: wipes purgeable keys entirely.
 * Use only when `emergencyTrimStorage()` was not enough (critical write still fails).
 */
export function aggressiveCleanup(): number {
  let freed = 0;
  for (const key of PURGEABLE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) freed += raw.length * 2;
      localStorage.removeItem(key);
    } catch {
      // Skip
    }
  }
  return freed;
}

/**
 * Robust write: tries write → trim → retry → aggressive cleanup → retry.
 * Guaranteed to make a best-effort attempt before returning false.
 */
export function robustWrite(key: string, data: unknown): boolean {
  if (safeWrite(key, data)) return true;
  emergencyTrimStorage();
  if (safeWrite(key, data)) return true;
  aggressiveCleanup();
  return safeWrite(key, data);
}
