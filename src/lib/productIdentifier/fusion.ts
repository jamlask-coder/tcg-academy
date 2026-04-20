// productIdentifier/fusion.ts
// Fusiona CatalogHits de varias fuentes cuando muy probablemente hablan del
// mismo producto. Clave de fusión: game + setName normalizado.
//
// Ejemplo: scryfall:blb + tcgdex:blb (si lo hubiera) + pokemontcg:blb →
// un único ProductCandidate con todas las imágenes.

import { normalizeForMatch } from "@/lib/setHighlights/matching";
import type { CatalogHit, ProductCandidate } from "./types";
import { scoreMatch } from "./catalog";

function slugifySet(name: string): string {
  return normalizeForMatch(name)
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 60);
}

/**
 * Clave canónica por candidato. Misma clave → mismo producto.
 * Usamos (game + slugSetName) porque los IDs de set difieren entre APIs
 * pero el nombre es bastante consistente (p.ej. "Bloomburrow" en todas).
 */
function candidateKey(hit: CatalogHit): string {
  return `${hit.game}:${slugifySet(hit.setName)}`;
}

/**
 * Prioriza imágenes visualmente útiles para el admin. Orden (menor = mejor):
 *   1. TCGDex logo (PNG con transparencia)
 *   2. pokemontcg logo (set logo oficial)
 *   3. cards.scryfall.io (carta real del set — mejor que silueta)
 *   4. Scryfall art crop
 *   5. ygoprodeck set image
 *   6. Otros logos
 *   7. SVG / símbolos (silueta minimalista — último recurso)
 */
function rankImage(url: string): number {
  if (url.includes("tcgdex") && url.includes("logo")) return 1;
  if (url.includes("pokemontcg") && url.includes("logo")) return 2;
  if (url.includes("cards.scryfall.io") && !url.includes("art_crop")) return 3;
  if (url.includes("art_crop")) return 4;
  if (url.includes("ygoprodeck")) return 5;
  if (url.endsWith(".svg") || url.includes("symbol")) return 7;
  return 6;
}

function sortUniqueImages(images: string[]): string[] {
  const uniq = Array.from(new Set(images.filter(Boolean)));
  return uniq.sort((a, b) => rankImage(a) - rankImage(b));
}

/**
 * Agrupa hits por candidato canónico y calcula score global.
 *
 * El score de un candidato es el MAX score de sus hits + bonus por número de
 * fuentes que coinciden (hasta +0.15 si hay 3 fuentes).
 */
export function fuseHits(
  hits: CatalogHit[],
  query: string,
): ProductCandidate[] {
  const groups = new Map<string, CatalogHit[]>();
  for (const hit of hits) {
    const k = candidateKey(hit);
    const list = groups.get(k) ?? [];
    list.push(hit);
    groups.set(k, list);
  }

  const candidates: ProductCandidate[] = [];
  for (const [key, group] of groups) {
    // Representante: el hit con mejor score vs query
    const scored = group.map((h) => ({ h, score: scoreMatch(query, h.setName) }));
    scored.sort((a, b) => b.score - a.score);
    const rep = scored[0].h;
    const maxScore = scored[0].score;
    const sources = Array.from(new Set(group.map((h) => h.source)));
    const sourceBonus = Math.min(0.15, (sources.length - 1) * 0.075);

    const allImages = group.flatMap((h) => [h.imageUrl, ...(h.extraImages ?? [])])
      .filter((x): x is string => !!x);
    const images = sortUniqueImages(allImages);

    // Sugeridas: las 3 mejor rankeadas (logos primero)
    const suggestedImages = images.slice(0, 3);

    const releasedAt = group
      .map((h) => h.releasedAt)
      .filter((x): x is string => !!x)
      .sort()[0];
    const cardCount = group
      .map((h) => h.cardCount ?? 0)
      .reduce((a, b) => Math.max(a, b), 0);

    candidates.push({
      id: key,
      game: rep.game,
      setId: rep.setId,
      setName: rep.setName,
      categoryGuess: inferCategoryFromQuery(query),
      images,
      suggestedImages,
      releasedAt,
      cardCount: cardCount || undefined,
      sources,
      score: Math.min(1, maxScore + sourceBonus),
      note: group
        .map((h) => `${h.source}${h.note ? `:${h.note}` : ""}`)
        .join(" · "),
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 12);
}

/**
 * Si la query contiene keywords tipo "booster box", "etb", etc., proponemos
 * una categoría por defecto. Ayuda a que el formulario venga con la categoría
 * correcta aunque la API no la dé explícitamente.
 */
function inferCategoryFromQuery(query: string): string | undefined {
  const q = query.toLowerCase();
  if (/booster box|caja de sobres|display/.test(q)) return "booster-box";
  if (/elite trainer|\betb\b/.test(q)) return "etb";
  if (/\betin\b|tins?\b/.test(q)) return "tins";
  if (/bundle/.test(q)) return "bundles";
  if (/commander/.test(q)) return "commander";
  if (/starter|mazo de inicio/.test(q)) return "starter";
  if (/structure deck/.test(q)) return "structure-decks";
  if (/blister/.test(q)) return "blisters";
  if (/sobre|booster pack/.test(q)) return "sobres";
  if (/secret lair/.test(q)) return "secret-lair";
  return undefined;
}
