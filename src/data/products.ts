// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocalProduct {
  id: number;
  name: string;
  slug: string;
  price: number; // PV Público (precio público, visible a todos)
  comparePrice?: number; // precio tachado (precio antes del descuento)
  wholesalePrice: number; // PV Mayoristas — solo visible para rol "mayorista"
  storePrice: number; // PV Tiendas TCG Academy — solo visible para rol "tienda"
  costPrice?: number; // Precio de adquisición — SOLO visible para admin, nunca al público
  description: string;
  category: string; // slug de categoría: 'booster-box', 'singles', etc.
  game: string; // slug del juego: 'magic', 'pokemon', etc.
  images: string[]; // URLs de imagen — vacío = muestra placeholder
  inStock: boolean;
  stock?: number;       // Numeric stock count. undefined = unlimited
  /**
   * @deprecated Generic lifetime limit — usado solo como fallback si no hay
   * límite específico por rol. Preferir `maxPerClient`/`maxPerWholesaler`/`maxPerStore`.
   */
  maxPerUser?: number;
  /** Máximo de unidades que un usuario con rol "cliente" puede comprar EN TOTAL
   *  (acumulado de todos sus pedidos, no por pedido). undefined = ilimitado. */
  maxPerClient?: number;
  /** Máximo de unidades que un usuario con rol "mayorista" puede comprar EN TOTAL. */
  maxPerWholesaler?: number;
  /** Máximo de unidades que un usuario con rol "tienda" puede comprar EN TOTAL. */
  maxPerStore?: number;
  isNew: boolean;
  createdAt?: string; // ISO date — used for "Nuevo" badge (45-day window)
  isFeatured?: boolean;
  language: string; // 'EN' | 'ES' | 'JP' | 'FR' | 'DE' | 'IT' | 'KO' | 'PT' | 'ZH'
  // language?: string reserved for filtering — see memory/project_language_requirement.md
  tags: string[];
  vatRate?: number; // IVA en porcentaje (21 por defecto para TCG en España)
  /** ID del sobre suelto vinculado (solo para booster-box) */
  linkedPackId?: number;
  /** ID de la caja vinculada (solo para sobres) */
  linkedBoxId?: number;
  /** Nº de sobres por caja (solo para booster-box) */
  packsPerBox?: number;
  /** Nº de cartas por sobre (solo para sobres) */
  cardsPerPack?: number;
  /**
   * EAN-13 / GTIN — código de barras del producto. Opcional pero, si está
   * presente, alimenta el `gtin13` del JSON-LD Product → mejora rich results
   * en Google Shopping y SERPs.
   */
  gtin13?: string;
  /**
   * Manufacturer Part Number — referencia del fabricante. Opcional. Se
   * incluye como `mpn` en el JSON-LD si está presente.
   */
  mpn?: string;
}

// ─── Game config ──────────────────────────────────────────────────────────────

export const GAME_CONFIG: Record<
  string,
  {
    name: string;
    color: string;
    bgColor: string;
    description: string;
    emoji: string;
  }
> = {
  pokemon: {
    name: "Pokémon",
    color: "#f59e0b",
    bgColor: "#fef3c7",
    description:
      "Cartas, sobres, ETBs y colecciones del juego de cartas Pokémon.",
    emoji: "⚡",
  },
  magic: {
    name: "Magic: The Gathering",
    color: "#dc2626",
    bgColor: "#fee2e2",
    description:
      "Booster Boxes, Commander Decks, singles y accesorios del TCG más veterano del mundo.",
    emoji: "🧙",
  },
  "one-piece": {
    name: "One Piece",
    color: "#1d4ed8",
    bgColor: "#dbeafe",
    description:
      "Booster Boxes, Starter Decks y singles del juego de cartas One Piece.",
    emoji: "⛵",
  },
  riftbound: {
    name: "Riftbound",
    color: "#ea580c",
    bgColor: "#fff7ed",
    description:
      "El nuevo TCG de League of Legends. Booster Boxes y Starter Decks.",
    emoji: "⚔️",
  },
  topps: {
    name: "Topps",
    color: "#1d4ed8",
    bgColor: "#dbeafe",
    description: "Colecciones de cromos de fútbol, NBA, F1, WWE y más.",
    emoji: "🏆",
  },
  lorcana: {
    name: "Disney Lorcana",
    color: "#0891b2",
    bgColor: "#cffafe",
    description:
      "El TCG oficial de Disney. Booster Boxes, Starter Decks y cartas Enchanted.",
    emoji: "✨",
  },
  "dragon-ball": {
    name: "Dragon Ball",
    color: "#d97706",
    bgColor: "#fef3c7",
    description:
      "Dragon Ball Super Fusion World. Booster Boxes y Starter Decks oficiales.",
    emoji: "🔴",
  },
  yugioh: {
    name: "Yu-Gi-Oh!",
    color: "#dc2626",
    bgColor: "#fee2e2",
    description:
      "Booster Boxes, Tins, Structure Decks y singles de Yu-Gi-Oh! oficial Konami.",
    emoji: "👁️",
  },
  naruto: {
    name: "Naruto",
    color: "#ea580c",
    bgColor: "#ffedd5",
    description: "El nuevo TCG de Naruto. Primera expansión: Konoha Shidō.",
    emoji: "🍃",
  },
  panini: {
    name: "Panini",
    color: "#16a34a",
    bgColor: "#dcfce7",
    description:
      "Cromos y colecciones oficiales de fútbol, NBA, Star Wars y mucho más.",
    emoji: "⚽",
  },
  digimon: {
    name: "Digimon TCG",
    color: "#2563eb",
    bgColor: "#dbeafe",
    description:
      "Booster Boxes, Starter Decks y singles del juego de cartas Digimon.",
    emoji: "🦖",
  },
  cyberpunk: {
    name: "Cyberpunk TCG",
    color: "#d4e500",
    bgColor: "#fefce8",
    description:
      "El nuevo TCG de Cyberpunk. Booster Boxes, Starter Decks y singles.",
    emoji: "🤖",
  },
  accesorios: {
    name: "Accesorios",
    color: "#475569",
    bgColor: "#f1f5f9",
    description:
      "Fundas, toploaders, tapetes, deckboxes, carpetas y dados — compatibles con cualquier TCG.",
    emoji: "🛡️",
  },
};

// ─── Category labels ──────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  "booster-box": "Cajas de Sobres",
  sobres: "Sobres Sueltos",
  etb: "Elite Trainer Box",
  tins: "Tins y Colecciones",
  blisters: "Blisters y Packs",
  singles: "Cartas Sueltas",
  gradeadas: "Cartas Gradeadas",
  lotes: "Lotes y Bundles",
  promo: "Cartas Promo",
  sleeves: "Fundas",
  playmats: "Tapetes",
  carpetas: "Carpetas",
  deckboxes: "Deck Boxes",
  toploaders: "Toploaders",
  bundles: "Bundles",
  prerelease: "Pre-Release Kits",
  commander: "Commander Decks",
  "secret-lair": "Secret Lair",
  foil: "Cartas Foil y Premium",
  "full-art-lands": "Tierras Full Art",
  dados: "Dados de Vida",
  "structure-decks": "Structure Decks",
  starlight: "Cartas Starlight / Ultimate",
  "prize-cards": "Prize Cards de Torneo",
  "field-centers": "Field Centers",
  starter: "Starter Decks",
  "alternate-art": "Cartas Alternate Art",
  premium: "Premium Packs",
  "double-packs": "Double Packs",
  especiales: "Ediciones Especiales",
  futbol: "Cromos de Fútbol",
  nba: "Cromos NBA",
  f1: "Cromos F1",
  wwe: "Cromos WWE",
  "star-wars": "Cromos Star Wars",
  cajas: "Cajas",
  albumes: "Álbumes",
  latas: "Latas Coleccionables",
  enchanted: "Cartas Enchanted y Legendarias",
  trove: "Illumineer's Trove",
  "gift-sets": "Gift Sets",
  scr: "Cartas SCR / God Rare",
  accesorios: "Accesorios",
};

/** Categories that get merged under "Accesorios" in the nav pills */
export const ACCESSORY_CATEGORIES = new Set([
  "sleeves", "playmats", "carpetas", "deckboxes", "toploaders", "dados",
]);

/** Display order for category pills — lower = first. Unlisted categories get 50. */
const CATEGORY_ORDER: Record<string, number> = {
  "booster-box": 1,
  sobres: 2,
  etb: 3,
  bundles: 4,
  tins: 5,
  latas: 5,
  blisters: 6,
  "double-packs": 6,
  commander: 7,
  "structure-decks": 7,
  starter: 7,
  "gift-sets": 8,
  trove: 8,
  especiales: 9,
  prerelease: 9,
  cajas: 10,
  futbol: 11,
  nba: 12,
  f1: 13,
  wwe: 14,
  "star-wars": 15,
  albumes: 16,
  singles: 20,
  enchanted: 21,
  starlight: 21,
  scr: 21,
  foil: 22,
  "alternate-art": 22,
  gradeadas: 23,
  "prize-cards": 24,
  "field-centers": 24,
  promo: 25,
  "secret-lair": 26,
  "full-art-lands": 27,
  lotes: 28,
  premium: 29,
  accesorios: 90,
};

// ─── isNew utility ────────────────────────────────────────────────────────────

/** Returns true if the product was added within the last 45 days (uses createdAt when available, falls back to isNew flag). */
export function isNewProduct(product: LocalProduct): boolean {
  if (product.createdAt) {
    return (
      Date.now() - new Date(product.createdAt).getTime() <=
      45 * 24 * 60 * 60 * 1000
    );
  }
  return product.isNew;
}

// ─── Language flag helper ─────────────────────────────────────────────────────

export const LANGUAGE_FLAGS: Record<string, string> = {
  ES: "🇪🇸",
  EN: "🇬🇧",
  JP: "🇯🇵",
  KO: "🇰🇷",
  FR: "🇫🇷",
  DE: "🇩🇪",
  IT: "🇮🇹",
  PT: "🇧🇷",
  ZH: "🇨🇳",
};

