/**
 * errorReporter — Canal único para errores runtime del cliente.
 *
 * - Captura window.onerror + unhandledrejection.
 * - Guarda en localStorage (máx 200 entradas, ring buffer).
 * - Permite reporte manual desde try/catch con `reportError(...)`.
 * - Emite evento DOM `tcga:errors:updated` para que paneles admin refresquen.
 *
 * No depende de React ni de librerías UI — cualquier JS puede llamarlo.
 * Fail-silent: cualquier error interno se traga (nunca debe crashear la app).
 */

const STORAGE_KEY = "tcgacademy_runtime_errors";
const EVENT_NAME = "tcga:errors:updated";
const MAX_ENTRIES = 200;

export type ErrorSource =
  | "window.onerror"
  | "unhandledrejection"
  | "manual"
  | "boundary";

export interface RuntimeErrorEntry {
  id: string;
  timestamp: string;
  source: ErrorSource;
  message: string;
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
  context?: string;
  userAgent?: string;
  route?: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function safeRead(): RuntimeErrorEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(entries: RuntimeErrorEntry[]): void {
  if (!isBrowser()) return;
  try {
    const trimmed = entries.slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    try {
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch {
      /* dispatch failure non-critical */
    }
  } catch {
    /* storage full — skip silently */
  }
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Añade una entrada al buffer de errores.
 * Sobreescribe la más antigua cuando se llena.
 */
export function reportError(
  error: unknown,
  source: ErrorSource = "manual",
  context?: string,
): void {
  if (!isBrowser()) return;
  try {
    const entries = safeRead();
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : (() => {
              try {
                return JSON.stringify(error);
              } catch {
                return String(error);
              }
            })();
    const stack = error instanceof Error ? error.stack : undefined;
    const entry: RuntimeErrorEntry = {
      id: makeId(),
      timestamp: new Date().toISOString(),
      source,
      message: message.slice(0, 2000),
      stack: stack?.slice(0, 4000),
      context,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      route:
        typeof location !== "undefined"
          ? location.pathname + location.search
          : undefined,
    };
    entries.unshift(entry);
    safeWrite(entries);
  } catch {
    /* never throw */
  }
}

/** Lee las entradas guardadas (más recientes primero). */
export function getErrors(limit = MAX_ENTRIES): RuntimeErrorEntry[] {
  return safeRead().slice(0, limit);
}

/** Borra todas las entradas. */
export function clearErrors(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    try {
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
}

/** Cuenta errores sin reemplazos (para badge admin). */
export function countErrors(): number {
  return safeRead().length;
}

let installed = false;

/**
 * Instala listeners globales una única vez.
 * Idempotente — llamadas múltiples no duplican handlers.
 */
export function installErrorCapture(): void {
  if (!isBrowser() || installed) return;
  installed = true;
  try {
    window.addEventListener("error", (ev: ErrorEvent) => {
      try {
        const entries = safeRead();
        entries.unshift({
          id: makeId(),
          timestamp: new Date().toISOString(),
          source: "window.onerror",
          message: (ev.message ?? "Unknown error").slice(0, 2000),
          stack: ev.error?.stack?.slice(0, 4000),
          url: ev.filename,
          line: ev.lineno,
          column: ev.colno,
          userAgent: navigator.userAgent,
          route: location.pathname + location.search,
        });
        safeWrite(entries);
      } catch {
        /* swallow */
      }
    });

    window.addEventListener(
      "unhandledrejection",
      (ev: PromiseRejectionEvent) => {
        try {
          const reason: unknown = ev.reason;
          const message =
            reason instanceof Error
              ? reason.message
              : typeof reason === "string"
                ? reason
                : (() => {
                    try {
                      return JSON.stringify(reason);
                    } catch {
                      return String(reason);
                    }
                  })();
          const stack = reason instanceof Error ? reason.stack : undefined;
          const entries = safeRead();
          entries.unshift({
            id: makeId(),
            timestamp: new Date().toISOString(),
            source: "unhandledrejection",
            message: message.slice(0, 2000),
            stack: stack?.slice(0, 4000),
            userAgent: navigator.userAgent,
            route: location.pathname + location.search,
          });
          safeWrite(entries);
        } catch {
          /* swallow */
        }
      },
    );
  } catch {
    /* swallow */
  }
}

export const ERROR_REPORTER_EVENT = EVENT_NAME;
