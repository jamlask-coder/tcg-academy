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
 *
 * ## Modos
 *
 * - **server** (`NEXT_PUBLIC_BACKEND_MODE=server`): persiste en Supabase vía
 *   `/api/consents` y `/api/comm-preferences`. Los registros son inmutables
 *   y trazables a IP + user-agent (servidor los inyecta en cada POST).
 *
 * - **local**: persiste en localStorage. Útil para dev / static export.
 *
 * Todas las funciones son **async** porque en server mode hacen `fetch`.
 * En local mode resuelven sincrónicamente envueltas en `Promise.resolve`
 * para mantener el mismo API.
 */

const CONSENTS_KEY = "tcgacademy_consents";
const PREFERENCES_KEY = "tcgacademy_comm_preferences";

const IS_SERVER_MODE =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_BACKEND_MODE === "server");

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

export type CommChannel =
  | "email_orders"
  | "email_shipping"
  | "email_marketing"
  | "email_newsletter"
  | "email_offers";

export interface CommunicationPreferences {
  userId: string;
  channels: Record<CommChannel, boolean>;
  updatedAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function generateId(): string {
  return `consent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadLocalConsents(): ConsentRecord[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CONSENTS_KEY) ?? "[]") as ConsentRecord[];
  } catch {
    return [];
  }
}

function saveLocalConsents(records: ConsentRecord[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CONSENTS_KEY, JSON.stringify(records));
  } catch { /* storage full */ }
}

const DEFAULT_PREFERENCES: Record<CommChannel, boolean> = {
  email_orders: true,       // Transaccional — siempre activo (base legal: contrato)
  email_shipping: true,     // Transaccional — siempre activo
  email_marketing: false,   // Requiere consentimiento explícito
  email_newsletter: false,  // Requiere consentimiento explícito
  email_offers: false,      // Requiere consentimiento explícito
};

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Record a consent event (grant or revocation).
 * Never overwrites — always appends (full audit trail).
 *
 * En server mode hace POST /api/consents. En local guarda en localStorage.
 */
export async function recordConsent(params: {
  userId: string;
  type: ConsentType;
  status: "granted" | "revoked";
  method: string;
  version?: string;
}): Promise<ConsentRecord> {
  const version = params.version ?? "2026-04";

  if (IS_SERVER_MODE) {
    try {
      const res = await fetch("/api/consents", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: params.type,
          status: params.status,
          method: params.method,
          version,
        }),
      });
      if (!res.ok) {
        // Si el endpoint dice 501 estamos en local-mode pese al flag → fallback.
        if (res.status === 501) return recordLocal(params, version);
        throw new Error(`POST /api/consents → ${res.status}`);
      }
    } catch {
      // Best-effort: si falla la red dejamos la rama local como fallback
      // para no perder el dato. Cuando vuelva la conexión, una próxima
      // sesión escribe los nuevos.
      return recordLocal(params, version);
    }
    return {
      id: generateId(),
      userId: params.userId,
      type: params.type,
      status: params.status,
      method: params.method,
      version,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };
  }

  return recordLocal(params, version);
}

function recordLocal(
  params: {
    userId: string;
    type: ConsentType;
    status: "granted" | "revoked";
    method: string;
  },
  version: string,
): ConsentRecord {
  const record: ConsentRecord = {
    id: generateId(),
    userId: params.userId,
    type: params.type,
    status: params.status,
    method: params.method,
    version,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };
  const consents = loadLocalConsents();
  consents.push(record);
  saveLocalConsents(consents);
  return record;
}

/**
 * Record multiple consents at once (e.g., during registration).
 *
 * En server mode envía un batch en un solo POST. En local lo hace en bucle
 * sobre localStorage.
 */
export async function recordBulkConsent(params: {
  userId: string;
  consents: Array<{ type: ConsentType; status: "granted" | "revoked" }>;
  method: string;
  version?: string;
}): Promise<ConsentRecord[]> {
  const version = params.version ?? "2026-04";

  if (IS_SERVER_MODE) {
    try {
      const res = await fetch("/api/consents", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          params.consents.map((c) => ({
            type: c.type,
            status: c.status,
            method: params.method,
            version,
          })),
        ),
      });
      if (!res.ok) {
        if (res.status === 501) return recordBulkLocal(params, version);
        throw new Error(`POST /api/consents → ${res.status}`);
      }
    } catch {
      return recordBulkLocal(params, version);
    }
    const now = new Date().toISOString();
    return params.consents.map((c) => ({
      id: generateId(),
      userId: params.userId,
      type: c.type,
      status: c.status,
      method: params.method,
      version,
      timestamp: now,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    }));
  }

  return recordBulkLocal(params, version);
}

function recordBulkLocal(
  params: {
    userId: string;
    consents: Array<{ type: ConsentType; status: "granted" | "revoked" }>;
    method: string;
  },
  version: string,
): ConsentRecord[] {
  const records: ConsentRecord[] = [];
  const all = loadLocalConsents();
  for (const c of params.consents) {
    const record: ConsentRecord = {
      id: generateId(),
      userId: params.userId,
      type: c.type,
      status: c.status,
      method: params.method,
      version,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };
    all.push(record);
    records.push(record);
  }
  saveLocalConsents(all);
  return records;
}

/**
 * Get the full consent history for a user (for data export / audit).
 */
export async function getConsentHistory(userId: string): Promise<ConsentRecord[]> {
  if (IS_SERVER_MODE) {
    try {
      const res = await fetch("/api/consents", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 501) return loadLocalConsents().filter((c) => c.userId === userId);
        throw new Error(`GET /api/consents → ${res.status}`);
      }
      const json = (await res.json()) as { ok: boolean; consents?: Array<Record<string, unknown>> };
      if (!json.ok || !json.consents) return [];
      // Normalizamos al shape del cliente.
      return json.consents.map((r) => ({
        id: String(r.id ?? generateId()),
        userId: String(r.userId ?? userId),
        type: r.type as ConsentType,
        status: r.status as "granted" | "revoked",
        method: String(r.method ?? "unknown"),
        version: String(r.version ?? "2026-04"),
        timestamp: String(r.timestamp ?? new Date().toISOString()),
        ip: typeof r.ipAddress === "string" ? r.ipAddress : undefined,
        userAgent: typeof r.userAgent === "string" ? r.userAgent : undefined,
      }));
    } catch {
      return loadLocalConsents().filter((c) => c.userId === userId);
    }
  }
  return loadLocalConsents().filter((c) => c.userId === userId);
}

/**
 * Get the CURRENT status of a specific consent type for a user.
 * Returns the most recent record (consents are append-only).
 */
export async function getConsentStatus(
  userId: string,
  type: ConsentType,
): Promise<ConsentRecord | null> {
  const all = await getConsentHistory(userId);
  const filtered = all.filter((c) => c.type === type);
  if (filtered.length === 0) return null;
  return filtered[filtered.length - 1];
}

/**
 * Get ALL current consent statuses for a user.
 */
export async function getAllConsentStatuses(
  userId: string,
): Promise<Record<ConsentType, ConsentRecord | null>> {
  const types: ConsentType[] = [
    "terms",
    "privacy",
    "marketing_email",
    "cookies_analytics",
    "cookies_marketing",
    "data_processing",
  ];
  const all = await getConsentHistory(userId);
  const result: Record<string, ConsentRecord | null> = {};
  for (const type of types) {
    const filtered = all.filter((c) => c.type === type);
    result[type] = filtered.length === 0 ? null : filtered[filtered.length - 1];
  }
  return result as Record<ConsentType, ConsentRecord | null>;
}

/**
 * Delete all consent records for a user (GDPR deletion).
 * Should only be called as part of full account deletion. En server mode
 * el delete real lo hace `/api/users/[id]` con cascade — aquí solo
 * limpiamos localStorage por si quedaron rastros.
 */
export function deleteUserConsents(userId: string): number {
  const consents = loadLocalConsents();
  const filtered = consents.filter((c) => c.userId !== userId);
  const deletedCount = consents.length - filtered.length;
  saveLocalConsents(filtered);
  return deletedCount;
}

// ─── Communication Preferences ─────────────────────────────────────────────

export async function getCommPreferences(
  userId: string,
): Promise<CommunicationPreferences> {
  if (IS_SERVER_MODE) {
    try {
      const res = await fetch("/api/comm-preferences", { credentials: "include" });
      if (res.ok) {
        const json = (await res.json()) as {
          ok: boolean;
          preferences?: {
            userId: string;
            emailOrders: boolean;
            emailShipping: boolean;
            emailMarketing: boolean;
            emailNewsletter: boolean;
            emailOffers: boolean;
            updatedAt: string;
          };
        };
        if (json.ok && json.preferences) {
          return {
            userId: json.preferences.userId,
            channels: {
              email_orders: json.preferences.emailOrders,
              email_shipping: json.preferences.emailShipping,
              email_marketing: json.preferences.emailMarketing,
              email_newsletter: json.preferences.emailNewsletter,
              email_offers: json.preferences.emailOffers,
            },
            updatedAt: json.preferences.updatedAt,
          };
        }
      }
    } catch { /* fallback abajo */ }
  }

  // Local-mode o fallback en server-mode si falla la red.
  if (typeof localStorage !== "undefined") {
    try {
      const all = JSON.parse(
        localStorage.getItem(PREFERENCES_KEY) ?? "{}",
      ) as Record<string, CommunicationPreferences>;
      if (all[userId]) return all[userId];
    } catch { /* ignore */ }
  }

  return {
    userId,
    channels: { ...DEFAULT_PREFERENCES },
    updatedAt: new Date().toISOString(),
  };
}

export async function saveCommPreferences(
  userId: string,
  channels: Record<CommChannel, boolean>,
): Promise<void> {
  // Transactional channels can't be disabled (legal basis: contract).
  channels.email_orders = true;
  channels.email_shipping = true;

  if (IS_SERVER_MODE) {
    try {
      const res = await fetch("/api/comm-preferences", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailMarketing: channels.email_marketing,
          emailNewsletter: channels.email_newsletter,
          emailOffers: channels.email_offers,
        }),
      });
      if (res.ok) return;
      // 501 → local-mode, dejamos que caiga al fallback localStorage.
      if (res.status !== 501) {
        throw new Error(`PUT /api/comm-preferences → ${res.status}`);
      }
    } catch { /* fallback abajo */ }
  }

  // Local-mode o fallback.
  if (typeof localStorage === "undefined") return;
  try {
    const all = JSON.parse(
      localStorage.getItem(PREFERENCES_KEY) ?? "{}",
    ) as Record<string, CommunicationPreferences>;
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
export async function exportConsentData(userId: string): Promise<{
  consents: ConsentRecord[];
  preferences: CommunicationPreferences;
}> {
  const [consents, preferences] = await Promise.all([
    getConsentHistory(userId),
    getCommPreferences(userId),
  ]);
  return { consents, preferences };
}
