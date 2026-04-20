/**
 * GET /api/price-history?cardId=<game>:<externalId>
 *
 * Endpoint público — devuelve el histórico de precios (EUR, fuente Cardmarket/equiv)
 * de una carta. Sin auth: cualquier visitante ve el mismo gráfico.
 *
 * POST /api/price-history
 *   body: { cardId, game, externalId, cardName }
 *
 * Captura el precio actual y lo añade como snapshot del día (1 por día max).
 * Llamado por el cliente la primera vez que se abre el lightbox de una carta
 * (arrancar histórico) y por el cron diario (refrescar las ya trackeadas).
 */

import { NextResponse } from "next/server";
import { fetchPriceByGame } from "@/lib/priceFetchers";
import { appendSnapshot, getSeries } from "@/lib/priceHistoryStore";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cardId = searchParams.get("cardId");
  if (!cardId || !cardId.includes(":")) {
    return NextResponse.json({ ok: false, error: "cardId inválido" }, { status: 400 });
  }
  const series = await getSeries(cardId);
  if (!series) return NextResponse.json({ ok: false, error: "sin histórico" }, { status: 404 });
  return NextResponse.json({ ok: true, series });
}

export async function POST(req: Request) {
  let body: { cardId?: string; game?: string; externalId?: string; cardName?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const { cardId, game, externalId, cardName } = body;
  if (!cardId || !game || !externalId || !cardName) {
    return NextResponse.json({ ok: false, error: "faltan campos" }, { status: 400 });
  }

  // ¿Ya tenemos snapshot de hoy? — evita hammering desde cliente.
  const today = new Date().toISOString().slice(0, 10);
  const existing = await getSeries(cardId);
  if (existing?.points.some((p) => p.date === today)) {
    return NextResponse.json({ ok: true, snapshotted: false, reason: "already today" });
  }

  const fetched = await fetchPriceByGame(game, externalId);
  if (!fetched) {
    return NextResponse.json({ ok: true, snapshotted: false, reason: "no price available" });
  }
  await appendSnapshot(cardId, game, cardName, {
    date: today,
    eur: fetched.eur,
    sourceCurrency: fetched.sourceCurrency,
    source: fetched.source,
  });
  return NextResponse.json({ ok: true, snapshotted: true, eur: fetched.eur });
}
