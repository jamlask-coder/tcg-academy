/**
 * Competitor price — tipos SSOT.
 *
 * Representa lo que cuestan NUESTROS productos en otras tiendas de TCG.
 * Se usa en /admin/precios para mostrar rango + enlaces de comparación,
 * y en el futuro podrá alimentar alertas ("nuestra tienda más cara que X").
 */

/** Estado de cada consulta a una tienda competidora. */
export type CompetitorLookupStatus =
  | "ok"            // precio extraído correctamente
  | "not_found"     // producto no localizado en esa tienda (vivencia normal)
  | "parse_error"   // HTML recibido pero sin patrón de precio reconocible
  | "network_error" // fallo de red / timeout / bloqueo anti-bot
  | "disabled";     // adapter desactivado manualmente

/** Resultado por tienda (una fila en la tabla del modal). */
export interface CompetitorPrice {
  /** ID de la tienda (p.ej. "cardzone"). Coincide con CompetitorStore.id. */
  storeId: string;
  /** Nombre visible. */
  storeName: string;
  /** Dominio para logo/favicon. */
  domain: string;
  /** Precio detectado (€). null si no se pudo obtener. */
  price: number | null;
  /** ¿El producto aparece en stock? Si no se puede determinar, undefined. */
  inStock?: boolean;
  /** URL directa al producto (si se localizó) o URL de búsqueda como fallback. */
  url: string;
  /** Título del producto remoto (si se extrajo) — útil para validar match. */
  matchedTitle?: string;
  /** Estado del lookup — el UI decide cómo mostrarlo. */
  status: CompetitorLookupStatus;
  /** Mensaje humano en caso de error. */
  errorMessage?: string;
  /** Timestamp ISO de cuándo se recolectó. */
  checkedAt: string;
}

/** Snapshot cacheable por producto. */
export interface CompetitorPriceSnapshot {
  productId: number;
  /** Query usada (tras normalizar). */
  query: string;
  prices: CompetitorPrice[];
  /** Timestamp ISO del lookup más reciente. */
  lastUpdate: string;
}

/** Rango para la columna compacta en la tabla de precios. */
export interface CompetitorPriceRange {
  min: number | null;
  max: number | null;
  /** Cuántas tiendas respondieron con precio (<= 4). */
  hits: number;
  /** Cuántas tiendas consultadas en total. */
  total: number;
}

/** Petición al endpoint /api/competitor-prices. */
export interface CompetitorPricesRequest {
  productId: number;
  productName: string;
  /** Imagen del producto — para búsqueda inversa (Phase 2). */
  productImage?: string;
  /**
   * Slug del juego (magic, pokemon, yugioh, one-piece, lorcana, dragon-ball, ...).
   * Disponible para adapters que quieran segmentar búsqueda por catálogo.
   */
  productGame?: string;
  /** Lista de storeIds a consultar (opcional; default = todos). */
  storeIds?: string[];
}

export interface CompetitorPricesResponse {
  ok: boolean;
  snapshot: CompetitorPriceSnapshot;
  /** Cuántas tiendas devolvieron error; 0 = todo OK. */
  errorCount: number;
}
