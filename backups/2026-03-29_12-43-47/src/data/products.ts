// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocalProduct {
  id: number;
  name: string;
  slug: string;
  price: number; // PVP General (precio público, visible a todos)
  comparePrice?: number; // precio tachado (precio antes del descuento)
  wholesalePrice: number; // PVP Mayoristas — solo visible para rol "mayorista"
  storePrice: number; // PVP Tiendas TCG — solo visible para rol "tienda"
  shortDescription: string;
  description: string;
  category: string; // slug de categoría: 'booster-box', 'singles', etc.
  game: string; // slug del juego: 'magic', 'pokemon', etc.
  images: string[]; // URLs de imagen — vacío = muestra placeholder
  inStock: boolean;
  isNew: boolean;
  createdAt?: string; // ISO date — used for "Nuevo" badge (45-day window)
  isFeatured?: boolean;
  language: string; // 'EN' | 'ES' | 'JP' | 'FR' | 'DE' | 'IT' | 'KO' | 'PT'
  // language?: string reserved for filtering — see memory/project_language_requirement.md
  tags: string[];
  vatRate?: number; // IVA en porcentaje (21 por defecto para TCG en España)
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
  magic: {
    name: "Magic: The Gathering",
    color: "#7c3aed",
    bgColor: "#ede9fe",
    description:
      "Booster Boxes, Commander Decks, singles y accesorios del TCG más veterano del mundo.",
    emoji: "🧙",
  },
  pokemon: {
    name: "Pokémon TCG",
    color: "#f59e0b",
    bgColor: "#fef3c7",
    description:
      "Cartas, sobres, ETBs y colecciones del juego de cartas Pokémon.",
    emoji: "⚡",
  },
  "one-piece": {
    name: "One Piece Card Game",
    color: "#dc2626",
    bgColor: "#fee2e2",
    description:
      "Booster Boxes, Starter Decks y singles del juego de cartas One Piece.",
    emoji: "⛵",
  },
  riftbound: {
    name: "Riftbound",
    color: "#0f766e",
    bgColor: "#ccfbf1",
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
    name: "Dragon Ball Super CG",
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
    name: "Naruto Mythos TCG",
    color: "#ea580c",
    bgColor: "#ffedd5",
    description: "El nuevo TCG de Naruto. Primera expansión: Konoha Shidō.",
    emoji: "🍃",
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
  sleeves: "Fundas (Sleeves)",
  playmats: "Tapetes (Playmats)",
  carpetas: "Carpetas y Portfolios",
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
  especiales: "Cartas Especiales",
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
  EN: "🇬🇧",
  ES: "🇪🇸",
  JP: "🇯🇵",
  FR: "🇫🇷",
  DE: "🇩🇪",
  IT: "🇮🇹",
  KO: "🇰🇷",
  PT: "🇧🇷",
};

