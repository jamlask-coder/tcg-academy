/**
 * Structured logging service for TCG Academy.
 *
 * In local mode: stores logs in localStorage (max 1000 entries).
 * In server mode: outputs structured JSON to stdout for log aggregators
 * (Datadog, CloudWatch, etc.)
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
}

const LOG_KEY = "tcgacademy_app_logs";
const MAX_LOGS = 1000;

function isServer(): boolean {
  return typeof window === "undefined";
}

function writeLog(entry: LogEntry): void {
  if (isServer()) {
    // Server: structured JSON to stdout (captured by log aggregators)
    const line = JSON.stringify(entry);
    if (entry.level === "error") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
    return;
  }

  // Client: store in localStorage
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const logs: LogEntry[] = raw ? JSON.parse(raw) : [];
    logs.unshift(entry);
    if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

function createLogEntry(level: LogLevel, message: string, context?: string, data?: Record<string, unknown>): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
    ...(data ? { data } : {}),
  };
}

export const logger = {
  info(message: string, context?: string, data?: Record<string, unknown>): void {
    writeLog(createLogEntry("info", message, context, data));
  },

  warn(message: string, context?: string, data?: Record<string, unknown>): void {
    writeLog(createLogEntry("warn", message, context, data));
  },

  error(message: string, context?: string, data?: Record<string, unknown>): void {
    writeLog(createLogEntry("error", message, context, data));
  },

  debug(message: string, context?: string, data?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === "development") {
      writeLog(createLogEntry("debug", message, context, data));
    }
  },

  /** Get client-side logs (browser only) */
  getLogs(level?: LogLevel, limit = 100): LogEntry[] {
    if (isServer()) return [];
    try {
      const raw = localStorage.getItem(LOG_KEY);
      const logs: LogEntry[] = raw ? JSON.parse(raw) : [];
      const filtered = level ? logs.filter((l) => l.level === level) : logs;
      return filtered.slice(0, limit);
    } catch {
      return [];
    }
  },

  /** Export logs as CSV (browser only) */
  exportCSV(): string {
    const logs = this.getLogs(undefined, MAX_LOGS);
    const header = "timestamp,level,context,message";
    const rows = logs.map((l) =>
      `"${l.timestamp}","${l.level}","${l.context ?? ""}","${l.message.replace(/"/g, '""')}"`,
    );
    return [header, ...rows].join("\n");
  },

  /** Clear all logs (browser only) */
  clear(): void {
    if (!isServer()) {
      localStorage.removeItem(LOG_KEY);
    }
  },
};
