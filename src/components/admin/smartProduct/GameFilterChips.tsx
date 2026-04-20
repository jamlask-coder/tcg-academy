// smartProduct/GameFilterChips.tsx
// Barra horizontal de chips por juego + "Todos". Filtra in-memory los
// candidatos ya devueltos por el search (no dispara nuevas peticiones).

"use client";

import { GAME_CONFIG } from "@/data/products";

interface Props {
  games: string[]; // juegos presentes en los resultados (orden estable)
  counts: Record<string, number>;
  selected: string | null;
  onChange: (game: string | null) => void;
  totalCount: number;
}

export function GameFilterChips({
  games,
  counts,
  selected,
  onChange,
  totalCount,
}: Props) {
  if (games.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="tablist"
      aria-label="Filtrar por juego"
    >
      <button
        type="button"
        role="tab"
        aria-selected={selected === null}
        onClick={() => onChange(null)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          selected === null
            ? "border-transparent bg-gray-900 text-white shadow-sm"
            : "border-gray-200 bg-white text-gray-700 hover:border-gray-900 hover:text-gray-900"
        }`}
      >
        Todos
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            selected === null ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          {totalCount}
        </span>
      </button>
      {games.map((game) => {
        const cfg = GAME_CONFIG[game];
        const count = counts[game] ?? 0;
        const isSel = selected === game;
        return (
          <button
            key={game}
            type="button"
            role="tab"
            aria-selected={isSel}
            onClick={() => onChange(isSel ? null : game)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              isSel
                ? "border-transparent text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
            }`}
            style={
              isSel
                ? { backgroundColor: cfg?.color ?? "#374151" }
                : undefined
            }
          >
            <span aria-hidden>{cfg?.emoji ?? "🎴"}</span>
            {cfg?.name ?? game}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                isSel ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
