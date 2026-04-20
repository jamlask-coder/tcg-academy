// telemetry.ts — ring buffer para depurar resoluciones en runtime.
// Accesible desde DevTools: `__TCGA_HIGHLIGHTS_LOG__`.

import type { HighlightsResult } from "./types";

const MAX_ENTRIES = 500;

interface TelemetryEntry {
  ts: number;
  game: string;
  productId?: string | number;
  productName?: string;
  provenance: string;
  setId: string | null;
  cardsCount: number;
  strategyTried: string[];
  errors: string[];
  tookMs: number;
}

type GlobalWithLog = typeof globalThis & {
  __TCGA_HIGHLIGHTS_LOG__?: TelemetryEntry[];
};

function getBuffer(): TelemetryEntry[] {
  const g = globalThis as GlobalWithLog;
  if (!g.__TCGA_HIGHLIGHTS_LOG__) g.__TCGA_HIGHLIGHTS_LOG__ = [];
  return g.__TCGA_HIGHLIGHTS_LOG__;
}

export function logToTelemetry(
  result: HighlightsResult,
  context?: { productId?: string | number; productName?: string },
): void {
  const buf = getBuffer();
  buf.push({
    ts: Date.now(),
    game: result.game,
    productId: context?.productId,
    productName: context?.productName,
    provenance: result.provenance,
    setId: result.resolved?.setId ?? null,
    cardsCount: result.cards.length,
    strategyTried: [...result.strategyTried],
    errors: [...result.errors],
    tookMs: result.tookMs,
  });
  while (buf.length > MAX_ENTRIES) buf.shift();
}
