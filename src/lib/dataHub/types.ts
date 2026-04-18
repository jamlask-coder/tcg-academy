/**
 * DataHub — Type index
 * ====================
 * Índice central de tipos por entidad. Reexporta los tipos canónicos y
 * añade stubs para entidades futuras (afiliados, suscripciones, almacenes,
 * movimientos de stock, proveedores, tickets, banners, CMS, i18n, multi-
 * currency, multi-store, sellers, integraciones, tracking).
 *
 * REGLA: antes de crear un `interface Foo` nuevo, comprobar si ya está aquí.
 * Si existe → reutilizar. Si no → añadir aquí Y en registry.ts.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Tipos de entidades STABLE (re-exports de módulos canónicos)
// ═══════════════════════════════════════════════════════════════════════════

export type { AdminOrder, AdminOrderStatus, AdminPaymentStatus } from "@/data/mockData";
export type { CheckoutOrder } from "@/lib/orderAdapter";
export type { User, Address, UserRole, RegisterData } from "@/types/user";
export type { LocalProduct } from "@/data/products";
export type { AdminCoupon, UserCoupon, AppliedCoupon, CouponValidation, CouponDiscountType } from "@/services/couponService";
export type { InvoiceRecord, InvoiceLineItem, InvoiceTotals, CompanyData, CustomerData, PaymentMethod } from "@/types/fiscal";
export type { TaxPeriod, TaxSummary, AnnualSummary } from "@/types/tax";
export type { Incident } from "@/types/incident";

// ═══════════════════════════════════════════════════════════════════════════
// Tipos compartidos — PRIMITIVOS usados por múltiples entidades
// ═══════════════════════════════════════════════════════════════════════════

/** Identificador opaco. String para UUIDs/slugs, number para IDs autoincrementales. */
export type EntityId = string | number;

/** Timestamp ISO-8601 (ej: "2026-04-18T10:30:00.000Z"). */
export type IsoTimestamp = string;

/** Fecha ISO YYYY-MM-DD. */
export type IsoDate = string;

/** Moneda (hoy solo EUR; reservado para multicurrency). */
export type CurrencyCode = "EUR" | "USD" | "GBP" | string;

/** Idioma (ISO 639-1 uppercased). Coincide con LocalProduct.language. */
export type LanguageCode = "ES" | "EN" | "FR" | "DE" | "IT" | "JP" | "KO" | "PT" | string;

/** Dinero normalizado: cantidad + moneda. Para multicurrency futuro. */
export interface Money {
  amount: number;
  currency: CurrencyCode;
}

// ═══════════════════════════════════════════════════════════════════════════
// STUBS — entidades futuras. Tipos mínimos viables para que el día que se
// implementen encajen directas. No se usan hoy en código vivo.
// ═══════════════════════════════════════════════════════════════════════════

// ── Afiliados / referidos ──────────────────────────────────────────────────

export interface Affiliate {
  id: string;
  userId: string;           // FK → users
  code: string;             // código único
  commissionRate: number;   // 0-1 (0.05 = 5%)
  active: boolean;
  totalReferred: number;
  totalEarned: Money;
  createdAt: IsoTimestamp;
}

export interface Referral {
  id: string;
  affiliateId: string;      // FK → affiliates
  referredUserId?: string;  // FK → users (si se convirtió)
  orderId?: string;         // FK → orders (si compró)
  status: "pending" | "converted" | "paid" | "rejected";
  createdAt: IsoTimestamp;
}

// ── Suscripciones ──────────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  userId: string;                   // FK → users
  plan: string;                     // "mensual" | "anual" | personalizado
  productIds: number[];             // FK → products (caja del mes, etc.)
  status: "active" | "paused" | "cancelled" | "expired";
  price: Money;
  billingCycleDays: number;         // 30 = mensual, 365 = anual
  nextBillingAt: IsoDate;
  createdAt: IsoTimestamp;
  cancelledAt?: IsoTimestamp;
}

// ── Almacenes / ubicaciones físicas ────────────────────────────────────────

export interface Warehouse {
  id: string;
  name: string;                     // "Almacén central Béjar"
  address: string;
  active: boolean;
  isDefault: boolean;               // solo uno puede serlo
  createdAt: IsoTimestamp;
}

// ── Movimientos de stock ───────────────────────────────────────────────────

export type StockMovementType =
  | "purchase"        // entrada por compra a proveedor
  | "sale"            // salida por venta
  | "return"          // entrada por devolución cliente
  | "transfer_out"    // salida por traspaso entre almacenes
  | "transfer_in"     // entrada por traspaso
  | "adjustment"      // ajuste manual (recuento)
  | "shrinkage";      // merma

export interface StockMovement {
  id: string;
  productId: number;                // FK → products
  warehouseId?: string;             // FK → warehouses (null = almacén principal)
  type: StockMovementType;
  quantity: number;                 // positivo siempre; el type indica signo
  reference?: {
    kind: "order" | "purchase" | "return" | "manual";
    id: string;
  };
  note?: string;
  createdBy: string;                // FK → users (quien lo registró)
  createdAt: IsoTimestamp;
}

