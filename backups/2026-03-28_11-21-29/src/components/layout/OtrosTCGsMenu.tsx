"use client"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { OTROS_TCGS } from "@/data/megaMenuData"

interface Props {
  onClose: () => void
}

export function OtrosTCGsMenu({ onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="bg-white shadow-xl border-t-2 border-t-gray-300"
    >
      <div className="max-w-[1400px] mx-auto px-6 py-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
          Otros juegos TCG
        </p>
        <div className="grid grid-cols-4 gap-3">
          {OTROS_TCGS.map((game) => (
            <Link
              key={game.slug}
              href={game.href}
              onClick={onClose}
              className="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
            >
              {/* Logo placeholder — replace inner div with <img src={game.logoSrc} … /> when real logo available */}
              <div
                className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black"
                style={{ backgroundColor: game.color }}
              >
                {game.abbrev}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900 leading-tight">
                  {game.label}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-0.5">
                  Ver catalogo <ArrowRight size={9} />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
