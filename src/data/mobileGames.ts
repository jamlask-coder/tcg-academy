// ─── Mobile games — SSOT para Drawer y Home móvil ────────────────────────────
// Antes vivía solo en MobileDrawer. Lo exponemos aquí para que la página
// principal pueda renderizar los MISMOS logos (requisito del usuario).
// Incluye los 12 juegos: 8 principales + Lorcana/Digimon/Cyberpunk/Panini.

// Mismo fondo que usaba el drawer originalmente: gris azulado muy claro.
// Se ve en las tarjetas de juegos tanto del drawer como de la home móvil.
export const MOBILE_GAMES_BG = "#e8edf5";
export const MOBILE_GAMES_SPRITE_SRC = "/images/ssGamesBig.png";
export const MOBILE_GAMES_SPRITE_H = 140;

export interface MobileGame {
  slug: string;
  label: string;
  bg: string;
  logo?: string;
  filter?: string;
  blend?: boolean;
  maxH?: number;
  /** `renderH` permite reducir la altura renderizada para sprites anchos
   *  (Pokémon, Yu-Gi-Oh!) que, a altura 48, se cortarían por los laterales
   *  de la tarjeta en móvil. */
  sprite?: { origW: number; origX: number; filter?: string; renderH?: number };
}

export const MOBILE_GAMES: MobileGame[] = [
  { slug: "pokemon", label: "Pokémon", bg: MOBILE_GAMES_BG, sprite: { origW: 273, origX: 1228, renderH: 40 } },
  { slug: "magic", label: "Magic", bg: MOBILE_GAMES_BG, logo: "/images/logos/magic-clean.png" },
  { slug: "one-piece", label: "One Piece", bg: MOBILE_GAMES_BG, logo: "/images/logos/onepiece.png", blend: true },
  { slug: "riftbound", label: "Riftbound", bg: MOBILE_GAMES_BG, logo: "/images/logos/riftbound-clean.png?v=3", blend: true },
  { slug: "yugioh", label: "Yu-Gi-Oh!", bg: MOBILE_GAMES_BG, sprite: { origW: 392, origX: 696, renderH: 34 } },
  { slug: "topps", label: "Topps", bg: MOBILE_GAMES_BG, logo: "/images/logos/topps.svg" },
  { slug: "dragon-ball", label: "Dragon Ball", bg: MOBILE_GAMES_BG, logo: "/images/logos/dragonball-clean.png?v=2" },
  { slug: "naruto", label: "Naruto", bg: MOBILE_GAMES_BG, logo: "/images/logos/naruto-official.png" },
  { slug: "lorcana", label: "Lorcana", bg: MOBILE_GAMES_BG, logo: "/images/logos/lorcana.png" },
  { slug: "digimon", label: "Digimon", bg: MOBILE_GAMES_BG, logo: "/images/logos/digimon-official.png" },
  { slug: "cyberpunk", label: "Cyberpunk", bg: MOBILE_GAMES_BG, logo: "/images/logos/cyberpunk.png" },
  { slug: "panini", label: "Panini", bg: MOBILE_GAMES_BG, logo: "/images/logos/panini.png" },
];
