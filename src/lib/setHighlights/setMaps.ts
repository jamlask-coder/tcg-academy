// setMaps.ts — reglas regex por juego para la estrategia S1 (hardcoded-map).
// Extraído del monolito original src/components/product/SetHighlightCards.tsx.

// Magic: product tag/name → Scryfall set code
export const MAGIC_SET_MAP: [RegExp, string][] = [
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
  [/final.*fantasy/i, "fin"],
  [/tortugas.*ninja|teenage.*mutant/i, "tmt"],
  [/spider.man/i, "spd"],
  [/innistrad.*remastered/i, "inr"],
];

// Pokemon: product tag/name → pokemontcg.io set ID (EN names + JP set names)
export const POKEMON_SET_MAP: [RegExp, string][] = [
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
  // JP-exclusive → closest EN equivalent
  [/glory.*team.rocket|team.rocket/i, "sv10"],
  [/terastal.*festival/i, "sv4pt5"],
  [/heat.wave/i, "sv8"],
  [/paradise.dragona/i, "sv7"],
  [/black.bolt/i, "sv8"],
  [/white.flare/i, "sv8"],
  [/mega.inferno.?x|mega.*inferno/i, "sv10"],
  [/inferno.?x/i, "sv10"],
  [/mega.brave/i, "sv5"],
  [/mega.symphonia/i, "sv5"],
  [/mega.dream/i, "sv5"],
  [/nihil.*zero/i, "sv10"],
  [/ancient.roar/i, "sv4"],
  [/raging.surf/i, "sv4"],
  [/snow.hazard/i, "sv4"],
  [/vstar.universe/i, "sv4pt5"],
  [/blue.sky.stream/i, "swsh7"],
  // ES — Héroes Ascendentes (SV8.5 ES) y Pokémon Day 30 aniversario.
  [/heroes.ascendentes|h[eé]roes.ascendentes/i, "sv8pt5"],
  [/pokemon.day|pok[eé]mon.day|30.*aniversario/i, "sv3pt5"],
];

// Yu-Gi-Oh: product tag/name → partial set name for search
export const YUGIOH_SET_MAP: [RegExp, string][] = [
  [/age.of.overlord/i, "Age of Overlord"],
  [/phantom.nightmare/i, "Phantom Nightmare"],
  [/legacy.of.destruction/i, "Legacy of Destruction"],
  [/infinite.forbidden/i, "The Infinite Forbidden"],
  [/rage.of.the.abyss|ira.del.abismo/i, "Rage of the Abyss"],
  [/maze.of.memories/i, "Maze of Memories"],
  [/photon.hypernova/i, "Photon Hypernova"],
  [/darkwing.blast/i, "Darkwing Blast"],
  [/power.of.elements/i, "Power of the Elements"],
  [/dimension.force/i, "Dimension Force"],
  [/burst.of.destiny/i, "Burst of Destiny"],
];

// One Piece: product tag/name → Bandai set prefix
export const ONEPIECE_SET_MAP: [RegExp, string][] = [
  [/op.?15/i, "OP15"],
  [/op.?14/i, "OP14"],
  [/op.?13/i, "OP13"],
  [/op.?12/i, "OP12"],
  [/op.?11/i, "OP11"],
  [/op.?10/i, "OP10"],
  [/op.?09|yonkou|four.emperors/i, "OP09"],
  [/op.?08|roger|leyendas/i, "OP08"],
  [/op.?07/i, "OP07"],
  [/op.?06/i, "OP06"],
  [/op.?05/i, "OP05"],
  [/op.?04/i, "OP04"],
  [/op.?03/i, "OP03"],
  [/op.?02/i, "OP02"],
  [/op.?01/i, "OP01"],
  [/eb.?04/i, "EB04"],
  [/eb.?03/i, "EB03"],
  [/eb.?02/i, "EB02"],
  [/eb.?01/i, "EB01"],
];

