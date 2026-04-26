/**
 * POST /api/cron/price-snapshot
 *
 * Cron diario: refresca el precio de TODAS las cartas ya trackeadas.
 * Protegido con header `x-cron-secret: <CRON_SECRET>`.
 *
 * En Vercel añadir en vercel.json:
 *   { "crons": [{ "path": "/api/cron/price-snapshot", "schedule": "0 4 * * *" }] }
 * (4:00 UTC = después del cierre BCE y de que Cardmarket publique trend del día).
 *
 * En Netlify usar scheduled functions o un cron externo (cron-job.org, GitHub
 * Actions) que dispare el POST con el secret.
 */

import { NextResponse } from "next/server";
import { fetchPriceByGame } from "@/lib/priceFetchers";
import { appendSnapshot, getSeries, listCardIds } from "@/lib/priceHistoryStore";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutos — suficiente para centenares de cartas.

// Lock global de cron (audit P0 I-01).
// Si Vercel/Netlify dispara el cron 2 veces el mismo día (retries, scheduling
// duplicado) cada cara abre fetch al proveedor y race en appendSnapshot.
// Con este flag bloqueamos invocaciones concurrentes y devolvemos 409.
// Nota: vive en memoria del worker — si hay múltiples instancias podría haber
// solapamiento. Para producción robusta, mover a tabla `cron_runs(date PK)`.
let CRON_RUNNING = false;
let CRON_LAST_RUN_DATE: string | null = null;

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (CRON_RUNNING) {
    return NextResponse.json(
      { ok: false, error: "cron-already-running", date: today },
      { status: 409 },
    );
  }
  if (CRON_LAST_RUN_DATE === today) {
    return NextResponse.json(
      { ok: true, deduped: true, date: today, message: "Cron ya completado hoy" },
    );
  }
  CRON_RUNNING = true;

  const ids = await listCardIds();

  const results = {
    total: ids.length,
    snapshotted: 0,
    skipped: 0,
    failed: 0,
    alreadyToday: 0,
  };

  try {

  // Procesamos en lotes para no saturar los proveedores (250ms entre llamadas).
  for (const cardId of ids) {
    const [game, ...rest] = cardId.split(":");
    const externalId = rest.join(":");
    const series = await getSeries(cardId);
    if (!series) { results.skipped++; continue; }
    if (series.points.some((p) => p.date === today)) {
      results.alreadyToday++;
      continue;
    }

    try {
      const fetched = await fetchPriceByGame(game, externalId);
      if (!fetched) { results.skipped++; continue; }
      await appendSnapshot(cardId, game, series.cardName, {
        date: today,
        eur: fetched.eur,
        sourceCurrency: fetched.sourceCurrency,
        source: fetched.source,
      });
      results.snapshotted++;
    } catch {
      results.failed++;
    }

    // Rate-limit cortesía.
    await new Promise((r) => setTimeout(r, 250));
  }

    CRON_LAST_RUN_DATE = today;
    return NextResponse.json({ ok: true, date: today, ...results });
  } finally {
    CRON_RUNNING = false;
  }
}
