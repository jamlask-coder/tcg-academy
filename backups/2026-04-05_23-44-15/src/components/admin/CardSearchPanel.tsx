"use client";
import { useState, useCallback } from "react";
import { Search, X, Loader, ChevronDown } from "lucide-react";
import {
  getCardServiceForGame,
  isCardSearchSupported,
} from "@/services/cardImageService";
import type { ExternalCardData, CardSet } from "@/types/card";

interface Props {
  /** Called when user selects a card — fills product form fields */
  onSelect: (card: ExternalCardData) => void;
  /** Game slug — panel is hidden for games without API support */
  game: string;
}

const GAME_LABELS: Record<
  string,
  {
    label: string;
    emoji: string;
    color: string;
    border: string;
    bg: string;
    text: string;
    btn: string;
  }
> = {
  pokemon: {
    label: "Pokémon TCG API",
    emoji: "⚡",
    color: "amber",
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-800",
    btn: "bg-amber-500 hover:bg-amber-600",
  },
  magic: {
    label: "Scryfall (Magic)",
    emoji: "🧙",
    color: "violet",
    border: "border-violet-200",
    bg: "bg-violet-50",
    text: "text-violet-800",
    btn: "bg-violet-600 hover:bg-violet-700",
  },
  yugioh: {
    label: "YGOProDeck API",
    emoji: "👁️",
    color: "red",
    border: "border-red-200",
    bg: "bg-red-50",
    text: "text-red-800",
    btn: "bg-red-600 hover:bg-red-700",
  },
};

const DEFAULT_THEME = {
  label: "Card API",
  emoji: "🃏",
  color: "gray",
  border: "border-gray-200",
  bg: "bg-gray-50",
  text: "text-gray-800",
  btn: "bg-gray-600 hover:bg-gray-700",
};

export function CardSearchPanel({ onSelect, game }: Props) {
  const [query, setQuery] = useState("");
  const [setId, setSetId] = useState("");
  const [results, setResults] = useState<ExternalCardData[]>([]);
  const [sets, setSets] = useState<CardSet[]>([]);
  const [loadingSets, setLoadingSets] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setsOpen, setSetsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const theme = GAME_LABELS[game] ?? DEFAULT_THEME;

  const loadSets = useCallback(async () => {
    if (sets.length > 0) return;
    const service = getCardServiceForGame(game);
    if (!service) return;
    setLoadingSets(true);
    try {
      const data = await service.getSets();
      setSets(data);
    } catch {
      // Sets are optional — don't block search
    } finally {
      setLoadingSets(false);
    }
  }, [sets, game]);

  const handleSearch = useCallback(async () => {
    if (!query.trim() && !setId) return;
    const service = getCardServiceForGame(game);
    if (!service) return;
    setLoading(true);
    setError(null);
    try {
      const data = await service.searchCards(query, setId || undefined);
      setResults(data);
      if (data.length === 0) setError("Sin resultados para esta búsqueda");
    } catch {
      setError(`Error al conectar con ${theme.label}`);
    } finally {
      setLoading(false);
    }
  }, [query, setId, game, theme.label]);

  if (!isCardSearchSupported(game)) return null;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`flex items-center gap-2 rounded-xl border-2 border-dashed ${theme.border} ${theme.bg} px-4 py-2.5 text-sm font-semibold ${theme.text} transition hover:opacity-80`}
      >
        <span className="text-base">{theme.emoji}</span>
        Rellenar desde {theme.label}
      </button>
    );
  }

  return (
    <div className={`rounded-2xl border ${theme.border} ${theme.bg} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`flex items-center gap-2 text-sm font-bold ${theme.text}`}
        >
          <span className="text-base">{theme.emoji}</span>
          Buscar en {theme.label}
        </span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className={`rounded-lg p-1 ${theme.text} hover:opacity-70`}
          aria-label="Cerrar buscador de cartas"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search controls */}
      <div className="flex flex-col gap-2 sm:flex-row">
        {/* Card name */}
        <div className="relative flex-1">
          <Search
            size={14}
            className={`absolute top-1/2 left-3 -translate-y-1/2 ${theme.text} opacity-60`}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Nombre de la carta..."
            maxLength={100}
            className={`h-9 w-full rounded-xl border ${theme.border} bg-white pr-3 pl-8 text-sm focus:outline-none`}
          />
        </div>

        {/* Set selector (only if API supports sets) */}
        {game !== "yugioh" && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setSetsOpen(!setsOpen);
                if (!setsOpen) loadSets();
              }}
              className={`flex h-9 items-center gap-1.5 rounded-xl border ${theme.border} bg-white px-3 text-sm ${theme.text} hover:opacity-80`}
            >
              {setId
                ? (sets.find((s) => s.id === setId)?.name ?? setId)
                : "Todas las expansiones"}
              {loadingSets ? (
                <Loader size={12} className="animate-spin" />
              ) : (
                <ChevronDown size={12} />
              )}
            </button>
            {setsOpen && (
              <div
                className={`absolute top-full right-0 z-50 mt-1 max-h-48 w-64 overflow-y-auto rounded-xl border ${theme.border} bg-white shadow-xl`}
              >
                <button
                  type="button"
                  className={`block w-full px-3 py-2 text-left text-sm hover:${theme.bg}`}
                  onClick={() => {
                    setSetId("");
                    setSetsOpen(false);
                  }}
                >
                  Todas las expansiones
                </button>
                {sets.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:${theme.bg}`}
                    onClick={() => {
                      setSetId(s.id);
                      setSetsOpen(false);
                    }}
                  >
                    {s.symbol && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.symbol}
                        alt=""
                        className="h-4 w-4 object-contain"
                      />
                    )}
                    <span className="truncate">{s.name}</span>
                    {s.releaseDate && (
                      <span className="ml-auto flex-shrink-0 text-xs text-gray-400">
                        {s.releaseDate.slice(0, 4)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search button */}
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading || (!query.trim() && !setId)}
          className={`flex h-9 items-center gap-1.5 rounded-xl ${theme.btn} px-4 text-sm font-semibold text-white transition disabled:opacity-50`}
        >
          {loading ? (
            <Loader size={14} className="animate-spin" />
          ) : (
            <Search size={14} />
          )}
          Buscar
        </button>
      </div>

      {/* Error */}
      {error && !loading && (
        <p className={`mt-2 text-xs ${theme.text}`}>{error}</p>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-3">
          <p className={`mb-2 text-xs font-semibold ${theme.text}`}>
            {results.length} carta{results.length !== 1 ? "s" : ""} — haz clic
            para rellenar
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {results.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  onSelect(card);
                  setExpanded(false);
                }}
                className={`group flex flex-col items-center gap-1 rounded-xl border border-transparent p-1.5 text-center transition hover:${theme.border} hover:bg-white hover:shadow-md`}
              >
                {card.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    loading="lazy"
                    className="aspect-[2/3] w-full rounded-lg object-cover shadow-sm transition group-hover:shadow-md"
                  />
                ) : (
                  <div
                    className={`flex aspect-[2/3] w-full items-center justify-center rounded-lg ${theme.bg} text-2xl`}
                  >
                    {theme.emoji}
                  </div>
                )}
                <span className="line-clamp-1 w-full text-[10px] font-semibold text-gray-700">
                  {card.name}
                </span>
                {card.rarity && (
                  <span className={`text-[9px] ${theme.text}`}>
                    {card.rarity}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
