/**
 * Consent Registry Service — RGPD Art. 7 compliance
 *
 * Tracks every consent given/revoked with:
 * - What: type of consent (terms, privacy, marketing, cookies, etc.)
 * - When: ISO timestamp
 * - How: method (registration form, cookie banner, preferences page, etc.)
 * - Version: policy version at time of consent
 * - Status: granted / revoked
 *
 * This registry allows the company to PROVE consent was given,
 * which is required by Art. 7.1 RGPD.
 */

const CONSENTS_KEY = "tcgacademy_consents";
const PREFERENCES_KEY = "tcgacademy_comm_preferences";

// ─── Types ─────────────────────────────────────────────────────────────────

export type ConsentType =
  | "terms"           // Términos y condiciones
  | "privacy"         // Política de privacidad
  | "marketing_email" // Comunicaciones comerciales por email
  | "cookies_analytics"  // Cookies de análisis
  | "cookies_marketing"  // Cookies publicitarias
  | "data_processing";   // Tratamiento de datos (base: contrato)

export interface ConsentRecord {
  id: string;
  userId: string;
  type: ConsentType;
  status: "granted" | "revoked";
  method: string;      // "registration_form", "cookie_banner", "preferences_page", etc.
  version: string;     // Policy version at time of consent (e.g., "2026-04")
  timestamp: string;   // ISO 8601
  ip?: string;         // If available (server mode)
  userAgent?: string;  // Browser info at time of consent
}

export type CommChannel = "email_orders" | "email_shipping" | "email_marketing" | "email_newsletter" | "email_offers";

export interface CommunicationPreferences {
  userId: string;
  channels: Record<CommChannel, boolean>;
  updatedAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function generateId(): string {
  return `consent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadConsents(): ConsentRecord[] {
  try {
    return JSON.parse(localStorage.getItem(CONSENTS_KEY) ?? "[]") as ConsentRecord[];
  } catch {
    return [];
  }
}

function saveConsents(records: ConsentRecord[]): void {
  try {
    localStorage.setItem(CONSENTS_KEY, JSON.stringify(records));
  } catch { /* storage full */ }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Record a consent event (grant or revocation).
 * Never overwrites — always appends (full audit trail).
 */
export function recordConsent(params: {
  userId: string;
  type: ConsentType;
  status: "granted" | "revoked";
  method: string;
  version?: string;
}): ConsentRecord {
  const record: ConsentRecord = {
    id: generateId(),
    userId: params.userId,
    type: params.type,
    status: params.status,
    method: params.method,
    version: params.version ?? "2026-04",
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };

  const consents = loadConsents();
  consents.push(record);
  saveConsents(consents);
  return record;
}

/**
 * Record multiple consents at once (e.g., during registration).
 */
export function recordBulkConsent(params: {
  userId: string;
  consents: Array<{ type: ConsentType; status: "granted" | "revoked" }>;
  method: string;
  version?: string;
}): ConsentRecord[] {
  const records: ConsentRecord[] = [];
  const all = loadConsents();

  for (const c of params.consents) {
    const record: ConsentRecord = {
      id: generateId(),
      userId: params.userId,
      type: c.type,
      status: c.status,
      method: params.method,
      version: params.version ?? "2026-04",
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };
    all.push(record);
    records.push(record);
  }

  saveConsents(all);
  return records;
}

/**
 * Get the CURRENT status of a specific consent type for a user.
 * Returns the most recent record (consents are append-only).
 */
export function getConsentStatus(
  userId: string,
  type: ConsentType,
): ConsentRecord | null {
  const consents = loadConsents();
  const userConsents = consents.filter(
    (c) => c.userId === userId && c.type === type,
  );
  if (userConsents.length === 0) return null;
  return userConsents[userConsents.length - 1];
}

/**
 * Get ALL current consent statuses for a user.
 */
export function getAllConsentStatuses(
  userId: string,
): Record<ConsentType, ConsentRecord | null> {
  const types: ConsentType[] = [
    "terms",
    "privacy",
    "marketing_email",
    "cookies_analytics",
    "cookies_marketing",
    "data_processing",
  ];
  const result: Record<string, ConsentRecord | null> = {};
  for (const type of types) {
    result[type] = getConsentStatus(userId, type);
  }
  return result as Record<ConsentType, ConsentRecord | null>;
}

/**
 * Get the full consent history for a user (for data export / audit).
 */
export function getConsentHistory(userId: string): ConsentRecord[] {
  return loadConsents().filter((c) => c.userId === userId);
}

/**
 * Delete all consent records for a user (GDPR deletion).
 * Should only be called as part of full account deletion.
 */
export function deleteUserConsents(userId: string): number {
  const consents = loadConsents();
  const filtered = consents.filter((c) => c.userId !== userId);
  const deletedCount = consents.length - filtered.length;
  saveConsents(filtered);
  return deletedCount;
}

// ─── Communication Preferences ─────────────────────────────────────────────

const DEFAULT_PREFERENCES: Record<CommChannel, boolean> = {
  email_orders: true,       // Transaccional — siempre activo (base legal: contrato)
  email_shipping: true,     // Transaccional — siempre activo
  email_marketing: false,   // Requiere consentimiento explícito
  email_newsletter: false,  // Requiere consentimiento explícito
  email_offers: false,      // Requiere consentimiento explícito
};

export function getCommPreferences(userId: string): CommunicationPreferences {
  try {
    const all = JSON.parse(
      localStorage.getItem(PREFERENCES_KEY) ?? "{}",
    ) as Record<string, CommunicationPreferences>;
    if (all[userId]) return all[userId];
  } catch { /* ignore */ }

  return {
    userId,
    channels: { ...DEFAULT_PREFERENCES },
    updatedAt: new Date().toISOString(),
  };
}

export function saveCommPreferences(
  userId: string,
  channels: Record<CommChannel, boolean>,
): void {
  try {
    const all = JSON.parse(
      localStorage.getItem(PREFERENCES_KEY) ?? "{}",
    ) as Record<string, CommunicationPreferences>;

    // Transactional channels can't be disabled (legal basis: contract)
    channels.email_orders = true;
    channels.email_shipping = true;

    all[userId] = {
      userId,
      channels,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(all));
  } catch { /* storage full */ }
}

/**
 * Export all consent and preference data for a user (GDPR portability).
 */
export function exportConsentData(userId: string): {
  consents: ConsentRecord[];
  preferences: CommunicationPreferences;
} {
  return {
    consents: getConsentHistory(userId),
    preferences: getCommPreferences(userId),
  };
}
