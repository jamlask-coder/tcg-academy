/**
 * Next.js Proxy — Global request protection.
 *
 * Runs on EVERY request before reaching the page/API route.
 *
 * Protections:
 *   1. CSP headers (defense-in-depth, complements _headers)
 *   2. Bot/crawler abuse detection on API routes
 *   3. Request size guard
 *   4. Path traversal prevention
 *   5. Admin route protection
 *   6. CORS enforcement on API routes
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { isIpAllowedForAdmin } from "@/lib/adminIpAllowlist";

const SESSION_COOKIE = "tcga_session";
const ADMIN_LOCAL_COOKIE = "tcga_admin_panel"; // local-mode panel gate cookie

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Comparación de strings en tiempo constante (audit P0 A-01).
 * `===` en JS abrevia al primer byte distinto → time leak permite
 * adivinar `ADMIN_PANEL_TOKEN` byte a byte. Esta versión recorre la
 * longitud máxima de ambos siempre.
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < max; i++) {
    diff |= (a.charCodeAt(i) ?? 0) ^ (b.charCodeAt(i) ?? 0);
  }
  return diff === 0;
}

// Rate-limit en memoria por IP para el gate del panel admin (audit P0 A-01).
// Edge runtime no persiste entre cold starts, pero cubre el ataque de fuerza
// bruta contra una sola instancia. Para producción robusta se recomienda
// edge-config / KV externo. Cap: 5 intentos fallidos por IP / 5 min.
const ADMIN_GATE_FAILS = new Map<string, { count: number; resetAt: number }>();
const ADMIN_GATE_WINDOW_MS = 5 * 60 * 1000;
const ADMIN_GATE_MAX_FAILS = 5;
function adminGateRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = ADMIN_GATE_FAILS.get(ip);
  if (!entry || entry.resetAt < now) {
    ADMIN_GATE_FAILS.set(ip, { count: 0, resetAt: now + ADMIN_GATE_WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= ADMIN_GATE_MAX_FAILS) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true };
}
function adminGateRecordFail(ip: string): void {
  const now = Date.now();
  const entry = ADMIN_GATE_FAILS.get(ip);
  if (!entry || entry.resetAt < now) {
    ADMIN_GATE_FAILS.set(ip, { count: 1, resetAt: now + ADMIN_GATE_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function denyAdmin(
  pathname: string,
  reason: string,
  request: NextRequest,
): NextResponse {
  const isApi = pathname.startsWith("/api/");
  // Log estructurado: en producción esto va a stdout y lo recoge el proveedor.
  // No usamos logger porque proxy corre en Edge y queremos cero overhead.
  // eslint-disable-next-line no-console
  console.warn(
    `[admin-guard] DENY ${request.method} ${pathname} ip=${getIp(request)} reason=${reason} ua="${request.headers.get("user-agent") ?? ""}"`,
  );
  if (isApi) {
    return new NextResponse(
      JSON.stringify({ error: "Acceso denegado" }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    );
  }
  // Página: redirige a login con `from=` para volver tras autenticar.
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  url.searchParams.set("reason", "admin");
  const r = NextResponse.redirect(url);
  r.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  r.headers.set("X-Robots-Tag", "noindex, nofollow");
  return r;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // ── 1. Security headers on ALL responses ──
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Download-Options", "noopen");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );

  // ── 2. Path traversal prevention ──
  if (
    pathname.includes("..") ||
    pathname.includes("//") ||
    pathname.includes("\\") ||
    pathname.includes("%2e%2e") ||
    pathname.includes("%252e")
  ) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // ── 3. Block common attack paths ──
  const BLOCKED_PATHS = [
    "/wp-admin",
    "/wp-login",
    "/.env",
    "/.git",
    "/phpinfo",
    "/phpmyadmin",
    "/admin.php",
    "/xmlrpc.php",
    "/wp-content",
    "/cgi-bin",
    "/.well-known/security.txt", // We don't have one, block scans
  ];
  if (BLOCKED_PATHS.some((p) => pathname.toLowerCase().startsWith(p))) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // ── 4. API route protections ──
  if (pathname.startsWith("/api/")) {
    // CORS (audit P0 I-03 — solo emitir ACAO cuando el origin coincide).
    const origin = request.headers.get("origin");
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    if (origin && origin === allowedOrigin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Vary", "Origin");
    }

    // CSRF / Origin check para operaciones mutantes. Rechaza requests que no
    // vienen del propio origen (curl/otra web/extensión). Excluimos webhooks
    // (Stripe) y crons (providers externos) porque son cross-origin por
    // diseño y se autentican con secrets distintos.
    const MUTATING = new Set(["POST", "PATCH", "PUT", "DELETE"]);
    const ORIGIN_EXCLUDE = ["/api/payments/webhook", "/api/cron/"];
    const isMutating = MUTATING.has(request.method.toUpperCase());
    const isOriginExcluded = ORIGIN_EXCLUDE.some((p) => pathname.startsWith(p));
    if (isMutating && !isOriginExcluded) {
      const referer = request.headers.get("referer");
      const allowed = (() => {
        try {
          return new URL(allowedOrigin).origin;
        } catch {
          return allowedOrigin;
        }
      })();
      if (!origin && !referer) {
        return new NextResponse(
          JSON.stringify({ error: "Origen no permitido" }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }
      if (origin && origin !== allowed) {
        return new NextResponse(
          JSON.stringify({ error: "Origen no permitido" }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }
      if (!origin && referer) {
        try {
          if (new URL(referer).origin !== allowed) {
            return new NextResponse(
              JSON.stringify({ error: "Origen no permitido" }),
              { status: 403, headers: { "Content-Type": "application/json" } },
            );
          }
        } catch {
          return new NextResponse(
            JSON.stringify({ error: "Origen no permitido" }),
            { status: 403, headers: { "Content-Type": "application/json" } },
          );
        }
      }
    }

    // Reject suspiciously large payloads early
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) {
      return new NextResponse(
        JSON.stringify({ error: "Payload too large" }),
        { status: 413, headers: { "Content-Type": "application/json" } },
      );
    }

    // Block non-JSON content types on POST/PUT/PATCH
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      const ct = request.headers.get("content-type") ?? "";
      if (ct && !ct.includes("application/json") && !ct.includes("multipart/form-data")) {
        return new NextResponse(
          JSON.stringify({ error: "Content-Type must be application/json" }),
          { status: 415, headers: { "Content-Type": "application/json" } },
        );
      }
    }
  }

  // ── 5. Admin route protection ──
  // Bloqueo server-side ANTES de servir HTML/JSON. Tres modos:
  //   a) Server mode → JWT cookie firmada con role=admin (no falsificable).
  //   b) Local mode + production → cookie `tcga_admin_panel` con valor igual
  //      al env `ADMIN_PANEL_TOKEN` (compartido fuera de banda con el admin).
  //      Si la env no está, /admin queda BLOQUEADO totalmente — fail-secure.
  //   c) Development (NODE_ENV !== production) → permite, para no romper DX.
  //
  // Excepciones (no admin):
  //   - /api/admin/backup-server (cron interno con su propio token)
  //   - /api/payments/webhook, /api/cron/* (excluidos antes en este mismo proxy)
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const isProd = process.env.NODE_ENV === "production";
    const isServerMode =
      (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";

    // Headers no-cache + noindex SIEMPRE para rutas admin, aunque pasen el guard.
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Admin-Route", "true");

    if (isProd) {
      // IP allowlist (si está configurada vía env). En producción solo.
      const ip = getIp(request);
      if (!isIpAllowedForAdmin(ip)) {
        return denyAdmin(pathname, "ip-not-allowed", request);
      }

      if (isServerMode) {
        const token = request.cookies.get(SESSION_COOKIE)?.value;
        if (!token) return denyAdmin(pathname, "no-session", request);
        const session = await verifySessionToken(token);
        if (!session) return denyAdmin(pathname, "invalid-session", request);
        if (session.role !== "admin") {
          return denyAdmin(pathname, "not-admin", request);
        }
      } else {
        // Local mode + production: gate por cookie compartida con el admin.
        const required = process.env.ADMIN_PANEL_TOKEN;
        if (!required) {
          // Fail-secure: si el operador no configuró ADMIN_PANEL_TOKEN, /admin
          // queda cerrado. Mejor un 403 explícito que dejarlo abierto a
          // localStorage tampering.
          return denyAdmin(pathname, "no-admin-panel-token-configured", request);
        }
        // Audit P0 A-01: longitud mínima 32 chars para mitigar fuerza bruta.
        if (required.length < 32) {
          return denyAdmin(pathname, "admin-panel-token-too-short", request);
        }
        // Rate-limit: bloquea IP tras 5 intentos fallidos / 5 min.
        const rl = adminGateRateLimit(ip);
        if (!rl.allowed) {
          // eslint-disable-next-line no-console
          console.warn(`[admin-guard] RATE-LIMITED ${request.method} ${pathname} ip=${ip}`);
          return new NextResponse(
            JSON.stringify({ error: "Demasiados intentos. Espera unos minutos." }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": String(rl.retryAfterSec ?? 300),
                "Cache-Control": "no-store",
              },
            },
          );
        }
        const cookie = request.cookies.get(ADMIN_LOCAL_COOKIE)?.value;
        // timingSafeEqualStr (no `===`) evita timing-attack por byte.
        if (!cookie || !timingSafeEqualStr(cookie, required)) {
          adminGateRecordFail(ip);
          return denyAdmin(pathname, "missing-admin-panel-cookie", request);
        }
      }
    }
    // En development se permite el paso para DX (con todos los headers ya puestos).
  }

  return response;
}

// Only run proxy on relevant paths (skip static files)
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|images/|fonts/).*)",
  ],
};
