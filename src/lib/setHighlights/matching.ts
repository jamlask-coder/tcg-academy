// matching.ts — fuzzy matching y sinónimos ES→EN para resolver sets por nombre.

export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sinónimos ES → EN para que el autoresolver pueda emparejar nombres en español
 * con los nombres ingleses de los catálogos de Scryfall / pokemontcg.io / etc.
 */
export const ES_TO_EN_SYNONYMS: [RegExp, string][] = [
  // Magic
  [/tortugas ninja/g, "teenage mutant ninja turtles"],
  [/secretos de/g, "secrets of"],
  [/fundaciones/g, "foundations"],
  [/guerra de los hermanos/g, "brothers war"],
  [/cacer[ií]a de medianoche/g, "midnight hunt"],
  [/voto carmes[ií]/g, "crimson vow"],
  [/travesuras de/g, "unfinity"],
  [/trono de eldraine/g, "throne of eldraine"],
  [/ascenso de zendikar/g, "zendikar rising"],
  [/calles de nueva capenna/g, "streets of new capenna"],
  [/kamigawa.*din[aá]stica de ne[oó]n/g, "kamigawa neon dynasty"],
  [/forajidos.*thunder/g, "outlaws of thunder junction"],
  [/forajidos/g, "outlaws"],
  [/dominaria unida/g, "dominaria united"],
  [/phyrexia.*completa/g, "phyrexia all will be one"],
  // Yu-Gi-Oh
  [/ira del abismo/g, "rage of the abyss"],
  [/edad del se[nñ]or/g, "age of overlord"],
  [/pesadilla fantasma/g, "phantom nightmare"],
  [/legado de la destrucci[oó]n/g, "legacy of destruction"],
  [/prohibido infinito/g, "infinite forbidden"],
  // Lorcana
  [/recuerdo del mar|recuerdos del mar|recuerdos? del? mar/g, "azurite sea"],
  [/cielos centelleantes|centelleantes/g, "shimmering skies"],
  [/regreso de ursula|aguas fluidas/g, "ursulas return"],
  [/primer cap[ií]tulo/g, "first chapter"],
  [/ascenso de los anegados|auge de las sombras/g, "rise of the floodborn"],
  [/isla de archazia|archazi/g, "archazias island"],
  [/tintas del destino/g, "into the inklands"],
  // One Piece (ES)
  [/cuatro emperadores|yonk[oó]u/g, "four emperors"],
  [/leyendas del hac[oó]c?/g, "legends of the card game"],
];

export function enrichForMatch(text: string): string {
  let r = normalizeForMatch(text);
  for (const [es, en] of ES_TO_EN_SYNONYMS) {
    if (es.test(r)) r += " " + en;
  }
  return r;
}

/**
 * Emparejamiento fuzzy por tokens. Devuelve el mejor candidato si su ratio de
 * coincidencia supera `minScore`.
 */
export function bestFuzzyMatch<T>(
  candidates: T[],
  getText: (c: T) => string,
  searchText: string,
  minScore = 0.6,
): T | null {
  const searchTokens = new Set(searchText.split(" ").filter((t) => t.length > 2));
  if (searchTokens.size === 0) return null;
  let bestItem: T | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const setTokens = normalizeForMatch(getText(c))
      .split(" ")
      .filter((t) => t.length > 2);
    if (setTokens.length === 0) continue;
    let match = 0;
    for (const t of setTokens) if (searchTokens.has(t)) match++;
    const score = match / setTokens.length;
    if (score > bestScore) {
      bestScore = score;
      bestItem = c;
    }
  }
  return bestScore >= minScore ? bestItem : null;
}
