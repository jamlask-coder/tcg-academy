/**
 * Autenticación para rutas /api/admin/backup-server/* y /api/admin/breach/*.
 *
 * Endurecimiento 2026-04-30:
 *   - Comparación timing-safe (antes era `!==`, vulnerable a timing attack).
 *   - Rate-limit persistente por IP (5 intentos / 5 min, vía Supabase si está
 *     disponible; in-memory en dev). Antes no había rate-limit → fuerza bruta
 *     distribuida posible si el atacante adivinaba el prefijo del token.
 *
 * Reutiliza ADMIN_BACKUP_TOKEN. Cuando exista sesión admin real (Supabase
 * Auth) podrá sustituirse por validación de JWT.
 */

import { persistentRateLimit } from "@/lib/rateLimitStore";
import { timingSafeEqualStr } from "@/lib/timingSafe";

export interface AdminAuthResult {
  ok: boolean;
  reason?: string;
  retryAfterSec?: number;
}

const RL_MAX = 5;
const RL_WINDOW_MS = 5 * 60 * 1000;

function getIpFromRequest(req: Request): string {
  // x-forwarded-for puede venir como lista "ip1, ip2"; la primera es el cliente.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function verifyBackupAdmin(req: Request): Promise<AdminAuthResult> {
  const required = process.env.ADMIN_BACKUP_TOKEN;
  if (!required) return { ok: false, reason: "ADMIN_BACKUP_TOKEN no configurado" };

  const ip = getIpFromRequest(req);
  const rateLimitKey = `admin:backup:${ip}`;

  // Comprobar rate-limit ANTES de comparar el token: si el atacante consume
  // su cuota incluso con tokens inválidos, las siguientes peticiones se
  // rechazan sin tocar la comparación criptográfica.
  const rl = await persistentRateLimit(rateLimitKey, RL_MAX, RL_WINDOW_MS);
  if (!rl.allowed) {
    const retryAfterSec = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    return {
      ok: false,
      reason: "Demasiados intentos. Espera y vuelve a probar.",
      retryAfterSec,
    };
  }

  const provided = req.headers.get("x-admin-token");
  if (!provided) return { ok: false, reason: "Falta cabecera x-admin-token" };

  // Comparación constant-time. `===` aborta en el primer byte distinto y
  // permite descubrir el secreto byte a byte con timing preciso.
  if (!timingSafeEqualStr(provided, required)) {
    return { ok: false, reason: "Token no válido" };
  }
  return { ok: true };
}
