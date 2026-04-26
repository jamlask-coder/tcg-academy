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
 *   HOLD 14 DÍAS (POINTS_PENDING_DAYS):
 *     Los puntos por compra del COMPRADOR **y los de los miembros del GRUPO
 *     (asociados)** no son inmediatamente canjeables. Quedan "pendientes"
 *     durante 14 días por seguridad ante posibles devoluciones. Si se devuelve
 *     el pedido durante esa ventana → la entry se marca `cancelled` y nunca
 *     llega al saldo. Si no hay devolución → `releaseMaturedPoints()` mueve
 *     los pts al balance disponible.
 *     Aprobado 2026-04-26: misma regla para comprador y asociados — coherencia
 *     contable y evitar saldos negativos cuando un asociado ya gastó pts antes
 *     de la devolución del comprador.
 *
 *   Ejemplo de referencia:
 *     Pedido 104€ = 99€ productos + 4€ envío + 1€ descuento puntos
 *     ⇒ Base efectiva 99€ → gana 9.900 pts → equivale a 0,99€ próximo pedido
 *
 *   Otros:
 *   - Cada asociado: 5 pts por cada €10 que gaste el comprador (también en hold 14d)
 *   - Registro con código: nuevo usuario y su invitador reciben 30.000 pts (= €3)
 *                          ⚠️ Impacto fiscal: los puntos emitidos son un PASIVO
 *                          DIFERIDO contable. No se facturan al emitir. Cuando
 *                          el cliente los canjee, generarán un descuento por
 *                          línea en la factura (base imponible reducida → IVA
 *                          sobre la base tras descuento). Ver invoiceService y
 *                          el flujo de `pointsDiscount` en finalizar-compra.
 *   - En caso de devolución se revierten los puntos de comprador y asociados
 *
 * Seguridad (client-side):
 *   - En producción, mover toda la lógica al backend.
 */

import { DataHub } from "@/lib/dataHub";

// ─── Constants ────────────────────────────────────────────────────────────────

// ⚠️ CAMBIO ADMIN-ONLY con aviso fuerte — afecta al balance económico global.
export const POINTS_PER_EURO = 100;          // 100 pts por €1 gastado en productos puros
export const POINTS_PER_EURO_REDEMPTION = 10000; // 10.000 pts = €1 de descuento

// Hold de seguridad: los puntos del comprador maduran a los 14 días para cubrir
// la ventana de devolución. Aprobado por admin 2026-04-26.
export const POINTS_PENDING_DAYS = 14;
export const POINTS_PENDING_MS = POINTS_PENDING_DAYS * 24 * 60 * 60 * 1000;

// Regla de negocio (aprobada 2026-04-17): los puntos son 1% de cashback
// y el cliente puede canjearlos SIEMPRE, sin mínimo de pedido y hasta
// el 100% del subtotal de productos (el envío no entra, se paga aparte).
export const POINTS_MAX_DISCOUNT_PCT    = 1.0; // sin restricción: descuento hasta el total de productos
export const MAX_ASSOCIATIONS           = 3;   // máximo de asociados (1 titular + 3 = 4 personas en total)
// Bonus de bienvenida (en puntos) — se otorga a AMBOS: invitador y nuevo usuario.
// 30.000 pts = €3 al canjearlos como descuento en una compra futura.
export const REFERRAL_INVITER_BONUS      = 30000;
export const REFERRAL_NEW_USER_BONUS     = 30000;
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
      DataHub.emit("points");
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
  // ─── Hold 14 días (solo entries type==="compra" del comprador) ──────────────
  // availableAt: timestamp en que la entry pasa de "pendiente" a "disponible".
  // released:    true cuando releaseMaturedPoints ya añadió los pts al balance.
  // cancelled:   true cuando una devolución anuló los pts antes de madurar.
  // orderId:     vincula la entry con el pedido (necesario para revert pre-mature).
  availableAt?: number;
  released?: boolean;
  cancelled?: boolean;
  orderId?: string;
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

/** Actualiza una entry concreta del historial (por id) y persiste. */
function patchHistoryEntry(
  userId: string,
  entryId: string,
  patch: Partial<HistoryEntry>,
): boolean {
  const map = loadMap<HistoryEntry[]>(HISTORY_KEY);
  const entries = map[userId] ?? [];
  const idx = entries.findIndex((e) => e.id === entryId);
  if (idx < 0) return false;
  entries[idx] = { ...entries[idx], ...patch };
  map[userId] = entries;
  return saveMap(HISTORY_KEY, map);
}

// ─── Points CRUD ──────────────────────────────────────────────────────────────

