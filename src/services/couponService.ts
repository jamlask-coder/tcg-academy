// ── Coupon Service ────────────────────────────────────────────────────────────
// Central service for all coupon operations: user-specific coupons assigned
// by admin + validation against general admin coupons.
// Storage: localStorage["tcgacademy_user_coupons"]
// Replace localStorage calls with API calls when backend is ready.

import { MOCK_ADMIN_COUPONS, type AdminCoupon } from "@/data/mockData";

// Re-export para que consumidores no tengan que importar de mockData.
export type { AdminCoupon };

// ── Types ──────────────────────────────────────────────────────────────────────

export type CouponDiscountType = "percent" | "fixed" | "shipping";

/** A coupon personally assigned to a specific user by an admin. */
export interface UserCoupon {
  id: string;
  userId: string;
  userEmail: string;
  code: string;
  description: string;
  discountType: CouponDiscountType;
  /** Percentage (0–100) for "percent", euro amount for "fixed", 0 for "shipping" */
  value: number;
  createdAt: string;          // ISO timestamp
  expiresAt: string;          // ISO date YYYY-MM-DD
  active: boolean;
  usedAt?: string;            // ISO timestamp — set when redeemed
  sentByAdmin?: string;       // admin email/name who sent it
  personalMessage?: string;   // optional note shown in the email
}

/** Resolved coupon ready for display and checkout calculation. */
export interface AppliedCoupon {
  code: string;
  discountType: CouponDiscountType;
  value: number;
  description: string;
}

export interface CouponValidation {
  valid: boolean;
  coupon?: AppliedCoupon;
  error?: string;
}

// ── Storage helpers ────────────────────────────────────────────────────────────

const USER_COUPONS_KEY = "tcgacademy_user_coupons";
const MAX_LOG = 500;

export function loadAllUserCoupons(): UserCoupon[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(USER_COUPONS_KEY) ?? "[]") as UserCoupon[];
  } catch {
    return [];
  }
}

function persistUserCoupons(coupons: UserCoupon[]): void {
  localStorage.setItem(USER_COUPONS_KEY, JSON.stringify(coupons.slice(0, MAX_LOG)));
}

export function saveUserCoupon(coupon: UserCoupon): void {
  const all = loadAllUserCoupons();
  const idx = all.findIndex((c) => c.id === coupon.id);
  if (idx >= 0) all[idx] = coupon;
  else all.unshift(coupon);
  persistUserCoupons(all);
}

export function getUserCoupons(userId: string): UserCoupon[] {
  return loadAllUserCoupons().filter((c) => c.userId === userId);
}

export function getActiveCouponsByEmail(email: string): UserCoupon[] {
  const today = new Date().toISOString().slice(0, 10);
  return loadAllUserCoupons().filter(
    (c) =>
      c.userEmail.toLowerCase() === email.toLowerCase() &&
      c.active &&
      !c.usedAt &&
      c.expiresAt >= today,
  );
}

export function markCouponUsed(code: string, userEmail: string): void {
  const all = loadAllUserCoupons();
  const idx = all.findIndex(
    (c) =>
      c.code.toUpperCase() === code.toUpperCase() &&
      c.userEmail.toLowerCase() === userEmail.toLowerCase(),
  );
  if (idx >= 0) {
    all[idx].usedAt = new Date().toISOString();
    all[idx].active = false;
    persistUserCoupons(all);
  }
}

// ── Validation ─────────────────────────────────────────────────────────────────

export function validateCoupon(
  code: string,
  userEmail?: string,
): CouponValidation {
  const upper = code.trim().toUpperCase();
  if (!upper) return { valid: false, error: "Introduce un código" };

  // 1. User-specific coupons first (higher priority, personalised)
  if (userEmail) {
    const active = getActiveCouponsByEmail(userEmail);
    const found = active.find((c) => c.code.toUpperCase() === upper);
    if (found) {
      return {
        valid: true,
        coupon: {
          code: found.code,
          discountType: found.discountType,
          value: found.value,
          description: found.description,
        },
      };
    }
  }

  // 2. General admin coupons (SSOT: loadAdminCoupons con fallback seed)
  const today = new Date().toISOString().slice(0, 10);
  const admin = loadAdminCoupons().find(
    (c) =>
      c.code.toUpperCase() === upper && c.active && c.endsAt >= today,
  );
  if (admin) {
    return {
      valid: true,
      coupon: {
        code: admin.code,
        discountType: admin.discountType as CouponDiscountType,
        value: admin.value,
        description: admin.description,
      },
    };
  }

  return { valid: false, error: "Código no válido o caducado" };
}

// ── Discount calculation ───────────────────────────────────────────────────────

/**
 * Calculate the euro discount amount for a coupon on a given cart total.
 * For "shipping" coupons, returns 0 (shipping is zeroed out separately).
 */
export function calcCouponDiscount(
  coupon: AppliedCoupon,
  cartTotal: number,
): number {
  if (coupon.discountType === "shipping") return 0;
  if (coupon.discountType === "percent")
    return cartTotal * (coupon.value / 100);
  return Math.min(coupon.value, cartTotal);
}

