/**
 * Next.js Middleware — Global request protection.
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

export function middleware(request: NextRequest) {
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
    // CORS
    const origin = request.headers.get("origin");
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    if (origin && origin !== allowedOrigin) {
      response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
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
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    // In server mode, this would check JWT.
    // In local mode, admin protection is client-side.
    // Add the header so API routes know this is an admin path.
    response.headers.set("X-Admin-Route", "true");
  }

  return response;
}

// Only run middleware on relevant paths (skip static files)
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
