/**
 * Validación de NIF / NIE / CIF españoles (Art. 6.1.d RD 1619/2012).
 *
 * Tipos soportados:
 *  - DNI: 8 dígitos + letra control (mod-23)
 *  - NIE: [XYZ] + 7 dígitos + letra control (mod-23)
 *  - CIF: letra + 7 dígitos + dígito/letra control (algoritmo CIF)
 *
 * Esta es la ÚNICA fuente de verdad para validar identificadores fiscales.
 * Todos los puntos de entrada (checkout, perfil, API) deben usar `validateSpanishNIF`.
 */

export type NifType = "DNI" | "NIE" | "CIF" | "OTHER";

export interface NifValidationResult {
  valid: boolean;
  type: NifType;
  normalized: string; // Mayúsculas, sin espacios ni guiones
  error?: string;
}

const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

/** Normaliza: mayúsculas, sin espacios, guiones ni puntos */
export function normalizeNIF(raw: string): string {
  return (raw ?? "")
    .toString()
    .toUpperCase()
    .replace(/[\s.\-]/g, "")
    .trim();
}

/** Validación DNI: 8 dígitos + letra mod-23 */
function validateDNI(nif: string): NifValidationResult {
  if (!/^[0-9]{8}[A-Z]$/.test(nif)) {
    return {
      valid: false,
      type: "DNI",
      normalized: nif,
      error: "Formato DNI inválido (ej: 12345678A)",
    };
  }
  const num = parseInt(nif.slice(0, 8), 10);
  const expected = DNI_LETTERS[num % 23];
  if (nif[8] !== expected) {
    // Seguridad: NO revelamos cuál es la letra correcta (evita brute-force de DNI ajeno).
    return {
      valid: false,
      type: "DNI",
      normalized: nif,
      error: "DNI inválido: revisa el número y la letra de control",
    };
  }
  return { valid: true, type: "DNI", normalized: nif };
}

/** Validación NIE: X/Y/Z + 7 dígitos + letra mod-23 (X=0, Y=1, Z=2) */
function validateNIE(nif: string): NifValidationResult {
  if (!/^[XYZ][0-9]{7}[A-Z]$/.test(nif)) {
    return {
      valid: false,
      type: "NIE",
      normalized: nif,
      error: "Formato NIE inválido (ej: X1234567L)",
    };
  }
  const prefixMap: Record<string, string> = { X: "0", Y: "1", Z: "2" };
  const num = parseInt(prefixMap[nif[0]] + nif.slice(1, 8), 10);
  const expected = DNI_LETTERS[num % 23];
  if (nif[8] !== expected) {
    // Seguridad: NO revelamos la letra correcta.
    return {
      valid: false,
      type: "NIE",
      normalized: nif,
      error: "NIE inválido: revisa el número y la letra de control",
    };
  }
  return { valid: true, type: "NIE", normalized: nif };
}

/** Validación CIF: [ABCDEFGHJKLMNPQRSUVW] + 7 dígitos + dígito/letra control */
function validateCIF(nif: string): NifValidationResult {
  if (!/^[ABCDEFGHJKLMNPQRSUVW][0-9]{7}[0-9A-J]$/.test(nif)) {
    return {
      valid: false,
      type: "CIF",
      normalized: nif,
      error: "Formato CIF inválido (ej: A12345678)",
    };
  }
  const digits = nif.slice(1, 8);
  let evenSum = 0;
  let oddSum = 0;
  for (let i = 0; i < 7; i++) {
    const d = parseInt(digits[i], 10);
    if (i % 2 === 0) {
      // Posiciones impares (1, 3, 5, 7) — index par desde 0
      const doubled = d * 2;
      oddSum += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      evenSum += d;
    }
  }
  const total = evenSum + oddSum;
  const controlDigit = (10 - (total % 10)) % 10;
  const controlLetter = "JABCDEFGHI"[controlDigit];
  const provided = nif[8];

  // Algunas organizaciones usan letra, otras dígito
  const firstChar = nif[0];
  const requiresLetter = "PQRSNW".includes(firstChar);
  const requiresDigit = "ABEH".includes(firstChar);

  if (requiresLetter && provided !== controlLetter) {
    return {
      valid: false,
      type: "CIF",
      normalized: nif,
      error: "CIF inválido: revisa el número y el carácter de control",
    };
  }
  if (requiresDigit && provided !== String(controlDigit)) {
    return {
      valid: false,
      type: "CIF",
      normalized: nif,
      error: "CIF inválido: revisa el número y el carácter de control",
    };
  }
  // Casos mixtos (CDGFJUV): acepta ambos
  if (
    !requiresLetter &&
    !requiresDigit &&
    provided !== controlLetter &&
    provided !== String(controlDigit)
  ) {
    return {
      valid: false,
      type: "CIF",
      normalized: nif,
      error: "CIF inválido: revisa el número y el carácter de control",
    };
  }
  return { valid: true, type: "CIF", normalized: nif };
}

/**
 * Valida un identificador fiscal español (DNI/NIE/CIF).
 * Devuelve { valid, type, normalized, error? }.
 */
export function validateSpanishNIF(raw: string): NifValidationResult {
  const nif = normalizeNIF(raw);
  if (!nif) {
    return {
      valid: false,
      type: "OTHER",
      normalized: "",
      error: "NIF/CIF obligatorio",
    };
  }
  if (nif.length !== 9) {
    return {
      valid: false,
      type: "OTHER",
      normalized: nif,
      error: "El NIF/CIF debe tener 9 caracteres",
    };
  }
  const first = nif[0];
  if (/[0-9]/.test(first)) return validateDNI(nif);
  if ("XYZ".includes(first)) return validateNIE(nif);
  if ("ABCDEFGHJKLMNPQRSUVW".includes(first)) return validateCIF(nif);
  return {
    valid: false,
    type: "OTHER",
    normalized: nif,
    error: "NIF/CIF no reconocido",
  };
}

/** Guard rápido — `true` si el NIF es válido */
export function isValidNIF(raw: string | undefined | null): boolean {
  if (!raw) return false;
  return validateSpanishNIF(raw).valid;
}
