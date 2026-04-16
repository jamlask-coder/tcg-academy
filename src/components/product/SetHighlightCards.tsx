"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import type { LocalProduct } from "@/data/products";

// ─── Card data ────────────────────────────────────────────────────────────────

interface HighlightCard {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
  isHolo: boolean;
}

// ─── Holo detection ──────────────────────────────────────────────────────────

const HOLO_RARITIES = new Set([
  // Magic
  "mythic", "rare",
  // Pokemon
  "rare holo", "rare holo ex", "rare holo gx", "rare holo v", "rare holo vmax",
  "rare holo vstar", "rare ultra", "rare rainbow", "rare secret",
  "illustration rare", "special art rare", "hyper rare", "double rare",
  "art rare", "sar", "sir", "ar",
  // Yu-Gi-Oh
  "ultra rare", "secret rare", "ghost rare", "ultimate rare",
  "starlight rare", "prismatic secret rare", "collector's rare",
  "quarter century secret rare",
]);

function isHoloRarity(rarity: string | undefined): boolean {
  if (!rarity) return false;
  return HOLO_RARITIES.has(rarity.toLowerCase());
}

// ─── Set detection maps ─────────────────────────────────────────────────────

// Magic: product tag/name → Scryfall set code
const MAGIC_SET_MAP: [RegExp, string][] = [
  [/bloomburrow/i, "blb"],
  [/duskmourn/i, "dsk"],
  [/foundations/i, "fdn"],
  [/outlaws.*thunder/i, "otj"],
  [/murders.*karlov/i, "mkm"],
  [/lost caverns/i, "lci"],
  [/wilds.*eldraine/i, "woe"],
  [/march.*machine/i, "mom"],
  [/modern.horizons.3/i, "mh3"],
  [/modern.horizons.2/i, "mh2"],
  [/one ring/i, "ltr"],
  [/lord.*rings/i, "ltr"],
  [/phyrexia.*all/i, "one"],
  [/brothers.*war/i, "bro"],
  [/dominaria.*united/i, "dmu"],
  [/streets.*new.*capenna/i, "snc"],
  [/neon.*dynasty/i, "neo"],
  [/crimson.*vow/i, "vow"],
  [/midnight.*hunt/i, "mid"],
  [/strixhaven/i, "stx"],
  [/kaldheim/i, "khm"],
  [/zendikar.*rising/i, "znr"],
  [/ikoria/i, "iko"],
  [/theros.*beyond/i, "thb"],
  [/throne.*eldraine/i, "eld"],
  [/aetherdrift/i, "dft"],
  [/tarkir.*dragonstorm/i, "tds"],
  [/final.*fantasy/i, "ffc"],
  [/tortugas.*ninja|teenage.*mutant/i, "pip"],
  [/spider.man/i, "spd"],
  [/innistrad.*remastered/i, "inr"],
];

// Pokemon: product tag/name → pokemontcg.io set ID (EN names + JP set names)
const POKEMON_SET_MAP: [RegExp, string][] = [
  // EN names
  [/destined.rivals/i, "sv10"],
  [/journey.together|battle.partners/i, "sv9"],
  [/prismatic.evolutions/i, "sv8pt5"],
  [/surging.sparks|super.electric.breaker/i, "sv8"],
  [/stellar.crown|stellar.miracle/i, "sv7"],
  [/shrouded.fable|night.wanderer/i, "sv6pt5"],
  [/twilight.masquerade/i, "sv6"],
  [/temporal.forces/i, "sv5"],
  [/paldean.fates|shiny.treasure/i, "sv4pt5"],
  [/paradox.rift/i, "sv4"],
  [/151/i, "sv3pt5"],
  [/obsidian.flames|ruler.*black.flame/i, "sv3"],
  [/paldea.evolved/i, "sv2"],
  [/scarlet.*violet.*base/i, "sv1"],
  [/crown.zenith/i, "swsh12pt5"],
  [/silver.tempest/i, "swsh12"],
  [/lost.origin/i, "swsh11"],
  [/astral.radiance/i, "swsh10"],
  [/brilliant.stars/i, "swsh9"],
  [/fusion.strike/i, "swsh8"],
  [/evolving.skies/i, "swsh7"],
  [/chilling.reign/i, "swsh6"],
  [/battle.styles/i, "swsh5"],
  [/vivid.voltage/i, "swsh4"],
  [/champion.*path/i, "swsh35"],
  // JP-exclusive set names → closest EN equivalent for top cards
  [/glory.*team.rocket/i, "sv8pt5"],
  [/terastal.*festival/i, "sv4pt5"],
  [/heat.wave/i, "sv8"],
  [/paradise.dragona/i, "sv7"],
  [/black.bolt/i, "sv8"],
  [/white.flare/i, "sv8"],
  [/mega.brave/i, "sv5"],
  [/mega.symphonia/i, "sv5"],
  [/ancient.roar/i, "sv4"],
  [/raging.surf/i, "sv4"],
  [/snow.hazard/i, "sv4"],
  [/vstar.universe/i, "sv4pt5"],
  [/blue.sky.stream/i, "swsh7"],
];

// Yu-Gi-Oh: product tag/name → partial set name for search
const YUGIOH_SET_MAP: [RegExp, string][] = [
  [/age.of.overlord/i, "Age of Overlord"],
  [/phantom.nightmare/i, "Phantom Nightmare"],
  [/legacy.of.destruction/i, "Legacy of Destruction"],
  [/infinite.forbidden/i, "The Infinite Forbidden"],
  [/rage.of.the.abyss/i, "Rage of the Abyss"],
  [/maze.of.memories/i, "Maze of Memories"],
  [/photon.hypernova/i, "Photon Hypernova"],
  [/darkwing.blast/i, "Darkwing Blast"],
  [/power.of.elements/i, "Power of the Elements"],
  [/dimension.force/i, "Dimension Force"],
  [/burst.of.destiny/i, "Burst of Destiny"],
];

// One Piece: product tag/name → Bandai set prefix
const ONEPIECE_SET_MAP: [RegExp, string][] = [
  [/op.?15/i, "OP15"], [/op.?14/i, "OP14"], [/op.?13/i, "OP13"],
  [/op.?12/i, "OP12"], [/op.?11/i, "OP11"], [/op.?10/i, "OP10"],
  [/op.?09|yonkou|four.emperors/i, "OP09"], [/op.?08|roger|leyendas/i, "OP08"],
  [/op.?07/i, "OP07"], [/op.?06/i, "OP06"], [/op.?05/i, "OP05"],
  [/op.?04/i, "OP04"], [/op.?03/i, "OP03"], [/op.?02/i, "OP02"], [/op.?01/i, "OP01"],
  [/eb.?04/i, "EB04"], [/eb.?03/i, "EB03"], [/eb.?02/i, "EB02"], [/eb.?01/i, "EB01"],
];

