"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  Play,
  Square,
  Sparkles,
} from "lucide-react";
import {
  isGameSupported,
  resolveHighlights,
  type HighlightsResult,
} from "@/lib/setHighlights";
import { PRODUCTS, GAME_CONFIG, type LocalProduct } from "@/data/products";

// ─── Types ──────────────────────────────────────────────────────────────────

type ScanStatus = "pending" | "running" | "ok" | "empty" | "error" | "na";

interface ScanRow {
  productId: number;
  productName: string;
  game: string;
  setId: string | null;
  setLabel?: string;
  provenance: string;
  strategyTried: string[];
  cardCount: number;
  tookMs: number;
  errors: string[];
  status: ScanStatus;
}

type StatusFilter = "all" | "ok" | "empty" | "error" | "na";

// ─── Helpers ────────────────────────────────────────────────────────────────

const CONCURRENCY = 4;

function buildInitialRow(p: LocalProduct): ScanRow {
  return {
    productId: p.id,
    productName: p.name,
    game: p.game,
    setId: null,
    provenance: "none",
    strategyTried: [],
    cardCount: 0,
    tookMs: 0,
    errors: [],
    status: "pending",
  };
}

function applyResult(row: ScanRow, r: HighlightsResult): ScanRow {
  const supported = isGameSupported(row.game);
  const status: ScanStatus = !supported
    ? "na"
    : r.errors.length > 0
      ? "error"
      : r.cards.length === 0
        ? "empty"
        : "ok";
  return {
    ...row,
    setId: r.resolved?.setId ?? null,
    setLabel: r.resolved?.setLabel,
    provenance: r.provenance,
    strategyTried: r.strategyTried,
    cardCount: r.cards.length,
    tookMs: r.tookMs,
    errors: r.errors,
    status,
  };
}

function gameLabel(game: string): string {
  return GAME_CONFIG[game]?.name ?? game;
}

