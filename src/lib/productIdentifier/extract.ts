// productIdentifier/extract.ts
// Extrae pistas estructuradas del texto OCR + filenames de las imágenes.
//
// Reglas de diseño:
//   - Funciones puras y testeables (sin fetch, sin window).
//   - Ordenar patrones de más específicos a más genéricos (primer match gana).
//   - Nunca lanzar: siempre devolver Clues válidas aunque vacías.

import { normalizeForMatch } from "@/lib/setHighlights/matching";
import type { Clues } from "./types";

// ─── Keyword maps ─────────────────────────────────────────────────────────────

/**
 * Regex de juego. El orden importa: "yu-gi-oh" antes de "magic" porque algunos
 * productos Yu-Gi-Oh llevan "Magic" en nombres de cartas internas.
 */
const GAME_KEYWORDS: Array<[RegExp, string]> = [
  [/pok[eé]?mon|ポケモン|포켓몬/i, "pokemon"],
  [/yu-?gi-?oh|遊戯王|유희왕/i, "yugioh"],
  [/magic:? the gathering|\bmtg\b|wizards of the coast/i, "magic"],
  [/one piece card game|\bop-?\d{1,2}\b|ワンピースカード/i, "one-piece"],
  [/dragon ball (super|fusion)/i, "dragon-ball"],
  [/disney lorcana|\blorcana\b/i, "lorcana"],
  [/\briftbound\b/i, "riftbound"],
  [/\bdigimon\b/i, "digimon"],
  [/\bnaruto\b.*card|konoha shid[oō]/i, "naruto"],
  [/\btopps\b/i, "topps"],
  [/\bpanini\b/i, "panini"],
];

/**
 * Regex de categoría. "booster-box" incluye variantes ES/EN/FR/JP.
 * El orden resuelve ambigüedad: "booster pack" va después de "booster box".
 */
const CATEGORY_KEYWORDS: Array<[RegExp, string]> = [
  [
    /booster box|booster display|display box|caja de sobres|caja d[eé] booster|ブースターボックス|booster vitrine/i,
    "booster-box",
  ],
  [/elite trainer box|\betb\b|caja de entrenador/i, "etb"],
  [/structure deck|deck estructura/i, "structure-decks"],
  [/commander deck|mazo de comandante/i, "commander"],
  [/secret lair/i, "secret-lair"],
  [/starter deck|mazo de inicio|baraja de inicio|deck de inicio/i, "starter"],
  [/bundle|paquete gift/i, "bundles"],
  [/blister\b/i, "blisters"],
  [/\btin\b|\blata\b|caja met[aá]lica/i, "tins"],
  [/booster pack|sobre suelto|sobre\b|pack de sobres|ブースターパック/i, "sobres"],
  [/gift set/i, "gift-sets"],
  [/prize card|carta de torneo/i, "prize-cards"],
];

/**
 * Idioma: primero patrones CJK (más fiables que keywords), luego latinos.
 */
const LANGUAGE_KEYWORDS: Array<[RegExp, string]> = [
  [/[\u3040-\u30ff]/, "JP"], // hiragana + katakana
  [/[\u4e00-\u9fff]/, "JP"], // kanji CJK (también podría ser ZH; discriminamos abajo)
  [/[\uac00-\ud7af]/, "KO"], // hangul
  [/\bespañol\b|cartas en español|edición española/i, "ES"],
  [/\bfrançais\b|édition française|cartes françaises/i, "FR"],
  [/\bdeutsch\b|deutsche ausgabe|\bkarten\b/i, "DE"],
  [/\bitaliano\b|edizione italiana|carte italiane/i, "IT"],
  [/\bportugu[eê]s\b|edição portuguesa/i, "PT"],
  [/\bchinese\b|简体中文|繁體中文/i, "ZH"],
  [/\benglish\b|english edition|trading card game/i, "EN"],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function firstMatch<T>(
  text: string,
  pairs: Array<[RegExp, T]>,
): T | undefined {
  for (const [re, value] of pairs) {
    if (re.test(text)) return value;
  }
  return undefined;
}

function extractPacksPerBox(text: string): number | undefined {
  // "36 Boosters", "24 Booster Packs", "36 Sobres", "36 Packs"
  const m = /(\d{1,3})\s*(?:booster|sobre|pack)s?/i.exec(text);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 3 && n <= 72) return n;
  }
  return undefined;
}

function extractCardsPerPack(text: string): number | undefined {
  // "15 Cards", "10 Cartas", "5 cards per pack"
  const m = /(\d{1,2})\s*(?:cards?|cartas?|カード)/i.exec(text);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 3 && n <= 30) return n;
  }
  return undefined;
}

/**
 * Palabras comunes en inglés/español de 3-4 letras que aparecen SIEMPRE en
 * las cajas de TCG ("CARD", "GAME", "PACK", etc.) y que colisionarían con
 * los regex de setCode. Se excluyen para evitar falsos positivos.
 */
