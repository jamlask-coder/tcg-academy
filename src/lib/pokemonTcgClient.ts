// pokemonTcgClient.ts — Helper isomórfico para api.pokemontcg.io.
//
// Server-side: llamada directa con `POKEMON_TCG_API_KEY` (server-only).
// Client-side: redirige a /api/pokemon-tcg/* para que la API key NO se inline
// en el bundle público. La proxy añade el header `X-Api-Key`.
//
// Uso:
//   const r = await fetch(pokemonTcgUrl("sets?pageSize=250"), pokemonTcgInit({ cache: "force-cache" }));

const POKEMON_TCG_BASE = "https://api.pokemontcg.io/v2";

export function pokemonTcgUrl(pathAndQuery: string): string {
  const trimmed = pathAndQuery.replace(/^\//, "");
  if (typeof window === "undefined") {
    return `${POKEMON_TCG_BASE}/${trimmed}`;
  }
  return `/api/pokemon-tcg/${trimmed}`;
}

export function pokemonTcgInit(extra?: RequestInit): RequestInit {
  if (typeof window === "undefined") {
    const key = process.env.POKEMON_TCG_API_KEY;
    if (key) {
      return {
        ...extra,
        headers: { ...(extra?.headers ?? {}), "X-Api-Key": key },
      };
    }
    return extra ?? {};
  }
  // Cliente: la proxy server-side añade la key.
  return extra ?? {};
}

/**
 * True si hay clave Pokemon TCG configurada (server) o si estamos en cliente
 * (donde asumimos que la proxy puede o no tenerla — el caller no necesita saberlo).
 * En cliente devolvemos `true` para no bloquear flujos opcionales; el rate-limit
 * sin key (1000/día) sigue siendo suficiente para la mayoría de casos.
 */
export function hasPokemonTcgKey(): boolean {
  if (typeof window === "undefined") {
    return Boolean(process.env.POKEMON_TCG_API_KEY);
  }
  return true;
}
