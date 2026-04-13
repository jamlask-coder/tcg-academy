"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { useState } from "react";

const OTROS_GAMES = [
  {
    id: "dragon-ball",
    name: "Dragon Ball Super",
    desc: "Fusion World, singles y accesorios",
    href: "/dragon-ball",
    color: "#d97706",
    logoSrc: "/images/logos/dragonball.svg",
    logoPng: "/images/logos/dragonball.png",
    emoji: "🔴",
  },
  {
    id: "naruto",
    name: "Naruto",
    desc: "Booster Boxes, starter decks y singles",
    href: "/naruto",
    color: "#ea580c",
    logoSrc: "/images/logos/naruto.svg",
    logoPng: "/images/logos/naruto.png",
    emoji: "🍃",
  },
  {
    id: "lorcana",
    name: "Disney Lorcana",
    desc: "Booster Boxes, singles y accesorios",
    href: "/lorcana",
    color: "#0891b2",
    logoSrc: "/images/logos/lorcana.svg",
    logoPng: "/images/logos/lorcana.png",
    emoji: "🌀",
  },
  {
    id: "panini",
    name: "Panini",
    desc: "Cromos y colecciones oficiales",
    href: "/panini",
    color: "#16a34a",
    logoSrc: "/images/logos/panini.svg",
    logoPng: "/images/logos/panini.png",
    emoji: "⚽",
  },
  {
    id: "digimon",
    name: "Digimon TCG",
    desc: "Booster Boxes, singles y accesorios",
    href: "/digimon",
    color: "#2563eb",
    logoSrc: "/images/logos/digimon.svg",
    logoPng: "/images/logos/digimon.png",
    emoji: "🦖",
  },
] as const;

function GameLogo({
  name,
  logoSrc,
  logoPng,
  color,
  emoji,
}: {
  name: string;
  logoSrc: string;
  logoPng: string;
  color: string;
  emoji: string;
}) {
  const [src, setSrc] = useState(logoSrc);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xl"
        style={{ backgroundColor: `${color}15`, border: `1.5px solid ${color}30` }}
      >
        {emoji}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className="h-10 w-10 flex-shrink-0 rounded-xl object-contain p-1"
      style={{ backgroundColor: `${color}15`, border: `1.5px solid ${color}30` }}
      onError={() => {
        if (src === logoSrc) {
          setSrc(logoPng);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

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
          {OTROS_GAMES.map(({ id, name, desc, href, color, logoSrc, logoPng, emoji }) => (
            <Link
              key={id}
              href={href}
              onClick={onClose}
              className="group flex items-start gap-3 rounded-xl border border-gray-100 p-3.5 transition-all hover:border-gray-200 hover:shadow-sm"
            >
              <GameLogo
                name={name}
                logoSrc={logoSrc}
                logoPng={logoPng}
                color={color}
                emoji={emoji}
              />
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
