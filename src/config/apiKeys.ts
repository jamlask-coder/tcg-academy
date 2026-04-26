// ─── API Keys placeholder ──────────────────────────────────────────────────────
// Free TCG APIs (no key required):
//   • Pokemon TCG API  https://api.pokemontcg.io/v2   — 1000 req/day without key
//   • Scryfall         https://api.scryfall.com        — free, 50–100 ms between requests
//   • YGOProDeck       https://db.ygoprodeck.com/api   — free, no key
//
// Paid / OAuth APIs (keys required — fill in when ready):
//   • Cardmarket       https://www.cardmarket.com/en/Magic/Help/API-Documentation
//     OAuth 1.0a — requires App Token + App Secret + Access Token + Access Secret

export const API_KEYS = {
  /**
   * Cardmarket OAuth 1.0a credentials.
   * ⚠️ SERVER-ONLY. Nunca uses estas credenciales en código "use client".
   * Si necesitas consultarlas desde el browser, crea un proxy en /api/cardmarket/*.
   * Obtain at https://www.cardmarket.com/en/Magic/Account/API
   */
  cardmarket: {
    appToken: process.env.MKM_APP_TOKEN ?? "",
    appSecret: process.env.MKM_APP_SECRET ?? "",
    accessToken: process.env.MKM_ACCESS_TOKEN ?? "",
    accessSecret: process.env.MKM_ACCESS_SECRET ?? "",
  },

  /**
   * Pokemon TCG API key (optional — raises rate limit from 1000 to 20 000 req/day).
   * ⚠️ SERVER-ONLY. Lectura directa solo desde código que corra en server (cron,
   * route handlers). Desde código cliente, usa la proxy `/api/pokemon-tcg/*`
   * vía `pokemonTcgUrl()` / `pokemonTcgInit()` (`@/lib/pokemonTcgClient`).
   * Obtain at https://dev.pokemontcg.io/
   */
  pokemonTcg: process.env.POKEMON_TCG_API_KEY ?? "",
} as const;
