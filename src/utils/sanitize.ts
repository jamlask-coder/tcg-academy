/**
 * Input sanitisation helpers.
 *
 * These run entirely on the client since this is a static export with no server.
 * For a production backend, also sanitise server-side with DOMPurify or equivalent.
 */

/** Strip HTML tags and potentially dangerous characters from a string. */
export function sanitizeString(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")           // strip tags
    .replace(/javascript:/gi, "")      // strip JS URIs
    .replace(/on\w+\s*=/gi, "")        // strip event handlers
    .trim()
}

/** Sanitise an object of string form fields in-place and return a cleaned copy. */
export function sanitizeFormData<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(data)) {
    out[key] = typeof val === "string" ? sanitizeString(val) : val
  }
  return out as T
}

/** Basic rate-limit helper: returns `true` if the action is allowed.
 *  Stores timestamps in sessionStorage under `rl:<key>`.
 *  @param key  Unique key for this action (e.g. "contact-form")
 *  @param max  Max attempts in the window
 *  @param windowMs  Window length in ms (default 60 000 = 1 min)
 */
export function checkRateLimit(key: string, max = 3, windowMs = 60_000): boolean {
  try {
    const storageKey = `rl:${key}`
    const now = Date.now()
    const raw = sessionStorage.getItem(storageKey)
    const timestamps: number[] = raw ? JSON.parse(raw) : []
    const recent = timestamps.filter((t) => now - t < windowMs)
    if (recent.length >= max) return false
    recent.push(now)
    sessionStorage.setItem(storageKey, JSON.stringify(recent))
    return true
  } catch {
    return true // fail open if storage unavailable
  }
}
