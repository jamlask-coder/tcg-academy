// smartProduct/SearchEmptyState.tsx
// Estado cuando la query está vacía: búsquedas recientes + sugerencias.

"use client";

import { Clock, Sparkles, X } from "lucide-react";
import { SEARCH_SUGGESTIONS } from "./searchHelpers";

interface Props {
  history: string[];
  onPick: (query: string) => void;
  onClearHistory: () => void;
}

export function SearchEmptyState({ history, onPick, onClearHistory }: Props) {
  return (
    <div className="space-y-5 rounded-2xl border-2 border-dashed border-gray-200 bg-white p-6">
      {history.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-gray-500 uppercase">
              <Clock size={12} />
              Búsquedas recientes
            </div>
            <button
              type="button"
              onClick={onClearHistory}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              aria-label="Borrar búsquedas recientes"
            >
              <X size={11} />
              Borrar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onPick(q)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-[#2563eb] hover:bg-blue-50 hover:text-[#2563eb]"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wide text-gray-500 uppercase">
          <Sparkles size={12} />
          Prueba con
        </div>
        <div className="flex flex-wrap gap-2">
          {SEARCH_SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onPick(s.label)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-[#2563eb] hover:bg-blue-50 hover:text-[#2563eb]"
            >
              <span aria-hidden>{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
