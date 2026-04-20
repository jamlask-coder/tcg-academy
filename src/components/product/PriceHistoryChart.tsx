"use client";

/**
 * Gráfico de evolución de precio Cardmarket (EUR).
 *
 * - SVG puro, sin dependencias.
 * - Área degradada + línea amber/gold.
 * - Tooltip al pasar ratón/tacto.
 * - Responsive (viewBox + preserveAspectRatio).
 * - Estado vacío (día 1): panel minimalista con mensaje claro.
 * - Loading skeleton shimmer.
 *
 * Fuente de los datos: `priceHistoryService.getPriceHistory(game, externalId)`.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  canonicalCardId,
  getPriceHistory,
  getLatestPrice,
  getVariationPct,
  type PriceHistorySeries,
} from "@/services/priceHistoryService";

interface Props {
  game: string;
  externalId: string;
  cardName: string;
}

const W = 600;
const H = 160;
const PAD_L = 48;
const PAD_R = 16;
const PAD_T = 12;
const PAD_B = 28;

function formatEur(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDateEs(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(d);
}

export function PriceHistoryChart({ game, externalId, cardName }: Props) {
  const [series, setSeries] = useState<PriceHistorySeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const cardId = canonicalCardId(game, externalId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSeries(null);

    (async () => {
      try {
        const data = await getPriceHistory(game, externalId);
        if (cancelled) return;

        // Si no hay histórico, intentamos arrancarlo: POST /api/price-history
        // crea el primer snapshot de hoy y luego reintentamos la lectura.
        if (!data) {
          try {
            await fetch("/api/price-history", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cardId, game, externalId, cardName }),
            });
            const retry = await getPriceHistory(game, externalId);
            if (!cancelled) setSeries(retry);
          } catch {
            if (!cancelled) setSeries(null);
          }
        } else {
          setSeries(data);
        }
      } catch {
        if (!cancelled) setError("No se pudo cargar el histórico");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [game, externalId, cardId, cardName]);

  const chart = useMemo(() => {
    if (!series || series.points.length === 0) return null;
    const pts = series.points;
    const minEur = Math.min(...pts.map((p) => p.eur));
    const maxEur = Math.max(...pts.map((p) => p.eur));
    const rangeEur = maxEur - minEur || 1;
    const yMin = Math.max(0, minEur - rangeEur * 0.1);
    const yMax = maxEur + rangeEur * 0.1;
    const yRange = yMax - yMin || 1;

    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;

    const xFor = (i: number): number => {
      if (pts.length === 1) return PAD_L + innerW / 2;
      return PAD_L + (i / (pts.length - 1)) * innerW;
    };
    const yFor = (v: number): number => PAD_T + innerH - ((v - yMin) / yRange) * innerH;

    const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(p.eur).toFixed(2)}`).join(" ");
    const areaPath = `${linePath} L ${xFor(pts.length - 1).toFixed(2)} ${PAD_T + innerH} L ${xFor(0).toFixed(2)} ${PAD_T + innerH} Z`;

    // Ejes Y: 4 ticks
    const ticks = 4;
    const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
      const v = yMin + (yRange * i) / ticks;
      return { v, y: yFor(v) };
    });

    return { pts, xFor, yFor, linePath, areaPath, yTicks, yMin, yMax };
  }, [series]);

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!chart || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    if (x < PAD_L || x > W - PAD_R) { setHoverIdx(null); return; }
    const { pts } = chart;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const dx = Math.abs(chart.xFor(i) - x);
      if (dx < bestDist) { bestDist = dx; best = i; }
    }
    setHoverIdx(best);
  };
  const handleLeave = () => setHoverIdx(null);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[600px] rounded-2xl border border-white/10 bg-gradient-to-br from-amber-950/40 to-black/40 p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="h-4 w-32 animate-shimmer rounded bg-white/10" />
          <div className="h-4 w-20 animate-shimmer rounded bg-white/10" />
        </div>
        <div className="h-[160px] w-full animate-shimmer rounded bg-white/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[600px] rounded-2xl border border-white/10 bg-black/40 p-4 text-center text-xs text-white/60">
        {error}
      </div>
    );
  }

  if (!chart || !series || series.points.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[600px] rounded-2xl border border-white/10 bg-gradient-to-br from-amber-950/30 to-black/50 p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wide text-amber-300/90">PRECIO CARDMARKET · TENDENCIA</p>
            <p className="mt-1 text-xs text-white/50">Recopilando histórico. Vuelve mañana para ver la evolución.</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/40">Fuente</p>
            <p className="text-xs font-semibold text-white/70">Cardmarket</p>
          </div>
        </div>
      </div>
    );
  }

  const latest = getLatestPrice(series);
  const variation = getVariationPct(series);
  const hoveredPoint = hoverIdx !== null ? series.points[hoverIdx] : null;

  const variationColor =
    variation === null ? "text-white/60" :
    variation > 0.5 ? "text-emerald-400" :
    variation < -0.5 ? "text-rose-400" : "text-white/60";
  const VariationIcon =
    variation === null ? Minus :
    variation > 0.5 ? TrendingUp :
    variation < -0.5 ? TrendingDown : Minus;

  return (
    <div className="mx-auto w-full max-w-[600px] rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/40 via-black/60 to-black/80 p-4 shadow-2xl backdrop-blur-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/90">
            Precio Cardmarket · Tendencia
          </p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-xl font-black text-white">
              {latest !== null ? formatEur(latest) : "—"}
            </span>
            {variation !== null && (
              <span className={`flex items-center gap-0.5 text-xs font-semibold ${variationColor}`}>
                <VariationIcon size={12} />
                {variation > 0 ? "+" : ""}{variation.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-white/40">{series.points.length} {series.points.length === 1 ? "día" : "días"}</p>
          <p className="text-[10px] font-semibold text-white/70">{series.points[0].source ?? "Cardmarket"}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-[160px] w-full cursor-crosshair select-none"
          onPointerMove={handleMove}
          onPointerLeave={handleLeave}
        >
          <defs>
            <linearGradient id="priceHistoryArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(251 191 36)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="rgb(251 191 36)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="priceHistoryLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgb(252 211 77)" />
              <stop offset="100%" stopColor="rgb(251 191 36)" />
            </linearGradient>
          </defs>

          {/* Ejes Y */}
          {chart.yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={PAD_L} x2={W - PAD_R}
                y1={t.y} y2={t.y}
                stroke="rgb(255 255 255 / 0.06)"
                strokeWidth={1}
                strokeDasharray="2 4"
              />
              <text
                x={PAD_L - 6} y={t.y + 3}
                textAnchor="end"
                fontSize="9"
                fill="rgb(255 255 255 / 0.4)"
              >{t.v.toFixed(2)}€</text>
            </g>
          ))}

          {/* Área */}
          <path d={chart.areaPath} fill="url(#priceHistoryArea)" />
          {/* Línea */}
          <path
            d={chart.linePath}
            stroke="url(#priceHistoryLine)"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Puntos (marker sutil en cada snapshot) */}
          {chart.pts.map((p, i) => (
            <circle
              key={i}
              cx={chart.xFor(i)}
              cy={chart.yFor(p.eur)}
              r={hoverIdx === i ? 4 : 2}
              fill={hoverIdx === i ? "rgb(252 211 77)" : "rgb(251 191 36)"}
              stroke={hoverIdx === i ? "white" : "none"}
              strokeWidth={hoverIdx === i ? 1.5 : 0}
            />
          ))}

          {/* Hover vertical guide */}
          {hoverIdx !== null && (
            <line
              x1={chart.xFor(hoverIdx)} x2={chart.xFor(hoverIdx)}
              y1={PAD_T} y2={H - PAD_B}
              stroke="rgb(252 211 77 / 0.4)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          )}

          {/* Etiqueta fecha primer y último */}
          <text x={PAD_L} y={H - 8} fontSize="9" fill="rgb(255 255 255 / 0.4)" textAnchor="start">
            {formatDateShort(chart.pts[0].date)}
          </text>
          <text x={W - PAD_R} y={H - 8} fontSize="9" fill="rgb(255 255 255 / 0.4)" textAnchor="end">
            {formatDateShort(chart.pts[chart.pts.length - 1].date)}
          </text>
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute -top-1 rounded-lg border border-amber-500/30 bg-black/90 px-2.5 py-1.5 text-xs shadow-xl backdrop-blur-sm"
            style={{
              left: `${(chart.xFor(hoverIdx!) / W) * 100}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="text-[9px] uppercase tracking-wider text-white/50">{formatDateEs(hoveredPoint.date)}</p>
            <p className="font-bold text-amber-300">{formatEur(hoveredPoint.eur)}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="mt-2 text-center text-[9px] uppercase tracking-widest text-white/30">
        Actualizado diariamente · Tipo BCE para conversiones
      </p>
    </div>
  );
}
