import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getSessionFromRequest, type SessionPayload } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * API authentication and authorization middleware helpers.
 *
 * ─── Modelo de confianza ──────────────────────────────────────────────────
 *
 * Server mode (recomendado producción):
 *   - JWT firmado en cookie httpOnly/Secure.
 *   - La ruta `getSessionFromRequest` valida firma + expiración. Sin firma
 *     válida → 401. El cliente no puede forjar roles.
 *
 * Local mode (demo / desarrollo):
 *   - Todo vive en localStorage del navegador.
 *   - Las APIs son en su mayoría stubs (eco / validación de forma). No hay
 *     datos de otros usuarios accesibles server-side.
 *   - Los headers `X-User-*` se aceptan SOLO en desarrollo. En producción
 *     con modo local, ignoramos `X-User-Role` (siempre "cliente") y emitimos
 *     warning porque el escenario "local mode en producción" es inseguro —
 *     `requireAdmin` fallará, forzando a usar server mode para cualquier
 *     operación administrativa real.
 *
 * ─── Defensa en profundidad ───────────────────────────────────────────────
 *
 *   - CORS restringido a NEXT_PUBLIC_APP_URL (ver `corsHeaders`).
 *   - Rate limiting granular en `/api/auth` (login/register/reset).
 *   - Ownership checks en recursos individuales (ej: `/api/orders/[id]`).
 *   - Origin check opcional (`assertSameOrigin`) para operaciones mutantes.
 */

export interface ApiUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

const isProduction = () => process.env.NODE_ENV === "production";
const isServerMode = () =>
  (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";

/**
 * Extract and validate the current user from the request.
 * Returns null if not authenticated.
 */
export async function getApiUser(req: NextRequest): Promise<ApiUser | null> {
  if (isServerMode()) {
    // Server mode: validate JWT from cookie or Authorization header
    const session: SessionPayload | null = await getSessionFromRequest(req);
    if (!session || !session.sub) return null;
    return {
      id: session.sub,
      email: session.email,
      role: session.role,
      name: session.name,
    };
  }

  // Local mode
  const userId = req.headers.get("x-user-id");
  if (!userId) return null;

  const userName = req.headers.get("x-user-name") ?? "";
  const userEmail = req.headers.get("x-user-email") ?? "";

  // Producción + local mode = escenario inseguro. Nunca aceptar role=admin
  // desde headers (un atacante puede enviarlo trivialmente). Forzamos
  // "cliente" para que `requireAdmin` falle cerrado.
  const rawRole = req.headers.get("x-user-role") ?? "cliente";
  let role = rawRole;
  if (isProduction() && rawRole === "admin") {
    logger.warn(
      "Rechazado header X-User-Role=admin en local mode+producción",
      "apiAuth",
      { ip: req.headers.get("x-forwarded-for") ?? "unknown" },
    );
    role = "cliente";
  }

  return { id: userId, email: userEmail, role, name: userName };
}

/**
 * Require authentication. Returns error response if not authenticated.
 */
export async function requireAuth(req: NextRequest): Promise<ApiUser | NextResponse> {
  const user = await getApiUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "No autenticado. Inicia sesión." },
      { status: 401 },
    );
  }
  return user;
}

/**
 * Require admin role. Returns error response if not admin.
 *
 * Defensa en profundidad además del proxy:
 *   - Local mode + production → 403 absoluto en /api/admin/*. La auth fiable
 *     en producción exige modo server (JWT firmado). En local mode los headers
 *     `X-User-*` son trivialmente forjables, así que ni los miramos para admin.
 *   - Server mode → exige JWT válido con role=admin.
 */
export async function requireAdmin(req: NextRequest): Promise<ApiUser | NextResponse> {
  // Cierre adicional: en producción + local mode, /api/admin/* nunca pasa.
  if (isProduction() && !isServerMode()) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/admin/")) {
      logger.warn(
        "Bloqueado /api/admin/* en local-mode + producción (requiere server mode)",
        "apiAuth",
        {
          path: url.pathname,
          ip: req.headers.get("x-forwarded-for") ?? "unknown",
        },
      );
      return NextResponse.json(
        { error: "Acceso denegado. Configuración insegura — usar modo server." },
        { status: 403 },
      );
    }
  }

  const result = await requireAuth(req);
  if (result instanceof NextResponse) return result;
  if (result.role !== "admin") {
    logger.warn("Intento de acceso admin sin rol", "apiAuth", {
      userId: result.id,
      role: result.role,
      ip: req.headers.get("x-forwarded-for") ?? "unknown",
    });
    return NextResponse.json(
      { error: "Acceso denegado. Se requiere rol de administrador." },
      { status: 403 },
    );
  }
  return result;
}

/**
 * Origin check para operaciones mutantes (POST/PATCH/PUT/DELETE).
 * Rechaza requests cross-site (CSRF) comparando Origin con NEXT_PUBLIC_APP_URL.
 * Retorna null si OK, NextResponse 403 si no.
 *
 * Uso: en rutas sensibles, llamar al inicio y abortar si devuelve respuesta.
 */
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const allowed = new URL(appUrl).origin;

  // Si no hay origin ni referer, bloqueamos (no es un navegador legítimo).
  if (!origin && !referer) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  if (origin && origin !== allowed) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }
  if (!origin && referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (refOrigin !== allowed) {
        return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    }
  }
  return null;
}

/**
 * CORS headers for API routes.
 */
export function corsHeaders(): Record<string, string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    "Access-Control-Allow-Origin": appUrl,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id, X-User-Role, X-User-Name, X-User-Email",
    "Access-Control-Max-Age": "86400",
  };
}