// ── Code generation ────────────────────────────────────────────────────────────

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion

export function generateCouponCode(prefix = "TCG"): string {
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `${prefix}${suffix}`;
}

// ── Formatting helpers ─────────────────────────────────────────────────────────

export function formatCouponValue(
  discountType: CouponDiscountType,
  value: number,
): string {
  if (discountType === "shipping") return "Envío gratis";
  if (discountType === "percent") return `${value}% dto.`;
  return `${value.toFixed(2)}€ dto.`;
}

export function formatCouponValueForEmail(
  discountType: CouponDiscountType,
  value: number,
): string {
  if (discountType === "shipping") return "🚚 ENVÍO GRATIS";
  if (discountType === "percent") return `${value}% DE DESCUENTO`;
  return `${value.toFixed(2)}€ DE DESCUENTO`;
}

/** Format expiry date for human-readable display */
export function formatExpiryDate(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Coupon usage tracking ─────────────────────────────────────────────────────

const COUPON_USAGE_KEY = "tcgacademy_coupon_usage";

interface CouponUsageRecord {
  couponCode: string;
  userId: string;
  orderId: string;
  date: string;
}

function loadCouponUsage(): CouponUsageRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(
      localStorage.getItem(COUPON_USAGE_KEY) ?? "[]",
    ) as CouponUsageRecord[];
  } catch {
    return [];
  }
}

/**
 * Record that a coupon was used by a user in an order.
 * Call after order is successfully created.
 */
export function recordCouponUsage(
  couponCode: string,
  userId: string,
  orderId: string,
): void {
  if (typeof window === "undefined") return;
  const usage = loadCouponUsage();
  usage.unshift({
    couponCode: couponCode.toUpperCase(),
    userId,
    orderId,
    date: new Date().toISOString(),
  });
  // Cap at 1000 records
  if (usage.length > 1000) usage.length = 1000;
  localStorage.setItem(COUPON_USAGE_KEY, JSON.stringify(usage));
}

/**
 * Get usage count for a coupon, optionally filtered by user.
 */
export function getCouponUsageCount(
  couponCode: string,
  userId?: string,
): number {
  const upper = couponCode.toUpperCase();
  const usage = loadCouponUsage();
  return usage.filter(
    (r) =>
      r.couponCode === upper && (userId === undefined || r.userId === userId),
  ).length;
}

// ── Admin coupon store (SSOT) ─────────────────────────────────────────────────
// Antes: los cupones vivían solo en `MOCK_ADMIN_COUPONS` (constante en RAM) y
// la página /admin/cupones los guardaba en `useState`, por lo que cualquier
// mutación se perdía al recargar. Ahora hay una fuente única persistente.
//
// Evento canónico: "tcga:coupons:updated" — cualquier vista suscrita se refresca.

const ADMIN_COUPONS_KEY = "tcgacademy_admin_coupons";

/**
 * Read the persisted admin coupon list.
 * On first call (empty key) seeds from MOCK_ADMIN_COUPONS so demo data is available.
 */
export function loadAdminCoupons(): AdminCoupon[] {
  if (typeof window === "undefined") return MOCK_ADMIN_COUPONS.slice();
  try {
    const raw = localStorage.getItem(ADMIN_COUPONS_KEY);
    if (raw) return JSON.parse(raw) as AdminCoupon[];
    // Primera vez: sembrar con los mocks.
    localStorage.setItem(ADMIN_COUPONS_KEY, JSON.stringify(MOCK_ADMIN_COUPONS));
    return MOCK_ADMIN_COUPONS.slice();
  } catch {
    return MOCK_ADMIN_COUPONS.slice();
  }
}

/**
 * Persist a whole admin coupon list (replaces previous).
 * Dispatches `tcga:coupons:updated` for reactive consumers.
 */
export function saveAdminCoupons(coupons: AdminCoupon[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADMIN_COUPONS_KEY, JSON.stringify(coupons));
    window.dispatchEvent(new Event("tcga:coupons:updated"));
  } catch { /* non-fatal */ }
}

/**
 * Upsert a single admin coupon by code.
 * Returns the updated list.
 */
export function upsertAdminCoupon(coupon: AdminCoupon): AdminCoupon[] {
  const all = loadAdminCoupons();
  const idx = all.findIndex((c) => c.code.toUpperCase() === coupon.code.toUpperCase());
  if (idx >= 0) all[idx] = coupon;
  else all.unshift(coupon);
  saveAdminCoupons(all);
  return all;
}

/**
 * Delete an admin coupon by code.
 * Returns the updated list.
 */
export function deleteAdminCoupon(code: string): AdminCoupon[] {
  const upper = code.toUpperCase();
  const filtered = loadAdminCoupons().filter((c) => c.code.toUpperCase() !== upper);
  saveAdminCoupons(filtered);
  return filtered;
}
