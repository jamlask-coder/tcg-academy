/**
 * Página 404 global. Le decimos a Google que NO la indexe — un 404 indexado
 * mancha el sitio (Search Console marca "soft 404"). Visualmente seguimos la
 * misma estética que el resto del site: navy, dorado, tipografía Fraunces.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Search, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Página no encontrada",
  description: "La página que buscas no existe o se ha movido.",
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
};

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p
          className="mb-3 text-[11px] font-bold tracking-[0.2em] text-amber-600 uppercase"
        >
          Error 404
        </p>
        <h1
          className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl"
          style={{ fontFamily: "var(--font-fraunces), serif" }}
        >
          Esta página no existe
        </h1>
        <p className="mb-8 text-gray-600">
          La URL que has abierto puede haber cambiado o el contenido ya no está
          disponible. Vuelve al inicio o usa el buscador.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-amber-500 bg-gradient-to-r from-white to-amber-50 px-5 py-2.5 text-sm font-bold text-amber-800 shadow-[0_2px_12px_rgba(217,119,6,0.28)] transition hover:from-amber-50 hover:to-amber-100"
          >
            <Home size={15} /> Inicio
          </Link>
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
          >
            <Search size={15} /> Catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}
