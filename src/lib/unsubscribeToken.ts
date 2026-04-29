/**
 * Tokens firmados HMAC para enlaces "Cancelar suscripción" en emails.
 *
 * Reusamos `SESSION_SECRET` (jose, HS256) — el mismo que ya valida la cookie
 * de sesión, así no añadimos un secret nuevo. El token incluye el email del
 * destinatario y caduca en 1 año (los emails comerciales pueden ser leídos
 * meses después de enviarlos; un TTL corto rompería enlaces legítimos).
 *
 * Endpoint que verifica: `/api/unsubscribe`.
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const ALG = "HS256";
const TTL = "365d";

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

interface UnsubscribePayload extends JWTPayload {
  email: string;
  /** Tipo de tokens de este módulo — evita reusar tokens de sesión aquí. */
  scope: "unsubscribe";
}

export async function createUnsubscribeToken(email: string): Promise<string> {
  return new SignJWT({ email: email.toLowerCase().trim(), scope: "unsubscribe" })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(getSecret());
}

/**
 * Devuelve el email asociado al token, o `null` si está caducado/manipulado/
 * no es un token de unsubscribe.
 */
export async function verifyUnsubscribeToken(
  token: string,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: [ALG],
    });
    const p = payload as UnsubscribePayload;
    if (p.scope !== "unsubscribe" || typeof p.email !== "string") return null;
    return p.email;
  } catch {
    return null;
  }
}

/**
 * Construye la URL absoluta que se inyecta en `{{unsubscribe_link}}` de cada
 * plantilla. Resuelve el dominio en este orden:
 *   1. `NEXT_PUBLIC_APP_URL` (configurado por el operador, p.ej. dominio
 *      personalizado tcgacademy.com).
 *   2. `VERCEL_PROJECT_PRODUCTION_URL` (Vercel inyecta el dominio prod
 *      automáticamente — robust fallback si el operador olvida la env var).
 *   3. `VERCEL_URL` (deployment-specific, p.ej. preview/branch).
 *   4. `http://localhost:3000` (último recurso, dev local).
 *
 * Antes solo miraba (1) y caía a localhost. Si `NEXT_PUBLIC_APP_URL` no
 * estaba configurado en Vercel, los emails enviados desde producción
 * apuntaban a `http://localhost:3000/unsubscribe?...` → 404 / connection
 * refused al hacer click desde la bandeja de entrada del usuario.
 */
export async function getUnsubscribeUrl(email: string): Promise<string> {
  const token = await createUnsubscribeToken(email);
  const appUrl = resolveAppBaseUrl();
  return `${appUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
}

function resolveAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit && /^https?:\/\//.test(explicit)) return explicit.replace(/\/$/, "");
  const prodUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prodUrl) return `https://${prodUrl.replace(/\/$/, "")}`;
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}
