/**
 * Normalización de nombres de producto para mejorar la tasa de match
 * cuando hacemos búsqueda cruzada contra tiendas competidoras.
 *
 * Problema: nuestro producto puede llamarse "[DEMO] Aetherdrift Draft Booster
 * Display (36 sobres)" pero en la web rival figura como "MTG · Aetherdrift
 * Draft Booster Display". Los tokens centrales son estables (Aetherdrift,
 * Draft, Booster, Display) — lo demás es ruido.
 *
 * Estrategia:
 *  1) Quitar prefijos/sufijos inútiles ([DEMO], nombre del juego, etc.).
 *  2) Quitar contenido entre paréntesis (normalmente cantidad: "(36 sobres)").
 *  3) Normalizar separadores (— · | , →) a espacios.
 *  4) Colapsar espacios.
 *  5) Devolver 2-3 variantes por si la primera no encuentra.
 */

const GAME_PREFIXES = [
  "pokemon", "pokémon", "magic", "mtg", "yugioh", "yu-gi-oh!", "yu-gi-oh",
  "one piece", "riftbound", "dragon ball", "digimon", "lorcana", "flesh and blood",
];

const NOISE_TOKENS = [
  "demo", "nuevo", "new", "stock", "reserva", "preventa", "preorder",
  "oferta", "descuento",
];

const SEPARATORS_RE = /[—·|,→•:；;]/g;

/**
 * Limpieza base: lowercase, quita corchetes [DEMO], paréntesis "(36 sobres)",
 * separadores especiales, y colapsa espacios.
 */
function basicClean(raw: string): string {
  let s = raw.toLowerCase();
  // Quitar [corchetes] y su contenido
  s = s.replace(/\[[^\]]*\]/g, " ");
  // Quitar (paréntesis) y su contenido
  s = s.replace(/\([^)]*\)/g, " ");
  // Normalizar separadores
  s = s.replace(SEPARATORS_RE, " ");
  // Quitar caracteres no alfanuméricos (mantener - y letras acentuadas)
  s = s.replace(/[^\p{L}\p{N}\s-]/gu, " ");
  // Colapsar espacios
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Quita un prefijo de juego si el nombre empieza por él.
 * "magic aetherdrift draft booster" → "aetherdrift draft booster"
 */
function stripGamePrefix(s: string): string {
  for (const prefix of GAME_PREFIXES) {
    if (s.startsWith(`${prefix} `)) {
      return s.slice(prefix.length + 1);
    }
  }
  return s;
}

function stripNoise(s: string): string {
  const tokens = s.split(" ");
  return tokens.filter((t) => !NOISE_TOKENS.includes(t)).join(" ");
}

export interface NormalizedName {
  /** Query principal — la más limpia y específica. */
  primary: string;
  /** Variantes de fallback en orden de preferencia. */
  variants: string[];
}

/**
 * Normaliza un nombre de producto a una lista de queries en orden de
 * preferencia. El adapter prueba `primary` primero, y si no hay resultados
 * puede intentar con las `variants` (responsabilidad del orquestador).
 */
export function normalizeProductName(raw: string): NormalizedName {
  const cleaned = stripNoise(stripGamePrefix(basicClean(raw)));
  const tokens = cleaned.split(" ").filter(Boolean);

  // Variante core: primeros 3-5 tokens (normalmente identifican el producto)
  const core3 = tokens.slice(0, 3).join(" ");
  const core5 = tokens.slice(0, 5).join(" ");

  const variants: string[] = [];
  const push = (v: string) => {
    if (v && !variants.includes(v) && v !== cleaned) variants.push(v);
  };

  push(core5);
  push(core3);
  // Última alternativa: solo el nombre "del set" (primer token distintivo)
  if (tokens.length > 0) push(tokens[0]);

  return {
    primary: cleaned,
    variants,
  };
}

/**
 * Heurística: decide si un título remoto es un match razonable con lo que
 * buscamos. Compara tokens comunes (ignora orden y pluralidad básica).
 * Devuelve un score 0..1 — >=0.5 es un match aceptable.
 */
export function matchScore(query: string, remoteTitle: string): number {
  const q = basicClean(query).split(" ").filter((t) => t.length > 2);
  const r = new Set(basicClean(remoteTitle).split(" ").filter((t) => t.length > 2));
  if (q.length === 0) return 0;
  let hits = 0;
  for (const tok of q) if (r.has(tok)) hits++;
  return hits / q.length;
}
