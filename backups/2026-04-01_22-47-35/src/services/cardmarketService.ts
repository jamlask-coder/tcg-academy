// Cardmarket API — https://www.cardmarket.com/en/Magic/Help/API-Documentation
//
// Cardmarket uses OAuth 1.0a. Keys are needed for ALL requests.
// Get credentials at: https://www.cardmarket.com/en/Magic/Account/API
//
// CURRENT STATE: Mock provider using free APIs as price source.
// FUTURE: Replace MockCardmarketProvider with RealCardmarketProvider once credentials
//         are available (see src/config/apiKeys.ts).

import type { ExternalCardData } from "@/types/card";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface CardmarketProduct {
  idProduct: number;
  name: string;
  game: string;
  imageUrl?: string;
  minPrice?: number;   // lowest available listing price (EUR)
  trendPrice?: number; // 30-day price trend (EUR)
  avgPrice?: number;   // 7-day average price (EUR)
  foilAvailable?: boolean;
}

export interface CardmarketProvider {
  /** Search for a card by name and optional game. */
  findProduct(name: string, game?: string): Promise<CardmarketProduct | null>;
  /** Get current price data for a product by its Cardmarket product ID. */
  getPrice(idProduct: number): Promise<Pick<CardmarketProduct, "minPrice" | "trendPrice" | "avgPrice"> | null>;
}

// ─── Mock provider ─────────────────────────────────────────────────────────────
// Uses ExternalCardData.marketPrice from free APIs (Scryfall EUR, YGOProDeck cardmarket_price)
// as a stand-in for real Cardmarket prices.

export class MockCardmarketProvider implements CardmarketProvider {
  async findProduct(name: string, _game?: string): Promise<CardmarketProduct | null> {
    // In mock mode we return a skeleton with the name only.
    // Price data comes from getPrice().
    return {
      idProduct: 0,
      name,
      game: _game ?? "unknown",
    };
  }

  async getPrice(
    _idProduct: number,
  ): Promise<Pick<CardmarketProduct, "minPrice" | "trendPrice" | "avgPrice"> | null> {
    // No real data available without credentials — return null.
    return null;
  }
}

// ─── Real provider stub ────────────────────────────────────────────────────────
// Uncomment and complete when OAuth credentials are available.
//
// import OAuth from "oauth-1.0a"; // npm install oauth-1.0a
// import { API_KEYS } from "@/config/apiKeys";
//
// export class RealCardmarketProvider implements CardmarketProvider {
//   private oauth: OAuth;
//   private BASE = "https://api.cardmarket.com/ws/v2.0/output.json";
//
//   constructor() {
//     this.oauth = new OAuth({
//       consumer: { key: API_KEYS.cardmarket.appToken, secret: API_KEYS.cardmarket.appSecret },
//       signature_method: "HMAC-SHA1",
//     });
//   }
//
//   async findProduct(name: string, game = "magic"): Promise<CardmarketProduct | null> {
//     const token = { key: API_KEYS.cardmarket.accessToken, secret: API_KEYS.cardmarket.accessSecret };
//     const url = `${this.BASE}/products/find?search=${encodeURIComponent(name)}&idGame=${gameToId(game)}`;
//     const headers = this.oauth.toHeader(this.oauth.authorize({ url, method: "GET" }, token));
//     const res = await fetch(url, { headers: headers as HeadersInit });
//     if (!res.ok) return null;
//     const json = await res.json();
//     // Map json.product[0] → CardmarketProduct
//     ...
//   }
// }

// ─── Singleton ────────────────────────────────────────────────────────────────

let _provider: CardmarketProvider | null = null;

export function getCardmarketProvider(): CardmarketProvider {
  if (!_provider) _provider = new MockCardmarketProvider();
  return _provider;
}

/**
 * Extract a market price from ExternalCardData (free APIs already include it).
 * Returns EUR price when available, otherwise undefined.
 */
export function extractMarketPrice(card: ExternalCardData): number | undefined {
  return card.marketPrice;
}
