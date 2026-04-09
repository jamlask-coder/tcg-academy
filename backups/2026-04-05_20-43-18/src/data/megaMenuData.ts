export interface MegaMenuColumn {
  title: string;
  items: { label: string; href: string }[];
}

export interface MegaMenuGame {
  slug: string;
  label: string;
  href: string;
  color: string;
  /** Abbreviation shown in the logo placeholder div (swap for real <img> when ready) */
  abbrev: string;
  /** Path to the real logo once available, e.g. "/images/logos/magic.png" */
  logoSrc: string;
  columns: MegaMenuColumn[];
}

// ─── All games (show in navbar with mega-menu) ────────────────────────────────
// Order: Pokemon → Magic → One Piece → Yu-Gi-Oh! → Riftbound → Topps → Dragon Ball → Naruto Mythos
// Index 0-5: always visible in navbar
// Index 6-7: Dragon Ball + Naruto → sólo en OtrosMenu, no en navbar
// Lorcana, Panini, Digimon → OtrosMenu

export const MEGA_MENU_DATA: MegaMenuGame[] = [
  {
    slug: "pokemon",
    label: "Pokemon",
    href: "/pokemon",
    color: "#f59e0b",
    abbrev: "PKM",
    logoSrc: "/images/logos/pokemon.svg",
    columns: [
      {
        title: "Producto Sellado",
        items: [
          {
            label: "Booster Boxes (cajas de sobres)",
            href: "/pokemon/booster-box",
          },
          { label: "Sobres sueltos (Booster Packs)", href: "/pokemon/sobres" },
          { label: "Elite Trainer Box (ETB)", href: "/pokemon/etb" },
          { label: "Tins y colecciones especiales", href: "/pokemon/tins" },
          { label: "Blisters y packs", href: "/pokemon/blisters" },
        ],
      },
      {
        title: "Cartas",
        items: [
          { label: "Cartas sueltas (singles)", href: "/pokemon/singles" },
          {
            label: "Cartas gradeadas (PSA/BGS/CGC)",
            href: "/pokemon/gradeadas",
          },
          { label: "Cartas promo", href: "/pokemon/promo" },
          { label: "Prize cards", href: "/pokemon/prize-cards" },
          { label: "Lotes", href: "/pokemon/lotes" },
        ],
      },
      {
        title: "Accesorios",
        items: [
          { label: "Fundas (sleeves)", href: "/pokemon/sleeves" },
          { label: "Tapetes (playmats)", href: "/pokemon/playmats" },
          { label: "Deck boxes", href: "/pokemon/deckboxes" },
        ],
      },
    ],
  },
  {
    slug: "magic",
    label: "Magic",
    href: "/magic",
    color: "#7c3aed",
    abbrev: "MTG",
    logoSrc: "/images/logos/magic.png",
    columns: [
      {
        title: "Producto Sellado",
        items: [
          {
            label: "Booster Boxes (Draft, Set, Collector)",
            href: "/magic/booster-box",
          },
          { label: "Sobres sueltos", href: "/magic/sobres" },
          { label: "Commander Decks", href: "/magic/commander" },
          { label: "Secret Lair", href: "/magic/secret-lair" },
        ],
      },
      {
        title: "Cartas",
        items: [
          { label: "Singles", href: "/magic/singles" },
          { label: "Cartas foil y premium", href: "/magic/foil" },
          { label: "Tierras full art", href: "/magic/full-art-lands" },
        ],
      },
      {
        title: "Accesorios",
        items: [
          { label: "Sleeves", href: "/magic/sleeves" },
          { label: "Playmats", href: "/magic/playmats" },
          { label: "Deck boxes", href: "/magic/deckboxes" },
          { label: "Dados de vida", href: "/magic/dados" },
        ],
      },
    ],
  },
  {
    slug: "one-piece",
    label: "One Piece",
    href: "/one-piece",
    color: "#dc2626",
    abbrev: "OP",
    logoSrc: "/images/logos/onepiece.svg",
    columns: [
      {
        title: "Producto Sellado",
        items: [
          { label: "Booster Boxes", href: "/one-piece/booster-box" },
          { label: "Sobres sueltos", href: "/one-piece/sobres" },
          { label: "Starter Decks", href: "/one-piece/starter" },
          { label: "Premium Packs", href: "/one-piece/premium" },
          { label: "Sets especiales", href: "/one-piece/especiales" },
        ],
      },
      {
        title: "Cartas y Accesorios",
        items: [
          { label: "Singles", href: "/one-piece/singles" },
          { label: "Cartas promo", href: "/one-piece/promo" },
        ],
      },
    ],
  },
  {
    slug: "yugioh",
    label: "Yu-Gi-Oh!",
    href: "/yugioh",
    color: "#b45309",
    abbrev: "YGO",
    logoSrc: "/images/logos/yugioh.png",
    columns: [
      {
        title: "Producto Sellado",
        items: [
          { label: "Booster Boxes", href: "/yugioh/booster-box" },
          { label: "Sobres sueltos", href: "/yugioh/sobres" },
          { label: "Tins de colección", href: "/yugioh/tins" },
          { label: "Structure Decks", href: "/yugioh/structure-decks" },
        ],
      },
      {
        title: "Cartas",
        items: [
          { label: "Singles", href: "/yugioh/singles" },
          { label: "Starlight Rare", href: "/yugioh/starlight" },
          { label: "Prize cards", href: "/yugioh/prize-cards" },
          { label: "Alternate Art", href: "/yugioh/alternate-art" },
          { label: "Field Centers", href: "/yugioh/field-centers" },
        ],
      },
    ],
  },
  {
    slug: "riftbound",
    label: "Riftbound",
    href: "/riftbound",
    color: "#0f766e",
    abbrev: "RB",
    logoSrc: "/images/logos/riftbound.svg",
    columns: [
      {
        title: "Producto Sellado",
        items: [
          { label: "Booster Boxes", href: "/riftbound/booster-box" },
          { label: "Sobres sueltos", href: "/riftbound/sobres" },
          { label: "Starter Decks", href: "/riftbound/starter" },
        ],
      },
      {
        title: "Cartas y Accesorios",
        items: [
          { label: "Singles", href: "/riftbound/singles" },
          { label: "Cartas promo", href: "/riftbound/promo" },
        ],
      },
    ],
  },
  {
    slug: "topps",
    label: "Topps",
    href: "/topps",
    color: "#1d4ed8",
    abbrev: "TPP",
    logoSrc: "/images/logos/topps.svg",
    columns: [
      {
        title: "Colecciones",
        items: [
          { label: "Cromos de fútbol", href: "/topps/futbol" },
          { label: "Cromos NBA", href: "/topps/nba" },
          { label: "Cromos F1", href: "/topps/f1" },
          { label: "Cromos WWE", href: "/topps/wwe" },
          { label: "Cromos Star Wars", href: "/topps/star-wars" },
        ],
      },
      {
        title: "Producto",
        items: [
          { label: "Cajas", href: "/topps/cajas" },
          { label: "Sobres", href: "/topps/sobres" },
          { label: "Álbumes", href: "/topps/albumes" },
          { label: "Latas coleccionables", href: "/topps/latas" },
        ],
      },
    ],
  },
  // ── Dragon Ball y Naruto → sólo en OtrosMenu, no en navbar ──────────────────
  {
    slug: "dragon-ball",
    label: "Dragon Ball",
    href: "/dragon-ball",
    color: "#d97706",
    abbrev: "DBS",
    logoSrc: "/images/logos/dragonball.png",
    columns: [
      {
        title: "Producto Sellado",
        items: [
          { label: "Booster Boxes", href: "/dragon-ball/booster-box" },
          { label: "Sobres sueltos", href: "/dragon-ball/sobres" },
          { label: "Starter Decks", href: "/dragon-ball/starter" },
          { label: "Sets Premium", href: "/dragon-ball/premium" },
        ],
      },
      {
        title: "Cartas y Accesorios",
        items: [
          { label: "Singles", href: "/dragon-ball/singles" },
          { label: "Cartas SCR (Special Rare)", href: "/dragon-ball/scr" },
          { label: "Cartas especiales", href: "/dragon-ball/especiales" },
        ],
      },
    ],
  },
  {
    slug: "naruto",
    label: "Naruto Mythos",
    href: "/naruto",
    color: "#ea580c",
    abbrev: "NAR",
    logoSrc: "/images/logos/naruto.svg",
    columns: [
      {
        title: "Producto Sellado",
        items: [
          { label: "Booster Boxes", href: "/naruto/booster-box" },
          { label: "Sobres sueltos", href: "/naruto/sobres" },
          { label: "Starter Decks", href: "/naruto/starter" },
        ],
      },
      {
        title: "Cartas y Accesorios",
        items: [
          { label: "Singles", href: "/naruto/singles" },
          { label: "Cartas especiales", href: "/naruto/especiales" },
          { label: "Cartas promo", href: "/naruto/promo" },
        ],
      },
    ],
  },
];
