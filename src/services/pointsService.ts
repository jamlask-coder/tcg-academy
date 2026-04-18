/**
 * Servicio de puntos y programa de asociaciones.
 *
 * ⚠️ REGLAS DE NEGOCIO A FUEGO (NO TOCAR SIN AUTORIZACIÓN ADMIN + AVISO FUERTE):
 *
 *   GANAR:    100 puntos por cada 1€ de compra PURA
 *             (solo productos reales; sin envío; sin descuento por puntos)
 *   CANJEAR:  10.000 puntos = 1€ de descuento  (1 punto = 0,0001€)
 *   ⇒ Cashback efectivo: 1%
 *
 *   Ejemplo de referencia:
 *     Pedido 104€ = 99€ productos + 4€ envío + 1€ descuento puntos
 *     ⇒ Base efectiva 99€ → gana 9.900 pts → equivale a 0,99€ próximo pedido
 *
 *   Otros:
 *   - Cada asociado: 5 pts por cada €10 que gaste el comprador (regla heredada)
 *   - Registro con código: 10.000 pts de bienvenida (= €1)
 *   - En caso de devolución se revierten los puntos de comprador y asociados
 *
 * Seguridad (client-side):
 *   - En producción, mover toda la lógica al backend.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

// ⚠️ CAMBIO ADMIN-ONLY con aviso fuerte — afecta al balance económico global.
export const POINTS_PER_EURO = 100;          // 100 pts por €1 gastado en productos puros
export const POINTS_PER_EURO_REDEMPTION = 10000; // 10.000 pts = €1 de descuento

// Regla de negocio (aprobada 2026-04-17): los puntos son 1% de cashback
// y el cliente puede canjearlos SIEMPRE, sin mínimo de pedido y hasta
// el 100% del subtotal de productos (el envío no entra, se paga aparte).
export const POINTS_MAX_DISCOUNT_PCT    = 1.0; // sin restricción: descuento hasta el total de productos
export const MAX_ASSOCIATIONS           = 4;   // máximo de asociados en el grupo
export const REFERRAL_WELCOME_BONUS     = 10000; // pts al registrarse con código (= €1 de bienvenida)
// Asociados: 0,50€ por cada 100€ del comprador (adaptado a escala 10.000 pts=€1)
export const REFERRAL_ASSOC_PTS_PER_100 = 5000;
export const ASSOCIATION_LOCK_MS = 365 * 24 * 60 * 60 * 1000; // bloqueo 1 año

// Storage keys
const POINTS_KEY   = "tcgacademy_pts";
const REFCODE_KEY  = "tcgacademy_refcodes";
const USERCODE_KEY = "tcgacademy_usercodes";
const ASSOC_KEY    = "tcgacademy_assoc";
const ATTR_KEY     = "tcgacademy_pts_attr";
const HISTORY_KEY  = "tcgacademy_pts_history"; // { [userId]: HistoryEntry[] }

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
    // Canonical event: any view watching "points" (account card, admin KPIs)
    // gets notified after points/history/attribution/association writes.
    if (
      key === POINTS_KEY ||
      key === HISTORY_KEY ||
      key === ATTR_KEY ||
      key === ASSOC_KEY
    ) {
      try {
        window.dispatchEvent(new Event("tcga:points:updated"));
      } catch { /* non-fatal */ }
    }
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

/** 10.000 pts = €1.00  →  1 pt = €0.0001 */
export function pointsToEuros(points: number): number {
  return Math.floor(points) / POINTS_PER_EURO_REDEMPTION;
}

/** €1 = 10.000 pts (equivalencia de canje) */
export function eurosToPoints(euros: number): number {
  return Math.floor(euros * POINTS_PER_EURO_REDEMPTION);
}

export interface RedemptionTier {
  points: number;
  euros: number;
  label: string;
}

export function buildRedemptionTiers(balance: number): RedemptionTier[] {
  // 10.000 pts = €1  → tiers en múltiplos redondos
  const ALL_TIERS: RedemptionTier[] = [
    { points: 10000,  euros: 1,   label: "€1" },
    { points: 25000,  euros: 2.5, label: "€2,50" },
    { points: 50000,  euros: 5,   label: "€5" },
    { points: 100000, euros: 10,  label: "€10" },
    { points: 200000, euros: 20,  label: "€20" },
    { points: 500000, euros: 50,  label: "€50" },
  ];
  return ALL_TIERS.filter((t) => t.points <= balance);
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
