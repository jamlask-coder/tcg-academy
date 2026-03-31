"use client"
import { motion } from "framer-motion"
import Link from "next/link"
import type { MegaMenuGame } from "@/data/megaMenuData"

interface Props {
  game: MegaMenuGame
  onClose: () => void
}

export function MegaMenu({ game, onClose }: Props) {
  const { color, columns } = game

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="bg-white shadow-xl border-t-2"
      style={{ borderTopColor: color }}
    >
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div
          className="grid gap-8"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(140px, 1fr))` }}
        >
          {columns.map((col) => (
            <div key={col.title}>
              <h3
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color }}
              >
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
