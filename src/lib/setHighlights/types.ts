// Tipos públicos del módulo setHighlights.
// Todo adapter consume/devuelve estos tipos — no hay dependencias hacia el componente UI.

import type { LocalProduct } from "@/data/products";

export type Provenance =
  | "tag-explicit-set"
  | "hardcoded-map"
  | "product-setcode"
  | "fuzzy-sets-en"
  | "fuzzy-sets-localized"
  | "synonym-expansion"
  | "hardcoded-fallback"
  | "game-latest-fallback"
  | "none";

export interface HighlightCard {
  id: string;
  name: string;
  imageUrl: string;
  imageFallbackUrl?: string;
  rarity?: string;
  /** Para shimmer holográfico en la UI */
  isHolo?: boolean;
  priceEur?: number;
  /** ID externo para el gráfico de precio */
  externalId?: string;
  /** Juego asociado (igual que LocalProduct.game) — para el gráfico */
  game?: string;
}

export interface ResolveResult {
  setId: string;
  provenance: Provenance;
  setLabel?: string;
}

export interface HighlightsResult {
  cards: HighlightCard[];
  provenance: Provenance;
  resolved: ResolveResult | null;
  game: string;
  strategyTried: string[];
  errors: string[];
  tookMs: number;
}

export interface SetAdapter {
  game: string;
  supported: boolean;
  resolveSetId(
    product: LocalProduct,
    strategyTried: string[],
    errors: string[],
  ): Promise<ResolveResult | null>;
  fetchTopCards(
    setId: string,
    lang: string,
    product: LocalProduct,
    errors: string[],
  ): Promise<HighlightCard[]>;
}

export type { LocalProduct };