// Lorcana: product tag/name → lorcana-api.com set name
export const LORCANA_SET_MAP: [RegExp, string][] = [
  [/archazia|archazi\b/i, "Archazia's Island"],
  [/winterspell/i, "Winterspell"],
  [/whispers.*well/i, "Whispers in the Well"],
  [/azurite.*sea|recuerdos?.*del?.*mar/i, "Azurite Sea"],
  [/shimmering.skies|cielos.*centelleantes|centelleantes/i, "Shimmering Skies"],
  [/ursula.*return|regreso.*ursula/i, "Ursula's Return"],
  [/into.*inklands|tintas.*destino/i, "Into the Inklands"],
  [/rise.*floodborn|auge.*sombras|ascenso.*anegados|anegados/i, "Rise of the Floodborn"],
  [/first.chapter|primer.cap[ií]tulo/i, "The First Chapter"],
  [/reign.*jafar/i, "Reign of Jafar"],
];

// Dragon Ball: product tag/name → Bandai set prefix
export const DRAGONBALL_SET_MAP: [RegExp, string][] = [
  [/fb.?05|across.time/i, "FB05"],
  [/fb.?04|blazing.aura/i, "FB04"],
  [/fb.?03|ruler.skies|raging.roar/i, "FB03"],
  [/fb.?02|ultra.limit/i, "FB02"],
  [/fb.?01|awakened.pulse/i, "FB01"],
];

// Riftbound: product tag/name → local data key
// `foundations` y `noxus-rising` → reutilizan los datos de "origins" (set base LoL)
// hasta que existan tablas dedicadas con cartas exclusivas.
export const RIFTBOUND_SET_MAP: [RegExp, string][] = [
  [/spiritforged/i, "spiritforged"],
  [/demacia/i, "origins"],
  [/unleashed/i, "origins"],
  [/noxus.?rising/i, "origins"],
  [/foundations/i, "origins"],
  [/origins/i, "origins"],
];

// Digimon: product tag/name → set code
export const DIGIMON_SET_MAP: [RegExp, string][] = [
  [/bt.?17|secret.*crisis/i, "BT17"],
  [/bt.?16|beginning.*observer/i, "BT16"],
  [/bt.?15|exceed.*apocalypse/i, "BT15"],
  [/bt.?14|blast.*ace/i, "BT14"],
  [/bt.?13|versus.*royal/i, "BT13"],
  [/bt.?12|across.*time/i, "BT12"],
  [/bt.?11|dimensional.*phase/i, "BT11"],
  [/bt.?10|xros.*encounter/i, "BT10"],
  [/ex.?08|chain.*liberator/i, "EX8"],
  [/ex.?07|digimon.*liberator/i, "EX7"],
  [/ex.?06|infernal.*ascension/i, "EX6"],
  [/ex.?05|animal.*colosseum/i, "EX5"],
  [/ex.?04|alternative.*being/i, "EX4"],
  [/ex.?03|draconic.*roar/i, "EX3"],
  [/ex.?02|digital.*hazard/i, "EX2"],
  [/ex.?01|classic.*collection/i, "EX1"],
];

// Naruto: product tag/name → internal set key
export const NARUTO_SET_MAP: [RegExp, string][] = [
  [/konoha.*shid[oō]|konoha/i, "konoha-shido"],
];

// Map product language to Scryfall lang codes
export const SCRYFALL_LANG: Record<string, string> = {
  EN: "en",
  ES: "es",
  JP: "ja",
  KO: "ko",
  FR: "fr",
  DE: "de",
  IT: "it",
  PT: "pt",
};

// Map product language to Bandai CDN region prefixes
export const BANDAI_OP_LANG: Record<string, string> = {
  EN: "OP-EN",
  JP: "OP-JP",
  ES: "OP-EN",
};
export const BANDAI_DBS_LANG: Record<string, string> = {
  EN: "DBSFW-EN",
  JP: "DBSFW-JP",
  ES: "DBSFW-EN",
};

