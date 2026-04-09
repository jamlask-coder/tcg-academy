import { LANGUAGE_NAMES } from "@/data/products";

/** Maps ISO language code → ISO 3166-1 alpha-2 country code for flag-icons */
const LANG_TO_COUNTRY: Record<string, string> = {
  EN: "gb",
  ES: "es",
  JP: "jp",
  FR: "fr",
  DE: "de",
  IT: "it",
  KO: "kr",
  PT: "br",
};

interface LanguageFlagProps {
  /** ISO language code: ES | EN | JP | FR | DE | IT | KO | PT */
  language: string;
  /** Show text label next to flag — default: false */
  showLabel?: boolean;
  className?: string;
}

/**
 * Displays a country flag SVG (via flag-icons) inside a styled pill.
 * Works on all platforms including Windows where emoji flags don't render.
 */
export function LanguageFlag({
  language,
  showLabel = false,
  className = "",
}: LanguageFlagProps) {
  const country = LANG_TO_COUNTRY[language.toUpperCase()];
  if (!country) return null;

  return (
    <div
      title={LANGUAGE_NAMES[language.toUpperCase()] ?? language}
      className={`inline-flex items-center gap-1 rounded bg-white/80 px-1.5 py-0.5 text-sm leading-none shadow-sm backdrop-blur-sm select-none ${className}`}
    >
      <span
        className={`fi fi-${country}`}
        style={{ width: 16, height: 12, display: "inline-block", borderRadius: 2 }}
      />
      {showLabel && (
        <span className="ml-0.5 text-[10px] font-bold text-gray-700">
          {LANGUAGE_NAMES[language.toUpperCase()] ?? language.toUpperCase()}
        </span>
      )}
    </div>
  );
}
