/**
 * Normaliza una cadena para búsquedas accent-insensitive.
 *
 *   normalizeForSearch("Pokémon")    → "pokemon"
 *   normalizeForSearch("CORAZÓN")    → "corazon"
 *   normalizeForSearch("  niño ")    → "nino"
 *
 * Reglas:
 *   - lowercase
 *   - quita diacríticos (NFD + strip combining marks U+0300..U+036F)
 *   - trim externo
 *
 * Pensado para filtros de UI (búsqueda libre del usuario), NO para
 * comparaciones canónicas de identificadores (slugs, NIFs…). Esos casos
 * deben usar utilidades específicas que conserven su forma normalizada
 * estable (ej. `slugifyName` en userHandle, `normalizeNif` en validations).
 */
export function normalizeForSearch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Helper para chequear si `haystack` contiene `needle` ignorando
 * diacríticos y mayúsculas. Si `needle` está vacía tras normalizar,
 * devuelve true (criterio "sin filtro = todo pasa", consistente con
 * el comportamiento de `.includes("")`).
 */
export function searchIncludes(haystack: string, needle: string): boolean {
  const n = normalizeForSearch(needle);
  if (!n) return true;
  return normalizeForSearch(haystack).includes(n);
}
