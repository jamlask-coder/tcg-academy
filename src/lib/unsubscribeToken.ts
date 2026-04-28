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
 * plantilla. Usa `NEXT_PUBLIC_APP_URL` (mismo patrón que el resto del código).
 */
export async function getUnsubscribeUrl(email: string): Promise<string> {
  const token = await createUnsubscribeToken(email);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
}
