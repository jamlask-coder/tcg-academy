import { LANGUAGE_FLAGS, LANGUAGE_NAMES } from "@/data/products";

interface LanguageFlagProps {
  /** ISO language code: ES | EN | JP | FR | DE | IT | KO | PT */
  language: string;
  /** Show text label next to emoji — default: false */
  showLabel?: boolean;
  className?: string;
}

/**
 * Displays a language flag emoji inside a styled pill.
 * The pill uses white/80 background with subtle blur, rounded corners and a drop shadow
 * so it reads clearly over any product image.
 */
export function LanguageFlag({
  language,
  showLabel = false,
  className = "",
}: LanguageFlagProps) {
  const flag = LANGUAGE_FLAGS[language];
  if (!flag) return null;

  return (
    <div
      title={LANGUAGE_NAMES[language] ?? language}
      className={`inline-flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded px-1.5 py-0.5 shadow-sm text-sm leading-none select-none ${className}`}
      style={{ fontSize: "14px" }}
    >
      <span>{flag}</span>
      {showLabel && (
        <span className="text-[10px] font-bold text-gray-700 ml-0.5">
          {language}
        </span>
      )}
    </div>
  );
}
