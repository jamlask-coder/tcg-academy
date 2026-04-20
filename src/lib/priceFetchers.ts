/**
 * Price fetchers — adaptadores por juego.
 *
 * Cada adaptador toma un `externalId` (el ID que usa la API del proveedor)
 * y devuelve el precio Cardmarket trend (profesional) en EUR, o null si no
 * está disponible (sin inventar datos).
 *
 * - Magic   → Scryfall `prices.eur` (ya en EUR, origen Cardmarket).
 * - YGO     → ygoprodeck `cardmarket_price` (EUR, origen Cardmarket).
 * - Pokémon → pokemontcg.io `cardmarket.prices.trendPrice` (EUR).
 * - Lorcana, One Piece, Dragon Ball, Riftbound → TCGplayer (USD) + conversión BCE.
 *
 * Si TCGPLAYER_PUBLIC_KEY/PRIVATE_KEY no están configuradas en .env.local,
 * los 4 últimos devuelven null — el chart se ocultará en esos juegos hasta
 * que se añadan credenciales.
 */

import { convertToEur } from "@/lib/forex";

export interface FetchedPrice {
  eur: number;
  sourceCurrency: string;
  source: string;
}

// ─── Magic (Scryfall) ────────────────────────────────────────────────────────

export async function fetchMagicPrice(scryfallId: string): Promise<FetchedPrice | null> {
  try {
    const res = await fetch(`https://api.scryfall.com/cards/${encodeURIComponent(scryfallId)}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { prices?: { eur?: string | null } };
    const raw = data.prices?.eur;
    if (!raw) return null;
    const eur = parseFloat(raw);
    if (!isFinite(eur) || eur <= 0) return null;
    return { eur, sourceCurrency: "EUR", source: "scryfall" };
  } catch {
    return null;
  }
}

// ─── Yu-Gi-Oh (ygoprodeck) ──────────────────────────────────────────────────

export async function fetchYugiohPrice(ygoId: string | number): Promise<FetchedPrice | null> {
  try {
    const res = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${encodeURIComponent(String(ygoId))}`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: Array<{ card_prices?: Array<{ cardmarket_price?: string }> }>;
    };
    const raw = json.data?.[0]?.card_prices?.[0]?.cardmarket_price;
    if (!raw) return null;
    const eur = parseFloat(raw);
    if (!isFinite(eur) || eur <= 0) return null;
    return { eur, sourceCurrency: "EUR", source: "ygoprodeck" };
  } catch {
    return null;
  }
}

// ─── Pokémon (pokemontcg.io) ────────────────────────────────────────────────

export async function fetchPokemonPrice(ptcgId: string): Promise<FetchedPrice | null> {
  try {
    const apiKey = process.env.POKEMON_TCG_API_KEY;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (apiKey) headers["X-Api-Key"] = apiKey;
    const res = await fetch(
      `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(ptcgId)}`,
      { headers },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { cardmarket?: { prices?: { trendPrice?: number } } };
    };
    const trend = json.data?.cardmarket?.prices?.trendPrice;
    if (typeof trend !== "number" || trend <= 0) return null;
    return { eur: trend, sourceCurrency: "EUR", source: "pokemontcg" };
  } catch {
    return null;
  }
}

// ─── TCGplayer (One Piece, Dragon Ball, Riftbound, Lorcana) ─────────────────

interface TcgPlayerToken {
  access_token: string;
  expires_at: number; // epoch ms
}

let tcgPlayerToken: TcgPlayerToken | null = null;

async function getTcgPlayerToken(): Promise<string | null> {
  const pub = process.env.TCGPLAYER_PUBLIC_KEY;
  const priv = process.env.TCGPLAYER_PRIVATE_KEY;
  if (!pub || !priv) return null;

  if (tcgPlayerToken && tcgPlayerToken.expires_at > Date.now() + 60_000) {
    return tcgPlayerToken.access_token;
  }

  try {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: pub,
      client_secret: priv,
    });
    const res = await fetch("https://api.tcgplayer.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;
    tcgPlayerToken = {
      access_token: json.access_token,
      expires_at: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
    return json.access_token;
  } catch {
    return null;
  }
}

/**
 * Precio TCGplayer para un productId (el ID numérico de TCGplayer).
 * Usa el "market price" que es el equivalente a Cardmarket trend.
 * Convierte USD → EUR vía frankfurter (BCE).
 */
export async function fetchTcgPlayerPrice(productId: string | number): Promise<FetchedPrice | null> {
  const token = await getTcgPlayerToken();
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.tcgplayer.com/pricing/product/${encodeURIComponent(String(productId))}`,
      { headers: { Authorization: `bearer ${token}`, Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      results?: Array<{ marketPrice?: number | null; subTypeName?: string }>;
    };
    // Preferimos el subtype "Normal"/"Foil" con marketPrice válido; si hay varios, usamos el primero válido.
    const candidate = (json.results ?? []).find(
      (r) => typeof r.marketPrice === "number" && r.marketPrice > 0,
    );
    const usd = candidate?.marketPrice;
    if (typeof usd !== "number" || usd <= 0) return null;
    const eur = await convertToEur(usd, "USD");
    if (eur === null) return null;
    return { eur, sourceCurrency: "USD", source: "tcgplayer" };
  } catch {
    return null;
  }
}

// ─── Dispatcher por juego ────────────────────────────────────────────────────

export async function fetchPriceByGame(
  game: string,
  externalId: string,
): Promise<FetchedPrice | null> {
  switch (game) {
    case "magic":       return fetchMagicPrice(externalId);
    case "yugioh":      return fetchYugiohPrice(externalId);
    case "pokemon":     return fetchPokemonPrice(externalId);
    case "one-piece":
    case "dragon-ball":
    case "riftbound":
    case "lorcana":
      return fetchTcgPlayerPrice(externalId);
    default:
      return null;
  }
}
