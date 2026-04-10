/**
 * Input sanitisation helpers (client-side static export).
 * For a real backend, also sanitise server-side with DOMPurify or equivalent.
 */

/** Strip HTML tags and all known XSS vectors from a string. */
export function sanitizeString(value: string): string {
  return value
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/javascript:/gi, "") // JS URI scheme
    .replace(/vbscript:/gi, "") // VBScript URI scheme
    .replace(/data:/gi, "") // data URI scheme
    .replace(/on\w+\s*=/gi, "") // inline event handlers (onclick=, onerror=…)
    .replace(/eval\s*\(/gi, "") // eval(
    .replace(/expression\s*\(/gi, "") // CSS expression(
    .trim();
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
 * Basic rate-limit: returns `true` if the action is allowed.
 * Timestamps are stored in sessionStorage under `rl:<key>`.
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