function downloadCSV(filename: string, rows: string[][], headers: string[]) {
  const escape = (v: string | number) =>
    `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportRowsCSV(rows: ScanRow[]) {
  const headers = [
    "ID",
    "Nombre",
    "Juego",
    "SetID",
    "SetLabel",
    "Provenance",
    "Estrategias",
    "Nº cartas",
    "Tiempo (ms)",
    "Estado",
    "Errores",
  ];
  const data = rows.map((r) => [
    String(r.productId),
    r.productName,
    r.game,
    r.setId ?? "",
    r.setLabel ?? "",
    r.provenance,
    r.strategyTried.join(" | "),
    String(r.cardCount),
    r.tookMs.toFixed(1),
    r.status,
    r.errors.join(" | "),
  ]);
  downloadCSV(
    `tcgacademy_highlights_diag_${new Date().toISOString().slice(0, 10)}.csv`,
    data,
    headers,
  );
}

// ─── Summary by game ────────────────────────────────────────────────────────

interface GameSummary {
  game: string;
  label: string;
  total: number;
  ok: number;
  empty: number;
  error: number;
  pctOk: number;
  supported: boolean;
}

function buildGameSummaries(rows: ScanRow[]): GameSummary[] {
  const byGame = new Map<string, ScanRow[]>();
  for (const r of rows) {
    if (!byGame.has(r.game)) byGame.set(r.game, []);
    byGame.get(r.game)!.push(r);
  }
  const out: GameSummary[] = [];
  for (const [game, gameRows] of byGame) {
    const supported = isGameSupported(game);
    const total = gameRows.length;
    const scanned = gameRows.filter((r) => r.status !== "pending");
    const ok = gameRows.filter((r) => r.status === "ok").length;
    const empty = gameRows.filter((r) => r.status === "empty").length;
    const error = gameRows.filter((r) => r.status === "error").length;
    const denom = scanned.length || total;
    const pctOk = denom > 0 ? Math.round((ok / denom) * 100) : 0;
    out.push({
      game,
      label: gameLabel(game),
      total,
      ok,
      empty,
      error,
      pctOk,
      supported,
    });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, "es"));
}

function summaryColor(pct: number): {
  border: string;
  bg: string;
  text: string;
  dot: string;
} {
  if (pct > 80) {
    return {
      border: "border-green-300",
      bg: "bg-green-50",
      text: "text-green-700",
      dot: "bg-green-500",
    };
  }
  if (pct >= 40) {
    return {
      border: "border-amber-300",
      bg: "bg-amber-50",
      text: "text-amber-700",
      dot: "bg-amber-500",
    };
  }
  return {
    border: "border-red-300",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function HighlightsScanner() {
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [filterGame, setFilterGame] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const abortRef = useRef<AbortController | null>(null);

  const allGames = useMemo(() => {
    const set = new Set(PRODUCTS.map((p) => p.game));
    return Array.from(set).sort((a, b) =>
      gameLabel(a).localeCompare(gameLabel(b), "es"),
    );
  }, []);

  const summaries = useMemo(() => buildGameSummaries(rows), [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterGame !== "all" && r.game !== filterGame) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      return true;
    });
  }, [rows, filterGame, filterStatus]);

  const runScan = async () => {
    if (scanning) return;
    const products = [...PRODUCTS];
    const initial: ScanRow[] = products.map(buildInitialRow);
    setRows(initial);
    setProgress({ done: 0, total: products.length });
    setScanning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const queue = [...products];
    const results: ScanRow[] = [...initial];

    const worker = async () => {
      while (queue.length > 0) {
        if (controller.signal.aborted) return;
        const p = queue.shift();
        if (!p) return;
        const idx = results.findIndex((r) => r.productId === p.id);
        if (idx === -1) continue;
        results[idx] = { ...results[idx], status: "running" };
        setRows([...results]);
        try {
          const r = await resolveHighlights(p, "es");
          if (controller.signal.aborted) return;
          results[idx] = applyResult(results[idx], r);
        } catch (e) {
          results[idx] = {
            ...results[idx],
            status: "error",
            errors: [String(e)],
          };
        }
        setRows([...results]);
        setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
      }
    };

    const workers = Array.from({ length: CONCURRENCY }, () => worker());
    await Promise.all(workers);
    setScanning(false);
    abortRef.current = null;
  };

  const stopScan = () => {
    abortRef.current?.abort();
    setScanning(false);
  };

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasResults = rows.length > 0;
  const anyErrors = useMemo(
    () => rows.some((r) => r.errors.length > 0),
    [rows],
  );
  const pctProgress =
    progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-1.5 rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play size={14} />
          {scanning ? "Escaneando…" : "Escanear todo el catálogo"}
        </button>
        {scanning && (
          <button
            onClick={stopScan}
            className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <Square size={13} /> Detener
          </button>
        )}
        <button
          onClick={() => exportRowsCSV(filteredRows)}
          disabled={!hasResults}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={13} className="text-[#2563eb]" /> Exportar CSV
        </button>
        <div className="ml-auto text-xs text-gray-500">
          {hasResults && (
            <>
              {progress.done} / {progress.total} escaneados
              {anyErrors && (
                <span className="ml-2 inline-flex items-center gap-1 text-red-600">
                  <AlertTriangle size={12} /> errores detectados
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Barra de progreso */}
      {scanning && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-[#2563eb] transition-all duration-200"
            style={{ width: `${pctProgress}%` }}
          />
        </div>
      )}

      {/* Resumen por juego */}
      {hasResults && summaries.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-bold text-gray-900">
            Resumen por juego
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {summaries.map((s) => {
              if (!s.supported) {
                return (
                  <div
                    key={s.game}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500">
                        {s.label}
                      </p>
                      <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                    </div>
                    <p className="mt-1.5 text-2xl font-black tabular-nums text-gray-400">
                      N/A
                      <span className="text-sm font-semibold text-gray-400">
                        {" "}
                        / {s.total}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      No aplicable (cromos)
                    </p>
                  </div>
                );
              }
              const c = summaryColor(s.pctOk);
              const scanned = s.ok + s.empty + s.error;
              return (
                <div
                  key={s.game}
                  className={`rounded-2xl border ${c.border} ${c.bg} p-3`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-900">
                      {s.label}
                    </p>
                    <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                  </div>
                  <p className={`mt-1.5 text-2xl font-black ${c.text} tabular-nums`}>
                    {s.ok}
                    <span className="text-sm font-semibold text-gray-500">
                      {" "}
                      / {s.total} OK
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {s.pctOk}% resolución
                    {scanned < s.total && (
                      <span className="ml-1 text-gray-400">
                        · {scanned}/{s.total} escaneados
                      </span>
                    )}
                  </p>
                  {(s.empty > 0 || s.error > 0) && (
                    <p className="mt-1 flex gap-2 text-[10px] font-semibold">
                      {s.empty > 0 && (
                        <span className="text-amber-700">
                          {s.empty} sin cartas
                        </span>
                      )}
                      {s.error > 0 && (
                        <span className="text-red-700">
                          {s.error} con error
                        </span>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      {hasResults && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="filter-game"
              className="text-xs font-semibold text-gray-600"
            >
              Juego
            </label>
            <select
              id="filter-game"
              aria-label="Filtrar por juego"
              value={filterGame}
              onChange={(e) => setFilterGame(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700"
            >
              <option value="all">Todos</option>
              {allGames.map((g) => (
                <option key={g} value={g}>
                  {gameLabel(g)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="filter-status"
              className="text-xs font-semibold text-gray-600"
            >
              Estado
            </label>
            <select
              id="filter-status"
              aria-label="Filtrar por estado"
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as StatusFilter)
              }
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700"
            >
              <option value="all">Todos</option>
              <option value="ok">OK</option>
              <option value="empty">Sin cartas</option>
              <option value="error">Con error</option>
              <option value="na">N/A (cromos)</option>
            </select>
          </div>
          <p className="ml-auto text-xs text-gray-500">
            {filteredRows.length} fila(s) visibles
          </p>
        </div>
      )}

      {/* Tabla */}
      {hasResults ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="max-h-[640px] overflow-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">ID</th>
                  <th className="px-3 py-2 font-semibold">Nombre</th>
                  <th className="px-3 py-2 font-semibold">Juego</th>
                  <th className="px-3 py-2 font-semibold">Set</th>
                  <th className="px-3 py-2 font-semibold">Estrategia</th>
                  <th className="px-3 py-2 font-semibold">Nº cartas</th>
                  <th className="px-3 py-2 font-semibold">Tiempo</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.map((r) => {
                  const hasErr = r.errors.length > 0;
                  const isExpanded = expanded.has(r.productId);
                  const rowBorder =
                    r.status === "ok"
                      ? "border-l-4 border-l-green-500"
                      : r.status === "empty"
                        ? "border-l-4 border-l-amber-500"
                        : r.status === "error"
                          ? "border-l-4 border-l-red-500"
                          : r.status === "na"
                            ? "border-l-4 border-l-gray-300"
                            : "border-l-4 border-l-gray-200";
                  return (
                    <Fragment key={r.productId}>
                      <tr
                        className={`bg-white ${rowBorder} hover:bg-gray-50`}
                      >
                        <td className="px-3 py-2 font-mono text-[11px] text-gray-500">
                          {r.productId}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-gray-900">
                            {r.productName}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {gameLabel(r.game)}
                        </td>
                        <td className="px-3 py-2">
                          {r.setId ? (
                            <div className="flex flex-col">
                              <code className="font-mono text-[11px] text-gray-900">
                                {r.setId}
                              </code>
                              {r.setLabel && (
                                <span className="text-[10px] text-gray-500">
                                  {r.setLabel}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                              {r.provenance}
                            </span>
                            {r.strategyTried.map((s, i) => (
                              <span
                                key={`${r.productId}-${i}`}
                                className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-600"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-gray-900">
                          {r.status === "pending" || r.status === "running"
                            ? "—"
                            : r.cardCount}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-xs text-gray-500">
                          {r.tookMs > 0 ? `${r.tookMs.toFixed(0)} ms` : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge
                            status={r.status}
                            expandable={hasErr}
                            expanded={isExpanded}
                            onToggle={() => toggleExpanded(r.productId)}
                          />
                        </td>
                      </tr>
                      {hasErr && isExpanded && (
                        <tr className="bg-red-50/40">
                          <td colSpan={8} className="px-3 py-2">
                            <p className="mb-1 text-[11px] font-semibold text-red-700">
                              Errores ({r.errors.length}):
                            </p>
                            <ul className="space-y-1">
                              {r.errors.map((e, i) => (
                                <li
                                  key={`${r.productId}-e-${i}`}
                                  className="rounded bg-white px-2 py-1 font-mono text-[10px] text-red-800"
                                >
                                  {e}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <Sparkles size={24} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm font-semibold text-gray-700">
            Sin resultados aún
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Pulsa &ldquo;Escanear todo el catálogo&rdquo; para ejecutar el
            diagnóstico sobre los {PRODUCTS.length} productos.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({
  status,
  expandable,
  expanded,
  onToggle,
}: {
  status: ScanStatus;
  expandable: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
        Pendiente
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
        Escaneando
      </span>
    );
  }
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
        <CheckCircle2 size={11} /> OK
      </span>
    );
  }
  if (status === "na") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
        N/A
      </span>
    );
  }
  if (status === "empty") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        <AlertTriangle size={11} /> Sin cartas
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={expandable ? onToggle : undefined}
      aria-label={
        expandable
          ? expanded
            ? "Ocultar errores"
            : "Mostrar errores"
          : "Error"
      }
      className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100"
    >
      <AlertCircle size={11} /> Error
      {expandable && (
        <span className="text-[9px] text-red-500">
          {expanded ? "▲" : "▼"}
        </span>
      )}
    </button>
  );
}
