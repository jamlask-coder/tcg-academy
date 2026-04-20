"use client";
/**
 * /admin/errores — Panel de errores runtime del cliente.
 *
 * Lee del buffer mantenido por `lib/errorReporter.ts`:
 *  - window.onerror
 *  - unhandledrejection
 *  - reportError() manual (try/catch)
 *
 * No afecta al sitio público: sólo muestra lo que se haya capturado.
 * Si esta página se rompe, el sitio sigue funcionando igual (aislada).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Trash2, Download } from "lucide-react";
import {
  getErrors,
  clearErrors,
  ERROR_REPORTER_EVENT,
  type RuntimeErrorEntry,
} from "@/lib/errorReporter";

type SourceFilter = "all" | RuntimeErrorEntry["source"];

const SOURCE_LABELS: Record<RuntimeErrorEntry["source"], string> = {
  "window.onerror": "window.onerror",
  unhandledrejection: "Promesa sin atrapar",
  manual: "Reporte manual",
  boundary: "ErrorBoundary",
};

function toCsv(entries: RuntimeErrorEntry[]): string {
  const header =
    "timestamp,source,route,message,url,line,column,context,stack";
  const escape = (v: unknown) => {
    if (v === undefined || v === null) return "";
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  };
  const rows = entries.map((e) =>
    [
      escape(e.timestamp),
      escape(e.source),
      escape(e.route),
      escape(e.message),
      escape(e.url),
      escape(e.line),
      escape(e.column),
      escape(e.context),
      escape(e.stack),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

export default function ErroresPage() {
  const [entries, setEntries] = useState<RuntimeErrorEntry[]>([]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setEntries(getErrors());
  }, []);

  useEffect(() => {
    // Carga inicial (sync con localStorage, sistema externo a React).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura inicial de storage
    reload();
    const handler = () => reload();
    window.addEventListener(ERROR_REPORTER_EVENT, handler);
    return () => window.removeEventListener(ERROR_REPORTER_EVENT, handler);
  }, [reload]);

  const filtered = useMemo(() => {
    if (sourceFilter === "all") return entries;
    return entries.filter((e) => e.source === sourceFilter);
  }, [entries, sourceFilter]);

  const countsBySource = useMemo(() => {
    const out: Record<string, number> = {};
    for (const e of entries) out[e.source] = (out[e.source] ?? 0) + 1;
    return out;
  }, [entries]);

  const selected = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId],
  );

  const handleClear = () => {
    if (!confirm("¿Borrar TODOS los errores registrados?")) return;
    clearErrors();
    setSelectedId(null);
  };

  const handleExport = () => {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `errores-runtime-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <AlertTriangle size={22} className="text-amber-500" />
            Errores runtime
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Errores capturados automáticamente en el navegador del usuario
            (últimos {entries.length} de máx. 200). Se borran sólo manualmente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={reload}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Recargar
          </button>
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Download size={14} /> Exportar CSV
          </button>
          <button
            onClick={handleClear}
            disabled={entries.length === 0}
            className="flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            <Trash2 size={14} /> Borrar todo
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total" value={entries.length} tone="neutral" />
        <KpiCard
          label="window.onerror"
          value={countsBySource["window.onerror"] ?? 0}
          tone="red"
        />
        <KpiCard
          label="Promesas sin atrapar"
          value={countsBySource["unhandledrejection"] ?? 0}
          tone="amber"
        />
        <KpiCard
          label="Manuales"
          value={countsBySource["manual"] ?? 0}
          tone="blue"
        />
      </div>

      {/* Filtro */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500">Filtrar por fuente:</span>
        {(["all", "window.onerror", "unhandledrejection", "manual", "boundary"] as SourceFilter[]).map(
          (f) => (
            <button
              key={f}
              onClick={() => setSourceFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                sourceFilter === f
                  ? "border-[#2563eb] bg-[#2563eb] text-white"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f === "all" ? "Todos" : SOURCE_LABELS[f as RuntimeErrorEntry["source"]]}
            </button>
          ),
        )}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <AlertTriangle size={32} className="mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-400">No hay errores registrados</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="grid grid-cols-[130px_140px_1fr_80px] gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
            <span>Fecha</span>
            <span>Fuente</span>
            <span>Mensaje</span>
            <span className="text-right">Ruta</span>
          </div>
          <ul>
            {filtered.map((e) => (
              <li
                key={e.id}
                className="border-b border-gray-100 last:border-0"
              >
                <button
                  onClick={() => setSelectedId(e.id)}
                  className="grid w-full grid-cols-[130px_140px_1fr_80px] gap-2 px-4 py-2 text-left text-sm transition hover:bg-gray-50"
                >
                  <span className="font-mono text-xs text-gray-500">
                    {new Date(e.timestamp).toLocaleString("es-ES", {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                  </span>
                  <span className="truncate text-xs text-gray-600">
                    {SOURCE_LABELS[e.source]}
                  </span>
                  <span className="truncate text-gray-900">{e.message}</span>
                  <span className="truncate text-right text-xs text-gray-400">
                    {e.route ?? "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detalle */}
      {selected && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold">Detalle del error</h2>
            <button
              onClick={() => setSelectedId(null)}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Cerrar
            </button>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-[160px_1fr]">
            <dt className="font-semibold text-gray-500">Fecha</dt>
            <dd className="font-mono text-xs text-gray-900">
              {selected.timestamp}
            </dd>
            <dt className="font-semibold text-gray-500">Fuente</dt>
            <dd className="text-gray-900">{SOURCE_LABELS[selected.source]}</dd>
            <dt className="font-semibold text-gray-500">Mensaje</dt>
            <dd className="text-gray-900">{selected.message}</dd>
            {selected.route && (
              <>
                <dt className="font-semibold text-gray-500">Ruta</dt>
                <dd className="font-mono text-xs text-gray-700">
                  {selected.route}
                </dd>
              </>
            )}
            {selected.url && (
              <>
                <dt className="font-semibold text-gray-500">Archivo</dt>
                <dd className="font-mono text-xs text-gray-700">
                  {selected.url}
                  {selected.line ? `:${selected.line}` : ""}
                  {selected.column ? `:${selected.column}` : ""}
                </dd>
              </>
            )}
            {selected.context && (
              <>
                <dt className="font-semibold text-gray-500">Contexto</dt>
                <dd className="text-gray-900">{selected.context}</dd>
              </>
            )}
            {selected.userAgent && (
              <>
                <dt className="font-semibold text-gray-500">User agent</dt>
                <dd className="break-all font-mono text-xs text-gray-500">
                  {selected.userAgent}
                </dd>
              </>
            )}
            {selected.stack && (
              <>
                <dt className="font-semibold text-gray-500">Stack trace</dt>
                <dd>
                  <pre className="overflow-x-auto rounded bg-gray-50 p-3 font-mono text-xs text-gray-800">
                    {selected.stack}
                  </pre>
                </dd>
              </>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "red" | "amber" | "blue";
}) {
  const toneClass =
    tone === "red"
      ? "text-red-600"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "blue"
          ? "text-[#2563eb]"
          : "text-gray-900";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500 uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
