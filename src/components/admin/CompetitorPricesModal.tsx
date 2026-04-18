"use client";

/**
 * Modal de comparativa de precios en tiendas rivales.
 *
 * Ciclo de vida:
 *  - Al abrir: intenta servir la cache fresca (<24h); si no existe o está
 *    stale, llama a /api/competitor-prices.
 *  - Mientras carga, muestra skeletons por tienda.
 *  - Tras cargar, lista cada tienda con su precio / estado / link.
 *  - Botón "Actualizar ahora" fuerza refetch ignorando TTL.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Search as SearchIcon,
  Circle,
  CheckCircle2,
} from "lucide-react";
import {
  getCachedSnapshot,
  getOrRefresh,
  refreshCompetitorPrices,
} from "@/services/competitorPriceService";
import type { CompetitorPrice, CompetitorPriceSnapshot } from "@/types/competitorPrice";
import { formatDateTime } from "@/lib/format";
import { COMPETITOR_STORES } from "@/config/competitorStores";

interface Props {
  productId: number;
  productName: string;
  productImage?: string;
  /** Slug del juego (magic, pokemon, ...). Disponible para adapters que lo necesiten. */
  productGame?: string;
  /** Precio propio PV Público — para comparar. */
  ourPrice: number;
  onClose: () => void;
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function statusLabel(s: CompetitorPrice["status"]): { label: string; tone: string } {
  switch (s) {
    case "ok":
      return { label: "OK", tone: "text-emerald-600" };
    case "not_found":
      return { label: "No listado", tone: "text-gray-400" };
    case "parse_error":
      return { label: "Web sin precio legible", tone: "text-amber-600" };
    case "network_error":
      return { label: "Sin respuesta", tone: "text-red-500" };
    case "disabled":
      return { label: "Desactivado", tone: "text-gray-400" };
  }
}

export default function CompetitorPricesModal({
  productId,
  productName,
  productImage,
  productGame,
  ourPrice,
  onClose,
}: Props) {
  const [snapshot, setSnapshot] = useState<CompetitorPriceSnapshot | null>(() =>
    getCachedSnapshot(productId),
  );
  const [loading, setLoading] = useState(!snapshot);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (force: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const snap = force
          ? await refreshCompetitorPrices(productId, productName, { productImage, productGame })
          : await getOrRefresh(productId, productName, { productImage, productGame });
        setSnapshot(snap);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido.");
      } finally {
        setLoading(false);
      }
    },
    [productId, productName, productImage, productGame],
  );

  useEffect(() => {
    // Al abrir, si no hay cache intenta cargar. Si hay cache mostrada, sólo
    // hace refresh si está stale (getOrRefresh maneja TTL internamente).
    void load(false);
  }, [load]);

  const rows = useMemo(() => {
    // Alinear resultados con el orden de COMPETITOR_STORES para consistencia.
    const map = new Map<string, CompetitorPrice>();
    for (const p of snapshot?.prices ?? []) map.set(p.storeId, p);
    return COMPETITOR_STORES.map((s) => ({
      store: s,
      price: map.get(s.id),
    }));
  }, [snapshot]);

  const cheapest = useMemo(() => {
    const ps = (snapshot?.prices ?? [])
      .filter((p) => typeof p.price === "number" && p.price > 0)
      .map((p) => p.price as number);
    return ps.length ? Math.min(...ps) : null;
  }, [snapshot]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-gray-900">
              Comparativa de precios
            </h3>
            <p className="mt-0.5 truncate text-xs text-gray-500">{productName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 font-semibold text-[#2563eb]">
                Nuestro PV: {formatMoney(ourPrice)}
              </span>
              {cheapest !== null && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold ${
                    cheapest < ourPrice
                      ? "bg-red-50 text-red-600"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {cheapest < ourPrice ? "Rival más barato: " : "Mercado desde: "}
                  {formatMoney(cheapest)}
                </span>
              )}
              {snapshot?.lastUpdate && (
                <span className="text-gray-400">
                  Actualizado {formatDateTime(snapshot.lastUpdate)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex-shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">No se pudo consultar.</p>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-gray-500">
                  <th className="px-3 py-2 font-semibold">Tienda</th>
                  <th className="px-3 py-2 text-right font-semibold">Precio</th>
                  <th className="px-3 py-2 text-right font-semibold">vs. nuestro</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                  <th className="px-3 py-2 text-right font-semibold">Ver</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ store, price }) => {
                  if (loading && !price) {
                    return (
                      <tr key={store.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 animate-pulse rounded-full bg-gray-200" />
                            <span className="text-gray-500">{store.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="ml-auto h-3 w-16 animate-pulse rounded bg-gray-200" />
                        </td>
                        <td className="px-3 py-3" />
                        <td className="px-3 py-3">
                          <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                        </td>
                        <td className="px-3 py-3" />
                      </tr>
                    );
                  }

                  const st = price ? statusLabel(price.status) : { label: "—", tone: "text-gray-300" };
                  const diff =
                    price?.price && ourPrice > 0 ? price.price - ourPrice : null;
                  const diffPct =
                    price?.price && ourPrice > 0
                      ? ((price.price - ourPrice) / ourPrice) * 100
                      : null;

                  return (
                    <tr
                      key={store.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60"
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${store.domain}&sz=32`}
                            alt=""
                            loading="lazy"
                            className="h-6 w-6 flex-shrink-0 rounded"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate font-semibold text-gray-800">
                                {store.name}
                              </p>
                              {store.isAggregator && (
                                <span
                                  className="inline-flex items-center rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-700"
                                  title="Agregador europeo: ya incluye ofertas de cientos de tiendas"
                                >
                                  Mercado
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[10px] text-gray-400">
                              {store.domain}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {price?.price ? (
                          <span className="font-bold text-gray-800">
                            {formatMoney(price.price)}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {diff !== null && diffPct !== null ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                              diff < 0
                                ? "bg-red-50 text-red-600"
                                : diff > 0
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-gray-50 text-gray-500"
                            }`}
                          >
                            {diff > 0 ? "+" : ""}
                            {formatMoney(diff)} ({diffPct > 0 ? "+" : ""}
                            {diffPct.toFixed(1)}%)
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 ${st.tone}`}>
                          {price?.status === "ok" ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <Circle size={12} />
                          )}
                          {st.label}
                        </span>
                        {price?.matchedTitle && (
                          <p
                            className="mt-0.5 max-w-[240px] truncate text-[10px] text-gray-400"
                            title={price.matchedTitle}
                          >
                            {price.matchedTitle}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {price?.url ? (
                          <a
                            href={price.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-[#2563eb] transition hover:bg-blue-50"
                          >
                            {price.status === "ok" ? (
                              <ExternalLink size={11} />
                            ) : (
                              <SearchIcon size={11} />
                            )}
                            {price.status === "ok" ? "Abrir" : "Buscar"}
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[11px] text-gray-400">
            Los precios se extraen automáticamente del HTML público de cada
            tienda y se cachean 24h. Si una web cambia su estructura o bloquea
            nuestro user-agent, aparecerá como «Sin respuesta» — haz clic en
            Buscar para abrirla a mano.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-3">
          <span className="text-[11px] text-gray-400">
            Fuentes: {COMPETITOR_STORES.map((s) => s.name).join(" · ")}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Cerrar
            </button>
            <button
              onClick={() => void load(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#3b82f6] disabled:opacity-60"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              {loading ? "Consultando..." : "Actualizar ahora"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
