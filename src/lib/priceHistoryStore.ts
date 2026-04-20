/**
 * Price history — almacén server-side.
 *
 * Modo local (default):
 *   Fichero JSON en `<repo>/data/price-history.json`. En dev funciona perfecto.
 *   En producción serverless (Vercel) el fs es efímero — activar modo server.
 *
 * Modo server (NEXT_PUBLIC_BACKEND_MODE=server):
 *   Tabla Supabase `price_history` (ver supabase/migrations/price_history.sql).
 *
 * Nadie debería llamar aquí directamente salvo los endpoints /api/price-history
 * y /api/cron/price-snapshot.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import type { PriceHistoryPoint, PriceHistorySeries } from "@/services/priceHistoryService";
import { getSupabaseAdmin } from "@/lib/supabase";

const FILE_PATH = path.join(process.cwd(), "data", "price-history.json");

interface FileStore {
  series: Record<string, PriceHistorySeries>;
  updatedAt: string;
}

const isServerMode = (): boolean => (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";

// ─── File storage (local mode) ──────────────────────────────────────────────

async function readFileStore(): Promise<FileStore> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as FileStore;
    if (!parsed.series) return { series: {}, updatedAt: new Date().toISOString() };
    return parsed;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { series: {}, updatedAt: new Date().toISOString() };
    throw err;
  }
}

async function writeFileStore(store: FileStore): Promise<void> {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

// ─── Supabase (server mode) ────────────────────────────────────────────────

async function readSupabaseSeries(cardId: string): Promise<PriceHistorySeries | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("price_history")
    .select("*")
    .eq("card_id", cardId)
    .order("date", { ascending: true });
  if (error || !data || data.length === 0) return null;
  const first = data[0] as Record<string, unknown>;
  const points: PriceHistoryPoint[] = data.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      date: String(r.date),
      eur: Number(r.eur),
      sourceCurrency: (r.source_currency as string) ?? undefined,
      source: (r.source as string) ?? undefined,
    };
  });
  return {
    cardId,
    game: String(first.game ?? ""),
    cardName: String(first.card_name ?? ""),
    points,
    updatedAt: String(first.updated_at ?? new Date().toISOString()),
  };
}

async function writeSupabasePoint(
  cardId: string,
  game: string,
  cardName: string,
  point: PriceHistoryPoint,
): Promise<void> {
  const db = getSupabaseAdmin();
  await db.from("price_history").upsert(
    {
      card_id: cardId,
      game,
      card_name: cardName,
      date: point.date,
      eur: point.eur,
      source_currency: point.sourceCurrency ?? null,
      source: point.source ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "card_id,date" },
  );
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function getSeries(cardId: string): Promise<PriceHistorySeries | null> {
  if (isServerMode()) return readSupabaseSeries(cardId);
  const store = await readFileStore();
  return store.series[cardId] ?? null;
}

/**
 * Añade 1 snapshot (1 por día max — si ya existe el día, lo sobrescribe con el
 * valor más reciente). Mantiene los últimos 36 meses (poda automática).
 */
export async function appendSnapshot(
  cardId: string,
  game: string,
  cardName: string,
  point: PriceHistoryPoint,
): Promise<void> {
  if (isServerMode()) {
    await writeSupabasePoint(cardId, game, cardName, point);
    return;
  }
  const store = await readFileStore();
  const existing = store.series[cardId];
  const nowIso = new Date().toISOString();

  const nextPoints = existing ? [...existing.points] : [];
  const dayIdx = nextPoints.findIndex((p) => p.date === point.date);
  if (dayIdx >= 0) nextPoints[dayIdx] = point;
  else nextPoints.push(point);
  nextPoints.sort((a, b) => a.date.localeCompare(b.date));

  // Poda: mantener últimos 36 meses (~1095 días).
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 36);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const pruned = nextPoints.filter((p) => p.date >= cutoffIso);

  store.series[cardId] = {
    cardId,
    game,
    cardName,
    points: pruned,
    updatedAt: nowIso,
  };
  store.updatedAt = nowIso;
  await writeFileStore(store);
}

export async function listCardIds(): Promise<string[]> {
  if (isServerMode()) {
    const db = getSupabaseAdmin();
    const { data } = await db.from("price_history").select("card_id");
    const ids = new Set<string>();
    for (const row of data ?? []) ids.add(String((row as Record<string, unknown>).card_id));
    return [...ids];
  }
  const store = await readFileStore();
  return Object.keys(store.series);
}
