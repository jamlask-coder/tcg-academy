// Naruto TCG — set inicial "Konoha Shidō".
// Al no haber API pública estable, usamos placeholders por ahora.
// Cuando Bandai publique un CDN/API estable, se reemplazarán con URLs reales.

import type { HighlightCard } from "../types";

export const NARUTO_TOP_CARDS: Record<string, HighlightCard[]> = {
  "konoha-shido": [
    {
      id: "ks-001",
      name: "Naruto Uzumaki",
      imageUrl: "/images/placeholder-product.svg",
      rarity: "Ultra Rare",
      isHolo: true,
    },
    {
      id: "ks-002",
      name: "Sasuke Uchiha",
      imageUrl: "/images/placeholder-product.svg",
      rarity: "Ultra Rare",
      isHolo: true,
    },
    {
      id: "ks-003",
      name: "Sakura Haruno",
      imageUrl: "/images/placeholder-product.svg",
      rarity: "Super Rare",
      isHolo: true,
    },
    {
      id: "ks-004",
      name: "Kakashi Hatake",
      imageUrl: "/images/placeholder-product.svg",
      rarity: "Super Rare",
      isHolo: true,
    },
    {
      id: "ks-005",
      name: "Itachi Uchiha",
      imageUrl: "/images/placeholder-product.svg",
      rarity: "Secret Rare",
      isHolo: true,
    },
    {
      id: "ks-006",
      name: "Hinata Hyuga",
      imageUrl: "/images/placeholder-product.svg",
      rarity: "Rare",
      isHolo: true,
    },
  ],
};
