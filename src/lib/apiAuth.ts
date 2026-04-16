import { NextRequest, NextResponse } from "next/server";

/**
 * API authentication and authorization middleware helpers.
 *
 * In local mode (NEXT_PUBLIC_BACKEND_MODE=local), auth is permissive —
 * the client handles auth via localStorage.
 *
 * In server mode, these functions validate JWT tokens from cookies/headers.
 */

interface ApiUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

/**
 * Extract and validate the current user from the request.
 * Returns null if not authenticated.
 */
export function getApiUser(req: NextRequest): ApiUser | null {
  const mode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";

  if (mode === "local") {
    // In local mode, trust the X-User-Id header (set by client)
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role") ?? "cliente";
    const userName = req.headers.get("x-user-name") ?? "";
    const userEmail = req.headers.get("x-user-email") ?? "";
    if (!userId) return null;
    return { id: userId, email: userEmail, role: userRole, name: userName };
  }

  // Server mode: validate JWT from cookie or Authorization header
  // TODO: Implement JWT validation
  // const token = req.cookies.get("session")?.value
  //   ?? req.headers.get("authorization")?.replace("Bearer ", "");
  // if (!token) return null;
  // try {
  //   const payload = jwt.verify(token, process.env.SESSION_SECRET!);
  //   return payload as ApiUser;
  // } catch {
  //   return null;
  // }

  return null;
}

/**
 * Require authentication. Returns error response if not authenticated.
 */
export function requireAuth(req: NextRequest): ApiUser | NextResponse {
  const user = getApiUser(req);
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
 */
export function requireAdmin(req: NextRequest): ApiUser | NextResponse {
  const result = requireAuth(req);
  if (result instanceof NextResponse) return result;
  if (result.role !== "admin") {
    return NextResponse.json(
      { error: "Acceso denegado. Se requiere rol de administrador." },
      { status: 403 },
    );
  }
  return result;
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
