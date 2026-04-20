// fetcher.ts — fetch con timeout y abort controller.
// Evita que una API lenta bloquee el resto del flujo.

const DEFAULT_TIMEOUT_MS = 5000;

const isDev =
  typeof process !== "undefined" && process.env?.NODE_ENV !== "production";

function logFetchFailure(url: string, reason: string): void {
  if (!isDev) return;
  if (typeof window === "undefined") return;
  // eslint-disable-next-line no-console
  console.warn(`[highlights] fetch failed (${reason}): ${url}`);
}

export async function timedFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } catch (e) {
    logFetchFailure(url, String(e));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T | null> {
  const res = await timedFetch(url, init, timeoutMs);
  if (!res) return null;
  if (!res.ok) {
    logFetchFailure(url, `http ${res.status}`);
    return null;
  }
  try {
    return (await res.json()) as T;
  } catch (e) {
    logFetchFailure(url, `parse ${String(e)}`);
    return null;
  }
}
