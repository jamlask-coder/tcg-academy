/**
 * GDPR compliance service — data portability (export) and right to erasure (delete).
 *
 * Reads/writes user data from localStorage keys used across the app.
 * Spain legal requirement: invoices must be kept 6 years (Ley General Tributaria).
 */

import { logAudit } from "@/services/auditService";

// ─── Storage keys ───────────────────────────────────────────────────────────

const REGISTERED_KEY = "tcgacademy_registered";
const USERNAMES_KEY = "tcgacademy_usernames";
const ORDERS_KEY = "tcgacademy_orders";
const ADMIN_ORDERS_KEY = "tcgacademy_admin_orders";
const INVOICES_KEY = "tcgacademy_invoices";
const POINTS_KEY = "tcgacademy_pts";
const POINTS_HISTORY_KEY = "tcgacademy_pts_history";
const POINTS_ATTR_KEY = "tcgacademy_pts_attr";
const MESSAGES_KEY = "tcgacademy_messages";
const SENT_EMAILS_KEY = "tcgacademy_sent_emails";
const NOTIFICATIONS_KEY = "tcgacademy_notif_dynamic";

const ANONYMIZED = "ELIMINADO";

// ─── Types ──────────────────────────────────────────────────────────────────

interface UserDataExport {
  profile: Record<string, unknown> | null;
  orders: Array<Record<string, unknown>>;
  invoices: Array<Record<string, unknown>>;
  points: Record<string, unknown> | null;
  pointsHistory: Array<Record<string, unknown>>;
  favorites: Array<unknown>;
  messages: Array<Record<string, unknown>>;
  emailLog: Array<Record<string, unknown>>;
  notifications: Array<Record<string, unknown>>;
}

interface DeletionResult {
  deleted: string[];
  kept: string[];
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function safeGetJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSetJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full */
  }
}

function findUserProfile(
  userId: string,
): { email: string; profile: Record<string, unknown> } | null {
  const registered = safeGetJSON<Record<string, Record<string, unknown>>>(
    REGISTERED_KEY,
    {},
  );

  // userId might be an email or a username-based key
  for (const [email, profile] of Object.entries(registered)) {
    if (
      email === userId ||
      profile.username === userId ||
      profile.email === userId
    ) {
      return { email, profile };
    }
  }
  return null;
}

// ─── Export user data (GDPR Art. 20 — Data portability) ─────────────────────

/**
 * Collects ALL data about a user from all localStorage keys.
 * Returns a structured object ready for JSON export.
 */
export function exportUserData(userId: string): UserDataExport {
  const userInfo = findUserProfile(userId);
  const userEmail = userInfo?.email ?? userId;

  // Profile
  const profile = userInfo?.profile ?? null;

  // Orders (client-side)
  const allOrders = safeGetJSON<Array<Record<string, unknown>>>(ORDERS_KEY, []);
  const userOrders = allOrders.filter(
    (o) => o.userId === userId || o.userId === userEmail,
  );

  // Invoices
  const allInvoices = safeGetJSON<Array<Record<string, unknown>>>(
    INVOICES_KEY,
    [],
  );
  const userInvoices = allInvoices.filter((inv) => {
    const recipient = inv.recipient as Record<string, unknown> | undefined;
    if (!recipient) return false;
    return (
      recipient.email === userEmail ||
      recipient.name === userInfo?.profile?.name ||
      recipient.taxId === userInfo?.profile?.cif
    );
  });

  // Points
  const allPoints = safeGetJSON<Record<string, unknown>>(POINTS_KEY, {});
  const userPoints =
    (allPoints[userId] as Record<string, unknown> | undefined) ??
    (allPoints[userEmail] as Record<string, unknown> | undefined) ??
    null;

  // Points history
  const allHistory = safeGetJSON<Record<string, Array<Record<string, unknown>>>>(
    POINTS_HISTORY_KEY,
    {},
  );
  const userHistory = allHistory[userId] ?? allHistory[userEmail] ?? [];

  // Favorites from profile
  const favorites = (profile?.favorites as Array<unknown>) ?? [];

  // Messages
  const allMessages = safeGetJSON<Array<Record<string, unknown>>>(
    MESSAGES_KEY,
    [],
  );
  const userMessages = allMessages.filter(
    (m) =>
      m.fromUserId === userId ||
      m.toUserId === userId ||
      m.fromUserId === userEmail ||
      m.toUserId === userEmail,
  );

  // Sent emails
  const allEmails = safeGetJSON<Array<Record<string, unknown>>>(
    SENT_EMAILS_KEY,
    [],
  );
  const userEmails = allEmails.filter(
    (e) => e.to === userEmail || e.recipient === userEmail,
  );

  // Notifications
  const allNotifications = safeGetJSON<Array<Record<string, unknown>>>(
    NOTIFICATIONS_KEY,
    [],
  );
  const userNotifications = allNotifications.filter(
    (n) => n.userId === userId || n.userId === userEmail,
  );

  return {
    profile,
    orders: userOrders,
    invoices: userInvoices,
    points: userPoints,
    pointsHistory: userHistory,
    favorites,
    messages: userMessages,
    emailLog: userEmails,
    notifications: userNotifications,
  };
}

