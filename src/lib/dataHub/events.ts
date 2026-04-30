/**
 * DataHub — Canonical events
 * ==========================
 * Fuente única de verdad para nombres de eventos.
 * Nunca hacer `window.dispatchEvent(new Event("tcga:foo:updated"))` con string
 * literal: usar `DataHubEvents.FOO_UPDATED` o `DataHub.emit("foo")`.
 *
 * Esto garantiza que cuando se renombre o deprecie un evento, TypeScript nos
 * fuerce a arreglar todas las referencias.
 */

export const DataHubEvents = {
  // Entidades core (implementadas)
  ORDERS_UPDATED: "tcga:orders:updated",
  USERS_UPDATED: "tcga:users:updated",
  PRODUCTS_UPDATED: "tcga:products:updated",
  COUPONS_UPDATED: "tcga:coupons:updated",
  POINTS_UPDATED: "tcga:points:updated",
  INCIDENTS_UPDATED: "tcga:incidents:updated",
  INVOICES_UPDATED: "tcga:invoices:updated",
  DELIVERY_NOTES_UPDATED: "tcga:delivery_notes:updated",
  RETURNS_UPDATED: "tcga:returns:updated",
  MESSAGES_UPDATED: "tcga:messages:updated",
  NOTIFICATIONS_UPDATED: "tcga:notifications:updated",
  FAVORITES_UPDATED: "tcga:favorites:updated",
  CART_UPDATED: "tcga:cart:updated",
  SUBCATEGORIES_UPDATED: "tcga:subcategories:updated",
  ASSOC_UPDATED: "tcga:assoc:updated",
  SETTINGS_UPDATED: "tcga:settings:updated",
  INVOICE_TEMPLATE_UPDATED: "tcga:invoice_template:updated",
  FISCAL_CONFIG_UPDATED: "tcga:fiscal_config:updated",
  COMPETITOR_PRICES_UPDATED: "tcga:competitor_prices:updated",
  HERO_IMAGES_UPDATED: "tcga:hero_images:updated",
  PRICE_HISTORY_UPDATED: "tcga:price_history:updated",
  BREACH_INCIDENTS_UPDATED: "tcga:breach_incidents:updated",
  BACKUPS_SERVER_UPDATED: "tcga:backups_server:updated",
  MEGAMENU_UPDATED: "tcga:megamenu:updated",
  COMPLAINTS_UPDATED: "tcga:complaints:updated",
  SOLICITUDES_UPDATED: "tcga:solicitudes:updated",
  SUPPLIER_INVOICES_UPDATED: "tcga:supplier_invoices:updated",
  BANK_MOVEMENTS_UPDATED: "tcga:bank_movements:updated",
  EVENT_SESSIONS_UPDATED: "tcga:event_sessions:updated",

  // Entidades future (stubs — listeners aún no implementados)
  AFFILIATES_UPDATED: "tcga:affiliates:updated",
  SUBSCRIPTIONS_UPDATED: "tcga:subscriptions:updated",
  WAREHOUSES_UPDATED: "tcga:warehouses:updated",
  STOCK_MOVEMENTS_UPDATED: "tcga:stock_movements:updated",
  SUPPLIERS_UPDATED: "tcga:suppliers:updated",
  TICKETS_UPDATED: "tcga:tickets:updated",
  REVIEWS_UPDATED: "tcga:reviews:updated",
  PROMOTIONS_UPDATED: "tcga:promotions:updated",
  BANNERS_UPDATED: "tcga:banners:updated",
  PAGES_UPDATED: "tcga:pages:updated",
  CURRENCIES_UPDATED: "tcga:currencies:updated",
  LANGUAGES_UPDATED: "tcga:languages:updated",

  // Telemetría
  STORAGE_ERROR: "tcga:storage:error",
  ANOMALY: "tcga:anomaly",
} as const;

export type DataHubEventName = typeof DataHubEvents[keyof typeof DataHubEvents];

/**
 * Entity key → evento canónico. Se usa en el registry para saber qué evento
 * disparar tras un write. Una sola fuente: cambia aquí, se propaga todo.
 */
