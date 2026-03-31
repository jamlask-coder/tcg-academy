"use client";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { HoloCard } from "./HoloCard";
import { GameCharacterIllustration } from "./GameCharacterIllustration";
import { GAME_HERO_DATA } from "@/data/gameHeroData";
import { Container } from "@/components/ui/Container";
import type { BgPattern } from "@/data/gameHeroData";

interface GameConfig {
  name: string;
  color: string;
  bgColor: string;
  description: string;
  emoji: string;
}

interface Props {
  game: string;
  config: GameConfig;
  /** Kept for API compatibility with game page — not used internally */
  featuredProducts?: unknown[];
}

// ── Fan layout config ──────────────────────────────────────────────────────────
const FAN_5 = [
  { rotate: -16, x: -138, y: 32, zIndex: 1, floatPhase: 0.1 },
  { rotate:  -8, x:  -69, y: 14, zIndex: 2, floatPhase: 0.6 },
  { rotate:   0, x:    0, y:  0, zIndex: 5, floatPhase: 0.0 },
  { rotate:   8, x:   69, y: 14, zIndex: 2, floatPhase: 0.8 },
  { rotate:  16, x:  138, y: 32, zIndex: 1, floatPhase: 0.4 },
];

const FAN_3 = [
  { rotate: -12, x: -80, y: 16, zIndex: 1, floatPhase: 0.2 },
  { rotate:   0, x:   0, y:  0, zIndex: 3, floatPhase: 0.0 },
  { rotate:  12, x:  80, y: 16, zIndex: 1, floatPhase: 0.5 },
];

// ── Background pattern ─────────────────────────────────────────────────────────
function BgPatternOverlay({ pattern, color }: { pattern: BgPattern; color: string }) {
  const style = useMemo((): React.CSSProperties => {
    switch (pattern) {
      case "pokeball":
        return { backgroundImage: `radial-gradient(circle, ${color}18 2px, transparent 2px)`, backgroundSize: "32px 32px" };
      case "runes":
        return { backgroundImage: `repeating-linear-gradient(60deg,${color}0A 0,${color}0A 1px,transparent 1px,transparent 20px),repeating-linear-gradient(-60deg,${color}0A 0,${color}0A 1px,transparent 1px,transparent 20px)` };
      case "egyptian":
        return { backgroundImage: `repeating-linear-gradient(45deg,${color}08 0,${color}08 1px,transparent 0,transparent 22px),repeating-linear-gradient(-45deg,${color}08 0,${color}08 1px,transparent 0,transparent 22px)` };
      case "waves":
        return { backgroundImage: `repeating-linear-gradient(180deg,transparent 0,transparent 24px,${color}0C 24px,${color}0C 26px)` };
      case "hexagons":
        return { backgroundImage: `radial-gradient(circle,${color}14 1px,transparent 1px)`, backgroundSize: "28px 28px" };
      case "sparkles":
        return { backgroundImage: `radial-gradient(circle,${color}16 1.5px,transparent 1.5px)`, backgroundSize: "24px 24px" };
      case "aura":
        return { backgroundImage: `repeating-radial-gradient(circle at 50% 50%,transparent 0,transparent 30px,${color}0A 30px,${color}0A 32px)` };
      case "leaves":
        return { backgroundImage: `repeating-linear-gradient(30deg,${color}08 0,${color}08 1px,transparent 0,transparent 18px),repeating-linear-gradient(150deg,${color}08 0,${color}08 1px,transparent 0,transparent 18px)` };
      case "grid":
        return { backgroundImage: `linear-gradient(${color}0C 1px,transparent 1px),linear-gradient(90deg,${color}0C 1px,transparent 1px)`, backgroundSize: "28px 28px" };
      case "diamond":
        return { backgroundImage: `repeating-linear-gradient(45deg,${color}0A 0,${color}0A 1px,transparent 0,transparent 20px)` };
      case "circuit":
        return { backgroundImage: `linear-gradient(${color}0E 1px,transparent 1px),linear-gradient(90deg,${color}0E 1px,transparent 1px)`, backgroundSize: "20px 20px" };
      default:
        return {};
    }
  }, [pattern, color]);

  return <div className="pointer-events-none absolute inset-0" style={style} aria-hidden="true" />;
}

