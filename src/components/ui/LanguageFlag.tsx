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
  /** Flag size: "sm" (default, for cards/filters) | "md" (for product page) */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Displays a country flag SVG (via flag-icons) inside a styled pill.
 * Works on all platforms including Windows where emoji flags don't render.
 */
export function LanguageFlag({
  language,
  showLabel = false,
  size = "sm",
  className = "",
}: LanguageFlagProps) {
  const country = LANG_TO_COUNTRY[language.toUpperCase()];
  if (!country) return null;

  const fullName = LANGUAGE_NAMES[language.toUpperCase()] ?? language;
  const flagW = size === "md" ? 22 : 16;
  const flagH = size === "md" ? 16 : 12;
  const labelCls = size === "md" ? "text-xs font-semibold text-gray-700" : "text-[10px] font-bold text-gray-700";

  return (
    <div
      title={fullName}
      className={`inline-flex items-center gap-1.5 rounded bg-white/80 px-1.5 py-0.5 leading-none shadow-sm backdrop-blur-sm select-none ${className}`}
    >
      <span
        className={`fi fi-${country}`}
        style={{ width: flagW, height: flagH, display: "inline-block", borderRadius: 2 }}
      />
      {showLabel && (
        <span className={`ml-0.5 ${labelCls}`}>
          {fullName}
        </span>
      )}
    </div>
  );
}
