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
];

// Pokemon: product tag/name → pokemontcg.io set ID
const POKEMON_SET_MAP: [RegExp, string][] = [
  [/destined.rivals/i, "sv10"],
  [/journey.together/i, "sv9"],
  [/prismatic.evolutions/i, "sv8pt5"],
  [/surging.sparks/i, "sv8"],
  [/stellar.crown/i, "sv7"],
  [/shrouded.fable/i, "sv6pt5"],
  [/twilight.masquerade/i, "sv6"],
  [/temporal.forces/i, "sv5"],
  [/paldean.fates/i, "sv4pt5"],
  [/paradox.rift/i, "sv4"],
  [/151/i, "sv3pt5"],
  [/obsidian.flames/i, "sv3"],
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

// One Piece (TCGCSV categoryId: 68) — product tag/name → TCGCSV groupId
const ONEPIECE_SET_MAP: [RegExp, string][] = [
  [/op.?15|time.of.battle/i, "24664"], [/op.?14|adventure.*kami/i, "24637"],
  [/op.?13|azure.*sea/i, "24537"], [/op.?12|legacy.*master/i, "24302"],
  [/op.?11|fist.*divine/i, "24241"], [/op.?10|royal.blood/i, "23766"],
  [/op.?09|yonkou|four.emperors|carrying.*will/i, "24303"],
  [/op.?08|emperors.*new/i, "23589"], [/op.?07|two.legends/i, "23462"],
  [/op.?06|500.years/i, "23387"], [/op.?05|wings.*captain/i, "23272"],
  [/op.?04|awakening/i, "23213"], [/op.?03|kingdoms/i, "23024"],
  [/op.?02|pillars/i, "22890"], [/op.?01|paramount/i, "17698"],
  [/eb.?04|heroines/i, "24545"], [/eb.?03|anime.*collection/i, "23834"],
  [/romance.dawn/i, "3188"],
];

// Lorcana (TCGCSV categoryId: 71)
const LORCANA_SET_MAP: [RegExp, string][] = [
  [/winterspell/i, "24500"], [/whispers.*well/i, "24414"],
  [/reign.*jafar/i, "24258"], [/archazia/i, "24011"],
  [/azurite.*sea/i, "23746"], [/shimmering.skies/i, "23536"],
  [/ursula.*return/i, "23474"], [/into.*inklands/i, "23367"],
  [/rise.*floodborn/i, "23303"], [/first.chapter/i, "22937"],
];

// Dragon Ball Fusion World (TCGCSV categoryId: 80)
const DRAGONBALL_SET_MAP: [RegExp, string][] = [
  [/cross.force/i, "24604"], [/dual.evolution/i, "24569"],
  [/saiyan.*pride/i, "24450"], [/fb.?05|blazing.aura/i, "23470"],
  [/fb.?04|awakened.pulse/i, "23401"], [/fb.?03|raging.roar/i, "23517"],
  [/fb.?02|ultra.limit/i, "23658"], [/fb.?01|new.adventure/i, "23928"],
  [/rivals.clash/i, "24247"],
];

// Riftbound (TCGCSV categoryId: 89)
const RIFTBOUND_SET_MAP: [RegExp, string][] = [
  [/unleashed/i, "24560"], [/spiritforged/i, "24519"],
  [/origins/i, "24344"],
];

function detectSet(product: LocalProduct): { game: string; setKey: string } | null {
  const searchIn = [product.name, product.description, ...product.tags].join(" ");

  if (product.game === "magic") {
    for (const [re, code] of MAGIC_SET_MAP) {
      if (re.test(searchIn)) return { game: "magic", setKey: code };
    }
  }
  if (product.game === "pokemon") {
    for (const [re, code] of POKEMON_SET_MAP) {
      if (re.test(searchIn)) return { game: "pokemon", setKey: code };
    }
  }
  if (product.game === "yugioh") {
    for (const [re, name] of YUGIOH_SET_MAP) {
      if (re.test(searchIn)) return { game: "yugioh", setKey: name };
    }
  }
  if (product.game === "one-piece") {
    for (const [re, gid] of ONEPIECE_SET_MAP) {
      if (re.test(searchIn)) return { game: "one-piece", setKey: gid };
    }
  }
  if (product.game === "lorcana") {
    for (const [re, gid] of LORCANA_SET_MAP) {
      if (re.test(searchIn)) return { game: "lorcana", setKey: gid };
    }
  }
  if (product.game === "dragon-ball") {
    for (const [re, gid] of DRAGONBALL_SET_MAP) {
      if (re.test(searchIn)) return { game: "dragon-ball", setKey: gid };
    }
  }
  if (product.game === "riftbound") {
    for (const [re, gid] of RIFTBOUND_SET_MAP) {
      if (re.test(searchIn)) return { game: "riftbound", setKey: gid };
    }
  }
  return null;
}

// ─── Fetching ────────────────────────────────────────────────────────────────

const highlightCache = new Map<string, HighlightCard[]>();

async function fetchMagicHighlights(setCode: string): Promise<HighlightCard[]> {
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/search?q=set:${setCode}+(rarity:mythic+OR+rarity:rare)&order=usd&dir=desc&page=1`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.data || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((c: any) => c.image_uris || c.card_faces?.[0]?.image_uris)
      .slice(0, 8)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => {
        const imgs = c.image_uris ?? c.card_faces?.[0]?.image_uris ?? {};
        return {
          id: c.id,
          name: c.name,
          imageUrl: imgs.normal ?? imgs.small ?? "",
          rarity: c.rarity ?? "",
          isHolo: isHoloRarity(c.rarity),
        };
      });
  } catch {
    return [];
  }
}

async function fetchPokemonHighlights(setId: string): Promise<HighlightCard[]> {
  try {
    // Fetch the best rarities directly — "Illustration Rare" captures SIR, SAR, IR, etc.
    const res = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}%20rarity:%22Illustration%20Rare%22&pageSize=8&select=id,name,images,rarity`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cards: HighlightCard[] = (data.data || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((c: any) => c.images?.large || c.images?.small)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        imageUrl: c.images?.large ?? c.images?.small ?? "",
        rarity: c.rarity ?? "",
        isHolo: isHoloRarity(c.rarity),
      }));

    // If not enough illustration rares, fill with Double Rare
    if (cards.length < 8) {
      const res2 = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}%20rarity:%22Double%20Rare%22&pageSize=${8 - cards.length}&select=id,name,images,rarity`,
      );
      if (res2.ok) {
        const data2 = await res2.json();
        const existingIds = new Set(cards.map((c) => c.id));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const c of data2.data || []) {
          if (existingIds.has(c.id) || !(c.images?.large || c.images?.small)) continue;
          cards.push({
            id: c.id, name: c.name,
            imageUrl: c.images.large ?? c.images.small ?? "",
            rarity: c.rarity ?? "", isHolo: isHoloRarity(c.rarity),
          });
          if (cards.length >= 8) break;
        }
      }
    }
    return cards;
  } catch {
    return [];
  }
}

async function fetchYugiohHighlights(setName: string): Promise<HighlightCard[]> {
  try {
    const res = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardinfo.php?cardset=${encodeURIComponent(setName)}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.data || []).slice(0, 8).map((c: any) => {
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

// ─── TCGCSV (One Piece, Lorcana, Dragon Ball, Riftbound) ─────────────────────
// Free API with daily-updated TCGPlayer prices. Cards sorted by market value.

const TCGCSV_CATEGORIES: Record<string, number> = {
  "one-piece": 68, lorcana: 71, "dragon-ball": 80, riftbound: 89,
};

async function fetchTcgCsvHighlights(game: string, groupId: string): Promise<HighlightCard[]> {
  const catId = TCGCSV_CATEGORIES[game];
  if (!catId) return [];

  try {
    const [prodsRes, pricesRes] = await Promise.all([
      fetch(`https://tcgcsv.com/tcgplayer/${catId}/${groupId}/products`),
      fetch(`https://tcgcsv.com/tcgplayer/${catId}/${groupId}/prices`),
    ]);
    if (!prodsRes.ok || !pricesRes.ok) return [];

    const prods = (await prodsRes.json()).results as { productId: number; name: string; imageUrl?: string }[];
    const prices = (await pricesRes.json()).results as { productId: number; marketPrice?: number; subTypeName?: string }[];

    const prodMap = new Map(prods.map((p) => [p.productId, p]));
    const sealedRe = /\b(booster|box|case|pack|deck|bundle|set|display|tin)\b/i;

    return prices
      .filter((p) => p.marketPrice && p.marketPrice > 0)
      .map((p) => {
        const prod = prodMap.get(p.productId);
        if (!prod?.imageUrl || sealedRe.test(prod.name)) return null;
        return {
          id: String(p.productId),
          name: prod.name,
          imageUrl: prod.imageUrl.replace("_200w", "_400w"),
          rarity: p.subTypeName === "Foil" ? "Foil" : "Rare",
          isHolo: p.subTypeName === "Foil",
          marketPrice: p.marketPrice!,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b as HighlightCard & { marketPrice: number }).marketPrice - (a as HighlightCard & { marketPrice: number }).marketPrice)
      .slice(0, 8) as HighlightCard[];
  } catch {
    return [];
  }
}