// TCGDex CDN — free, multi-language Pokemon card images
export const TCGDEX_LANG: Record<string, string> = {
  EN: "en",
  ES: "es",
  JP: "ja",
  KO: "ja",
  FR: "fr",
  DE: "de",
  IT: "it",
  PT: "pt",
};

/** pokemontcg.io set ID → TCGDex EN set ID (TCGDex uses sv03.5 not sv3pt5) */
export const TCGDEX_EN_SET: Record<string, string> = {
  sv1: "sv01",
  sv2: "sv02",
  sv3: "sv03",
  sv3pt5: "sv03.5",
  sv4: "sv04",
  sv4pt5: "sv04.5",
  sv5: "sv05",
  sv6: "sv06",
  sv6pt5: "sv06.5",
  sv7: "sv07",
  sv8: "sv08",
  sv8pt5: "sv08.5",
  sv9: "sv09",
  sv10: "sv10",
  swsh12: "swsh12",
  swsh12pt5: "swsh12.5",
  swsh11: "swsh11",
  swsh10: "swsh10",
  swsh9: "swsh09",
  swsh8: "swsh08",
  swsh7: "swsh07",
  swsh6: "swsh06",
  swsh5: "swsh05",
};

/** pokemontcg.io set ID → TCGDex JP set ID (Japanese sets have different codes) */
export const TCGDEX_JP_SET: Record<string, string> = {
  sv1: "SV1S",
  sv2: "SV2D",
  sv3: "SV3",
  sv3pt5: "SV2a",
  sv4: "SV4K",
  sv4pt5: "SV4a",
  sv5: "SV5K",
  sv6: "SV6",
  sv6pt5: "SV6a",
  sv7: "SV7",
  sv8: "SV8",
  sv8pt5: "SV8a",
  sv9: "SV9",
  sv10: "SV10",
  swsh12: "S12",
  swsh12pt5: "S12a",
  swsh11: "S11",
  swsh10: "S10",
  swsh9: "S9",
  swsh8: "S8",
  swsh7: "S7",
  swsh6: "S6",
  swsh5: "S5",
};

/** Build TCGDex image URL — EN uses lowercase sv/sv03.5, JA uses uppercase SV/SV2a */
export function tcgdexImageUrl(lang: string, setId: string, cardNum: string): string {
  const isJpStyle = /^[A-Z]/.test(setId);
  const series = isJpStyle ? "SV" : "sv";
  return `https://assets.tcgdex.net/${lang}/${series}/${setId}/${cardNum.padStart(3, "0")}/high.webp`;
}

/** Rarezas que activan el shimmer holográfico */
const HOLO_RARITIES = new Set([
  "mythic",
  "rare",
  "rare holo",
  "rare holo ex",
  "rare holo gx",
  "rare holo v",
  "rare holo vmax",
  "rare holo vstar",
  "rare ultra",
  "rare rainbow",
  "rare secret",
  "illustration rare",
  "special art rare",
  "hyper rare",
  "double rare",
  "art rare",
  "sar",
  "sir",
  "ar",
  "ultra rare",
  "secret rare",
  "ghost rare",
  "ultimate rare",
  "starlight rare",
  "prismatic secret rare",
  "collector's rare",
  "quarter century secret rare",
]);

export function isHoloRarity(rarity: string | undefined): boolean {
  if (!rarity) return false;
  return HOLO_RARITIES.has(rarity.toLowerCase());
}

/**
 * Intenta encontrar un setCode "a mano" dentro de los tags del producto.
 * Útil para juegos donde el tag es el propio código canónico (ej. "BT17", "OP09", "FB04").
 */
export function extractSetCodeFromTags(
  tags: string[] | undefined,
  pattern: RegExp,
): string | null {
  if (!tags || tags.length === 0) return null;
  for (const t of tags) {
    const m = pattern.exec(t);
    if (m) return m[0].toUpperCase();
  }
  return null;
}
