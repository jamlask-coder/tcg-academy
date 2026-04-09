"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";

const OTROS_GAMES = [
  {
    id: "dragon-ball",
    name: "Dragon Ball Super",
    emoji: "🔴",
    desc: "Fusion World, singles y accesorios",
    href: "/dragon-ball",
    color: "#d97706",
  },
  {
    id: "naruto",
    name: "Naruto Mythos",
    emoji: "🍃",
    desc: "Booster Boxes, starter decks y singles",
    href: "/naruto",
    color: "#ea580c",
  },
  {
    id: "lorcana",
    name: "Disney Lorcana",
    emoji: "🌀",
    desc: "Booster Boxes, singles y accesorios",
    href: "/lorcana",
    color: "#0891b2",
  },
  {
    id: "panini",
    name: "Panini",
    emoji: "⚽",
    desc: "Cromos y colecciones oficiales",
    href: "/panini",
    color: "#16a34a",
  },
  {
    id: "digimon",
    name: "Digimon TCG",
    emoji: "🦖",
    desc: "Booster Boxes, singles y accesorios",
    href: "/digimon",
    color: "#2563eb",
  },
] as const;

interface Props {
  onClose: () => void;
}

export function OtrosMenu({ onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="border-t-2 border-t-gray-300 bg-white shadow-xl"
    >
      <Container className="py-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
            Otros juegos
          </p>
          <Link
            href="/catalogo"
            onClick={onClose}
            className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:underline"
          >
            Ver catálogo completo <ArrowRight size={11} />
          </Link>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {OTROS_GAMES.map(({ id, name, emoji, desc, href, color }) => (
            <Link
              key={id}
              href={href}
              onClick={onClose}
              className="group flex items-start gap-3 rounded-xl border border-gray-100 p-3.5 transition-all hover:border-gray-200 hover:shadow-sm"
            >
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xl"
                style={{
                  backgroundColor: `${color}15`,
                  border: `1.5px solid ${color}30`,
                }}
              >
                {emoji}
              </div>
              <div className="min-w-0">
                <p className="text-sm leading-tight font-semibold text-gray-800 group-hover:text-gray-900">
                  {name}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </motion.div>
  );
}
