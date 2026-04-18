/**
 * DataHub — Entity registry
 * =========================
 * Registro central de TODAS las entidades del sistema. Fuente única para:
 *   - localStorage keys (storageKey)
 *   - eventos canónicos (event)
 *   - retención/PII (para backupService y selfHeal)
 *   - estado de madurez (stable | partial | stub)
 *   - adapter canónico (ruta al servicio)
 *
 * REGLA DE ORO: si una entidad no está aquí, NO existe como SSOT.
 * Antes de crear una nueva clave, tabla, colección o endpoint, buscar aquí.
 *
 * Cuando se añade una nueva funcionalidad:
 *   1. Buscar si la entidad ya está registrada.
 *   2. Si sí → reutilizar su storageKey/adapter. NO crear una nueva.
 *   3. Si no → añadir entrada aquí, mover de "future" a "partial" o "stable".
 *
 * Los stubs (maturity: "stub") documentan entidades planeadas para el futuro.
 * Ya tienen evento registrado para que el día que se implementen encajen
 * directamente en la arquitectura.
 */

import { DataHubEvents, type DataHubEventName } from "./events";

export type EntityMaturity = "stable" | "partial" | "stub" | "deprecated";

/** Categoría de agrupación usada por el UI de backups y export contable. */
export type EntityCategory =
  | "usuarios"
  | "pedidos"
  | "fiscal"
  | "puntos"
  | "mensajes"
  | "consent"
  | "config"
  | "logs"
  | "catalogo";

/** Forma de una clave de respaldo derivada del registry (consumida por backupService). */
export interface BackupTrackedKey {
  key: string;
  category: EntityCategory;
  pii: boolean;
  retentionMonths: number;
  description: string;
}

