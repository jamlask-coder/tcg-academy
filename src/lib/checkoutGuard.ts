/**
 * Checkout concurrency guard — prevents double orders across tabs.
 *
 * Uses a BroadcastChannel + localStorage lock to ensure only one checkout
 * can proceed at a time, even if the user has multiple tabs open.
 *
 * Lock lifecycle:
 *   1. acquireLock() → writes { tabId, ts } to localStorage
 *   2. Other tabs see the lock and block their checkout buttons
 *   3. releaseLock() → clears the lock after order completes (or fails)
 *   4. Stale locks (>60s) are auto-released to prevent deadlocks
 */

const LOCK_KEY = "tcgacademy_checkout_lock";
const LOCK_TTL_MS = 60_000; // 60 seconds max — protects against crashed tabs
const TAB_ID = typeof crypto !== "undefined"
  ? crypto.randomUUID?.() ?? `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`
  : `tab_${Date.now()}`;

interface CheckoutLock {
  tabId: string;
  ts: number;
  orderId?: string;
}

/** Read the current lock (if any) */
function readLock(): CheckoutLock | null {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CheckoutLock;
  } catch {
    return null;
  }
}

/** Check if a lock is stale (expired) */
function isStale(lock: CheckoutLock): boolean {
  return Date.now() - lock.ts > LOCK_TTL_MS;
}

/**
 * Try to acquire the checkout lock.
 * Returns true if this tab now owns the lock.
 * Returns false if another tab is mid-checkout.
 */
export function acquireCheckoutLock(): boolean {
  const existing = readLock();

  // If there's a non-stale lock from another tab, deny
  if (existing && !isStale(existing) && existing.tabId !== TAB_ID) {
    return false;
  }

  // Write our lock
  const lock: CheckoutLock = { tabId: TAB_ID, ts: Date.now() };
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
  } catch {
    return false;
  }

  // Double-check: read back to confirm WE wrote it (handles race with another tab)
  const verify = readLock();
  if (!verify || verify.tabId !== TAB_ID) {
    return false;
  }

  // Notify other tabs
  broadcastLockState(true);
  return true;
}

/**
 * Release the checkout lock. Only releases if this tab owns it.
 */
export function releaseCheckoutLock(): void {
  const existing = readLock();
  if (existing && existing.tabId === TAB_ID) {
    try {
      localStorage.removeItem(LOCK_KEY);
    } catch {
      // Non-critical
    }
  }
  broadcastLockState(false);
}

/**
 * Check if this tab can proceed with checkout.
 * Returns true if no other tab holds the lock.
 */
export function isCheckoutAvailable(): boolean {
  const existing = readLock();
  if (!existing) return true;
  if (isStale(existing)) return true;
  return existing.tabId === TAB_ID;
}

/**
 * Get human-readable lock status.
 */
export function getCheckoutLockStatus(): {
  locked: boolean;
  ownedByMe: boolean;
  age: number;
} {
  const existing = readLock();
  if (!existing || isStale(existing)) {
    return { locked: false, ownedByMe: false, age: 0 };
  }
  return {
    locked: true,
    ownedByMe: existing.tabId === TAB_ID,
    age: Date.now() - existing.ts,
  };
}

// ── Cross-tab communication ─────────────────────────────────────────────────

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!channel) {
    try {
      channel = new BroadcastChannel("tcga-checkout");
    } catch {
      return null;
    }
  }
  return channel;
}

function broadcastLockState(locked: boolean): void {
  getChannel()?.postMessage({ type: "checkout-lock", locked, tabId: TAB_ID });
}

/**
 * Listen for checkout lock changes from other tabs.
 * Returns a cleanup function.
 */
export function onCheckoutLockChange(
  callback: (locked: boolean) => void,
): () => void {
  const ch = getChannel();
  if (!ch) return () => {};

  const handler = (e: MessageEvent) => {
    if (e.data?.type === "checkout-lock" && e.data.tabId !== TAB_ID) {
      callback(e.data.locked);
    }
  };

  ch.addEventListener("message", handler);
  return () => ch.removeEventListener("message", handler);
}

// ── Idempotency ─────────────────────────────────────────────────────────────

const RECENT_ORDERS_KEY = "tcgacademy_recent_order_ids";
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if an order was already created recently (prevents duplicate orders).
 * Uses a fingerprint of cart contents + user + total.
 */
export function checkOrderIdempotency(fingerprint: string): boolean {
  try {
    const raw = localStorage.getItem(RECENT_ORDERS_KEY);
    const entries = raw ? (JSON.parse(raw) as { fp: string; ts: number }[]) : [];
    const now = Date.now();

    // Clean expired entries
    const valid = entries.filter((e) => now - e.ts < DEDUP_WINDOW_MS);

    // Check for duplicate
    if (valid.some((e) => e.fp === fingerprint)) {
      return false; // Duplicate detected
    }

    // Record this order
    valid.push({ fp: fingerprint, ts: now });
    localStorage.setItem(RECENT_ORDERS_KEY, JSON.stringify(valid));
    return true; // OK to proceed
  } catch {
    return true; // Fail open on storage errors
  }
}

/**
 * Generate a fingerprint for the current order (for dedup).
 */
export function orderFingerprint(
  items: { key: string; quantity: number }[],
  email: string,
  total: number,
): string {
  const itemStr = items
    .map((i) => `${i.key}:${i.quantity}`)
    .sort()
    .join(",");
  return `${email}|${itemStr}|${total.toFixed(2)}`;
}
