"use client";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { MegaMenuGame } from "@/data/megaMenuData";

interface Props {
  game: MegaMenuGame;
  onClose: () => void;
  leftOffset?: number;
}

export function MegaMenu({ game, onClose, leftOffset }: Props) {
  const [displayedGame, setDisplayedGame] = useState(game);
  const [contentVisible, setContentVisible] = useState(true);
  const prevSlugRef = useRef(game.slug);
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number | undefined>(undefined);

  // When game prop changes — crossfade content, container slides via framer-motion
  useEffect(() => {
    if (game.slug === prevSlugRef.current) return;
    prevSlugRef.current = game.slug;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContentVisible(false);
    const t = setTimeout(() => {
      setDisplayedGame(game);
      setContentVisible(true);
    }, 100);
    return () => clearTimeout(t);
  }, [game]);

  // Measure height from DOM after content changes
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          setMeasuredHeight(containerRef.current.scrollHeight);
        }
      });
    });
  }, [displayedGame, contentVisible]);

  const { color, columns } = displayedGame;

  // Calculate width from columns (200px per column + gaps + padding)
  const calculatedWidth = columns.length * 200 + (columns.length - 1) * 20 + 48;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, x: leftOffset ?? 0 }}
      animate={{
        opacity: 1,
        y: 0,
        x: leftOffset ?? 0,
      }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        x: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.15 },
        y: { duration: 0.2, ease: "easeOut" },
      }}
      className="absolute top-0 border-t-2 bg-white shadow-2xl"
      style={{
        borderTopColor: color,
        borderRadius: "0 0 12px 12px",
        willChange: "transform",
        transition: "border-top-color 0.2s ease",
      }}
    >
      <div
        className="overflow-hidden"
        style={{
          height: measuredHeight ? measuredHeight : "auto",
          width: calculatedWidth,
          transition: "height 0.25s ease-out, width 0.25s ease-out",
        }}
      >
        <div
          ref={containerRef}
          className="relative py-5 px-6"
          style={{
            opacity: contentVisible ? 1 : 0,
            transition: "opacity 0.1s ease-in-out",
          }}
        >
        {/* Columns */}
        <div className="relative z-10 flex items-start gap-5">
          {columns.map((col) => (
            <div key={col.title} style={{ width: 200, flexShrink: 0 }}>
              <ul className="space-y-1.5">
                {col.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="block px-2.5 py-1.5 text-sm text-gray-700 transition-colors hover:text-[#2563eb]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        </div>
      </div>
    </motion.div>
  );
}
