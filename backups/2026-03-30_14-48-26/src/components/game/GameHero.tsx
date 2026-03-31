"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import type { LocalProduct } from "@/data/products";

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
  featuredProducts: LocalProduct[];
}

/**
 * Animated hero banner for game pages.
 * Shows a card-fan animation with featured products on the right.
 */
export function GameHero({ game, config, featuredProducts }: Props) {
  const { name, color, bgColor, description, emoji } = config;

  // Take up to 5 cards for the fan
  const fanCards = featuredProducts.slice(0, 5);

  // Fan angles and offsets for each card
  const fanConfig = [
    { rotate: -18, x: -60, y: 20, z: 1 },
    { rotate: -9, x: -30, y: 10, z: 2 },
    { rotate: 0, x: 0, y: 0, z: 3 },
    { rotate: 9, x: 30, y: 10, z: 2 },
    { rotate: 18, x: 60, y: 20, z: 1 },
  ];

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${bgColor} 0%, ${color}20 100%)`,
      }}
    >
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-24 -right-24 h-[500px] w-[500px] rounded-full opacity-25 blur-3xl"
          style={{ backgroundColor: color }}
        />
        <div
          className="absolute bottom-0 -left-16 h-80 w-80 rounded-full opacity-15 blur-3xl"
          style={{ backgroundColor: color }}
        />
        <div
          className="absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, ${color} 0px, ${color} 1px, transparent 0px, transparent 50%)`,
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-6 py-7 lg:py-12">
        <div className="grid items-center gap-6 lg:grid-cols-2">
          {/* Text content */}
          <div>
            <motion.nav
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-3 flex items-center gap-2 text-sm opacity-70"
              style={{ color }}
            >
              <Link href="/" className="hover:opacity-100">
                Inicio
              </Link>
              <span>/</span>
              <span className="font-semibold">{name}</span>
            </motion.nav>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl text-xl shadow-lg"
              style={{ backgroundColor: color }}
            >
              {emoji}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mb-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/images/logos/${game === "one-piece" ? "onepiece" : game === "dragon-ball" ? "dragonball" : game}.svg`}
                alt={name}
                className="h-10 w-auto max-w-[280px] object-contain md:h-14"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = "none";
                  const fallback = el.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = "block";
                }}
              />
              <h1 className="sr-only" style={{ color }}>
                {name}
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-md text-sm leading-relaxed text-gray-600 md:text-base"
            >
              {description}
            </motion.p>
          </div>

          {/* Card fan animation */}
          {fanCards.length > 0 && (
            <div className="relative hidden h-32 items-center justify-center lg:flex">
              {fanCards.map((product, i) => {
                const cfg = fanConfig[Math.min(i, fanConfig.length - 1)];
                const cardImage = product.images[0];

                return (
                  <motion.div
                    key={product.id}
                    initial={{
                      opacity: 0,
                      rotate: 0,
                      x: 0,
                      y: 30,
                      scale: 0.85,
                    }}
                    animate={{
                      opacity: 1,
                      rotate: cfg.rotate,
                      x: cfg.x,
                      y: cfg.y,
                      scale: 1,
                    }}
                    transition={{
                      duration: 0.6,
                      delay: 0.3 + i * 0.08,
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                    }}
                    whileHover={{
                      scale: 1.1,
                      rotate: cfg.rotate * 0.4,
                      y: cfg.y - 12,
                      zIndex: 20,
                      transition: { duration: 0.2 },
                    }}
                    style={{ zIndex: cfg.z, transformOrigin: "bottom center" }}
                    className="absolute h-22 w-16 flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 border-white/60 shadow-xl"
                  >
                    {cardImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cardImage}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full flex-col items-center justify-center gap-1 p-2"
                        style={{
                          background: `linear-gradient(135deg, ${color}40, ${color}80)`,
                        }}
                      >
                        <span className="text-2xl">{emoji}</span>
                        <span className="line-clamp-2 px-1 text-center text-[8px] leading-tight font-bold text-white">
                          {product.name}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
