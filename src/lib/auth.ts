/**
 * Server-side authentication utilities.
 *
 * - Password hashing: bcryptjs (works in Edge runtime)
 * - JWT: jose (Edge-compatible, no Node.js crypto dependency)
 * - Cookies: httpOnly, Secure, SameSite=Lax
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import bcrypt from "bcryptjs";
import type { NextRequest, NextResponse } from "next/server";
import { SITE_CONFIG } from "@/config/siteConfig";

// ─── Config ─────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const JWT_ALGORITHM = "HS256";
const COOKIE_NAME = "tcga_session";
// Duración derivada de SITE_CONFIG para mantener una única fuente de verdad:
// si cambia en el config global (por ejemplo a 48 h), el JWT lo sigue sin que
// haya que tocar código.
const SESSION_EXPIRY = `${SITE_CONFIG.sessionExpiryHours}h`;
const REMEMBER_ME_EXPIRY = "30d";

function getJwtSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

// ─── Password hashing ───────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT ────────────────────────────────────────────────────────────────────

export interface SessionPayload extends JWTPayload {
  sub: string;    // user ID
  email: string;
  role: string;
  name: string;
}

export async function createSessionToken(
  user: { id: string; email: string; role: string; name: string },
  rememberMe = false,
): Promise<string> {
  const secret = getJwtSecret();
  const expiry = rememberMe ? REMEMBER_ME_EXPIRY : SESSION_EXPIRY;

  return new SignJWT({
    email: user.email,
    role: user.role,
    name: user.name,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(expiry)
    .setJti(crypto.randomUUID())
    .sign(secret);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Cookie management ──────────────────────────────────────────────────────

export function setSessionCookie(
  response: NextResponse,
  token: string,
  rememberMe = false,
): NextResponse {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
  const isProduction = process.env.NODE_ENV === "production";

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

/**
 * Extract session from request (cookie or Authorization header).
 */
export async function getSessionFromRequest(
  req: NextRequest,
): Promise<SessionPayload | null> {
  // 1. Try cookie
  const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken) {
    return verifySessionToken(cookieToken);
  }

  // 2. Try Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verifySessionToken(authHeader.slice(7));
  }

  return null;
}

// ─── Request IP extraction ──────────────────────────────────────────────────

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
