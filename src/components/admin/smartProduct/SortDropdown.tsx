// smartProduct/SortDropdown.tsx
// Dropdown nativo simple para ordenar resultados. Usa <select> para
// máxima accesibilidad y coste cero (no libs, no custom listbox).

"use client";

import { ArrowDownAZ } from "lucide-react";
import type { SortMode } from "./searchHelpers";

interface Props {
  value: SortMode;
  onChange: (v: SortMode) => void;
}

export function SortDropdown({ value, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
      <ArrowDownAZ size={14} className="text-gray-400" />
      <span className="sr-only sm:not-sr-only">Ordenar</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortMode)}
        className="h-8 cursor-pointer rounded-lg border border-gray-200 bg-white pr-8 pl-2 text-xs font-semibold text-gray-700 transition hover:border-gray-400 focus:border-[#2563eb] focus:outline-none"
        aria-label="Ordenar resultados por"
      >
        <option value="score">Relevancia</option>
        <option value="recent">Más reciente</option>
        <option value="cards">Más cartas</option>
      </select>
    </label>
  );
}
