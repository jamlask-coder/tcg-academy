"use client";
import { useState } from "react";
import {
  GoogleLogin,
  GoogleOAuthProvider,
  type CredentialResponse,
} from "@react-oauth/google";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, type GoogleSignInPayload } from "@/context/AuthContext";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Decode the base64url-encoded payload of a Google ID token (JWT).
 * We do NOT verify the signature client-side — Google already did that when
 * issuing the credential. If/when a server-side route is added, verification
 * should happen there. This is safe for reading profile claims only.
 */
function decodeGoogleJwt(token: string): GoogleSignInPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    // Handle non-ASCII (accents in names)
    const json = decodeURIComponent(
      Array.from(binary)
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json) as GoogleSignInPayload;
  } catch {
    return null;
  }
}

function GoogleSignInInner({ redirectTo }: { redirectTo: string }) {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSuccess = async (resp: CredentialResponse) => {
    if (!resp.credential) {
      setError("No se recibió credencial de Google");
      return;
    }
    const payload = decodeGoogleJwt(resp.credential);
    if (!payload?.email) {
      setError("No se pudo leer tu email de Google");
      return;
    }
    setLoading(true);
    const result = await loginWithGoogle(payload);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Error al iniciar sesión con Google");
      return;
    }
    router.push(redirectTo);
  };

  return (
    <div>
      <label className="mb-3 flex cursor-pointer items-start gap-2.5 select-none">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#2563eb]"
          aria-label="Acepto ceder mis datos de Google a TCG Academy"
        />
        <span className="text-xs text-gray-600">
          Al continuar con Google, cedes tu <strong>nombre</strong>,{" "}
          <strong>apellidos</strong>, <strong>email</strong> y{" "}
          <strong>foto de perfil</strong> a TCG Academy para crear o recuperar
          tu cuenta, y aceptas los{" "}
          <Link
            href="/legal/terminos"
            target="_blank"
            className="text-[#2563eb] underline"
          >
            términos
          </Link>{" "}
          y la{" "}
          <Link
            href="/legal/privacidad"
            target="_blank"
            className="text-[#2563eb] underline"
          >
            política de privacidad
          </Link>
          .
        </span>
      </label>
      <div
        aria-disabled={!accepted}
        className={`flex w-full justify-center ${accepted ? "" : "pointer-events-none opacity-50"}`}
      >
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setError("No se pudo conectar con Google")}
          text="continue_with"
          shape="rectangular"
          width="320"
        />
      </div>
      {loading && (
        <p className="mt-2 text-center text-xs text-gray-500">
          Accediendo con Google…
        </p>
      )}
      {error && (
        <p className="mt-2 text-center text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

/**
 * Full Google Sign-In control. Renders nothing if
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.
 */
export function GoogleSignInButton({
  redirectTo = "/cuenta",
}: {
  redirectTo?: string;
}) {
  if (!GOOGLE_CLIENT_ID) return null;
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleSignInInner redirectTo={redirectTo} />
    </GoogleOAuthProvider>
  );
}
