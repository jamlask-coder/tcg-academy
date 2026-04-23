"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

const OTROS_GAMES = [
  {
    id: "yugioh",
    name: "Yu-Gi-Oh!",
    href: "/yugioh",
    color: "#b45309",
    logo: "/images/logos/yugioh.png",
    logoH: 44,
    logoMaxW: 130,
  },
  {
    id: "topps",
    name: "Topps",
    href: "/topps",
    color: "#0ea5e9",
    logo: "/images/logos/topps.svg",
    logoH: 38,
    logoMaxW: 100,
  },
  {
    id: "dragon-ball",
    name: "Dragon Ball",
    href: "/dragon-ball",
    color: "#d97706",
    logo: "/images/logos/dragonball-clean.png?v=2",
    logoH: 52,
    logoMaxW: 140,
  },
  {
    id: "naruto",
    name: "Naruto",
    href: "/naruto",
    color: "#ea580c",
    logo: "/images/logos/naruto-official.png",
    logoH: 48,
    logoMaxW: 135,
  },
  {
    id: "lorcana",
    name: "Disney Lorcana",
    href: "/lorcana",
    color: "#0891b2",
    logo: "/images/logos/lorcana.png",
    logoH: 46,
    logoMaxW: 135,
  },
  {
    id: "panini",
    name: "Panini",
    href: "/panini",
    color: "#16a34a",
    logo: "/images/logos/panini.png",
    logoH: 36,
    logoMaxW: 130,
  },
  {
    id: "digimon",
    name: "Digimon TCG",
    href: "/digimon",
    color: "#2563eb",
    logo: "/images/logos/digimon-official.png",
    logoH: 32,
    logoMaxW: 135,
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk TCG",
    href: "/cyberpunk",
    color: "#9acd32",
    logo: "/images/logos/cyberpunk.png",
    logoH: 30,
    logoMaxW: 120,
  },
] as const;

function GameCard({
  name,
  href,
  color,
  logo,
  logoH,
  logoMaxW,
  onClose,
}: {
  name: string;
  href: string;
  color: string;
  logo: string;
  logoH: number;
  logoMaxW: number;
  onClose: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      onClick={onClose}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex flex-col items-center justify-center rounded-xl py-4 px-2 transition-all duration-300"
      style={{
        background: hovered
          ? `radial-gradient(ellipse at center, ${color}18 0%, transparent 70%)`
          : "transparent",
      }}
    >
      {/* Logo container — fixed height so names align */}
      <div className="relative z-10 flex h-[60px] items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={name}
          className="w-auto object-contain transition-transform duration-300 group-hover:scale-110"
          style={{ height: logoH, maxWidth: logoMaxW }}
        />
      </div>

      {/* Name */}
      <p
        className="relative z-10 mt-1.5 text-center text-[11px] font-semibold transition-colors duration-200"
        style={{ color: hovered ? color : "#9ca3af" }}
      >
        {name}
      </p>
    </Link>
  );
}

interface Props {
  onClose: () => void;
}

export function OtrosMenu({ onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="border-t-2 border-t-gray-300 bg-white shadow-xl"
      style={{ borderRadius: "0 0 12px 12px" }}
    >
      <div className="mx-auto max-w-[720px] px-6 py-5">
        <div className="grid grid-cols-4 gap-2">
          {OTROS_GAMES.map((game) => (
            <GameCard
              key={game.id}
              name={game.name}
              href={game.href}
              color={game.color}
              logo={game.logo}
              logoH={game.logoH}
              logoMaxW={game.logoMaxW}
              onClose={onClose}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
