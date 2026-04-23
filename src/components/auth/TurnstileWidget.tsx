"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile widget — CAPTCHA invisible/gestual, privacy-friendly.
 *
 * Sólo se renderiza si `NEXT_PUBLIC_TURNSTILE_SITE_KEY` está definido. En su
 * ausencia (modo local / dev), devuelve `null` y notifica al padre con un
 * pseudo-token "skipped" para que el form no se quede atascado.
 *
 * Por qué Turnstile y no reCAPTCHA:
 * - Gratis y sin mínimo mensual.
 * - Sin cookies de tracking (amigable RGPD).
 * - No muestra puzzles a la mayoría de usuarios (detección pasiva).
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "flexible" | "compact";
          action?: string;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SKIPPED_TOKEN = "dev-skipped";

export { SKIPPED_TOKEN };

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
  /** Acción lógica ("register", "login"…) — Cloudflare la usa para analytics. */
  action?: string;
  /** Forzar skip (útil en tests). Por defecto lee la sitekey del env. */
  disabled?: boolean;
}

export function TurnstileWidget({
  onToken,
  action = "register",
  disabled,
}: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Sin sitekey → emite token "skipped" para no bloquear dev local y sale.
  useEffect(() => {
    if (!siteKey || disabled) {
      onToken(SKIPPED_TOKEN);
    }
  }, [siteKey, disabled, onToken]);

  useEffect(() => {
    if (!siteKey || disabled) return;
    if (typeof window === "undefined") return;

    let cancelled = false;

    const ensureScript = () =>
      new Promise<void>((resolve, reject) => {
        if (window.turnstile) return resolve();
        const existing = document.querySelector<HTMLScriptElement>(
          `script[src^="https://challenges.cloudflare.com/turnstile/"]`,
        );
        if (existing) {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener(
            "error",
            () => reject(new Error("turnstile-script-error")),
            { once: true },
          );
          return;
        }
        const s = document.createElement("script");
        s.src = SCRIPT_SRC;
        s.async = true;
        s.defer = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("turnstile-script-error"));
        document.head.appendChild(s);
      });

    ensureScript()
      .then(() => {
        if (cancelled) return;
        if (!window.turnstile || !containerRef.current) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: "light",
          size: "flexible",
          callback: (token: string) => onToken(token),
          "expired-callback": () => onToken(""),
          "error-callback": () => onToken(""),
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, disabled, action, onToken]);

  if (!siteKey || disabled) return null;

  if (loadError) {
    return (
      <p className="text-xs text-red-500">
        No se ha podido cargar la verificación anti-bot. Recarga la página.
      </p>
    );
  }

  return <div ref={containerRef} className="cf-turnstile" />;
}
