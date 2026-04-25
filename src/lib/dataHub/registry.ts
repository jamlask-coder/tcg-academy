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
    storageKeys: ["tcgacademy_registered", "tcgacademy_usernames", "tcgacademy_user", "tcgacademy_user_role_overrides", "tcgacademy_user_overrides", "tcgacademy_user_changelog", "tcgacademy_reset_tokens", "tcgacademy_activation_tokens", "tcga_auth_token", "tcga_session"],
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
    storageKeys: ["tcgacademy_invoices", "tcgacademy_invoices_hash", "tcgacademy_invoice_csv", "tcgacademy_invoice_lock", "tcgacademy_journal", "tcgacademy_invoice_count_watermark", "tcgacademy_invoice_number_version", "tcgacademy_fiscal_resolutions"],
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
    key: "supplierInvoices",
    description: "Libro registro de facturas RECIBIDAS (proveedores) — IVA soportado, retenciones 111/115, P&G",
    storageKeys: ["tcgacademy_supplier_invoices"],
    event: DataHubEvents.SUPPLIER_INVOICES_UPDATED,
    pii: true,
    retentionMonths: 72,
    adapter: "@/services/supplierInvoiceService",
    maturity: "stable",
    category: "fiscal",
    criticalJson: true,
    dependsOn: [],
    notes: "Alimenta Mod 303 (IVA soportado), 347 (terceros >3.005,06€), 111/115 (retenciones), Mod 200/202 (gastos deducibles). Inmutable salvo status pago.",
  },
  {
    key: "bankMovements",
    description: "Movimientos bancarios importados desde extractos — conciliación con pedidos y facturas de proveedores",
    storageKeys: ["tcgacademy_bank_movements", "tcgacademy_bank_batches"],
    event: DataHubEvents.BANK_MOVEMENTS_UPDATED,
    pii: true,
    retentionMonths: 72,
    adapter: "@/services/bankReconciliationService",
    maturity: "stable",
    category: "fiscal",
    criticalJson: true,
    dependsOn: ["orders", "supplierInvoices"],
    notes: "Importa CSV de banco. Auto-empareja por importe + concepto. Confirmación marca pedido cobrado / factura proveedor pagada.",
  },
  {
    key: "deliveryNotes",
    description: "Libro de albaranes (documentos de entrega sin VeriFactu)",
    storageKeys: ["tcgacademy_delivery_notes", "tcgacademy_delivery_note_counter"],
    event: DataHubEvents.DELIVERY_NOTES_UPDATED,
    pii: true,
    retentionMonths: 72,
    adapter: "@/services/deliveryNoteService",
    maturity: "stable",
    category: "fiscal",
    criticalJson: false,
    dependsOn: ["users"],
    notes: "Albarán != factura: no entra en cadena VeriFactu ni libro fiscal. Al convertirse a factura, queda trazado por invoiceId.",
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
    storageKeys: ["tcgacademy_consents", "tcgacademy_comm_preferences", "tcga_cookie_consent"],
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
    storageKeys: ["tcgacademy_admin_settings", "tcgacademy_demo_fiscal_dismissed", "tcgacademy_demo_pedidos_dismissed"],
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
    key: "fiscal_config",
    description: "Configuración fiscal de la empresa (alquileres, dividendos, OSS, 720, vinculadas, 202)",
    storageKeys: ["tcgacademy_fiscal_config"],
    event: DataHubEvents.FISCAL_CONFIG_UPDATED,
    pii: true,
    retentionMonths: 60,
    adapter: "@/services/fiscalConfigService",
    maturity: "stable",
    category: "fiscal",
    notes: "Datos no derivables del catálogo necesarios para auto-generar borradores de modelos 115/180, 123/193, 202, 232, 369, 720, INTRASTAT.",
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
  {
    key: "complaints",
    description: "Reclamaciones formales cliente (hoja de reclamaciones)",
    storageKeys: ["tcgacademy_complaints"],
    event: DataHubEvents.COMPLAINTS_UPDATED,
    pii: true,
    retentionMonths: 72,
    adapter: "@/services/complaintService",
    maturity: "stable",
    category: "pedidos",
    dependsOn: ["users", "orders"],
    notes: "Servicio canónico: addComplaint/updateComplaint/loadComplaints. Eventos via DataHub.emit('complaints').",
  },
  {
    key: "solicitudes",
    description: "Solicitudes B2B, vending, franquicia",
    storageKeys: ["tcgacademy_solicitudes"],
    event: DataHubEvents.SOLICITUDES_UPDATED,
    pii: true,
    retentionMonths: 24,
    adapter: "@/services/solicitudService",
    maturity: "stable",
    category: "usuarios",
    notes: "Servicio canónico: addSolicitud/updateSolicitudEstado/loadSolicitudes. Eventos via DataHub.emit('solicitudes').",
  },
  {
    key: "priceHistory",
    description: "Histórico diario de precios Cardmarket EUR por carta (snapshots {cardId,game,date,eur})",
    storageKeys: ["tcgacademy_price_history", "tcgacademy_price_history_meta", "tcgacademy_forex_eur_rates"],
    event: DataHubEvents.PRICE_HISTORY_UPDATED,
    pii: false,
    retentionMonths: 36,
    adapter: "@/services/priceHistoryService",
    maturity: "stable",
    category: "catalogo",
    criticalJson: true,
    notes: "Snapshots alimentados por cron diario POST /api/cron/price-snapshot. Magic/YGO/Pokémon vía APIs gratis; OP/DB/Riftbound/Lorcana vía TCGplayer + forex BCE. Gráfico público en lightbox de cartas destacadas.",
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
    storageKeys: ["tcgacademy_notif_dynamic", "tcgacademy_broadcasts", "tcgacademy_notifications", "tcgacademy_fiscal_notifications", "tcgacademy_fiscal_reminder_log", "tcgacademy_admin_notifs_read"],
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
    storageKeys: ["tcgacademy_app_logs", "tcgacademy_audit_log", "tcgacademy_autopilot_log", "tcgacademy_fiscal_audit_log", "tcgacademy_email_log", "tcgacademy_runtime_errors"],
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
    key: "pendingCheckout",
    description: "Checkout pendiente (carrito + dirección) para reanudar compra",
    storageKeys: ["tcgacademy_pending_checkout"],
    event: "tcga:pending_checkout:updated" as DataHubEventName,
    pii: true,
    retentionMonths: 1,
    adapter: null,
    maturity: "partial",
    category: "pedidos",
    dependsOn: ["cart", "users"],
    notes: "Persistencia de checkout parcial. Se limpia al confirmar pedido. No crítico.",
  },
  {
    key: "heroImages",
    description: "Imágenes del carrusel principal de la home",
    storageKeys: ["tcgacademy_hero_images"],
    event: DataHubEvents.HERO_IMAGES_UPDATED,
    pii: false,
    retentionMonths: 120,
    adapter: null,
    maturity: "partial",
    category: "catalogo",
    notes: "Imágenes como base64 dataURL. Admin las gestiona desde /admin/herramientas.",
  },
  {
    key: "backups",
    description: "Índice de snapshots de respaldo + timestamp del scheduler (snapshots en sí usan prefijo tcgacademy_backup_<ts>)",
    storageKeys: ["tcgacademy_backup_index", "tcgacademy_backup_scheduler_last"],
    event: "tcga:backups:updated" as DataHubEventName,
    pii: false,
    retentionMonths: 12,
    adapter: "@/services/backupService",
    maturity: "partial",
    category: "logs",
    notes: "Los snapshots individuales (tcgacademy_backup_<timestamp>) contienen PII cifrada AES-GCM y se listan via backup_index. El propio index no contiene datos personales.",
  },
  {
    key: "emailTemplates",
    description: "Plantillas de email personalizadas + configuración del remitente",
    storageKeys: ["tcgacademy_email_custom_templates", "tcgacademy_email_sender"],
    event: "tcga:email_templates:updated" as DataHubEventName,
    pii: false,
    retentionMonths: 0,
    adapter: "@/services/emailService",
    maturity: "partial",
    category: "config",
    notes: "Editables desde /admin/emails. Overrides sobre las plantillas de src/data/emailTemplates.ts.",
  },
  {
    key: "priceOverrides",
    description: "Overrides manuales de precio y stock por producto (sobreescriben PRODUCTS)",
    storageKeys: ["tcgacademy_price_overrides", "tcgacademy_stock_overrides"],
    event: "tcga:price_overrides:updated" as DataHubEventName,
    pii: false,
    retentionMonths: 24,
    adapter: null,
    maturity: "partial",
    category: "config",
    dependsOn: ["products"],
    notes: "Admin los aplica desde /admin/precios y /admin/stock. Product.price/stock efectivo = override ?? estático.",
  },
  {
    key: "discounts",
    description: "Descuentos admin-configurables (distinto de coupons: son reglas de descuento aplicables)",
    storageKeys: ["tcgacademy_discounts"],
    event: "tcga:discounts:updated" as DataHubEventName,
    pii: false,
    retentionMonths: 24,
    adapter: null,
    maturity: "partial",
    category: "config",
    notes: "Diferente de coupons: no requiere código, se aplica por regla (categoría/umbral).",
  },
  {
    key: "userActivity",
    description: "Historial de navegación/búsqueda: recientes vistos, búsquedas, pedidos recientes",
    storageKeys: ["tcgacademy_recently_viewed", "tcgacademy_search_history", "tcgacademy_recent_order_ids", "tcga_recent_searches", "tcga_admin_ia_search_history", "tcga_restock_subs"],
    event: "tcga:user_activity:updated" as DataHubEventName,
    pii: true,
    retentionMonths: 6,
    adapter: null,
    maturity: "partial",
    category: "catalogo",
    dependsOn: ["users", "products"],
    notes: "Clave canónica: tcgacademy_recently_viewed (vía recentlyViewed.ts). Las tcga_* son stubs para futuras features.",
  },
  {
    key: "systemOps",
    description: "Primitivas operacionales: anomalías, circuit breakers, dead-letter queue, locks, heal log, quarantine, storage errors, reloj fiable",
    storageKeys: [
      "tcgacademy_anomalies",
      "tcgacademy_circuits",
      "tcgacademy_dlq",
      "tcgacademy_quarantine",
      "tcgacademy_heal_log",
      "tcgacademy_storage_errors",
      "tcgacademy_autopilot_lock",
      "tcgacademy_checkout_lock",
      "tcgacademy_last_known_time",
    ],
    event: "tcga:system_ops:updated" as DataHubEventName,
    pii: false,
    retentionMonths: 6,
    adapter: "@/lib/selfHeal",
    maturity: "partial",
    category: "logs",
    notes: "Infraestructura de resiliencia (selfHeal + fiscalAutopilot). Los locks son efímeros; los logs son auditables.",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// ENTIDADES DEPRECATED — claves legacy que sobreviven por compatibilidad.
// No entran en backup ni selfHeal. Documentadas para que la detección de
// huérfanas no las reporte como "no registradas".
// ═══════════════════════════════════════════════════════════════════════════

const DEPRECATED: EntityRegistryEntry[] = [
  {
    key: "legacyPaymentStatus",
    description: "DEPRECATED: duplicaba order.paymentStatus. La SSOT de pago está dentro del propio pedido.",
    storageKeys: ["tcgacademy_payment_status"],
    event: "tcga:legacy_payment_status:updated" as DataHubEventName,
    pii: false,
    retentionMonths: 0,
    adapter: null,
    maturity: "deprecated",
    notes: "Migrar a order.paymentStatus si aparece en localStorage.",
  },
  {
    key: "legacySentEmails",
    description: "DEPRECATED: duplicaba tcgacademy_email_log. Fusionado en el entity 'logs'.",
    storageKeys: ["tcgacademy_sent_emails"],
    event: "tcga:legacy_sent_emails:updated" as DataHubEventName,
    pii: true,
    retentionMonths: 0,
    adapter: null,
    maturity: "deprecated",
    notes: "No escribir. Si existe, el selfHeal debería consolidarlo en email_log.",
  },
];

// ─── Partial (compliance & ops) ─────────────────────────────────────────────
// Brechas de seguridad (art. 33/34 RGPD) y registro local de backups servidor.

const COMPLIANCE: EntityRegistryEntry[] = [
  {
    key: "breach_incidents",
    description: "Registro de incidentes de seguridad (RGPD art. 33 — ventana 72h AEPD)",
    storageKeys: ["tcgacademy_breach_incidents"],
    event: DataHubEvents.BREACH_INCIDENTS_UPDATED,
    pii: true,
    retentionMonths: 72,
    adapter: "@/services/breachNotificationService",
    maturity: "partial",
    category: "logs",
    criticalJson: true,
    notes: "Obligatorio mantener incluso cuando no hay brechas notificables — demuestra diligencia debida.",
  },
  {
    key: "megamenu",
    description: "Overrides de columnas del mega menú por juego (categorías editables desde admin)",
    storageKeys: ["tcgacademy_megamenu_overrides"],
    event: DataHubEvents.MEGAMENU_UPDATED,
    pii: false,
    retentionMonths: 0,
    adapter: "@/lib/megaMenuOverrides",
    maturity: "partial",
    category: "config",
    notes: "Sin override → se usan los defaults de src/data/megaMenuData.ts. Afecta a Navbar y rutas /[juego]/[categoria].",
  },
  {
    key: "backups_server",
    description: "Índice local de manifiestos de backup cifrado en S3 (RGPD art. 32)",
    storageKeys: ["tcgacademy_backups_index"],
    event: DataHubEvents.BACKUPS_SERVER_UPDATED,
    pii: false,
    retentionMonths: 72,
    adapter: "@/lib/backup/backupJob",
    maturity: "partial",
    category: "logs",
    notes: "El SSOT real vive en el bucket S3; esta clave solo cachea el listado UI.",
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
  ...COMPLIANCE,
  ...STUBS,
  ...DEPRECATED,
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
