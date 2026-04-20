/**
 * Forex — conversión USD → EUR vía frankfurter.app (tipo oficial BCE).
 *
 * Cache 24h: el BCE publica tipos una vez al día (días laborables, sobre las 16:00 CET).
 * Consultar más no tiene sentido. Si la llamada falla, devolvemos la última tasa conocida
 * cacheada (fallback resiliente) — nunca inventamos un valor.
 *
 * Sin key, sin registro.
 */

const CACHE_KEY_CLIENT = "tcgacademy_forex_eur_rates";
const TTL_MS = 24 * 60 * 60 * 1000;

interface RateCache {
  rates: Record<string, number>;
  fetchedAt: string;
}

// Módulo-scope cache para entornos server (API routes) donde no hay localStorage.
let serverCache: RateCache | null = null;

function readClientCache(): RateCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY_CLIENT);
    return raw ? (JSON.parse(raw) as RateCache) : null;
  } catch {
    return null;
  }
}

function writeClientCache(cache: RateCache): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY_CLIENT, JSON.stringify(cache));
  } catch { /* quota exceeded: silenciar */ }
}

function isFresh(cache: RateCache | null): boolean {
  if (!cache) return false;
  const t = Date.parse(cache.fetchedAt);
  if (!isFinite(t)) return false;
  return Date.now() - t < TTL_MS;
}

/**
 * Devuelve cuántos EUR equivalen a 1 unidad de `from`.
 * Ej: await getEurRate("USD") → 0.92 (1 USD ≈ 0.92 EUR).
 *
 * Acepta ["USD", "GBP", "JPY", ...] — cualquier moneda que frankfurter/BCE publique.
 */
export async function getEurRate(from: string): Promise<number | null> {
  const code = from.toUpperCase();
  if (code === "EUR") return 1;

  const cached = typeof window === "undefined" ? serverCache : readClientCache();
  if (isFresh(cached) && cached!.rates[code] != null) {
    return cached!.rates[code];
  }

  try {
    // Frankfurter: base=EUR, symbols=USD → { rates: { USD: 1.08 } }
    // Necesitamos la inversa: 1 USD → 0.92 EUR = 1 / 1.08
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=EUR&to=${encodeURIComponent(code)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) throw new Error(`frankfurter ${res.status}`);
    const data = (await res.json()) as { rates?: Record<string, number> };
    const eurPerUnit = data.rates?.[code];
    if (typeof eurPerUnit !== "number" || eurPerUnit <= 0) throw new Error("rate inválida");
    const rate = 1 / eurPerUnit;

    const prev = cached?.rates ?? {};
    const fresh: RateCache = {
      rates: { ...prev, [code]: rate },
      fetchedAt: new Date().toISOString(),
    };
    if (typeof window === "undefined") serverCache = fresh;
    else writeClientCache(fresh);
    return rate;
  } catch {
    // Fallback: si había tasa previa conocida (aunque stale), usarla.
    return cached?.rates[code] ?? null;
  }
}

/** Conversión puntual: `amountUsd * rate`. Devuelve `null` si no hay tasa disponible. */
export async function convertToEur(amount: number, from: string): Promise<number | null> {
  const rate = await getEurRate(from);
  if (rate === null) return null;
  return Math.round(amount * rate * 100) / 100;
}
