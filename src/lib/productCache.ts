/**
 * Cache module-level del catálogo en server mode.
 *
 * El API sync de `productStore.ts` (`getMergedProducts()`, etc.) lo siguen
 * consumiendo decenas de componentes Client. Para no convertirlos a async,
 * cuando `NEXT_PUBLIC_BACKEND_MODE=server` mantenemos un cache en memoria que
 * se hidrata al arrancar la app (ProductsHydrator) vía `/api/products`.
 *
 * Mientras el cache esté vacío (primer paint antes de la fetch), las funciones
 * caen al fallback PRODUCTS estático para que el SSR/SSG no muestre vacío y
 * el LCP no se rompa. Una vez hidratado, las re-renderizaciones leen del
 * cache real.
 *
 * Storage: localStorage `tcgacademy_server_products_cache` (también) para que
 * el siguiente boot no parpadee con PRODUCTS estático antes del fetch.
 */

import type { LocalProduct } from "@/data/products";
import { DataHub } from "@/lib/dataHub";

const LS_KEY = "tcgacademy_server_products_cache";
const TTL_MS = 5 * 60 * 1000; // 5 minutos

let _cache: LocalProduct[] | null = null;
let _lastHydratedAt = 0;
let _inFlight: Promise<LocalProduct[]> | null = null;

/** ¿Estamos en modo server? Hot path; evita re-leer env */
function isServerMode(): boolean {
  return process.env.NEXT_PUBLIC_BACKEND_MODE === "server";
}

/** Lee del localStorage el cache previo (si existe y no ha caducado). */
function readPersisted(): LocalProduct[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: LocalProduct[] };
    if (!parsed?.data || !Array.isArray(parsed.data)) return null;
    if (Date.now() - parsed.ts > TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function persist(data: LocalProduct[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* quota / privacy mode — ignorable */
  }
}

/**
 * Devuelve el cache actual (sync). Si no hay cache, intenta leer LS persisted
 * antes de devolver null. Diseñado para `productStore.getMergedProducts()`.
 */
export function getProductCache(): LocalProduct[] | null {
  if (!isServerMode()) return null;
  if (_cache) return _cache;
  const persisted = readPersisted();
  if (persisted) {
    _cache = persisted;
    _lastHydratedAt = Date.now();
    return _cache;
  }
  return null;
}

/**
 * Lanza fetch a /api/products y guarda en cache + LS. Idempotente: si hay
 * fetch en vuelo se reusa.
 */
export async function hydrateProductCache(force = false): Promise<LocalProduct[]> {
  if (!isServerMode()) return [];
  if (!force && _cache && Date.now() - _lastHydratedAt < TTL_MS) {
    return _cache;
  }
  if (_inFlight) return _inFlight;

  _inFlight = (async () => {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (!res.ok) throw new Error(`api/products ${res.status}`);
      const json = (await res.json()) as { products: LocalProduct[] };
      _cache = Array.isArray(json.products) ? json.products : [];
      _lastHydratedAt = Date.now();
      persist(_cache);
      DataHub.emit("products");
      return _cache;
    } finally {
      _inFlight = null;
    }
  })();

  return _inFlight;
}

/** Invalida cache (útil tras alta/edición desde admin). */
export function invalidateProductCache(): void {
  _cache = null;
  _lastHydratedAt = 0;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
  }
}
