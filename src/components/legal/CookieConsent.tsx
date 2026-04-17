"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const STORAGE_KEY = "tcga_cookie_consent";

interface CookiePreferences {
  necessary: true; // always true, can't be disabled
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

function loadPreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookiePreferences;
    if (!parsed.timestamp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePreferences(prefs: CookiePreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const prefs = loadPreferences();
    if (!prefs) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
    }
  }, []);

  const accept = useCallback(
    (prefs: Omit<CookiePreferences, "necessary" | "timestamp">) => {
      const full: CookiePreferences = {
        necessary: true,
        analytics: prefs.analytics,
        marketing: prefs.marketing,
        timestamp: new Date().toISOString(),
      };
      savePreferences(full);
      setVisible(false);
    },
    [],
  );

  const handleAcceptAll = () => accept({ analytics: true, marketing: true });
  const handleRejectAll = () => accept({ analytics: false, marketing: false });
  const handleSaveConfig = () => accept({ analytics, marketing });

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[9999] p-4"
      role="dialog"
      aria-label="Configuración de cookies"
    >
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        {!showConfig ? (
          <>
            <div className="mb-4">
              <h2 className="mb-1.5 text-base font-bold text-gray-900">
                Utilizamos cookies
              </h2>
              <p className="text-sm leading-relaxed text-gray-600">
                Usamos cookies técnicas necesarias para el funcionamiento del
                sitio. Además, con tu consentimiento, podríamos utilizar cookies
                de análisis para mejorar tu experiencia. Puedes aceptar todas,
                rechazar las no esenciales o configurar tus preferencias.{" "}
                <Link
                  href="/cookies"
                  className="font-medium text-[#2563eb] hover:underline"
                >
                  Más información
                </Link>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleAcceptAll}
                className="rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1d4ed8]"
                aria-label="Aceptar todas las cookies"
              >
                Aceptar todas
              </button>
              <button
                onClick={handleRejectAll}
                className="rounded-xl border-2 border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
                aria-label="Rechazar cookies no esenciales"
              >
                Solo necesarias
              </button>
              <button
                onClick={() => setShowConfig(true)}
                className="px-3 py-2.5 text-sm font-medium text-gray-500 underline-offset-2 transition-colors hover:text-gray-700 hover:underline"
                aria-label="Configurar preferencias de cookies"
              >
                Configurar
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-4 text-base font-bold text-gray-900">
              Configurar cookies
            </h2>

            <div className="space-y-3">
              <CookieToggle
                label="Cookies necesarias"
                description="Imprescindibles para la navegación, el carrito y tu sesión. No se pueden desactivar."
                checked={true}
                disabled={true}
              />
              <CookieToggle
                label="Cookies de análisis"
                description="Nos ayudan a entender cómo se usa el sitio para mejorarlo (datos anónimos y agregados)."
                checked={analytics}
                onChange={setAnalytics}
              />
              <CookieToggle
                label="Cookies de marketing"
                description="Permiten mostrarte publicidad relevante y medir la eficacia de nuestras campañas."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={handleSaveConfig}
                className="rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1d4ed8]"
                aria-label="Guardar preferencias de cookies"
              >
                Guardar preferencias
              </button>
              <button
                onClick={handleAcceptAll}
                className="rounded-xl border-2 border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
                aria-label="Aceptar todas las cookies"
              >
                Aceptar todas
              </button>
              <button
                onClick={() => setShowConfig(false)}
                className="px-3 py-2.5 text-sm font-medium text-gray-500 underline-offset-2 transition-colors hover:text-gray-700 hover:underline"
                aria-label="Volver al banner de cookies"
              >
                Volver
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CookieToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
        disabled
          ? "border-gray-100 bg-gray-50"
          : "cursor-pointer border-gray-200 hover:border-blue-200 hover:bg-blue-50/30"
      }`}
    >
      <span className="mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="h-4.5 w-4.5 rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb] disabled:opacity-50"
          aria-label={label}
        />
      </span>
      <span>
        <span className="block text-sm font-semibold text-gray-800">
          {label}
          {disabled && (
            <span className="ml-2 inline-block rounded-md bg-gray-200 px-2 py-0.5 text-[10px] font-bold tracking-wide text-gray-500 uppercase">
              Siempre activas
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">
          {description}
        </span>
      </span>
    </label>
  );
}

// ─── Hook: useCookieConsent ─────────────────────────────────────────────────
// Use this hook BEFORE loading any non-essential script (analytics, marketing).
// It reads the stored preferences and returns the consent status.
//
// Usage:
//   const { analytics, marketing } = useCookieConsent();
//   useEffect(() => { if (analytics) loadGoogleAnalytics(); }, [analytics]);

export function useCookieConsent(): {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  hasConsented: boolean;
} {
  const [prefs, setPrefs] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(loadPreferences());
  }, []);

  return {
    necessary: true,
    analytics: prefs?.analytics ?? false,
    marketing: prefs?.marketing ?? false,
    hasConsented: prefs !== null,
  };
}

/**
 * Small link button to reopen cookie settings — place in footer.
 */
export function CookieSettingsButton() {
  const handleClick = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  return (
    <button
      onClick={handleClick}
      className="text-sm text-slate-300 transition-colors duration-150 hover:text-white"
      aria-label="Abrir configuración de cookies"
    >
      Configuración de cookies
    </button>
  );
}
