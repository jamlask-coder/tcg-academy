/**
 * POST /api/competitor-prices
 *
 * Orquesta consultas paralelas a las tiendas competidoras. Server-side
 * obligatorio: navegar las webs directamente desde el cliente falla por
 * CORS y además expondría nuestra IP de usuario.
 *
 * Body: CompetitorPricesRequest
 * Resp: CompetitorPricesResponse
 */

import { NextResponse } from "next/server";
import {
  listEnabledCompetitorStores,
  getCompetitorStore,
} from "@/config/competitorStores";
import { normalizeProductName } from "@/lib/competitors/nameNormalize";
import { getAdapter } from "@/lib/competitors/adapters";
import type { AdapterContext } from "@/lib/competitors/adapters/types";
import type {
  CompetitorPrice,
  CompetitorPricesRequest,
  CompetitorPricesResponse,
  CompetitorPriceSnapshot,
} from "@/types/competitorPrice";

export const runtime = "nodejs";
// Sin caché en Next — nuestro cache se hace client-side (24h TTL) para
// evitar consultas repetidas en el mismo navegador.
export const dynamic = "force-dynamic";

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function fetchHtml(url: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": DEFAULT_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
      },
      // `redirect: follow` es el default; Next 15 lo respeta.
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const text = await res.text();
    // Defensa: algunas webs devuelven 200 con HTML de bloqueo Cloudflare.
    if (/just a moment|cloudflare|enable javascript/i.test(text) && text.length < 6000) {
      throw new Error("Bloqueado por protección anti-bot.");
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request): Promise<Response> {
  let body: CompetitorPricesRequest;
  try {
    body = (await req.json()) as CompetitorPricesRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido" },
      { status: 400 },
    );
  }

  if (!body?.productName || typeof body.productName !== "string") {
    return NextResponse.json(
      { ok: false, error: "productName requerido" },
      { status: 400 },
    );
  }
  if (typeof body.productId !== "number") {
    return NextResponse.json(
      { ok: false, error: "productId requerido" },
      { status: 400 },
    );
  }

  const query = normalizeProductName(body.productName);
  const stores = body.storeIds?.length
    ? body.storeIds.map(getCompetitorStore).filter((s): s is NonNullable<typeof s> => Boolean(s && s.enabled))
    : listEnabledCompetitorStores();

  const ctx: AdapterContext = {
    fetchHtml,
    productGame: typeof body.productGame === "string" ? body.productGame : undefined,
  };
  const nowIso = new Date().toISOString();

  const results = await Promise.all(
    stores.map(async (store): Promise<CompetitorPrice> => {
      const adapter = getAdapter(store.id);
      const fallbackUrl = store.searchUrl(query.primary, ctx.productGame);
      if (!adapter) {
        return {
          storeId: store.id,
          storeName: store.name,
          domain: store.domain,
          price: null,
          url: fallbackUrl,
          status: "disabled",
          checkedAt: nowIso,
        };
      }
      try {
        const r = await adapter.search(query, ctx);
        return {
          storeId: store.id,
          storeName: store.name,
          domain: store.domain,
          price: r.price,
          url: r.url || fallbackUrl,
          matchedTitle: r.matchedTitle,
          inStock: r.inStock,
          status: r.status,
          errorMessage: r.errorMessage,
          checkedAt: nowIso,
        };
      } catch (e) {
        return {
          storeId: store.id,
          storeName: store.name,
          domain: store.domain,
          price: null,
          url: fallbackUrl,
          status: "network_error",
          errorMessage: e instanceof Error ? e.message : "Fallo desconocido",
          checkedAt: nowIso,
        };
      }
    }),
  );

  const snapshot: CompetitorPriceSnapshot = {
    productId: body.productId,
    query: query.primary,
    prices: results,
    lastUpdate: nowIso,
  };

  const errorCount = results.filter(
    (r) => r.status === "network_error" || r.status === "parse_error",
  ).length;

  const payload: CompetitorPricesResponse = {
    ok: true,
    snapshot,
    errorCount,
  };

  return NextResponse.json(payload);
}
