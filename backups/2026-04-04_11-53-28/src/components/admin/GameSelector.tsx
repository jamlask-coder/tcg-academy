"use client";
import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import { GAME_CONFIG, type LocalProduct } from "@/data/products";

interface GameSelectorProps {
  products: LocalProduct[];
  onSelect: (game: string | null) => void;
  onAddProduct: () => void;
}

export function GameSelector({
  products,
  onSelect,
  onAddProduct,
}: GameSelectorProps) {
  const games = Object.entries(GAME_CONFIG);
  const totalCount = products.length;

  function countForGame(slug: string) {
    return products.filter((p) => p.game === slug).length;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <LayoutGrid size={22} className="text-[#2563eb]" /> Catálogo visual
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {totalCount} productos en total
          </p>
        </div>
        <button
          onClick={onAddProduct}
          className="flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
        >
          <Plus size={15} /> Añadir producto
        </button>
      </div>

      {/* Ver todos */}
      <div className="mb-6">
        <button
          onClick={() => onSelect(null)}
          className="group w-full rounded-2xl border-2 border-dashed border-[#2563eb]/30 bg-[#2563eb]/5 p-5 text-left transition hover:border-[#2563eb]/50 hover:bg-[#2563eb]/10"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2563eb]/10 transition group-hover:scale-105">
              <LayoutGrid size={22} className="text-[#2563eb]" />
            </div>
            <div>
              <p className="font-bold text-[#2563eb]">Ver todos los juegos</p>
              <p className="text-sm text-gray-500">{totalCount} productos</p>
            </div>
          </div>
        </button>
      </div>

      {/* Game grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {games.map(([slug, cfg]) => {
          const count = countForGame(slug);
          return (
            <button
              key={slug}
              onClick={() => onSelect(slug)}
              className="group rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:scale-[1.02] hover:shadow-lg"
              style={{ borderTopColor: cfg.color, borderTopWidth: 3 }}
            >
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition group-hover:scale-110"
                style={{ backgroundColor: cfg.bgColor }}
              >
                {cfg.emoji}
              </div>
              <p className="text-sm leading-tight font-bold text-gray-900">
                {cfg.name}
              </p>
              <p
                className="mt-1 text-xs font-medium"
                style={{ color: cfg.color }}
              >
                {count} producto{count !== 1 ? "s" : ""}
              </p>
            </button>
          );
        })}
      </div>

      {/* Add product link */}
      <div className="mt-8 text-center">
        <Link
          href="/admin/productos/nuevo"
          className="text-sm font-medium text-[#2563eb] hover:underline"
        >
          También puedes añadir desde el formulario completo →
        </Link>
      </div>
    </div>
  );
}
