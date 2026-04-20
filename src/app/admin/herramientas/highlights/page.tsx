import Link from "next/link";
import { ChevronRight } from "lucide-react";
import HighlightsScanner from "./HighlightsScanner";

export default function AdminHighlightsDiagnosticPage() {
  return (
    <div>
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
        <Link
          href="/admin/herramientas"
          className="transition hover:text-[#2563eb]"
        >
          Herramientas
        </Link>
        <ChevronRight size={14} />
        <span className="font-medium text-gray-900">
          Diagnóstico Highlights
        </span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Diagnóstico: Cartas más cotizadas
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Verifica qué productos resuelven automáticamente sus cartas top y qué
          juegos/estrategias fallan. El escaneo usa el dispatcher real del
          módulo{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px]">
            setHighlights
          </code>
          .
        </p>
      </div>

      <HighlightsScanner />
    </div>
  );
}
