/**
 * Validación de IBAN (International Bank Account Number).
 *
 * Implementa el algoritmo oficial ISO 13616 / ECBS:
 *   1. Eliminar espacios y pasar a mayúsculas.
 *   2. Comprobar longitud válida por país (España = 24).
 *   3. Mover los 4 primeros caracteres al final.
 *   4. Sustituir letras por números (A=10, B=11, …, Z=35).
 *   5. Calcular MOD 97 — debe ser 1.
 *
 * Uso en el sistema de devoluciones (RMA):
 *   Toda devolución se reembolsa POR TRANSFERENCIA (regla de negocio
 *   obligatoria). El IBAN del cliente debe validarse antes de guardarse
 *   en el ReturnRequest para evitar errores al procesar el reembolso.
 */

// Longitudes válidas por país ISO 3166-1 alpha-2.
// Fuente: registro oficial SWIFT IBAN (subset europeo más común).
const IBAN_LENGTH_BY_COUNTRY: Record<string, number> = {
  ES: 24, // España
  FR: 27, // Francia
  DE: 22, // Alemania
  IT: 27, // Italia
  PT: 25, // Portugal
  NL: 18, // Países Bajos
  BE: 16, // Bélgica
  AT: 20, // Austria
  IE: 22, // Irlanda
  LU: 20, // Luxemburgo
  FI: 18, // Finlandia
  GR: 27, // Grecia
  CY: 28, // Chipre
  MT: 31, // Malta
  SK: 24, // Eslovaquia
  SI: 19, // Eslovenia
  EE: 20, // Estonia
  LV: 21, // Letonia
  LT: 20, // Lituania
  PL: 28, // Polonia
  CZ: 24, // República Checa
  HU: 28, // Hungría
  RO: 24, // Rumanía
  BG: 22, // Bulgaria
  HR: 21, // Croacia
  DK: 18, // Dinamarca
  SE: 24, // Suecia
  NO: 15, // Noruega
  CH: 21, // Suiza
  GB: 22, // Reino Unido
  AD: 24, // Andorra
  MC: 27, // Mónaco
  SM: 27, // San Marino
  VA: 22, // Vaticano
};

export interface IbanValidationResult {
  valid: boolean;
  /** IBAN en formato canónico (sin espacios, mayúsculas) si es válido */
  normalized?: string;
  /** IBAN formateado para mostrar (grupos de 4 separados por espacios) */
  formatted?: string;
  /** Código ISO del país detectado */
  countryCode?: string;
  error?: string;
}

/**
 * Valida un IBAN. Devuelve formato canónico + versión formateada para mostrar.
 *
 * Acepta espacios y minúsculas en la entrada; siempre normaliza.
 */
export function validateIban(input: string): IbanValidationResult {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "IBAN vacío" };
  }

  // 1. Normalizar: quitar espacios y pasar a mayúsculas.
  const normalized = input.replace(/\s+/g, "").toUpperCase();

  // 2. Estructura básica: 2 letras país + 2 dígitos control + hasta 30 alfanuméricos.
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(normalized)) {
    return {
      valid: false,
      error:
        "Formato IBAN no válido. Debe empezar por 2 letras del país y 2 dígitos de control.",
    };
  }

  const countryCode = normalized.slice(0, 2);
  const expectedLength = IBAN_LENGTH_BY_COUNTRY[countryCode];

  if (!expectedLength) {
    return {
      valid: false,
      error: `País "${countryCode}" no soportado para IBAN.`,
      countryCode,
    };
  }

  if (normalized.length !== expectedLength) {
    return {
      valid: false,
      error: `Longitud incorrecta para ${countryCode}: esperados ${expectedLength} caracteres, recibidos ${normalized.length}.`,
      countryCode,
    };
  }

  // 3. Mover los 4 primeros al final.
  const rearranged = normalized.slice(4) + normalized.slice(0, 4);

  // 4. Sustituir letras por números (A=10 … Z=35).
  let numericString = "";
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    if (code >= 48 && code <= 57) {
      // 0-9
      numericString += ch;
    } else if (code >= 65 && code <= 90) {
      // A-Z → 10-35
      numericString += (code - 55).toString();
    } else {
      return {
        valid: false,
        error: `Carácter inesperado en IBAN: "${ch}"`,
        countryCode,
      };
    }
  }

  // 5. MOD 97 por bloques (el número es demasiado grande para BigInt en
  //    entornos antiguos, aunque aquí sobra; usamos el método estándar
  //    de chunks de 9 dígitos por compatibilidad).
  let remainder = 0;
  for (let i = 0; i < numericString.length; i += 7) {
    const chunk = remainder.toString() + numericString.slice(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }

  if (remainder !== 1) {
    return {
      valid: false,
      error: "Dígitos de control del IBAN incorrectos.",
      countryCode,
    };
  }

  return {
    valid: true,
    normalized,
    formatted: formatIbanForDisplay(normalized),
    countryCode,
  };
}

/**
 * Formatea un IBAN canónico (sin espacios) en grupos de 4 para mostrar.
 * Ejemplo: "ES9121000418450200051332" → "ES91 2100 0418 4502 0005 1332"
 */
export function formatIbanForDisplay(normalized: string): string {
  return normalized.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Enmascara un IBAN para mostrar en logs / UI de admin sin exponer
 * los dígitos intermedios completos.
 * Ejemplo: "ES9121000418450200051332" → "ES91 •••• •••• •••• •••• 1332"
 */
export function maskIban(normalized: string): string {
  if (!normalized || normalized.length < 8) return "••••";
  const head = normalized.slice(0, 4);
  const tail = normalized.slice(-4);
  const maskedMiddle = normalized
    .slice(4, -4)
    .replace(/./g, "•")
    .replace(/(.{4})/g, "$1 ")
    .trim();
  return `${head} ${maskedMiddle} ${tail}`;
}
