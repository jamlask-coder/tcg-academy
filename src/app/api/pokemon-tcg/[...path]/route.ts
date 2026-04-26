// /api/pokemon-tcg/[...path] — Proxy server-only para api.pokemontcg.io.
//
// Mantiene la API key (`POKEMON_TCG_API_KEY`) FUERA del bundle cliente.
// Solo permite GET y solo bajo el path `v2/...`.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const POKEMON_TCG_BASE = "https://api.pokemontcg.io";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await ctx.params;

  if (!Array.isArray(path) || path.length === 0) {
    return NextResponse.json({ error: "missing-path" }, { status: 400 });
  }
  // Solo permitimos v2/* — evita usar la proxy como tunel arbitrario.
  if (path[0] !== "v2") {
    return NextResponse.json({ error: "forbidden-path" }, { status: 403 });
  }

  const upstream = new URL(req.url);
  const target = `${POKEMON_TCG_BASE}/${path.join("/")}${upstream.search}`;

  const apiKey = process.env.POKEMON_TCG_API_KEY;
  const headers: Record<string, string> = {};
  if (apiKey) headers["X-Api-Key"] = apiKey;

  try {
    const r = await fetch(target, {
      headers,
      // Cache 1h en proxy — suficiente para sets/cards relativamente estables.
      next: { revalidate: 3600 },
    });
    const body = await r.text();
    return new NextResponse(body, {
      status: r.status,
      headers: {
        "content-type": r.headers.get("content-type") ?? "application/json",
        "cache-control": "public, max-age=300, s-maxage=3600",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "upstream-failed", detail: String(e) },
      { status: 502 },
    );
  }
}
