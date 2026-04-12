// Per-game hero section data: card images and background pattern type.
// Card images come from free TCG APIs (Pokemon TCG, Scryfall, YGOProDeck).
// Games without free API cards use placeholder data (imageUrl omitted).

export interface HeroCard {
  name: string;
  imageUrl?: string;
}

export type BgPattern =
  | "pokeball"
  | "runes"
  | "egyptian"
  | "waves"
  | "hexagons"
  | "sparkles"
  | "aura"
  | "leaves"
  | "grid"
  | "diamond"
  | "circuit";

export interface GameHeroData {
  cards: HeroCard[];
  bgPattern: BgPattern;
}

export const GAME_HERO_DATA: Record<string, GameHeroData> = {
  pokemon: {
    bgPattern: "pokeball",
    cards: [
      {
        name: "Charizard VSTAR",
        imageUrl: "https://images.pokemontcg.io/swsh9/18_hires.png",
      },
      {
        name: "Pikachu VMAX",
        imageUrl: "https://images.pokemontcg.io/swsh4/44_hires.png",
      },
      {
        name: "Mewtwo ex",
        imageUrl: "https://images.pokemontcg.io/sv4/58_hires.png",
      },
      {
        name: "Umbreon VMAX",
        imageUrl: "https://images.pokemontcg.io/swsh7/95_hires.png",
      },
      {
        name: "Giratina VSTAR",
        imageUrl: "https://images.pokemontcg.io/swsh11/131_hires.png",
      },
    ],
  },
  magic: {
    bgPattern: "runes",
    cards: [
      {
        name: "Black Lotus",
        imageUrl:
          "https://cards.scryfall.io/large/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg",
      },
      {
        name: "Jace, Mind Sculptor",
        imageUrl:
          "https://cards.scryfall.io/large/front/0/e/0e606072-a3aa-4300-ba90-ec92a721fa76.jpg",
      },
      {
        name: "Lightning Bolt",
        imageUrl:
          "https://cards.scryfall.io/large/front/d/5/d573ef03-4730-45aa-93dd-e45ac1dbaf4a.jpg",
      },
      {
        name: "Ragavan",
        imageUrl:
          "https://cards.scryfall.io/large/front/a/9/a9738cda-adb1-47fb-9f4c-ecd930228c4d.jpg",
      },
      {
        name: "Thoughtseize",
        imageUrl:
          "https://cards.scryfall.io/large/front/b/2/b281a308-ab6b-47b6-bec7-632c9aaecede.jpg",
      },
    ],
  },
  yugioh: {
    bgPattern: "egyptian",
    cards: [
      {
        name: "Blue-Eyes White Dragon",
        imageUrl:
          "https://images.ygoprodeck.com/images/cards_cropped/89631139.jpg",
      },
      {
        name: "Dark Magician",
        imageUrl:
          "https://images.ygoprodeck.com/images/cards_cropped/46986414.jpg",
      },
      {
        name: "Exodia",
        imageUrl:
          "https://images.ygoprodeck.com/images/cards_cropped/33396948.jpg",
      },
      {
        name: "Red-Eyes Black Dragon",
        imageUrl:
          "https://images.ygoprodeck.com/images/cards_cropped/74677422.jpg",
      },
      {
        name: "Stardust Dragon",
        imageUrl:
          "https://images.ygoprodeck.com/images/cards_cropped/44508094.jpg",
      },
    ],
  },
  "one-piece": {
    bgPattern: "waves",
    cards: [
      { name: "Monkey D. Luffy" },
      { name: "Shanks, Red-Hair" },
      { name: "Kaido, King of Beasts" },
      { name: "Yamato" },
      { name: "Nami, Navigator" },
    ],
  },
  riftbound: {
    bgPattern: "hexagons",
    cards: [
      { name: "Jinx, Get Excited!" },
      { name: "Jayce, Piltover's Defender" },
      { name: "Ekko, Boy Who Shattered Time" },
      { name: "Vi, Enforcer" },
      { name: "Caitlyn, Sheriff" },
    ],
  },
  lorcana: {
    bgPattern: "sparkles",
    cards: [
      { name: "Elsa, Spirit of Winter" },
      { name: "Mickey Mouse, True Friend" },
      { name: "Stitch, Rock Star" },
      { name: "Maleficent, Mistress of Evil" },
      { name: "Simba, Future King" },
    ],
  },
  "dragon-ball": {
    bgPattern: "aura",
    cards: [
      { name: "Son Goku, Super Saiyan" },
      { name: "Vegeta, Super Saiyan" },
      { name: "Broly, Legendary" },
      { name: "Frieza, Tyrant" },
      { name: "Gohan, Potential Unlocked" },
    ],
  },
  naruto: {
    bgPattern: "leaves",
    cards: [
      { name: "Naruto Uzumaki" },
      { name: "Sasuke Uchiha" },
      { name: "Kakashi Hatake" },
      { name: "Itachi Uchiha" },
      { name: "Minato Namikaze" },
    ],
  },
  topps: {
    bgPattern: "grid",
    cards: [
      { name: "Erling Haaland" },
      { name: "Kylian Mbappé" },
      { name: "Vinicius Jr." },
      { name: "Jude Bellingham" },
      { name: "Pedri González" },
    ],
  },
  panini: {
    bgPattern: "diamond",
    cards: [
      { name: "Lionel Messi" },
      { name: "Cristiano Ronaldo" },
      { name: "Neymar Jr." },
      { name: "Lewandowski" },
      { name: "Benzema" },
    ],
  },
  digimon: {
    bgPattern: "circuit",
    cards: [
      { name: "Agumon" },
      { name: "Garurumon" },
      { name: "WarGreymon" },
      { name: "MetalGarurumon" },
      { name: "Omnimon" },
    ],
  },
};
