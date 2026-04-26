/**
 * Admin 2FA TOTP — esqueleto preparado, NO ACTIVADO.
 *
 * Para activarlo más adelante:
 *   1. Instalar `otplib` (compatible Edge: usa @otplib/preset-default).
 *   2. Generar un secret por admin con `authenticator.generateSecret()` y
 *      guardarlo en `User.totpSecret` (cifrado en reposo).
 *   3. En `/admin/cuenta/2fa` mostrar QR para Google Authenticator / Aegis.
 *   4. En `/api/auth` action `login`: si user es admin y tiene totpSecret,
 *      exigir un campo extra `totpCode` y validar con `verifyTotp`.
 *   5. Activar el flag `ADMIN_2FA_REQUIRED=1` en producción.
 *
 * Hasta entonces estas funciones son stubs no-op para que el código compile
 * pero `isAdmin2faEnabled()` siga devolviendo false.
 */

export function isAdmin2faEnabled(): boolean {
  return process.env.ADMIN_2FA_REQUIRED === "1";
}

/**
 * Stub. Cuando se active, debe usar `authenticator.verify({ token, secret })`
 * de otplib y aceptar ±1 ventana (30s) de drift.
 *
 * @returns false siempre mientras el módulo esté en stub.
 */
export function verifyTotp(_secret: string, _code: string): boolean {
  return false;
}

/**
 * Stub. Cuando se active, debe usar `authenticator.generateSecret(32)`
 * (256 bits) y devolver el secret en formato base32 listo para QR.
 */
export function generateTotpSecret(): string {
  throw new Error("2FA TOTP no activado todavía. Ver src/lib/adminTwoFactor.ts");
}
