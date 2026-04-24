"use client";
/**
 * PhonePrefixPicker — combobox de prefijo telefónico con banderas.
 *
 * `<select>` nativo (sobre todo en Windows) ignora los emojis de bandera, así
 * que usamos un combobox propio con <img> de flagcdn.com (gratis, sin
 * dependencia externa). La lista de países se comparte desde el SSOT
 * `src/data/countryPrefixes.ts`, de modo que registro + factura manual ven
 * exactamente los mismos 20 países.
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  COUNTRY_OPTIONS,
  findCountryOption,
  getFlagUrl,
} from "@/data/countryPrefixes";

interface PhonePrefixPickerProps {
  /** ISO alpha-2 ("ES", "PT"...) o "OTRO". */
  value: string;
  onChange: (code: string) => void;
  /** Deshabilita el combobox (útil al enviar el formulario). */
  disabled?: boolean;
  /**
   * Tamaño visual. `md` (h-11, por defecto) encaja con formularios públicos
   * (registro, activación). `sm` (h-9) se usa en paneles admin densos.
   */
  size?: "sm" | "md";
}

export function PhonePrefixPicker({
  value,
  onChange,
  disabled,
  size = "md",
}: PhonePrefixPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = findCountryOption(value);
  const isSmall = size === "sm";

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Prefijo telefónico: ${selected.name} ${selected.dialCode}`}
        className={`flex items-center gap-1.5 border-r-0 border-gray-200 bg-gray-50 text-sm hover:bg-gray-100 focus:outline-none disabled:opacity-60 ${
          isSmall
            ? "h-9 rounded-l-lg border px-2.5 focus:border-blue-400"
            : "h-11 rounded-l-xl border-2 px-3 focus:border-[#2563eb]"
        }`}
      >
        {selected.code === "OTRO" ? (
          <span className="text-base leading-none">🌍</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getFlagUrl(selected.code)}
            alt=""
            width={20}
            height={14}
            className="h-[14px] w-[20px] rounded-sm object-cover"
          />
        )}
        <span className="font-medium text-gray-700">{selected.dialCode}</span>
        <ChevronDown size={13} className="text-gray-400" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute top-full left-0 z-30 mt-1 max-h-72 w-64 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {COUNTRY_OPTIONS.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                role="option"
                aria-selected={c.code === value}
                onClick={() => {
                  onChange(c.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm ${
                  c.code === value
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {c.code === "OTRO" ? (
                  <span className="text-base leading-none">🌍</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getFlagUrl(c.code)}
                    alt=""
                    width={20}
                    height={14}
                    className="h-[14px] w-[20px] shrink-0 rounded-sm object-cover"
                  />
                )}
                <span className="flex-1 truncate">{c.name}</span>
                <span className="shrink-0 font-mono text-xs text-gray-500">
                  {c.dialCode}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