export const ENTITY_EVENT: Record<string, DataHubEventName> = {
  orders: DataHubEvents.ORDERS_UPDATED,
  users: DataHubEvents.USERS_UPDATED,
  products: DataHubEvents.PRODUCTS_UPDATED,
  coupons: DataHubEvents.COUPONS_UPDATED,
  points: DataHubEvents.POINTS_UPDATED,
  incidents: DataHubEvents.INCIDENTS_UPDATED,
  invoices: DataHubEvents.INVOICES_UPDATED,
  deliveryNotes: DataHubEvents.DELIVERY_NOTES_UPDATED,
  returns: DataHubEvents.RETURNS_UPDATED,
  messages: DataHubEvents.MESSAGES_UPDATED,
  notifications: DataHubEvents.NOTIFICATIONS_UPDATED,
  favorites: DataHubEvents.FAVORITES_UPDATED,
  cart: DataHubEvents.CART_UPDATED,
  subcategories: DataHubEvents.SUBCATEGORIES_UPDATED,
  associations: DataHubEvents.ASSOC_UPDATED,
  settings: DataHubEvents.SETTINGS_UPDATED,
  invoiceTemplate: DataHubEvents.INVOICE_TEMPLATE_UPDATED,
  fiscal_config: DataHubEvents.FISCAL_CONFIG_UPDATED,
  competitorPrices: DataHubEvents.COMPETITOR_PRICES_UPDATED,
  heroImages: DataHubEvents.HERO_IMAGES_UPDATED,
  priceHistory: DataHubEvents.PRICE_HISTORY_UPDATED,
  breach_incidents: DataHubEvents.BREACH_INCIDENTS_UPDATED,
  backups_server: DataHubEvents.BACKUPS_SERVER_UPDATED,
  megamenu: DataHubEvents.MEGAMENU_UPDATED,
  complaints: DataHubEvents.COMPLAINTS_UPDATED,
  solicitudes: DataHubEvents.SOLICITUDES_UPDATED,
  supplierInvoices: DataHubEvents.SUPPLIER_INVOICES_UPDATED,
  bankMovements: DataHubEvents.BANK_MOVEMENTS_UPDATED,
  event_sessions: DataHubEvents.EVENT_SESSIONS_UPDATED,
  affiliates: DataHubEvents.AFFILIATES_UPDATED,
  subscriptions: DataHubEvents.SUBSCRIPTIONS_UPDATED,
  warehouses: DataHubEvents.WAREHOUSES_UPDATED,
  stockMovements: DataHubEvents.STOCK_MOVEMENTS_UPDATED,
  suppliers: DataHubEvents.SUPPLIERS_UPDATED,
  tickets: DataHubEvents.TICKETS_UPDATED,
  reviews: DataHubEvents.REVIEWS_UPDATED,
  promotions: DataHubEvents.PROMOTIONS_UPDATED,
  banners: DataHubEvents.BANNERS_UPDATED,
  pages: DataHubEvents.PAGES_UPDATED,
  currencies: DataHubEvents.CURRENCIES_UPDATED,
  languages: DataHubEvents.LANGUAGES_UPDATED,
};

/** Emit canónico: `DataHub.emit("orders")` en lugar de `dispatchEvent(new Event(...))`. */
export function emit(entity: keyof typeof ENTITY_EVENT | DataHubEventName): void {
  if (typeof window === "undefined") return;
  const name: string = entity in ENTITY_EVENT
    ? ENTITY_EVENT[entity as keyof typeof ENTITY_EVENT]
    : (entity as string);
  try { window.dispatchEvent(new Event(name)); } catch { /* non-fatal */ }
}

/**
 * Subscribe a una entidad. Devuelve unsubscribe.
 * Uso típico en componentes React:
 *   useEffect(() => DataHub.on("orders", reload), []);
 */
export function on(
  entity: keyof typeof ENTITY_EVENT | DataHubEventName,
  handler: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const name: string = entity in ENTITY_EVENT
    ? ENTITY_EVENT[entity as keyof typeof ENTITY_EVENT]
    : (entity as string);
  window.addEventListener(name, handler);
  // También escuchamos storage para sincronía entre tabs.
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(name, handler);
    window.removeEventListener("storage", handler);
  };
}
