/**
 * Cloudflare Turnstile — CAPTCHA server-side verification.
 *
 * Turnstile es gratis, privacy-friendly y no requiere cambios en CSP más allá
 * de permitir `https://challenges.cloudflare.com`. Reemplaza la necesidad de
 * reCAPTCHA y no muestra puzzles molestos a la mayoría de usuarios.
 *
 * Flujo:
 *   1. Cliente: widget muestra el challenge → emite token.
 *   2. Cliente: envía token junto al form al servidor.
 *   3. Servidor: llama `verifyTurnstileToken(token, ip)` antes de crear la cuenta.
 *
 * Modo preparado (local / sin claves): si no hay `TURNSTILE_SECRET_KEY` en env,
 * `verifyTurnstileToken` devuelve `{ ok: true, skipped: true }` para que el
 * desarrollo local no se rompa. En producción (server mode) las claves son
 * obligatorias.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileVerifyResult {
  ok: boolean;
  /** true cuando no hay secret configurado (dev local). */
  skipped?: boolean;
  /** Códigos de error devueltos por Cloudflare, útil para logs. */
  errorCodes?: string[];
  /** Hostname del challenge (sirve para detectar uso en dominios ajenos). */
  hostname?: string;
}

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Verifica un token Turnstile contra los servidores de Cloudflare.
 * Devuelve ok=true si el token es válido, o si la verificación está
 * desactivada (sin secret) — en ese caso marca `skipped: true`.
 *
 * Nunca lanza — devuelve `ok: false` con errorCodes en caso de fallo de red
 * o token inválido. Deja al caller decidir cómo reaccionar.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  ip?: string,
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: true, skipped: true };
  }
  if (!token || typeof token !== "string" || token.length < 10) {
    return { ok: false, errorCodes: ["missing-input-response"] };
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (ip) body.set("remoteip", ip);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });
    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
      hostname?: string;
    };
    return {
      ok: Boolean(data.success),
      errorCodes: data["error-codes"],
      hostname: data.hostname,
    };
  } catch (err) {
    return {
      ok: false,
      errorCodes: [
        err instanceof Error ? `network-error:${err.message}` : "network-error",
      ],
    };
  }
}
