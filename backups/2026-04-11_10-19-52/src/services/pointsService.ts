/**
 * Servicio de puntos, check-in diario y programa de referidos.
 *
 * Reglas de negocio:
 *   - 10 puntos por cada euro gastado (solo clientes con rol "cliente")
 *   - 100 puntos = €0.10 de descuento
 *   - 10 puntos gratis al día por visitar el perfil (check-in)
 *   - Programa de referidos: L1 = 10 pts/€, L2 = 5 pts/€
 *
 * Seguridad (cliente-side):
 *   - El timestamp del check-in está protegido con un hash HMAC simple
 *     que impide manipular el localStorage sin revelar el salt.
 *   - En producción, mover toda la lógica al backend.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const POINTS_PER_EURO = 10;
export const DAILY_CHECKIN_POINTS = 10;
export const REFERRAL_L1_PER_EURO = 10;
export const REFERRAL_L2_PER_EURO = 5;
export const POINTS_PER_100 = 0.1; // 100 puntos = €0.10
export const CHECKIN_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Storage keys
const POINTS_KEY = "tcgacademy_pts";          // { [userId]: number }
const CHECKIN_KEY = "tcgacademy_checkin";     // { [userId]: { ts: number; hash: string } }
const REFCODE_KEY = "tcgacademy_refcodes";   // { [code]: userId } — code → user lookup
const REFERRED_KEY = "tcgacademy_referred";  // { [userId]: referralCode } — who referred me

const HASH_SALT = "tcga-pts-2025-v3-secure";

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Simple non-cryptographic hash — sufficient to detect casual localStorage tampering */
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

