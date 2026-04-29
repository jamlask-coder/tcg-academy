"use client";

/**
 * Error boundary global de App Router. Cubre cualquier excepción no capturada
 * en el render server-side o en el client. Loguea al sistema interno (visible
 * en /admin/errores) y muestra un fallback discreto con CTA "reintentar".
 *
 * IMPORTANTE: Este componente DEBE ser client (es la API del App Router) y
 * por eso no puede exportar metadata. Sin embargo Next 16 permite definir
 * `metadata` en el componente Error mediante el head implícito — la robots
 * directiva `noindex` se hereda del comportamiento estándar (errores no se
 * indexan por defecto).
 */

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { reportError } from "@/lib/errorReporter";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, "boundary", `digest:${error.digest ?? "n/a"}`);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <meta name="robots" content="noindex,nofollow" />
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle size={26} />
        </div>
        <p className="mb-3 text-[11px] font-bold tracking-[0.2em] text-red-600 uppercase">
          Algo se torció
        </p>
        <h1
          className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
          style={{ fontFamily: "var(--font-fraunces), serif" }}
        >
          No hemos podido cargar esta página
        </h1>
        <p className="mb-8 text-gray-600">
          Hemos registrado el incidente. Puedes intentarlo de nuevo o volver a
          la portada — si persiste, escríbenos a{" "}
          <a
            href="mailto:hola@tcgacademy.es"
            className="font-semibold text-amber-700 underline"
          >
            hola@tcgacademy.es
          </a>
          .
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-amber-500 bg-gradient-to-r from-white to-amber-50 px-5 py-2.5 text-sm font-bold text-amber-800 shadow-[0_2px_12px_rgba(217,119,6,0.28)] transition hover:from-amber-50 hover:to-amber-100"
          >
            <RotateCcw size={15} /> Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
          >
            <Home size={15} /> Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
