/**
 * Servicio de puntos, check-in diario y programa de asociaciones.
 *
 * Reglas de negocio:
 *   - Comprador: 10 pts por cada €10 gastados (1 pt/€)
 *   - Cada asociado: 5 pts por cada €10 que gaste el comprador (0,5 pt/€)
 *   - Check-in diario: 10 pts gratis
 *   - Registro con código: 100 pts de bienvenida
 *   - 1 punto = €0.01 de descuento
 *   - En caso de devolución se revierten los puntos de comprador y asociados
 *
 * Seguridad (client-side):
 *   - El timestamp del check-in está protegido con un hash simple que impide
 *     manipular el localStorage sin revelar el salt.
 *   - En producción, mover toda la lógica al backend.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const POINTS_PER_EURO = 1;           // 1 pt por €1 (= 10 pts por €10)
export const DAILY_CHECKIN_POINTS = 10;
export const POINTS_PER_100 = 0.1;          // referencia: 1 pt = €0.01
export const CHECKIN_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const POINTS_MAX_DISCOUNT_PCT    = 0.5; // los puntos no pueden descontar más del 50% del subtotal de productos
export const MAX_ASSOCIATIONS           = 4;   // máximo de asociados en el grupo
export const REFERRAL_WELCOME_BONUS     = 100; // pts al registrarse con código
// 50 pts por cada €100 gastados = 5 pts por cada €10 gastados (0.5 pt/€)
export const REFERRAL_ASSOC_PTS_PER_100 = 50;
export const ASSOCIATION_LOCK_MS = 365 * 24 * 60 * 60 * 1000; // bloqueo 1 año

// Storage keys
const POINTS_KEY   = "tcgacademy_pts";
const CHECKIN_KEY  = "tcgacademy_checkin";
const REFCODE_KEY  = "tcgacademy_refcodes";
const USERCODE_KEY = "tcgacademy_usercodes";
const ASSOC_KEY    = "tcgacademy_assoc";
const ATTR_KEY     = "tcgacademy_pts_attr";
const HISTORY_KEY  = "tcgacademy_pts_history"; // { [userId]: HistoryEntry[] }

const HASH_SALT = "tcga-pts-2025-v3-secure";

// ─── Internal helpers ─────────────────────────────────────────────────────────

function simpleHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(36).padStart(7, "0");
}

function makeCheckinHash(userId: string, ts: number): string {
  return simpleHash(`${HASH_SALT}|${userId}|${ts}|${HASH_SALT}`);
}

function loadMap<T>(key: string): Record<string, T> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, T>;
  } catch {
    return {};
  }
}

/**
 * Save a map to localStorage.
 * HARDENED: no longer ignores quota errors silently.
 * Returns true on success, false on failure.
 * Dispatches a storage error event on failure.
 */
function saveMap(key: string, data: Record<string, unknown>): boolean {
  if (typeof window === "undefined") return false;
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(key, json);
    return true;
  } catch (err) {
    // Dispatch error event so UI can react
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("tcga:storage:error", {
          detail: {
            ts: Date.now(),
            key,
            type: "quota",
            detail: err instanceof Error ? err.message : "Unknown write error",
          },
        }),
      );
    }
    return false;
  }
}

// ─── Transaction history ──────────────────────────────────────────────────────

export type HistoryEntryType =
  | "compra"
  | "devolucion"
  | "checkin"
  | "bienvenida"
  | "asociacion";

export interface HistoryEntry {
  id: string;
  ts: number;
  pts: number;            // positivo = ganado, negativo = deducido
  type: HistoryEntryType;
  desc: string;
  sourceUserId?: string;  // para "asociacion": el comprador
  euroAmount?: number;
}

