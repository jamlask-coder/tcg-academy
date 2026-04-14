"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { LocalProduct } from "@/data/products";

// ─── Card data ────────────────────────────────────────────────────────────────

interface CardData {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
}

// ─── Set detection ────────────────────────────────────────────────────────────

const MAGIC_SET_MAP: [RegExp, string][] = [
  [/bloomburrow/i, "blb"],
  [/duskmourn/i, "dsk"],
  [/foundations/i, "fdn"],
  [/outlaws.*thunder/i, "otj"],
  [/murders.*karlov/i, "mkm"],
  [/lost caverns/i, "lci"],
  [/wilds.*eldraine/i, "woe"],
  [/march.*machine/i, "mom"],
  [/modern horizons 3/i, "mh3"],
  [/modern horizons 2/i, "mh2"],
];

// Pokemon: hardcoded top cards per set (API unreliable, images always available)
const POKEMON_CARDS: Record<string, CardData[]> = {
  sv8a: [ // Prismatic Evolutions
    { id: "sv8a-1", name: "Eevee ex SAR", imageUrl: "https://images.pokemontcg.io/sv8a/189_hires.png", rarity: "Special Art Rare" },
    { id: "sv8a-2", name: "Umbreon ex SAR", imageUrl: "https://images.pokemontcg.io/sv8a/191_hires.png", rarity: "Special Art Rare" },
    { id: "sv8a-3", name: "Sylveon ex SAR", imageUrl: "https://images.pokemontcg.io/sv8a/192_hires.png", rarity: "Special Art Rare" },
    { id: "sv8a-4", name: "Glaceon ex SAR", imageUrl: "https://images.pokemontcg.io/sv8a/190_hires.png", rarity: "Special Art Rare" },
    { id: "sv8a-5", name: "Espeon ex", imageUrl: "https://images.pokemontcg.io/sv8a/026_hires.png", rarity: "Double Rare" },
    { id: "sv8a-6", name: "Vaporeon ex", imageUrl: "https://images.pokemontcg.io/sv8a/030_hires.png", rarity: "Double Rare" },
    { id: "sv8a-7", name: "Jolteon ex", imageUrl: "https://images.pokemontcg.io/sv8a/050_hires.png", rarity: "Double Rare" },
    { id: "sv8a-8", name: "Flareon ex", imageUrl: "https://images.pokemontcg.io/sv8a/016_hires.png", rarity: "Double Rare" },
    { id: "sv8a-9", name: "Leafeon ex", imageUrl: "https://images.pokemontcg.io/sv8a/005_hires.png", rarity: "Double Rare" },
  ],
  sv8: [ // Surging Sparks
    { id: "sv8-1", name: "Pikachu ex SAR", imageUrl: "https://images.pokemontcg.io/sv8/286_hires.png", rarity: "Special Art Rare" },
    { id: "sv8-2", name: "Arceus ex SAR", imageUrl: "https://images.pokemontcg.io/sv8/283_hires.png", rarity: "Special Art Rare" },
    { id: "sv8-3", name: "Charizard ex", imageUrl: "https://images.pokemontcg.io/sv8/054_hires.png", rarity: "Double Rare" },
    { id: "sv8-4", name: "Raichu ex", imageUrl: "https://images.pokemontcg.io/sv8/082_hires.png", rarity: "Double Rare" },
    { id: "sv8-5", name: "Mewtwo ex", imageUrl: "https://images.pokemontcg.io/sv8/092_hires.png", rarity: "Double Rare" },
    { id: "sv8-6", name: "Gengar ex", imageUrl: "https://images.pokemontcg.io/sv8/101_hires.png", rarity: "Double Rare" },
    { id: "sv8-7", name: "Dragonite ex", imageUrl: "https://images.pokemontcg.io/sv8/167_hires.png", rarity: "Double Rare" },
    { id: "sv8-8", name: "Snorlax ex", imageUrl: "https://images.pokemontcg.io/sv8/172_hires.png", rarity: "Double Rare" },
  ],
  sv1: [ // Scarlet & Violet 151
    { id: "sv1-1", name: "Mew ex SAR", imageUrl: "https://images.pokemontcg.io/sv3pt5/205_hires.png", rarity: "Special Art Rare" },
    { id: "sv1-2", name: "Alakazam ex SAR", imageUrl: "https://images.pokemontcg.io/sv3pt5/201_hires.png", rarity: "Special Art Rare" },
    { id: "sv1-3", name: "Charizard ex", imageUrl: "https://images.pokemontcg.io/sv3pt5/006_hires.png", rarity: "Double Rare" },
    { id: "sv1-4", name: "Mewtwo ex", imageUrl: "https://images.pokemontcg.io/sv3pt5/150_hires.png", rarity: "Double Rare" },
    { id: "sv1-5", name: "Venusaur ex", imageUrl: "https://images.pokemontcg.io/sv3pt5/003_hires.png", rarity: "Double Rare" },
    { id: "sv1-6", name: "Blastoise ex", imageUrl: "https://images.pokemontcg.io/sv3pt5/009_hires.png", rarity: "Double Rare" },
    { id: "sv1-7", name: "Erika's Invitation SAR", imageUrl: "https://images.pokemontcg.io/sv3pt5/203_hires.png", rarity: "Special Art Rare" },
    { id: "sv1-8", name: "Gengar ex", imageUrl: "https://images.pokemontcg.io/sv3pt5/094_hires.png", rarity: "Double Rare" },
  ],
};

