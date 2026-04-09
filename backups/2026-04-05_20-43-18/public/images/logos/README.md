# Game Logos

Place official game logo files here. The navbar loads them automatically via the `GameLogo` component (`src/components/layout/Navbar.tsx`).

## Expected filenames

| Game               | File              | Recommended size |
|--------------------|-------------------|-----------------|
| Magic: The Gathering | `magic.png`     | 120 × 40 px     |
| Pokémon            | `pokemon.png`     | 120 × 40 px     |
| One Piece          | `onepiece.png`    | 120 × 40 px     |
| Riftbound          | `riftbound.png`   | 120 × 40 px     |
| Topps              | `topps.png`       | 120 × 40 px     |
| Disney Lorcana     | `lorcana.png`     | 120 × 40 px     |
| Dragon Ball Super  | `dragonball.png`  | 120 × 40 px     |
| Yu-Gi-Oh!          | `yugioh.png`      | 120 × 40 px     |
| Naruto Mythos      | `naruto.png`      | 120 × 40 px     |

## How the fallback works

While a logo file is missing, the `GameLogo` component renders a colored pill with the
game abbreviation (MTG, PKM, OP, RB, TPP…). Once you drop the real PNG here, the image
loads automatically — no code change needed.

Use transparent PNGs for best results. The navbar constrains height to 20 px (`h-5`).