// ─── Fetch dispatcher ────────────────────────────────────────────────────────

async function fetchHighlights(game: string, setKey: string): Promise<HighlightCard[]> {
  const cacheKey = `${game}:${setKey}`;
  if (highlightCache.has(cacheKey)) return highlightCache.get(cacheKey)!;

  let result: HighlightCard[] = [];
  if (game === "magic") result = await fetchMagicHighlights(setKey);
  else if (game === "pokemon") result = await fetchPokemonHighlights(setKey);
  else if (game === "yugioh") result = await fetchYugiohHighlights(setKey);
  else if (game in TCGCSV_CATEGORIES) result = await fetchTcgCsvHighlights(game, setKey);

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md"
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
      <div className="relative flex items-center justify-center" style={{ height: "70vh", width: "100%" }} onClick={(e) => e.stopPropagation()}>
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
              onClick={() => { if (!isCenter) onNavigate(idx); }}
            >
              <div className="relative overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  className={`h-auto max-h-[65vh] w-auto rounded-2xl ${isCenter ? "shadow-[0_0_60px_rgba(0,0,0,0.6)]" : "shadow-xl"}`}
                  style={{ maxWidth: isCenter ? (isMobile ? "260px" : "400px") : (isMobile ? "200px" : "320px") }}
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

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  product: LocalProduct;
}

