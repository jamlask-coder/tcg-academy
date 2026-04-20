// productIdentifier/candidateToDraft.ts
// Convierte un ProductCandidate (resultado del buscador fusionado) en un
// ProductDraft completo listo para prellenar el ProductForm.
//
// Reglas:
//   - name = `${setName} ${suffix(categoryGuess)}` en inglés canónico.
//   - slug = slugify(name).
//   - tags automáticas: set:<id>, juego, categoría.
//   - price/wholesalePrice/storePrice vienen de priceHint por (game, category).
//   - images = las "suggested" del candidato (ya priorizadas: logos primero).

import { slugify } from "@/components/admin/ProductForm";
import { suggestPrice } from "./priceHint";
import type {
  ConfidenceMap,
  ProductCandidate,
  ProductDraft,
} from "./types";

const CATEGORY_SUFFIX: Record<string, Record<string, string>> = {
  magic: {
    "booster-box": "Play Booster Display",
    sobres: "Play Booster Pack",
    bundles: "Bundle",
    commander: "Commander Deck",
    "secret-lair": "Secret Lair Drop",
    starter: "Starter Deck",
  },
  pokemon: {
    "booster-box": "Booster Display",
    sobres: "Booster Pack",
    etb: "Elite Trainer Box",
    tins: "Tin",
    blisters: "Blister",
    bundles: "Bundle",
  },
  yugioh: {
    "booster-box": "Booster Box",
    sobres: "Booster Pack",
    "structure-decks": "Structure Deck",
    tins: "Mega Tin",
  },
};

function buildName(candidate: ProductCandidate): string {
  const byGame = CATEGORY_SUFFIX[candidate.game];
  const cat = candidate.categoryGuess;
  if (byGame && cat && byGame[cat]) {
    return `${candidate.setName} ${byGame[cat]}`;
  }
  // Sin sufijo conocido → devolvemos sólo el nombre del set.
  return candidate.setName;
}

function buildDescription(candidate: ProductCandidate): string {
  const pieces: string[] = [];
  pieces.push(`Set oficial: ${candidate.setName}.`);
  if (candidate.cardCount) {
    pieces.push(`Colección de ${candidate.cardCount} cartas.`);
  }
  if (candidate.releasedAt) {
    pieces.push(`Lanzamiento: ${candidate.releasedAt}.`);
  }
  pieces.push(
    `Datos verificados con ${candidate.sources.join(", ")}.`,
  );
  return pieces.join(" ");
}

function buildTags(candidate: ProductCandidate): string[] {
  const tags: string[] = [];
  if (candidate.setId) tags.push(`set:${candidate.setId.toLowerCase()}`);
  if (candidate.game) tags.push(candidate.game);
  if (candidate.categoryGuess) tags.push(candidate.categoryGuess);
  for (const s of candidate.sources) tags.push(`src:${s}`);
  return Array.from(new Set(tags));
}

export interface CandidateToDraftResult {
  draft: ProductDraft;
  confidence: ConfidenceMap;
}

export function candidateToDraft(
  candidate: ProductCandidate,
  /** Imágenes finales elegidas por el admin (p. ej. tras eliminar fondo). */
  overrideImages?: string[],
): CandidateToDraftResult {
  const name = buildName(candidate);
  const slug = slugify(name);
  const game = candidate.game;
  const category = candidate.categoryGuess ?? "";
  const description = buildDescription(candidate);
  const tags = buildTags(candidate);
  const images = overrideImages ?? candidate.suggestedImages;

  const priceSug = suggestPrice(game, category || undefined);

  const draft: ProductDraft = {
    name,
    slug,
    description,
    game,
    category,
    language: "",
    price: priceSug?.price ?? 0,
    wholesalePrice: priceSug?.wholesalePrice ?? 0,
    storePrice: priceSug?.storePrice ?? 0,
    comparePrice: undefined,
    costPrice: undefined,
    inStock: true,
    isNew: true,
    tags,
    images,
  };

  const confidence: ConfidenceMap = {
    name: { confidence: "high", source: `catalog:${candidate.sources[0]}` },
    slug: { confidence: "high", source: "derived:slug(name)" },
    game: { confidence: "high", source: "catalog" },
    description: { confidence: "medium", source: "auto-generated" },
    tags: { confidence: "medium", source: "auto-generated" },
    images: {
      confidence: candidate.suggestedImages.length > 0 ? "medium" : "empty",
      source: "catalog:logo",
      note: "Son logos de set — sustituye por fotos del producto real si las tienes",
    },
  };
  if (category) {
    confidence.category = { confidence: "medium", source: "query:keyword" };
  }
  if (priceSug) {
    const hint = {
      confidence: priceSug.confidence,
      source: `priceHint:${priceSug.source}`,
      note: "Estimado — revisa vs Cardmarket/competencia",
    };
    confidence.price = hint;
    confidence.wholesalePrice = hint;
    confidence.storePrice = hint;
  }

  return { draft, confidence };
}
