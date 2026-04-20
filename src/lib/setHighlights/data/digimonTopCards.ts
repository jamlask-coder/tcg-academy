// Top cartas SEC/SR por set de Digimon Card Game — fallback estático.
// digimoncard.io (API pública) ha estado caído desde 2026-Q1; este fichero
// mantiene el sistema operativo mientras el API no se recupere. Cada tarjeta
// incluye una URL primaria (en.digimoncard.com) y una de respaldo
// (images.digimoncard.io) — el navegador usa la segunda si la primera falla.
//
// URL primaria:  https://en.digimoncard.com/images/cardlist/card/{SETCODE}-{NUM}.png
// URL fallback:  https://images.digimoncard.io/images/cards/{SETCODE}-{NUM}.jpg

import type { HighlightCard } from "../types";

interface DigimonEntry {
  num: string; // e.g. "001"
  name: string;
  rarity?: string; // SEC, SR, R
}

function buildDigimonCards(setCode: string, entries: DigimonEntry[]): HighlightCard[] {
  return entries.map<HighlightCard>((c) => ({
    id: `${setCode}-${c.num}`,
    name: c.name,
    imageUrl: `https://en.digimoncard.com/images/cardlist/card/${setCode}-${c.num}.png`,
    imageFallbackUrl: `https://images.digimoncard.io/images/cards/${setCode}-${c.num}.jpg`,
    rarity: c.rarity ?? "SR",
    isHolo: true,
    game: "digimon",
    externalId: `${setCode}-${c.num}`,
  }));
}

const DIGIMON_ENTRIES: Record<string, DigimonEntry[]> = {
  BT15: [
    { num: "110", name: "Omnimon X-Antibody", rarity: "SEC" },
    { num: "111", name: "Imperialdramon Paladin Mode", rarity: "SEC" },
    { num: "109", name: "Diaboromon", rarity: "SEC" },
    { num: "108", name: "Omnimon", rarity: "SR" },
    { num: "107", name: "Armageddemon", rarity: "SR" },
    { num: "106", name: "WarGreymon X-Antibody", rarity: "SR" },
  ],
  BT16: [
    { num: "112", name: "Gammamon", rarity: "SEC" },
    { num: "111", name: "Jellymon", rarity: "SEC" },
    { num: "110", name: "Angoramon", rarity: "SEC" },
    { num: "109", name: "Espimon", rarity: "SR" },
    { num: "108", name: "Canoweissmon", rarity: "SR" },
    { num: "107", name: "Regulusmon", rarity: "SR" },
  ],
  BT17: [
    { num: "111", name: "Omnimon Alter-S", rarity: "SEC" },
    { num: "112", name: "Beelzemon Blast Mode", rarity: "SEC" },
    { num: "110", name: "BlitzGreymon", rarity: "SEC" },
    { num: "109", name: "CresGarurumon", rarity: "SR" },
    { num: "108", name: "Magnamon", rarity: "SR" },
    { num: "107", name: "Rapidmon", rarity: "SR" },
  ],
  BT18: [
    { num: "112", name: "Alphamon", rarity: "SEC" },
    { num: "111", name: "Dorbickmon", rarity: "SEC" },
    { num: "110", name: "Zeedmillenniummon", rarity: "SEC" },
    { num: "109", name: "Gaiomon", rarity: "SR" },
    { num: "108", name: "GranKuwagamon", rarity: "SR" },
    { num: "107", name: "Metalseadramon", rarity: "SR" },
  ],
  BT19: [
    { num: "112", name: "Shoutmon X7 Superior Mode", rarity: "SEC" },
    { num: "111", name: "DarkKnightmon", rarity: "SEC" },
    { num: "110", name: "Tuwarmon", rarity: "SEC" },
    { num: "109", name: "Shoutmon X4", rarity: "SR" },
    { num: "108", name: "Deckerdramon", rarity: "SR" },
    { num: "107", name: "MetalGreymon (Blue)", rarity: "SR" },
  ],
  EX07: [
    { num: "072", name: "Agumon (Classic)", rarity: "SEC" },
    { num: "071", name: "MetalGreymon", rarity: "SEC" },
    { num: "070", name: "WarGreymon", rarity: "SR" },
    { num: "069", name: "Greymon", rarity: "SR" },
    { num: "068", name: "Garurumon", rarity: "SR" },
    { num: "067", name: "MetalGarurumon", rarity: "SR" },
  ],
  EX08: [
    { num: "072", name: "Impmon", rarity: "SEC" },
    { num: "071", name: "Beelzemon", rarity: "SEC" },
    { num: "070", name: "IceDevimon", rarity: "SR" },
    { num: "069", name: "Devimon", rarity: "SR" },
    { num: "068", name: "Myotismon", rarity: "SR" },
    { num: "067", name: "BelialVamdemon", rarity: "SR" },
  ],
};

export const DIGIMON_TOP_CARDS: Record<string, HighlightCard[]> = Object.fromEntries(
  Object.entries(DIGIMON_ENTRIES).map(([setCode, entries]) => [
    setCode,
    buildDigimonCards(setCode, entries),
  ]),
);