// Lorcana: product tag/name → lorcana-api.com set name
const LORCANA_SET_MAP: [RegExp, string][] = [
  [/archazia/i, "Archazia's Island"], [/winterspell/i, "Winterspell"],
  [/whispers.*well/i, "Whispers in the Well"], [/azurite.*sea/i, "Azurite Sea"],
  [/shimmering.skies/i, "Shimmering Skies"], [/ursula.*return/i, "Ursula's Return"],
  [/into.*inklands/i, "Into the Inklands"], [/rise.*floodborn/i, "Rise of the Floodborn"],
  [/first.chapter/i, "The First Chapter"], [/reign.*jafar/i, "Reign of Jafar"],
];

// Dragon Ball: product tag/name → Bandai set prefix
const DRAGONBALL_SET_MAP: [RegExp, string][] = [
  [/fb.?05|across.time/i, "FB05"], [/fb.?04|blazing.aura/i, "FB04"],
  [/fb.?03|ruler.skies|raging.roar/i, "FB03"], [/fb.?02|ultra.limit/i, "FB02"],
  [/fb.?01|awakened.pulse/i, "FB01"],
];

// Riftbound: product tag/name → local data key
const RIFTBOUND_SET_MAP: [RegExp, string][] = [
  [/spiritforged/i, "spiritforged"],
  [/demacia/i, "origins"], [/unleashed/i, "origins"], [/origins/i, "origins"],
];

// Map product language to Scryfall lang codes
const SCRYFALL_LANG: Record<string, string> = {
  EN: "en", ES: "es", JP: "ja", KO: "ko", FR: "fr", DE: "de", IT: "it", PT: "pt",
};

// Map product language to Bandai CDN region prefixes
const BANDAI_OP_LANG: Record<string, string> = { EN: "OP-EN", JP: "OP-JP", ES: "OP-EN" };
const BANDAI_DBS_LANG: Record<string, string> = { EN: "DBSFW-EN", JP: "DBSFW-JP", ES: "DBSFW-EN" };

// TCGDex CDN — free, multi-language Pokemon card images
const TCGDEX_LANG: Record<string, string> = {
  EN: "en", ES: "es", JP: "ja", KO: "ja", FR: "fr", DE: "de", IT: "it", PT: "pt",
};
/** pokemontcg.io set ID → TCGDex EN set ID (TCGDex uses sv03.5 not sv3pt5) */
const TCGDEX_EN_SET: Record<string, string> = {
  sv1: "sv01", sv2: "sv02", sv3: "sv03", "sv3pt5": "sv03.5", sv4: "sv04",
  "sv4pt5": "sv04.5", sv5: "sv05", sv6: "sv06", "sv6pt5": "sv06.5", sv7: "sv07",
  sv8: "sv08", "sv8pt5": "sv08.5", sv9: "sv09", sv10: "sv10",
  swsh12: "swsh12", "swsh12pt5": "swsh12.5", swsh11: "swsh11", swsh10: "swsh10",
  swsh9: "swsh09", swsh8: "swsh08", swsh7: "swsh07", swsh6: "swsh06", swsh5: "swsh05",
};
/** pokemontcg.io set ID → TCGDex JP set ID (Japanese sets have different codes) */
const TCGDEX_JP_SET: Record<string, string> = {
  sv1: "SV1S", sv2: "SV2D", sv3: "SV3", "sv3pt5": "SV2a", sv4: "SV4K",
  "sv4pt5": "SV4a", sv5: "SV5K", sv6: "SV6", "sv6pt5": "SV6a", sv7: "SV7",
  sv8: "SV8", "sv8pt5": "SV8a", sv9: "SV9", sv10: "SV10",
  swsh12: "S12", "swsh12pt5": "S12a", swsh11: "S11", swsh10: "S10",
  swsh9: "S9", swsh8: "S8", swsh7: "S7", swsh6: "S6", swsh5: "S5",
};
/** Build TCGDex image URL — EN uses lowercase sv/sv03.5, JA uses uppercase SV/SV2a */
function tcgdexImageUrl(lang: string, setId: string, cardNum: string): string {
  const isJpStyle = /^[A-Z]/.test(setId);
  const series = isJpStyle ? "SV" : "sv";
  return `https://assets.tcgdex.net/${lang}/${series}/${setId}/${cardNum.padStart(3, "0")}/high.webp`;
}

interface DetectedSet { game: string; setKey: string; lang: string }

const SET_MAPS: Record<string, [RegExp, string][]> = {
  magic: MAGIC_SET_MAP, pokemon: POKEMON_SET_MAP, yugioh: YUGIOH_SET_MAP,
  "one-piece": ONEPIECE_SET_MAP, lorcana: LORCANA_SET_MAP,
  "dragon-ball": DRAGONBALL_SET_MAP, riftbound: RIFTBOUND_SET_MAP,
};

function detectSet(product: LocalProduct): DetectedSet | null {
  const map = SET_MAPS[product.game];
  if (!map) return null;
  const searchIn = [product.name, product.description, ...product.tags].join(" ");
  for (const [re, key] of map) {
    if (re.test(searchIn)) return { game: product.game, setKey: key, lang: product.language || "EN" };
  }
  return null;
}

// ─── Fetching ────────────────────────────────────────────────────────────────

const highlightCache = new Map<string, HighlightCard[]>();

