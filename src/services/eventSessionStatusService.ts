/**
 * eventSessionStatusService — admin "marcar plazas agotadas" por sesión.
 *
 * Caso de uso: alguien se apunta directamente en la tienda (cash, fuera de la
 * web). El admin entra en /eventos/<slug>, pulsa "Marcar lleno" en la sesión
 * que tocó, y la web bloquea ventas online de esa sesión sin tener que tocar
 * el aforo programado.
 *
 * Granularidad: una marca por (eventId, sessionIdx). Sábado puede estar lleno
 * y domingo no — son sesiones independientes.
 *
 * Almacenamiento: localStorage `tcgacademy_event_session_full`. Forma:
 *   `{ "<eventId>:<sessionIdx>": { fullAt: ISOdate } }`
 *
 * SSOT: este servicio es el ÚNICO punto de escritura. Lectura para UI vía
 * `isSessionMarkedFull` o `loadAllMarks`. Cambios → DataHub.emit("event_sessions").
 */

import * as DataHub from "@/lib/dataHub";

const STORAGE_KEY = "tcgacademy_event_session_full";

interface SessionFullMarks {
  [compositeKey: string]: { fullAt: string };
}

function compositeKey(eventId: number, sessionIdx: number): string {
  return `${eventId}:${sessionIdx}`;
}

function loadRaw(): SessionFullMarks {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as SessionFullMarks;
    }
    return {};
  } catch {
    return {};
  }
}

function persist(marks: SessionFullMarks): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(marks));
  } catch {
    /* quota / private mode — non-fatal */
  }
  DataHub.emit("event_sessions");
}

/**
 * Marca una sesión como llena (ventas online cerradas para esa sesión).
 * Idempotente — si ya está marcada, no cambia el `fullAt`.
 */
export function markSessionFull(eventId: number, sessionIdx: number): void {
  const marks = loadRaw();
  const key = compositeKey(eventId, sessionIdx);
  if (marks[key]) return;
  marks[key] = { fullAt: new Date().toISOString() };
  persist(marks);
}

/** Reabre una sesión cerrada manualmente (vuelven a venderse plazas online). */
export function unmarkSessionFull(eventId: number, sessionIdx: number): void {
  const marks = loadRaw();
  const key = compositeKey(eventId, sessionIdx);
  if (!marks[key]) return;
  delete marks[key];
  persist(marks);
}

/**
 * @returns true si el admin marcó esta sesión como llena. NO contempla el
 * agotamiento por carrito — eso lo gestiona el flujo normal de stock virtual.
 */
export function isSessionMarkedFull(
  eventId: number,
  sessionIdx: number,
): boolean {
  const marks = loadRaw();
  return !!marks[compositeKey(eventId, sessionIdx)];
}

/** Útil para vistas admin que listan todas las marcas activas. */
export function loadAllMarks(): SessionFullMarks {
  return loadRaw();
}
