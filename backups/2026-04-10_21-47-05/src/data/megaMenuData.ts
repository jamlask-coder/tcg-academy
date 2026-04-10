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
// Order: Pokemon → Magic → One Piece → Riftbound → Yu-Gi-Oh! → Topps → Dragon Ball → Naruto Mythos
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
          { label: "Sobres de mejora", href: "/pokemon/sobres-mejora" },
          { label: "Cajas de sobres", href: "/pokemon/booster-box" },
          { label: "Cajas de colección", href: "/pokemon/coleccion" },
          { label: "ETB", href: "/pokemon/etb" },
          { label: "Blister y Latas", href: "/pokemon/blisters" },
          { label: "Pack de Cartas", href: "/pokemon/pack-cartas" },
        ],
      },
      {
        title: "Cartas",
        items: [
          { label: "Cartas Gradeadas", href: "/pokemon/gradeadas" },
          { label: "Servicio de gradeo", href: "/pokemon/gradeo" },
          { label: "Otros productos", href: "/pokemon/otros" },
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
          { label: "Booster Boxes (Draft, Set, Collector)", href: "/magic/booster-box" },
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
          { label: "Cartas Gradeadas", href: "/magic/gradeadas" },
          { label: "Servicio de gradeo", href: "/magic/gradeo" },
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
          { label: "Sobres sueltos", href: "/one-piece/sobres" },
          { label: "Cajas de sobres", href: "/one-piece/booster-box" },
          { label: "Cases", href: "/one-piece/cases" },
          { label: "EB (Extra Booster)", href: "/one-piece/eb" },
          { label: "Otros productos", href: "/one-piece/otros" },
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
          { label: "Sobres sueltos", href: "/riftbound/sobres" },
          { label: "Cajas de sobres", href: "/riftbound/booster-box" },
          { label: "Starter Decks", href: "/riftbound/starter" },
          { label: "Tapetes", href: "/riftbound/tapetes" },
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
          { label: "Sobres sueltos", href: "/yugioh/sobres" },
          { label: "Cajas de Sobres", href: "/yugioh/booster-box" },
          { label: "Structure Deck", href: "/yugioh/structure-decks" },
          { label: "Otros productos", href: "/yugioh/otros" },
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
          { label: "Ver todo Topps", href: "/topps" },
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