const SET_CODE_BLOCKLIST = new Set([
  "CARD",
  "CARDS",
  "GAME",
  "PACK",
  "PACKS",
  "BOX",
  "BOXES",
  "TCG",
  "NEW",
  "TRADE",
  "TRADING",
  "PLAY",
  "BOOK",
  "LIST",
  "MINT",
  "FOIL",
  "EDITION",
  "BOOSTER",
  "DECK",
  "TIN",
  "TINS",
  "BLISTER",
  "BUNDLE",
  "MTG",
  "TM",
  "ART",
  "BOX",
  "THE",
  "AND",
  "OF",
  "FOR",
]);

function extractSetCode(text: string, game: string | undefined): string | undefined {
  if (!game) return undefined;

  // Magic: 3-4 letras mayúsculas aisladas (p.ej. "BLB", "DSK", "OTJ").
  // Preferimos el último match que no esté en blocklist (en cajas el código
  // suele estar en la parte inferior, después del título).
  if (game === "magic") {
    const matches = text.match(/\b[A-Z]{3,4}\b/g) ?? [];
    const candidates = matches.filter((m) => !SET_CODE_BLOCKLIST.has(m));
    if (candidates.length > 0) return candidates[candidates.length - 1].toLowerCase();
  }
  // Pokemon: "SV8", "SV10", "SWSH12", con opcional ptX
  if (game === "pokemon") {
    const m = /\b(sv\d{1,2}(?:pt\d)?|swsh\d{1,2}(?:pt\d)?)\b/i.exec(text);
    if (m) return m[1].toLowerCase();
  }
  // One Piece: "OP-01", "OP-11"
  if (game === "one-piece") {
    const m = /\b(op-?\d{1,2})\b/i.exec(text);
    if (m) return m[1].toLowerCase();
  }
  // Yu-Gi-Oh: 4 letras mayúsculas (ej. "ROTA", "AGOV", "LEDE").
  if (game === "yugioh") {
    const matches = text.match(/\b[A-Z]{4}\b/g) ?? [];
    const candidates = matches.filter((m) => !SET_CODE_BLOCKLIST.has(m));
    if (candidates.length > 0) return candidates[candidates.length - 1].toLowerCase();
  }
  return undefined;
}

/**
 * Extrae las líneas OCR más prometedoras como fragmentos de nombre.
 * Heurística: líneas de 3-60 chars con al menos una letra, ordenadas por
 * longitud descendente (el OCR suele leer mejor las líneas grandes).
 */
function extractNameFragments(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3 && l.length <= 80)
    .filter((l) => /[a-zá-úñA-ZÁ-ÚÑ]/.test(l))
    // Descarta ruido común: "TM", "®", precios, números sueltos
    .filter((l) => !/^[\d\s€$.,%-]+$/.test(l))
    .filter((l) => !/^(tm|®|©|\(tm\))$/i.test(l));

  // Dedup y orden por longitud descendente (los titulares suelen ser más largos)
  const uniq = Array.from(new Set(lines));
  uniq.sort((a, b) => b.length - a.length);
  return uniq.slice(0, 8);
}

/**
 * Parsea un filename tipo "bloomburrow-booster-box.jpg" → "bloomburrow booster box".
 * Los usuarios que suben imágenes organizadas suelen tener filenames muy informativos.
 */
function filenameToText(filenames: string[]): string {
  return filenames
    .map((f) =>
      f
        .replace(/\.[a-z0-9]{2,5}$/i, "") // quita extensión
        .replace(/[_\-.]+/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .join(" | ");
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Punto de entrada. Devuelve Clues — nunca lanza.
 */
export function extractClues(ocrText: string, filenames: string[] = []): Clues {
  const filenameText = filenameToText(filenames);
  const combined = `${ocrText}\n${filenameText}`;
  const norm = normalizeForMatch(combined);

  const game = firstMatch(combined, GAME_KEYWORDS);
  const category = firstMatch(combined, CATEGORY_KEYWORDS);
  const language = firstMatch(combined, LANGUAGE_KEYWORDS);
  const packsPerBox = extractPacksPerBox(combined);
  const cardsPerPack = extractCardsPerPack(combined);
  const setCode = extractSetCode(combined, game);
  const nameFragments = extractNameFragments(ocrText);

  // Keywords normalizadas para el fuzzy matcher aguas abajo.
  const keywords = norm
    .split(" ")
    .filter((t) => t.length > 2)
    // Descartamos tokens puramente numéricos y genéricos muy comunes
    .filter((t) => !/^\d+$/.test(t))
    .filter(
      (t) =>
        !new Set([
          "the",
          "and",
          "card",
          "cards",
          "game",
          "trading",
          "booster",
          "pack",
          "box",
          "sobre",
          "sobres",
          "caja",
          "for",
          "with",
          "per",
        ]).has(t),
    );

  return {
    rawText: ocrText,
    filenames,
    game,
    category,
    language,
    packsPerBox,
    cardsPerPack,
    setCode,
    nameFragments,
    keywords: Array.from(new Set(keywords)),
  };
}