async function fetchMagicHighlights(setCode: string, lang: string): Promise<HighlightCard[]> {
  try {
    const sLang = SCRYFALL_LANG[lang] ?? "en";
    const langQuery = sLang !== "en" ? `+lang:${sLang}` : "";
    const res = await fetch(
      `https://api.scryfall.com/cards/search?q=set:${setCode}+(rarity:mythic+OR+rarity:rare)${langQuery}&order=usd&dir=desc&page=1`,
      { headers: { "Accept": "application/json" } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.data || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((c: any) => c.image_uris || c.card_faces?.[0]?.image_uris)
      .slice(0, 20)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => {
        const imgs = c.image_uris ?? c.card_faces?.[0]?.image_uris ?? {};
        return {
          id: c.id,
          name: c.printed_name ?? c.name,
          imageUrl: imgs.normal ?? imgs.small ?? "",
          rarity: c.rarity ?? "",
          isHolo: isHoloRarity(c.rarity),
        };
      });
  } catch {
    return [];
  }
}

// Top cards by market value per set (source: PriceCharting.com)
// en = TCGDex EN card number, ja = TCGDex JA card number (different numbering!)
const POKEMON_TOP_CARDS: Record<string, { en: string; ja: string; name: string }[]> = {
  "sv3pt5": [ // 151 — PriceCharting top 8
    { en: "199", ja: "201", name: "Charizard ex" }, { en: "200", ja: "202", name: "Blastoise ex" },
    { en: "198", ja: "200", name: "Venusaur ex" }, { en: "202", ja: "204", name: "Zapdos ex" },
    { en: "173", ja: "173", name: "Pikachu" }, { en: "168", ja: "168", name: "Charmander" },
    { en: "201", ja: "203", name: "Alakazam ex" }, { en: "205", ja: "205", name: "Mew ex" },
  ],
  sv3: [ // Obsidian Flames / Ruler of the Black Flame
    { en: "211", ja: "108", name: "Charizard ex" }, { en: "223", ja: "108", name: "Charizard ex" },
    { en: "210", ja: "105", name: "Tyranitar ex" }, { en: "215", ja: "107", name: "Dragonite ex" },
    { en: "197", ja: "097", name: "Revavroom ex" }, { en: "212", ja: "106", name: "Vespiquen ex" },
    { en: "213", ja: "104", name: "Absol ex" }, { en: "209", ja: "103", name: "Greedent ex" },
  ],
  sv8: [ // Surging Sparks / Super Electric Breaker
    { en: "269", ja: "106", name: "Pikachu ex" }, { en: "268", ja: "105", name: "Arceus" },
    { en: "267", ja: "104", name: "Dialga" }, { en: "253", ja: "098", name: "Pikachu ex" },
    { en: "252", ja: "097", name: "Eevee" }, { en: "266", ja: "103", name: "Palkia" },
    { en: "251", ja: "096", name: "Terapagos ex" }, { en: "250", ja: "095", name: "Solgaleo ex" },
  ],
  sv7: [ // Stellar Crown / Stellar Miracle
    { en: "175", ja: "102", name: "Terapagos ex" }, { en: "176", ja: "103", name: "Hydrapple ex" },
    { en: "171", ja: "098", name: "Lapras ex" }, { en: "173", ja: "100", name: "Galvantula ex" },
    { en: "170", ja: "097", name: "Terapagos ex" }, { en: "174", ja: "101", name: "Briar" },
    { en: "172", ja: "099", name: "Scolipede" }, { en: "169", ja: "096", name: "Cinderace ex" },
  ],
  sv6: [ // Twilight Masquerade
    { en: "214", ja: "101", name: "Bloodmoon Ursaluna ex" }, { en: "217", ja: "104", name: "Ogerpon ex" },
    { en: "211", ja: "098", name: "Greninja ex" }, { en: "216", ja: "103", name: "Carmine" },
    { en: "213", ja: "100", name: "Dragapult ex" }, { en: "212", ja: "099", name: "Magcargo ex" },
    { en: "215", ja: "102", name: "Kieran" }, { en: "210", ja: "097", name: "Sinistcha ex" },
  ],
  sv5: [ // Temporal Forces
    { en: "218", ja: "101", name: "Iron Leaves ex" }, { en: "208", ja: "098", name: "Walking Wake ex" },
    { en: "217", ja: "100", name: "Bianca's Devotion" }, { en: "209", ja: "099", name: "Iron Crown ex" },
    { en: "215", ja: "097", name: "Farigiraf ex" }, { en: "216", ja: "096", name: "Morpeko ex" },
    { en: "207", ja: "095", name: "Raging Bolt ex" }, { en: "206", ja: "094", name: "Gouging Fire ex" },
  ],
  sv4: [ // Paradox Rift
    { en: "256", ja: "108", name: "Roaring Moon ex" }, { en: "267", ja: "107", name: "Iron Valiant ex" },
    { en: "253", ja: "106", name: "Iron Hands ex" }, { en: "254", ja: "105", name: "Garchomp ex" },
    { en: "263", ja: "104", name: "Professor Sada's Vitality" }, { en: "264", ja: "103", name: "Professor Turo's Scenario" },
    { en: "255", ja: "102", name: "Gholdengo ex" }, { en: "252", ja: "101", name: "Maushold ex" },
  ],
  "sv4pt5": [ // Paldean Fates / Shiny Treasure EX
    { en: "231", ja: "341", name: "Charizard ex" }, { en: "244", ja: "355", name: "Iono" },
    { en: "230", ja: "340", name: "Gardevoir ex" }, { en: "232", ja: "342", name: "Forretress ex" },
    { en: "245", ja: "356", name: "Nemona" }, { en: "229", ja: "339", name: "Mimikyu ex" },
    { en: "243", ja: "354", name: "Arven" }, { en: "242", ja: "353", name: "Geeta" },
  ],
  "sv8pt5": [ // Prismatic Evolutions
    { en: "188", ja: "188", name: "Umbreon ex" }, { en: "189", ja: "189", name: "Sylveon ex" },
    { en: "183", ja: "183", name: "Espeon ex" }, { en: "186", ja: "186", name: "Glaceon ex" },
    { en: "180", ja: "180", name: "Eevee" }, { en: "185", ja: "185", name: "Leafeon ex" },
    { en: "184", ja: "184", name: "Flareon ex" }, { en: "187", ja: "187", name: "Vaporeon ex" },
  ],
  "sv6pt5": [ // Shrouded Fable / Night Wanderer
    { en: "99", ja: "092", name: "Pecharunt ex" }, { en: "91", ja: "084", name: "Kingambit" },
    { en: "93", ja: "086", name: "Munkidori" }, { en: "90", ja: "083", name: "Darkrai" },
    { en: "92", ja: "085", name: "Fezandipiti" }, { en: "94", ja: "087", name: "Janine's Secret Art" },
    { en: "95", ja: "088", name: "Kieran's Resolve" }, { en: "89", ja: "082", name: "Greninja" },
  ],
  sv1: [ // Scarlet & Violet Base
    { en: "245", ja: "245", name: "Gardevoir ex" }, { en: "210", ja: "210", name: "Drowzee" },
    { en: "244", ja: "244", name: "Miraidon ex" }, { en: "215", ja: "215", name: "Riolu" },
    { en: "204", ja: "204", name: "Slowpoke" }, { en: "251", ja: "251", name: "Miriam" },
    { en: "247", ja: "247", name: "Koraidon ex" }, { en: "225", ja: "225", name: "Gyarados ex" },
  ],
  sv2: [ // Paldea Evolved
    { en: "203", ja: "203", name: "Magikarp" }, { en: "222", ja: "222", name: "Tyranitar" },
    { en: "211", ja: "211", name: "Raichu" }, { en: "269", ja: "269", name: "Iono" },
    { en: "226", ja: "226", name: "Maushold" }, { en: "259", ja: "259", name: "Chi-Yu ex" },
    { en: "258", ja: "258", name: "Skeledirge ex" }, { en: "212", ja: "212", name: "Mismagius" },
  ],
  sv9: [ // Journey Together
    { en: "184", ja: "184", name: "Lillie's Clefairy ex" }, { en: "167", ja: "167", name: "N's Reshiram" },
    { en: "161", ja: "161", name: "Articuno" }, { en: "162", ja: "162", name: "Wailord" },
    { en: "187", ja: "187", name: "Salamence ex" }, { en: "185", ja: "185", name: "N's Zoroark ex" },
    { en: "183", ja: "183", name: "Iono's Bellibolt ex" }, { en: "186", ja: "186", name: "Hop's Zacian ex" },
  ],
  swsh12: [ // Silver Tempest
    { en: "186", ja: "186", name: "Lugia V" }, { en: "TG20", ja: "TG20", name: "Rayquaza VMAX" },
    { en: "TG29", ja: "TG29", name: "Rayquaza VMAX" }, { en: "138", ja: "138", name: "Lugia V" },
    { en: "059", ja: "059", name: "Radiant Alakazam" }, { en: "TG15", ja: "TG15", name: "Blaziken VMAX" },
    { en: "TG05", ja: "TG05", name: "Gardevoir" }, { en: "139", ja: "139", name: "Lugia VSTAR" },
  ],
  swsh7: [ // Evolving Skies
    { en: "215", ja: "215", name: "Umbreon VMAX" }, { en: "218", ja: "218", name: "Rayquaza VMAX" },
    { en: "192", ja: "192", name: "Dragonite V" }, { en: "189", ja: "189", name: "Umbreon V" },
    { en: "212", ja: "212", name: "Sylveon VMAX" }, { en: "194", ja: "194", name: "Rayquaza V" },
    { en: "205", ja: "205", name: "Leafeon VMAX" }, { en: "209", ja: "209", name: "Glaceon VMAX" },
  ],
};

// Pokemon: fully offline — uses hardcoded top cards + TCGDex CDN for images (no API dependency)
function getPokemonHighlights(setId: string, lang: string): HighlightCard[] {
  const topCards = POKEMON_TOP_CARDS[setId];
  if (!topCards) return [];
  const tcgLang = TCGDEX_LANG[lang] ?? "en";
  // JP/KO use Japanese set IDs, all others use EN set IDs
  const isJp = lang === "JP" || lang === "KO";
  const dexSet = isJp
    ? (TCGDEX_JP_SET[setId] ?? setId)
    : (TCGDEX_EN_SET[setId] ?? setId);
  return topCards.map((c) => {
    const num = isJp ? c.ja : c.en;
    return {
      id: `${setId}-${num}-${lang}`,
      name: c.name,
      imageUrl: tcgdexImageUrl(tcgLang, dexSet, num),
      rarity: "Ultra Rare",
      isHolo: true,
    };
  });
}

async function fetchYugiohHighlights(setName: string, lang: string): Promise<HighlightCard[]> {
  if (lang !== "EN") return [];
  try {
    const res = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardinfo.php?cardset=${encodeURIComponent(setName)}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    // Sort by Cardmarket price descending — most expensive first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sorted = (data.data || []).sort((a: any, b: any) =>
      parseFloat(b.card_prices?.[0]?.cardmarket_price ?? "0") - parseFloat(a.card_prices?.[0]?.cardmarket_price ?? "0"),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return sorted.slice(0, 20).map((c: any) => {
      const img = c.card_images?.[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setInfo = (c.card_sets as any[] | undefined)?.find(
        (s: { set_name: string }) => s.set_name.toLowerCase().includes(setName.toLowerCase()),
      );
      const rarity = setInfo?.set_rarity ?? "";
      return {
        id: String(c.id),
        name: c.name,
        imageUrl: img?.image_url ?? img?.image_url_small ?? "",
        rarity,
        isHolo: isHoloRarity(rarity),
      };
    });
  } catch {
    return [];
  }
}

// ─── One Piece (Bandai CDN — predictable URLs, no API pagination needed) ─────

// SEC/SR cards in One Piece always have the highest numbers in the set.
// Format: https://files.bandai-tcg-plus.com/card_image/OP-EN/{set}/batch_{set}-{num}_d.png
// Top 8 card numbers per set (SEC + SR + alt arts)
const OP_TOP_CARDS: Record<string, { num: string; name: string }[]> = {
  OP09: [
    { num: "119", name: "Portgas.D.Ace" }, { num: "118", name: "Monkey.D.Luffy" },
    { num: "120", name: "Sabo" }, { num: "117", name: "Shanks" },
    { num: "116", name: "Marshall.D.Teach" }, { num: "115", name: "Charlotte Linlin" },
    { num: "114", name: "Kaidou" }, { num: "113", name: "Roronoa Zoro" },
  ],
  OP10: [
    { num: "121", name: "Monkey.D.Luffy" }, { num: "120", name: "Nico Robin" },
    { num: "119", name: "Nami" }, { num: "118", name: "Sanji" },
    { num: "117", name: "Roronoa Zoro" }, { num: "116", name: "Jinbe" },
    { num: "115", name: "Franky" }, { num: "114", name: "Brook" },
  ],
  OP08: [
    { num: "118", name: "Gol D. Roger" }, { num: "117", name: "Edward Newgate" },
    { num: "119", name: "Monkey.D.Luffy" }, { num: "116", name: "Portgas.D.Ace" },
    { num: "115", name: "Shanks" }, { num: "114", name: "Kozuki Oden" },
    { num: "113", name: "Yamato" }, { num: "112", name: "Marco" },
  ],
  OP07: [
    { num: "119", name: "Portgas.D.Ace" }, { num: "118", name: "Monkey.D.Luffy" },
    { num: "109", name: "Monkey.D.Luffy" }, { num: "117", name: "Boa Hancock" },
    { num: "116", name: "Trafalgar Law" }, { num: "115", name: "Sanji" },
    { num: "114", name: "Jewelry Bonney" }, { num: "113", name: "Roronoa Zoro" },
  ],
  OP06: [
    { num: "118", name: "Roronoa Zoro" }, { num: "119", name: "Sanji" },
    { num: "117", name: "Monkey.D.Luffy" }, { num: "116", name: "O-Nami" },
    { num: "115", name: "Yamato" }, { num: "114", name: "Boa Hancock" },
    { num: "113", name: "Vinsmoke Reiju" }, { num: "101", name: "O-Nami" },
  ],
  OP04: [
    { num: "119", name: "Donquixote Rosinante" }, { num: "118", name: "Sabo" },
    { num: "100", name: "Capone Gang Bege" }, { num: "117", name: "Monkey.D.Luffy" },
    { num: "116", name: "Ms. All Sunday" }, { num: "115", name: "Hody Jones" },
    { num: "114", name: "Rebecca" }, { num: "064", name: "Ms. All Sunday" },
  ],
};

// ─── Dragon Ball (Bandai CDN) ────────────────────────────────────────────────

const DBS_TOP_CARDS: Record<string, { num: string; name: string }[]> = {
  FB04: [
    { num: "137", name: "Son Goku" }, { num: "136", name: "Vegeta" },
    { num: "135", name: "Frieza" }, { num: "134", name: "Broly" },
    { num: "133", name: "Beerus" }, { num: "132", name: "Whis" },
    { num: "131", name: "Hit" }, { num: "130", name: "Jiren" },
  ],
  FB03: [
    { num: "132", name: "Son Gohan" }, { num: "131", name: "Piccolo" },
    { num: "130", name: "Vegeta" }, { num: "129", name: "Son Goku" },
    { num: "128", name: "Cell" }, { num: "127", name: "Trunks" },
    { num: "126", name: "Android 18" }, { num: "125", name: "Krillin" },
  ],
  FB05: [
    { num: "139", name: "Son Goku" }, { num: "138", name: "Vegeta" },
    { num: "137", name: "Future Trunks" }, { num: "136", name: "Goku Black" },
    { num: "135", name: "Zamasu" }, { num: "134", name: "Hit" },
    { num: "133", name: "Beerus" }, { num: "132", name: "Champa" },
  ],
  FB02: [
    { num: "134", name: "Son Goku" }, { num: "133", name: "Vegeta" },
    { num: "132", name: "Frieza" }, { num: "131", name: "Son Gohan" },
    { num: "130", name: "Piccolo" }, { num: "129", name: "Android 17" },
    { num: "128", name: "Android 18" }, { num: "127", name: "Krillin" },
  ],
  FB01: [
    { num: "140", name: "Son Goku" }, { num: "139", name: "Vegeta" },
    { num: "138", name: "Frieza" }, { num: "137", name: "Broly" },
    { num: "136", name: "Cell" }, { num: "135", name: "Beerus" },
    { num: "134", name: "Whis" }, { num: "133", name: "Son Gohan" },
  ],
};

/** Shared builder for Bandai CDN games (One Piece + Dragon Ball) */
function getBandaiHighlights(
  cards: Record<string, { num: string; name: string }[]>,
  langMap: Record<string, string>,
  defaultRegion: string,
  rarity: string,
  suffix: string,
  setPrefix: string,
  lang: string,
): HighlightCard[] {
  const topCards = cards[setPrefix];
  if (!topCards) return [];
  const region = langMap[lang] ?? defaultRegion;
  return topCards.map((c) => ({
    id: `${setPrefix}-${c.num}-${lang}`,
    name: c.name,
    imageUrl: `https://files.bandai-tcg-plus.com/card_image/${region}/${setPrefix}/batch_${setPrefix}-${c.num}${suffix}`,
    rarity,
    isHolo: true,
  }));
}

// ─── Lorcana (lorcana-api.com — has CORS) ────────────────────────────────────

const LORCANA_RARITY_ORDER: Record<string, number> = {
  enchanted: 5, legendary: 4, "super rare": 3, rare: 2,
};

let lorcanaAllCards: (HighlightCard & { setName: string })[] | null = null;

async function fetchLorcanaHighlights(setName: string): Promise<HighlightCard[]> {
  try {
    if (!lorcanaAllCards) {
      const res = await fetch("https://api.lorcana-api.com/cards/all");
      if (!res.ok) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lorcanaAllCards = ((await res.json()) as any[]).map((c) => ({
        id: `${c.Set_Num}-${c.Name}`, name: c.Name, imageUrl: c.Image ?? "",
        rarity: c.Rarity ?? "", setName: c.Set_Name ?? "", isHolo: isHoloRarity(c.Rarity),
      }));
    }
    return lorcanaAllCards
      .filter((c) => c.setName === setName && c.imageUrl)
      .sort((a, b) => (LORCANA_RARITY_ORDER[b.rarity.toLowerCase()] ?? 0) - (LORCANA_RARITY_ORDER[a.rarity.toLowerCase()] ?? 0))
      .slice(0, 20);
  } catch {
    return [];
  }
}

// ─── Riftbound (hardcoded top cards — no free CORS API available) ────────────

// Riftbound top cards by market value (source: PriceCharting.com) — images stored locally
const RIFTBOUND_CARDS: Record<string, HighlightCard[]> = {
  // Top 20 Spiritforged cards by market value (source: PriceCharting.com, verified images)
  spiritforged: [
    { id: "sfd-227s", name: "Ahri - Inquisitive [Signature] #227", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/izjjj54spmuge6jv/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "sfd-225s", name: "Irelia - Fervent [Signature] #225", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/zk26vnro6d5ygcla/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "sfd-223s", name: "Vayne - Hunter [Signature] #223", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/fnw4mqnxgb42gyrj/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "sfd-239s", name: "Soraka - Wanderer [Signature] #239", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/zbakh522k5t6to4y/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "sfd-224s", name: "Aphelios - Exalted [Signature] #224", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/q7xgcfs42j25kiw2/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "sfd-232s", name: "Sett - Brawler [Signature] #232", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/2nt6vk5nw234qyuk/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "sfd-230s", name: "Teemo - Strategist [Signature] #230", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/s5h3gfj2gxhbsnex/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "sfd-233s", name: "Yone - Blademaster [Signature] #233", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/6xfxbygmuertdi4d/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "sfd-235s", name: "Yasuo - Windrider [Signature] #235", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/737j762jbd6kt4ho/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "sfd-228s", name: "Bard - Mercurial [Signature] #228", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/pavno6wkz5xt5k5d/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "sfd-236s", name: "Darius - Executioner [Signature] #236", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/4q3m4srax2ycaoeq/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "sfd-227", name: "Ahri - Inquisitive #227", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/c3u4djyv2coz637o/1600.jpg", rarity: "Overnumber", isHolo: true },
    { id: "sfd-237s", name: "Karma - Channeler [Signature] #237", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/7sf6m2kg5p33nwvs/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "sfd-225", name: "Irelia - Fervent #225", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/fhnxmgv3t4daejf5/1600.jpg", rarity: "Overnumber", isHolo: true },
    { id: "sfd-246", name: "Irelia - Blade Dancer #246", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/dn3nrkpc7wdggjq7/1600.jpg", rarity: "Overnumber", isHolo: true },
    { id: "sfd-234", name: "Seal of Discord #234", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/56wcgcrt2j3krfvb/1600.jpg", rarity: "Overnumber", isHolo: true },
    { id: "sfd-238", name: "Seal of Unity #238", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/zcqg4uqxoikfajf5/1600.jpg", rarity: "Overnumber", isHolo: true },
    { id: "sfd-223", name: "Vayne - Hunter #223", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/3wyeoag5wjefmdte/1600.jpg", rarity: "Overnumber", isHolo: true },
    { id: "sfd-248", name: "Ezreal - Prodigal Explorer #248", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/2gunqpdk2uujyqio/1600.jpg", rarity: "Overnumber", isHolo: true },
    { id: "sfd-251", name: "Fiora - Grand Duelist #251", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/saztcdfpg7bklup6/1600.jpg", rarity: "Overnumber", isHolo: true },
  ],
  // Top 20 Origins cards by market value (source: PriceCharting.com, verified images)
  origins: [
    { id: "ori-299s", name: "Kai'Sa - Daughter of the Void [Signature] #299", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/7j4ccdi2rtczspyi/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "ori-303s", name: "Ahri - Nine-Tailed Fox [Signature] #303", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/s5zm7jpcy3hg7eve/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "ori-309s", name: "Miss Fortune - Bounty Hunter [Signature] #309", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/wycromqsq6d4zyne/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "ori-307s", name: "Teemo - Swift Scout [Signature] #307", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/d3hx3furli2sanfq/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "ori-301s", name: "Jinx - Loose Cannon [Signature] #301", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/ywquskhlc4nf4beq/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "ori-308s", name: "Viktor - Herald of the Arcane [Signature] #308", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/c4jin4k2udu2m7nh/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "ori-304s", name: "Lee Sin - Blind Monk [Signature] #304", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/6374u4sn6bzqa4o2/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "ori-305s", name: "Yasuo - Unforgiven [Signature] #305", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/q24mbltxy64cwtno/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "ori-310s", name: "Sett - The Boss [Signature] #310", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/i5v53afmenuj4xla/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "ori-306s", name: "Leona - Radiant Dawn [Signature] #306", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/ssmi47g2xznaqmho/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "ori-300s", name: "Volibear - Relentless Storm [Signature] #300", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/aqhwe2rwdo6xo77v/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "ori-302s", name: "Darius - Hand of Noxus [Signature] #302", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/wfyqcdwjhwywvvdb/1600.jpg", rarity: "Signature", isHolo: true },
    { id: "ori-303", name: "Ahri - Nine-Tailed Fox #303", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/n6l6rxc3hutsylki/1600.jpg", rarity: "Overnumber", isHolo: true },
    { id: "ori-299", name: "Kai'Sa - Daughter of the Void #299", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/5dkyhq4bbjbqcxzp/1600.jpg", rarity: "Overnumber", isHolo: true },
    { id: "ori-309", name: "Miss Fortune - Bounty Hunter #309", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/uor4xz2uhir6vauh/1600.jpg", rarity: "Overnumber", isHolo: true },
    { id: "ori-66p", name: "Ahri - Alluring [Launch Promo] #66", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/jpzm4vsafei3szxx/1600.jpg", rarity: "Promo", isHolo: true },
    { id: "ori-308", name: "Viktor - Herald of the Arcane #308", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/x4226lu3kq7rq3yb/1600.jpg", rarity: "Overnumber", isHolo: true },
    { id: "ori-301", name: "Jinx - Loose Cannon #301", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/lma73y7hnczuko7z/1600.jpg", rarity: "Overnumber", isHolo: true },
    { id: "ori-306", name: "Leona - Radiant Dawn #306", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/bspgbfq5v6jeo5xu/1600.jpg", rarity: "Overnumber", isHolo: true },
    { id: "ori-307", name: "Teemo - Swift Scout #307", imageUrl: "https://storage.googleapis.com/images.pricecharting.com/c7gatr22jatsldcf/1600.jpg", rarity: "Overnumber", isHolo: true },
  ],
};

// ─── Fetch dispatcher ────────────────────────────────────────────────────────

async function fetchHighlights(game: string, setKey: string, lang: string): Promise<HighlightCard[]> {
  const cacheKey = `${game}:${setKey}:${lang}`;
  if (highlightCache.has(cacheKey)) return highlightCache.get(cacheKey)!;

  let result: HighlightCard[] = [];
  if (game === "magic") result = await fetchMagicHighlights(setKey, lang);
  else if (game === "pokemon") result = getPokemonHighlights(setKey, lang);
  else if (game === "yugioh") result = await fetchYugiohHighlights(setKey, lang);
  else if (game === "one-piece") result = getBandaiHighlights(OP_TOP_CARDS, BANDAI_OP_LANG, "OP-EN", "SEC", "_d.png", setKey, lang);
  else if (game === "dragon-ball") result = getBandaiHighlights(DBS_TOP_CARDS, BANDAI_DBS_LANG, "DBSFW-EN", "SCR", ".png", setKey, lang);
  else if (game === "lorcana") result = await fetchLorcanaHighlights(setKey);
  else if (game === "riftbound") result = RIFTBOUND_CARDS[setKey] ?? [];

  if (result.length > 0) highlightCache.set(cacheKey, result);
  return result;
}

// ─── Holo shimmer overlay ────────────────────────────────────────────────────

function HoloShimmer() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-lg"
        style={{
          background: "linear-gradient(135deg, rgba(255,50,50,0.15) 0%, rgba(255,200,50,0.15) 20%, rgba(50,255,50,0.15) 40%, rgba(50,200,255,0.15) 60%, rgba(150,50,255,0.15) 80%, rgba(255,50,100,0.15) 100%)",
          backgroundSize: "200% 200%",
          animation: "holoShimmer 3s ease infinite",
          mixBlendMode: "color-dodge",
        }}
      />
      <style>{`
        @keyframes holoShimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </>
  );
}

// ─── Coverflow lightbox ──────────────────────────────────────────────────────

const SLOT_STYLES: Record<number, { scale: number; x: number; xSm: number; z: number; opacity: number }> = {
  [-2]: { scale: 0.45, x: -340, xSm: -140, z: 0, opacity: 0.4 },
  [-1]: { scale: 0.65, x: -190, xSm: -90,  z: 1, opacity: 0.7 },
  [0]:  { scale: 1,    x: 0,    xSm: 0,    z: 3, opacity: 1 },
  [1]:  { scale: 0.65, x: 190,  xSm: 90,   z: 1, opacity: 0.7 },
  [2]:  { scale: 0.45, x: 340,  xSm: 140,  z: 0, opacity: 0.4 },
};

function CardLightbox({
  cards,
  index,
  onClose,
  onNavigate,
}: {
  cards: HighlightCard[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onNavigate(index - 1);
      if (e.key === "ArrowRight" && index < cards.length - 1) onNavigate(index + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, onNavigate, index, cards.length]);

  // Touch swipe for mobile
  const touchStart = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && index < cards.length - 1) onNavigate(index + 1);
      if (diff < 0 && index > 0) onNavigate(index - 1);
    }
  }, [index, cards.length, onNavigate]);

  const card = cards[index];
  if (!card) return null;

  const slots: { offset: number; card: HighlightCard; idx: number }[] = [];
  for (let off = -2; off <= 2; off++) {
    const i = index + off;
    if (i >= 0 && i < cards.length) slots.push({ offset: off, card: cards[i], idx: i });
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-md"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/25"
        aria-label="Cerrar"
      >
        <X size={18} />
      </button>

      {/* Arrows */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(index - 1); }}
          className="absolute left-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/25 sm:left-4"
          aria-label="Anterior"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      {index < cards.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}
          className="absolute right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/25 sm:right-4"
          aria-label="Siguiente"
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Coverflow cards */}
      <div className="relative flex items-center justify-center" style={{ height: "70vh", width: "100%" }}>
        {slots.map(({ offset, card: c, idx }) => {
          const s = SLOT_STYLES[offset];
          const isCenter = offset === 0;
          const xPos = isMobile ? s.xSm : s.x;
          return (
            <div
              key={c.id}
              className="absolute"
              style={{
                transform: `translateX(${xPos}px) scale(${s.scale})`,
                zIndex: s.z,
                opacity: s.opacity,
                transition: "transform 0.4s ease, opacity 0.4s ease",
                cursor: isCenter ? "default" : "pointer",
              }}
              onClick={(e) => { e.stopPropagation(); if (!isCenter) onNavigate(idx); }}
            >
              <div className="relative overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  className={`h-auto max-h-[65vh] w-auto rounded-2xl ${isCenter ? "shadow-[0_0_60px_rgba(0,0,0,0.6)]" : "shadow-xl"}`}
                  style={{ maxWidth: isCenter ? (isMobile ? "260px" : "400px") : (isMobile ? "200px" : "320px") }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                {c.isHolo && <HoloShimmer />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info for center card */}
      <div className="absolute bottom-6 left-0 right-0 px-4 text-center sm:bottom-8" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-bold text-white sm:text-lg">{card.name}</p>
        <div className="mt-1 flex items-center justify-center gap-2">
          {card.isHolo && <Sparkles size={14} className="text-amber-300" />}
          <p className="text-sm capitalize text-amber-300">{card.rarity}</p>
        </div>
        <p className="mt-1.5 text-sm text-white/40">{index + 1} / {cards.length}</p>
      </div>
    </div>
  );
}

// ─── Collection grid modal ──────────────────────────────────────────────────

function CollectionGridModal({ cards, onClose }: { cards: HighlightCard[]; onClose: () => void }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxIndex === null) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxIndex, onClose]);

  // Cards with valid images for lightbox navigation
  const validCards = cards.filter((c) => !brokenIds.has(c.id));

  return (
    <>
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 backdrop-blur-sm">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <h2 className="text-base font-bold text-white">Colección completa ({cards.length} cartas)</h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
            {cards.map((card, i) => {
              const isBroken = brokenIds.has(card.id);
              return (
                <button
                  key={`${card.id}-${i}`}
                  type="button"
                  onClick={() => {
                    if (isBroken) return;
                    // Find the index in validCards (which excludes broken images)
                    const validIdx = validCards.findIndex((c) => c.id === card.id);
                    if (validIdx !== -1) setLightboxIndex(validIdx);
                  }}
                  className={`relative focus:outline-none active:scale-95 ${isBroken ? "cursor-default opacity-20" : "cursor-pointer"}`}
                  title={card.name}
                >
                  <div className="overflow-hidden rounded-lg transition-shadow duration-200 hover:shadow-xl hover:ring-2 hover:ring-white/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      loading="lazy"
                      className="aspect-[2/3] w-full rounded-lg bg-gray-800 object-cover"
                      onError={() => setBrokenIds((prev) => { const next = new Set(prev); next.add(card.id); return next; })}
                    />
                  </div>
                  <p className="mt-1 truncate text-center text-[9px] text-white/50">{card.name}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lightbox — rendered AFTER modal so it renders on top (higher z-index) */}
      {lightboxIndex !== null && validCards.length > 0 && (
        <CardLightbox
          cards={validCards}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  product: LocalProduct;
}

// Source text per game
const SOURCE_TEXT: Record<string, string> = {
  magic: "Ordenadas por valor de mercado \u00B7 Fuente: Scryfall",
  pokemon: "Ordenadas por valor de mercado \u00B7 Fuente: PriceCharting",
  yugioh: "Ordenadas por valor de mercado \u00B7 Fuente: PriceCharting",
  "one-piece": "Cartas SEC y SR m\u00E1s cotizadas \u00B7 Fuente: Bandai TCG+",
  lorcana: "Ordenadas por rareza y valor \u00B7 Fuente: Lorcana API",
  "dragon-ball": "Cartas SCR y SR m\u00E1s cotizadas \u00B7 Fuente: Bandai TCG+",
  riftbound: "Cartas Signature m\u00E1s valiosas \u00B7 Fuente: PriceCharting",
};

export function SetHighlightCards({ product }: Props) {
  const [cards, setCards] = useState<HighlightCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const [detectedGame, setDetectedGame] = useState<string | null>(null);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());

  // Full collection state
  const [collection, setCollection] = useState<HighlightCard[]>([]);
  const [colGridOpen, setColGridOpen] = useState(false);
  const [colCardIdx, setColCardIdx] = useState<number | null>(null);
  const [colLightboxIndex, setColLightboxIndex] = useState<number | null>(null);

  const markBroken = useCallback((id: string) => {
    setBrokenIds((prev) => { const next = new Set(prev); next.add(id); return next; });
  }, []);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const closeColLightbox = useCallback(() => setColLightboxIndex(null), []);

  useEffect(() => {
    const detected = detectSet(product);
    if (!detected) { setLoading(false); return; }

    setDetectedGame(detected.game);
    fetchHighlights(detected.game, detected.setKey, detected.lang).then((result) => {
      setCards(result.filter((c) => c.imageUrl));
      setLoading(false);
    });

    // Fetch full collection from TCGDex (Pokemon only for now)
    if (detected.game === "pokemon") {
      const lang = TCGDEX_LANG[detected.lang] ?? "en";
      const isJp = detected.lang === "JP" || detected.lang === "KO";
      const setId = isJp
        ? (TCGDEX_JP_SET[detected.setKey] ?? detected.setKey)
        : (TCGDEX_EN_SET[detected.setKey] ?? detected.setKey);
      const isJpStyle = /^[A-Z]/.test(setId);
      const series = isJpStyle ? "SV" : "sv";
      fetch(`https://api.tcgdex.net/v2/${lang}/sets/${setId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (!data?.cards) return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setCollection(data.cards.map((c: any) => ({
            id: c.id,
            name: c.name,
            imageUrl: `https://assets.tcgdex.net/${lang}/${series}/${setId}/${c.localId}/high.webp`,
            rarity: "",
            isHolo: false,
          })));
        })
        .catch(() => {});
    }
  }, [product]);

  const validCards = cards.filter((c) => !brokenIds.has(c.id));

  if (!loading && validCards.length === 0) return null;

  const CARDS_PER_VIEW = 20;
  const canScrollLeft = scrollPos > 0;
  const canScrollRight = scrollPos < validCards.length - CARDS_PER_VIEW;

  const scrollLeft = () => setScrollPos((p) => Math.max(0, p - CARDS_PER_VIEW));
  const scrollRight = () => setScrollPos((p) => Math.min(validCards.length - CARDS_PER_VIEW, p + CARDS_PER_VIEW));

  const visibleCards = validCards.slice(scrollPos, scrollPos + CARDS_PER_VIEW);


  return (
    <>
      {lightboxIndex !== null && (
        <CardLightbox
          cards={validCards}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNavigate={setLightboxIndex}
        />
      )}
      {colLightboxIndex !== null && collection.length > 0 && (
        <CardLightbox
          cards={collection}
          index={colLightboxIndex}
          onClose={closeColLightbox}
          onNavigate={setColLightboxIndex}
        />
      )}

      <div className="mt-6">
        {/* Cartas más cotizadas — 6 columns */}
        <h3 className="mb-2 text-xl font-bold text-gray-900">Cartas más cotizadas</h3>
        {loading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {visibleCards.map((card, i) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setLightboxIndex(scrollPos + i)}
                className="group/card relative cursor-pointer focus:outline-none"
                title={`${card.name} — ${card.rarity}`}
              >
                <div className="relative overflow-hidden rounded-lg transition-transform duration-200 hover:scale-105 hover:shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    loading="lazy"
                    className="aspect-[2/3] w-full rounded-lg bg-gray-100 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).closest("button")!.style.display = "none"; markBroken(card.id); }}
                  />
                  {card.isHolo && <HoloShimmer />}
                  <div className="absolute inset-0 flex flex-col items-center justify-end rounded-lg bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover/card:opacity-100">
                    <p className="pb-2 text-center text-[10px] font-bold leading-tight text-white sm:text-xs">{card.name}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        {detectedGame && !loading && validCards.length > 0 && (
          <p className="mt-1.5 text-[10px] leading-tight text-gray-400">
            {SOURCE_TEXT[detectedGame] ?? ""}
          </p>
        )}

        {/* La Colección — 6 cards with scroll + link to full grid */}
        {collection.length > 0 && (() => {
          const PER = 6;
          return (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <button
                  onClick={() => setColGridOpen(true)}
                  className="group/col flex items-center gap-2 text-left"
                >
                  <h3 className="text-xl font-bold text-gray-900 transition group-hover/col:text-[#2563eb]">
                    Ver la colección completa de {product.name.replace(/^\[DEMO\]\s*/i, "").replace(/\s*\(\d+\s*(?:cartas|sobres)\)/gi, "")} ({collection.length})
                  </h3>
                  <ChevronRight size={18} className="flex-shrink-0 text-gray-400 transition group-hover/col:text-[#2563eb]" />
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setColCardIdx((p) => Math.max(0, (p ?? 0) - PER))}
                    disabled={(colCardIdx ?? 0) <= 0}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 transition hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Anteriores"
                  >
                    <ChevronLeft size={13} className="text-gray-600" />
                  </button>
                  <button
                    onClick={() => setColCardIdx((p) => Math.min(collection.length - PER, (p ?? 0) + PER))}
                    disabled={(colCardIdx ?? 0) >= collection.length - PER}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 transition hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Siguientes"
                  >
                    <ChevronRight size={13} className="text-gray-600" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {collection.slice(colCardIdx ?? 0, (colCardIdx ?? 0) + PER).map((card, i) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setColLightboxIndex((colCardIdx ?? 0) + i)}
                    className="relative cursor-pointer focus:outline-none"
                    title={card.name}
                  >
                    <div className="overflow-hidden rounded-lg transition-transform duration-200 hover:scale-105 hover:shadow-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        loading="lazy"
                        className="aspect-[2/3] w-full rounded-lg bg-gray-100 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Full collection grid modal */}
        {colGridOpen && collection.length > 0 && (
          <CollectionGridModal
            cards={collection}
            onClose={() => setColGridOpen(false)}
          />
        )}
      </div>
    </>
  );
}