export const LANGUAGE_NAMES: Record<string, string> = {
  ES: "Español",
  EN: "Inglés",
  JP: "Japonés",
  KO: "Coreano",
  FR: "Francés",
  DE: "Alemán",
  IT: "Italiano",
  PT: "Portugués",
  ZH: "Chino",
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const PRODUCTS: LocalProduct[] = [
  // ══════════════════════════════════════════════════════════
  // MAGIC: THE GATHERING
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // POKÉMON TCG
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // ONE PIECE CARD GAME
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // RIFTBOUND (LEAGUE OF LEGENDS TCG)
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // TOPPS
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // DISNEY LORCANA
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // DRAGON BALL SUPER FUSION WORLD
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // YU-GI-OH!
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // NARUTO MYTHOS TCG
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // MAGIC: THE GATHERING — NUEVOS (ID 20001–20020)
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // POKÉMON TCG — NUEVOS (ID 20021–20038)
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // ONE PIECE CARD GAME — NUEVOS (ID 20039–20046)
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // RIFTBOUND — NUEVOS (ID 20047–20051)
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // TOPPS — NUEVOS (ID 20052–20054)
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // DISNEY LORCANA — NUEVOS (ID 20055–20062)
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // DRAGON BALL SUPER CARD GAME — NUEVOS (ID 20063–20069)
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // YU-GI-OH! — NUEVOS (ID 20070–20081)
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // NARUTO MYTHOS TCG — NUEVOS (ID 20082–20087)
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // PANINI — NUEVOS (ID 20088–20092)
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // DIGIMON TCG — NUEVOS (ID 20093–20097)
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // POKÉMON TCG — ADICIONALES (ID 20098–20102)
  // ══════════════════════════════════════════════════════════

  // ─── Sobres sueltos vinculados a cajas ──────────────────────────────────────

  // ══════════════════════════════════════════════════════════════════════════════
  // PRODUCTOS REALES — TCGacademy.es
  // ══════════════════════════════════════════════════════════════════════════════

  // ──────────────────────────────────────────────────────────────────────────────
  // MAGIC: THE GATHERING — Secretos de Strixhaven (Reserva)
  // ──────────────────────────────────────────────────────────────────────────────

  {
    id: 3184,
    name: "Secretos de Strixhaven — Espiritu de Sapientum Commander Deck",
    slug: "magic-strixhaven-espiritu-sapientum-commander-deck",
    price: 54.95,
    wholesalePrice: 44.95,
    storePrice: 39.95,
    description:
      "Mazo Commander de Secretos de Strixhaven. El colegio de Sapientum combina magia verde y azul para desbloquear los secretos del mundo natural. Incluye 100 cartas listas para jugar.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/strixhaven-espiritu-sapientum-cmd.webp"],
    inStock: true,
    stock: 20,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["strixhaven", "commander", "sapientum"],
  },
  {
    id: 3188,
    name: "Secretos de Strixhaven — Silverquill Influence Commander Deck",
    slug: "magic-strixhaven-silverquill-influence-commander-deck",
    price: 54.95,
    wholesalePrice: 44.95,
    storePrice: 39.95,
    description:
      "Mazo Commander de Silverquill, el colegio de tinta y eloquencia. Combina magia blanca y negra con estrategias de potenciamiento y control. 100 cartas listas para jugar.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/strixhaven-silverquill-cmd.webp"],
    inStock: true,
    stock: 19,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["strixhaven", "commander", "silverquill"],
  },
  {
    id: 3190,
    name: "Secretos de Strixhaven — Prismari Artistry Commander Deck",
    slug: "magic-strixhaven-prismari-artistry-commander-deck",
    price: 54.95,
    wholesalePrice: 44.95,
    storePrice: 39.95,
    description:
      "Mazo Commander de Prismari, el colegio de las artes elementales. Combina magia azul y roja con hechizos espectaculares de alto coste. 100 cartas listas para jugar.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/strixhaven-prismari-cmd.webp"],
    inStock: true,
    stock: 20,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["strixhaven", "commander", "prismari"],
  },
  {
    id: 3192,
    name: "Secretos de Strixhaven — Witherbloom Pestilence Commander Deck",
    slug: "magic-strixhaven-witherbloom-pestilence-commander-deck",
    price: 54.95,
    wholesalePrice: 44.95,
    storePrice: 39.95,
    description:
      "Mazo Commander de Witherbloom, el colegio de la vida y la muerte. Combina magia negra y verde con mecánicas de sacrificio y ganancia de vida. 100 cartas listas para jugar.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/strixhaven-witherbloom-cmd.webp"],
    inStock: true,
    stock: 20,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["strixhaven", "commander", "witherbloom"],
  },
  {
    id: 3194,
    name: "Secretos de Strixhaven — Quandrix Unlimited Commander Deck",
    slug: "magic-strixhaven-quandrix-unlimited-commander-deck",
    price: 54.95,
    wholesalePrice: 44.95,
    storePrice: 39.95,
    description:
      "Mazo Commander de Quandrix, el colegio de las matemáticas y la naturaleza. Combina magia verde y azul con mecánicas de contadores y tokens. 100 cartas listas para jugar.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/strixhaven-quandrix-cmd.webp"],
    inStock: true,
    stock: 20,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["strixhaven", "commander", "quandrix"],
  },
  {
    id: 3196,
    name: "Caja de Sobres de Juego — Secretos de Strixhaven",
    slug: "magic-strixhaven-play-booster-box-en",
    price: 139.95,
    wholesalePrice: 110.00,
    storePrice: 99.95,
    description:
      "Caja de sobres de juego de Secretos de Strixhaven en inglés. Contiene 36 sobres Play Booster con cartas del plano universitario de Arcavios.",
    category: "booster-box",
    game: "magic",
    images: ["/images/products/store/strixhaven-play-booster-box.webp"],
    inStock: true,
    stock: 20,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["strixhaven", "booster-box", "display"],
    packsPerBox: 36,
  },
  {
    id: 3198,
    name: "Caja de Sobres de Juego — Secretos de Strixhaven",
    slug: "magic-strixhaven-play-booster-box-es",
    price: 139.95,
    wholesalePrice: 110.00,
    storePrice: 99.95,
    description:
      "Caja de sobres de juego de Secretos de Strixhaven en español. Contiene 36 sobres Play Booster con cartas del plano universitario de Arcavios.",
    category: "booster-box",
    game: "magic",
    images: ["/images/products/store/strixhaven-play-booster-box.webp"],
    inStock: true,
    stock: 20,
    isNew: false,
    isFeatured: true,
    language: "ES",
    tags: ["strixhaven", "booster-box", "display", "espanol"],
    packsPerBox: 36,
  },
  {
    id: 3199,
    name: "Secretos de Strixhaven — Commander Case (5 mazos)",
    slug: "magic-strixhaven-commander-case",
    price: 209.95,
    wholesalePrice: 170.00,
    storePrice: 155.00,
    description:
      "Commander Case de Secretos de Strixhaven en inglés. Incluye los 5 mazos Commander de los 5 colegios de Strixhaven. Ideal para grupos de juego.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/strixhaven-commander-case.webp"],
    inStock: true,
    stock: 19,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["strixhaven", "commander", "case"],
  },
  {
    id: 3201,
    name: "Caja Collector Booster — Secretos de Strixhaven",
    slug: "magic-strixhaven-collector-booster-box",
    price: 319.95,
    wholesalePrice: 260.00,
    storePrice: 240.00,
    description:
      "Caja de Collector Boosters de Secretos de Strixhaven en inglés. 12 sobres con cartas premium: foils, extended art y Mystical Archives especiales.",
    category: "booster-box",
    game: "magic",
    images: ["/images/products/store/strixhaven-collector-box.webp"],
    inStock: false,
    stock: 0,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["strixhaven", "collector", "premium"],
    packsPerBox: 12,
  },
  {
    id: 3203,
    name: "Secretos de Strixhaven — Bundle",
    slug: "magic-strixhaven-bundle",
    price: 59.95,
    wholesalePrice: 48.00,
    storePrice: 42.00,
    description:
      "Bundle de Secretos de Strixhaven en inglés. Incluye 8 sobres de juego, 1 carta promo foil, 40 tierras básicas, caja de almacenamiento y dado de vida.",
    category: "bundles",
    game: "magic",
    images: ["/images/products/store/strixhaven-bundle.webp"],
    inStock: true,
    stock: 20,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["strixhaven", "bundle"],
  },
  {
    id: 3205,
    name: "Secretos de Strixhaven — Bundle Gift",
    slug: "magic-strixhaven-bundle-gift",
    price: 99.95,
    wholesalePrice: 80.00,
    storePrice: 72.00,
    description:
      "Bundle Gift Edition de Secretos de Strixhaven en inglés. Incluye más sobres que el bundle estándar, contenido adicional exclusivo y caja de almacenamiento premium.",
    category: "bundles",
    game: "magic",
    images: ["/images/products/store/strixhaven-bundle-gift.webp"],
    inStock: false,
    stock: 0,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["strixhaven", "bundle", "gift"],
  },
  {
    id: 3207,
    name: "Secretos de Strixhaven — Draft Night",
    slug: "magic-strixhaven-draft-night",
    price: 99.95,
    wholesalePrice: 80.00,
    storePrice: 72.00,
    description:
      "Pack Draft Night de Secretos de Strixhaven en inglés. Ideal para organizar una noche de draft con amigos. Incluye sobres suficientes para una mesa completa.",
    category: "especiales",
    game: "magic",
    images: ["/images/products/store/strixhaven-draft-night.webp"],
    inStock: true,
    stock: 20,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["strixhaven", "draft-night"],
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // MAGIC: THE GATHERING — Tortugas Ninja (TMNT)
  // ──────────────────────────────────────────────────────────────────────────────

  {
    id: 3123,
    name: "Caja de Sobres de Juego — Tortugas Ninja",
    slug: "magic-tmnt-play-booster-box-en",
    price: 148.95,
    comparePrice: 169.95,
    wholesalePrice: 120.00,
    storePrice: 110.00,
    description:
      "Caja de sobres de juego de Teenage Mutant Ninja Turtles en inglés. El crossover entre Magic y las Tortugas Ninja. 36 sobres Play Booster.",
    category: "booster-box",
    game: "magic",
    images: ["/images/products/store/tmnt-play-booster-box-en.webp"],
    inStock: true,
    stock: 21,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: true,
    language: "EN",
    tags: ["tmnt", "tortugas-ninja", "booster-box"],
    packsPerBox: 36,
  },
  {
    id: 3125,
    name: "Tortugas Ninja — Turtle Power! Commander Deck",
    slug: "magic-tmnt-turtle-power-commander-deck",
    price: 59.95,
    comparePrice: 75.90,
    wholesalePrice: 48.00,
    storePrice: 42.00,
    description:
      "Mazo Commander Turtle Power! de Teenage Mutant Ninja Turtles en inglés. 100 cartas listas para jugar con los héroes tortuga y sus aliados.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/tmnt-turtle-power-cmd.webp"],
    inStock: true,
    stock: 120,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: true,
    language: "EN",
    tags: ["tmnt", "tortugas-ninja", "commander"],
  },
  {
    id: 3128,
    name: "Collector Booster Box — Tortugas Ninja",
    slug: "magic-tmnt-collector-booster-box",
    price: 420.95,
    comparePrice: 449.95,
    wholesalePrice: 340.00,
    storePrice: 310.00,
    description:
      "Caja de Collector Boosters de Teenage Mutant Ninja Turtles en inglés. 12 sobres con cartas premium, foils especiales y arte exclusivo de las Tortugas Ninja.",
    category: "booster-box",
    game: "magic",
    images: ["/images/products/store/tmnt-collector-booster.webp"],
    inStock: true,
    stock: 7,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["tmnt", "tortugas-ninja", "collector", "premium"],
    packsPerBox: 12,
  },
  {
    id: 3130,
    name: "Tortugas Ninja — Bundle",
    slug: "magic-tmnt-bundle",
    price: 59.95,
    comparePrice: 69.95,
    wholesalePrice: 48.00,
    storePrice: 42.00,
    description:
      "Bundle de Teenage Mutant Ninja Turtles en inglés. Incluye 8 sobres de juego, carta promo foil exclusiva, tierras básicas temáticas y caja de almacenamiento.",
    category: "bundles",
    game: "magic",
    images: ["/images/products/store/tmnt-bundle.webp"],
    inStock: true,
    stock: 24,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["tmnt", "tortugas-ninja", "bundle"],
  },
  {
    id: 3132,
    name: "Tortugas Ninja — Special Bundle Pizza (Reserva)",
    slug: "magic-tmnt-special-bundle-pizza",
    price: 119.95,
    comparePrice: 139.95,
    wholesalePrice: 96.00,
    storePrice: 88.00,
    description:
      "Special Bundle Pizza de Teenage Mutant Ninja Turtles en inglés. Edición especial con contenido exclusivo temático de pizza y más sobres que el bundle estándar.",
    category: "bundles",
    game: "magic",
    images: ["/images/products/store/tmnt-special-bundle-pizza.webp"],
    inStock: true,
    stock: 10,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["tmnt", "tortugas-ninja", "bundle", "especial", "reserva"],
  },
  {
    id: 3134,
    name: "Tortugas Ninja — Draft Night",
    slug: "magic-tmnt-draft-night",
    price: 119.95,
    comparePrice: 139.95,
    wholesalePrice: 96.00,
    storePrice: 88.00,
    description:
      "Pack Draft Night de Teenage Mutant Ninja Turtles en inglés. Perfecto para organizar una noche de draft temática con amigos.",
    category: "especiales",
    game: "magic",
    images: ["/images/products/store/tmnt-draft-night.webp"],
    inStock: true,
    stock: 6,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["tmnt", "tortugas-ninja", "draft-night"],
  },
  {
    id: 3136,
    name: "Tortugas Ninja — Caja Team Up",
    slug: "magic-tmnt-team-up",
    price: 59.95,
    comparePrice: 69.95,
    wholesalePrice: 48.00,
    storePrice: 42.00,
    description:
      "Caja Team Up de Teenage Mutant Ninja Turtles en inglés. Producto especial para juego cooperativo con contenido exclusivo.",
    category: "especiales",
    game: "magic",
    images: ["/images/products/store/tmnt-team-up.webp"],
    inStock: true,
    stock: 3,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["tmnt", "tortugas-ninja", "team-up"],
  },
  {
    id: 3158,
    name: "Caja de Sobres de Juego — Tortugas Ninja",
    slug: "magic-tmnt-play-booster-box-es",
    price: 148.95,
    comparePrice: 169.95,
    wholesalePrice: 120.00,
    storePrice: 110.00,
    description:
      "Caja de sobres de juego de Teenage Mutant Ninja Turtles en español. El crossover entre Magic y las Tortugas Ninja. 36 sobres Play Booster.",
    category: "booster-box",
    game: "magic",
    images: ["/images/products/store/tmnt-play-booster-box-es.webp"],
    inStock: true,
    stock: 61,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: true,
    language: "ES",
    tags: ["tmnt", "tortugas-ninja", "booster-box", "espanol"],
    packsPerBox: 36,
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // MAGIC: THE GATHERING — El Senor de los Anillos
  // ──────────────────────────────────────────────────────────────────────────────

  {
    id: 3232,
    name: "Caja Set Booster — El Senor de los Anillos",
    slug: "magic-lotr-set-booster-box",
    price: 210.00,
    wholesalePrice: 170.00,
    storePrice: 155.00,
    description:
      "Caja de Set Boosters de El Señor de los Anillos: Tales of Middle-earth en inglés. Sumérgete en la Tierra Media con cartas épicas del universo Tolkien.",
    category: "booster-box",
    game: "magic",
    images: ["/images/products/store/lotr-set-booster-box.webp"],
    inStock: false,
    stock: 0,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["lotr", "senor-anillos", "set-booster"],
    packsPerBox: 30,
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // MAGIC: THE GATHERING — Commander Decks (Edge of Eternities / Tarkir)
  // ──────────────────────────────────────────────────────────────────────────────

  {
    id: 3251,
    name: "Edge of Eternities — Counter Intelligence Commander Deck",
    slug: "magic-edge-eternities-counter-intelligence-cmd",
    price: 54.95,
    wholesalePrice: 44.95,
    storePrice: 39.95,
    description:
      "Mazo Commander Counter Intelligence de Edge of Eternities en inglés. Estrategia basada en contadores y manipulación del campo de batalla. 100 cartas listas para jugar.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/edge-eternities-counter-intelligence-cmd.png"],
    inStock: true,
    stock: 6,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["edge-eternities", "commander"],
  },
  {
    id: 3254,
    name: "Edge of Eternities — World Shaper Commander Deck",
    slug: "magic-edge-eternities-world-shaper-cmd",
    price: 59.95,
    wholesalePrice: 48.00,
    storePrice: 42.00,
    description:
      "Mazo Commander World Shaper de Edge of Eternities en inglés. Moldea el mundo a tu voluntad con mecánicas de tierras y rampeo. 100 cartas listas para jugar.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/edge-eternities-world-shaper-cmd.png"],
    inStock: true,
    stock: 20,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["edge-eternities", "commander"],
  },
  {
    id: 3258,
    name: "Edge of Eternities — Creative Energy Commander Deck",
    slug: "magic-edge-eternities-creative-energy-cmd",
    price: 69.95,
    wholesalePrice: 56.00,
    storePrice: 50.00,
    description:
      "Mazo Commander Creative Energy de Edge of Eternities en inglés. Desata energía creativa con mecánicas de tokens y sinergia de artefactos. 100 cartas listas para jugar.",
    category: "commander",
    game: "magic",
    images: [],
    inStock: true,
    stock: 2,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["edge-eternities", "commander"],
  },
  {
    id: 3260,
    name: "Edge of Eternities — Graveyard Overdrive Commander Deck",
    slug: "magic-edge-eternities-graveyard-overdrive-cmd",
    price: 84.95,
    wholesalePrice: 68.00,
    storePrice: 62.00,
    description:
      "Mazo Commander Graveyard Overdrive de Edge of Eternities en inglés. Domina el cementerio con mecánicas de reanimación y sacrificio. 100 cartas listas para jugar.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/edge-eternities-graveyard-overdrive-cmd.jpg"],
    inStock: true,
    stock: 1,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["edge-eternities", "commander"],
  },
  {
    id: 3262,
    name: "Tarkir Dragonstorm — Abzan Armor Commander Deck",
    slug: "magic-tarkir-dragonstorm-abzan-armor-cmd",
    price: 64.95,
    wholesalePrice: 52.00,
    storePrice: 47.00,
    description:
      "Mazo Commander Abzan Armor de Tarkir Dragonstorm en inglés. El clan Abzan protege con armaduras y resistencia. Estrategia de criaturas grandes y protección. 100 cartas.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/tarkir-abzan-armor-cmd.png"],
    inStock: true,
    stock: 1,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["tarkir", "dragonstorm", "commander", "abzan"],
  },
  {
    id: 3265,
    name: "Tarkir Dragonstorm — Jeksai Striker Commander Deck",
    slug: "magic-tarkir-dragonstorm-jeksai-striker-cmd",
    price: 44.95,
    wholesalePrice: 36.00,
    storePrice: 32.00,
    description:
      "Mazo Commander Jeksai Striker de Tarkir Dragonstorm en inglés. El clan Jeskai ataca con velocidad y astucia. Estrategia de hechizos y prowess. 100 cartas.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/tarkir-jeksai-striker-cmd.png"],
    inStock: true,
    stock: 1,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["tarkir", "dragonstorm", "commander", "jeskai"],
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // MAGIC: THE GATHERING — Lorwyn Eclipsed
  // ──────────────────────────────────────────────────────────────────────────────

  {
    id: 3456,
    name: "Lorwyn Eclipsed — Danza Elemental Commander Deck",
    slug: "magic-lorwyn-eclipsed-danza-elemental-cmd",
    price: 54.95,
    wholesalePrice: 44.95,
    storePrice: 39.95,
    description:
      "Mazo Commander Danza Elemental de Lorwyn Eclipsed en español. Invoca elementales y desata la furia de la naturaleza con este mazo de 100 cartas listo para jugar.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/lorwyn-danza-elemental-cmd.webp"],
    inStock: true,
    stock: 4,
    isNew: true,
    createdAt: "2026-03-15",
    isFeatured: false,
    language: "ES",
    tags: ["lorwyn", "eclipsed", "commander", "espanol"],
  },
  {
    id: 3458,
    name: "Lorwyn Eclipsed — Maldicion Perjudicadora Commander Deck",
    slug: "magic-lorwyn-eclipsed-maldicion-perjudicadora-cmd",
    price: 54.95,
    wholesalePrice: 44.95,
    storePrice: 39.95,
    description:
      "Mazo Commander Maldición Perjudicadora de Lorwyn Eclipsed en español. Maldiciones y magia oscura para debilitar a tus oponentes. 100 cartas listas para jugar.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/lorwyn-maldicion-cmd.webp"],
    inStock: true,
    stock: 4,
    isNew: true,
    createdAt: "2026-03-15",
    isFeatured: false,
    language: "ES",
    tags: ["lorwyn", "eclipsed", "commander", "espanol"],
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // MAGIC: THE GATHERING — Bloomburrow
  // ──────────────────────────────────────────────────────────────────────────────

  {
    id: 3443,
    name: "Caja de Sobres de Juego — Bloomburrow",
    slug: "magic-bloomburrow-play-booster-box-es",
    price: 149.95,
    wholesalePrice: 120.00,
    storePrice: 110.00,
    description:
      "Caja de sobres de juego de Bloomburrow en español. 36 sobres Play Booster del mundo de animales antropomórficos. Incluye cartas raras y míticas en cada sobre.",
    category: "booster-box",
    game: "magic",
    images: ["/images/products/store/bloomburrow-play-booster-box-es.webp"],
    inStock: true,
    stock: 4,
    isNew: false,
    isFeatured: true,
    language: "ES",
    tags: ["bloomburrow", "booster-box", "espanol"],
    packsPerBox: 36,
  },
  {
    id: 3445,
    name: "Caja de Sobres de Juego — Bloomburrow",
    slug: "magic-bloomburrow-play-booster-box-en",
    price: 149.95,
    wholesalePrice: 120.00,
    storePrice: 110.00,
    description:
      "Caja de sobres de juego de Bloomburrow en inglés. 36 sobres Play Booster del mundo de animales antropomórficos. Incluye cartas raras y míticas en cada sobre.",
    category: "booster-box",
    game: "magic",
    images: ["/images/products/store/bloomburrow-play-booster-box-en.webp"],
    inStock: true,
    stock: 20,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["bloomburrow", "booster-box"],
    packsPerBox: 36,
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // MAGIC: THE GATHERING — Final Fantasy
  // ──────────────────────────────────────────────────────────────────────────────

  {
    id: 3245,
    name: "Caja de Sobres de Juego — Final Fantasy",
    slug: "magic-final-fantasy-play-booster-box-en",
    price: 164.95,
    wholesalePrice: 132.00,
    storePrice: 120.00,
    description:
      "Caja de sobres de juego de Magic x Final Fantasy en inglés. El crossover definitivo entre Magic: The Gathering y Final Fantasy. 36 sobres Play Booster.",
    category: "booster-box",
    game: "magic",
    images: ["/images/products/store/ff-play-booster-box-en.png"],
    inStock: true,
    stock: 7,
    isNew: true,
    createdAt: "2026-03-01",
    isFeatured: true,
    language: "EN",
    tags: ["final-fantasy", "booster-box", "crossover"],
    packsPerBox: 36,
  },
  {
    id: 3561,
    name: "Final Fantasy — Mazo Commander Limite (Cloud)",
    slug: "magic-final-fantasy-commander-cloud-es",
    price: 84.95,
    comparePrice: 89.95,
    wholesalePrice: 68.00,
    storePrice: 62.00,
    description:
      "Mazo Commander Límite de Final Fantasy VII con Cloud Strife en español. 100 cartas con la estrategia del soldado más famoso de Final Fantasy.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/ff-commander-cloud.jpg"],
    inStock: true,
    stock: 14,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: true,
    language: "ES",
    tags: ["final-fantasy", "commander", "cloud", "ff7", "espanol"],
  },
  {
    id: 3563,
    name: "Final Fantasy — Mazo Commander Pase de Contadores (Tidus)",
    slug: "magic-final-fantasy-commander-tidus-es",
    price: 74.95,
    comparePrice: 79.95,
    wholesalePrice: 60.00,
    storePrice: 54.00,
    description:
      "Mazo Commander Pase de Contadores de Final Fantasy X con Tidus en español. 100 cartas con estrategia de contadores y habilidades de Blitzball.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/ff-commander-tidus.jpg"],
    inStock: true,
    stock: 14,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "ES",
    tags: ["final-fantasy", "commander", "tidus", "ff10", "espanol"],
  },
  {
    id: 3565,
    name: "Final Fantasy — Mazo Commander Vastagos y Hechiceria (Y'shtola)",
    slug: "magic-final-fantasy-commander-yshtola-es",
    price: 74.95,
    comparePrice: 79.95,
    wholesalePrice: 60.00,
    storePrice: 54.00,
    description:
      "Mazo Commander Vástagos y Hechicería de Final Fantasy XIV con Y'shtola en español. 100 cartas con la magia del universo Eorzea.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/ff-commander-yshtola.jpg"],
    inStock: true,
    stock: 14,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "ES",
    tags: ["final-fantasy", "commander", "yshtola", "ff14", "espanol"],
  },
  {
    id: 3567,
    name: "Final Fantasy — Mazo Commander Trance del Resurgir (Terra)",
    slug: "magic-final-fantasy-commander-terra-es",
    price: 69.95,
    comparePrice: 74.95,
    wholesalePrice: 56.00,
    storePrice: 50.00,
    description:
      "Mazo Commander Trance del Resurgir de Final Fantasy VI con Terra en español. 100 cartas con la magia Esper y el poder del Trance.",
    category: "commander",
    game: "magic",
    images: ["/images/products/store/ff-commander-terra.jpg"],
    inStock: true,
    stock: 14,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "ES",
    tags: ["final-fantasy", "commander", "terra", "ff6", "espanol"],
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // MAGIC: THE GATHERING — Sobres Sueltos
  // ──────────────────────────────────────────────────────────────────────────────

  {
    id: 3327,
    name: "Outlaws of Thunder Junction — Sobre Play Booster",
    slug: "magic-otj-sobre-play-booster-en",
    price: 5.95,
    wholesalePrice: 4.50,
    storePrice: 3.95,
    description:
      "Sobre suelto de Outlaws of Thunder Junction en inglés. 14 cartas por sobre incluyendo al menos 1 rara o mítica. El lejano oeste de Magic.",
    category: "sobres",
    game: "magic",
    images: ["/images/products/store/otj-sobre-en.png"],
    inStock: true,
    stock: 63,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["otj", "thunder-junction", "sobre"],
    cardsPerPack: 14,
  },
  {
    id: 3329,
    name: "Tarkir Dragonstorm — Sobre Play Booster",
    slug: "magic-tarkir-dragonstorm-sobre-en",
    price: 5.49,
    wholesalePrice: 4.20,
    storePrice: 3.70,
    description:
      "Sobre suelto de Tarkir Dragonstorm en inglés. 14 cartas por sobre incluyendo al menos 1 rara o mítica. Regresa al plano de los dragones.",
    category: "sobres",
    game: "magic",
    images: ["/images/products/store/tarkir-sobre-en.jpg"],
    inStock: true,
    stock: 64,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["tarkir", "dragonstorm", "sobre"],
    cardsPerPack: 14,
  },
  {
    id: 3331,
    name: "Spider-Man — Sobre Play Booster",
    slug: "magic-spiderman-sobre-play-booster-es",
    price: 5.95,
    wholesalePrice: 4.50,
    storePrice: 3.95,
    description:
      "Sobre suelto de Magic x Spider-Man en español. El crossover entre Magic: The Gathering y el universo Marvel de Spider-Man.",
    category: "sobres",
    game: "magic",
    images: ["/images/products/store/spiderman-sobre-es.webp"],
    inStock: true,
    stock: 65,
    isNew: true,
    createdAt: "2026-03-01",
    isFeatured: false,
    language: "ES",
    tags: ["spiderman", "marvel", "sobre", "espanol"],
    cardsPerPack: 14,
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // POKEMON — Heroes Ascendentes (Espanol)
  // ══════════════════════════════════════════════════════════════════════════════

  {
    id: 3303,
    name: "Heroes Ascendentes — Blister 2 sobres Erika",
    slug: "pokemon-heroes-ascendentes-blister-erika",
    price: 18.95,
    wholesalePrice: 15.00,
    storePrice: 13.50,
    description:
      "Blister de 2 sobres de Héroes Ascendentes con carta promo de Erika en español. Incluye 2 sobres de 10 cartas cada uno y 1 carta promo exclusiva.",
    category: "blisters",
    game: "pokemon",
    images: ["/images/products/store/pokemon-heroes-blister-erika.webp"],
    inStock: false,
    stock: 0,
    isNew: true,
    createdAt: "2026-03-01",
    isFeatured: false,
    language: "ES",
    tags: ["heroes-ascendentes", "blister", "erika"],
  },
  {
    id: 3305,
    name: "Heroes Ascendentes — Blister 2 sobres Larry",
    slug: "pokemon-heroes-ascendentes-blister-larry",
    price: 18.95,
    wholesalePrice: 15.00,
    storePrice: 13.50,
    description:
      "Blister de 2 sobres de Héroes Ascendentes con carta promo de Larry en español. Incluye 2 sobres de 10 cartas cada uno y 1 carta promo exclusiva.",
    category: "blisters",
    game: "pokemon",
    images: ["/images/products/store/pokemon-heroes-blister-larry.jpg"],
    inStock: false,
    stock: 0,
    isNew: true,
    createdAt: "2026-03-01",
    isFeatured: false,
    language: "ES",
    tags: ["heroes-ascendentes", "blister", "larry"],
  },
  {
    id: 3308,
    name: "Heroes Ascendentes — Blister 3 sobres Charmander",
    slug: "pokemon-heroes-ascendentes-blister3-charmander",
    price: 22.95,
    wholesalePrice: 18.00,
    storePrice: 16.50,
    description:
      "Blister de 3 sobres de Héroes Ascendentes con carta promo de Charmander en español. Incluye 3 sobres de 10 cartas cada uno y 1 carta promo exclusiva.",
    category: "blisters",
    game: "pokemon",
    images: ["/images/products/store/pokemon-heroes-blister3-charmander.jpg"],
    inStock: true,
    stock: 3,
    isNew: true,
    createdAt: "2026-03-01",
    isFeatured: true,
    language: "ES",
    tags: ["heroes-ascendentes", "blister", "charmander"],
  },
  {
    id: 3310,
    name: "Heroes Ascendentes — Blister 3 sobres Gastly",
    slug: "pokemon-heroes-ascendentes-blister3-gastly",
    price: 22.95,
    wholesalePrice: 18.00,
    storePrice: 16.50,
    description:
      "Blister de 3 sobres de Héroes Ascendentes con carta promo de Gastly en español. Incluye 3 sobres de 10 cartas cada uno y 1 carta promo exclusiva.",
    category: "blisters",
    game: "pokemon",
    images: ["/images/products/store/pokemon-heroes-blister3-gastly.jpg"],
    inStock: true,
    stock: 3,
    isNew: true,
    createdAt: "2026-03-01",
    isFeatured: false,
    language: "ES",
    tags: ["heroes-ascendentes", "blister", "gastly"],
  },
  {
    id: 3312,
    name: "Caja Pokemon Day 2026 — 30 Aniversario",
    slug: "pokemon-day-2026-caja-30-aniversario",
    price: 26.95,
    wholesalePrice: 21.50,
    storePrice: 19.50,
    description:
      "Caja especial Pokémon Day 2026 del 30 aniversario en español. Producto exclusivo de edición limitada con contenido conmemorativo.",
    category: "especiales",
    game: "pokemon",
    images: ["/images/products/store/pokemon-day-2026.webp"],
    inStock: false,
    stock: 0,
    isNew: true,
    createdAt: "2026-02-27",
    isFeatured: false,
    language: "ES",
    tags: ["pokemon-day", "30-aniversario", "edicion-limitada"],
  },
  {
    id: 3393,
    name: "Heroes Ascendentes — Elite Trainer Box",
    slug: "pokemon-heroes-ascendentes-etb",
    price: 69.95,
    wholesalePrice: 56.00,
    storePrice: 50.00,
    description:
      "Elite Trainer Box de Héroes Ascendentes en español. Incluye 9 sobres, 45 cartas de energía, fundas para cartas, dados, marcadores y caja de almacenamiento premium.",
    category: "etb",
    game: "pokemon",
    images: ["/images/products/store/pokemon-heroes-etb.webp", "/images/products/store/pokemon-heroes-etb-2.webp", "/images/products/store/pokemon-heroes-etb-3.webp"],
    inStock: false,
    stock: 0,
    isNew: true,
    createdAt: "2026-03-01",
    isFeatured: true,
    language: "ES",
    tags: ["heroes-ascendentes", "etb", "elite-trainer-box"],
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // POKEMON — Japones
  // ──────────────────────────────────────────────────────────────────────────────

  {
    id: 3216,
    name: "Caja de Sobres — Ruler of the Black Flame (SV3)",
    slug: "pokemon-jp-ruler-black-flame-box",
    price: 94.95,
    wholesalePrice: 76.00,
    storePrice: 69.00,
    description:
      "Caja de sobres de Ruler of the Black Flame en japonés. Incluye la icónica Charizard ex. 30 sobres con 5 cartas cada uno.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-jp-ruler-black-flame.webp"],
    inStock: false,
    stock: 0,
    isNew: false,
    isFeatured: false,
    language: "JP",
    tags: ["ruler-black-flame", "japones", "charizard"],
    packsPerBox: 30,
  },
  {
    id: 3218,
    name: "Caja de Sobres — Paradise Dragona (SV7a)",
    slug: "pokemon-jp-paradise-dragona-box",
    price: 94.95,
    wholesalePrice: 76.00,
    storePrice: 69.00,
    description:
      "Caja de sobres de Paradise Dragona en japonés. Expansión con dragones legendarios y cartas Art Rare exclusivas. 30 sobres.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-jp-paradise-dragona.jpg"],
    inStock: false,
    stock: 0,
    isNew: false,
    isFeatured: false,
    language: "JP",
    tags: ["paradise-dragona", "japones"],
    packsPerBox: 30,
  },
  {
    id: 3368,
    name: "Caja de Sobres — Nihil Zero M3",
    slug: "pokemon-jp-nihil-zero-m3-box",
    price: 69.95,
    comparePrice: 74.95,
    wholesalePrice: 56.00,
    storePrice: 50.00,
    description:
      "Caja de sobres de Nihil Zero M3 en japonés. Nueva expansión con mecánicas innovadoras y cartas Art Rare. 30 sobres.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-jp-nihil-zero.webp"],
    inStock: false,
    stock: 0,
    isNew: true,
    createdAt: "2026-01-15",
    isFeatured: false,
    language: "JP",
    tags: ["nihil-zero", "japones"],
    packsPerBox: 30,
  },
  {
    id: 3370,
    name: "Caja de Sobres — Mega Dream EX (M2A)",
    slug: "pokemon-jp-mega-dream-ex-m2a-box",
    price: 89.95,
    comparePrice: 109.95,
    wholesalePrice: 72.00,
    storePrice: 65.00,
    description:
      "Caja de sobres de Mega Dream EX M2A en japonés. Mewtwo y los sueños megalíticos. Art Rare y cartas premium. 30 sobres.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-jp-mega-dream-ex.webp"],
    inStock: false,
    stock: 0,
    isNew: false,
    isFeatured: false,
    language: "JP",
    tags: ["mega-dream", "japones", "mewtwo"],
    packsPerBox: 30,
  },
  {
    id: 3372,
    name: "Caja de Sobres — Inferno X (M2)",
    slug: "pokemon-jp-inferno-x-m2-box",
    price: 109.95,
    comparePrice: 129.95,
    wholesalePrice: 88.00,
    storePrice: 80.00,
    description:
      "Caja de sobres de Inferno X M2 en japonés. Expansión con Charizard y cartas de fuego premium. 30 sobres.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-jp-inferno-x.webp"],
    inStock: true,
    stock: 40,
    isNew: false,
    isFeatured: false,
    language: "JP",
    tags: ["inferno-x", "japones", "charizard"],
    packsPerBox: 30,
  },
  {
    id: 3374,
    name: "Caja de Sobres — Mega Brave (SV5K)",
    slug: "pokemon-jp-mega-brave-box",
    price: 94.95,
    comparePrice: 109.95,
    wholesalePrice: 76.00,
    storePrice: 69.00,
    description:
      "Caja de sobres de Mega Brave en japonés. Expansión con Pokémon valientes y mecánicas de combate. 30 sobres.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-jp-mega-brave.webp"],
    inStock: false,
    stock: 0,
    isNew: false,
    isFeatured: false,
    language: "JP",
    tags: ["mega-brave", "japones"],
    packsPerBox: 30,
  },
  {
    id: 3376,
    name: "Caja de Sobres — Mega Symphonia (SV5M)",
    slug: "pokemon-jp-mega-symphonia-box",
    price: 79.95,
    comparePrice: 89.95,
    wholesalePrice: 64.00,
    storePrice: 58.00,
    description:
      "Caja de sobres de Mega Symphonia en japonés. Expansión musical con Pokémon melódicos y cartas Art Rare. 30 sobres.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-jp-mega-symphonia.webp"],
    inStock: false,
    stock: 0,
    isNew: false,
    isFeatured: false,
    language: "JP",
    tags: ["mega-symphonia", "japones"],
    packsPerBox: 30,
  },
  {
    id: 3378,
    name: "Caja de Sobres — Black Bolt (SV11B)",
    slug: "pokemon-jp-black-bolt-box",
    price: 114.95,
    comparePrice: 124.95,
    wholesalePrice: 92.00,
    storePrice: 84.00,
    description:
      "Caja de sobres de Black Bolt en japonés. Expansión eléctrica con Pikachu y Pokémon de tipo rayo. 30 sobres.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-jp-black-bolt.webp"],
    inStock: true,
    stock: 20,
    isNew: false,
    isFeatured: true,
    language: "JP",
    tags: ["black-bolt", "japones"],
    packsPerBox: 30,
  },
  {
    id: 3380,
    name: "Caja de Sobres — White Flare (SV11W)",
    slug: "pokemon-jp-white-flare-box",
    price: 109.95,
    comparePrice: 119.95,
    wholesalePrice: 88.00,
    storePrice: 80.00,
    description:
      "Caja de sobres de White Flare en japonés. Expansión con Reshiram y Pokémon de tipo fuego/dragón. 30 sobres.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-jp-white-flare.webp"],
    inStock: true,
    stock: 19,
    isNew: false,
    isFeatured: true,
    language: "JP",
    tags: ["white-flare", "japones"],
    packsPerBox: 30,
  },
  {
    id: 3382,
    name: "Caja de Sobres — Glory of the Team Rocket (SV10)",
    slug: "pokemon-jp-glory-team-rocket-box",
    price: 119.95,
    comparePrice: 134.95,
    wholesalePrice: 96.00,
    storePrice: 88.00,
    description:
      "Caja de sobres de Glory of the Team Rocket en japonés. El Team Rocket regresa con cartas oscuras y exclusivas. 30 sobres.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-jp-glory-team-rocket.webp"],
    inStock: false,
    stock: 0,
    isNew: false,
    isFeatured: false,
    language: "JP",
    tags: ["team-rocket", "japones"],
    packsPerBox: 30,
  },
  {
    id: 3384,
    name: "Caja de Sobres — Terastal Festival EX (SV8a)",
    slug: "pokemon-jp-terastal-festival-ex-box",
    price: 129.95,
    comparePrice: 144.95,
    wholesalePrice: 104.00,
    storePrice: 95.00,
    description:
      "Caja de sobres de Terastal Festival EX en japonés. Expansión especial con Pokémon terastalizados y cartas ultra raras. 30 sobres.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-jp-terastal-festival.webp"],
    inStock: true,
    stock: 25,
    isNew: false,
    isFeatured: false,
    language: "JP",
    tags: ["terastal-festival", "japones"],
    packsPerBox: 30,
  },
  {
    id: 3386,
    name: "Caja de Sobres — Shiny Treasure EX (SV4a)",
    slug: "pokemon-jp-shiny-treasure-ex-box",
    price: 114.95,
    comparePrice: 124.95,
    wholesalePrice: 92.00,
    storePrice: 84.00,
    description:
      "Caja de sobres de Shiny Treasure EX en japonés. Set especial con Pokémon shiny y cartas Art Rare brillantes. 30 sobres.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-jp-shiny-treasure.webp"],
    inStock: true,
    stock: 26,
    isNew: false,
    isFeatured: true,
    language: "JP",
    tags: ["shiny-treasure", "japones", "shiny"],
    packsPerBox: 30,
  },

  // ──────────────────────────────────────────────────────────────────────────────
  // POKEMON — Koreano
  // ──────────────────────────────────────────────────────────────────────────────

  {
    id: 3471,
    linkedPackId: 10209, packsPerBox: 20,
    name: "Caja de Sobres — 151 (SV2a)",
    slug: "pokemon-151-box-ko",
    price: 134.95,
    wholesalePrice: 108.00,
    storePrice: 98.00,
    description:
      "Caja de sobres de Pokémon 151 en coreano. Los 151 Pokémon originales de Kanto con cartas Art Rare y Special Art Rare exclusivas.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-151.webp", "/images/products/store/pokemon-kr-151-2.webp"],
    inStock: true,
    stock: 10,
    isNew: false,
    isFeatured: true,
    language: "KO",
    tags: ["151", "koreano", "kanto"],
  },
  {
    id: 3476,
    name: "Caja de Sobres — Terastal EX Festival (SV8a)",
    slug: "pokemon-kr-terastal-festival-box",
    price: 84.95,
    wholesalePrice: 68.00,
    storePrice: 62.00,
    description:
      "Caja de sobres de Terastal EX Festival en coreano. Pokémon terastalizados con cartas ultra raras.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-terastal-festival.png", "/images/products/store/pokemon-kr-terastal-festival-2.webp"],
    inStock: true,
    stock: 2,
    isNew: false,
    isFeatured: false,
    language: "KO",
    tags: ["terastal-festival", "koreano"],
    packsPerBox: 20,
  },
  {
    id: 3479,
    name: "Caja de Sobres — Ruler of the Black Flame (SV3)",
    slug: "pokemon-kr-ruler-black-flame-box",
    price: 44.95,
    wholesalePrice: 36.00,
    storePrice: 32.00,
    description:
      "Caja de sobres de Ruler of the Black Flame en coreano. Charizard ex y cartas de fuego premium.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-ruler-black-flame.webp", "/images/products/store/pokemon-kr-ruler-black-flame-2.png"],
    inStock: true,
    stock: 2,
    isNew: false,
    isFeatured: false,
    language: "KO",
    tags: ["ruler-black-flame", "koreano", "charizard"],
    packsPerBox: 20,
  },
  {
    id: 3482,
    name: "Caja de Sobres — Battle Partners (SV9)",
    slug: "pokemon-kr-battle-partners-box",
    price: 44.95,
    wholesalePrice: 36.00,
    storePrice: 32.00,
    description:
      "Caja de sobres de Battle Partners en coreano. Parejas de combate legendarias con mecánicas cooperativas.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-battle-partners.png"],
    inStock: true,
    stock: 2,
    isNew: false,
    isFeatured: false,
    language: "KO",
    tags: ["battle-partners", "koreano"],
    packsPerBox: 20,
  },
  {
    id: 3484,
    name: "Caja de Sobres — Heat Wave (SV9a)",
    slug: "pokemon-kr-heat-wave-box",
    price: 49.95,
    wholesalePrice: 40.00,
    storePrice: 36.00,
    description:
      "Caja de sobres de Heat Wave SV9a en coreano. Ola de calor con Pokémon de tipo fuego y cartas premium.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-heat-wave.webp"],
    inStock: true,
    stock: 6,
    isNew: false,
    isFeatured: false,
    language: "KO",
    tags: ["heat-wave", "koreano"],
    packsPerBox: 20,
  },
  {
    id: 3487,
    name: "Caja de Sobres — Stellar Miracle (SV7)",
    slug: "pokemon-kr-stellar-miracle-box",
    price: 45.95,
    wholesalePrice: 37.00,
    storePrice: 33.00,
    description:
      "Caja de sobres de Stellar Miracle SV7 en coreano. Milagros estelares con Pokémon cósmicos.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-stellar-miracle.webp"],
    inStock: true,
    stock: 2,
    isNew: false,
    isFeatured: false,
    language: "KO",
    tags: ["stellar-miracle", "koreano"],
    packsPerBox: 20,
  },
  {
    id: 3489,
    name: "Caja de Sobres — Night Wanderer (SV6a)",
    slug: "pokemon-kr-night-wanderer-box",
    price: 45.95,
    wholesalePrice: 37.00,
    storePrice: 33.00,
    description:
      "Caja de sobres de Night Wanderer SV6a en coreano. El vagabundo nocturno con Pokémon de tipo siniestro y fantasma.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-night-wanderer.webp"],
    inStock: true,
    stock: 2,
    isNew: false,
    isFeatured: false,
    language: "KO",
    tags: ["night-wanderer", "koreano"],
    packsPerBox: 20,
  },
  {
    id: 3491,
    name: "Caja de Sobres — Shiny Treasure EX (SV4a)",
    slug: "pokemon-kr-shiny-treasure-box",
    price: 74.95,
    wholesalePrice: 60.00,
    storePrice: 54.00,
    description:
      "Caja de sobres de Shiny Treasure EX en coreano. Set especial con Pokémon shiny y cartas Art Rare brillantes.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-shiny-treasure.webp"],
    inStock: true,
    stock: 3,
    isNew: false,
    isFeatured: false,
    language: "KO",
    tags: ["shiny-treasure", "koreano", "shiny"],
    packsPerBox: 20,
  },
  {
    id: 3493,
    name: "Caja de Sobres — Blue Sky Stream (S7R)",
    slug: "pokemon-kr-blue-sky-stream-box",
    price: 94.95,
    wholesalePrice: 76.00,
    storePrice: 69.00,
    description:
      "Caja de sobres de Blue Sky Stream S7R en coreano. Rayquaza VMAX y Pokémon de tipo dragón y vuelo.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-blue-sky-stream.webp"],
    inStock: true,
    stock: 6,
    isNew: false,
    isFeatured: false,
    language: "KO",
    tags: ["blue-sky-stream", "koreano", "rayquaza"],
    packsPerBox: 20,
  },
  {
    id: 3495,
    name: "Caja de Sobres — Super Electric Breaker (SV8)",
    slug: "pokemon-kr-super-electric-breaker-box",
    price: 54.95,
    wholesalePrice: 44.00,
    storePrice: 40.00,
    description:
      "Caja de sobres de Super Electric Breaker en coreano. Pikachu y Pokémon eléctricos con ataques devastadores.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-super-electric-breaker.webp"],
    inStock: true,
    stock: 4,
    isNew: false,
    isFeatured: false,
    language: "KO",
    tags: ["super-electric-breaker", "koreano", "pikachu"],
    packsPerBox: 20,
  },
  {
    id: 3497,
    name: "Caja de Sobres — Glory of the Team Rocket (SV10)",
    slug: "pokemon-kr-glory-team-rocket-box",
    price: 54.95,
    wholesalePrice: 44.00,
    storePrice: 40.00,
    description:
      "Caja de sobres de Glory of the Team Rocket en coreano. El Team Rocket regresa con cartas oscuras y exclusivas.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-glory-team-rocket.webp"],
    inStock: true,
    stock: 20,
    isNew: false,
    isFeatured: true,
    language: "KO",
    tags: ["team-rocket", "koreano"],
    packsPerBox: 20,
  },
  {
    id: 3499,
    name: "Caja de Sobres — VSTAR Universe (S12a)",
    slug: "pokemon-kr-vstar-universe-box",
    price: 89.95,
    wholesalePrice: 72.00,
    storePrice: 65.00,
    description:
      "Caja de sobres de VSTAR Universe en coreano. Set especial premium con las mejores cartas VSTAR y Art Rare del formato.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-vstar-universe.jpg"],
    inStock: true,
    stock: 10,
    isNew: false,
    isFeatured: true,
    language: "KO",
    tags: ["vstar-universe", "koreano", "premium"],
    packsPerBox: 20,
  },
  {
    id: 3501,
    name: "Caja de Sobres — Snow Hazard (SV2P)",
    slug: "pokemon-kr-snow-hazard-box",
    price: 44.95,
    wholesalePrice: 36.00,
    storePrice: 32.00,
    description:
      "Caja de sobres de Snow Hazard en coreano. Pokémon de tipo hielo y cartas de la era Paldea.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-snow-hazard.webp"],
    inStock: true,
    stock: 3,
    isNew: false,
    isFeatured: false,
    language: "KO",
    tags: ["snow-hazard", "koreano"],
    packsPerBox: 20,
  },
  {
    id: 3503,
    name: "Caja de Sobres — White Flare (SV11W)",
    slug: "pokemon-kr-white-flare-box",
    price: 54.95,
    wholesalePrice: 44.00,
    storePrice: 40.00,
    description:
      "Caja de sobres de White Flare en coreano. Reshiram y Pokémon de tipo fuego/dragón premium.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-white-flare.webp"],
    inStock: true,
    stock: 17,
    isNew: false,
    isFeatured: false,
    language: "KO",
    tags: ["white-flare", "koreano"],
    packsPerBox: 20,
  },
  {
    id: 3505,
    name: "Caja de Sobres — Black Bolt (SV11B)",
    slug: "pokemon-kr-black-bolt-box",
    price: 54.95,
    wholesalePrice: 44.00,
    storePrice: 40.00,
    description:
      "Caja de sobres de Black Bolt en coreano. Pokémon eléctricos y de tipo rayo premium.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-black-bolt.webp"],
    inStock: true,
    stock: 17,
    isNew: false,
    isFeatured: false,
    language: "KO",
    tags: ["black-bolt", "koreano"],
    packsPerBox: 20,
  },
  {
    id: 3507,
    name: "Caja de Sobres — Raging Surf (SV4a)",
    slug: "pokemon-kr-raging-surf-box",
    price: 44.95,
    wholesalePrice: 36.00,
    storePrice: 32.00,
    description:
      "Caja de sobres de Raging Surf en coreano. Pokémon de tipo agua y oleaje salvaje con cartas Art Rare.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-raging-surf.webp", "/images/products/store/pokemon-kr-raging-surf-2.webp"],
    inStock: true,
    stock: 2,
    isNew: false,
    isFeatured: false,
    language: "KO",
    tags: ["raging-surf", "koreano"],
    packsPerBox: 20,
  },
  {
    id: 3510,
    name: "Caja de Sobres — Mega Brave (SV5K)",
    slug: "pokemon-kr-mega-brave-box",
    price: 44.95,
    wholesalePrice: 36.00,
    storePrice: 32.00,
    description:
      "Caja de sobres de Mega Brave en coreano. Pokémon valientes con mecánicas de combate premium.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-mega-brave.webp"],
    inStock: true,
    stock: 10,
    isNew: false,
    isFeatured: false,
    language: "KO",
    tags: ["mega-brave", "koreano"],
    packsPerBox: 20,
  },
  {
    id: 3512,
    name: "Caja de Sobres — Mega Symphonia (SV5M)",
    slug: "pokemon-kr-mega-symphonia-box",
    price: 44.95,
    wholesalePrice: 36.00,
    storePrice: 32.00,
    description:
      "Caja de sobres de Mega Symphonia en coreano. Pokémon melódicos con cartas Art Rare exclusivas.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-mega-symphonia.webp"],
    inStock: true,
    stock: 10,
    isNew: false,
    isFeatured: false,
    language: "KO",
    tags: ["mega-symphonia", "koreano"],
    packsPerBox: 20,
  },
  {
    id: 3514,
    name: "Caja de Sobres — Ancient Roar (SV4K)",
    slug: "pokemon-kr-ancient-roar-box",
    price: 44.95,
    wholesalePrice: 36.00,
    storePrice: 32.00,
    description:
      "Caja de sobres de Ancient Roar en coreano. Pokémon ancestrales con mecánicas Ancient y cartas premium.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-ancient-roar.webp"],
    inStock: true,
    stock: 2,
    isNew: false,
    isFeatured: false,
    language: "KO",
    tags: ["ancient-roar", "koreano"],
    packsPerBox: 20,
  },
  {
    id: 3517,
    name: "Caja de Sobres — Mega Inferno X",
    slug: "pokemon-kr-mega-inferno-x-box",
    price: 74.95,
    wholesalePrice: 60.00,
    storePrice: 54.00,
    description:
      "Caja de sobres de Mega Inferno X en coreano. Charizard y Pokémon de fuego con evoluciones mega premium.",
    category: "booster-box",
    game: "pokemon",
    images: ["/images/products/store/pokemon-kr-mega-inferno-x.webp"],
    inStock: true,
    stock: 13,
    isNew: false,
    isFeatured: false,
    language: "KO",
    tags: ["mega-inferno-x", "koreano", "charizard"],
    packsPerBox: 20,
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // TOPPS
  // ══════════════════════════════════════════════════════════════════════════════

  {
    id: 3221,
    name: "Topps Chrome NBA 2025/2026 — Megabox",
    slug: "topps-chrome-nba-2025-26-megabox",
    price: 89.95,
    wholesalePrice: 72.00,
    storePrice: 65.00,
    description:
      "Megabox de Topps Chrome NBA 2025/2026. Cartas cromadas de las estrellas de la NBA con acabado premium y refractores exclusivos.",
    category: "cajas",
    game: "topps",
    images: ["/images/products/store/topps-chrome-nba-megabox.webp"],
    inStock: true,
    stock: 20,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["chrome", "nba", "megabox"],
  },
  {
    id: 3223,
    name: "Topps Chrome NBA 2025/2026 — Value Box",
    slug: "topps-chrome-nba-2025-26-value-box",
    price: 55.00,
    wholesalePrice: 44.00,
    storePrice: 40.00,
    description:
      "Value Box de Topps Chrome NBA 2025/2026. Formato más económico con cartas cromadas de las estrellas de la NBA.",
    category: "cajas",
    game: "topps",
    images: ["/images/products/store/topps-chrome-nba-valuebox.webp"],
    inStock: true,
    stock: 2,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["chrome", "nba", "value-box"],
  },
  {
    id: 3225,
    name: "Topps Disney Wonder 2025 — Jumbo Value Pack",
    slug: "topps-disney-wonder-2025-jumbo-value-pack",
    price: 7.49,
    wholesalePrice: 6.00,
    storePrice: 5.40,
    description:
      "Jumbo Value Pack de Topps Disney Wonder 2025. Colección de cromos con los personajes más queridos de Disney.",
    category: "sobres",
    game: "topps",
    images: ["/images/products/store/topps-disney-wonder.webp"],
    inStock: true,
    stock: 56,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["disney", "wonder", "cromos"],
  },
  {
    id: 3365,
    name: "Topps Merlin Season 2024/25 — Caja",
    slug: "topps-merlin-2024-25-box",
    price: 29.95,
    wholesalePrice: 24.00,
    storePrice: 21.50,
    description:
      "Caja de Topps Merlin Season 2024/25. Cromos de fútbol europeo con jugadores de las mejores ligas del mundo.",
    category: "cajas",
    game: "topps",
    images: ["/images/products/store/topps-merlin-2024-25.webp"],
    inStock: true,
    stock: 34,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["merlin", "futbol", "cromos"],
  },
  {
    id: 3448,
    name: "Topps Lata Real Madrid Collector Tin 2025-2026",
    slug: "topps-lata-real-madrid-2025-26",
    price: 22.49,
    wholesalePrice: 18.00,
    storePrice: 16.00,
    description:
      "Lata coleccionable de Real Madrid Topps 2025-2026. Incluye sobres exclusivos y cartas especiales del equipo blanco.",
    category: "latas",
    game: "topps",
    images: ["/images/products/store/topps-lata-real-madrid.webp", "/images/products/store/topps-lata-real-madrid-2.webp", "/images/products/store/topps-lata-real-madrid-3.webp"],
    inStock: true,
    stock: 25,
    isNew: true,
    createdAt: "2026-03-15",
    isFeatured: true,
    language: "ES",
    tags: ["real-madrid", "lata", "futbol"],
  },
  {
    id: 3452,
    name: "Topps Lata FC Barcelona Collector Tin 2025-2026",
    slug: "topps-lata-barca-2025-26",
    price: 22.49,
    wholesalePrice: 18.00,
    storePrice: 16.00,
    description:
      "Lata coleccionable de FC Barcelona Topps 2025-2026. Incluye sobres exclusivos y cartas especiales del Barça.",
    category: "latas",
    game: "topps",
    images: ["/images/products/store/topps-lata-barca.webp", "/images/products/store/topps-lata-barca-2.webp", "/images/products/store/topps-lata-barca-3.webp"],
    inStock: true,
    stock: 15,
    isNew: true,
    createdAt: "2026-03-15",
    isFeatured: true,
    language: "ES",
    tags: ["barcelona", "lata", "futbol"],
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // PANINI
  // ══════════════════════════════════════════════════════════════════════════════

  {
    id: 3333,
    name: "Panini Marvel Anthology Official Trading Card Treasure Box",
    slug: "panini-marvel-anthology-treasure-box",
    price: 139.95,
    wholesalePrice: 112.00,
    storePrice: 102.00,
    description:
      "Treasure Box oficial de Marvel Anthology de Panini. Colección premium con cartas de los superhéroes más icónicos de Marvel en formato treasure box.",
    category: "cajas",
    game: "panini",
    images: ["/images/products/store/panini-marvel-anthology.webp", "/images/products/store/panini-marvel-anthology-2.webp", "/images/products/store/panini-marvel-anthology-3.webp", "/images/products/store/panini-marvel-anthology-4.webp"],
    inStock: true,
    stock: 5,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["marvel", "anthology", "treasure-box"],
  },
  {
    id: 3339,
    name: "Panini Tributo Andres Iniesta — Box Premium",
    slug: "panini-tributo-iniesta-box",
    price: 299.95,
    wholesalePrice: 240.00,
    storePrice: 220.00,
    description:
      "Box Premium Tributo a Andrés Iniesta de Panini. Edición coleccionista de homenaje al legendario centrocampista español con cartas exclusivas numeradas.",
    category: "cajas",
    game: "panini",
    images: ["/images/products/store/panini-tributo-iniesta.webp", "/images/products/store/panini-tributo-iniesta-2.webp"],
    inStock: true,
    stock: 5,
    isNew: false,
    isFeatured: true,
    language: "ES",
    tags: ["tributo", "iniesta", "premium", "futbol"],
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // ACCESORIOS — Proteccion y Tapetes
  // ══════════════════════════════════════════════════════════════════════════════

  {
    id: 3064,
    name: "Blister Toploader (25 unidades)",
    slug: "blister-toploader-25",
    price: 4.49,
    wholesalePrice: 3.50,
    storePrice: 3.00,
    description:
      "Pack de 25 toploaders transparentes para protección de cartas. Compatible con cartas estándar de Pokémon, Magic, Yu-Gi-Oh! y más.",
    category: "toploaders",
    game: "accesorios",
    images: ["/images/products/store/toploader-25.jpg"],
    inStock: true,
    stock: 36,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["toploader", "proteccion", "accesorio"],
  },
  {
    id: 3243,
    name: "Penny Sleeves — Fundas Basicas",
    slug: "penny-sleeves-basicas",
    price: 1.99,
    wholesalePrice: 1.50,
    storePrice: 1.20,
    description:
      "Fundas básicas penny sleeves para protección de cartas. Ideales como primera capa de protección antes de toploader.",
    category: "sleeves",
    game: "accesorios",
    images: ["/images/products/store/penny-sleeves.webp"],
    inStock: true,
    stock: 37,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["penny-sleeves", "proteccion", "accesorio"],
  },
  {
    id: 3345,
    name: "Ultra PRO Playmat Double Sided — Final Fantasy (Clive & Ifrit)",
    slug: "ultra-pro-playmat-ff-double-sided",
    price: 39.95,
    wholesalePrice: 32.00,
    storePrice: 29.00,
    description:
      "Tapete de juego de doble cara Ultra PRO de Magic x Final Fantasy. Un lado con Clive y otro con Ifrit. Material premium antideslizante.",
    category: "playmats",
    game: "magic",
    images: ["/images/products/store/playmat-ff-double-sided.webp"],
    inStock: true,
    stock: 38,
    isNew: true,
    createdAt: "2026-03-01",
    isFeatured: false,
    language: "EN",
    tags: ["playmat", "final-fantasy", "ultra-pro", "double-sided"],
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // ACCESORIOS — Dragon Shield Matte Sleeves (100 fundas) — 11.95 c/u
  // ══════════════════════════════════════════════════════════════════════════════

  {
    id: 3521,
    name: "Dragon Shield Matte Dual Fury — 100 Fundas",
    slug: "dragon-shield-matte-dual-fury-100",
    price: 11.95,
    wholesalePrice: 9.50,
    storePrice: 8.50,
    description:
      "100 fundas Dragon Shield Matte Dual Fury. Protección premium con acabado mate dual en tonos de furia. Compatible con cartas estándar.",
    category: "sleeves",
    game: "accesorios",
    images: ["/images/products/store/ds-matte-dual-fury.webp", "/images/products/store/ds-matte-dual-fury-sleeves.webp"],
    inStock: true,
    stock: 39,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["dragon-shield", "matte", "dual", "fury", "sleeves"],
  },
  {
    id: 3525,
    name: "Dragon Shield Matte Dual Crypt — 100 Fundas",
    slug: "dragon-shield-matte-dual-crypt-100",
    price: 11.95,
    wholesalePrice: 9.50,
    storePrice: 8.50,
    description:
      "100 fundas Dragon Shield Matte Dual Crypt. Protección premium con acabado mate dual en tonos oscuros de cripta.",
    category: "sleeves",
    game: "accesorios",
    images: ["/images/products/store/ds-matte-dual-crypt.webp", "/images/products/store/ds-matte-dual-crypt-sleeves.webp"],
    inStock: true,
    stock: 40,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["dragon-shield", "matte", "dual", "crypt", "sleeves"],
  },
  {
    id: 3528,
    name: "Dragon Shield Matte Dual Power — 100 Fundas",
    slug: "dragon-shield-matte-dual-power-100",
    price: 11.95,
    wholesalePrice: 9.50,
    storePrice: 8.50,
    description:
      "100 fundas Dragon Shield Matte Dual Power. Protección premium con acabado mate dual en tonos de poder.",
    category: "sleeves",
    game: "accesorios",
    images: ["/images/products/store/ds-matte-dual-power.webp", "/images/products/store/ds-matte-dual-power-sleeves.webp"],
    inStock: true,
    stock: 25,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["dragon-shield", "matte", "dual", "power", "sleeves"],
  },
  {
    id: 3531,
    name: "Dragon Shield Matte Sparkles Pink Sapphire — 100 Fundas",
    slug: "dragon-shield-matte-pink-sapphire-100",
    price: 11.95,
    wholesalePrice: 9.50,
    storePrice: 8.50,
    description:
      "100 fundas Dragon Shield Matte Sparkles Pink Sapphire. Acabado mate con destellos de zafiro rosa.",
    category: "sleeves",
    game: "accesorios",
    images: ["/images/products/store/ds-matte-pink-sapphire.webp", "/images/products/store/ds-matte-pink-sapphire-sleeves.webp"],
    inStock: true,
    stock: 26,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["dragon-shield", "matte", "sparkles", "pink-sapphire", "sleeves"],
  },
  {
    id: 3534,
    name: "Dragon Shield Matte Sparkles Amazonite — 100 Fundas",
    slug: "dragon-shield-matte-amazonite-100",
    price: 11.95,
    wholesalePrice: 9.50,
    storePrice: 8.50,
    description:
      "100 fundas Dragon Shield Matte Sparkles Amazonite. Acabado mate con destellos de amazonita verde.",
    category: "sleeves",
    game: "accesorios",
    images: ["/images/products/store/ds-matte-amazonite.webp", "/images/products/store/ds-matte-amazonite-sleeves.webp"],
    inStock: true,
    stock: 27,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["dragon-shield", "matte", "sparkles", "amazonite", "sleeves"],
  },
  {
    id: 3537,
    name: "Dragon Shield Matte Orange — 100 Fundas",
    slug: "dragon-shield-matte-orange-100",
    price: 11.95,
    wholesalePrice: 9.50,
    storePrice: 8.50,
    description:
      "100 fundas Dragon Shield Matte Orange. Protección premium con acabado mate naranja clásico.",
    category: "sleeves",
    game: "accesorios",
    images: ["/images/products/store/ds-matte-orange.webp", "/images/products/store/ds-matte-orange-sleeves.webp"],
    inStock: true,
    stock: 28,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["dragon-shield", "matte", "orange", "sleeves"],
  },
  {
    id: 3540,
    name: "Dragon Shield Matte Silver — 100 Fundas",
    slug: "dragon-shield-matte-silver-100",
    price: 11.95,
    wholesalePrice: 9.50,
    storePrice: 8.50,
    description:
      "100 fundas Dragon Shield Matte Silver. Protección premium con acabado mate plateado clásico.",
    category: "sleeves",
    game: "accesorios",
    images: ["/images/products/store/ds-matte-silver.webp", "/images/products/store/ds-matte-silver-sleeves.webp"],
    inStock: true,
    stock: 29,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["dragon-shield", "matte", "silver", "sleeves"],
  },
  {
    id: 3543,
    name: "Dragon Shield Matte Apple Green — 100 Fundas",
    slug: "dragon-shield-matte-apple-green-100",
    price: 11.95,
    wholesalePrice: 9.50,
    storePrice: 8.50,
    description:
      "100 fundas Dragon Shield Matte Apple Green. Protección premium con acabado mate verde manzana.",
    category: "sleeves",
    game: "accesorios",
    images: ["/images/products/store/ds-matte-apple-green.webp", "/images/products/store/ds-matte-apple-green-sleeves.webp"],
    inStock: true,
    stock: 30,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["dragon-shield", "matte", "apple-green", "sleeves"],
  },
  {
    id: 3546,
    name: "Dragon Shield Matte Dual Justice — 100 Fundas",
    slug: "dragon-shield-matte-dual-justice-100",
    price: 11.95,
    wholesalePrice: 9.50,
    storePrice: 8.50,
    description:
      "100 fundas Dragon Shield Matte Dual Justice. Protección premium con acabado mate dual en tonos de justicia.",
    category: "sleeves",
    game: "accesorios",
    images: ["/images/products/store/ds-matte-dual-justice.webp", "/images/products/store/ds-matte-dual-justice-sleeves.webp"],
    inStock: true,
    stock: 31,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["dragon-shield", "matte", "dual", "justice", "sleeves"],
  },
  {
    id: 3549,
    name: "Dragon Shield Matte Dual Soul — 100 Fundas",
    slug: "dragon-shield-matte-dual-soul-100",
    price: 11.95,
    wholesalePrice: 9.50,
    storePrice: 8.50,
    description:
      "100 fundas Dragon Shield Matte Dual Soul. Protección premium con acabado mate dual en tonos de alma.",
    category: "sleeves",
    game: "accesorios",
    images: ["/images/products/store/ds-matte-dual-soul.webp", "/images/products/store/ds-matte-dual-soul-sleeves.webp"],
    inStock: true,
    stock: 32,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["dragon-shield", "matte", "dual", "soul", "sleeves"],
  },
  {
    id: 3552,
    name: "Dragon Shield Matte Ivory — 100 Fundas",
    slug: "dragon-shield-matte-ivory-100",
    price: 11.95,
    wholesalePrice: 9.50,
    storePrice: 8.50,
    description:
      "100 fundas Dragon Shield Matte Ivory. Protección premium con acabado mate marfil elegante.",
    category: "sleeves",
    game: "accesorios",
    images: ["/images/products/store/ds-matte-ivory.webp", "/images/products/store/ds-matte-ivory-sleeves.webp"],
    inStock: true,
    stock: 33,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["dragon-shield", "matte", "ivory", "sleeves"],
  },
  {
    id: 3555,
    name: "Dragon Shield Matte Gold — 100 Fundas",
    slug: "dragon-shield-matte-gold-100",
    price: 11.95,
    wholesalePrice: 9.50,
    storePrice: 8.50,
    description:
      "100 fundas Dragon Shield Matte Gold. Protección premium con acabado mate dorado clásico.",
    category: "sleeves",
    game: "accesorios",
    images: ["/images/products/store/ds-matte-gold.webp", "/images/products/store/ds-matte-gold-sleeves.webp"],
    inStock: true,
    stock: 34,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["dragon-shield", "matte", "gold", "sleeves"],
  },
  {
    id: 3558,
    name: "Dragon Shield Matte Crimson — 100 Fundas",
    slug: "dragon-shield-matte-crimson-100",
    price: 11.95,
    wholesalePrice: 9.50,
    storePrice: 8.50,
    description:
      "100 fundas Dragon Shield Matte Crimson. Protección premium con acabado mate carmesí intenso.",
    category: "sleeves",
    game: "accesorios",
    images: ["/images/products/store/ds-matte-crimson.webp", "/images/products/store/ds-matte-crimson-sleeves.webp"],
    inStock: true,
    stock: 35,
    isNew: true,
    createdAt: "2026-04-01",
    isFeatured: false,
    language: "EN",
    tags: ["dragon-shield", "matte", "crimson", "sleeves"],
  },
];

// ─── Helper functions ─────────────────────────────────────────────────────────

export function getProductsByGame(game: string): LocalProduct[] {
  return PRODUCTS.filter((p) => p.game === game);
}

export function getProductsByGameAndCategory(
  game: string,
  category: string,
): LocalProduct[] {
  if (category === "accesorios") {
    return PRODUCTS.filter((p) => p.game === game && ACCESSORY_CATEGORIES.has(p.category));
  }
  return PRODUCTS.filter((p) => p.game === game && p.category === category);
}

export function getProductBySlug(slug: string): LocalProduct | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

// Categories that are individual TCG cards — excluded from general grids
export const CARD_CATEGORIES = new Set([
  "singles",
  "foil",
  "enchanted",
  "starlight",
  "prize-cards",
  "alternate-art",
  "secret-lair",
  "gradeadas",
  "scr",
  "field-centers",
]);

const isNotCard = (p: LocalProduct) => !CARD_CATEGORIES.has(p.category);

export function getFeaturedProducts(limit = 8): LocalProduct[] {
  return PRODUCTS.filter((p) => p.isFeatured && isNotCard(p)).slice(0, limit);
}

export function getNewProducts(limit = 8): LocalProduct[] {
  return PRODUCTS.filter(
    (p) => isNewProduct(p) && p.inStock && isNotCard(p),
  ).slice(0, limit);
}

export function getProductsByGameFeatured(
  game: string,
  limit = 4,
): LocalProduct[] {
  const gameProducts = getProductsByGame(game).filter(isNotCard);
  const featured = gameProducts.filter((p) => p.isFeatured);
  return featured.length >= limit
    ? featured.slice(0, limit)
    : gameProducts.slice(0, limit);
}

export function getAllCategories(game: string): string[] {
  const raw = new Set(
    PRODUCTS.filter((p) => p.game === game).map((p) => p.category),
  );
  // Merge accessory categories into one "accesorios" pill
  let hasAccessory = false;
  const cats: string[] = [];
  for (const c of raw) {
    if (ACCESSORY_CATEGORIES.has(c)) { hasAccessory = true; }
    else { cats.push(c); }
  }
  if (hasAccessory) cats.push("accesorios");
  // Sort by defined order
  return cats.sort(
    (a, b) => (CATEGORY_ORDER[a] ?? 50) - (CATEGORY_ORDER[b] ?? 50),
  );
}
