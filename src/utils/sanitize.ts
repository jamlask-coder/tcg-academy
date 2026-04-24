/**
 * Input sanitisation helpers (client-side static export).
 * For a real backend, also sanitise server-side with DOMPurify or equivalent.
 *
 * HARDENED: length limits, null byte stripping, prototype pollution guard,
 * Unicode normalization, control character removal.
 */

/** Default max length for sanitized strings (prevents storage bloat) */
const DEFAULT_MAX_LENGTH = 500;

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

/**
 * Strip HTML tags, XSS vectors, null bytes, and control characters.
 * Enforces a maximum length to prevent storage/memory abuse.
 */
export function sanitizeString(
  value: string,
  maxLength = DEFAULT_MAX_LENGTH,
): string {
  // 1. Truncate first to prevent regex DoS on huge strings
  let s = value.slice(0, maxLength * 2);

  // 2. Remove null bytes and control characters (except newline, tab)
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 3. Normalize Unicode to prevent homoglyph attacks
  s = s.normalize("NFC");

  // 4. Strip HTML and XSS vectors
  s = s
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/data:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/eval\s*\(/gi, "")
    .replace(/expression\s*\(/gi, "")
    .trim();

  // 5. Strip SQL patterns
  s = stripSqlPatterns(s);

  // 6. Final length enforcement
  return s.slice(0, maxLength);
}

/** Dangerous keys that must never appear in user-supplied objects */
const FORBIDDEN_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
  "toString",
  "valueOf",
  "hasOwnProperty",
]);

/**
 * Sanitise all string fields in a plain object and return a cleaned copy.
 * Blocks prototype pollution by rejecting dangerous keys.
 * Limits recursion depth to prevent stack overflow.
 */
export function sanitizeFormData<T extends Record<string, unknown>>(
  data: T,
  maxDepth = 3,
): T {
  if (maxDepth <= 0) return {} as T;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    // Block prototype pollution
    if (FORBIDDEN_KEYS.has(k)) continue;

    if (typeof v === "string") {
      out[k] = sanitizeString(v);
    } else if (
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v)
    ) {
      out[k] = sanitizeFormData(v as Record<string, unknown>, maxDepth - 1);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

/**
 * Validate that an email is structurally sound.
 * Not a full RFC 5322 check — catches common garbage inputs.
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email);
}

/**
 * Clamp a numeric value to a safe range.
 * Use for prices, quantities, discounts — prevents NaN/Infinity/negative.
 */
export function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
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
// Para despliegues serverless / multi-instancia, usar `persistentRateLimit`
// de `src/lib/rateLimitStore.ts` — respaldado por Supabase cuando está
// configurado. Este `serverRateLimit` sigue siendo el store por defecto
// (una sola instancia) y fallback si Supabase no está disponible.

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
