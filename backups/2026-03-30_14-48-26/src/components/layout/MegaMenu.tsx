"use client";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { MegaMenuGame } from "@/data/megaMenuData";
import { Container } from "@/components/ui/Container";

interface Props {
  game: MegaMenuGame;
  onClose: () => void;
}

export function MegaMenu({ game, onClose }: Props) {
  const [displayedGame, setDisplayedGame] = useState(game);
  const [contentVisible, setContentVisible] = useState(true);
  const prevSlugRef = useRef(game.slug);

  // When game prop changes (user moved to a different game), fade content out,
  // swap data, fade back in. Container never remounts — no positional jump.
  useEffect(() => {
    if (game.slug === prevSlugRef.current) return;
    prevSlugRef.current = game.slug;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContentVisible(false);
    const t = setTimeout(() => {
      setDisplayedGame(game);
      setContentVisible(true);
    }, 120);
    return () => clearTimeout(t);
  }, [game]);

  const { color, columns } = displayedGame;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="border-t-2 bg-white shadow-xl"
      style={{ borderTopColor: color }}
    >
      <Container
        className="py-5"
        style={{
          opacity: contentVisible ? 1 : 0,
          transition: "opacity 0.12s ease-in-out",
        }}
      >
        {/* Fixed-width columns — no layout shift on hover or game change */}
        <div className="flex gap-5">
          {columns.map((col) => (
            <div key={col.title} style={{ width: 200, flexShrink: 0 }}>
              <h3
                className="mb-3 text-xs font-bold tracking-widest uppercase"
                style={{ color }}
              >
                {col.title}
              </h3>
              <ul className="space-y-0.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="block rounded-md px-2 py-1 text-sm leading-snug text-gray-600 transition-colors duration-100 hover:bg-gray-100 hover:text-gray-900"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </motion.div>
  );
}
