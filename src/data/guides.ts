/**
 * Guías SEO — contenido long-tail pensado para posicionar por búsquedas
 * informacionales ("cómo abrir un booster", "qué sobre comprar", etc.) y
 * enlazar internamente al catálogo.
 *
 * Cada guía se renderiza como Article + BreadcrumbList en JSON-LD.
 */

export interface GuideSection {
  heading: string;
  body: string;
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  /** Imagen OG (opcional, fallback a /og-default.png). */
  image?: string;
  /** Etiqueta de categoría para la portada: "Magic", "Pokémon", "Principiantes"... */
  tag: string;
  /** Juego relacionado (slug) — se usa para linkar al juego desde la guía. */
  relatedGame?: string;
  /** Categorías a las que enlaza al final (para internal linking). */
  relatedCategories?: { game: string; category: string; label: string }[];
  publishedAt: string; // ISO
  updatedAt?: string; // ISO
  readMinutes: number;
  intro: string;
  sections: GuideSection[];
}

export const GUIDES: Guide[] = [
  {
    slug: "como-empezar-magic-the-gathering",
    title: "Cómo empezar en Magic: The Gathering en 2026",
    description:
      "Guía completa para empezar a jugar Magic: The Gathering desde cero. Qué comprar primero, formatos, mazos iniciales y primeros pasos.",
    tag: "Magic",
    relatedGame: "magic",
    relatedCategories: [
      { game: "magic", category: "starter", label: "Starter Decks" },
      { game: "magic", category: "commander", label: "Commander Decks" },
      { game: "magic", category: "booster-box", label: "Cajas de Sobres" },
    ],
    publishedAt: "2026-04-01",
    updatedAt: "2026-04-20",
    readMinutes: 6,
    intro:
      "Magic: The Gathering es el TCG más veterano del mundo, con una curva de entrada que puede parecer intimidante. Esta guía te ayuda a empezar sin perder tiempo ni dinero: qué comprar primero, qué formatos existen y cómo progresar.",
    sections: [
      {
        heading: "1. ¿Qué es un TCG y cómo funciona Magic?",
        body: "Magic es un juego de cartas coleccionables en el que cada jugador construye su propio mazo de 60 cartas (o 100 en Commander). Cada partida simulas un duelo de magos con criaturas, hechizos y tierras que generan maná. Hay miles de cartas publicadas desde 1993, pero sólo juegas con las que tú eliges.",
      },
      {
        heading: "2. ¿Qué comprar primero?",
        body: "Si nunca has jugado, la opción más económica y efectiva es un Starter Deck oficial o un Commander Deck preconstruido. Te dan un mazo funcional, te enseñan a jugar y no te obligan a abrir sobres aleatorios. En TCG Academy tienes los Commander Decks de cada edición y Starter Decks en stock, con envío en 24 horas.",
      },
      {
        heading: "3. Formatos: ¿cuál encaja contigo?",
        body: "Los tres formatos principales son Commander (100 cartas, social, 4 jugadores), Modern (60 cartas, competitivo, turnos rápidos) y Standard (sólo las expansiones recientes). Si quieres partidas largas con amigos, Commander. Si prefieres torneos, Standard o Modern.",
      },
      {
        heading: "4. Cajas de sobres vs. singles",
        body: "Una Booster Box te da 30-36 sobres aleatorios — es lotería pero divertido si vas a abrir con amigos. Si buscas una carta concreta para tu mazo, siempre es más barato comprar el single directamente. Consulta siempre el precio antes de abrir.",
      },
      {
        heading: "5. Reglas básicas en 2 minutos",
        body: "Cada turno: desenderezas tus cartas, robas una, juegas una tierra, lanzas hechizos con el maná de tus tierras y atacas. El objetivo es bajar la vida del rival de 20 a 0. Las reglas completas vienen en cada Starter Deck y en wizards.com/magic.",
      },
      {
        heading: "6. Próximos pasos",
        body: "Una vez te sabes las reglas, lo mejor es pasarte por tu tienda TCG local a jugar torneos semanales (FNM, Prereleases). En nuestras 4 tiendas físicas tienes juego organizado oficial y gente con la que aprender.",
      },
    ],
  },
  {
    slug: "como-empezar-pokemon-tcg",
    title: "Cómo empezar en Pokémon TCG: guía 2026",
    description:
      "Todo lo que necesitas para empezar a jugar Pokémon TCG: mazos iniciales, sobres recomendados, formatos y dónde conseguir cartas originales.",
    tag: "Pokémon",
    relatedGame: "pokemon",
    relatedCategories: [
      { game: "pokemon", category: "etb", label: "Elite Trainer Box" },
      { game: "pokemon", category: "booster-box", label: "Cajas de Sobres" },
      { game: "pokemon", category: "blisters", label: "Blisters y Packs" },
    ],
    publishedAt: "2026-04-02",
    readMinutes: 5,
    intro:
      "El TCG de Pokémon sigue siendo uno de los juegos de cartas más jugados del mundo, especialmente entre coleccionistas. Esta guía te enseña cómo empezar sin caer en productos falsos y sin gastar de más.",
    sections: [
      {
        heading: "1. Cartas auténticas vs. falsas",
        body: "El problema nº1 al comprar Pokémon es la falsificación. Compra siempre en tiendas especializadas con garantía. En TCG Academy verificamos cada producto singles por peso, hologram y tipografía antes de enviarlo.",
      },
      {
        heading: "2. ¿Sobre suelto, ETB o Booster Box?",
        body: "Para empezar con juego: un Starter Deck. Para coleccionar: una Elite Trainer Box (ETB) te da 9-10 sobres + fundas + dado — la mejor relación coste/contenido. Una Booster Box (36 sobres) es para abrir en directo o agrupar con amigos.",
      },
      {
        heading: "3. Formatos competitivos",
        body: "El formato oficial es Standard, rota cada año. Si sólo vas a jugar casual con amigos, cualquier carta vale. Si buscas torneos, comprueba el listado de sets legales en pokemon.com.",
      },
      {
        heading: "4. Cartas de inversión: ¿vale la pena?",
        body: "Pokémon es un mercado especulativo. Cartas como Charizard Base o promos antiguas han subido x10 en 5 años, pero los sets actuales rara vez mantienen valor. Si compras para invertir, guarda en sleeves + toploaders desde el primer momento.",
      },
      {
        heading: "5. Expansiones recomendadas 2026",
        body: "Las expansiones Scarlet & Violet y sus ampliaciones (Paradox Rift, Temporal Forces, Twilight Masquerade) son las más interesantes en 2026 por precio y disponibilidad. En nuestra página de Pokémon encuentras todas las ediciones activas.",
      },
    ],
  },
  {
    slug: "que-son-cartas-gradeadas",
    title: "Qué son las cartas gradeadas (PSA, BGS, CGC) y cuándo comprarlas",
    description:
      "Explicación clara de qué significa que una carta esté gradeada, qué empresas la certifican y cuándo merece la pena pagar el sobreprecio.",
    tag: "Coleccionismo",
    relatedCategories: [
      { game: "pokemon", category: "gradeadas", label: "Cartas Gradeadas Pokémon" },
      { game: "magic", category: "gradeadas", label: "Cartas Gradeadas Magic" },
    ],
    publishedAt: "2026-04-03",
    readMinutes: 4,
    intro:
      "Una carta gradeada es una carta que ha sido evaluada por una empresa independiente y sellada en una funda rígida (slab) con una nota numérica de conservación. Es el estándar en inversión y coleccionismo de alto nivel.",
    sections: [
      {
        heading: "1. Las tres grandes: PSA, BGS y CGC",
        body: "PSA (Professional Sports Authenticator) es la más valorada en Pokémon y deportes. BGS (Beckett) da subgrades (centrado, bordes, esquinas, superficie) y es la referencia en Magic. CGC es más reciente, más económica y gana terreno. El mercado acepta las tres, pero PSA 10 suele cotizar más alto.",
      },
      {
        heading: "2. La escala: del 1 al 10",
        body: "PSA y CGC gradean del 1 (pobre) al 10 (gem mint). Un PSA 10 implica centrado perfecto, bordes sin tocar, superficie sin marcas y esquinas intactas. BGS tiene el Black Label 10 (subgrades 10/10/10/10) — uno de los grados más raros del mundo.",
      },
      {
        heading: "3. ¿Cuándo merece la pena gradear?",
        body: "Sólo si la carta en mint vale 100€+, porque el proceso cuesta 20-50€ por carta. Gradear una common de 5€ es tirar dinero. Si tienes una carta sellada en sobre de booster y crees que es mint, grádela; si la has jugado, probablemente no.",
      },
      {
        heading: "4. Comprar gradeada: qué mirar",
        body: "Verifica siempre el número de certificación en la web oficial (psacard.com, beckett.com, cgccards.com). Si el slab parece manipulado o la etiqueta no cuadra, es falsificación — cada vez más comunes.",
      },
    ],
  },
  {
    slug: "como-abrir-booster-box",
    title: "Cómo abrir un Booster Box: consejos para maximizar valor",
    description:
      "Trucos para abrir una caja de sobres sin dañar las cartas, cómo clasificar lo que sale y consejos para streamear aperturas.",
    tag: "Guías",
    relatedCategories: [
      { game: "magic", category: "booster-box", label: "Booster Boxes Magic" },
      { game: "pokemon", category: "booster-box", label: "Booster Boxes Pokémon" },
      { game: "one-piece", category: "booster-box", label: "Booster Boxes One Piece" },
    ],
    publishedAt: "2026-04-04",
    readMinutes: 3,
    intro:
      "Abrir una Booster Box es uno de los rituales más satisfactorios del TCG, pero también el más caro si algo sale mal. Estos consejos te ayudan a sacar el máximo valor.",
    sections: [
      {
        heading: "1. Prepara el espacio antes de abrir",
        body: "Mesa limpia, superficie plana, luz natural si vas a grabar. Ten a mano sleeves, toploaders y una lista para ir anotando lo que sale. Evita comer o beber cerca — un golpe de café y tu chase card vale la mitad.",
      },
      {
        heading: "2. Técnica de apertura",
        body: "Rompe el plástico con cutter, nunca con tijeras cerca de las cartas. Dentro de cada sobre, separa el papel de relleno ANTES de sacar las cartas. Revisa bordes y esquinas antes de meter en sleeve — una vez sleevadas no hay reclamación.",
      },
      {
        heading: "3. Clasifica mientras abres",
        body: "Tres pilas: foils/specials, rares, commons/uncommons. No mezcles hasta que todo esté sleevado. Si aparece una carta chase (alt art, secret rare), directamente a toploader.",
      },
      {
        heading: "4. Proteger y rentabilizar",
        body: "Las cartas top van a toploader o semirígido. Si vas a vender en los próximos 3 meses, basta con sleeve perfect fit + penny sleeve + top loader. Si guardas para el futuro, considera gradearlas (ver nuestra guía sobre cartas gradeadas).",
      },
    ],
  },
  {
    slug: "glosario-terminos-tcg",
    title: "Glosario TCG: todos los términos explicados",
    description:
      "Foil, mint, alt art, chase, misprint, OP, meta, sideboard... todos los términos del mundo TCG en un solo glosario.",
    tag: "Principiantes",
    publishedAt: "2026-04-05",
    readMinutes: 7,
    intro:
      "Si acabas de entrar al mundo TCG te vas a encontrar con jerga propia. Este glosario recoge los términos más comunes, agrupados por tipo.",
    sections: [
      {
        heading: "Condición de carta",
        body: "Mint / Near Mint (NM): perfecta o casi perfecta. Lightly Played (LP): marcas de uso mínimas. Moderately Played (MP): visibles. Heavily Played (HP): dañada, aún jugable. Damaged (D): rota o muy marcada. La diferencia entre NM y LP puede ser de -20% en precio.",
      },
      {
        heading: "Tipos de rareza",
        body: "Common, uncommon, rare, mythic rare, secret rare, alt art, chase card. En Magic también existe Masterpiece y Serialized (numeradas). En Pokémon hay Full Art, Rainbow Rare y Special Illustration Rare.",
      },
      {
        heading: "Jerga de juego",
        body: "Meta: cartas más competitivas del momento. Tier 1/2/3: ranking de mazos. Sideboard: cartas extra que cambias entre partidas. Misprint: error de impresión (algunas valen fortunas). Proxy: copia no oficial, prohibida en torneos.",
      },
      {
        heading: "Coleccionismo",
        body: "Slab: funda rígida de gradeado. Subgrades: notas parciales de BGS. Pop report: número de copias certificadas con ese grado. Sealed: producto sin abrir.",
      },
    ],
  },
  {
    slug: "como-cuidar-proteger-cartas",
    title: "Cómo cuidar y proteger tus cartas TCG",
    description:
      "Sleeves, toploaders, carpetas binder, humedad, luz solar... todo lo que necesitas para que tus cartas duren años en perfecto estado.",
    tag: "Accesorios",
    relatedCategories: [
      { game: "magic", category: "sleeves", label: "Fundas Magic" },
      { game: "magic", category: "deckboxes", label: "Deck Boxes" },
      { game: "magic", category: "toploaders", label: "Toploaders" },
    ],
    publishedAt: "2026-04-06",
    readMinutes: 4,
    intro:
      "Una carta sin proteger se degrada mucho más rápido de lo que crees. Si gastas dinero en TCG, los accesorios de protección son la mejor inversión por euro.",
    sections: [
      {
        heading: "1. Sleeves: la primera línea",
        body: "Todas las cartas que uses regularmente deben ir en sleeve. Ultra Pro, Dragon Shield y KMC son las marcas estándar. Para doble protección (sleeve dentro de sleeve), usa Perfect Fit debajo de la sleeve principal.",
      },
      {
        heading: "2. Toploaders y semirígidos",
        body: "Para cartas valiosas que no juegas. El toploader es rígido (PVC); el semirígido es ideal para enviar cartas a gradear. Nunca metas una carta sin sleeve directamente al toploader — se raya.",
      },
      {
        heading: "3. Carpetas binder",
        body: "Las carpetas side-loading son más seguras que las top-loading (las cartas no se caen). Evita las muy baratas: el PVC libera plastificantes que amarillean las cartas. Ultra Pro Pro Binder o Dragon Shield Card Codex son opciones fiables.",
      },
      {
        heading: "4. Factores ambientales",
        body: "Evita luz solar directa (decolora los foils), humedad alta (deforma) y calor (>30ºC). Guarda en armario seco, a oscuras, en posición vertical. Para colecciones grandes, considera un cajón con silicagel.",
      },
      {
        heading: "5. Viajes y transporte",
        body: "Si llevas cartas a torneos, usa deck box rígido + sleeves. Nunca guardes en bolsillo trasero. Para mandar cartas por correo, sobre acolchado + toploader + cartón rígido a cada lado.",
      },
    ],
  },
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export const GUIDE_TAGS = Array.from(new Set(GUIDES.map((g) => g.tag))).sort();
