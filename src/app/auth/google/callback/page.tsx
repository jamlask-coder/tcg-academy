"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, type GoogleSignInPayload } from "@/context/AuthContext";
import type { User } from "@/types/user";

// Evita cualquier intento de prerender estático: el callback solo tiene
// sentido en runtime con `window`, `sessionStorage` y un fragmento de URL
// presente. En producción Next.js intentaba pre-procesar la página y eso
// dejaba el bundle en un estado donde la hidratación crasheaba con un
// "Cannot read properties of undefined (reading 'length')" sin contexto,
// que el navegador mostraba como "This page couldn't load".
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  // Guard contra doble-ejecución (React StrictMode dev + posible re-render).
  // Sin esto, el segundo mount no encuentra el nonce (lo borró el primero) y
  // muestra "Verificación de seguridad fallida" aunque el login fue OK.
  // No dependemos de `user` del AuthContext aquí: hidratar AuthContext puede
  // tardar (fetch a /api/auth/me) y crear una race en la que el callback
  // redirige antes de procesar el id_token. Procesamos siempre el fragmento
  // si está presente; si la sesión ya estaba activa, persist() lo refresca.
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const run = async () => {
      // Lee el id_token de fragment (#) o, como fallback, de query (?).
      // Google a veces devuelve `error` en query string aunque el flow sea
      // implicit; cubrimos ambos para mostrar el mensaje real al usuario.
      // Defensivo: si por cualquier motivo `window` o sus propiedades no
      // están disponibles (extensión que stub'ea globals, hidratación rota),
      // capturamos y mostramos un error claro en vez de propagar y romper el
      // árbol React entero (que es lo que provoca "This page couldn't load").
      let hash = "";
      let search = "";
      try {
        hash = (window?.location?.hash ?? "").replace(/^#/, "");
        search = (window?.location?.search ?? "").replace(/^\?/, "");
      } catch {
        setError(
          "El navegador no permite leer la URL. Si usas Brave Shields en " +
            "modo estricto o una extensión web3 (MetaMask), prueba a " +
            "desactivar Shields para este sitio o usar otra ventana.",
        );
        return;
      }
      const fragParams = new URLSearchParams(hash);
      const queryParams = new URLSearchParams(search);
      const idToken = fragParams.get("id_token") ?? queryParams.get("id_token");
      const oauthError =
        fragParams.get("error") ?? queryParams.get("error");
      const oauthErrorDescription =
        fragParams.get("error_description") ??
        queryParams.get("error_description");

      if (oauthError) {
        const detail = oauthErrorDescription
          ? `${oauthError}: ${oauthErrorDescription}`
          : oauthError;
        setError(`Google rechazó el login: ${detail}`);
        return;
      }

      if (!idToken) {
        setError(
          "No se recibió token de Google. Comprueba que la URL de redirección " +
            "está autorizada en Google Cloud Console.",
        );
        return;
      }

      const claims = decodeJwt(idToken);
      if (!claims) {
        setError("Token de Google no válido");
        return;
      }

      // Verify nonce matches the one we stored before redirecting.
      // Solo lo borramos si vamos a procesarlo (no antes), para que un
      // segundo mount accidental encuentre o el nonce intacto o la sesión
      // ya creada (caso `user` arriba).
      const expectedNonce = sessionStorage.getItem(NONCE_KEY);
      if (!expectedNonce || claims.nonce !== expectedNonce) {
        setError("Verificación de seguridad fallida. Vuelve a intentarlo.");
        return;
      }
      sessionStorage.removeItem(NONCE_KEY);

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
        // Pasamos el token crudo para que server-mode lo re-verifique contra
        // la JWKS de Google. En modo local no se usa.
        idToken,
      };

      const redirectTo = sessionStorage.getItem(REDIRECT_KEY) ?? "/cuenta";
      sessionStorage.removeItem(REDIRECT_KEY);

      const result = await loginWithGoogle(payload);
      if (!result.ok) {
        setError(result.error ?? "Error al iniciar sesión con Google");
        return;
      }

      // Limpia el id_token del hash de la URL para que un F5 posterior no
      // intente reprocesar el token (ya consumido). replaceState evita
      // navegación adicional. NO se ve en el historial.
      try {
        window.history.replaceState(null, "", window.location.pathname);
      } catch { /* non-critical */ }

      // Role-aware redirect: si el usuario recién logueado es admin, lo
      // mandamos a /admin. Si no, al destino guardado antes del OAuth (o a
      // /cuenta por defecto). El gate fiscal (NIF + dirección) se aplica
      // solo en checkout vía FiscalDataGuard — no bloqueamos el login en sí.
      let finalRedirect = redirectTo;
      try {
        const raw = localStorage.getItem("tcgacademy_user");
        if (raw) {
          const loggedUser = JSON.parse(raw) as User;
          if (loggedUser.role === "admin") finalRedirect = "/admin";
        }
      } catch {
        /* ignore */
      }

      router.replace(finalRedirect);
    };
    // Wrap defensivo: si algo lanza (parseo, fetch, decoding), mostramos
    // nuestra UI de error en vez de dejar que React/Next muestren la
    // pantalla genérica "This page couldn't load. Reload to try again".
    run().catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error inesperado al procesar el login con Google: ${msg}`);
    });
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
