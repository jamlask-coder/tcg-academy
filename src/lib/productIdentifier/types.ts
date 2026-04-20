// productIdentifier/types.ts
// Tipos públicos del pipeline de identificación automática de productos TCG
// a partir de imágenes. Todos los adapters trabajan con estas formas — no
// deben depender de UI ni de react-hook-form.

/**
 * Draft compatible con ProductFormValues (src/components/admin/ProductForm.tsx)
 * + extras que se persisten en LocalProduct pero no están en el schema del form.
 *
 * Todos los campos son opcionales: el pipeline rellena lo que pueda confirmar
 * con confianza razonable, y deja el resto vacío para que el admin lo escriba.
 */
export interface ProductDraft {
  name: string;
  slug: string;
  description: string;
  game: string;
  category: string;
  language: string;
  price: number;
  wholesalePrice: number;
  storePrice: number;
  costPrice?: number;
  comparePrice?: number;
  inStock: boolean;
  isNew: boolean;
  tags: string[];
  images: string[];
  // Extras (LocalProduct)
  packsPerBox?: number;
  cardsPerPack?: number;
}

/**
 * Nivel de confianza por campo. El UI pinta un badge de color:
 *   high   = resultado confirmado por API canónica (ej. Scryfall devolvió el set)
 *   medium = resultado heurístico sólido (keyword en OCR, fuzzy match 0.6+)
 *   low    = sugerencia frágil, el admin probablemente deba corregir
 *   empty  = no se pudo determinar; queda en blanco
 */
export type ConfidenceLevel = "high" | "medium" | "low" | "empty";

export interface FieldHint {
  confidence: ConfidenceLevel;
  source: string; // "scryfall:set-match" | "ocr:keyword" | "filename" | ...
  note?: string;
}

export type ConfidenceMap = Partial<Record<keyof ProductDraft, FieldHint>>;

export interface IdentifyResult {
  draft: ProductDraft;
  confidence: ConfidenceMap;
  ocrText: string;
  strategyLog: string[];
  errors: string[];
  tookMs: number;
}

export type IdentifyPhase =
  | "idle"
  | "ocr"
  | "extract"
  | "search"
  | "compose"
  | "done"
  | "error";

export interface IdentifyProgress {
  phase: IdentifyPhase;
  progress: number; // 0..1
  message: string;
}

/**
 * Pistas intermedias que el extractor saca del texto OCR + filenames.
 * El search layer las canonicaliza contra APIs.
 */
export interface Clues {
  rawText: string;
  filenames: string[];
  /** Juego detectado por keywords/logos (alta confianza si encontrado) */
  game?: string;
  /** Categoría detectada (booster-box, etb, starter, ...) */
  category?: string;
  /** Idioma (EN/ES/JP/KO/FR/DE/IT/PT) */
  language?: string;
  /** Sobres por caja, si aparece "36 Boosters" o similar */
  packsPerBox?: number;
  /** Cartas por sobre, si aparece "15 Cards" */
  cardsPerPack?: number;
  /** Fragmentos candidatos a nombre de set (líneas grandes del OCR) */
  nameFragments: string[];
  /** Set tentativo extraído por regex (ej. "BLB", "SV8") */
  setCode?: string;
  /** Palabras clave normalizadas para fuzzy matching */
  keywords: string[];
}

/**
 * Resultado del search layer (canonical).
 * Si el set se reconoce en la API oficial, `setId` y `setName` vienen llenos.
 */
export interface CanonicalMatch {
  game?: string;
  setId?: string;
  setName?: string;
  productName?: string; // nombre reconstruido "Bloomburrow Play Booster Box"
  confidence: ConfidenceLevel;
  source: string;
}

// ─── Catalog search (flujo "busco por texto") ─────────────────────────────────

/**
 * Hit bruto de una API de catálogo TCG. Cada API devuelve lo que tiene:
 *   - Scryfall: sets con `code`, `name`, `icon_svg_uri`, `released_at`
 *   - pokemontcg.io: sets con `id`, `name`, `logo`, `symbol`
 *   - ygoprodeck: sets con `set_name`, `set_code`, `num_of_cards`
 *   - TCGDex: sets multi-lang con `id`, `name`, `logo`, `symbol`
 *
 * Los mapeamos a esta forma común para poder fusionar luego.
 */
export interface CatalogHit {
  /** Identificador único por fuente para dedupe (ej. "scryfall:blb") */
  key: string;
  source: string; // "scryfall" | "pokemontcg" | "ygoprodeck" | "tcgdex"
  game: string;
  setId: string;
  setName: string;
  /** Imagen representativa — logo del set, icono SVG, o card sample */
  imageUrl?: string;
  /** Imágenes extra (backs, logos alternativos) */
  extraImages?: string[];
  releasedAt?: string;
  cardCount?: number;
  /** Texto libre descriptivo si la API lo expone */
  note?: string;
}

/**
 * Candidato fusionado — un producto percibido a partir de hits de varias
 * fuentes que probablemente hablan del mismo set.
 */
export interface ProductCandidate {
  /** Id sintético: game + slug(setName) */
  id: string;
  game: string;
  setId: string;
  setName: string;
  /** Categoría tentativa (booster-box por defecto para queries tipo "display") */
  categoryGuess?: string;
  /** Todas las imágenes de todas las fuentes, deduplicadas */
  images: string[];
  /** Subconjunto recomendado para usar como product.images */
  suggestedImages: string[];
  releasedAt?: string;
  cardCount?: number;
  /** Fuentes que aportaron al candidato */
  sources: string[];
  /** Score relevancia vs query (0..1) */
  score: number;
  /** Nota compuesta con metadatos combinados */
  note?: string;
}

export interface CatalogSearchResult {
  candidates: ProductCandidate[];
  rawHits: CatalogHit[];
  errors: string[];
  sourcesQueried: string[];
  tookMs: number;
}
