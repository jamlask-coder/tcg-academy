// External card data from TCG APIs (Pokemon TCG, Scryfall, YGOProDeck, etc.)

export interface CardSet {
  id: string;
  name: string;
  series?: string;
  releaseDate?: string;
  total?: number;
  logo?: string;
  symbol?: string;
}

export interface ExternalCardData {
  id: string;
  name: string;
  setId: string;
  setName: string;
  number?: string;       // card number within set
  rarity?: string;
  language?: string;
  imageUrl?: string;
  imageUrlHiRes?: string;
  types?: string[];
  hp?: string;
  artist?: string;
  flavorText?: string;
  marketPrice?: number;
  source: "pokemon-tcg" | "scryfall" | "ygoprodeck" | "manual";
}