// ── Logo image with SVG→PNG→text fallback ─────────────────────────────────────
function GameLogo({ game, name, color, emoji, mobile = false }: { game: string; name: string; color: string; emoji: string; mobile?: boolean }) {
  const slugMap: Record<string, string> = { "one-piece": "onepiece", "dragon-ball": "dragonball" };
  const slug = slugMap[game] ?? game;
  const [src, setSrc] = useState(`/images/logos/${slug}.svg`);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-xl border-2 font-black text-white"
        style={{
          backgroundColor: `${color}25`,
          borderColor: `${color}60`,
          padding: mobile ? "6px 12px" : "10px 20px",
          fontSize: mobile ? 14 : 20,
          textShadow: "0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        {emoji} {name}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className={`object-contain drop-shadow-lg ${mobile ? "h-14 max-w-[200px]" : "h-24 max-w-[220px]"}`}
      style={{ filter: `drop-shadow(0 0 20px ${color}60)` }}
      onError={() => {
        if (src.endsWith(".svg")) {
          setSrc(`/images/logos/${slug}.png`);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function GameHero({ game, config }: Props) {
  const { name, color, description, emoji } = config;
  const heroData = GAME_HERO_DATA[game];
  const cards = heroData?.cards ?? [];
  const pattern = heroData?.bgPattern ?? "grid";

  const mobileCards = cards.length >= 5
    ? [cards[1], cards[2], cards[3]]
    : cards.slice(0, 3);

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: `linear-gradient(135deg,#0a0f1a 0%,${color}22 45%,${color}35 100%)`, minHeight: 380 }}
      aria-label={`Hero ${name}`}
    >
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full blur-3xl" style={{ backgroundColor: color, opacity: 0.18 }} />
        <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full blur-3xl" style={{ backgroundColor: color, opacity: 0.1 }} />
        <div className="absolute left-1/2 top-1/3 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ backgroundColor: color, opacity: 0.07 }} />
      </div>

      <BgPatternOverlay pattern={pattern} color={color} />

      {/* ── DESKTOP ──────────────────────────────────────────────────────── */}
      <Container className="relative hidden lg:block">
        <div
          className="grid items-center"
          style={{ gridTemplateColumns: "240px 1fr 280px", gap: "2rem", minHeight: 400, paddingTop: "2.5rem", paddingBottom: "2.5rem" }}
        >
          {/* LEFT: Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center justify-center gap-4"
          >
            <div className="relative flex flex-col items-center">
              <div className="absolute inset-0 -z-10 rounded-full blur-2xl" style={{ backgroundColor: color, opacity: 0.35, transform: "scale(1.5)" }} />
              <GameLogo game={game} name={name} color={color} emoji={emoji} />
            </div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center text-xs leading-relaxed text-white/55 max-w-[200px]"
            >
              {description}
            </motion.p>
          </motion.div>

          {/* CENTER: Card fan */}
          <div className="flex items-center justify-center">
            <div style={{ position: "relative", width: 360, height: 300, flexShrink: 0 }}>
              {cards.slice(0, 5).map((card, i) => {
                const f = FAN_5[i];
                return (
                  <HoloCard key={i} card={card} color={color} emoji={emoji} width={110} height={154}
                    fanRotate={f.rotate} fanX={f.x} fanY={f.y} zIndex={f.zIndex}
                    entryDelay={0.2 + i * 0.12} floatPhase={f.floatPhase} />
                );
              })}
            </div>
          </div>

          {/* RIGHT: Character illustration */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-center"
            style={{ height: 340 }}
          >
            <GameCharacterIllustration game={game} color={color} />
          </motion.div>
        </div>
      </Container>

      {/* ── MOBILE ───────────────────────────────────────────────────────── */}
      <div className="relative px-4 pb-8 pt-7 lg:hidden">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5 flex justify-center"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-xl" style={{ backgroundColor: color, opacity: 0.4, transform: "scale(1.8)" }} />
            <GameLogo game={game} name={name} color={color} emoji={emoji} mobile />
          </div>
        </motion.div>

        {mobileCards.length > 0 && (
          <div className="flex justify-center">
            <div style={{ position: "relative", width: 260, height: 190, flexShrink: 0 }}>
              {mobileCards.map((card, i) => {
                const f = FAN_3[i];
                return (
                  <HoloCard key={i} card={card} color={color} emoji={emoji} width={80} height={112}
                    fanRotate={f.rotate} fanX={f.x} fanY={f.y} zIndex={f.zIndex}
                    entryDelay={0.15 + i * 0.1} floatPhase={f.floatPhase} compact />
                );
              })}
            </div>
          </div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-5 text-center text-xs leading-relaxed text-white/50"
        >
          {description}
        </motion.p>
      </div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
        style={{ background: "linear-gradient(to bottom,transparent,rgba(249,250,251,0.08))" }}
        aria-hidden="true"
      />

      <style>{`
        @keyframes holoFloat {
          from { transform: translateY(0); }
          to   { transform: translateY(-6px); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="holoFloat"] { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
