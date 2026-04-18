/**
 * BACKUP SCHEDULER — ejecuta auto-snapshots cuando el admin entra en /admin.
 *
 * Diseño simple y robusto para un entorno local-first:
 *   - No depende de un background worker (en local no hay).
 *   - Se invoca desde el layout admin. Si ha pasado >= 24h desde el último
 *     snapshot, crea uno nuevo con trigger="auto".
 *   - Respeta un cooldown mínimo (1h) para evitar ráfagas si el admin recarga
 *     la pantalla varias veces.
 *   - Registra el último intento para no re-ejecutar en cada navegación SPA.
 *
 * Cuando el backend pase a modo "server" se añadirá un cron job real
 * (Supabase Edge Function o Vercel Cron) que llame a /api/admin/backup.
 */

import {
  createSnapshot,
  saveSnapshot,
  listSnapshots,
} from "@/services/backupService";

const LAST_RUN_KEY = "tcgacademy_backup_scheduler_last";
const AUTO_INTERVAL_HOURS = 24;
const COOLDOWN_HOURS = 1;

interface SchedulerRun {
  /** ISO timestamp del último intento (haya creado o no). */
  lastAttempt: string;
  /** ID del último snapshot auto creado. */
  lastSnapshotId?: string;
  /** Resultado del último intento. */
  lastResult: "created" | "skipped-cooldown" | "skipped-recent" | "error";
  lastError?: string;
}

function loadLastRun(): SchedulerRun | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_RUN_KEY);
    return raw ? (JSON.parse(raw) as SchedulerRun) : null;
  } catch {
    return null;
  }
}

function saveLastRun(run: SchedulerRun): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_RUN_KEY, JSON.stringify(run));
  } catch {
    /* cuota llena — el scheduler no bloquea */
  }
}

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

/**
 * Comprueba si toca crear un snapshot automático y lo crea si procede.
 *
 * @returns SchedulerRun con el resultado (útil para log/tests; en el layout se ignora).
 */
export async function runAutoBackupIfDue(): Promise<SchedulerRun> {
  const now = new Date().toISOString();

  if (typeof window === "undefined") {
    return { lastAttempt: now, lastResult: "error", lastError: "no-browser" };
  }

  // 1. Cooldown: no más de un intento por hora
  const prev = loadLastRun();
  if (prev && hoursSince(prev.lastAttempt) < COOLDOWN_HOURS) {
    return {
      ...prev,
      lastAttempt: prev.lastAttempt, // preservar — no actualizar en cooldown
      lastResult: "skipped-cooldown",
    };
  }

  // 2. Si ya existe un snapshot reciente, no crear otro
  const latest = listSnapshots()[0];
  if (latest && hoursSince(latest.createdAt) < AUTO_INTERVAL_HOURS) {
    const run: SchedulerRun = {
      lastAttempt: now,
      lastSnapshotId: latest.id,
      lastResult: "skipped-recent",
    };
    saveLastRun(run);
    return run;
  }

  // 3. Crear snapshot
  try {
    const snap = await createSnapshot(
      "auto",
      `Auto-snapshot al entrar en /admin (${new Date().toLocaleString("es-ES")})`,
    );
    const ok = saveSnapshot(snap);
    if (!ok) {
      const run: SchedulerRun = {
        lastAttempt: now,
        lastResult: "error",
        lastError: "save-failed-quota",
      };
      saveLastRun(run);
      return run;
    }
    const run: SchedulerRun = {
      lastAttempt: now,
      lastSnapshotId: snap.id,
      lastResult: "created",
    };
    saveLastRun(run);
    return run;
  } catch (e) {
    const run: SchedulerRun = {
      lastAttempt: now,
      lastResult: "error",
      lastError: e instanceof Error ? e.message : "unknown",
    };
    saveLastRun(run);
    return run;
  }
}

/**
 * Helper para UI: devuelve cuánto falta para el próximo snapshot automático.
 * Usa el último snapshot (de cualquier trigger) como referencia.
 */
export function hoursUntilNextAutoBackup(): number | null {
  const latest = listSnapshots()[0];
  if (!latest) return 0; // Toca ya
  const h = hoursSince(latest.createdAt);
  const remaining = AUTO_INTERVAL_HOURS - h;
  return remaining > 0 ? remaining : 0;
}

/** Expuesto para que el panel de copias pueda mostrar el último estado. */
export function getLastSchedulerRun(): SchedulerRun | null {
  return loadLastRun();
}