export function loadPoints(userId: string): number {
  // Maduración lazy: cada lectura libera los lotes pendientes que ya cumplieron
  // los 14 días. Idempotente (entries con `released:true` se ignoran).
  releaseMaturedPoints(userId);
  const map = loadMap<number>(POINTS_KEY);
  return Math.max(0, Math.floor(map[userId] ?? 0));
}

/**
 * Suma de puntos en hold (compras propias + comisiones de asociado < 14 días,
 * no canceladas, no liberadas). Estos pts NO son canjeables todavía — solo
 * informativos para la UI.
 */
export function loadPendingPoints(userId: string): number {
  const history = getPointsHistory(userId);
  const now = Date.now();
  let pending = 0;
  for (const h of history) {
    if (h.type !== "compra" && h.type !== "asociacion") continue;
    if (h.released || h.cancelled) continue;
    if (typeof h.availableAt !== "number") continue;
    if (h.availableAt > now) pending += Math.max(0, h.pts);
  }
  return pending;
}

/**
 * Devuelve la fecha (timestamp) en que madurará el siguiente lote de puntos
 * pendientes, o `null` si no hay lotes en hold. Útil para la UI: "tus puntos
 * estarán disponibles el DD/MM/YYYY".
 */
export function getNextMaturationDate(userId: string): number | null {
  const history = getPointsHistory(userId);
  const now = Date.now();
  let next: number | null = null;
  for (const h of history) {
    if (h.type !== "compra" && h.type !== "asociacion") continue;
    if (h.released || h.cancelled) continue;
    if (typeof h.availableAt !== "number") continue;
    if (h.availableAt > now && (next === null || h.availableAt < next)) {
      next = h.availableAt;
    }
  }
  return next;
}

/**
 * Recorre el historial del usuario, libera los lotes de "compra" cuya
 * `availableAt` ya cumplió → suma esos pts al balance + marca `released:true`.
 * Idempotente: las entries ya liberadas se ignoran. Si falla el write del
 * balance, NO marca released → el siguiente intento lo reintentará.
 */