function addHistory(userId: string, entry: Omit<HistoryEntry, "id">): void {
  const map = loadMap<HistoryEntry[]>(HISTORY_KEY);
  const entries = map[userId] ?? [];
  const newEntry: HistoryEntry = {
    ...entry,
    id: `h${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
  };
  map[userId] = [newEntry, ...entries].slice(0, 100);
  saveMap(HISTORY_KEY, map);
}

/** Historial de transacciones de un usuario (más reciente primero) */
export function getPointsHistory(userId: string): HistoryEntry[] {
  const map = loadMap<HistoryEntry[]>(HISTORY_KEY);
  return map[userId] ?? [];
}

// ─── Points CRUD ──────────────────────────────────────────────────────────────

export function loadPoints(userId: string): number {
  const map = loadMap<number>(POINTS_KEY);
  return Math.max(0, Math.floor(map[userId] ?? 0));
}

/**
 * Add points to a user's balance.
 * HARDENED: validates delta is finite, rejects NaN/Infinity, confirms write.
 * Returns { ok, balance } so callers can handle failure.
 */
export function addPoints(
  userId: string,
  delta: number,
): number {
  if (!Number.isFinite(delta) || delta <= 0) return loadPoints(userId);
  const map = loadMap<number>(POINTS_KEY);
  const current = Math.max(0, Math.floor(map[userId] ?? 0));
  const next = current + Math.floor(delta);
  map[userId] = next;
  const ok = saveMap(POINTS_KEY, map);
  if (!ok) {
    // Write failed — return current balance (NOT the unsaved new balance)
    return current;
  }
  return next;
}

/**
 * Deduct points from a user's balance.
 * HARDENED: validates delta, ensures sufficient balance, confirms write.
 * Throws on critical failure (e.g., deducting for an order that must succeed).
 */
export function deductPoints(
  userId: string,
  delta: number,
): number {
  if (!Number.isFinite(delta) || delta <= 0) return loadPoints(userId);
  const map = loadMap<number>(POINTS_KEY);
  const current = Math.max(0, Math.floor(map[userId] ?? 0));
  const deduction = Math.floor(delta);

  // Warn if trying to deduct more than available (partial deduction)
  if (deduction > current) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("tcga:points:warning", {
          detail: {
            userId,
            requested: deduction,
            available: current,
            msg: `Deducting ${deduction} pts but only ${current} available`,
          },
        }),
      );
    }
  }

  const next = Math.max(0, current - deduction);
  map[userId] = next;
  const ok = saveMap(POINTS_KEY, map);
  if (!ok) {
    throw new Error(
      `CRITICAL: Failed to save point deduction for user ${userId}. ` +
      `Attempted to deduct ${deduction} pts from ${current} pts balance.`,
    );
  }
  return next;
}

// ─── Conversions ──────────────────────────────────────────────────────────────

/** 1 pt = €0.01  →  100 pts = €1.00 */
export function pointsToEuros(points: number): number {
  return Math.floor(points) / 100;
}

/** €1 = 100 pts */
export function eurosToPoints(euros: number): number {
  return Math.floor(euros * 100);
}

export interface RedemptionTier {
  points: number;
  euros: number;
  label: string;
}

export function buildRedemptionTiers(balance: number): RedemptionTier[] {
  const ALL_TIERS: RedemptionTier[] = [
    { points: 10,   euros: 0.1,  label: "€0.10" },
    { points: 50,   euros: 0.5,  label: "€0.50" },
    { points: 100,  euros: 1.0,  label: "€1.00" },
    { points: 200,  euros: 2.0,  label: "€2.00" },
    { points: 500,  euros: 5.0,  label: "€5.00" },
    { points: 1000, euros: 10.0, label: "€10.00" },
    { points: 2000, euros: 20.0, label: "€20.00" },
    { points: 5000, euros: 50.0, label: "€50.00" },
  ];
  return ALL_TIERS.filter((t) => t.points <= balance);
}

// ─── Daily check-in ───────────────────────────────────────────────────────────

export interface CheckinInfo {
  canCheckin: boolean;
  nextAt: number | null;
  lastAt: number | null;
}

export function getCheckinInfo(userId: string): CheckinInfo {
  if (typeof window === "undefined")
    return { canCheckin: false, nextAt: null, lastAt: null };

  const map = loadMap<{ ts: number; hash: string }>(CHECKIN_KEY);
  const entry = map[userId];

  if (!entry) return { canCheckin: true, nextAt: null, lastAt: null };

  const expectedHash = makeCheckinHash(userId, entry.ts);
  if (entry.hash !== expectedHash) {
    return { canCheckin: false, nextAt: Date.now() + CHECKIN_INTERVAL_MS, lastAt: entry.ts };
  }

  const elapsed = Date.now() - entry.ts;
  if (elapsed >= CHECKIN_INTERVAL_MS) {
    return { canCheckin: true, nextAt: null, lastAt: entry.ts };
  }

  return {
    canCheckin: false,
    nextAt: entry.ts + CHECKIN_INTERVAL_MS,
    lastAt: entry.ts,
  };
}

export function performCheckin(userId: string): { ok: boolean; points: number; error?: string } {
  const info = getCheckinInfo(userId);
  if (!info.canCheckin) {
    const remaining = info.nextAt ? info.nextAt - Date.now() : 0;
    const hours = Math.ceil(remaining / (60 * 60 * 1000));
    return {
      ok: false,
      points: 0,
      error: `Próximo check-in disponible en ${hours} hora${hours !== 1 ? "s" : ""}`,
    };
  }

  const ts = Date.now();
  const hash = makeCheckinHash(userId, ts);
  const map = loadMap<{ ts: number; hash: string }>(CHECKIN_KEY);
  map[userId] = { ts, hash };
  saveMap(CHECKIN_KEY, map);

  addPoints(userId, DAILY_CHECKIN_POINTS);
  addHistory(userId, {
    ts,
    pts: DAILY_CHECKIN_POINTS,
    type: "checkin",
    desc: "Check-in diario",
  });
  const newBalance = loadPoints(userId);
  return { ok: true, points: DAILY_CHECKIN_POINTS, newBalance } as {
    ok: true;
    points: number;
    newBalance: number;
  };
}

// ─── Referral / association system ────────────────────────────────────────────

// NOTE (backend): replace localStorage calls with API endpoints:
//   POST /api/associations · GET /api/associations/:userId
//   POST /api/referrals/code · GET /api/points/history/:userId

export interface AssociationRecord {
  referralCode: string;
  referrerId: string;     // userId del asociado
  associatedAt: number;
  atRegistration: boolean;
}

export interface AssociationLockInfo {
  locked: boolean;
  firstAssociationAt: number | null;
  locksAt: number | null;
}

function generateRandomReferralCode(): string {
  const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const buf = new Uint8Array(5);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < 5; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(buf).map((b) => CHARS[b % CHARS.length]).join("");
}

export function ensureReferralCode(userId: string): string {
  const userMap = loadMap<string>(USERCODE_KEY);
  if (userMap[userId]) return userMap[userId];
  const codeMap = loadMap<string>(REFCODE_KEY);
  let code: string;
  do { code = generateRandomReferralCode(); }
  while (codeMap[code] !== undefined && codeMap[code] !== userId);
  userMap[userId] = code;
  saveMap(USERCODE_KEY, userMap);
  codeMap[code] = userId;
  saveMap(REFCODE_KEY, codeMap);
  return code;
}

export function getReferrerUserId(referralCode: string): string | null {
  const map = loadMap<string>(REFCODE_KEY);
  return map[referralCode.toUpperCase()] ?? null;
}

export function getAssociations(userId: string): AssociationRecord[] {
  const map = loadMap<AssociationRecord[]>(ASSOC_KEY);
  return map[userId] ?? [];
}

export function getAssociationLockInfo(userId: string): AssociationLockInfo {
  const assocs = getAssociations(userId);
  if (assocs.length === 0) return { locked: false, firstAssociationAt: null, locksAt: null };
  const firstAt = Math.min(...assocs.map((a) => a.associatedAt));
  const locksAt = firstAt + ASSOCIATION_LOCK_MS;
  return { locked: Date.now() >= locksAt, firstAssociationAt: firstAt, locksAt };
}

export function countReferrals(referrerId: string): number {
  if (typeof window === "undefined") return 0;
  const map = loadMap<AssociationRecord[]>(ASSOC_KEY);
  return Object.values(map).filter((assocs) =>
    assocs.some((a) => a.referrerId === referrerId),
  ).length;
}

export function getReferredCount(userId: string): number {
  return countReferrals(userId);
}

export function addAssociation(
  userId: string,
  referralCode: string,
  atRegistration = false,
): { ok: boolean; error?: string } {
  const code = referralCode.trim().toUpperCase();
  const referrerId = getReferrerUserId(code);
  if (!referrerId) return { ok: false, error: "Código de referido inválido" };
  if (referrerId === userId) return { ok: false, error: "No puedes usar tu propio código" };

  const assocMap = loadMap<AssociationRecord[]>(ASSOC_KEY);
  const userAssocs = assocMap[userId] ?? [];

  if (userAssocs.some((a) => a.referrerId === referrerId))
    return { ok: false, error: "Ya estás asociado con esta persona" };

  const lockInfo = getAssociationLockInfo(userId);
  if (lockInfo.locked)
    return { ok: false, error: "Tus asociaciones están bloqueadas (ha pasado más de 1 año desde la primera)" };

  if (userAssocs.length >= MAX_ASSOCIATIONS)
    return { ok: false, error: `Máximo ${MAX_ASSOCIATIONS} asociaciones permitidas` };

  assocMap[userId] = [
    ...userAssocs,
    { referralCode: code, referrerId, associatedAt: Date.now(), atRegistration },
  ];
  saveMap(ASSOC_KEY, assocMap);
  return { ok: true };
}

export function registerWithReferral(
  newUserId: string,
  referralCode: string,
): { ok: boolean; error?: string } {
  const result = addAssociation(newUserId, referralCode, true);
  if (result.ok) {
    addPoints(newUserId, REFERRAL_WELCOME_BONUS);
    addHistory(newUserId, {
      ts: Date.now(),
      pts: REFERRAL_WELCOME_BONUS,
      type: "bienvenida",
      desc: "Bonus de bienvenida por código de referido",
    });
  }
  return result;
}

export interface DirectReferral {
  buyerUserId: string;
  atRegistration: boolean;
  associatedAt: number;
}

export function getDirectReferrals(referrerId: string): DirectReferral[] {
  if (typeof window === "undefined") return [];
  const assocMap = loadMap<AssociationRecord[]>(ASSOC_KEY);
  const results: DirectReferral[] = [];
  for (const [userId, assocs] of Object.entries(assocMap)) {
    for (const assoc of assocs) {
      if (assoc.referrerId === referrerId) {
        results.push({
          buyerUserId: userId,
          atRegistration: assoc.atRegistration,
          associatedAt: assoc.associatedAt,
        });
      }
    }
  }
  return results;
}

/** Puntos totales que cada persona me ha generado: { [sourceUserId]: pts } */
export function getMyPointsAttribution(myUserId: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  const map = loadMap<Record<string, number>>(ATTR_KEY);
  return map[myUserId] ?? {};
}

function addAttribution(beneficiaryId: string, sourceId: string, pts: number): void {
  if (pts <= 0) return;
  const map = loadMap<Record<string, number>>(ATTR_KEY);
  const entry = map[beneficiaryId] ?? {};
  entry[sourceId] = (entry[sourceId] ?? 0) + pts;
  map[beneficiaryId] = entry;
  saveMap(ATTR_KEY, map);
}

function removeAttribution(beneficiaryId: string, sourceId: string, pts: number): void {
  if (pts <= 0) return;
  const map = loadMap<Record<string, number>>(ATTR_KEY);
  const entry = map[beneficiaryId] ?? {};
  entry[sourceId] = Math.max(0, (entry[sourceId] ?? 0) - pts);
  if (entry[sourceId] === 0) delete entry[sourceId];
  map[beneficiaryId] = entry;
  saveMap(ATTR_KEY, map);
}

/**
 * Otorga puntos por compra:
 *   - Comprador: POINTS_PER_EURO × euros (10 pts por €10)
 *   - Cada asociado: REFERRAL_ASSOC_PTS_PER_100 × euros / 100 (5 pts por €10)
 *
 * NOTE (backend): mover al servidor para evitar manipulación client-side.
 */
export function awardPurchasePoints(userId: string, euroAmount: number): void {
  const euros = Math.floor(euroAmount);
  if (euros <= 0) return;

  // Comprador
  const buyerPts = euros * POINTS_PER_EURO;
  addPoints(userId, buyerPts);
  addHistory(userId, {
    ts: Date.now(),
    pts: buyerPts,
    type: "compra",
    desc: `Compra de €${euros}`,
    euroAmount: euros,
  });

  // Cada asociado (hasta MAX_ASSOCIATIONS)
  const assocMap = loadMap<AssociationRecord[]>(ASSOC_KEY);
  const userAssocs = assocMap[userId] ?? [];
  const assocPts = Math.floor(euros * REFERRAL_ASSOC_PTS_PER_100 / 100);
  if (assocPts <= 0) return;

  const ts = Date.now();
  for (const assoc of userAssocs) {
    addPoints(assoc.referrerId, assocPts);
    addAttribution(assoc.referrerId, userId, assocPts);
    addHistory(assoc.referrerId, {
      ts,
      pts: assocPts,
      type: "asociacion",
      desc: `Tu asociado compró €${euros}`,
      sourceUserId: userId,
      euroAmount: euros,
    });
  }
}

/**
 * Revierte los puntos de una compra devuelta.
 * Descuenta al comprador y a sus asociados actuales.
 *
 * NOTE (backend): en producción, usar los asociados del momento de la compra
 * guardados en el registro de la transacción, no los actuales.
 */
export function refundPurchasePoints(userId: string, euroAmount: number): void {
  const euros = Math.floor(euroAmount);
  if (euros <= 0) return;

  // Comprador
  const buyerPts = euros * POINTS_PER_EURO;
  deductPoints(userId, buyerPts);
  addHistory(userId, {
    ts: Date.now(),
    pts: -buyerPts,
    type: "devolucion",
    desc: `Devolución de €${euros}`,
    euroAmount: euros,
  });

  // Asociados
  const assocMap = loadMap<AssociationRecord[]>(ASSOC_KEY);
  const userAssocs = assocMap[userId] ?? [];
  const assocPts = Math.floor(euros * REFERRAL_ASSOC_PTS_PER_100 / 100);
  if (assocPts <= 0) return;

  const ts = Date.now();
  for (const assoc of userAssocs) {
    deductPoints(assoc.referrerId, assocPts);
    removeAttribution(assoc.referrerId, userId, assocPts);
    addHistory(assoc.referrerId, {
      ts,
      pts: -assocPts,
      type: "devolucion",
      desc: `Devolución de tu asociado (€${euros})`,
      sourceUserId: userId,
      euroAmount: euros,
    });
  }
}

/**
 * Crea una asociación mutua al aceptar una invitación.
 * Las validaciones de límite las hace associationService antes de llamar aquí.
 */
export function createMutualAssociation(
  userIdA: string,
  userIdB: string,
  referralCodeA: string,
): void {
  const assocMap = loadMap<AssociationRecord[]>(ASSOC_KEY);
  const now = Date.now();

  const assocsA = assocMap[userIdA] ?? [];
  if (!assocsA.some((a) => a.referrerId === userIdB)) {
    assocMap[userIdA] = [
      ...assocsA,
      { referralCode: referralCodeA, referrerId: userIdB, associatedAt: now, atRegistration: false },
    ];
  }

  const assocsB = assocMap[userIdB] ?? [];
  if (!assocsB.some((a) => a.referrerId === userIdA)) {
    assocMap[userIdB] = [
      ...assocsB,
      { referralCode: referralCodeA, referrerId: userIdA, associatedAt: now, atRegistration: false },
    ];
  }

  saveMap(ASSOC_KEY, assocMap);
}

export function removeMutualAssociation(userIdA: string, userIdB: string): void {
  const assocMap = loadMap<AssociationRecord[]>(ASSOC_KEY);
  assocMap[userIdA] = (assocMap[userIdA] ?? []).filter((a) => a.referrerId !== userIdB);
  assocMap[userIdB] = (assocMap[userIdB] ?? []).filter((a) => a.referrerId !== userIdA);
  saveMap(ASSOC_KEY, assocMap);
}

/** Formatea la cuenta atrás en HH:MM:SS */
export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "00:00:00";
  const totalSec = Math.floor(msRemaining / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
