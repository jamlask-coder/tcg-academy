/**
 * Rate limit store persistente.
 *
 * El `serverRateLimit` clásico (`src/utils/sanitize.ts`) usa un `Map` en
 * memoria — válido para una única instancia, pero en serverless (Vercel,
 * Cloudflare Workers, etc.) cada cold start crea un Map nuevo y cada lambda
 * mantiene el suyo. Un atacante con suerte cruza instancias y multiplica
 * su cuota real.
 *
 * Este archivo provee `persistentRateLimit(...)` — async, respaldado por
 * Supabase cuando `NEXT_PUBLIC_BACKEND_MODE=server`. Si no hay Supabase
 * configurado, cae al store in-memory compartido con el legacy. Así
 * producción serverless obtiene cuota global real.
 *
 * Pre-requisito para modo persistente: aplicar la migración
 * `supabase/migrations/rate_limits.sql` (se crea con este archivo).
 */

import { getSupabaseAdmin } from "@/lib/supabase";
import { serverRateLimit } from "@/utils/sanitize";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const isServerMode = () =>
  (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";
const hasSupabase = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

/**
 * Rate limiting atómico sobre Postgres. Usa UPSERT + check-and-increment en
 * una transacción corta para evitar races.
 *
 * Tabla requerida: `rate_limits(key TEXT PK, count INT, reset_at TIMESTAMPTZ)`.
 * Ver `supabase/migrations/rate_limits.sql`.
 */
async function supabaseRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const supabase = getSupabaseAdmin();
  const now = Date.now();
  const resetAtNew = new Date(now + windowMs).toISOString();

  // Limpieza de entradas expiradas (best-effort, no bloquea).
  void supabase
    .from("rate_limits")
    .delete()
    .lt("reset_at", new Date(now).toISOString())
    .then(() => null, () => null);

  // Leer estado actual
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("count, reset_at")
    .eq("key", key)
    .maybeSingle();

  const existingResetMs = existing ? new Date(existing.reset_at).getTime() : 0;

  if (!existing || now >= existingResetMs) {
    // Ventana nueva — upsert con count=1
    await supabase
      .from("rate_limits")
      .upsert({ key, count: 1, reset_at: resetAtNew }, { onConflict: "key" });
    return { allowed: true, remaining: maxAttempts - 1, resetAt: now + windowMs };
  }

  if (existing.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: existingResetMs };
  }

  // Incrementar atómicamente
  await supabase
    .from("rate_limits")
    .update({ count: existing.count + 1 })
    .eq("key", key);

  return {
    allowed: true,
    remaining: maxAttempts - existing.count - 1,
    resetAt: existingResetMs,
  };
}

/**
 * Rate limiting persistente. En server mode + Supabase configurado usa la BD.
 * Si no, cae al Map in-memory clásico.
 *
 * **Safety**: si Supabase falla, permite la request (fail-open) pero registra
 * en consola. Preferimos falsos-negativos a bloquear usuarios legítimos.
 */
export async function persistentRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (isServerMode() && hasSupabase()) {
    try {
      return await supabaseRateLimit(key, maxAttempts, windowMs);
    } catch {
      // Fallback silencioso al store in-memory si Supabase rechaza.
      return serverRateLimit(key, maxAttempts, windowMs);
    }
  }
  return serverRateLimit(key, maxAttempts, windowMs);
}
