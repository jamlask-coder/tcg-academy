/**
 * Audit trail service — tracks all changes to orders, invoices, users, and settings.
 *
 * Stores entries in localStorage (key: tcgacademy_audit_log).
 * Max 5000 entries — FIFO when exceeded.
 */

const AUDIT_STORAGE_KEY = "tcgacademy_audit_log";
const MAX_ENTRIES = 5000;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  timestamp: string;
  entityType: "order" | "invoice" | "user" | "settings";
  entityId: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  performedBy: string;
  ip?: string;
}

type AuditEntryInput = Omit<AuditEntry, "id" | "timestamp">;

// ─── Internal helpers ───────────────────────────────────────────────────────

function loadEntries(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AuditEntry[];
  } catch {
    return [];
  }
}

function saveEntries(entries: AuditEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* storage full — silently fail */
  }
}

function generateAuditId(): string {
  return `aud_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Log a new audit entry. Auto-generates id and timestamp.
 * Enforces FIFO limit of MAX_ENTRIES.
 */
export function logAudit(entry: AuditEntryInput): void {
  const entries = loadEntries();

  const newEntry: AuditEntry = {
    ...entry,
    id: generateAuditId(),
    timestamp: new Date().toISOString(),
  };

  entries.push(newEntry);

  // FIFO: remove oldest entries if over limit
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }

  saveEntries(entries);
}

/**
 * Retrieve audit log entries, newest first.
 * Optionally filter by entityType, entityId, and limit results.
 */
export function getAuditLog(
  entityType?: string,
  entityId?: string,
  limit?: number,
): AuditEntry[] {
  let entries = loadEntries();

  if (entityType) {
    entries = entries.filter((e) => e.entityType === entityType);
  }
  if (entityId) {
    entries = entries.filter((e) => e.entityId === entityId);
  }

  // Newest first
  entries.reverse();

  if (limit && limit > 0) {
    entries = entries.slice(0, limit);
  }

  return entries;
}

/**
 * Shorthand: get all audit entries for a specific order.
 */
export function getAuditLogForOrder(orderId: string): AuditEntry[] {
  return getAuditLog("order", orderId);
}

/**
 * Export the full audit log as a CSV string.
 */
export function exportAuditLog(): string {
  const entries = loadEntries();
  const headers = [
    "id",
    "timestamp",
    "entityType",
    "entityId",
    "action",
    "field",
    "oldValue",
    "newValue",
    "performedBy",
    "ip",
  ];

  const csvRows = [headers.join(",")];

  for (const entry of entries) {
    const row = headers.map((h) => {
      const value = entry[h as keyof AuditEntry] ?? "";
      // Escape CSV values containing commas, quotes, or newlines
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csvRows.push(row.join(","));
  }

  return csvRows.join("\n");
}