// ─── Delete user data (GDPR Art. 17 — Right to erasure) ────────────────────

/**
 * Deletes or anonymizes user data across all localStorage keys.
 *
 * - Invoices are KEPT by default (Spanish law: 6-year retention for accounting)
 * - Orders are anonymized (name/email/address replaced) but kept for accounting
 * - Everything else is fully deleted
 *
 * @param keepInvoices — if true (default), invoices are kept for legal compliance
 */
export function deleteUserData(
  userId: string,
  keepInvoices = true,
): DeletionResult {
  const deleted: string[] = [];
  const kept: string[] = [];

  const userInfo = findUserProfile(userId);
  const userEmail = userInfo?.email ?? userId;

  // 1. Remove from registered users
  const registered = safeGetJSON<Record<string, Record<string, unknown>>>(
    REGISTERED_KEY,
    {},
  );
  if (registered[userEmail]) {
    delete registered[userEmail];
    safeSetJSON(REGISTERED_KEY, registered);
    deleted.push("Perfil de usuario");
  }

  // 2. Remove from usernames mapping
  const usernames = safeGetJSON<Record<string, string>>(USERNAMES_KEY, {});
  const usernameEntries = Object.entries(usernames);
  let usernameRemoved = false;
  for (const [username, email] of usernameEntries) {
    if (email === userEmail) {
      delete usernames[username];
      usernameRemoved = true;
    }
  }
  if (usernameRemoved) {
    safeSetJSON(USERNAMES_KEY, usernames);
    deleted.push("Nombre de usuario");
  }

  // 3. Anonymize orders (keep for accounting, remove PII)
  const orders = safeGetJSON<Array<Record<string, unknown>>>(ORDERS_KEY, []);
  let ordersAnonymized = 0;
  const updatedOrders = orders.map((o) => {
    if (o.userId === userId || o.userId === userEmail) {
      ordersAnonymized++;
      return {
        ...o,
        userId: ANONYMIZED,
        address: ANONYMIZED,
      };
    }
    return o;
  });
  if (ordersAnonymized > 0) {
    safeSetJSON(ORDERS_KEY, updatedOrders);
    deleted.push(`${ordersAnonymized} pedidos anonimizados`);
  }

  // Anonymize admin orders too
  const adminOrders = safeGetJSON<Array<Record<string, unknown>>>(
    ADMIN_ORDERS_KEY,
    [],
  );
  let adminOrdersAnonymized = 0;
  const updatedAdminOrders = adminOrders.map((o) => {
    if (o.userId === userId || o.userEmail === userEmail) {
      adminOrdersAnonymized++;
      return {
        ...o,
        userName: ANONYMIZED,
        userEmail: ANONYMIZED,
        address: ANONYMIZED,
      };
    }
    return o;
  });
  if (adminOrdersAnonymized > 0) {
    safeSetJSON(ADMIN_ORDERS_KEY, updatedAdminOrders);
    deleted.push(`${adminOrdersAnonymized} pedidos admin anonimizados`);
  }

  // 4. Invoices — keep or delete based on parameter
  if (keepInvoices) {
    kept.push("Facturas (conservadas por obligacion legal — 6 anos)");
  } else {
    const invoices = safeGetJSON<Array<Record<string, unknown>>>(
      INVOICES_KEY,
      [],
    );
    const beforeCount = invoices.length;
    const filtered = invoices.filter((inv) => {
      const recipient = inv.recipient as Record<string, unknown> | undefined;
      if (!recipient) return true;
      return (
        recipient.email !== userEmail &&
        recipient.name !== userInfo?.profile?.name
      );
    });
    if (filtered.length < beforeCount) {
      safeSetJSON(INVOICES_KEY, filtered);
      deleted.push(`${beforeCount - filtered.length} facturas eliminadas`);
    }
  }

  // 5. Delete points
  const points = safeGetJSON<Record<string, unknown>>(POINTS_KEY, {});
  if (points[userId] || points[userEmail]) {
    delete points[userId];
    delete points[userEmail];
    safeSetJSON(POINTS_KEY, points);
    deleted.push("Puntos de fidelizacion");
  }

  // Points history
  const history = safeGetJSON<Record<string, unknown>>(POINTS_HISTORY_KEY, {});
  if (history[userId] || history[userEmail]) {
    delete history[userId];
    delete history[userEmail];
    safeSetJSON(POINTS_HISTORY_KEY, history);
    deleted.push("Historial de puntos");
  }

  // Points attribution
  const attr = safeGetJSON<Record<string, unknown>>(POINTS_ATTR_KEY, {});
  if (attr[userId] || attr[userEmail]) {
    delete attr[userId];
    delete attr[userEmail];
    safeSetJSON(POINTS_ATTR_KEY, attr);
  }

  // 6. Delete messages
  const messages = safeGetJSON<Array<Record<string, unknown>>>(
    MESSAGES_KEY,
    [],
  );
  const filteredMessages = messages.filter(
    (m) =>
      m.fromUserId !== userId &&
      m.toUserId !== userId &&
      m.fromUserId !== userEmail &&
      m.toUserId !== userEmail,
  );
  if (filteredMessages.length < messages.length) {
    safeSetJSON(MESSAGES_KEY, filteredMessages);
    deleted.push(
      `${messages.length - filteredMessages.length} mensajes eliminados`,
    );
  }

  // 7. Delete notifications
  const notifications = safeGetJSON<Array<Record<string, unknown>>>(
    NOTIFICATIONS_KEY,
    [],
  );
  const filteredNotifs = notifications.filter(
    (n) => n.userId !== userId && n.userId !== userEmail,
  );
  if (filteredNotifs.length < notifications.length) {
    safeSetJSON(NOTIFICATIONS_KEY, filteredNotifs);
    deleted.push("Notificaciones eliminadas");
  }

  // 8. Delete consent records
  const CONSENTS_KEY = "tcgacademy_consents";
  const consents = safeGetJSON<Array<Record<string, unknown>>>(CONSENTS_KEY, []);
  const filteredConsents = consents.filter((c) => c.userId !== userId);
  if (filteredConsents.length < consents.length) {
    safeSetJSON(CONSENTS_KEY, filteredConsents);
    deleted.push("Registros de consentimiento eliminados");
  }

  // 9. Delete communication preferences
  const PREFS_KEY = "tcgacademy_comm_preferences";
  const prefs = safeGetJSON<Record<string, unknown>>(PREFS_KEY, {});
  if (prefs[userId]) {
    delete prefs[userId];
    safeSetJSON(PREFS_KEY, prefs);
    deleted.push("Preferencias de comunicación eliminadas");
  }

  // 10. Delete reset tokens
  const TOKENS_KEY = "tcgacademy_reset_tokens";
  const tokens = safeGetJSON<Record<string, unknown>>(TOKENS_KEY, {});
  if (tokens[userEmail]) {
    delete tokens[userEmail];
    safeSetJSON(TOKENS_KEY, tokens);
    deleted.push("Tokens de recuperación eliminados");
  }

  // 11. Log the deletion in audit trail
  logAudit({
    entityType: "user",
    entityId: userId,
    action: "gdpr_deletion",
    field: "all_personal_data",
    oldValue: userEmail,
    newValue: ANONYMIZED,
    performedBy: "admin",
  });

  return { deleted, kept };
}

// ─── Download as JSON (GDPR Art. 20) ────────────────────────────────────────

/**
 * Returns a formatted JSON string of all user data, ready for download.
 */
export function downloadUserDataAsJSON(userId: string): string {
  const data = exportUserData(userId);
  return JSON.stringify(data, null, 2);
}
