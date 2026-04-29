"use client";

/**
 * Error boundary específico del callback de Google.
 *
 * Sin este archivo, si el componente del callback lanza durante hidratación
 * (por minificación + edge case en producción), Next.js muestra su pantalla
 * genérica "This page couldn't load" — el usuario no entiende qué pasó y el
 * id_token queda colgado en la URL.
 *
 * Aquí mostramos un mensaje accionable y permitimos reintentar o volver al
 * login. En desarrollo se ve el `error.message`; en producción Next.js lo
 * sanitiza a un string genérico, así que damos también un botón "Reintentar".
 */

import Link from "next/link";

export default function GoogleCallbackError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center bg-gray-50 px-4 py-16 sm:py-24">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-bold text-red-600">
          No se pudo iniciar sesión con Google
        </h1>
        <p className="mb-2 text-sm text-gray-600">
          El navegador rechazó procesar la respuesta de Google. Suele ocurrir
          con bloqueadores agresivos (Brave Shields en modo estricto,
          extensiones tipo MetaMask) que rompen scripts de la página.
        </p>
        {error?.message && (
          <p className="mb-4 break-all rounded-lg bg-gray-50 p-3 text-left font-mono text-xs text-gray-500">
            {error.message}
            {error.digest ? ` · ${error.digest}` : ""}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="h-11 flex-1 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
          >
            Reintentar
          </button>
          <Link
            href="/login"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#2563eb] px-6 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
          >
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
}
