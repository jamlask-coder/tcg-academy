/**
 * Competitor stores — SSOT de las tiendas contra las que comparamos precios.
 *
 * ¿Añadir una tienda nueva?
 *  1) Añádela aquí con metadatos (id, name, domain, searchUrl).
 *  2) Crea el adapter en `src/lib/competitors/adapters/<id>.ts` exportando
 *     `search(normalizedQuery): Promise<Partial<CompetitorPrice>>`.
 *  3) Regístralo en `src/lib/competitors/adapters/index.ts`.
 *
 * ¿Quitar una tienda? Márcala `enabled: false` — así el cache existente no
 * se rompe pero se deja de consultar.
 */

export interface CompetitorStoreConfig {
  /** Identificador interno estable — NO cambiar una vez en producción. */
  id: string;
  /** Nombre visible en el UI. */
  name: string;
  /** Dominio raíz — usado para logo (favicon) y display. */
  domain: string;
  /** URL raíz con protocolo. */
  baseUrl: string;
  /** Construye la URL de búsqueda a partir de un query ya normalizado. */
  searchUrl: (normalizedQuery: string, productGame?: string) => string;
  /** Activa/desactiva el adapter sin borrarlo. */
  enabled: boolean;
  /** Timeout por defecto (ms) — algunas tiendas son más lentas. */
  timeoutMs: number;
  /** Tag visual (color tailwind) para chips/badges. */
  accent: string;
  /**
   * Si true, esta fuente es un AGREGADOR de mercado. El UI lo etiqueta como
   * "mercado" y su precio es una referencia agregada (precio más bajo de un
   * profesional), no el de una tienda concreta. Cardmarket es el único.
   */
  isAggregator?: boolean;
}

/**
 * Mapea nuestros slugs de juego al segmento de URL que usa Cardmarket.
 * Devuelve `Magic` por defecto si no lo reconocemos — el peor caso es una
 * búsqueda sobre MTG que fallará por `not_found` (no match), nunca un
 * crash del adapter.
 */
function toCardmarketGameSegment(game?: string): string {
  switch (game) {
    case "magic": return "Magic";
    case "pokemon": return "Pokemon";
    case "yugioh": return "YuGiOh";
    case "one-piece": return "OnePiece";
    case "lorcana": return "Lorcana";
    case "dragon-ball":
    case "dragonball":
      return "DragonBallSuper";
    case "digimon": return "Digimon";
    case "flesh-and-blood":
    case "fleshandblood":
      return "FleshAndBlood";
    case "riftbound": return "Riftbound";
    default: return "Magic";
  }
}

export const COMPETITOR_STORES: readonly CompetitorStoreConfig[] = [
  {
    id: "cardzone",
    name: "Cardzone",
    domain: "cardzone.es",
    baseUrl: "https://cardzone.es",
    searchUrl: (q) =>
      `https://cardzone.es/search?q=${encodeURIComponent(q)}&type=product`,
    enabled: true,
    timeoutMs: 8000,
    accent: "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    id: "battledeck",
    name: "Battledeck",
    domain: "battledeck.es",
    baseUrl: "https://www.battledeck.es",
    searchUrl: (q) =>
      `https://www.battledeck.es/buscar?controller=search&s=${encodeURIComponent(q)}`,
    enabled: true,
    timeoutMs: 9000,
    accent: "bg-red-50 text-red-700 border-red-200",
  },
  {
    id: "pokemillon",
    name: "Pokémillon",
    domain: "pokemillon.com",
    baseUrl: "https://www.pokemillon.com",
    searchUrl: (q) =>
      `https://www.pokemillon.com/?s=${encodeURIComponent(q)}&post_type=product`,
    enabled: true,
    timeoutMs: 8000,
    accent: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  {
    id: "itaca",
    name: "Ítaca",
    domain: "itaca.gg",
    baseUrl: "https://itaca.gg",
    searchUrl: (q) =>
      `https://itaca.gg/search?q=${encodeURIComponent(q)}&type=product`,
    enabled: true,
    timeoutMs: 8000,
    accent: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    id: "collectorage",
    name: "Collectorage",
    domain: "collectorage.com",
    baseUrl: "https://collectorage.com",
    // Shopify-style (detected by el path ?q=...&type=product). Si en su día
    // tienen otra plataforma, el genericAdapter resolverá vía primer link.
    searchUrl: (q) =>
      `https://collectorage.com/search?q=${encodeURIComponent(q)}&type=product`,
    enabled: true,
    timeoutMs: 8000,
    accent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "manavortex",
    name: "Manavortex",
    domain: "manavortex.es",
    baseUrl: "https://manavortex.es",
    // WooCommerce (WordPress) — pattern `?s=...&post_type=product`.
    searchUrl: (q) =>
      `https://manavortex.es/?s=${encodeURIComponent(q)}&post_type=product`,
    enabled: true,
    timeoutMs: 8000,
    accent: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    // Cardmarket es un MERCADO (agregador): cada "producto" lleva a una página
    // de ofertas de múltiples vendedores. El adapter extrae el precio más bajo
    // de un vendedor profesional (trend/from price). El segmento de juego va
    // en la ruta: /es/Magic/Products/Search?searchString=...
    id: "cardmarket",
    name: "Cardmarket",
    domain: "cardmarket.com",
    baseUrl: "https://www.cardmarket.com",
    searchUrl: (q, productGame) => {
      const seg = toCardmarketGameSegment(productGame);
      return `https://www.cardmarket.com/es/${seg}/Products/Search?searchString=${encodeURIComponent(q)}`;
    },
    enabled: true,
    timeoutMs: 10000,
    accent: "bg-purple-50 text-purple-700 border-purple-200",
    isAggregator: true,
  },
] as const;

export function getCompetitorStore(id: string): CompetitorStoreConfig | undefined {
  return COMPETITOR_STORES.find((s) => s.id === id);
}

export function listEnabledCompetitorStores(): CompetitorStoreConfig[] {
  return COMPETITOR_STORES.filter((s) => s.enabled);
}
