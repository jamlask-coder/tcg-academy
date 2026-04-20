// productIdentifier/priceHint.ts
// Sugerencia de precio de venta al público en EUR, basada en rangos típicos
// del mercado español en 2025-2026. El objetivo NO es bordar el precio final
// — el admin siempre lo revisa — sino evitar dejarlo en 0 y que el form
// requiera un valor mayor que 0.01 para poder guardar.
//
// Derivamos los otros dos precios (mayorista, tienda) aplicando márgenes
// habituales del sector (descuentos del 15-25% según canal).

export interface PriceSuggestion {
  price: number; // PV Público EUR (IVA incluido)
  wholesalePrice: number; // PV Mayorista
  storePrice: number; // PV Tiendas TCG Academy
  confidence: "medium" | "low"; // siempre medium/low porque son estimados
  source: string;
}

/**
 * Mapa (game → category → medianPrice) con precios de referencia.
 * Los valores son orientativos; el admin puede (y debe) sobreescribir.
 */
const PRICE_MEDIAN: Record<string, Record<string, number>> = {
  magic: {
    "booster-box": 140,
    sobres: 6,
    commander: 45,
    "secret-lair": 40,
    bundles: 55,
    starter: 15,
    tins: 30,
    etb: 55,
  },
  pokemon: {
    "booster-box": 130,
    sobres: 5,
    etb: 55,
    blisters: 15,
    tins: 22,
    bundles: 40,
  },
  yugioh: {
    "booster-box": 90,
    sobres: 5,
    "structure-decks": 12,
    tins: 25,
  },
  "one-piece": {
    "booster-box": 110,
    sobres: 5,
    starter: 18,
    premium: 45,
  },
  "dragon-ball": {
    "booster-box": 120,
    sobres: 5,
    starter: 18,
  },
  lorcana: {
    "booster-box": 130,
    sobres: 6,
    starter: 18,
    "gift-sets": 40,
    trove: 55,
  },
  riftbound: {
    "booster-box": 120,
    sobres: 6,
    starter: 25,
  },
  digimon: {
    "booster-box": 90,
    sobres: 5,
    starter: 15,
  },
  naruto: {
    "booster-box": 110,
    sobres: 5,
    starter: 20,
  },
};

const DEFAULT_MEDIAN: Record<string, number> = {
  "booster-box": 110,
  sobres: 5,
  etb: 45,
  starter: 18,
  tins: 25,
  bundles: 40,
  commander: 40,
  "secret-lair": 40,
  blisters: 15,
  "structure-decks": 12,
  "gift-sets": 40,
  trove: 55,
  premium: 45,
  scr: 20,
  singles: 5,
  especiales: 35,
  promo: 8,
};

/**
 * Devuelve una sugerencia de precio. Si el par (game, category) no está
 * contemplado, usa una tabla genérica y marca confianza "low".
 */
export function suggestPrice(
  game: string | undefined,
  category: string | undefined,
): PriceSuggestion | null {
  if (!game || !category) return null;

  const byGame = PRICE_MEDIAN[game];
  let median: number | undefined;
  let source = "median";
  let confidence: "medium" | "low" = "medium";

  if (byGame && byGame[category] !== undefined) {
    median = byGame[category];
  } else if (DEFAULT_MEDIAN[category] !== undefined) {
    median = DEFAULT_MEDIAN[category];
    source = "default-category";
    confidence = "low";
  }

  if (median === undefined) return null;

  // Márgenes habituales del sector TCG:
  //   Mayorista ≈ PVP * 0.75  (25% off sobre PV público)
  //   Tienda    ≈ PVP * 0.85  (15% off, precio para otras tiendas TCG)
  // Los redondeamos a 0.50€ para que queden "limpios" en la UI.
  const round50 = (n: number) => Math.round(n * 2) / 2;

  return {
    price: round50(median),
    wholesalePrice: round50(median * 0.75),
    storePrice: round50(median * 0.85),
    confidence,
    source,
  };
}