export const LANGUAGE_NAMES: Record<string, string> = {
  ES: "Español",
  EN: "Inglés",
  JP: "Japonés",
  FR: "Francés",
  DE: "Alemán",
  IT: "Italiano",
  KO: "Coreano",
  PT: "Portugués",
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const PRODUCTS: LocalProduct[] = [
  // ══════════════════════════════════════════════════════════
  // MAGIC: THE GATHERING
  // ══════════════════════════════════════════════════════════

  {
    id: 10001,
    name: "Bloomburrow Draft Booster Display (36 sobres)",
    slug: "magic-bloomburrow-draft-booster-display",
    price: 99.95,
    comparePrice: 109.95,
    wholesalePrice: 81.96,
    storePrice: 74.96,
    shortDescription:
      "36 sobres de la expansión Bloomburrow con 15 cartas cada uno.",
    description:
      "Bloomburrow sumerge a los jugadores en un mundo antropomórfico habitado por animales. Cada display contiene 36 sobres Draft Booster con 15 cartas cada uno, incluyendo al menos 1 carta rara o mítica por sobre. Ideal para torneos FNM y sesiones de Draft con amigos.",
    category: "booster-box",
    game: "magic",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["bloomburrow", "draft", "display"],
  },
  {
    id: 10002,
    name: "Bloomburrow Collector Booster Display (12 sobres)",
    slug: "magic-bloomburrow-collector-booster-display",
    price: 249.95,
    comparePrice: 269.95,
    wholesalePrice: 204.96,
    storePrice: 187.46,
    shortDescription:
      "12 sobres Collector con las versiones más raras y premium de Bloomburrow.",
    description:
      "Los Collector Boosters de Bloomburrow están repletos de cartas en versiones premium: foil, borderless, extended art y más. Cada sobre garantiza múltiples raras y míticas en acabados especiales. Para coleccionistas que quieren lo mejor.",
    category: "booster-box",
    game: "magic",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["bloomburrow", "collector", "foil", "premium"],
  },
  {
    id: 10003,
    name: "Duskmourn: House of Horror Draft Booster Display",
    slug: "magic-duskmourn-draft-booster-display",
    price: 99.95,
    wholesalePrice: 81.96,
    storePrice: 74.96,
    shortDescription:
      "36 sobres de la expansión de terror Duskmourn: House of Horror.",
    description:
      "Duskmourn: House of Horror es la expansión de terror de Magic. Inspirada en el horror moderno, incluye mecánicas nuevas como Rooms y Manifest Dread. Cada display contiene 36 sobres Draft Booster con cartas exclusivas de este universo.",
    category: "booster-box",
    game: "magic",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["duskmourn", "terror", "draft"],
  },
  {
    id: 10004,
    name: "Foundations Booster Display (36 sobres)",
    slug: "magic-foundations-booster-display",
    price: 94.95,
    wholesalePrice: 77.86,
    storePrice: 71.21,
    shortDescription:
      "Set de entrada de Magic con las cartas más icónicas del juego.",
    description:
      "Magic: The Gathering Foundations reúne las mejores cartas de la historia del juego, diseñado para nuevos jugadores y veteranos. Incluye clásicos reprints y nuevas ilustraciones. 36 sobres con 15 cartas cada uno.",
    category: "booster-box",
    game: "magic",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: true,
    language: "EN",
    tags: ["foundations", "entrada", "reprints"],
  },
  {
    id: 10005,
    name: "Modern Horizons 3 Draft Booster Display",
    slug: "magic-modern-horizons-3-draft-booster-display",
    price: 154.95,
    comparePrice: 179.95,
    wholesalePrice: 127.06,
    storePrice: 116.21,
    shortDescription: "36 sobres del set más potente para el formato Modern.",
    description:
      "Modern Horizons 3 introduce cartas poderosas directamente al formato Modern. Con mecánicas de Energy de vuelta, cartas Eldrazi y nuevas criaturas de alto impacto competitivo. Un must para jugadores de torneos.",
    category: "booster-box",
    game: "magic",
    images: [],
    inStock: false,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["modern-horizons", "modern", "competitivo"],
  },
  {
    id: 10006,
    name: "Bloomburrow Bundle",
    slug: "magic-bloomburrow-bundle",
    price: 39.95,
    wholesalePrice: 32.76,
    storePrice: 29.96,
    shortDescription:
      "9 sobres Set Booster + accesorios exclusivos de Bloomburrow.",
    description:
      "El Bundle de Bloomburrow incluye 9 sobres Set Booster, 1 sobre Collector especial, 40 tierras básicas en versión full art, una caja para guardar cartas y dados especiales de Bloomburrow.",
    category: "bundles",
    game: "magic",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["bloomburrow", "bundle"],
  },
  {
    id: 10007,
    name: "Commander Deck Bloomburrow — Peace Offering",
    slug: "magic-commander-deck-bloomburrow-peace-offering",
    price: 44.95,
    wholesalePrice: 36.86,
    storePrice: 33.71,
    shortDescription: "Mazo Commander de 100 cartas con el comandante Zinnia.",
    description:
      "Peace Offering es uno de los 4 mazos Commander de Bloomburrow. Comandado por Zinnia, Champion of Bristlebay, este mazo de 100 cartas incluye nuevas cartas exclusivas de Commander y cartas reimpresiones cuidadosamente seleccionadas.",
    category: "commander",
    game: "magic",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["commander", "bloomburrow", "zinnia"],
  },
  {
    id: 10008,
    name: "Commander Deck Bloomburrow — Squirreled Away",
    slug: "magic-commander-deck-bloomburrow-squirreled-away",
    price: 44.95,
    wholesalePrice: 36.86,
    storePrice: 33.71,
    shortDescription:
      "Mazo Commander temático de ardillas con Hazel como comandante.",
    description:
      "Squirreled Away es el mazo Commander más caótico de Bloomburrow. Con Hazel, Warden of Whiskerwood como comandante, este mazo lleva las criaturas de ardilla a un nivel competitivo con sinergias únicas.",
    category: "commander",
    game: "magic",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["commander", "bloomburrow", "ardillas"],
  },
  {
    id: 10009,
    name: "Commander Deck Duskmourn — Endless Punishment",
    slug: "magic-commander-deck-duskmourn-endless-punishment",
    price: 44.95,
    wholesalePrice: 36.86,
    storePrice: 33.71,
    shortDescription: "Mazo Commander de terror centrado en daño y sacrificio.",
    description:
      "Endless Punishment es el mazo Commander negro/rojo de Duskmourn. Comandado por Miriam, Herd Whisperer, se enfoca en hacer daño continuo y sacrificar criaturas para potenciar al comandante.",
    category: "commander",
    game: "magic",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["commander", "duskmourn", "terror"],
  },
  {
    id: 10010,
    name: "Orcish Bowmasters — Borderless (LTR)",
    slug: "magic-orcish-bowmasters-borderless-ltr",
    price: 44.95,
    wholesalePrice: 36.86,
    storePrice: 33.71,
    shortDescription:
      "Una de las cartas más jugadas en Legacy, Vintage y Commander.",
    description:
      "Orcish Bowmasters es la carta más impactante de Lord of the Rings: Tales of Middle-earth. Versión borderless con ilustración extendida. Esencial en Legacy, Vintage y Commander por su capacidad de generar tokens y dañar al oponente por cada carta que robe.",
    category: "singles",
    game: "magic",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["lotr", "legacy", "vintage", "staple"],
  },
  {
    id: 10011,
    name: "Dragon Shield Matte Sleeves 100 uds — Black",
    slug: "magic-dragon-shield-matte-black-100",
    price: 9.95,
    wholesalePrice: 8.16,
    storePrice: 7.46,
    shortDescription: "Las fundas más vendidas para cartas Magic.",
    description:
      "Dragon Shield Matte en negro, el estándar del sector para proteger tus cartas Magic. 100 fundas de tamaño estándar (63,5 × 88 mm), textura mate antirreflectante para mejor sujeción.",
    category: "sleeves",
    game: "magic",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "ES",
    tags: ["sleeves", "dragon-shield", "fundas"],
  },
  {
    id: 10012,
    name: "Ultra PRO Playmat Magic — Bloomburrow",
    slug: "magic-ultra-pro-playmat-bloomburrow",
    price: 24.95,
    wholesalePrice: 20.46,
    storePrice: 18.71,
    shortDescription:
      "Tapete oficial de juego con arte de la expansión Bloomburrow.",
    description:
      "Tapete de juego oficial Ultra PRO con el arte promocional de Bloomburrow. Material premium de tela suave, base antideslizante de goma. Dimensiones: 61 × 35 cm.",
    category: "playmats",
    game: "magic",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["playmat", "bloomburrow", "tapete"],
  },

  // ══════════════════════════════════════════════════════════
  // POKÉMON TCG
  // ══════════════════════════════════════════════════════════

  {
    id: 10021,
    name: "Pokémon Prismatic Evolutions Booster Display (36 sobres)",
    slug: "pokemon-prismatic-evolutions-booster-display",
    price: 134.95,
    comparePrice: 149.95,
    wholesalePrice: 110.66,
    storePrice: 101.21,
    shortDescription:
      "El set más esperado de 2025 con las evoluciones de Eevee.",
    description:
      "Prismatic Evolutions es la gran expansión de Pokémon TCG de enero 2025, centrada en Eevee y sus 8 evoluciones. Incluye nuevos Pokémon ex, cartas ilustradas especiales y las codiciadas cartas SAR (Special Art Rare). Cada display contiene 36 sobres con 10 cartas.",
    category: "booster-box",
    game: "pokemon",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: true,
    language: "EN",
    tags: ["prismatic-evolutions", "eevee", "2025"],
  },
  {
    id: 10022,
    name: "Pokémon Surging Sparks Booster Display (36 sobres)",
    slug: "pokemon-surging-sparks-booster-display",
    price: 119.95,
    wholesalePrice: 98.36,
    storePrice: 89.96,
    shortDescription:
      "36 sobres del set Surging Sparks con Pikachu ex como protagonista.",
    description:
      "Surging Sparks (Choque Estelar en Español) trae de vuelta a Pikachu como protagonista con nuevas cartas ex y cartas ilustradas de alta rareza. Mecánica ACE SPEC revisitada con nuevas cartas poderosas para el juego competitivo.",
    category: "booster-box",
    game: "pokemon",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["surging-sparks", "pikachu", "ex"],
  },
  {
    id: 10023,
    name: "Pokémon Scarlet & Violet 151 Booster Display",
    slug: "pokemon-scarlet-violet-151-booster-display",
    price: 139.95,
    comparePrice: 159.95,
    wholesalePrice: 114.76,
    storePrice: 104.96,
    shortDescription: "El set homenaje a los 151 Pokémon originales de Kanto.",
    description:
      "Scarlet & Violet 151 es uno de los sets más populares de la historia reciente del TCG de Pokémon. Con los 151 Pokémon originales de la región Kanto en versiones ex e ilustradas. Cartas SAR de Mew ex, Alakazam ex y otros clásicos muy cotizadas.",
    category: "booster-box",
    game: "pokemon",
    images: [],
    inStock: false,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["151", "kanto", "mew", "clasico"],
  },
  {
    id: 10024,
    name: "Pokémon Prismatic Evolutions Elite Trainer Box",
    slug: "pokemon-prismatic-evolutions-etb",
    price: 54.95,
    wholesalePrice: 45.06,
    storePrice: 41.21,
    shortDescription:
      "9 sobres + accesorios premium del set Prismatic Evolutions.",
    description:
      "La Elite Trainer Box de Prismatic Evolutions incluye: 9 sobres, 65 fundas de carta exclusivas con el arte de Eevee, dados de condición, marcador de daño y una guía del jugador. El regalo perfecto para fans de Eevee.",
    category: "etb",
    game: "pokemon",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: true,
    language: "EN",
    tags: ["etb", "prismatic-evolutions", "eevee"],
  },
  {
    id: 10025,
    name: "Pokémon Surging Sparks Elite Trainer Box",
    slug: "pokemon-surging-sparks-etb",
    price: 49.95,
    wholesalePrice: 40.96,
    storePrice: 37.46,
    shortDescription: "9 sobres + accesorios del set Surging Sparks.",
    description:
      "La ETB de Surging Sparks incluye 9 sobres, 65 fundas exclusivas con arte de Pikachu, dados de condición y marcadores de daño. Ideal como regalo o para empezar la colección de este popular set.",
    category: "etb",
    game: "pokemon",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["etb", "surging-sparks", "pikachu"],
  },
  {
    id: 10026,
    name: "Pokémon Stellar Crown Elite Trainer Box",
    slug: "pokemon-stellar-crown-etb",
    price: 49.95,
    wholesalePrice: 40.96,
    storePrice: 37.46,
    shortDescription: "ETB del set Stellar Crown con los Pokémon tipo Corona.",
    description:
      "Stellar Crown presenta a los Pokémon con marca Corona Estelar, una nueva mecánica visual. La ETB incluye 9 sobres, 65 fundas exclusivas y accesorios de juego. Un set muy buscado por los nuevos Pokémon ex de alta rareza.",
    category: "etb",
    game: "pokemon",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["etb", "stellar-crown"],
  },
  {
    id: 10027,
    name: "Pokémon Prismatic Evolutions Booster Pack (10 cartas)",
    slug: "pokemon-prismatic-evolutions-booster-pack",
    price: 5.99,
    wholesalePrice: 4.91,
    storePrice: 4.49,
    shortDescription: "Sobre individual de Prismatic Evolutions con 10 cartas.",
    description:
      "Sobre individual de la expansión Prismatic Evolutions. 10 cartas por sobre incluyendo al menos 1 reverse holo y posibilidad de cartas ex, Ultra Rare y SAR. El sobre del momento en el TCG Pokémon.",
    category: "sobres",
    game: "pokemon",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: false,
    language: "EN",
    tags: ["prismatic-evolutions", "sobre", "single-pack"],
  },
  {
    id: 10028,
    name: "Pokémon Surging Sparks Booster Pack (10 cartas)",
    slug: "pokemon-surging-sparks-booster-pack",
    price: 5.49,
    wholesalePrice: 4.5,
    storePrice: 4.12,
    shortDescription: "Sobre individual de Surging Sparks con 10 cartas.",
    description:
      "Sobre individual de Surging Sparks (Choque Estelar). 10 cartas con posibilidad de obtener las codiciadas cartas ex, Full Art y SAR del set.",
    category: "sobres",
    game: "pokemon",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["surging-sparks", "sobre"],
  },
  {
    id: 10029,
    name: "Charizard ex SAR — Prismatic Evolutions",
    slug: "pokemon-charizard-ex-sar-prismatic-evolutions",
    price: 79.95,
    wholesalePrice: 65.56,
    storePrice: 59.96,
    shortDescription:
      "La carta más buscada de Prismatic Evolutions. Charizard ex con arte especial.",
    description:
      "Charizard ex en versión Special Art Rare (SAR) de Prismatic Evolutions. Una de las cartas más codiciadas del 2025 en el TCG Pokémon. Arte ilustrado de alta calidad con Charizard en toda su majestuosidad. Carta en perfecto estado, nunca jugada.",
    category: "singles",
    game: "pokemon",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: true,
    language: "EN",
    tags: ["charizard", "sar", "prismatic-evolutions", "ex"],
  },
  {
    id: 10030,
    name: "Eevee ex SAR — Prismatic Evolutions",
    slug: "pokemon-eevee-ex-sar-prismatic-evolutions",
    price: 49.95,
    wholesalePrice: 40.96,
    storePrice: 37.46,
    shortDescription:
      "Eevee ex en versión Special Art Rare, la carta icono del set.",
    description:
      "Eevee ex SAR de Prismatic Evolutions con una ilustración espectacular a toda página. Una de las cartas más emblemáticas de la expansión. Muy buscada por coleccionistas y jugadores competitivos.",
    category: "singles",
    game: "pokemon",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: true,
    language: "EN",
    tags: ["eevee", "sar", "prismatic-evolutions", "ex"],
  },
  {
    id: 10031,
    name: "Mew ex SAR — Scarlet & Violet 151",
    slug: "pokemon-mew-ex-sar-151",
    price: 34.95,
    wholesalePrice: 28.66,
    storePrice: 26.21,
    shortDescription: "Mew ex en versión SAR del set 151. Carta muy popular.",
    description:
      "Mew ex en versión Special Art Rare del set Scarlet & Violet 151. Ilustración de Mew de alta calidad con fondo espacial. Muy jugada en el formato competitivo estándar como buscadora de cartas.",
    category: "singles",
    game: "pokemon",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["mew", "sar", "151", "ex", "competitivo"],
  },
  {
    id: 10032,
    name: "Pokémon Ultra PRO Standard Sleeves 65 uds",
    slug: "pokemon-ultra-pro-sleeves-65",
    price: 8.95,
    wholesalePrice: 7.34,
    storePrice: 6.71,
    shortDescription: "65 fundas estándar Ultra PRO con diseño Pokémon.",
    description:
      "Fundas de tamaño estándar para proteger tus cartas Pokémon. 65 unidades, compatibles con cartas de tamaño 63,5 × 88 mm. Diseño oficial con Pokébola en el reverso.",
    category: "sleeves",
    game: "pokemon",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "ES",
    tags: ["sleeves", "fundas", "pokemon", "ultra-pro"],
  },

  // ══════════════════════════════════════════════════════════
  // ONE PIECE CARD GAME
  // ══════════════════════════════════════════════════════════

  {
    id: 10041,
    name: "One Piece Card Game OP-09 — The Four Emperors Booster Box",
    slug: "one-piece-op09-four-emperors-booster-box",
    price: 89.95,
    wholesalePrice: 73.76,
    storePrice: 67.46,
    shortDescription:
      "24 sobres del set OP-09 con los Cuatro Emperadores del Mar.",
    description:
      "OP-09 The Four Emperors trae a los cuatro Yonkou al juego de cartas de One Piece. Incluye cartas de Shanks, Barbanegra, Big Mom y Kaidou en versiones exclusivas. Cada caja contiene 24 sobres con 12 cartas cada uno. Edición en inglés.",
    category: "booster-box",
    game: "one-piece",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: true,
    language: "EN",
    tags: ["op-09", "yonkou", "four-emperors"],
  },
  {
    id: 10042,
    name: "One Piece Card Game OP-08 — Two Legends Booster Box",
    slug: "one-piece-op08-two-legends-booster-box",
    price: 84.95,
    wholesalePrice: 69.66,
    storePrice: 63.71,
    shortDescription: "24 sobres del set OP-08 con Gol D. Roger y Whitebeard.",
    description:
      "OP-08 Two Legends celebra a los dos leyendas más grandes de One Piece: Gol D. Roger y Barbanegra en su época dorada. Incluye cartas Leader exclusivas y poderosas cartas de personajes del pasado.",
    category: "booster-box",
    game: "one-piece",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["op-08", "roger", "whitebeard", "leyendas"],
  },
  {
    id: 10043,
    name: "One Piece Card Game OP-10 — Royal Blood Booster Box",
    slug: "one-piece-op10-royal-blood-booster-box",
    price: 89.95,
    wholesalePrice: 73.76,
    storePrice: 67.46,
    shortDescription:
      "24 sobres del set OP-10 enfocado en la nobleza del mundo de One Piece.",
    description:
      "OP-10 Royal Blood explora la aristocracia del mundo de One Piece: los Celestiales, los Nobles Mundiales y los reyes de las naciones. Nuevas mecánicas y cartas Leader de alto impacto competitivo.",
    category: "booster-box",
    game: "one-piece",
    images: [],
    inStock: false,
    isNew: true,
    isFeatured: false,
    language: "EN",
    tags: ["op-10", "royal-blood"],
  },
  {
    id: 10044,
    name: "One Piece ST-21 Starter Deck — Hody Jones",
    slug: "one-piece-st21-starter-deck-hody-jones",
    price: 13.95,
    wholesalePrice: 11.44,
    storePrice: 10.46,
    shortDescription: "Mazo inicial de 51 cartas con Hody Jones como líder.",
    description:
      "El Starter Deck ST-21 de Hody Jones es perfecto para nuevos jugadores. 51 cartas preseleccionadas con una estrategia de tributo y poder del Mar Profundo. Incluye cartas de personajes de Fish-Man Island.",
    category: "starter",
    game: "one-piece",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["st-21", "hody-jones", "starter"],
  },
  {
    id: 10045,
    name: "One Piece ST-20 Starter Deck — Three Brothers",
    slug: "one-piece-st20-three-brothers",
    price: 13.95,
    wholesalePrice: 11.44,
    storePrice: 10.46,
    shortDescription:
      "Mazo de 51 cartas con la sinergia de los Hermanos Portgas.",
    description:
      "Three Brothers es uno de los Starter Decks más queridos por los fans: Ace, Sabo y Luffy trabajando juntos. 51 cartas con sinergias basadas en los tres hermanos. Ideal como regalo para fans del anime.",
    category: "starter",
    game: "one-piece",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["st-20", "ace", "sabo", "luffy", "starter"],
  },
  {
    id: 10046,
    name: "Gear 5 Luffy — OP-05 Secret Rare",
    slug: "one-piece-gear5-luffy-op05-secret-rare",
    price: 89.95,
    comparePrice: 119.95,
    wholesalePrice: 73.76,
    storePrice: 67.46,
    shortDescription: "La carta más icónica de One Piece TCG. Luffy en Gear 5.",
    description:
      "Luffy en su forma Gear 5 del set OP-05 Awakening of the New Era en versión Secret Rare. Con el arte más espectacular del juego, esta carta es la más buscada por coleccionistas y un must en mazos competitivos.",
    category: "singles",
    game: "one-piece",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["luffy", "gear-5", "secret-rare", "op-05"],
  },
  {
    id: 10047,
    name: "One Piece Double Pack Set Vol.8",
    slug: "one-piece-double-pack-vol8",
    price: 12.95,
    wholesalePrice: 10.62,
    storePrice: 9.71,
    shortDescription: "Pack de 2 sobres con cartas exclusivas de la serie.",
    description:
      "El Double Pack Vol.8 incluye 2 sobres booster de One Piece Card Game más una carta promo exclusiva de Shanks o Barbanegra (aleatoria). Una forma económica de completar la colección.",
    category: "double-packs",
    game: "one-piece",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: false,
    language: "EN",
    tags: ["double-pack", "promo"],
  },

  // ══════════════════════════════════════════════════════════
  // RIFTBOUND (LEAGUE OF LEGENDS TCG)
  // ══════════════════════════════════════════════════════════

  {
    id: 10056,
    name: "Riftbound: Foundations Booster Box (24 sobres)",
    slug: "riftbound-foundations-booster-box",
    price: 79.95,
    wholesalePrice: 65.56,
    storePrice: 59.96,
    shortDescription:
      "24 sobres del set fundacional del TCG de League of Legends.",
    description:
      "Riftbound es el juego de cartas oficial de League of Legends desarrollado por Riot Games. El set Foundations introduce a los campeones más icónicos: Jinx, Vi, Lux, Garen y más. Mecánicas de combate únicas derivadas del juego de video.",
    category: "booster-box",
    game: "riftbound",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: true,
    language: "EN",
    tags: ["foundations", "lol", "riot"],
  },
  {
    id: 10057,
    name: "Riftbound: Noxus Rising Booster Box (24 sobres)",
    slug: "riftbound-noxus-rising-booster-box",
    price: 79.95,
    wholesalePrice: 65.56,
    storePrice: 59.96,
    shortDescription:
      "24 sobres del segundo set de Riftbound enfocado en Noxus.",
    description:
      "Noxus Rising expande el universo de Riftbound con el poderoso Imperio Noxus. Nuevos campeones como Darius, Draven y Swain. Mecánicas de Dominación Noxiana que potencian el estilo de juego agresivo.",
    category: "booster-box",
    game: "riftbound",
    images: [],
    inStock: false,
    isNew: true,
    isFeatured: false,
    language: "EN",
    tags: ["noxus", "darius", "draven"],
  },
  {
    id: 10058,
    name: "Riftbound Starter Deck — Jinx & Vi",
    slug: "riftbound-starter-deck-jinx-vi",
    price: 19.95,
    wholesalePrice: 16.36,
    storePrice: 14.96,
    shortDescription: "Mazo inicial con Jinx y Vi como campeones principales.",
    description:
      "El Starter Deck Jinx & Vi de Riftbound es perfecto para descubrir el juego. 60 cartas construidas en torno al caos de Jinx y la brutalidad de Vi. Incluye ruleset de aprendizaje y guía de jugabilidad.",
    category: "starter",
    game: "riftbound",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: true,
    language: "EN",
    tags: ["jinx", "vi", "starter", "arcane"],
  },
  {
    id: 10059,
    name: "Riftbound Starter Deck — Lux & Garen",
    slug: "riftbound-starter-deck-lux-garen",
    price: 19.95,
    wholesalePrice: 16.36,
    storePrice: 14.96,
    shortDescription: "Mazo inicial de Demacia con Lux y Garen.",
    description:
      "El Starter Deck Lux & Garen representa el poderoso reino de Demacia. 60 cartas con estrategia defensiva y contraataque. Con el honor de Demacia como mecánica central.",
    category: "starter",
    game: "riftbound",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: false,
    language: "EN",
    tags: ["lux", "garen", "demacia", "starter"],
  },
  {
    id: 10060,
    name: "Jinx — Secret Rare (Foundations)",
    slug: "riftbound-jinx-secret-rare-foundations",
    price: 29.95,
    wholesalePrice: 24.56,
    storePrice: 22.46,
    shortDescription: "Jinx en versión Secret Rare con arte exclusivo.",
    description:
      "Jinx en versión Secret Rare del set Foundations de Riftbound. Arte alternativo con la estética de la serie Arcane de Netflix. Una de las cartas más buscadas del juego por coleccionistas y jugadores.",
    category: "singles",
    game: "riftbound",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: false,
    language: "EN",
    tags: ["jinx", "secret-rare", "arcane"],
  },

  // ══════════════════════════════════════════════════════════
  // TOPPS
  // ══════════════════════════════════════════════════════════

  {
    id: 10066,
    name: "Topps UEFA Champions League 2024-25 Hobby Box",
    slug: "topps-ucl-2024-25-hobby-box",
    price: 89.95,
    wholesalePrice: 73.76,
    storePrice: 67.46,
    shortDescription: "Caja Hobby con las mejores cromos de la UCL 2024-25.",
    description:
      "La colección oficial de la UEFA Champions League temporada 2024-25. Cada Hobby Box incluye cromos base, variantes Chrome, Refractors y Autógrafos. Con jugadores de todos los equipos de la fase de grupos.",
    category: "futbol",
    game: "topps",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: true,
    language: "EN",
    tags: ["ucl", "champions-league", "futbol", "2024-25"],
  },
  {
    id: 10067,
    name: "Topps Chrome UEFA Champions League 2024-25",
    slug: "topps-chrome-ucl-2024-25",
    price: 119.95,
    wholesalePrice: 98.36,
    storePrice: 89.96,
    shortDescription:
      "La versión Chrome premium de la colección UCL con Refractors.",
    description:
      "Topps Chrome UCL 2024-25 con los mejores acabados cromados. Refractors, Prisma, Gold y Superfractors muy buscados por coleccionistas. La versión más premium de la colección de la Champions League.",
    category: "futbol",
    game: "topps",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: true,
    language: "EN",
    tags: ["chrome", "ucl", "refractor", "premium"],
  },
  {
    id: 10068,
    name: "Topps Match Attax 2024-25 Caja Completa (50 sobres)",
    slug: "topps-match-attax-2024-25-box",
    price: 29.95,
    wholesalePrice: 24.56,
    storePrice: 22.46,
    shortDescription: "50 sobres de Match Attax con 8 cartas cada uno.",
    description:
      "Topps Match Attax 2024-25 incluye los mejores jugadores de las ligas europeas. 50 sobres con 8 cartas por sobre, incluyendo cartas Hat-Trick Heroes, 100 Club y las populares cartas UCL Star.",
    category: "futbol",
    game: "topps",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "ES",
    tags: ["match-attax", "futbol", "ligas-europeas"],
  },
  {
    id: 10069,
    name: "Topps Formula 1 Turbo Attax 2024",
    slug: "topps-f1-turbo-attax-2024",
    price: 34.95,
    wholesalePrice: 28.66,
    storePrice: 26.21,
    shortDescription:
      "La colección oficial de la F1 2024 con todos los pilotos.",
    description:
      "Topps Formula 1 Turbo Attax 2024 incluye todos los pilotos y coches de la temporada 2024 de Fórmula 1. Cartas de Max Verstappen, Lewis Hamilton, Charles Leclerc y todos los equipos. Incluye cartas especiales Turbo y cartas de circuitos.",
    category: "f1",
    game: "topps",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: true,
    language: "EN",
    tags: ["f1", "formula1", "verstappen", "hamilton"],
  },
  {
    id: 10070,
    name: "Topps Chrome Formula 1 2024 Hobby Box",
    slug: "topps-chrome-f1-2024-hobby-box",
    price: 129.95,
    wholesalePrice: 106.56,
    storePrice: 97.46,
    shortDescription:
      "Versión Chrome premium de la F1 2024 con Refractors y Autógrafos.",
    description:
      "Topps Chrome F1 2024 es la colección más premium para fans de la Fórmula 1. Con Refractors, Autógrafos de pilotos y variantes paralelas exclusivas. Una inversión para coleccionistas serios.",
    category: "f1",
    game: "topps",
    images: [],
    inStock: false,
    isNew: true,
    isFeatured: false,
    language: "EN",
    tags: ["chrome", "f1", "autograph", "premium"],
  },
  {
    id: 10071,
    name: "Topps Chrome NBA 2024-25 Hobby Box",
    slug: "topps-chrome-nba-2024-25-hobby-box",
    price: 129.95,
    wholesalePrice: 106.56,
    storePrice: 97.46,
    shortDescription:
      "La colección NBA más premium con rookies, autógrafos y Refractors.",
    description:
      "Topps Chrome NBA 2024-25 con los mejores Rookies de la temporada, autógrafos de estrellas y variantes Refractor muy buscadas. Incluye cartas de LeBron James, Stephen Curry y los mejores rookies del draft 2024.",
    category: "nba",
    game: "topps",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: false,
    language: "EN",
    tags: ["nba", "chrome", "basketball", "2024-25"],
  },
  {
    id: 10072,
    name: "Topps UCL 2024-25 Starter Pack (álbum + 10 sobres)",
    slug: "topps-ucl-2024-25-starter-pack",
    price: 9.95,
    wholesalePrice: 8.16,
    storePrice: 7.46,
    shortDescription: "Álbum oficial UCL 2024-25 con 10 sobres de cromos.",
    description:
      "Pack de inicio para la colección de cromos oficiales de la UEFA Champions League 2024-25. Incluye el álbum coleccionable y 10 sobres con 5 cromos cada uno. El regalo perfecto para aficionados al fútbol.",
    category: "albumes",
    game: "topps",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: false,
    language: "ES",
    tags: ["album", "ucl", "cromos", "coleccion"],
  },

  // ══════════════════════════════════════════════════════════
  // DISNEY LORCANA
  // ══════════════════════════════════════════════════════════

  {
    id: 10081,
    name: "Disney Lorcana Archazi: Cards and Dice Booster Box (24 sobres)",
    slug: "lorcana-archazi-cards-dice-booster-box",
    price: 109.95,
    wholesalePrice: 90.16,
    storePrice: 82.46,
    shortDescription:
      "24 sobres del último set de Disney Lorcana con mecánica de dados.",
    description:
      "Archazi: Cards and Dice es el quinto set de Disney Lorcana. Introduce una nueva mecánica con dados de lore que cambian la forma de jugar. Con personajes de Encanto, Raya y el Último Dragón y muchos más. 24 sobres con 12 cartas cada uno.",
    category: "booster-box",
    game: "lorcana",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: true,
    language: "EN",
    tags: ["archazi", "cards-dice", "2025"],
  },
  {
    id: 10082,
    name: "Disney Lorcana Shimmering Skies Booster Box (24 sobres)",
    slug: "lorcana-shimmering-skies-booster-box",
    price: 104.95,
    wholesalePrice: 86.06,
    storePrice: 78.71,
    shortDescription:
      "24 sobres del cuarto set de Lorcana ambientado en el cielo.",
    description:
      "Shimmering Skies es el cuarto set de Disney Lorcana con personajes de Aladdin, Mulan y Ratatouille. Mecánicas nuevas de vuelo y nuevas cartas Enchanted muy cotizadas. 24 sobres con 12 cartas cada uno.",
    category: "booster-box",
    game: "lorcana",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["shimmering-skies", "aladdin", "mulan"],
  },
  {
    id: 10083,
    name: "Disney Lorcana Ursula's Return Booster Box (24 sobres)",
    slug: "lorcana-ursulas-return-booster-box",
    price: 99.95,
    wholesalePrice: 81.96,
    storePrice: 74.96,
    shortDescription: "24 sobres del tercer set centrado en la villana Ursula.",
    description:
      "Ursula's Return trae de vuelta a la gran villana de Disney con nuevas mecánicas de magia. Cartas de La Sirenita, Frozen, Toy Story y muchos clásicos más en versiones nuevas muy buscadas.",
    category: "booster-box",
    game: "lorcana",
    images: [],
    inStock: false,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["ursulas-return", "ursula", "sirenita"],
  },
  {
    id: 10084,
    name: "Lorcana Starter Deck — Moana & Maui (Amber/Amethyst)",
    slug: "lorcana-starter-deck-moana-maui",
    price: 13.95,
    wholesalePrice: 11.44,
    storePrice: 10.46,
    shortDescription:
      "Mazo inicial de 60 cartas con Moana y Maui como protagonistas.",
    description:
      "Starter Deck de Disney Lorcana con los personajes de Moana. 60 cartas con estrategia de Amber y Amethyst, incluyendo cartas exclusivas de Moana y Maui no disponibles en sobres. Perfecto para empezar a jugar.",
    category: "starter",
    game: "lorcana",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["starter", "moana", "maui"],
  },
  {
    id: 10085,
    name: "Disney Lorcana Illumineer's Trove — Into the Inklands",
    slug: "lorcana-illumineers-trove-into-inklands",
    price: 49.95,
    wholesalePrice: 40.96,
    storePrice: 37.46,
    shortDescription:
      "Pack premium de Lorcana con 8 sobres y accesorios exclusivos.",
    description:
      "El Illumineer's Trove de Into the Inklands incluye 8 sobres, 1 carta promo foil exclusiva, una bolsa de tela y un cuaderno de explorador. El mejor regalo para fans de Disney Lorcana.",
    category: "trove",
    game: "lorcana",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["trove", "into-inklands", "premium"],
  },
  {
    id: 10086,
    name: "Elsa — Spirit of Winter (Enchanted) — The First Chapter",
    slug: "lorcana-elsa-spirit-of-winter-enchanted",
    price: 89.95,
    wholesalePrice: 73.76,
    storePrice: 67.46,
    shortDescription: "La carta Enchanted de Elsa, la más icónica de Lorcana.",
    description:
      "Elsa Spirit of Winter en versión Enchanted del primer set de Disney Lorcana. La carta más popular del juego con su espectacular arte foil y la poderosa habilidad Freeze. Una de las cartas más buscadas por coleccionistas.",
    category: "enchanted",
    game: "lorcana",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["elsa", "enchanted", "frozen", "the-first-chapter"],
  },
  {
    id: 10087,
    name: "Mickey Mouse — Brave Little Tailor (Enchanted)",
    slug: "lorcana-mickey-brave-little-tailor-enchanted",
    price: 64.95,
    wholesalePrice: 53.26,
    storePrice: 48.71,
    shortDescription:
      "Mickey Mouse Enchanted del primer set, muy buscado por fans.",
    description:
      "Mickey Mouse Brave Little Tailor en versión Enchanted del primer set de Lorcana. Con arte foil exclusivo y la icónica imagen de Mickey en su traje de sastre. Una pieza imprescindible para cualquier coleccionista de Lorcana.",
    category: "enchanted",
    game: "lorcana",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["mickey", "enchanted", "the-first-chapter"],
  },

  // ══════════════════════════════════════════════════════════
  // DRAGON BALL SUPER FUSION WORLD
  // ══════════════════════════════════════════════════════════

  {
    id: 10096,
    name: "Dragon Ball Super Fusion World FB-04 Blazing Aura Booster Box",
    slug: "dragonball-fb04-blazing-aura-booster-box",
    price: 79.95,
    wholesalePrice: 65.56,
    storePrice: 59.96,
    shortDescription:
      "24 sobres del set FB-04 con las transformaciones más poderosas.",
    description:
      "FB-04 Blazing Aura explora las transformaciones más extremas del universo Dragon Ball: Super Saiyan Blue Evolution, Ultra Instinct y más. 24 sobres con 12 cartas cada uno. Incluye nuevas cartas Leader y SCR muy buscadas.",
    category: "booster-box",
    game: "dragon-ball",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: true,
    language: "EN",
    tags: ["fb-04", "blazing-aura", "ultra-instinct"],
  },
  {
    id: 10097,
    name: "Dragon Ball Super Fusion World FB-05 Across Time Booster Box",
    slug: "dragonball-fb05-across-time-booster-box",
    price: 79.95,
    wholesalePrice: 65.56,
    storePrice: 59.96,
    shortDescription: "24 sobres del set FB-05 con los guerreros del pasado.",
    description:
      "FB-05 Across Time lleva a los jugadores a través del tiempo con personajes históricos de Dragon Ball: Bardock, Broly (película) y los Guerreros del Pasado. Nuevas mecánicas de 'tiempo' y cartas God Rare muy cotizadas.",
    category: "booster-box",
    game: "dragon-ball",
    images: [],
    inStock: false,
    isNew: true,
    isFeatured: false,
    language: "EN",
    tags: ["fb-05", "across-time", "bardock"],
  },
  {
    id: 10098,
    name: "Dragon Ball Super Fusion World FB-03 Ruler of the Skies Booster Box",
    slug: "dragonball-fb03-ruler-skies-booster-box",
    price: 74.95,
    wholesalePrice: 61.46,
    storePrice: 56.21,
    shortDescription: "24 sobres del popular set FB-03 con Piccolo y Gohan.",
    description:
      "FB-03 Ruler of the Skies trae a Gohan Beast y Piccolo Naranja como protagonistas. Con las mecánicas de Cell Max y las transformaciones de los guerreros de la Tierra. Set con algunas de las cartas más jugadas competitivamente.",
    category: "booster-box",
    game: "dragon-ball",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["fb-03", "ruler-skies", "gohan", "piccolo"],
  },
  {
    id: 10099,
    name: "Dragon Ball Fusion World FS04 Starter Deck — Son Goku",
    slug: "dragonball-fs04-starter-deck-son-goku",
    price: 14.95,
    wholesalePrice: 12.26,
    storePrice: 11.21,
    shortDescription: "Mazo inicial de 56 cartas con Son Goku como líder.",
    description:
      "El Starter Deck FS04 de Son Goku es la puerta de entrada perfecta a Dragon Ball Super Fusion World. 56 cartas preconstructidas con una estrategia directa y agresiva típica de Goku. Incluye carta exclusiva Leader foil.",
    category: "starter",
    game: "dragon-ball",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["starter", "goku", "fs04"],
  },
  {
    id: 10100,
    name: "Dragon Ball Fusion World FS05 Starter Deck — Vegeta",
    slug: "dragonball-fs05-starter-deck-vegeta",
    price: 14.95,
    wholesalePrice: 12.26,
    storePrice: 11.21,
    shortDescription:
      "Mazo inicial con el Príncipe de los Saiyajin como líder.",
    description:
      "El Starter Deck FS05 presenta a Vegeta como líder con una estrategia de transformación y orgullo Saiyan. 56 cartas con el estilo de juego controlador y potente del Príncipe de los Saiyajin. Incluye carta Leader foil exclusiva.",
    category: "starter",
    game: "dragon-ball",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["starter", "vegeta", "fs05"],
  },
  {
    id: 10101,
    name: "Frieza SCR — FB-01 Secret Rare",
    slug: "dragonball-frieza-scr-fb01",
    price: 129.95,
    wholesalePrice: 106.56,
    storePrice: 97.46,
    shortDescription:
      "La carta SCR de Frieza del primer set. La más cotizada del juego.",
    description:
      "Freezer en versión Secret Rare (SCR) del set inaugural de Dragon Ball Super Fusion World. Con un arte especial en fondo negro y acabados premium. La carta de mayor valor del juego y una de las más buscadas por coleccionistas.",
    category: "scr",
    game: "dragon-ball",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["frieza", "scr", "fb-01", "secret-rare"],
  },

  // ══════════════════════════════════════════════════════════
  // YU-GI-OH!
  // ══════════════════════════════════════════════════════════

  {
    id: 10109,
    name: "Yu-Gi-Oh! Age of Overlord Booster Box (24 sobres)",
    slug: "yugioh-age-of-overlord-booster-box",
    price: 79.95,
    wholesalePrice: 65.56,
    storePrice: 59.96,
    shortDescription:
      "24 sobres de Age of Overlord con poderosos Synchro y XYZ.",
    description:
      "Age of Overlord incluye nuevos soportes para arquetipos populares como Snake-Eye, Centur-Ion y más. Cartas clave para el meta competitivo actual con nuevas opciones de Synchro y XYZ. 24 sobres con 9 cartas cada uno.",
    category: "booster-box",
    game: "yugioh",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["age-of-overlord", "synchro", "xyz", "meta"],
  },
  {
    id: 10110,
    name: "Yu-Gi-Oh! Phantom Nightmare Booster Box (24 sobres)",
    slug: "yugioh-phantom-nightmare-booster-box",
    price: 79.95,
    wholesalePrice: 65.56,
    storePrice: 59.96,
    shortDescription:
      "24 sobres con los nuevos Snake-Eye y cartas de alto impacto.",
    description:
      "Phantom Nightmare introduce el arquetipo Snake-Eye, uno de los más poderosos del meta competitivo actual. Con nuevas cartas de soporte para Ritual y Fusion. Un set imprescindible para jugadores competitivos.",
    category: "booster-box",
    game: "yugioh",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["phantom-nightmare", "snake-eye", "meta"],
  },
  {
    id: 10111,
    name: "Yu-Gi-Oh! Legacy of Destruction Booster Box (24 sobres)",
    slug: "yugioh-legacy-of-destruction-booster-box",
    price: 74.95,
    wholesalePrice: 61.46,
    storePrice: 56.21,
    shortDescription:
      "24 sobres con nuevos FIRE y soporte para arquetipos legendarios.",
    description:
      "Legacy of Destruction se centra en monstruos de tipo FIRE con nuevos soportes para Snake-Eye y Labrynth. Con cartas únicas de rareza Ghost Rare muy cotizadas. 24 sobres con 9 cartas cada uno.",
    category: "booster-box",
    game: "yugioh",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["legacy-of-destruction", "fire", "labrynth"],
  },
  {
    id: 10112,
    name: "Yu-Gi-Oh! Tin of the Pharaoh's Gods 2024",
    slug: "yugioh-tin-pharaohs-gods-2024",
    price: 24.95,
    wholesalePrice: 20.46,
    storePrice: 18.71,
    shortDescription:
      "Lata coleccionable con cartas promo de dioses del faraón.",
    description:
      "La Tin del Faraón 2024 incluye 3 sobres de sets recientes más cartas promo exclusivas de los Dioses Egipcios: Slifer, Obelisk y Ra en nuevas versiones. Una colección imprescindible para fans de Yu-Gi-Oh! clásico.",
    category: "tins",
    game: "yugioh",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["tin", "dioses-egipcios", "slifer", "obelisk", "ra"],
  },
  {
    id: 10113,
    name: "Yu-Gi-Oh! Tin of Ancient Battles 2024",
    slug: "yugioh-tin-ancient-battles-2024",
    price: 19.95,
    wholesalePrice: 16.36,
    storePrice: 14.96,
    shortDescription: "Lata con 3 sobres de sets actuales y cartas exclusivas.",
    description:
      "La Tin of Ancient Battles 2024 incluye 3 sobres booster de sets recientes más cartas promo de personajes icónicos del anime en versiones actualizadas. Un buen inicio para coleccionistas.",
    category: "tins",
    game: "yugioh",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["tin", "ancient-battles"],
  },
  {
    id: 10114,
    name: "Yu-Gi-Oh! Structure Deck: The Crimson King",
    slug: "yugioh-structure-deck-crimson-king",
    price: 9.95,
    wholesalePrice: 8.16,
    storePrice: 7.46,
    shortDescription: "Mazo de 45 cartas centrado en monstruos de tipo DARK.",
    description:
      "The Crimson King es un Structure Deck centrado en el poderoso Jack Atlas y sus dragones carmesí. 45 cartas incluida una carta nueva y varios reprints útiles. Listo para jugar desde la caja.",
    category: "structure-decks",
    game: "yugioh",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["structure-deck", "dark", "dragon"],
  },
  {
    id: 10115,
    name: "Maxx C — Starlight Rare",
    slug: "yugioh-maxx-c-starlight-rare",
    price: 299.95,
    wholesalePrice: 245.96,
    storePrice: 224.96,
    shortDescription:
      "La carta más valiosa del TCG. Maxx C en versión Starlight Rare.",
    description:
      "Maxx C en versión Starlight Rare es la carta más cara y buscada del TCG de Yu-Gi-Oh! actual. Prohibida en el formato TCG (Occidente) pero completamente legal en OCG (Asia). Arte exclusivo con acabado Rainbow Foil. Para coleccionistas serios.",
    category: "starlight",
    game: "yugioh",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: true,
    language: "EN",
    tags: ["maxx-c", "starlight", "rare", "prohibida"],
  },
  {
    id: 10116,
    name: "Branded Fusion — Ghost Rare",
    slug: "yugioh-branded-fusion-ghost-rare",
    price: 49.95,
    wholesalePrice: 40.96,
    storePrice: 37.46,
    shortDescription: "Branded Fusion en la impresionante versión Ghost Rare.",
    description:
      "Branded Fusion en versión Ghost Rare con el característico acabado espectral de Yu-Gi-Oh! Una de las cartas más jugadas del meta de los últimos años, ahora en su versión de mayor rareza. Imprescindible en mazos Branded Despia.",
    category: "starlight",
    game: "yugioh",
    images: [],
    inStock: true,
    isNew: false,
    isFeatured: false,
    language: "EN",
    tags: ["branded-fusion", "ghost-rare", "branded-despia", "meta"],
  },

  // ══════════════════════════════════════════════════════════
  // NARUTO MYTHOS TCG
  // ══════════════════════════════════════════════════════════

  {
    id: 10123,
    name: "Naruto Mythos: Konoha Shidō Booster Box (24 sobres)",
    slug: "naruto-konoha-shido-booster-box",
    price: 79.95,
    wholesalePrice: 65.56,
    storePrice: 59.96,
    shortDescription:
      "El set inaugural del nuevo TCG oficial de Naruto. 24 sobres.",
    description:
      "Naruto Mythos: Konoha Shidō es la primera expansión del TCG oficial de Naruto lanzado en 2025. Con los personajes más icónicos de Konoha: Naruto, Sasuke, Sakura y Kakashi. Mecánicas de Chakra y Jutsus únicas. 24 sobres con 12 cartas cada uno.",
    category: "booster-box",
    game: "naruto",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: true,
    language: "EN",
    tags: ["konoha-shido", "naruto", "nuevo", "2025"],
  },
  {
    id: 10124,
    name: "Naruto Mythos Booster Pack — Konoha Shidō (12 cartas)",
    slug: "naruto-konoha-shido-booster-pack",
    price: 4.95,
    wholesalePrice: 4.06,
    storePrice: 3.71,
    shortDescription:
      "Sobre individual de Konoha Shidō con 12 cartas de Naruto.",
    description:
      "Sobre individual de la primera expansión de Naruto Mythos TCG. 12 cartas por sobre con posibilidad de cartas raras, ultras y secreta. El punto de partida ideal para descubrir el nuevo juego de cartas de Naruto.",
    category: "sobres",
    game: "naruto",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: false,
    language: "EN",
    tags: ["konoha-shido", "sobre", "single-pack"],
  },
  {
    id: 10125,
    name: "Naruto Mythos Starter Pack — Naruto Uzumaki",
    slug: "naruto-starter-pack-naruto-uzumaki",
    price: 14.95,
    wholesalePrice: 12.26,
    storePrice: 11.21,
    shortDescription:
      "Mazo inicial de 50 cartas con Naruto Uzumaki como líder.",
    description:
      "El Starter Pack de Naruto Uzumaki incluye 50 cartas preconstructidas con la temática del Séptimo Hokage. Estrategia de clones y Modo Sabio para el nuevo jugador. Incluye cartas exclusivas no disponibles en sobres.",
    category: "starter",
    game: "naruto",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: true,
    language: "EN",
    tags: ["starter", "naruto-uzumaki", "hokage"],
  },
  {
    id: 10126,
    name: "Naruto Mythos Starter Pack — Sasuke Uchiha",
    slug: "naruto-starter-pack-sasuke-uchiha",
    price: 14.95,
    wholesalePrice: 12.26,
    storePrice: 11.21,
    shortDescription: "Mazo inicial de 50 cartas con Sasuke Uchiha como líder.",
    description:
      "El Starter Pack de Sasuke Uchiha presenta la estrategia del Clan Uchiha con su poderoso Sharingan. 50 cartas con mecánicas de Mangekyō y cartas exclusivas de Sasuke, Itachi y el clan Uchiha.",
    category: "starter",
    game: "naruto",
    images: [],
    inStock: true,
    isNew: true,
    isFeatured: false,
    language: "EN",
    tags: ["starter", "sasuke", "uchiha"],
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
  return PRODUCTS.filter((p) => p.game === game && p.category === category);
}

export function getProductBySlug(slug: string): LocalProduct | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getFeaturedProducts(limit = 8): LocalProduct[] {
  return PRODUCTS.filter((p) => p.isFeatured).slice(0, limit);
}

export function getNewProducts(limit = 8): LocalProduct[] {
  return PRODUCTS.filter((p) => p.isNew && p.inStock).slice(0, limit);
}

export function getProductsByGameFeatured(
  game: string,
  limit = 4,
): LocalProduct[] {
  const gameProducts = getProductsByGame(game);
  const featured = gameProducts.filter((p) => p.isFeatured);
  return featured.length >= limit
    ? featured.slice(0, limit)
    : gameProducts.slice(0, limit);
}

export function getAllCategories(game: string): string[] {
  const cats = new Set(
    PRODUCTS.filter((p) => p.game === game).map((p) => p.category),
  );
  return Array.from(cats);
}