export interface EntityRegistryEntry {
  /** Clave simbólica usada en `DataHub.read("orders")` etc. */
  key: string;
  /** Descripción humana de qué representa. */
  description: string;
  /** localStorage key(s). El primero es SSOT; los demás son datos derivados/audit trail. */
  storageKeys: readonly string[];
  /** Evento canónico que debe dispararse tras cualquier write. */
  event: DataHubEventName;
  /** Contiene información personal (RGPD). */
  pii: boolean;
  /** Meses de retención (0 = indefinido). 72 = 6 años (obligación fiscal). */
  retentionMonths: number;
  /** Ruta al servicio canónico (read/write). Null si aún no existe. */
  adapter: string | null;
  /** Estado de implementación. */
  maturity: EntityMaturity;
  /** Categoría para agrupar en UI (backup, export contable). Solo requerida para stable/partial. */
  category?: EntityCategory;
  /**
   * Si true, selfHeal.runSelfHealing() validará la integridad JSON de las storageKeys
   * al arrancar la app. Reservar a datos cuyo corrupción bloquea funcionalidad.
   */
  criticalJson?: boolean;
  /** Dependencias: otras entidades de las que depende. */
  dependsOn?: readonly string[];
  /** Notas sobre futuro / escalabilidad. */
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTIDADES STABLE — SSOT completa, Phase 1 consolidada
// ═══════════════════════════════════════════════════════════════════════════

const STABLE: EntityRegistryEntry[] = [
  {
    key: "orders",
    description: "Pedidos (checkout + admin inbox unificados)",
    storageKeys: ["tcgacademy_admin_orders", "tcgacademy_orders"],
    event: DataHubEvents.ORDERS_UPDATED,
    pii: true,
    retentionMonths: 72,
    adapter: "@/lib/orderAdapter",
    maturity: "stable",
    category: "pedidos",
    criticalJson: true,
    dependsOn: ["users", "products"],
  },
  {
    key: "users",
    description: "Usuarios registrados + sesión + overrides de rol",
    storageKeys: ["tcgacademy_registered", "tcgacademy_usernames", "tcgacademy_user", "tcgacademy_user_role_overrides"],
    event: DataHubEvents.USERS_UPDATED,
    pii: true,
    retentionMonths: 0,
    adapter: "@/context/AuthContext",
    maturity: "stable",
    category: "usuarios",
  },
  {
    key: "products",
    description: "Catálogo: estáticos + admin-creados + overrides + soft-delete",
    storageKeys: ["tcgacademy_new_products", "tcgacademy_product_overrides", "tcgacademy_deleted_products"],
    event: DataHubEvents.PRODUCTS_UPDATED,
    pii: false,
    retentionMonths: 0,
    adapter: "@/lib/productStore",
    maturity: "stable",
    category: "catalogo",
    criticalJson: true,
  },
  {
    key: "coupons",
    description: "Cupones admin (SSOT persistente) + cupones asignados a usuario",
    storageKeys: ["tcgacademy_admin_coupons", "tcgacademy_user_coupons", "tcgacademy_coupon_usage"],
    event: DataHubEvents.COUPONS_UPDATED,
    pii: false,
    retentionMonths: 24,
    adapter: "@/services/couponService",
    maturity: "stable",
    category: "pedidos",
    criticalJson: true,
  },
  {
    key: "points",
    description: "Saldos, historial y atribución de puntos de fidelidad",
    storageKeys: ["tcgacademy_pts", "tcgacademy_pts_history", "tcgacademy_pts_attr"],
    event: DataHubEvents.POINTS_UPDATED,
    pii: true,
    retentionMonths: 60,
    adapter: "@/services/pointsService",
    maturity: "stable",
    category: "puntos",
    criticalJson: true,
    dependsOn: ["users", "orders"],
  },
  {
    key: "incidents",
    description: "Incidencias asociadas a pedidos",
    storageKeys: ["tcgacademy_incidents"],
    event: DataHubEvents.INCIDENTS_UPDATED,
    pii: true,
    retentionMonths: 24,
    adapter: "@/services/incidentService",
    maturity: "stable",
    category: "pedidos",
    dependsOn: ["orders"],
  },
  {
    key: "invoices",
    description: "Libro de facturas VeriFactu (hash encadenado SHA-256)",
    storageKeys: ["tcgacademy_invoices", "tcgacademy_invoices_hash", "tcgacademy_invoice_csv", "tcgacademy_invoice_lock", "tcgacademy_journal"],
    event: DataHubEvents.INVOICES_UPDATED,
    pii: true,
    retentionMonths: 72,
    adapter: "@/services/invoiceService",
    maturity: "stable",
    category: "fiscal",
    criticalJson: true,
    dependsOn: ["orders", "users"],
    notes: "Inmutable: no se modifican; rectificativas solo vía createInvoice(). journal = diario contable PGC.",
  },
  {
    key: "returns",
    description: "Solicitudes RMA y reembolsos",
    storageKeys: ["tcgacademy_returns"],
    event: DataHubEvents.RETURNS_UPDATED,
    pii: true,
    retentionMonths: 72,
    adapter: "@/services/returnService",
    maturity: "stable",
    category: "pedidos",
    criticalJson: true,
    dependsOn: ["orders"],
  },
  {
    key: "cart",
    description: "Carrito del usuario (local en navegador)",
    storageKeys: ["tcga_cart"],
    event: DataHubEvents.CART_UPDATED,
    pii: false,
    retentionMonths: 0,
    adapter: "@/context/CartContext",
    maturity: "stable",
    category: "catalogo",
    criticalJson: true,
    dependsOn: ["products"],
  },
  {
    key: "favorites",
    description: "Favoritos / wishlist (dual-storage: local anónimo + User.favorites)",
    storageKeys: ["tcga_favorites"],
    event: DataHubEvents.FAVORITES_UPDATED,
    pii: false,
    retentionMonths: 0,
    adapter: "@/context/FavoritesContext",
    maturity: "stable",
    category: "catalogo",
    dependsOn: ["products", "users"],
  },
  {
    key: "subcategories",
    description: "Subcategorías editables por juego",
    storageKeys: ["tcgacademy_subcategories"],
    event: DataHubEvents.SUBCATEGORIES_UPDATED,
    pii: false,
    retentionMonths: 0,
    adapter: "@/data/subcategories",
    maturity: "stable",
    category: "catalogo",
  },
  {
    key: "associations",
    description: "Sistema de grupos (ex-asociados): invites, cooldown, refcodes",
    storageKeys: ["tcgacademy_assoc", "tcgacademy_assoc_invites", "tcgacademy_assoc_cooldown", "tcgacademy_refcodes", "tcgacademy_usercodes"],
    event: DataHubEvents.ASSOC_UPDATED,
    pii: true,
    retentionMonths: 60,
    adapter: "@/services/associationService",
    maturity: "stable",
    category: "usuarios",
    dependsOn: ["users"],
  },
  {
    key: "consents",
    description: "Consentimientos RGPD + preferencias de comunicación",
    storageKeys: ["tcgacademy_consents", "tcgacademy_comm_preferences"],
    event: DataHubEvents.SETTINGS_UPDATED,
    pii: true,
    retentionMonths: 60,
    adapter: "@/services/consentService",
    maturity: "stable",
    category: "consent",
    dependsOn: ["users"],
  },
  {
    key: "settings",
    description: "Configuración del panel admin (operacional, editable)",
    storageKeys: ["tcgacademy_admin_settings"],
    event: DataHubEvents.SETTINGS_UPDATED,
    pii: false,
    retentionMonths: 0,
    adapter: "@/services/settingsService",
    maturity: "stable",
    category: "config",
  },
  {
    key: "invoiceTemplate",
    description: "Plantilla de factura (branding + textos + toggles visuales)",
    storageKeys: ["tcgacademy_invoice_template"],
    event: DataHubEvents.INVOICE_TEMPLATE_UPDATED,
    pii: false,
    retentionMonths: 0,
    adapter: "@/lib/invoiceTemplate",
    maturity: "stable",
    category: "config",
    notes: "Config visual no fiscal — los datos del emisor siguen viniendo de SITE_CONFIG.",
  },
  {
    key: "competitorPrices",
    description: "Cache de precios del mismo producto en tiendas rivales (24h TTL)",
    storageKeys: ["tcgacademy_competitor_prices"],
    event: DataHubEvents.COMPETITOR_PRICES_UPDATED,
    pii: false,
    retentionMonths: 1,
    adapter: "@/services/competitorPriceService",
    maturity: "stable",
    category: "catalogo",
    notes: "Las tiendas consultadas están en src/config/competitorStores.ts. No incluir en backup: se regenera.",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// ENTIDADES PARTIAL — existen pero con scatter/duplicados; refactor pendiente
// ═══════════════════════════════════════════════════════════════════════════

const PARTIAL: EntityRegistryEntry[] = [
  {
    key: "messages",
    description: "Mensajes entre cliente y vendedor",
    storageKeys: ["tcgacademy_messages"],
    event: DataHubEvents.MESSAGES_UPDATED,
    pii: true,
    retentionMonths: 12,
    adapter: "@/services/messageService",
    maturity: "partial",
    category: "mensajes",
    dependsOn: ["users", "orders"],
    notes: "Pre-Phase 2 el código vivía disperso; messageService centraliza.",
  },
  {
    key: "notifications",
    description: "Notificaciones: personales por usuario + broadcasts admin",
    storageKeys: ["tcgacademy_notif_dynamic", "tcgacademy_broadcasts", "tcgacademy_notifications", "tcgacademy_fiscal_notifications"],
    event: DataHubEvents.NOTIFICATIONS_UPDATED,
    pii: true,
    retentionMonths: 12,
    adapter: "@/services/notificationService",
    maturity: "partial",
    category: "logs",
    dependsOn: ["users"],
    notes: "4 almacenes solapados. Phase 2: unificar en notif_dynamic + broadcasts.",
  },
  {
    key: "logs",
    description: "Logs técnicos + audit trail + logs fiscales + emails",
    storageKeys: ["tcgacademy_app_logs", "tcgacademy_audit_log", "tcgacademy_autopilot_log", "tcgacademy_fiscal_audit_log", "tcgacademy_email_log"],
    event: "tcga:logs:updated" as DataHubEventName,
    pii: true,
    retentionMonths: 72,
    adapter: "@/services/logService",
    maturity: "partial",
    category: "logs",
    criticalJson: true,
    notes: "tcgacademy_sent_emails era duplicado de email_log — eliminado.",
  },
  {
    key: "reviews",
    description: "Reseñas y valoraciones de productos",
    storageKeys: ["tcgacademy_reviews"],
    event: DataHubEvents.REVIEWS_UPDATED,
    pii: true,
    retentionMonths: 60,
    adapter: "@/lib/reviewService",
    maturity: "partial",
    category: "catalogo",
    dependsOn: ["products", "users", "orders"],
  },
  {
    key: "complaints",
    description: "Reclamaciones formales cliente (hoja de reclamaciones)",
    storageKeys: ["tcgacademy_complaints"],
    event: "tcga:complaints:updated" as DataHubEventName,
    pii: true,
    retentionMonths: 72,
    adapter: null,
    maturity: "partial",
    category: "pedidos",
    dependsOn: ["users", "orders"],
  },
  {
    key: "solicitudes",
    description: "Solicitudes B2B, vending, franquicia",
    storageKeys: ["tcgacademy_solicitudes"],
    event: "tcga:solicitudes:updated" as DataHubEventName,
    pii: true,
    retentionMonths: 24,
    adapter: null,
    maturity: "partial",
    category: "usuarios",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// ENTIDADES STUB — reservadas para futuro (no implementadas todavía)
// Ya tienen evento + key asignados para encajar directas cuando se construyan.
// ═══════════════════════════════════════════════════════════════════════════

const STUBS: EntityRegistryEntry[] = [
  {
    key: "affiliates",
    description: "Programa de afiliados / referidos externos",
    storageKeys: ["tcgacademy_affiliates"],
    event: DataHubEvents.AFFILIATES_UPDATED,
    pii: true,
    retentionMonths: 60,
    adapter: null,
    maturity: "stub",
    dependsOn: ["users", "orders"],
    notes: "FUTURO: reutilizar User.id como referrerId; no crear tabla paralela de usuarios.",
  },
  {
    key: "subscriptions",
    description: "Suscripciones recurrentes (mensual/anual)",
    storageKeys: ["tcgacademy_subscriptions"],
    event: DataHubEvents.SUBSCRIPTIONS_UPDATED,
    pii: true,
    retentionMonths: 72,
    adapter: null,
    maturity: "stub",
    dependsOn: ["users", "products", "orders"],
    notes: "FUTURO: una suscripción genera órdenes periódicas; reutilizar orders.",
  },
  {
    key: "warehouses",
    description: "Almacenes / ubicaciones físicas",
    storageKeys: ["tcgacademy_warehouses"],
    event: DataHubEvents.WAREHOUSES_UPDATED,
    pii: false,
    retentionMonths: 0,
    adapter: null,
    maturity: "stub",
    notes: "FUTURO: stock por almacén; LocalProduct.stock se convertiría en sum(stockMovements).",
  },
  {
    key: "stockMovements",
    description: "Entradas, salidas, traspasos, mermas — histórico completo",
    storageKeys: ["tcgacademy_stock_movements"],
    event: DataHubEvents.STOCK_MOVEMENTS_UPDATED,
    pii: false,
    retentionMonths: 72,
    adapter: null,
    maturity: "stub",
    dependsOn: ["products", "warehouses", "suppliers"],
    notes: "FUTURO: stock real = suma de movimientos. Product.stock pasaría a cache.",
  },
  {
    key: "suppliers",
    description: "Proveedores (mayoristas, distribuidores)",
    storageKeys: ["tcgacademy_suppliers"],
    event: DataHubEvents.SUPPLIERS_UPDATED,
    pii: true,
    retentionMonths: 72,
    adapter: null,
    maturity: "stub",
    notes: "FUTURO: PurchaseOrder con supplier_id; no confundir con customers.",
  },
  {
    key: "purchaseOrders",
    description: "Órdenes de compra a proveedor",
    storageKeys: ["tcgacademy_purchase_orders"],
    event: "tcga:purchase_orders:updated" as DataHubEventName,
    pii: false,
    retentionMonths: 72,
    adapter: null,
    maturity: "stub",
    dependsOn: ["suppliers", "products", "stockMovements"],
  },
  {
    key: "tickets",
    description: "Tickets de soporte (CRM interno)",
    storageKeys: ["tcgacademy_tickets"],
    event: DataHubEvents.TICKETS_UPDATED,
    pii: true,
    retentionMonths: 24,
    adapter: null,
    maturity: "stub",
    dependsOn: ["users", "orders"],
    notes: "FUTURO: reutilizar incidents como base; tickets son la generalización.",
  },
  {
    key: "promotions",
    description: "Reglas de promoción (condiciones + descuentos)",
    storageKeys: ["tcgacademy_promotions"],
    event: DataHubEvents.PROMOTIONS_UPDATED,
    pii: false,
    retentionMonths: 24,
    adapter: null,
    maturity: "stub",
    dependsOn: ["products", "coupons"],
    notes: "FUTURO: no confundir con coupons (cupón = instancia canjeable; promoción = regla).",
  },
  {
    key: "banners",
    description: "Banners, sliders y contenido visual destacado",
    storageKeys: ["tcgacademy_banners"],
    event: DataHubEvents.BANNERS_UPDATED,
    pii: false,
    retentionMonths: 0,
    adapter: null,
    maturity: "stub",
    notes: "FUTURO: CMS ligero; una fuente única de banners para home, categorías, etc.",
  },
  {
    key: "pages",
    description: "Páginas CMS, blog posts, SEO meta",
    storageKeys: ["tcgacademy_pages"],
    event: DataHubEvents.PAGES_UPDATED,
    pii: false,
    retentionMonths: 0,
    adapter: null,
    maturity: "stub",
    notes: "FUTURO: blog + páginas estáticas editables (aviso legal, cookies, etc.).",
  },
  {
    key: "languages",
    description: "Traducciones i18n",
    storageKeys: ["tcgacademy_languages"],
    event: DataHubEvents.LANGUAGES_UPDATED,
    pii: false,
    retentionMonths: 0,
    adapter: null,
    maturity: "stub",
    notes: "FUTURO: LocalProduct.language ya reservado; User.language a añadir.",
  },
  {
    key: "currencies",
    description: "Monedas y tipos de cambio",
    storageKeys: ["tcgacademy_currencies"],
    event: DataHubEvents.CURRENCIES_UPDATED,
    pii: false,
    retentionMonths: 0,
    adapter: null,
    maturity: "stub",
    notes: "FUTURO: hoy EUR hardcoded; para multicurrency añadir Currency + exchangeRate.",
  },
  {
    key: "shippingMethods",
    description: "Métodos de envío configurables (carrier, coste, plazo)",
    storageKeys: ["tcgacademy_shipping_methods"],
    event: "tcga:shipping_methods:updated" as DataHubEventName,
    pii: false,
    retentionMonths: 0,
    adapter: null,
    maturity: "stub",
    notes: "FUTURO: hoy carrier en SITE_CONFIG.carrier; mover a store editable.",
  },
  {
    key: "paymentMethods",
    description: "Métodos de pago activos (subset del enum PaymentMethod)",
    storageKeys: ["tcgacademy_payment_methods"],
    event: "tcga:payment_methods:updated" as DataHubEventName,
    pii: false,
    retentionMonths: 0,
    adapter: null,
    maturity: "stub",
    notes: "FUTURO: admin activa/desactiva; enum PaymentMethod sigue siendo la lista de posibles.",
  },
  {
    key: "stores",
    description: "Múltiples tiendas físicas (multi-store / multi-warehouse)",
    storageKeys: ["tcgacademy_stores"],
    event: "tcga:stores:updated" as DataHubEventName,
    pii: false,
    retentionMonths: 0,
    adapter: null,
    maturity: "stub",
    notes: "FUTURO: hoy es tienda única; para marketplace/franquicias reusar como tenant.",
  },
  {
    key: "sellers",
    description: "Vendedores / comerciales internos",
    storageKeys: ["tcgacademy_sellers"],
    event: "tcga:sellers:updated" as DataHubEventName,
    pii: true,
    retentionMonths: 72,
    adapter: null,
    maturity: "stub",
    dependsOn: ["users"],
    notes: "FUTURO: rol extendido de User; no duplicar personal data.",
  },
  {
    key: "integrations",
    description: "Integraciones externas (Stripe, Resend, VeriFactu provider, SMTP, etc.)",
    storageKeys: ["tcgacademy_integrations"],
    event: "tcga:integrations:updated" as DataHubEventName,
    pii: false,
    retentionMonths: 0,
    adapter: null,
    maturity: "stub",
    notes: "FUTURO: config keys + status; hoy están en .env + verifactuConfig.ts.",
  },
  {
    key: "trackingEvents",
    description: "Eventos de tracking del usuario (analytics comportamiento)",
    storageKeys: ["tcgacademy_tracking_events"],
    event: "tcga:tracking:event" as DataHubEventName,
    pii: true,
    retentionMonths: 12,
    adapter: null,
    maturity: "stub",
    notes: "FUTURO: GA4 o custom; respetar consent.",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Registry final + helpers
// ═══════════════════════════════════════════════════════════════════════════

export const ENTITIES: readonly EntityRegistryEntry[] = [
  ...STABLE,
  ...PARTIAL,
  ...STUBS,
] as const;

const BY_KEY = new Map(ENTITIES.map((e) => [e.key, e]));

export function getEntity(key: string): EntityRegistryEntry | undefined {
  return BY_KEY.get(key);
}

export function listEntities(opts?: { maturity?: EntityMaturity }): EntityRegistryEntry[] {
  return opts?.maturity
    ? ENTITIES.filter((e) => e.maturity === opts.maturity)
    : [...ENTITIES];
}

/**
 * Devuelve el mapa entityKey → storageKeys[]. Útil para:
 *  - backupService: saber qué exportar
 *  - selfHeal: validar JSON de keys
 *  - integrity: detectar keys huérfanas no registradas
 */
export function getStorageKeyMap(): Record<string, readonly string[]> {
  const map: Record<string, readonly string[]> = {};
  for (const e of ENTITIES) map[e.key] = e.storageKeys;
  return map;
}

/** Todas las keys conocidas, para comparar con `Object.keys(localStorage)`. */
export function allRegisteredKeys(): string[] {
  return ENTITIES.flatMap((e) => [...e.storageKeys]);
}

/**
 * Devuelve el catálogo de claves que deben entrar en un snapshot de backup,
 * derivado del registry. Excluye `stub` (no implementadas aún) y `deprecated`.
 *
 * La forma `BackupTrackedKey` reemplaza al antiguo array hardcodeado
 * `TRACKED_KEYS` de `src/services/backupService.ts` — ahora todo se
 * deriva de un único sitio (SSOT del registry).
 */
export function getBackupTrackedKeys(): readonly BackupTrackedKey[] {
  const out: BackupTrackedKey[] = [];
  for (const entity of ENTITIES) {
    if (entity.maturity === "stub" || entity.maturity === "deprecated") continue;
    if (!entity.category) continue; // sin categoría no entra en el backup UI
    for (const key of entity.storageKeys) {
      out.push({
        key,
        category: entity.category,
        pii: entity.pii,
        retentionMonths: entity.retentionMonths,
        description: `${entity.description} [${entity.key}]`,
      });
    }
  }
  return out;
}

/**
 * Claves localStorage cuya integridad JSON debe verificarse al arrancar la app
 * (usado por `selfHeal.runSelfHealing()`). Derivado del flag `criticalJson`
 * del registry.
 */
export function getCriticalJsonKeys(): readonly string[] {
  const out: string[] = [];
  for (const entity of ENTITIES) {
    if (!entity.criticalJson) continue;
    for (const key of entity.storageKeys) {
      out.push(key);
    }
  }
  return out;
}