const POKEMON_SET_MAP: [RegExp, string][] = [
  [/prismatic evolutions/i, "sv8a"],
  [/surging sparks/i, "sv8"],
  [/151/i, "sv1"],
];

function detectSet(product: LocalProduct): { source: "magic" | "pokemon" | null; setCode: string | null } {
  if (product.game === "magic") {
    for (const [re, code] of MAGIC_SET_MAP) {
      if (re.test(product.name) || re.test(product.description) || product.tags.some(t => re.test(t))) {
        return { source: "magic", setCode: code };
      }
    }
  }
  if (product.game === "pokemon") {
    for (const [re, code] of POKEMON_SET_MAP) {
      if (re.test(product.name) || re.test(product.description) || product.tags.some(t => re.test(t))) {
        return { source: "pokemon", setCode: code };
      }
    }
  }
  return { source: null, setCode: null };
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

const cardCache = new Map<string, CardData[]>();

async function fetchMagicCards(setCode: string): Promise<CardData[]> {
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/search?q=set:${setCode}+(rarity:mythic+OR+rarity:rare)&order=usd&dir=desc&page=1`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || [])
      .filter((c: Record<string, unknown>) => c.image_uris)
      .slice(0, 12)
      .map((c: Record<string, unknown>) => ({
        id: c.id as string,
        name: c.name as string,
        imageUrl: (c.image_uris as Record<string, string>).normal,
        rarity: c.rarity as string,
      }));
  } catch {
    return [];
  }
}

function getPokemonCards(setCode: string): CardData[] {
  return POKEMON_CARDS[setCode] ?? [];
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function CardLightbox({ card, onClose }: { card: CardData; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative mx-4 max-h-[90vh] max-w-[400px]" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg transition hover:bg-gray-100"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.imageUrl}
          alt={card.name}
          className="h-auto max-h-[85vh] w-full rounded-2xl shadow-2xl"
        />
        <div className="mt-3 text-center">
          <p className="text-sm font-bold text-white">{card.name}</p>
          <p className="text-xs capitalize text-amber-300">{card.rarity}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  product: LocalProduct;
}

export function SetHighlightCards({ product }: Props) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxCard, setLightboxCard] = useState<CardData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const closeLightbox = useCallback(() => setLightboxCard(null), []);

  useEffect(() => {
    const { source, setCode } = detectSet(product);
    if (!source || !setCode) { setLoading(false); return; }

    const cacheKey = `${source}:${setCode}`;
    if (cardCache.has(cacheKey)) {
      setCards(cardCache.get(cacheKey)!);
      setLoading(false);
      return;
    }

    if (source === "pokemon") {
      // Instant — no API call needed
      const result = getPokemonCards(setCode);
      cardCache.set(cacheKey, result);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCards(result);
      setLoading(false);
    } else {
      // Magic — fetch from Scryfall
      fetchMagicCards(setCode).then((result) => {
        cardCache.set(cacheKey, result);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCards(result);
        setLoading(false);
      });
    }
  }, [product]);

  if (!loading && cards.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <>
      {lightboxCard && <CardLightbox card={lightboxCard} onClose={closeLightbox} />}

      <div className="my-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <span className="h-4 w-1 rounded-full bg-amber-400" />
            Mejores cartas de la colección
          </h3>
          {cards.length > 0 && (
            <span className="text-xs text-gray-400">{cards.length} cartas</span>
          )}
        </div>

        {loading ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 w-28 flex-shrink-0 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="group/carousel relative">
            <div
              ref={scrollRef}
              className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide"
              style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
            >
              {cards.map((card, i) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setLightboxCard(card)}
                  className="flex-shrink-0 focus:outline-none"
                  style={{
                    scrollSnapAlign: "start",
                    animation: `cardSlideIn 0.4s ease-out ${i * 0.06}s both`,
                  }}
                >
                  <div className="group/card relative w-28 cursor-pointer overflow-hidden rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      loading="lazy"
                      className="h-auto w-full rounded-lg"
                    />
                    <div className="absolute inset-0 flex items-end rounded-lg bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover/card:opacity-100">
                      <div className="p-2">
                        <p className="text-[10px] font-bold leading-tight text-white">{card.name}</p>
                        <p className="mt-0.5 text-[9px] capitalize text-amber-300">{card.rarity}</p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Nav arrows */}
            <button
              onClick={() => scroll("left")}
              className="absolute top-1/2 left-0 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow-lg opacity-0 transition-opacity group-hover/carousel:opacity-100"
              aria-label="Anterior"
            >
              <ChevronLeft size={16} className="text-gray-700" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="absolute top-1/2 right-0 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow-lg opacity-0 transition-opacity group-hover/carousel:opacity-100"
              aria-label="Siguiente"
            >
              <ChevronRight size={16} className="text-gray-700" />
            </button>
          </div>
        )}

        <style>{`
          @keyframes cardSlideIn {
            0% { opacity: 0; transform: translateY(12px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </div>
    </>
  );
}