// Source text per game
const SOURCE_TEXT: Record<string, string> = {
  magic: "Ordenadas por valor de mercado (USD) \u00B7 Fuente: Scryfall",
  pokemon: "Seleccionadas por rareza (Illustration Rare, Double Rare) \u00B7 Fuente: Pok\u00E9mon TCG API",
  yugioh: "Cartas destacadas de la colecci\u00F3n \u00B7 Fuente: YGOProDeck",
  "one-piece": "Ordenadas por valor de mercado (USD) \u00B7 Fuente: TCGPlayer",
  lorcana: "Ordenadas por valor de mercado (USD) \u00B7 Fuente: TCGPlayer",
  "dragon-ball": "Ordenadas por valor de mercado (USD) \u00B7 Fuente: TCGPlayer",
  riftbound: "Ordenadas por valor de mercado (USD) \u00B7 Fuente: TCGPlayer",
};

export function SetHighlightCards({ product }: Props) {
  const [cards, setCards] = useState<HighlightCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const [detectedGame, setDetectedGame] = useState<string | null>(null);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  useEffect(() => {
    const detected = detectSet(product);
    if (!detected) { setLoading(false); return; }

    setDetectedGame(detected.game);
    fetchHighlights(detected.game, detected.setKey).then((result) => {
      setCards(result);
      setLoading(false);
    });
  }, [product]);

  if (!loading && cards.length === 0) return null;

  const CARDS_PER_VIEW = 4;
  const canScrollLeft = scrollPos > 0;
  const canScrollRight = scrollPos < cards.length - CARDS_PER_VIEW;

  const scrollLeft = () => setScrollPos((p) => Math.max(0, p - CARDS_PER_VIEW));
  const scrollRight = () => setScrollPos((p) => Math.min(cards.length - CARDS_PER_VIEW, p + CARDS_PER_VIEW));

  const visibleCards = cards.slice(scrollPos, scrollPos + CARDS_PER_VIEW);

  return (
    <>
      {lightboxIndex !== null && (
        <CardLightbox
          cards={cards}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNavigate={setLightboxIndex}
        />
      )}

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <span className="h-4 w-1 rounded-full bg-amber-400" />
            Mejores cartas de la colección
          </h3>
          {cards.length > CARDS_PER_VIEW && (
            <div className="flex items-center gap-1">
              <button
                onClick={scrollLeft}
                disabled={!canScrollLeft}
                className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 transition hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Anteriores"
              >
                <ChevronLeft size={11} className="text-gray-600" />
              </button>
              <button
                onClick={scrollRight}
                disabled={!canScrollRight}
                className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 transition hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Siguientes"
              >
                <ChevronRight size={11} className="text-gray-600" />
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-4 gap-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2.5">
            {visibleCards.map((card, i) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setLightboxIndex(scrollPos + i)}
                className="group/card relative cursor-pointer focus:outline-none"
                title={`${card.name} — ${card.rarity}`}
                style={{ animation: `highlightSlideIn 0.3s ease-out ${i * 0.04}s both` }}
              >
                <div className="relative overflow-hidden rounded-lg transition-transform duration-200 hover:scale-105 hover:shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    loading="lazy"
                    className="aspect-[2/3] w-full rounded-lg bg-gray-100 object-cover"
                  />
                  {card.isHolo && <HoloShimmer />}
                  {card.isHolo && (
                    <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400/90 shadow-sm" title="Holo">
                      <Sparkles size={8} className="text-white" />
                    </span>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-end rounded-lg bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover/card:opacity-100">
                    <div className="pb-2 text-center">
                      <p className="text-[8px] font-bold leading-tight text-white sm:text-[9px]">{card.name}</p>
                      <p className="mt-0.5 flex items-center justify-center gap-1 text-[7px] text-white/60 sm:text-[8px]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>
                        Ampliar
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {detectedGame && !loading && cards.length > 0 && (
          <p className="mt-1.5 text-[10px] leading-tight text-gray-400">
            {SOURCE_TEXT[detectedGame] ?? ""}
          </p>
        )}

        <style>{`
          @keyframes highlightSlideIn {
            0% { opacity: 0; transform: translateY(8px) scale(0.96); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
    </>
  );
}
