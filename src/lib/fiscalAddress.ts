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
