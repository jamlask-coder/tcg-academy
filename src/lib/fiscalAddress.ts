/**
 * Parseo robusto de la dirección fiscal almacenada en SITE_CONFIG.address.
 *
 * El problema: `SITE_CONFIG.address` es un string libre como
 * "Av. del Norte 40, 2ª planta, puerta B, 03710 Calpe, Alicante"
 * que tiene un número VARIABLE de segmentos separados por coma:
 *   - 3 partes (calle, cp+ciudad, provincia) — formato mínimo
 *   - 5+ partes cuando hay planta/puerta/portal
 *
 * Hacer `parts[0]` / `parts[1]` es frágil y rompe con la dirección actual,
 * que truncaría "2ª planta, puerta B" en la línea de ciudad y dejaría
 * el código postal en provincia.
 *
 * Esta función localiza el segmento con los 5 dígitos del CP por regex
 * y parte por ahí — todo lo que está antes es calle completa, todo lo que
 * está después (incluido el CP) es línea de ciudad/provincia.
 *
 * Fuente única — si cambia el formato de la dirección, se cambia aquí.
 */

import { SITE_CONFIG } from "@/config/siteConfig";

export interface ParsedFiscalAddress {
  /** Calle completa (puede incluir nº, piso, puerta) */
  street: string;
  /** Código postal 5 dígitos, vacío si no se detecta */
  postalCode: string;
  /** Ciudad */
  city: string;
  /** Provincia */
  province: string;
  /** Línea "CP CIUDAD, PROVINCIA" tal como suele aparecer en factura */
  cityLine: string;
  /** País — por ahora siempre España hasta que lo añadamos al config */
  country: string;
  /** ISO 3166-1 alpha-2 */
  countryCode: string;
}

/**
 * Parsea una dirección libre en segmentos fiscales.
 * Si no se encuentra el CP, devuelve lo mejor que pueda inferir.
 */
export function parseFiscalAddress(raw: string): ParsedFiscalAddress {
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  const cpIndex = parts.findIndex((p) => /^\d{5}\b/.test(p));

  let street = "";
  let postalCode = "";
  let city = "";
  let province = "";
  let cityLine = "";

  if (cpIndex >= 0) {
    // Todo lo anterior al CP es la calle completa
    street = parts.slice(0, cpIndex).join(", ");
    const cpPart = parts[cpIndex] ?? "";
    province = parts.slice(cpIndex + 1).join(", ");
    const m = cpPart.match(/^(\d{5})\s+(.+)$/);
    if (m) {
      postalCode = m[1];
      city = m[2];
    } else {
      postalCode = cpPart.slice(0, 5);
      city = cpPart.slice(5).trim();
    }
    cityLine = province ? `${cpPart}, ${province}` : cpPart;
  } else {
    // Fallback: sin CP detectable — tratar todo tras la primera coma como ciudad
    street = parts[0] ?? raw;
    cityLine = parts.slice(1).join(", ");
    city = cityLine;
  }

  return {
    street,
    postalCode,
    city,
    province,
    cityLine,
    country: "España",
    countryCode: "ES",
  };
}

/**
 * Dirección fiscal parseada del SITE_CONFIG.
 * Se calcula una única vez al cargar el módulo — no hay lectura dinámica.
 */
export function getIssuerAddress(): ParsedFiscalAddress {
  return parseFiscalAddress(SITE_CONFIG.address);
}

/**
 * Abreviaturas postales compactas para la línea de dirección en factura.
 * Transformación puramente presentacional (NO altera lo que almacena el
 * usuario — solo lo que imprime el generador de PDF).
 *
 * Ejemplos:
 *   "Av. del Norte 40, 2ª planta, puerta B"
 *   → "Av. del Norte 40, 2ªPL, PTA B"
 *
 *   "Calle Mayor 12, 3º piso, escalera A, derecha"
 *   → "Calle Mayor 12, 3ºPL, ESC A, DCHA"
 *
 * Reglas conservadoras: solo transformamos palabras completas (con \b).
 * Si el admin ya escribió una abreviatura propia ("2º pl.", "pta"), se
 * respeta tal cual.
 */
export function abbreviateAddressLine(raw: string): string {
  if (!raw) return raw;
  return raw
    // "2ª planta" / "2º planta" / "2 planta" / "planta 2" → "2ªPL" / "PL 2"
    .replace(/(\d+\s*[ºª°]?)\s*planta\b/gi, "$1PL")
    .replace(/\bplanta\b/gi, "PL")
    // "2º piso" → "2ºPL" (tratamos piso como equivalente a planta)
    .replace(/(\d+\s*[ºª°]?)\s*piso\b/gi, "$1PL")
    .replace(/\bpiso\b/gi, "PL")
    // "puerta B" → "PTA B"
    .replace(/\bpuerta\b/gi, "PTA")
    // "escalera A" → "ESC A"
    .replace(/\bescalera\b/gi, "ESC")
    // "derecha" / "izquierda" → "DCHA" / "IZQDA"
    .replace(/\bderecha\b/gi, "DCHA")
    .replace(/\bizquierda\b/gi, "IZQDA")
    // Colapsa dobles espacios que pudieran haber quedado tras reemplazos.
    .replace(/\s{2,}/g, " ")
    .trim();
}
