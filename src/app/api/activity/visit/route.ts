/**
 * POST /api/activity/visit
 *
 * Registra una navegación del usuario autenticado para alimentar el panel
 * `/admin/usuarios/[id]` con datos REALES (antes era una serie inventada con
 * seed determinista por user.id — engañoso para el admin).
 *
 * Reglas:
 *   - Sólo se registra si hay sesión válida. Anónimos → 204 silencioso.
 *   - Local-mode → 204 silencioso (no hay tabla, no hay admin viendo otros).
 *   - Throttle 5s por usuario (rate-limit) para evitar spam si el cliente
 *     dispara navigation events redundantes.
 *   - Path se sanea: sin query string, sin fragment, máximo 512 chars.
 *   - NO registramos `/admin/*`, `/api/*`, paths de assets — son ruido para
 *     el análisis de comportamiento de cliente.
 *
 * Devolución: 204 (No Content) en cualquier caso para que el tracker cliente
 * sea best-effort y no afecte UX si esto falla.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionFromRequest, getClientIp } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { persistentRateLimit } from "@/lib/rateLimitStore";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isServerMode = () =>
  (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";

/** Paths que ignoramos por completo — no aportan a la analítica de cliente. */
const SKIP_PREFIXES = ["/admin", "/api", "/_next", "/static", "/images", "/fonts"];

function sanitizePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // Quitar query/fragment, normalizar espacios, truncar.
  const noQuery = raw.split("?")[0]?.split("#")[0] ?? "";
  const trimmed = noQuery.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.length > 512) return trimmed.slice(0, 512);
  return trimmed;
}

function shouldSkip(path: string): boolean {
  return SKIP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function POST(req: NextRequest) {
  // Local-mode: tabla inexistente — respondemos 204 sin más para que el
  // tracker cliente no muestre errores en consola del dev.
  if (!isServerMode()) {
    return new NextResponse(null, { status: 204 });
  }

  const session = await getSessionFromRequest(req);
  if (!session?.sub) {
    // Anónimo — no registramos. 204 vacío.
    return new NextResponse(null, { status: 204 });
  }

  let body: { path?: unknown };
  try {
    body = (await req.json()) as { path?: unknown };
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const path = sanitizePath(body.path);
  if (!path || shouldSkip(path)) {
    return new NextResponse(null, { status: 204 });
  }

  // Throttle: max 1 ping cada 5s por usuario. Si supera, ignoramos
  // silenciosamente — el siguiente cambio de ruta sí entrará.
  const rl = await persistentRateLimit(`visit:${session.sub}`, 1, 5_000);
  if (!rl.allowed) {
    return new NextResponse(null, { status: 204 });
  }

  // Rate-limit defensivo por IP (1000/hora) para tapar bots con cookie
  // robada que intenten inflar la tabla. Fail-open por diseño.
  const ip = getClientIp(req);
  await persistentRateLimit(`visit-ip:${ip}`, 1000, 60 * 60 * 1000);

  try {
    const db = getDb();
    await db.recordVisit({
      userId: session.sub,
      path,
      // Hash corto del JTI/iat para estimar sesiones únicas sin guardar
      // el token. iat cambia por sesión (no por request) → buen proxy.
      sessionHash: typeof session.iat === "number"
        ? String(session.iat).slice(-8)
        : undefined,
    });
  } catch (err) {
    // Best-effort: si falla, log y respondemos 204 igual. El tracker
    // cliente NO debe mostrar error al usuario por una analítica.
    logger.warn("recordVisit failed", "api/activity/visit", {
      userId: session.sub,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return new NextResponse(null, { status: 204 });
}