function saveMap(key: string, data: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

// ─── Points CRUD ──────────────────────────────────────────────────────────────

export function loadPoints(userId: string): number {
  const map = loadMap<number>(POINTS_KEY);
  return Math.max(0, Math.floor(map[userId] ?? 0));
}

export function addPoints(userId: string, delta: number): number {
  if (delta <= 0) return loadPoints(userId);
  const map = loadMap<number>(POINTS_KEY);
  const current = Math.max(0, Math.floor(map[userId] ?? 0));
  const next = current + Math.floor(delta);
  map[userId] = next;
  saveMap(POINTS_KEY, map);
  return next;
}

export function deductPoints(userId: string, delta: number): number {
  if (delta <= 0) return loadPoints(userId);
  const map = loadMap<number>(POINTS_KEY);
  const current = Math.max(0, Math.floor(map[userId] ?? 0));
  const next = Math.max(0, current - Math.floor(delta));
  map[userId] = next;
  saveMap(POINTS_KEY, map);
  return next;
}

// ─── Conversions ──────────────────────────────────────────────────────────────

/** Convierte puntos a euros: 100 pts = €0.10 */
export function pointsToEuros(points: number): number {
  return (Math.floor(points / 100) * 10) / 100;
}

/** Euros a puntos equivalentes: €1 = 1000 pts */
export function eurosToPoints(euros: number): number {
  return Math.floor(euros * 1000);
}

export interface RedemptionTier {
  points: number;
  euros: number;
  label: string;
}

/** Devuelve los niveles de canje disponibles según el saldo */
export function buildRedemptionTiers(balance: number): RedemptionTier[] {
  const ALL_TIERS: RedemptionTier[] = [
    { points: 100, euros: 0.1, label: "€0.10" },
    { points: 500, euros: 0.5, label: "€0.50" },
    { points: 1000, euros: 1.0, label: "€1.00" },
    { points: 2000, euros: 2.0, label: "€2.00" },
    { points: 5000, euros: 5.0, label: "€5.00" },
    { points: 10000, euros: 10.0, label: "€10.00" },
    { points: 20000, euros: 20.0, label: "€20.00" },
    { points: 50000, euros: 50.0, label: "€50.00" },
  ];
  return ALL_TIERS.filter((t) => t.points <= balance);
}

// ─── Daily check-in ───────────────────────────────────────────────────────────

export interface CheckinInfo {
  canCheckin: boolean;
  nextAt: number | null; // ms timestamp when next check-in is available
  lastAt: number | null; // ms timestamp of last check-in
}

export function getCheckinInfo(userId: string): CheckinInfo {
  if (typeof window === "undefined")
    return { canCheckin: false, nextAt: null, lastAt: null };

  const map = loadMap<{ ts: number; hash: string }>(CHECKIN_KEY);
  const entry = map[userId];

  if (!entry) return { canCheckin: true, nextAt: null, lastAt: null };

  // Verify integrity hash — if tampered, deny
  const expectedHash = makeCheckinHash(userId, entry.ts);
  if (entry.hash !== expectedHash) {
    // Tampered — block check-in silently (don't reveal detection)
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

  const newBalance = addPoints(userId, DAILY_CHECKIN_POINTS);
  return { ok: true, points: DAILY_CHECKIN_POINTS, newBalance } as { ok: true; points: number; newBalance: number };
}

// ─── Referral system ──────────────────────────────────────────────────────────

/**
 * Genera un código de referido reproducible a partir del userId.
 * Formato: 8 caracteres alfanuméricos en mayúsculas sin caracteres ambiguos.
 */
export function generateReferralCode(userId: string): string {
  const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  // Simple deterministic hash of userId
  let h = 2166136261;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  let code = "";
  for (let i = 0; i < 8; i++) {
    const h2 = (h * (i + 1) * 1099511628211) >>> 0;
    code += CHARS[h2 % CHARS.length];
  }
  return code;
}

/** Registra o recupera el código de referido del usuario */
export function ensureReferralCode(userId: string): string {
  const map = loadMap<string>(REFCODE_KEY);
  const code = generateReferralCode(userId);
  // Store reverse map code → userId for validation
  if (!map[code]) {
    map[code] = userId;
    saveMap(REFCODE_KEY, map);
  }
  return code;
}

export function getReferrerUserId(referralCode: string): string | null {
  const map = loadMap<string>(REFCODE_KEY);
  return map[referralCode] ?? null;
}

/** Registra que un nuevo usuario fue referido por el código dado */
export function registerWithReferral(
  newUserId: string,
  referralCode: string,
): { ok: boolean; error?: string } {
  const referrerId = getReferrerUserId(referralCode);
  if (!referrerId) return { ok: false, error: "Código de referido inválido" };
  if (referrerId === newUserId) return { ok: false, error: "No puedes usar tu propio código" };

  const refMap = loadMap<string>(REFERRED_KEY);
  refMap[newUserId] = referralCode;
  saveMap(REFERRED_KEY, refMap);
  return { ok: true };
}

export function getReferredByCode(userId: string): string | null {
  const map = loadMap<string>(REFERRED_KEY);
  return map[userId] ?? null;
}

/**
 * Otorga puntos por compra:
 *   - Al comprador: POINTS_PER_EURO * €
 *   - A su referidor (L1): REFERRAL_L1_PER_EURO * €
 *   - Al referidor del referidor (L2): REFERRAL_L2_PER_EURO * €
 */
export function awardPurchasePoints(userId: string, euroAmount: number): void {
  const euros = Math.floor(euroAmount);
  if (euros <= 0) return;

  // Buyer earns points
  addPoints(userId, euros * POINTS_PER_EURO);

  // L1 referrer
  const myReferralCode = getReferredByCode(userId);
  if (!myReferralCode) return;

  const l1UserId = getReferrerUserId(myReferralCode);
  if (!l1UserId) return;
  addPoints(l1UserId, euros * REFERRAL_L1_PER_EURO);

  // L2 referrer (referrer's referrer)
  const l1ReferralCode = getReferredByCode(l1UserId);
  if (!l1ReferralCode) return;

  const l2UserId = getReferrerUserId(l1ReferralCode);
  if (!l2UserId) return;
  addPoints(l2UserId, euros * REFERRAL_L2_PER_EURO);
}

/** Cuántos referidos directos tiene un usuario */
export function getReferredCount(userId: string): number {
  const map = loadMap<string>(REFERRED_KEY);
  const myCode = generateReferralCode(userId);
  return Object.values(map).filter((code) => code === myCode).length;
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