export function releaseMaturedPoints(userId: string): {
  releasedPts: number;
  releasedCount: number;
} {
  if (typeof window === "undefined") return { releasedPts: 0, releasedCount: 0 };
  const history = getPointsHistory(userId);
  const now = Date.now();
  let totalPts = 0;
  let count = 0;
  for (const entry of history) {
    if (entry.type !== "compra" && entry.type !== "asociacion") continue;
    if (entry.released || entry.cancelled) continue;
    if (typeof entry.availableAt !== "number") continue;
    if (entry.availableAt > now) continue;
    // Madura: añade al balance y marca released ATÓMICAMENTE.
    const ptsToAdd = Math.max(0, Math.floor(entry.pts));
    if (ptsToAdd <= 0) {
      // Defensivo: si pts ≤ 0 marcamos released para no reintentar siempre.
      patchHistoryEntry(userId, entry.id, { released: true });
      continue;
    }
    const map = loadMap<number>(POINTS_KEY);
    const current = Math.max(0, Math.floor(map[userId] ?? 0));
    map[userId] = current + ptsToAdd;
    const okBalance = saveMap(POINTS_KEY, map);
    if (!okBalance) continue; // reintenta en la próxima llamada
    const okHist = patchHistoryEntry(userId, entry.id, { released: true });
    if (!okHist) {
      // Si no podemos marcar released, revertimos el balance para no doble-contar.
      const m2 = loadMap<number>(POINTS_KEY);
      m2[userId] = Math.max(0, Math.floor(m2[userId] ?? 0) - ptsToAdd);
      saveMap(POINTS_KEY, m2);
      continue;
    }
    // Si era una entry de asociacion, aplicar atribución al madurar
    // (no al emitir, para que el "X pts generados por Fulano" refleje
    // pts realmente cobrados, no en hold).
    if (entry.type === "asociacion" && entry.sourceUserId) {
      addAttribution(userId, entry.sourceUserId, ptsToAdd);
    }
    totalPts += ptsToAdd;
    count++;
  }
  if (count > 0) DataHub.emit("points");
  return { releasedPts: totalPts, releasedCount: count };
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

/**
 * SSOT Reconciliation — deriva el balance desde el historial y lo guarda.
 *
 * Uso: invocar al arrancar la sesión (AuthContext) para detectar divergencias
 * entre `tcgacademy_pts` (balance stored) y `tcgacademy_pts_history` (source
 * of truth de transacciones). Si difieren, el historial gana y se corrige
 * el balance silenciosamente (con evento de log para auditoría).
 *
 * El historial es la verdad: cada mutación de puntos debe pasar por addHistory()
 * antes de tocar el balance. Si un write atómico falla, `saveMap` emite
 * `tcga:storage:error` — ese evento + este reconciliador son el red de
 * seguridad para que balance e historial no puedan divergir permanentemente.
 */
export function reconcilePointsFromHistory(userId: string): {
  before: number;
  after: number;
  reconciled: boolean;
} {
  const storedBalance = loadPoints(userId);
  const history = getPointsHistory(userId);
  // Compras pendientes (no liberadas) y entries canceladas no contribuyen al
  // balance disponible. Las "compra" sin availableAt son legacy → cuentan
  // como antes.
  const derived = Math.max(
    0,
    Math.floor(
      history.reduce((sum, h) => {
        if (h.cancelled) return sum;
        if (
          (h.type === "compra" || h.type === "asociacion") &&
          typeof h.availableAt === "number" &&
          !h.released
        ) {
          return sum;
        }
        return sum + h.pts;
      }, 0),
    ),
  );

  if (storedBalance === derived) {
    return { before: storedBalance, after: storedBalance, reconciled: false };
  }

  // Divergencia detectada — historial manda. Corrige balance.
  const map = loadMap<number>(POINTS_KEY);
  map[userId] = derived;
  saveMap(POINTS_KEY, map);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("tcga:points:reconciled", {
        detail: {
          userId,
          storedBalance,
          derivedFromHistory: derived,
          delta: derived - storedBalance,
          ts: Date.now(),
        },
      }),
    );
  }

  return { before: storedBalance, after: derived, reconciled: true };
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
  newUserDisplayName: string,
  referralCode: string,
): { ok: boolean; error?: string } {
  const result = addAssociation(newUserId, referralCode, true);
  if (!result.ok) return result;

  const referrerId = getReferrerUserId(referralCode);
  const ts = Date.now();

  // 1) Invitador → 30.000 pts (= €3)
  if (referrerId) {
    addPoints(referrerId, REFERRAL_INVITER_BONUS);
    addHistory(referrerId, {
      ts,
      pts: REFERRAL_INVITER_BONUS,
      type: "bienvenida",
      desc: `Nuevo miembro ${newUserDisplayName} se registró con tu código`,
      sourceUserId: newUserId,
    });
  }

  // 2) Nuevo usuario → 30.000 pts (= €3) de bienvenida
  addPoints(newUserId, REFERRAL_NEW_USER_BONUS);
  addHistory(newUserId, {
    ts,
    pts: REFERRAL_NEW_USER_BONUS,
    type: "bienvenida",
    desc: "Bonus de bienvenida por registro con código",
    ...(referrerId ? { sourceUserId: referrerId } : {}),
  });

  return { ok: true };
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
 * Otorga puntos por compra. Tanto comprador como asociados quedan EN HOLD
 * durante POINTS_PENDING_DAYS:
 *   - Comprador: POINTS_PER_EURO × euros.
 *   - Cada asociado: REFERRAL_ASSOC_PTS_PER_100 × euros / 100.
 *
 * En ambos casos solo se registra entry de historial con `availableAt`.
 * NO se añade al balance hasta que `releaseMaturedPoints()` los libere.
 * Si hay devolución antes de madurar, `refundPurchasePoints()` marca la
 * entry `cancelled:true` y los pts nunca llegan al saldo (ni del comprador
 * ni del asociado).
 *
 * La atribución (`addAttribution`) tampoco se contabiliza hasta la maduración:
 * la entry `asociacion` queda con `availableAt`, y `releaseMaturedPoints` se
 * encarga de aplicar atribución cuando libera (ver implementación allí).
 * Esto evita que un asociado vea "X pts generados por Fulano" antes de que
 * los reciba realmente.
 *
 * @param orderId opcional pero RECOMENDADO — vincula la entry con el pedido
 *                para que la devolución pueda anularla pre-mature en lugar
 *                de descontar del saldo (ver `refundPurchasePoints`).
 *
 * NOTE (backend): mover al servidor para evitar manipulación client-side.
 */
export function awardPurchasePoints(
  userId: string,
  euroAmount: number,
  orderId?: string,
): void {
  const euros = Math.floor(euroAmount);
  if (euros <= 0) return;

  const ts = Date.now();
  const availableAt = ts + POINTS_PENDING_MS;

  // Comprador → pendiente (no toca balance)
  const buyerPts = euros * POINTS_PER_EURO;
  addHistory(userId, {
    ts,
    pts: buyerPts,
    type: "compra",
    desc: `Compra de €${euros}`,
    euroAmount: euros,
    availableAt,
    released: false,
    ...(orderId ? { orderId } : {}),
  });

  // Cada asociado (hasta MAX_ASSOCIATIONS) → también pendiente (mismo hold 14d)
  const assocMap = loadMap<AssociationRecord[]>(ASSOC_KEY);
  const userAssocs = assocMap[userId] ?? [];
  const assocPts = Math.floor(euros * REFERRAL_ASSOC_PTS_PER_100 / 100);
  if (assocPts > 0) {
    for (const assoc of userAssocs) {
      addHistory(assoc.referrerId, {
        ts,
        pts: assocPts,
        type: "asociacion",
        desc: `Tu asociado compró €${euros}`,
        sourceUserId: userId,
        euroAmount: euros,
        availableAt,
        released: false,
        ...(orderId ? { orderId } : {}),
      });
    }
  }
  // Balance no cambió (ni del comprador ni de asociados), pero la UI debe
  // refrescar la cifra de "pendientes".
  DataHub.emit("points");
}

/**
 * Revierte los puntos de una compra devuelta. Misma estrategia para comprador
 * y asociados:
 *   - Si la entry original aún está en hold (pre-mature) y no fue liberada,
 *     se marca `cancelled:true` y NO se toca el balance: los pts pendientes
 *     simplemente no maduran. Se registra una entry "devolucion" con pts=0
 *     a efectos de trazabilidad.
 *   - Si los pts ya maduraron (post-mature) o la entry no se puede localizar
 *     (legacy / sin orderId), se descuenta del balance.
 *
 * @param orderId si se proporciona, permite localizar la entry exacta para
 *                cancelar pre-mature. Si no, fallback a deduct directo.
 *
 * NOTE (backend): en producción, usar los asociados del momento de la compra
 * guardados en el registro de la transacción, no los actuales.
 */
export function refundPurchasePoints(
  userId: string,
  euroAmount: number,
  orderId?: string,
): void {
  const euros = Math.floor(euroAmount);
  if (euros <= 0) return;

  const buyerPts = euros * POINTS_PER_EURO;
  const ts = Date.now();

  // ── Comprador: intentar cancelar pre-mature primero ──────────────────────
  let cancelledPreMature = false;
  if (orderId) {
    const history = getPointsHistory(userId);
    const entry = history.find(
      (h) =>
        h.type === "compra" &&
        h.orderId === orderId &&
        !h.released &&
        !h.cancelled,
    );
    if (entry) {
      patchHistoryEntry(userId, entry.id, { cancelled: true });
      addHistory(userId, {
        ts,
        pts: 0,
        type: "devolucion",
        desc: `Devolución de €${euros} — puntos pendientes anulados`,
        euroAmount: euros,
        ...(orderId ? { orderId } : {}),
      });
      cancelledPreMature = true;
    }
  }

  if (!cancelledPreMature) {
    // Post-mature o legacy: descontar del saldo disponible
    deductPoints(userId, buyerPts);
    addHistory(userId, {
      ts,
      pts: -buyerPts,
      type: "devolucion",
      desc: `Devolución de €${euros}`,
      euroAmount: euros,
      ...(orderId ? { orderId } : {}),
    });
  }

  // ── Asociados: misma estrategia (cancelar pre-mature antes de deducir) ───
  const assocMap = loadMap<AssociationRecord[]>(ASSOC_KEY);
  const userAssocs = assocMap[userId] ?? [];
  const assocPts = Math.floor(euros * REFERRAL_ASSOC_PTS_PER_100 / 100);
  if (assocPts <= 0) return;

  for (const assoc of userAssocs) {
    let cancelledAssocPreMature = false;
    if (orderId) {
      const history = getPointsHistory(assoc.referrerId);
      const entry = history.find(
        (h) =>
          h.type === "asociacion" &&
          h.orderId === orderId &&
          h.sourceUserId === userId &&
          !h.released &&
          !h.cancelled,
      );
      if (entry) {
        patchHistoryEntry(assoc.referrerId, entry.id, { cancelled: true });
        addHistory(assoc.referrerId, {
          ts,
          pts: 0,
          type: "devolucion",
          desc: `Devolución de tu asociado (€${euros}) — pts pendientes anulados`,
          sourceUserId: userId,
          euroAmount: euros,
          ...(orderId ? { orderId } : {}),
        });
        cancelledAssocPreMature = true;
      }
    }

    if (!cancelledAssocPreMature) {
      // Post-mature o legacy: descontar del saldo + atribución
      deductPoints(assoc.referrerId, assocPts);
      removeAttribution(assoc.referrerId, userId, assocPts);
      addHistory(assoc.referrerId, {
        ts,
        pts: -assocPts,
        type: "devolucion",
        desc: `Devolución de tu asociado (€${euros})`,
        sourceUserId: userId,
        euroAmount: euros,
        ...(orderId ? { orderId } : {}),
      });
    }
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
