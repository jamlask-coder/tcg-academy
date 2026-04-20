// productIdentifier/compose.ts
// Combina las pistas extraídas + el match canónico + sugerencias de precio
// en un ProductDraft completo, con un mapa de confianza por campo.

import { slugify } from "@/components/admin/ProductForm";
import type {
  CanonicalMatch,
  Clues,
  ConfidenceMap,
  FieldHint,
  ProductDraft,
} from "./types";
import { suggestPrice } from "./priceHint";

export interface ComposedResult {
  draft: ProductDraft;
  confidence: ConfidenceMap;
}

/**
 * Reconstruye un nombre de producto legible a partir del set match + category.
 *
 * Ejemplo: set="Bloomburrow", category="booster-box" → "Bloomburrow Play Booster Display"
 * Ejemplo: set="Prismatic Evolutions", category="etb" → "Prismatic Evolutions Elite Trainer Box"
 */
function buildProductName(
  canonical: CanonicalMatch | null,
  clues: Clues,
): { name: string; nameSource: string; confidence: FieldHint["confidence"] } {
  const setName = canonical?.setName ?? canonical?.productName;

  // Sufijos por categoría. Magic y Pokemon tienen convenciones específicas.
  const suffix: Record<string, string> = {
    "booster-box":
      clues.game === "magic"
        ? "Play Booster Display"
        : clues.game === "pokemon"
          ? "Booster Display"
          : "Booster Display",
    sobres: "Booster Pack",
    etb: "Elite Trainer Box",
    tins: "Tin",
    bundles: "Bundle",
    commander: "Commander Deck",
    starter: "Starter Deck",
    "structure-decks": "Structure Deck",
    blisters: "Blister",
    "gift-sets": "Gift Set",
    trove: "Illumineer's Trove",
    "secret-lair": "Secret Lair Drop",
  };

  if (setName) {
    const suf = clues.category ? suffix[clues.category] : undefined;
    const name = suf ? `${setName} ${suf}` : setName;
    return {
      name,
      nameSource: `canonical:${canonical?.source ?? "unknown"}`,
      confidence: canonical?.confidence ?? "medium",
    };
  }

  // Fallback: usamos el fragmento OCR más prometedor
  if (clues.nameFragments.length > 0) {
    return {
      name: clues.nameFragments[0],
      nameSource: "ocr:name-fragment",
      confidence: "low",
    };
  }

  return { name: "", nameSource: "none", confidence: "empty" };
}

/**
 * Construye tags útiles automáticamente:
 *   - set code si existe
 *   - idioma en minúsculas (ej. "japones")
 *   - keywords distintivos (mythic, promo, ...)
 */
function buildTags(canonical: CanonicalMatch | null, clues: Clues): string[] {
  const tags: string[] = [];
  if (canonical?.setId) tags.push(`set:${canonical.setId.toLowerCase()}`);
  if (clues.language) {
    const langTag: Record<string, string> = {
      JP: "japones",
      KO: "coreano",
      EN: "ingles",
      ES: "espanol",
      FR: "frances",
      DE: "aleman",
      IT: "italiano",
      PT: "portugues",
      ZH: "chino",
    };
    const t = langTag[clues.language];
    if (t) tags.push(t);
  }
  if (clues.game) tags.push(clues.game);
  if (clues.category) tags.push(clues.category);
  return Array.from(new Set(tags));
}

/**
 * Descripción automática corta. Siempre revisable por el admin.
 */
function buildDescription(
  canonical: CanonicalMatch | null,
  clues: Clues,
): string {
  const pieces: string[] = [];
  if (canonical?.setName) {
    pieces.push(`Set oficial: ${canonical.setName}.`);
  }
  if (clues.packsPerBox) {
    pieces.push(`Contiene ${clues.packsPerBox} sobres.`);
  }
  if (clues.cardsPerPack) {
    pieces.push(`Cada sobre trae ${clues.cardsPerPack} cartas.`);
  }
  if (clues.language) {
    const map: Record<string, string> = {
      JP: "japonés",
      KO: "coreano",
      EN: "inglés",
      ES: "español",
      FR: "francés",
      DE: "alemán",
      IT: "italiano",
      PT: "portugués",
      ZH: "chino",
    };
    const label = map[clues.language];
    if (label) pieces.push(`Edición en ${label}.`);
  }
  return pieces.join(" ");
}

// ─── API ──────────────────────────────────────────────────────────────────────

export function composeDraft(
  clues: Clues,
  canonical: CanonicalMatch | null,
  images: string[],
): ComposedResult {
  const confidence: ConfidenceMap = {};

  // Nombre
  const { name, nameSource, confidence: nameConf } = buildProductName(
    canonical,
    clues,
  );
  if (name) {
    confidence.name = { confidence: nameConf, source: nameSource };
  } else {
    confidence.name = { confidence: "empty", source: "not-found" };
  }

  // Slug — determinista por nombre
  const slug = name ? slugify(name) : "";
  confidence.slug = {
    confidence: name ? nameConf : "empty",
    source: "derived:slug(name)",
  };

  // Juego
  const game = canonical?.game ?? clues.game ?? "";
  if (game) {
    confidence.game = {
      confidence: canonical?.game ? "high" : "medium",
      source: canonical?.game ? "canonical" : "ocr:keyword",
    };
  }

  // Categoría
  const category = clues.category ?? "";
  if (category) {
    confidence.category = {
      confidence: "medium",
      source: "ocr:keyword",
    };
  }

  // Idioma
  const language = clues.language ?? "";
  if (language) {
    confidence.language = {
      confidence: "medium",
      source: "ocr:keyword",
    };
  }

  // Precios
  const priceSug = suggestPrice(game || undefined, category || undefined);
  const price = priceSug?.price ?? 0;
  const wholesalePrice = priceSug?.wholesalePrice ?? 0;
  const storePrice = priceSug?.storePrice ?? 0;
  if (priceSug) {
    const conf: FieldHint = {
      confidence: priceSug.confidence,
      source: `priceHint:${priceSug.source}`,
      note: "Estimado — revisa contra Cardmarket/competencia",
    };
    confidence.price = conf;
    confidence.wholesalePrice = conf;
    confidence.storePrice = conf;
  }

  // Descripción
  const description = buildDescription(canonical, clues);
  if (description) {
    confidence.description = {
      confidence: "medium",
      source: "auto-generated",
    };
  }

  // Tags
  const tags = buildTags(canonical, clues);
  if (tags.length > 0) {
    confidence.tags = { confidence: "medium", source: "auto-generated" };
  }

  // Extras
  const packsPerBox = clues.packsPerBox;
  const cardsPerPack = clues.cardsPerPack;
  if (packsPerBox) {
    confidence.packsPerBox = { confidence: "medium", source: "ocr:regex" };
  }
  if (cardsPerPack) {
    confidence.cardsPerPack = { confidence: "medium", source: "ocr:regex" };
  }

  const draft: ProductDraft = {
    name,
    slug,
    description,
    game,
    category,
    language,
    price,
    wholesalePrice,
    storePrice,
    comparePrice: undefined,
    costPrice: undefined,
    inStock: true,
    isNew: true,
    tags,
    images,
    packsPerBox,
    cardsPerPack,
  };

  return { draft, confidence };
}
