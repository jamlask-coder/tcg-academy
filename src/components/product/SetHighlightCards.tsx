"use client";

// SetHighlightCards — UI pura.
// El motor de datos (resolución de set + fetch de cartas top) vive en:
//   src/lib/setHighlights/
// Este componente sólo consume `resolveHighlights(product)` y pinta el resultado.

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import { type LocalProduct } from "@/data/products";
import { resolveHighlights, type HighlightCard } from "@/lib/setHighlights";
import { TCGDEX_EN_SET, TCGDEX_JP_SET, TCGDEX_LANG, tcgdexSeriesPath } from "@/lib/setHighlights/setMaps";
import { clickableProps } from "@/lib/a11y";

// ─── Holo shimmer overlay ────────────────────────────────────────────────────

function HoloShimmer() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-lg"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,50,50,0.15) 0%, rgba(255,200,50,0.15) 20%, rgba(50,255,50,0.15) 40%, rgba(50,200,255,0.15) 60%, rgba(150,50,255,0.15) 80%, rgba(255,50,100,0.15) 100%)",
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

const SLOT_STYLES: Record<
  number,
  { scale: number; x: number; xSm: number; z: number; opacity: number }
> = {
  [-2]: { scale: 0.45, x: -340, xSm: -140, z: 0, opacity: 0.4 },
  [-1]: { scale: 0.65, x: -190, xSm: -90, z: 1, opacity: 0.7 },
  [0]: { scale: 1, x: 0, xSm: 0, z: 3, opacity: 1 },
  [1]: { scale: 0.65, x: 190, xSm: 90, z: 1, opacity: 0.7 },
  [2]: { scale: 0.45, x: 340, xSm: 140, z: 0, opacity: 0.4 },
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

  const touchStart = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const diff = touchStart.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0 && index < cards.length - 1) onNavigate(index + 1);
        if (diff < 0 && index > 0) onNavigate(index - 1);
      }
    },
    [index, cards.length, onNavigate],
  );

  const card = cards[index];
  if (!card) return null;

  const slots: { offset: number; card: HighlightCard; idx: number }[] = [];
  for (let off = -2; off <= 2; off++) {
    const i = index + off;
    if (i >= 0 && i < cards.length) slots.push({ offset: off, card: cards[i], idx: i });
  }

  // Histórico de precios retirado: el lightbox solo muestra la carta y su info.
  const hasChart = false;

  return (
    <div
      {...clickableProps(onClose)}
      className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md"
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
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(index - 1);
          }}
          className="absolute left-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/25 sm:left-4"
          aria-label="Anterior"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      {index < cards.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(index + 1);
          }}
          className="absolute right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/25 sm:right-4"
          aria-label="Siguiente"
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Coverflow cards */}
      <div
        className="relative flex flex-shrink-0 items-center justify-center"
        style={{
          height: hasChart ? (isMobile ? "46vh" : "52vh") : "70vh",
          width: "100%",
        }}
      >
        {slots.map(({ offset, card: c, idx }) => {
          const s = SLOT_STYLES[offset];
          const isCenter = offset === 0;
          const xPos = isMobile ? s.xSm : s.x;
          const maxH = hasChart ? (isMobile ? "42vh" : "48vh") : "65vh";
          return (
            <div
              key={c.id}
              {...clickableProps((e) => {
                e?.stopPropagation();
                if (!isCenter) onNavigate(idx);
              })}
              className="absolute"
              style={{
                transform: `translateX(${xPos}px) scale(${s.scale})`,
                zIndex: s.z,
                opacity: s.opacity,
                transition: "transform 0.4s ease, opacity 0.4s ease",
                cursor: isCenter ? "default" : "pointer",
              }}
            >
              <div className="relative overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  className={`h-auto w-auto rounded-2xl ${
                    isCenter ? "shadow-[0_0_60px_rgba(0,0,0,0.6)]" : "shadow-xl"
                  }`}
                  style={{
                    maxHeight: maxH,
                    maxWidth: isCenter
                      ? isMobile
                        ? "260px"
                        : "400px"
                      : isMobile
                        ? "200px"
                        : "320px",
                  }}
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (c.imageFallbackUrl && img.src !== c.imageFallbackUrl) {
                      img.src = c.imageFallbackUrl;
                    } else {
                      img.style.display = "none";
                    }
                  }}
                />
                {c.isHolo && <HoloShimmer />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info de la carta */}
      <div
        {...clickableProps((e) => e?.stopPropagation())}
        className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-3 px-4 sm:bottom-6"
      >
        <div className="text-center">
          <p className="text-base font-bold text-white sm:text-lg">{card.name}</p>
          {(card.isHolo || card.rarity) && (
            <div className="mt-1 flex items-center justify-center gap-2">
              {card.isHolo && <Sparkles size={14} className="text-amber-300" />}
              {card.rarity && (
                <p className="text-sm capitalize text-amber-300">{card.rarity}</p>
              )}
            </div>
          )}
          <p className="mt-1 text-xs text-white/40">
            {index + 1} / {cards.length}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Collection grid modal ──────────────────────────────────────────────────

function CollectionGridModal({
  cards,
  onClose,
}: {
  cards: HighlightCard[];
  onClose: () => void;
}) {
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

  const validCards = cards.filter((c) => !brokenIds.has(c.id));

  return (
    <>
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 backdrop-blur-sm">
        <div className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <h2 className="text-base font-bold text-white">
              Colección completa ({cards.length} cartas)
            </h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

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
                    const validIdx = validCards.findIndex((c) => c.id === card.id);
                    if (validIdx !== -1) setLightboxIndex(validIdx);
                  }}
                  className={`relative focus:outline-none active:scale-95 ${
                    isBroken ? "cursor-default opacity-20" : "cursor-pointer"
                  }`}
                  title={card.name}
                >
                  <div className="overflow-hidden rounded-lg transition-shadow duration-200 hover:shadow-xl hover:ring-2 hover:ring-white/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      loading="lazy"
                      className="aspect-[2/3] w-full rounded-lg bg-gray-800 object-cover"
                      onError={() =>
                        setBrokenIds((prev) => {
                          const next = new Set(prev);
                          next.add(card.id);
                          return next;
                        })
                      }
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

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

// ─── Source text per game ────────────────────────────────────────────────────

const SOURCE_TEXT: Record<string, string> = {
  magic: "Ordenadas por valor de mercado \u00B7 Fuente: Scryfall",
  pokemon: "Ordenadas por valor de mercado \u00B7 Fuente: PriceCharting",
  yugioh: "Ordenadas por valor de mercado \u00B7 Fuente: PriceCharting",
  "one-piece": "Cartas SEC y SR m\u00E1s cotizadas \u00B7 Fuente: Bandai TCG+",
  lorcana: "Ordenadas por rareza y valor \u00B7 Fuente: Lorcana API",
  "dragon-ball": "Cartas SCR y SR m\u00E1s cotizadas \u00B7 Fuente: Bandai TCG+",
  riftbound: "Cartas Signature m\u00E1s valiosas \u00B7 Fuente: PriceCharting",
  digimon: "Ordenadas por rareza \u00B7 Fuente: Digimon Card Dev DB",
  naruto: "Cartas destacadas del set Konoha Shid\u014D",
};

// ─── Auto-scrolling row with arrows ─────────────────────────────────────────

function AutoScrollRow<T extends { id: string }>({
  items,
  renderCard,
  onCardClick,
  intervalMs = 5000,
}: {
  items: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  onCardClick: (index: number) => void;
  intervalMs?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const scrollByCards = (direction: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardEl = el.querySelector("[data-card]");
    const cardWidth = cardEl?.clientWidth ?? 120;
    const gap = 8;
    const step = (cardWidth + gap) * 6;
    const maxScroll = el.scrollWidth - el.clientWidth;

    const target = el.scrollLeft + step * direction;
    if (target > maxScroll && direction > 0) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else if (target < 0 && direction < 0) {
      el.scrollTo({ left: maxScroll, behavior: "smooth" });
    } else {
      el.scrollBy({ left: step * direction, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (items.length === 0 || paused) return;
    const timer = setInterval(() => scrollByCards(1), intervalMs);
    return () => clearInterval(timer);
  }, [items.length, paused, intervalMs]);

  if (items.length === 0) return null;

  return (
    <div className="group/scroll relative">
      <button
        onClick={() => {
          scrollByCards(-1);
          setPaused(true);
          setTimeout(() => setPaused(false), 8000);
        }}
        className="absolute top-1/2 left-0 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-600 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-[#2563eb] sm:opacity-0 sm:group-hover/scroll:opacity-100"
        aria-label="Anteriores"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        onClick={() => {
          scrollByCards(1);
          setPaused(true);
          setTimeout(() => setPaused(false), 8000);
        }}
        className="absolute top-1/2 right-0 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-600 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-[#2563eb] sm:opacity-0 sm:group-hover/scroll:opacity-100"
        aria-label="Siguientes"
      >
        <ChevronRight size={16} />
      </button>
      <div
        ref={scrollRef}
        role="presentation"
        className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => {
          setTimeout(() => setPaused(false), 8000);
        }}
      >
        <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
        {items.map((item, i) => (
          <button
            key={item.id}
            data-card
            type="button"
            onClick={() => onCardClick(i)}
            className="w-[calc(100%/3-6px)] flex-shrink-0 cursor-pointer focus:outline-none sm:w-[calc(100%/6-8px)]"
          >
            {renderCard(item, i)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Coverflow-style carousel ────────────────────────────────────────────────

function CoverflowRow<T extends { id: string }>({
  items,
  renderCard,
  onCardClick,
  intervalMs = 4000,
}: {
  items: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  onCardClick: (index: number) => void;
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), intervalMs);
    return () => clearInterval(t);
  }, [paused, items.length, intervalMs]);

  const pauseFor = (ms: number) => {
    setPaused(true);
    setTimeout(() => setPaused(false), ms);
  };

  const go = (dir: number) => {
    setIndex((i) => (i + dir + items.length) % items.length);
    pauseFor(8000);
  };

  if (items.length === 0) return null;

  return (
    <div
      role="presentation"
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => pauseFor(8000)}
    >
      <div className="invisible mx-auto aspect-[2/3] w-[34%] sm:w-[20%]" />

      <div
        className="pointer-events-none absolute inset-0"
        style={{ perspective: "1400px" }}
      >
        {items.map((item, i) => {
          let off = i - index;
          if (off > items.length / 2) off -= items.length;
          if (off < -items.length / 2) off += items.length;
          const absOff = Math.abs(off);
          if (absOff > 3) return null;

          const tx = off * 40;
          const rotY = off * -20;
          const scale = 1 - absOff * 0.1;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (off === 0) onCardClick(i);
                else {
                  setIndex(i);
                  pauseFor(8000);
                }
              }}
              className="pointer-events-auto absolute top-0 left-1/2 aspect-[2/3] w-[34%] cursor-pointer rounded-lg focus:outline-none sm:w-[20%]"
              style={{
                transform: `translateX(calc(-50% + ${tx}%)) rotateY(${rotY}deg) scale(${scale})`,
                zIndex: 10 - absOff,
                transition:
                  "transform 500ms cubic-bezier(0.22, 1, 0.36, 1), filter 500ms ease",
                transformOrigin: "center center",
                filter: absOff === 0 ? "none" : "brightness(0.78)",
                boxShadow:
                  absOff === 0
                    ? "0 12px 28px rgba(0,0,0,0.18)"
                    : "0 4px 10px rgba(0,0,0,0.10)",
              }}
              aria-current={off === 0 ? "true" : undefined}
            >
              {renderCard(item, i)}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => go(-1)}
        className="absolute top-1/2 left-1 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-600 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-[#2563eb]"
        aria-label="Anterior"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        className="absolute top-1/2 right-1 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-600 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-[#2563eb]"
        aria-label="Siguiente"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

interface Props {
  product: LocalProduct;
}

interface TcgdexCard {
  id: string;
  name: string;
  localId: string;
}
interface TcgdexSet {
  cards?: TcgdexCard[];
}

export function SetHighlightCards({ product }: Props) {
  const [cards, setCards] = useState<HighlightCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [detectedGame, setDetectedGame] = useState<string | null>(null);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());

  const [collection, setCollection] = useState<HighlightCard[]>([]);
  const [colGridOpen, setColGridOpen] = useState(false);
  const [colLightboxIndex, setColLightboxIndex] = useState<number | null>(null);

  const markBroken = useCallback((id: string) => {
    setBrokenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const closeColLightbox = useCallback(() => setColLightboxIndex(null), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const lang = product.language ?? "EN";
      const result = await resolveHighlights(product, lang);
      if (cancelled) return;
      setDetectedGame(result.game);
      setCards(result.cards.filter((c) => c.imageUrl));
      setLoading(false);

      // Colección completa — solo Pokemon con TCGDex (se mantiene la lógica previa).
      if (product.game === "pokemon" && result.resolved?.setId) {
        const setKey = result.resolved.setId;
        const tLang = TCGDEX_LANG[lang] ?? "en";
        const isJp = lang === "JP" || lang === "KO";
        const setId = isJp
          ? (TCGDEX_JP_SET[setKey] ?? setKey)
          : (TCGDEX_EN_SET[setKey] ?? setKey);
        const series = tcgdexSeriesPath(setId);
        try {
          const r = await fetch(`https://api.tcgdex.net/v2/${tLang}/sets/${setId}`);
          const data = r.ok ? ((await r.json()) as TcgdexSet | null) : null;
          if (!cancelled && data?.cards) {
            setCollection(
              data.cards.map<HighlightCard>((c) => ({
                id: c.id,
                name: c.name,
                imageUrl: `https://assets.tcgdex.net/${tLang}/${series}/${setId}/${c.localId}/high.webp`,
                rarity: "",
                isHolo: false,
              })),
            );
          }
        } catch {
          /* noop */
        }
      }

      // Colección completa Magic — usa Scryfall (unique=prints limita duplicados).
      if (product.game === "magic" && result.resolved?.setId) {
        const setId = result.resolved.setId;
        try {
          const r = await fetch(
            `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`set:${setId}`)}&unique=cards&order=set&dir=asc`,
          );
          const data = r.ok
            ? ((await r.json()) as {
                data?: Array<{
                  id: string;
                  name: string;
                  printed_name?: string;
                  rarity?: string;
                  image_uris?: { normal?: string; small?: string };
                  card_faces?: { image_uris?: { normal?: string; small?: string } }[];
                }>;
              } | null)
            : null;
          if (!cancelled && data?.data) {
            const items = data.data
              .map<HighlightCard>((c) => {
                const imgs = c.image_uris ?? c.card_faces?.[0]?.image_uris ?? {};
                const img = imgs.normal ?? imgs.small ?? "";
                return {
                  id: c.id,
                  name: c.printed_name ?? c.name,
                  imageUrl: img,
                  imageFallbackUrl: imgs.small && imgs.small !== img ? imgs.small : undefined,
                  rarity: c.rarity ?? "",
                  isHolo: false,
                };
              })
              .filter((c) => c.imageUrl);
            setCollection(items);
          }
        } catch {
          /* noop */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product]);

  const validCards = cards.filter((c) => !brokenIds.has(c.id));

  if (!loading && validCards.length === 0) return null;

  return (
    <>
      {lightboxIndex !== null && (
        <CardLightbox
          cards={validCards.slice(0, 18)}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNavigate={setLightboxIndex}
        />
      )}
      {colLightboxIndex !== null && collection.length > 0 && (
        <CardLightbox
          cards={collection.slice(0, 18)}
          index={colLightboxIndex}
          onClose={closeColLightbox}
          onNavigate={setColLightboxIndex}
        />
      )}

      <div className="mt-3">
        {/* Cartas más cotizadas */}
        <h3 className="mb-2 text-xl font-bold text-gray-900">Cartas más cotizadas</h3>
        {loading ? (
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] w-[calc(100%/3-6px)] flex-shrink-0 animate-pulse rounded-lg bg-gray-100 sm:w-[calc(100%/6-8px)]"
              />
            ))}
          </div>
        ) : (
          <AutoScrollRow
            items={validCards.slice(0, 18)}
            onCardClick={(globalIdx) => setLightboxIndex(globalIdx)}
            renderCard={(card) => (
              <div className="group/card relative">
                <div className="relative overflow-hidden rounded-lg transition-transform duration-200 hover:scale-105 hover:shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    loading="lazy"
                    className="aspect-[2/3] w-full rounded-lg bg-gray-100 object-cover"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (card.imageFallbackUrl && img.src !== card.imageFallbackUrl) {
                        img.src = card.imageFallbackUrl;
                      } else {
                        const parent = img.closest("div");
                        if (parent) parent.style.display = "none";
                        markBroken(card.id);
                      }
                    }}
                  />
                  {card.isHolo && <HoloShimmer />}
                  <div className="absolute inset-0 flex flex-col items-center justify-end rounded-lg bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover/card:opacity-100">
                    <p className="pb-2 text-center text-[10px] font-bold leading-tight text-white sm:text-xs">
                      {card.name}
                    </p>
                  </div>
                </div>
              </div>
            )}
            intervalMs={3000}
          />
        )}
        {detectedGame && !loading && validCards.length > 0 && (
          <p className="mt-1.5 text-[10px] leading-tight text-gray-400">
            {SOURCE_TEXT[detectedGame] ?? ""}
          </p>
        )}

        {/* La Colección completa — solo Pokemon */}
        {collection.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={() => setColGridOpen(true)}
                className="group/col flex items-center gap-2 text-left"
              >
                <h3 className="text-xl font-bold text-gray-900 transition group-hover/col:text-[#2563eb]">
                  Ver colección
                </h3>
                <ChevronRight
                  size={18}
                  className="flex-shrink-0 text-gray-400 transition group-hover/col:text-[#2563eb]"
                />
              </button>
            </div>
            <CoverflowRow
              items={collection.slice(0, 18)}
              onCardClick={(globalIdx) => setColLightboxIndex(globalIdx)}
              renderCard={(card) => (
                <div className="h-full w-full overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    loading="lazy"
                    className="h-full w-full rounded-lg bg-gray-100 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0";
                    }}
                  />
                </div>
              )}
              intervalMs={4000}
            />
          </div>
        )}

        {colGridOpen && collection.length > 0 && (
          <CollectionGridModal cards={collection} onClose={() => setColGridOpen(false)} />
        )}
      </div>
    </>
  );
}
