/**
 * Input sanitisation helpers (client-side static export).
 * For a real backend, also sanitise server-side with DOMPurify or equivalent.
 */

/**
 * Strip common SQL injection patterns (defense-in-depth).
 * Not a WAF — real protection must happen server-side with parameterised queries.
 */
export function stripSqlPatterns(input: string): string {
  const patterns: RegExp[] = [
    /'\s*;\s*DROP/gi,
    /--/g,
    /\/\*/g,
    /\*\//g,
    /UNION\s+SELECT/gi,
    /OR\s+1\s*=\s*1/gi,
    /'\s+OR\s+'/gi,
    /;\s*DELETE/gi,
    /;\s*UPDATE/gi,
    /;\s*INSERT/gi,
  ];
  let result = input;
  for (const p of patterns) {
    result = result.replace(p, "");
  }
  return result;
}

/** Strip HTML tags and all known XSS vectors from a string. */
export function sanitizeString(value: string): string {
  const htmlCleaned = value
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/javascript:/gi, "") // JS URI scheme
    .replace(/vbscript:/gi, "") // VBScript URI scheme
    .replace(/data:/gi, "") // data URI scheme
    .replace(/on\w+\s*=/gi, "") // inline event handlers (onclick=, onerror=…)
    .replace(/eval\s*\(/gi, "") // eval(
    .replace(/expression\s*\(/gi, "") // CSS expression(
    .trim();
  return stripSqlPatterns(htmlCleaned);
}

/** Sanitise all string fields in a plain object and return a cleaned copy. */
export function sanitizeFormData<T extends Record<string, unknown>>(
  data: T,
): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = typeof v === "string" ? sanitizeString(v) : v;
  }
  return out as T;
}

/**
 * Basic CLIENT-SIDE rate-limit: returns `true` if the action is allowed.
 * Timestamps are stored in sessionStorage under `rl:<key>`.
 *
 * WARNING: This is trivially bypassed by clearing sessionStorage or using
 * private browsing. It only deters accidental double-submits and naive abuse.
 * For real protection, use `serverRateLimit` below or a server-side middleware
 * backed by Redis / a database.
 */
export function checkRateLimit(
  key: string,
  max = 3,
  windowMs = 60_000,
): boolean {
  try {
    const sk = `rl:${key}`;
    const now = Date.now();
    const recent = (
      JSON.parse(sessionStorage.getItem(sk) ?? "[]") as number[]
    ).filter((t) => now - t < windowMs);
    if (recent.length >= max) return false;
    recent.push(now);
    sessionStorage.setItem(sk, JSON.stringify(recent));
    return true;
  } catch {
    return true; // fail open if storage unavailable
  }
}

// ─── Server-side rate limiting (single-server, in-memory) ────────────────────
// TODO: For multi-server / serverless deployments, replace the in-memory Map
// with a Redis-backed store (e.g. `ioredis` INCR + EXPIRE pattern).

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Server-side rate limiter for single-server deployments.
 * Tracks request counts per key in memory with a sliding window.
 *
 * @param key      Unique identifier (e.g. IP address, user ID, endpoint)
 * @param maxAttempts  Maximum allowed attempts within the window
 * @param windowMs     Window duration in milliseconds
 * @returns `{ allowed, remaining, resetAt }` — resetAt is a Unix timestamp (ms)
 */
export function serverRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  // Clean up expired entries to prevent memory leaks
  for (const [k, entry] of rateLimitStore) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(k);
    }
  }

  const existing = rateLimitStore.get(key);

  if (!existing || now >= existing.resetAt) {
    // First request or window expired — start fresh
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxAttempts - 1, resetAt };
  }

  if (existing.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: maxAttempts - existing.count,
    resetAt: existing.resetAt,
  };
}
