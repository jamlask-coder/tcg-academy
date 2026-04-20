"use client";
// Badge visual que pinta el nivel de confianza con el que la IA rellenó un
// campo del formulario. Se pone junto al label del input correspondiente.
//
// high   → verde  (API canónica lo confirmó)
// medium → ámbar  (heurística sólida, admin debería echar un vistazo)
// low    → rojo suave (sugerencia frágil — revisa)
// empty  → gris   (no se pudo rellenar — escribe tú)

import type { FieldHint } from "@/lib/productIdentifier";

interface Props {
  hint?: FieldHint;
}

const STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  high: {
    bg: "bg-green-100",
    fg: "text-green-700",
    label: "IA · alta",
  },
  medium: {
    bg: "bg-amber-100",
    fg: "text-amber-700",
    label: "IA · media",
  },
  low: {
    bg: "bg-red-50",
    fg: "text-red-600",
    label: "IA · baja",
  },
  empty: {
    bg: "bg-gray-100",
    fg: "text-gray-500",
    label: "IA · vacío",
  },
};

export function FieldConfidenceBadge({ hint }: Props) {
  if (!hint) return null;
  const s = STYLES[hint.confidence] ?? STYLES.empty;
  return (
    <span
      className={`ml-2 inline-flex items-center rounded-full ${s.bg} ${s.fg} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide`}
      title={`${hint.source}${hint.note ? " — " + hint.note : ""}`}
    >
      {s.label}
    </span>
  );
}
