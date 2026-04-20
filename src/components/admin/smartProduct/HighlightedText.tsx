// smartProduct/HighlightedText.tsx
// Renderiza texto con los tokens coincidentes resaltados.
// Se usa en los nombres de set de las CandidateCard.

import { buildHighlightSegments } from "./searchHelpers";

interface Props {
  text: string;
  query: string;
  className?: string;
  matchClassName?: string;
}

export function HighlightedText({
  text,
  query,
  className,
  matchClassName = "bg-yellow-200/70 text-gray-900 font-bold rounded-sm px-0.5",
}: Props) {
  const segments = buildHighlightSegments(text, query);
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.matched ? (
          <mark key={i} className={matchClassName}>
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  );
}
