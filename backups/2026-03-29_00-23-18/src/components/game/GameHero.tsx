"use client";
import { motion } from "framer-motion";
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
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -right-24 -top-24 w-[500px] h-[500px] rounded-full blur-3xl opacity-25"
          style={{ backgroundColor: color }}
        />
        <div
          className="absolute -left-16 bottom-0 w-80 h-80 rounded-full blur-3xl opacity-15"
          style={{ backgroundColor: color }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, ${color} 0px, ${color} 1px, transparent 0px, transparent 50%)`,
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      <div className="relative max-w-[1180px] mx-auto px-6 py-7 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-6 items-center">
          {/* Text content */}
          <div>
            <motion.nav
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2 text-sm mb-3 opacity-70"
              style={{ color }}
            >
              <a href="/" className="hover:opacity-100">
                Inicio
              </a>
              <span>/</span>
              <span className="font-semibold">{name}</span>
            </motion.nav>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-2 shadow-lg"
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
                className="h-10 md:h-14 w-auto max-w-[280px] object-contain"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = "none";
                  const fallback = el.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = "block";
                }}
              />
              <h1
                className="text-2xl md:text-4xl font-bold hidden"
                style={{ color }}
              >
                {name}
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-gray-600 max-w-md text-sm md:text-base leading-relaxed"
            >
              {description}
            </motion.p>
          </div>

          {/* Card fan animation */}
          {fanCards.length > 0 && (
            <div className="hidden lg:flex items-center justify-center h-32 relative">
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
                    className="absolute w-16 h-22 rounded-xl shadow-xl overflow-hidden border-2 border-white/60 flex-shrink-0 cursor-pointer"
                  >
                    {cardImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cardImage}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center gap-1 p-2"
                        style={{
                          background: `linear-gradient(135deg, ${color}40, ${color}80)`,
                        }}
                      >
                        <span className="text-2xl">{emoji}</span>
                        <span className="text-[8px] font-bold text-center leading-tight text-white px-1 line-clamp-2">
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
