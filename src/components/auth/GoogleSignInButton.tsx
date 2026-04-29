"use client";
import { useState } from "react";
import Link from "next/link";
import { clickableProps } from "@/lib/a11y";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const NONCE_KEY = "google_oauth_nonce";
const REDIRECT_KEY = "google_oauth_redirect";

function buildGoogleAuthUrl(redirectTo: string): string {
  if (!GOOGLE_CLIENT_ID) return "";
  const nonce =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  sessionStorage.setItem(NONCE_KEY, nonce);
  sessionStorage.setItem(REDIRECT_KEY, redirectTo);

  const redirectUri = `${window.location.origin}/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "id_token",
    // `response_mode=fragment` evita que algunos navegadores/proxies traten
    // mal el id_token (URL fragments no se loguean ni se reenvían). Implícito
    // por OIDC pero Google requiere que sea explícito en algunos clientes
    // recientes — sin esto la respuesta puede llegar en query y romper el
    // callback (la página "This page couldn't load" del usuario).
    response_mode: "fragment",
    scope: "openid email profile",
    nonce,
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Full Google Sign-In control using full-page OAuth redirect flow.
 * Renders nothing if NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.
 *
 * Flow:
 * 1. User clicks button → shows consent modal
 * 2. Accept → redirect to Google's OAuth page
 * 3. Google redirects back to /auth/google/callback with id_token in URL fragment
 * 4. Callback page validates nonce, decodes JWT, completes login
 */
export function GoogleSignInButton({
  redirectTo = "/cuenta",
}: {
  redirectTo?: string;
}) {
  const [showConsent, setShowConsent] = useState(false);

  if (!GOOGLE_CLIENT_ID) return null;

  const startLogin = () => {
    const url = buildGoogleAuthUrl(redirectTo);
    if (url) window.location.href = url;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConsent(true)}
        className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm font-semibold text-gray-700 transition hover:border-[#2563eb] hover:shadow-sm"
        aria-label="Continuar con Google"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#FFC107"
            d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
          />
          <path
            fill="#FF3D00"
            d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.2 5.2C41 35.6 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"
          />
        </svg>
        Continuar con Google
      </button>

      {showConsent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setShowConsent(false)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setShowConsent(false); }}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          aria-label="Consentimiento Google"
        >
          <div
            {...clickableProps((e) => e?.stopPropagation())}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="mb-2 text-lg font-bold text-gray-900">
              Continuar con Google
            </h2>
            <p className="mb-5 text-sm leading-relaxed text-gray-600">
              Al continuar con Google, cedes tu <strong>nombre</strong>,{" "}
              <strong>apellidos</strong>, <strong>email</strong> y{" "}
              <strong>foto de perfil</strong> a TCG Academy para crear o
              recuperar tu cuenta, y aceptas los{" "}
              <Link
                href="/terminos"
                target="_blank"
                className="text-[#2563eb] underline"
              >
                términos
              </Link>{" "}
              y la{" "}
              <Link
                href="/privacidad"
                target="_blank"
                className="text-[#2563eb] underline"
              >
                política de privacidad
              </Link>
              .
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConsent(false)}
                className="h-10 flex-1 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={startLogin}
                className="h-10 flex-1 rounded-xl bg-[#2563eb] text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
              >
                Aceptar y continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
