"use client"
import { motion } from "framer-motion"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import type { MegaMenuGame } from "@/data/megaMenuData"

interface Props {
  game: MegaMenuGame
  onClose: () => void
}

export function MegaMenu({ game, onClose }: Props) {
  const [displayedGame, setDisplayedGame] = useState(game)
  const [contentVisible, setContentVisible] = useState(true)
  const prevSlugRef = useRef(game.slug)

  // When game prop changes (user moved to a different game), fade content out,
  // swap data, fade back in. Container never remounts — no positional jump.
  useEffect(() => {
    if (game.slug === prevSlugRef.current) return
    prevSlugRef.current = game.slug
    setContentVisible(false)
    const t = setTimeout(() => {
      setDisplayedGame(game)
      setContentVisible(true)
    }, 120)
    return () => clearTimeout(t)
  }, [game])

  const { color, columns } = displayedGame

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="bg-white shadow-xl border-t-2"
      style={{ borderTopColor: color }}
    >
      <div
        className="max-w-[1400px] mx-auto px-6 py-5"
        style={{
          opacity: contentVisible ? 1 : 0,
          transition: "opacity 0.12s ease-in-out",
        }}
      >
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(130px, max-content))` }}
        >
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color }}>
                {col.title}
              </h3>
              <ul className="space-y-1.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="text-sm text-gray-600 hover:text-gray-900 hover:pl-1 transition-all duration-100 block leading-snug"
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
  )
}
