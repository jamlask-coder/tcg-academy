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

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const ids = await listCardIds();

  const results = {
    total: ids.length,
    snapshotted: 0,
    skipped: 0,
    failed: 0,
    alreadyToday: 0,
  };

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

  return NextResponse.json({ ok: true, date: today, ...results });
}