// ── Proveedores ────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  cif: string;
  email: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;            // "30 días", "contado", etc.
  active: boolean;
  notes?: string;
  createdAt: IsoTimestamp;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;               // FK → suppliers
  warehouseId?: string;             // FK → warehouses
  status: "draft" | "sent" | "received" | "paid" | "cancelled";
  lines: Array<{
    productId: number;              // FK → products
    quantity: number;
    unitCost: Money;
  }>;
  subtotal: Money;
  vat: Money;
  total: Money;
  expectedAt?: IsoDate;
  receivedAt?: IsoTimestamp;
  createdAt: IsoTimestamp;
}

// ── Tickets de soporte (generalización de Incident) ────────────────────────

export interface SupportTicket {
  id: string;
  userId?: string;                  // FK → users (opcional: puede ser anónimo)
  orderId?: string;                 // FK → orders
  category: "general" | "pedido" | "producto" | "facturacion" | "tecnico" | "devolucion";
  subject: string;
  status: "open" | "pending_customer" | "pending_admin" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  assignedTo?: string;              // FK → users (admin)
  messages: Array<{
    author: string;                 // email o "system"
    content: string;
    createdAt: IsoTimestamp;
  }>;
  createdAt: IsoTimestamp;
  resolvedAt?: IsoTimestamp;
}

// ── Promociones (reglas condicionales) ─────────────────────────────────────

export interface Promotion {
  id: string;
  name: string;
  description: string;
  code?: string;                    // si requiere código; si no, automática
  active: boolean;
  startsAt: IsoDate;
  endsAt: IsoDate;
  conditions: PromotionCondition[];
  reward: PromotionReward;
  priority: number;                 // si varias aplican, orden
  usageLimit?: number;
  usageLimitPerUser?: number;
  timesUsed: number;
  createdAt: IsoTimestamp;
}

export type PromotionCondition =
  | { kind: "minSubtotal"; amount: number }
  | { kind: "minQty"; productId: number; qty: number }
  | { kind: "gameSlug"; slug: string }
  | { kind: "categorySlug"; slug: string }
  | { kind: "userRole"; role: string }
  | { kind: "firstOrder" };

export type PromotionReward =
  | { kind: "percentOff"; amount: number }
  | { kind: "fixedOff"; amount: number }
  | { kind: "freeShipping" }
  | { kind: "giftProduct"; productId: number; qty: number };

// ── Banners / contenido visual ─────────────────────────────────────────────

export interface Banner {
  id: string;
  slot: "home_hero" | "home_strip" | "category_top" | "product_bottom" | "footer";
  title: string;
  subtitle?: string;
  imageUrl: string;
  ctaLabel?: string;
  ctaUrl?: string;
  startsAt?: IsoDate;
  endsAt?: IsoDate;
  active: boolean;
  order: number;
}

// ── CMS (páginas + blog) ───────────────────────────────────────────────────

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: string;                  // markdown o HTML sanitizado
  type: "static" | "blog" | "legal";
  published: boolean;
  meta: {
    title: string;
    description: string;
    ogImage?: string;
  };
  author?: string;                  // FK → users
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

// ── i18n / traducciones ────────────────────────────────────────────────────

export interface TranslationBundle {
  lang: LanguageCode;
  namespace: string;                // "common", "checkout", "admin", ...
  strings: Record<string, string>;
  updatedAt: IsoTimestamp;
}

// ── Multi-currency ─────────────────────────────────────────────────────────

export interface Currency {
  code: CurrencyCode;               // "EUR", "USD", ...
  symbol: string;                   // "€", "$"
  name: string;                     // "Euro", "US Dollar"
  exchangeRateToEur: number;        // 1 EUR = X de esta moneda
  updatedAt: IsoTimestamp;
  active: boolean;
}

// ── Shipping methods ───────────────────────────────────────────────────────

export interface ShippingMethod {
  id: string;
  name: string;                     // "GLS Estándar", "Recogida en tienda"
  carrier: string;                  // "GLS", "Seur", "Correos", "interno"
  cost: Money;
  freeThreshold?: Money;            // envío gratis a partir de este importe
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  supportedZones: string[];         // códigos postales / regiones
  active: boolean;
}

// ── Stores (multi-tienda / tenants) ────────────────────────────────────────

export interface Store {
  id: string;
  name: string;
  slug: string;
  cif: string;
  warehouseId?: string;             // FK → warehouses
  active: boolean;
  isHeadquarters: boolean;
}

// ── Integraciones externas ─────────────────────────────────────────────────

export interface Integration {
  id: string;
  provider: "stripe" | "redsys" | "resend" | "smtp" | "verifactu" | "google_analytics" | "sendinblue" | string;
  mode: "sandbox" | "production" | "disabled";
  credentials: Record<string, string>;   // las claves viven en .env; aquí solo metadata
  status: "ok" | "error" | "untested";
  lastCheckedAt?: IsoTimestamp;
  notes?: string;
}

// ── Tracking de usuario ────────────────────────────────────────────────────

export interface TrackingEvent {
  id: string;
  userId?: string;                  // null para anónimos
  sessionId: string;
  event: string;                    // "page_view", "add_to_cart", "purchase", ...
  properties: Record<string, unknown>;
  url?: string;
  referrer?: string;
  createdAt: IsoTimestamp;
}
