"use client"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { MegaMenuGame } from "@/data/megaMenuData"

interface Props {
  game: MegaMenuGame
  onClose: () => void
}

export function MegaMenu({ game, onClose }: Props) {
  const { color, columns, href, label } = game

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
          style={{
            gridTemplateColumns: `repeat(${columns.length}, 1fr) 220px`,
          }}
        >
          {/* Category columns */}
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

          {/* Featured / CTA column */}
          <div
            className="rounded-xl p-4 flex flex-col justify-between"
            style={{ backgroundColor: `${color}14` }}
          >
            <div
              className="w-full aspect-video rounded-lg mb-4 flex items-center justify-center font-black text-4xl text-white select-none"
              style={{ backgroundColor: color }}
              aria-hidden
            >
              {label[0]}
            </div>
            <div>
              <p
                className="text-xs font-bold uppercase tracking-wider mb-1"
                style={{ color }}
              >
                Destacado
              </p>
              <p className="text-sm font-semibold text-gray-800 mb-3 leading-snug">
                Ultimas novedades {label}
              </p>
              <Link
                href={href}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-white px-4 py-2 rounded-lg transition hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: color }}
              >
                Ver novedades <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
