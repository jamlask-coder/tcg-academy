"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, type GoogleSignInPayload } from "@/context/AuthContext";
import { isFiscalProfileComplete } from "@/lib/validations/profileComplete";
import type { User } from "@/types/user";

const NONCE_KEY = "google_oauth_nonce";
const REDIRECT_KEY = "google_oauth_redirect";

interface GoogleIdTokenClaims extends GoogleSignInPayload {
  nonce?: string;
  aud?: string;
  iss?: string;
  exp?: number;
}

function decodeJwt(token: string): GoogleIdTokenClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const json = decodeURIComponent(
      Array.from(binary)
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json) as GoogleIdTokenClaims;
  } catch {
    return null;
  }
}

export default function GoogleCallbackPage() {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      const hash = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(hash);
      const idToken = params.get("id_token");
      const oauthError = params.get("error");

      if (oauthError) {
        setError(`Google rechazó el login: ${oauthError}`);
        return;
      }

      if (!idToken) {
        setError("No se recibió token de Google");
        return;
      }

      const claims = decodeJwt(idToken);
      if (!claims) {
        setError("Token de Google no válido");
        return;
      }

      // Verify nonce matches the one we stored before redirecting
      const expectedNonce = sessionStorage.getItem(NONCE_KEY);
      sessionStorage.removeItem(NONCE_KEY);
      if (!expectedNonce || claims.nonce !== expectedNonce) {
        setError("Verificación de seguridad fallida. Vuelve a intentarlo.");
        return;
      }

      // Verify audience = our client ID
      if (claims.aud !== process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        setError("Token emitido para otra aplicación");
        return;
      }

      // Verify not expired
      if (claims.exp && claims.exp * 1000 < Date.now()) {
        setError("Token de Google caducado. Vuelve a intentarlo.");
        return;
      }

      const payload: GoogleSignInPayload = {
        sub: claims.sub,
        email: claims.email,
        email_verified: claims.email_verified,
        name: claims.name,
        given_name: claims.given_name,
        family_name: claims.family_name,
        picture: claims.picture,
      };

      const redirectTo = sessionStorage.getItem(REDIRECT_KEY) ?? "/cuenta";
      sessionStorage.removeItem(REDIRECT_KEY);

      const result = await loginWithGoogle(payload);
      if (!result.ok) {
        setError(result.error ?? "Error al iniciar sesión con Google");
        return;
      }
      // Role-aware redirect: if just-logged-in user is admin, override to /admin.
      // Y antes de cualquier otro destino, si el perfil fiscal no está
      // completo (típico en cuentas recién creadas vía Google OAuth), le
      // enviamos a /cuenta/completar-datos para recoger NIF + teléfono +
      // domicilio fiscal (obligatorios por Art. 6 RD 1619/2012).
      let finalRedirect = redirectTo;
      let loggedUser: User | null = null;
      try {
        const raw = localStorage.getItem("tcgacademy_user");
        if (raw) {
          loggedUser = JSON.parse(raw) as User;
          if (loggedUser.role === "admin") finalRedirect = "/admin";
        }
      } catch {
        /* ignore */
      }

      if (loggedUser && loggedUser.role !== "admin") {
        const completeness = isFiscalProfileComplete(loggedUser);
        if (!completeness.ok) {
          const ret = encodeURIComponent(finalRedirect);
          finalRedirect = `/cuenta/completar-datos?return=${ret}`;
        }
      }

      router.replace(finalRedirect);
    };
    void run();
  }, [loginWithGoogle, router]);

  return (
    <div className="flex items-center justify-center bg-gray-50 px-4 py-16 sm:py-24">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        {error ? (
          <>
            <h1 className="mb-2 text-xl font-bold text-red-600">
              No se pudo iniciar sesión
            </h1>
            <p className="mb-6 text-sm text-gray-600">{error}</p>
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#2563eb] px-6 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
            >
              Volver al login
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#2563eb]" />
            <p className="text-sm text-gray-600">Iniciando sesión con Google…</p>
          </>
        )}
      </div>
    </div>
  );
}
