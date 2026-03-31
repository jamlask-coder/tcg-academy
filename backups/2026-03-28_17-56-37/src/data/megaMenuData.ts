export interface MegaMenuColumn {
  title: string
  items: { label: string; href: string }[]
}

export interface MegaMenuGame {
  slug: string
  label: string
  href: string
  color: string
  /** Abbreviation shown in the logo placeholder div (swap for real <img> when ready) */
  abbrev: string
  /** Path to the real logo once available, e.g. "/images/logos/magic.png" */
  logoSrc: string
  columns: MegaMenuColumn[]
}

export interface OtrosTCGGame {
  slug: string
  label: string
  href: string
  color: string
  abbrev: string
  logoSrc: string
}

// ─── Primary games (show in navbar with mega-menu) ───────────────────────────
// Order in navbar: Magic → Pokemon → One Piece → Riftbound → Topps

export const MEGA_MENU_DATA: MegaMenuGame[] = [
  {
    slug: "magic",
    label: "Magic",
    href: "/magic",
    color: "#7c3aed",
    abbrev: "MTG",
    logoSrc: "/images/logos/magic.svg",
    columns: [
      {
        title: "Producto Sellado",
        items: [
          { label: "Booster Boxes (Draft, Set, Collector)", href: "/magic?cat=booster-box" },
          { label: "Sobres sueltos", href: "/magic?cat=sobres" },
          { label: "Bundles", href: "/magic?cat=bundles" },
          { label: "Pre-release kits", href: "/magic?cat=prerelease" },
          { label: "Commander Decks", href: "/magic?cat=commander" },
          { label: "Secret Lair", href: "/magic?cat=secret-lair" },
        ],
      },
      {
        title: "Cartas",
        items: [
          { label: "Singles", href: "/magic?cat=singles" },
          { label: "Cartas foil y premium", href: "/magic?cat=foil" },
          { label: "Tierras full art", href: "/magic?cat=full-art-lands" },
          { label: "Lotes y colecciones", href: "/magic?cat=lotes" },
        ],
      },
      {
        title: "Accesorios",
        items: [
          { label: "Sleeves", href: "/magic?cat=sleeves" },
          { label: "Playmats", href: "/magic?cat=playmats" },
          { label: "Deck boxes", href: "/magic?cat=deckboxes" },
          { label: "Dados de vida", href: "/magic?cat=dados" },
          { label: "Carpetas", href: "/magic?cat=carpetas" },
        ],
      },
    ],
  },
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
          { label: "Booster Boxes (cajas de sobres)", href: "/pokemon?cat=booster-box" },
          { label: "Sobres sueltos (Booster Packs)", href: "/pokemon?cat=sobres" },
          { label: "Elite Trainer Box (ETB)", href: "/pokemon?cat=etb" },
          { label: "Tins y colecciones especiales", href: "/pokemon?cat=tins" },
          { label: "Blisters y packs", href: "/pokemon?cat=blisters" },
        ],
      },
      {
        title: "Cartas",
        items: [
          { label: "Cartas sueltas (singles)", href: "/pokemon?cat=singles" },
          { label: "Cartas gradeadas (PSA/BGS/CGC)", href: "/pokemon?cat=gradeadas" },
          { label: "Lotes y bundles", href: "/pokemon?cat=lotes" },
          { label: "Cartas promo", href: "/pokemon?cat=promo" },
        ],
      },
      {
        title: "Accesorios",
        items: [
          { label: "Fundas (sleeves)", href: "/pokemon?cat=sleeves" },
          { label: "Tapetes (playmats)", href: "/pokemon?cat=playmats" },
          { label: "Carpetas y portfolios", href: "/pokemon?cat=carpetas" },
          { label: "Deck boxes", href: "/pokemon?cat=deckboxes" },
          { label: "Toploaders", href: "/pokemon?cat=toploaders" },
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
          { label: "Booster Boxes", href: "/one-piece?cat=booster-box" },
          { label: "Sobres sueltos", href: "/one-piece?cat=sobres" },
          { label: "Starter Decks", href: "/one-piece?cat=starter" },
          { label: "Premium Packs", href: "/one-piece?cat=premium" },
          { label: "Double Packs", href: "/one-piece?cat=double-packs" },
        ],
      },
      {
        title: "Cartas y Accesorios",
        items: [
          { label: "Singles", href: "/one-piece?cat=singles" },
          { label: "Cartas manga / alternate art", href: "/one-piece?cat=alternate-art" },
          { label: "Sleeves oficiales", href: "/one-piece?cat=sleeves" },
          { label: "Playmats", href: "/one-piece?cat=playmats" },
          { label: "Deck boxes", href: "/one-piece?cat=deckboxes" },
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
          { label: "Booster Boxes", href: "/riftbound?cat=booster-box" },
          { label: "Sobres sueltos", href: "/riftbound?cat=sobres" },
          { label: "Starter Decks", href: "/riftbound?cat=starter" },
        ],
      },
      {
        title: "Cartas y Accesorios",
        items: [
          { label: "Singles", href: "/riftbound?cat=singles" },
          { label: "Cartas especiales", href: "/riftbound?cat=especiales" },
          { label: "Sleeves", href: "/riftbound?cat=sleeves" },
          { label: "Playmats", href: "/riftbound?cat=playmats" },
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
          { label: "Cromos de futbol", href: "/topps?cat=futbol" },
          { label: "Cromos NBA", href: "/topps?cat=nba" },
          { label: "Cromos F1", href: "/topps?cat=f1" },
          { label: "Cromos WWE", href: "/topps?cat=wwe" },
          { label: "Cromos Star Wars", href: "/topps?cat=star-wars" },
        ],
      },
      {
        title: "Producto",
        items: [
          { label: "Cajas", href: "/topps?cat=cajas" },
          { label: "Sobres", href: "/topps?cat=sobres" },
          { label: "Albumes", href: "/topps?cat=albumes" },
          { label: "Latas coleccionables", href: "/topps?cat=latas" },
        ],
      },
    ],
  },
]

// ─── Secondary games (shown in "Otros TCGs" dropdown) ────────────────────────

export const OTROS_TCGS: OtrosTCGGame[] = [
  {
    slug: "lorcana",
    label: "Disney Lorcana",
    href: "/lorcana",
    color: "#0891b2",
    abbrev: "LOR",
    logoSrc: "/images/logos/lorcana.svg",
  },
  {
    slug: "dragon-ball",
    label: "Dragon Ball Super",
    href: "/dragon-ball",
    color: "#d97706",
    abbrev: "DBS",
    logoSrc: "/images/logos/dragonball.svg",
  },
  {
    slug: "yugioh",
    label: "Yu-Gi-Oh!",
    href: "/yugioh",
    color: "#dc2626",
    abbrev: "YGO",
    logoSrc: "/images/logos/yugioh.svg",
  },
  {
    slug: "naruto",
    label: "Naruto Mythos",
    href: "/naruto",
    color: "#ea580c",
    abbrev: "NAR",
    logoSrc: "/images/logos/naruto.svg",
  },
]
