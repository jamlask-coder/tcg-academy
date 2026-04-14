"use client";
import { motion } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { MegaMenuGame } from "@/data/megaMenuData";

interface Props {
  game: MegaMenuGame;
  onClose: () => void;
  logoCenterX?: number;
}

function clampX(centerX: number, width: number): number {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  return Math.max(8, Math.min(centerX - width / 2, vw - width - 8));
}

const TRANSITION_MS = 350;
const TRANSITION = `${TRANSITION_MS}ms ease`;

export function MegaMenu({ game, onClose, logoCenterX }: Props) {
  const [displayedGame, setDisplayedGame] = useState(game);
  const [contentVisible, setContentVisible] = useState(true);
  const prevSlugRef = useRef(game.slug);
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ left: number; width: number; height: number } | null>(null);
  const hasRendered = useRef(false);

  const logoCenterRef = useRef(logoCenterX);
  logoCenterRef.current = logoCenterX;

  const measure = useCallback(() => {
    if (!containerRef.current) return;
    const h = containerRef.current.scrollHeight;
    const w = containerRef.current.scrollWidth;
    const cx = logoCenterRef.current;
    const left = cx != null ? clampX(cx, w) : 0;
    setLayout({ left, width: w, height: h });
  }, []);

  // When game prop changes — crossfade content
  useEffect(() => {
    if (game.slug === prevSlugRef.current) return;
    prevSlugRef.current = game.slug;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContentVisible(false);
    const t = setTimeout(() => {
      setDisplayedGame(game);
      setContentVisible(true);
    }, 150);
    return () => clearTimeout(t);
  }, [game]);

  // Measure after new content is visible
  useEffect(() => {
    if (!contentVisible) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        measure();
        if (!hasRendered.current) hasRendered.current = true;
      });
    });
  }, [displayedGame, contentVisible, measure]);

  const { color, columns } = displayedGame;

  // No CSS transition on first render (appear in place), then animate everything uniformly
  const cssTransition = hasRendered.current
    ? `left ${TRANSITION}, width ${TRANSITION}, height ${TRANSITION}, border-top-color ${TRANSITION}`
    : `border-top-color ${TRANSITION}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{
        opacity: { duration: 0.3, ease: "easeOut" },
        y: { duration: 0.35, ease: "easeOut" },
      }}
      className="absolute top-0 border-t-2 bg-white shadow-2xl"
      style={{
        left: layout?.left ?? 0,
        width: layout?.width ?? "auto",
        height: layout?.height ?? "auto",
        borderTopColor: color,
        borderRadius: "0 0 12px 12px",
        transition: cssTransition,
        overflow: "hidden",
      }}
    >
      <div
        ref={containerRef}
        className="relative py-5 px-6"
        style={{
          width: "fit-content",
          opacity: contentVisible ? 1 : 0,
          transition: `opacity 0.25s ease`,
        }}
      >
        <div className="relative z-10 flex items-start gap-5">
          {columns.map((col) => (
            <div key={col.title} style={{ flexShrink: 0 }}>
              <ul className="space-y-1.5">
                {col.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="block px-2.5 py-1.5 text-sm text-gray-700 transition-colors hover:text-[#2563eb] whitespace-nowrap"
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
    </motion.div>
  );
}
