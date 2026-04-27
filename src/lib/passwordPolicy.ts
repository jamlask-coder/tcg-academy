/**
 * Política de contraseñas — SSOT por rol.
 *
 * Reglas decididas con el dueño del producto:
 *   - **admin**: contraseña fuerte obligatoria. Mínimo 12 caracteres con al
 *     menos una mayúscula, una minúscula, un dígito y un carácter especial.
 *     Bloquea ataques de fuerza bruta + diccionario incluso si la cookie
 *     httpOnly se filtrase y la contraseña fuese el último escollo.
 *   - **cliente / mayorista / tienda**: mínimo 6 caracteres, sin más reglas.
 *     Decisión consciente del dueño: priorizar usabilidad para el público
 *     general; el admin tiene custodia de los datos sensibles.
 *
 * Esta función se usa **idéntica** en cliente y servidor para que la UI
 * muestre el mismo error que el backend devuelve. El server siempre re-valida
 * (un atacante puede saltarse el form) — el cliente es solo cortesía.
 */

export type AccountRole = "cliente" | "mayorista" | "tienda" | "admin";

export interface PasswordRule {
  /** Longitud mínima total de la contraseña. */
  minLength: number;
  /** Si exige al menos una letra mayúscula `[A-Z]`. */
  requireUppercase: boolean;
  /** Si exige al menos una letra minúscula `[a-z]`. */
  requireLowercase: boolean;
  /** Si exige al menos un dígito `[0-9]`. */
  requireDigit: boolean;
  /** Si exige al menos un carácter NO alfanumérico (especial). */
  requireSpecial: boolean;
}

const ADMIN_RULE: PasswordRule = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
};

const STANDARD_RULE: PasswordRule = {
  minLength: 6,
  requireUppercase: false,
  requireLowercase: false,
  requireDigit: false,
  requireSpecial: false,
};

/**
 * Devuelve las reglas que debe cumplir una contraseña para el rol dado.
 * Útil para pintar checklists de requisitos en el formulario.
 */
export function getPasswordRule(role: AccountRole | string | undefined): PasswordRule {
  return role === "admin" ? ADMIN_RULE : STANDARD_RULE;
}

export interface PasswordValidationResult {
  ok: boolean;
  /** Mensaje listo para mostrar al usuario en español. Solo presente si !ok. */
  error?: string;
  /** Lista de requisitos no cumplidos (útil para UI granular). */
  failed?: Array<keyof PasswordRule | "minLength">;
}

/**
 * Valida una contraseña contra la política del rol.
 *
 * Importante: no aplica límite máximo aquí — eso vive en los schemas Zod
 * (max 200) para evitar payloads grandes; aquí solo nos preocupa fortaleza.
 */
export function validatePasswordForRole(
  password: string,
  role: AccountRole | string | undefined,
): PasswordValidationResult {
  const rule = getPasswordRule(role);
  const failed: Array<keyof PasswordRule | "minLength"> = [];

  if (typeof password !== "string" || password.length < rule.minLength) {
    failed.push("minLength");
  }
  if (rule.requireUppercase && !/[A-Z]/.test(password)) failed.push("requireUppercase");
  if (rule.requireLowercase && !/[a-z]/.test(password)) failed.push("requireLowercase");
  if (rule.requireDigit && !/[0-9]/.test(password)) failed.push("requireDigit");
  if (rule.requireSpecial && !/[^A-Za-z0-9]/.test(password)) failed.push("requireSpecial");

  if (failed.length === 0) return { ok: true };

  // Mensaje único combinando todos los fallos. Para admin ofrecemos el
  // texto exhaustivo; para el resto solo es la longitud (única regla).
  if (role === "admin") {
    return {
      ok: false,
      failed,
      error:
        `La contraseña de administrador debe tener al menos ${rule.minLength} caracteres ` +
        "e incluir mayúscula, minúscula, número y carácter especial (ej. *).",
    };
  }
  return {
    ok: false,
    failed,
    error: `La contraseña debe tener al menos ${rule.minLength} caracteres.`,
  };
}

/**
 * Versión textual de los requisitos para mostrar como ayuda en el formulario.
 * Devuelve null si el rol no impone más allá del mínimo de longitud trivial.
 */
export function describePasswordRequirements(role: AccountRole | string | undefined): string {
  const rule = getPasswordRule(role);
  if (role === "admin") {
    return (
      `Mínimo ${rule.minLength} caracteres con mayúscula, minúscula, ` +
      "número y carácter especial (ej. * ! @ #)."
    );
  }
  return `Mínimo ${rule.minLength} caracteres.`;
}
