"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OTROS_TCGS } from "@/data/megaMenuData";

interface Props {
  onClose: () => void;
}

export function OtrosTCGsMenu({ onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="border-t-2 border-t-gray-300 bg-white shadow-xl"
    >
      <div className="mx-auto max-w-[1400px] px-6 py-5">
        <p className="mb-4 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
          Otros juegos TCG
        </p>
        <div className="grid grid-cols-4 gap-3">
          {OTROS_TCGS.map((game) => (
            <Link
              key={game.slug}
              href={game.href}
              onClick={onClose}
              className="group flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition-all hover:border-gray-200 hover:shadow-sm"
            >
              {/* Logo placeholder — replace inner div with <img src={game.logoSrc} … /> when real logo available */}
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white"
                style={{ backgroundColor: game.color }}
              >
                {game.abbrev}
              </div>
              <div className="min-w-0">
                <p className="text-sm leading-tight font-semibold text-gray-800 group-hover:text-gray-900">
                  {game.label}
                </p>
                <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-gray-400">
                  Ver catalogo <ArrowRight size={9} />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
