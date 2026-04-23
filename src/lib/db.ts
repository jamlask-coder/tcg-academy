/**
 * Database abstraction layer with adapter pattern.
 *
 * Local mode: localStorage (demo / static export).
 * Server mode: Supabase (PostgreSQL).
 */

import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  SellerSnapshot,
  CustomerRoleSnapshot,
  OrderStatusHistoryEntry,
} from "@/types/orderSnapshot";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OrderRecord {
  id: string;
  userId?: string;
  customerEmail: string;
  customerName: string;
  /** NIF/NIE/CIF del cliente — obligatorio (Art. 6.1.d RD 1619/2012) */
  customerTaxId: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  couponCode?: string;
  couponDiscount?: number;
  pointsDiscount?: number;
  total: number;
  /** IVA total incluido en `total` — congelado (snapshot). */
  totalVat?: number;
  /** Descuento total aplicado — congelado (snapshot). */
  totalDiscount?: number;
  status: OrderStatus;
  shippingMethod: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentIntent?: string;
  /** ISO timestamp when payment was confirmed by the provider (webhook). */
  paymentDate?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  notes?: string;
  shippingAddress: ShippingAddress;
  tiendaRecogida?: string;
  /** Foto de la empresa al crear el pedido — NUNCA se re-lee de SITE_CONFIG. */
  sellerSnapshot?: SellerSnapshot;
  /** Rol aplicado al calcular precios (cliente/mayorista/tienda/admin). */
  customerRole?: CustomerRoleSnapshot;
  /** Histórico de cambios de estado (append-only). */
  statusHistory?: OrderStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
  /** Categoría del producto al comprar (sobres, booster-box, etc.). */
  category?: string;
  /** Juego (magic, pokemon, yu-gi-oh, ...). */
  game?: string;
  /** Idioma del producto (ES, EN, JP, ...). */
  language?: string;
  /** IVA aplicado a esta línea (%). Default 21. */
  vatRate?: number;
  /** Descuento aplicado (%). */
  discountPercent?: number;
  /** Precio unitario antes del descuento — útil para mostrar tachado. */
  unitPriceBeforeDiscount?: number;
}

export interface ShippingAddress {
  calle: string;
  numero: string;
  piso?: string;
  cp: string;
  ciudad: string;
  provincia?: string;
  pais: string;
}

export type OrderStatus =
  | "pendiente"
  | "confirmado"
  | "procesando"
  | "enviado"
  | "entregado"
  | "cancelado"
  | "devuelto";

export interface UserRecord {
  id: string;
  email: string;
  username?: string;
  passwordHash: string;
  name: string;
  lastName: string;
  phone?: string;
  role: "cliente" | "mayorista" | "tienda" | "admin";
  referralCode?: string;
  referredBy?: string;
  birthDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  orderId?: string;
  userId?: string;
  customerEmail: string;
  customerName: string;
  customerNif?: string;
  status: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  hash?: string;
  prevHash?: string;
  verifactuId?: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface SettingsRecord {
  key: string;
  value: string;
  updatedAt: string;
}

export interface ResetTokenRecord {
  userId: string;
  tokenHash: string;
  expiresAt: string;
}

export interface EmailVerificationTokenRecord {
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: string;
}

export interface ConsentRecord {
  userId: string;
  type: string;
  status: "granted" | "revoked";
  method: string;
  version: string;
  ipAddress?: string;
  userAgent?: string;
}

// ─── Record types — entidades adicionales ───────────────────────────────────
// Mantienen shape estable independiente de si la persistencia es localStorage
// o Supabase. Los mappers al final del fichero traducen filas SQL ↔ Record.

export interface ProductRecord {
  id: number;
  slug: string;
  categoryId: string;
  name: string;
  shortDescription?: string;
  description?: string;
  price: number;
  salePrice?: number;
  vatRate: number;
  stock: number;
  /** @deprecated fallback genérico — usar los 3 de abajo */
  maxPerUser?: number;
  /** Máximo acumulado histórico por comprador con rol "cliente" */
  maxPerClient?: number;
  /** Máximo acumulado histórico por comprador con rol "mayorista" */
  maxPerWholesaler?: number;
  /** Máximo acumulado histórico por comprador con rol "tienda" */
  maxPerStore?: number;
  language?: string;
  barcode?: string;
  images: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CategoryRecord {
  id: string;
  parentId?: string;
  slug: string;
  name: string;
  description?: string;
  emoji?: string;
  color?: string;
  bgColor?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CartItemRecord {
  userId: string;
  productId: number;
  quantity: number;
  addedAt: string;
}

export interface FavoriteRecord {
  userId: string;
  productId: number;
  createdAt: string;
}

export interface CouponRecord {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrder: number;
  maxUses?: number;
  maxPerUser: number;
  usedCount: number;
  validFrom: string;
  validUntil?: string;
  isActive: boolean;
}

export interface CouponUsageRecord {
  couponId: string;
  userId: string;
  orderId?: string;
  createdAt: string;
}

export interface PointsRecord {
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

export interface PointsHistoryEntry {
  id?: string;
  userId: string;
  amount: number;
  reason: string;
  refOrder?: string;
  refOther?: string;
  createdAt?: string;
}

export interface IncidentRecord {
  id: string;
  orderId: string;
  userId?: string;
  status: "abierta" | "en_revision" | "resuelta" | "cerrada";
  category: string;
  title: string;
  body: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnRecord {
  id: string;
  rmaNumber: string;
  orderId: string;
  userId?: string;
  status: string;
  customerNote?: string;
  adminNote?: string;
  refundAmount?: number;
  trackingNumber?: string;
  rectificativeId?: string;
  items: Array<{ productId: number; quantity: number; unitPrice: number; reason: string; reasonDetail?: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  fromUserId?: string;
  toUserId?: string;
  orderId?: string;
  subject: string;
  body: string;
  isRead: boolean;
  parentId?: string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  scope: "user" | "broadcast" | "fiscal";
  userId?: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface GroupRecord {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMemberRecord {
  groupId: string;
  userId: string;
  role: "owner" | "member";
  joinedAt: string;
  leftAt?: string;
  cooldownUntil?: string;
}

export interface GroupInviteRecord {
  id: string;
  groupId: string;
  invitedBy?: string;
  invitedEmail: string;
  inviteCode: string;
  status: "pendiente" | "aceptada" | "rechazada" | "caducada";
  expiresAt: string;
  respondedAt?: string;
  createdAt: string;
}

export interface ReviewRecord {
  id: string;
  userId: string;
  productId: number;
  orderId?: string;
  rating?: number;
  title?: string;
  body?: string;
  isApproved: boolean;
  createdAt: string;
}

export interface ComplaintRecord {
  id: string;
  userId?: string;
  orderId?: string;
  claimantName: string;
  claimantEmail: string;
  claimantTaxId?: string;
  claimantAddress?: string;
  status: "recibida" | "tramitando" | "resuelta" | "desestimada";
  facts: string;
  claim: string;
  resolution?: string;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SolicitudRecord {
  id: string;
  type: "b2b" | "franquicia" | "vending";
  companyName: string;
  cif?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  volume?: string;
  games: string[];
  message?: string;
  status: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailLogRecord {
  id?: string;
  toEmail: string;
  toName?: string;
  subject: string;
  templateId?: string;
  providerId?: string;
  status: string;
  errorDetail?: string;
  userId?: string;
  createdAt?: string;
}

export interface AppLogEntry {
  id?: string;
  level: "debug" | "info" | "warn" | "error";
  source?: string;
  message: string;
  context?: Record<string, unknown>;
  userId?: string;
  createdAt?: string;
}

export interface AddressRecord {
  id: string;
  userId: string;
  label: string;
  recipient: string;
  street: string;
  floor?: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

export interface CompanyProfileRecord {
  id: string;
  userId: string;
  cif: string;
  legalName: string;
  fiscalAddress: string;
  contactPerson: string;
  companyPhone?: string;
  billingEmail?: string;
}

// ─── Adapter interface ──────────────────────────────────────────────────────

export interface DbAdapter {
  // Orders
  getOrders(userId?: string): Promise<OrderRecord[]>;
  getOrder(orderId: string): Promise<OrderRecord | null>;
  createOrder(order: OrderRecord): Promise<OrderRecord>;
  updateOrderStatus(orderId: string, status: OrderStatus, data?: Partial<OrderRecord>): Promise<void>;

  // Users
  getUser(userId: string): Promise<UserRecord | null>;
  getUserByEmail(email: string): Promise<UserRecord | null>;
  getUserByUsername(username: string): Promise<UserRecord | null>;
  createUser(user: Omit<UserRecord, "createdAt" | "updatedAt">): Promise<UserRecord>;
  updateUser(userId: string, data: Partial<UserRecord>): Promise<void>;
  deleteUser(userId: string): Promise<void>;

  // Invoices
  getInvoices(userId?: string): Promise<InvoiceRecord[]>;
  createInvoice(invoice: Omit<InvoiceRecord, "id">): Promise<InvoiceRecord>;

  // Settings
  getSetting(key: string): Promise<string | null>;
  getSettings(): Promise<SettingsRecord[]>;
  updateSettings(key: string, value: string): Promise<void>;

  // Reset tokens
  createResetToken(token: ResetTokenRecord): Promise<void>;
  getResetToken(userId: string): Promise<ResetTokenRecord | null>;
  deleteResetToken(userId: string): Promise<void>;

  // Email verification tokens
  createEmailVerificationToken(token: EmailVerificationTokenRecord): Promise<void>;
  getActiveEmailVerificationToken(email: string): Promise<EmailVerificationTokenRecord | null>;
  markEmailVerificationTokenUsed(email: string): Promise<void>;
  markEmailVerified(userId: string): Promise<void>;

  // Consents (GDPR)
  createConsent(consent: ConsentRecord): Promise<void>;
  getConsents(userId: string): Promise<ConsentRecord[]>;

  // Audit
  logAudit(entry: {
    entityType: string;
    entityId: string;
    action: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
    performedBy?: string;
    ipAddress?: string;
  }): Promise<void>;

  // ── Products + categories ────────────────────────────────────────────────
  getProducts(opts?: { categoryId?: string; includeDeleted?: boolean }): Promise<ProductRecord[]>;
  getProduct(id: number): Promise<ProductRecord | null>;
  upsertProduct(product: ProductRecord): Promise<ProductRecord>;
  softDeleteProduct(id: number): Promise<void>;
  getCategories(): Promise<CategoryRecord[]>;
  upsertCategory(cat: CategoryRecord): Promise<CategoryRecord>;

  // ── Cart + favorites ─────────────────────────────────────────────────────
  getCart(userId: string): Promise<CartItemRecord[]>;
  setCartItem(userId: string, productId: number, quantity: number): Promise<void>;
  removeCartItem(userId: string, productId: number): Promise<void>;
  clearCart(userId: string): Promise<void>;
  getFavorites(userId: string): Promise<FavoriteRecord[]>;
  addFavorite(userId: string, productId: number): Promise<void>;
  removeFavorite(userId: string, productId: number): Promise<void>;

  // ── Coupons ──────────────────────────────────────────────────────────────
  getCoupons(opts?: { activeOnly?: boolean }): Promise<CouponRecord[]>;
  getCouponByCode(code: string): Promise<CouponRecord | null>;
  upsertCoupon(coupon: CouponRecord): Promise<CouponRecord>;
  deleteCoupon(id: string): Promise<void>;
  recordCouponUsage(usage: CouponUsageRecord): Promise<void>;
  countCouponUsageByUser(couponId: string, userId: string): Promise<number>;

  // ── Points ───────────────────────────────────────────────────────────────
  getPoints(userId: string): Promise<PointsRecord | null>;
  appendPointsHistory(entry: PointsHistoryEntry): Promise<void>;
  getPointsHistory(userId: string): Promise<PointsHistoryEntry[]>;

  // ── Incidents ────────────────────────────────────────────────────────────
  getIncidents(opts?: { userId?: string; orderId?: string }): Promise<IncidentRecord[]>;
  createIncident(incident: Omit<IncidentRecord, "id" | "createdAt" | "updatedAt">): Promise<IncidentRecord>;
  updateIncident(id: string, data: Partial<IncidentRecord>): Promise<void>;

  // ── Returns (RMA) ────────────────────────────────────────────────────────
  getReturns(userId?: string): Promise<ReturnRecord[]>;
  getReturn(id: string): Promise<ReturnRecord | null>;
  createReturn(ret: Omit<ReturnRecord, "createdAt" | "updatedAt">): Promise<ReturnRecord>;
  updateReturn(id: string, data: Partial<ReturnRecord>): Promise<void>;

  // ── Messages ─────────────────────────────────────────────────────────────
  getMessages(userId: string): Promise<MessageRecord[]>;
  sendMessage(msg: Omit<MessageRecord, "id" | "createdAt" | "isRead">): Promise<MessageRecord>;
  markMessageRead(id: string): Promise<void>;

  // ── Notifications ────────────────────────────────────────────────────────
  getNotifications(opts: { userId?: string; scope?: "user" | "broadcast" | "fiscal" }): Promise<NotificationRecord[]>;
  createNotification(notif: Omit<NotificationRecord, "id" | "createdAt" | "isRead">): Promise<NotificationRecord>;
  markNotificationRead(id: string): Promise<void>;
  clearNotifications(userId: string): Promise<void>;

  // ── Groups (associations) ────────────────────────────────────────────────
  getGroupByUser(userId: string): Promise<{ group: GroupRecord; members: GroupMemberRecord[] } | null>;
  createGroup(group: Omit<GroupRecord, "createdAt" | "updatedAt">): Promise<GroupRecord>;
  addGroupMember(member: GroupMemberRecord): Promise<void>;
  removeGroupMember(groupId: string, userId: string, cooldownUntil?: string): Promise<void>;
  createGroupInvite(invite: Omit<GroupInviteRecord, "createdAt">): Promise<GroupInviteRecord>;
  getGroupInviteByCode(code: string): Promise<GroupInviteRecord | null>;
  updateGroupInvite(id: string, data: Partial<GroupInviteRecord>): Promise<void>;

  // ── Reviews / Complaints / Solicitudes ───────────────────────────────────
  getReviews(productId?: number): Promise<ReviewRecord[]>;
  createReview(review: Omit<ReviewRecord, "id" | "createdAt">): Promise<ReviewRecord>;
  approveReview(id: string): Promise<void>;
  getComplaints(userId?: string): Promise<ComplaintRecord[]>;
  createComplaint(c: Omit<ComplaintRecord, "id" | "createdAt" | "updatedAt">): Promise<ComplaintRecord>;
  updateComplaint(id: string, data: Partial<ComplaintRecord>): Promise<void>;
  getSolicitudes(type?: SolicitudRecord["type"]): Promise<SolicitudRecord[]>;
  createSolicitud(s: Omit<SolicitudRecord, "id" | "createdAt" | "updatedAt">): Promise<SolicitudRecord>;
  updateSolicitud(id: string, data: Partial<SolicitudRecord>): Promise<void>;

  // ── Email log + app logs ─────────────────────────────────────────────────
  logEmail(entry: EmailLogRecord): Promise<void>;
  logApp(entry: AppLogEntry): Promise<void>;

  // ── Addresses + company profile ──────────────────────────────────────────
  getAddresses(userId: string): Promise<AddressRecord[]>;
  upsertAddress(addr: AddressRecord): Promise<AddressRecord>;
  deleteAddress(id: string): Promise<void>;
  getCompanyProfile(userId: string): Promise<CompanyProfileRecord | null>;
  upsertCompanyProfile(profile: CompanyProfileRecord): Promise<CompanyProfileRecord>;
}

// ─── localStorage keys ──────────────────────────────────────────────────────

const KEYS = {
  orders: "tcgacademy_orders",
  users: "tcgacademy_registered",
  invoices: "tcgacademy_invoices",
  settings: "tcgacademy_admin_settings",
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Local adapter (localStorage) ───────────────────────────────────────────

interface RegisteredEntry {
  password: string;
  user: { id: string; name: string; lastName: string; email: string; username?: string; role?: string };
}

export class LocalDbAdapter implements DbAdapter {
  async getOrders(userId?: string): Promise<OrderRecord[]> {
    const orders = readStorage<OrderRecord[]>(KEYS.orders, []);
    if (userId) return orders.filter((o) => o.userId === userId);
    return orders;
  }

  async getOrder(orderId: string): Promise<OrderRecord | null> {
    const orders = readStorage<OrderRecord[]>(KEYS.orders, []);
    return orders.find((o) => o.id === orderId) ?? null;
  }

  async createOrder(order: OrderRecord): Promise<OrderRecord> {
    const orders = readStorage<OrderRecord[]>(KEYS.orders, []);
    orders.push(order);
    writeStorage(KEYS.orders, orders);
    return order;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, data?: Partial<OrderRecord>): Promise<void> {
    const orders = readStorage<OrderRecord[]>(KEYS.orders, []);
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      orders[idx].status = status;
      orders[idx].updatedAt = new Date().toISOString();
      if (data) Object.assign(orders[idx], data);
      writeStorage(KEYS.orders, orders);
    }
  }

  async getUser(userId: string): Promise<UserRecord | null> {
    const registered = readStorage<Record<string, RegisteredEntry>>(KEYS.users, {});
    for (const [email, entry] of Object.entries(registered)) {
      if (entry.user.id === userId) {
        return { id: entry.user.id, email, name: entry.user.name, lastName: entry.user.lastName, passwordHash: entry.password, role: (entry.user.role as UserRecord["role"]) ?? "cliente", createdAt: "", updatedAt: "" };
      }
    }
    return null;
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const registered = readStorage<Record<string, RegisteredEntry>>(KEYS.users, {});
    const entry = registered[email.toLowerCase()];
    if (!entry) return null;
    return { id: entry.user.id, email, name: entry.user.name, lastName: entry.user.lastName, passwordHash: entry.password, role: (entry.user.role as UserRecord["role"]) ?? "cliente", createdAt: "", updatedAt: "" };
  }

  async getUserByUsername(username: string): Promise<UserRecord | null> {
    const registered = readStorage<Record<string, RegisteredEntry>>(KEYS.users, {});
    for (const [email, entry] of Object.entries(registered)) {
      if (entry.user.username?.toLowerCase() === username.toLowerCase()) {
        return { id: entry.user.id, email, username: entry.user.username, name: entry.user.name, lastName: entry.user.lastName, passwordHash: entry.password, role: (entry.user.role as UserRecord["role"]) ?? "cliente", createdAt: "", updatedAt: "" };
      }
    }
    return null;
  }

  async createUser(user: Omit<UserRecord, "createdAt" | "updatedAt">): Promise<UserRecord> {
    const registered = readStorage<Record<string, RegisteredEntry>>(KEYS.users, {});
    registered[user.email] = {
      password: user.passwordHash,
      user: { id: user.id, name: user.name, lastName: user.lastName, email: user.email, username: user.username, role: user.role },
    };
    writeStorage(KEYS.users, registered);
    return { ...user, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }

  async updateUser(userId: string, data: Partial<UserRecord>): Promise<void> {
    const registered = readStorage<Record<string, RegisteredEntry>>(KEYS.users, {});
    for (const [email, entry] of Object.entries(registered)) {
      if (entry.user.id === userId) {
        if (data.name) entry.user.name = data.name;
        if (data.lastName) entry.user.lastName = data.lastName;
        if (data.passwordHash) entry.password = data.passwordHash;
        registered[email] = entry;
        writeStorage(KEYS.users, registered);
        return;
      }
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const registered = readStorage<Record<string, RegisteredEntry>>(KEYS.users, {});
    for (const [email, entry] of Object.entries(registered)) {
      if (entry.user.id === userId) {
        delete registered[email];
        writeStorage(KEYS.users, registered);
        return;
      }
    }
  }

  async getInvoices(userId?: string): Promise<InvoiceRecord[]> {
    const invoices = readStorage<InvoiceRecord[]>(KEYS.invoices, []);
    if (userId) return invoices.filter((i) => i.userId === userId);
    return invoices;
  }

  async createInvoice(invoice: Omit<InvoiceRecord, "id">): Promise<InvoiceRecord> {
    const invoices = readStorage<InvoiceRecord[]>(KEYS.invoices, []);
    const full = { ...invoice, id: `inv-${Date.now()}` };
    invoices.push(full);
    writeStorage(KEYS.invoices, invoices);
    return full;
  }

  async getSetting(key: string): Promise<string | null> {
    const settings = readStorage<SettingsRecord[]>(KEYS.settings, []);
    return settings.find((s) => s.key === key)?.value ?? null;
  }

  async getSettings(): Promise<SettingsRecord[]> {
    return readStorage<SettingsRecord[]>(KEYS.settings, []);
  }

  async updateSettings(key: string, value: string): Promise<void> {
    const settings = readStorage<SettingsRecord[]>(KEYS.settings, []);
    const idx = settings.findIndex((s) => s.key === key);
    const record: SettingsRecord = { key, value, updatedAt: new Date().toISOString() };
    if (idx !== -1) settings[idx] = record; else settings.push(record);
    writeStorage(KEYS.settings, settings);
  }

  async createResetToken(_token: ResetTokenRecord): Promise<void> { /* handled client-side */ }
  async getResetToken(_userId: string): Promise<ResetTokenRecord | null> { return null; }
  async deleteResetToken(_userId: string): Promise<void> { /* handled client-side */ }
  async createEmailVerificationToken(_t: EmailVerificationTokenRecord): Promise<void> { /* handled client-side */ }
  async getActiveEmailVerificationToken(_email: string): Promise<EmailVerificationTokenRecord | null> { return null; }
  async markEmailVerificationTokenUsed(_email: string): Promise<void> { /* handled client-side */ }
  async markEmailVerified(_userId: string): Promise<void> { /* handled client-side */ }
  async createConsent(_consent: ConsentRecord): Promise<void> { /* handled client-side */ }
  async getConsents(_userId: string): Promise<ConsentRecord[]> { return []; }
  async logAudit(_entry: { entityType: string; entityId: string; action: string }): Promise<void> { /* handled client-side */ }

  // ── Extended entities: en local mode los services ya escriben a localStorage.
  // ── Estos stubs existen para que el adapter satisfaga la interfaz; no son
  // ── la ruta canónica de escritura en modo local.
  async getProducts(): Promise<ProductRecord[]> { return []; }
  async getProduct(): Promise<ProductRecord | null> { return null; }
  async upsertProduct(p: ProductRecord): Promise<ProductRecord> { return p; }
  async softDeleteProduct(): Promise<void> { /* noop */ }
  async getCategories(): Promise<CategoryRecord[]> { return []; }
  async upsertCategory(c: CategoryRecord): Promise<CategoryRecord> { return c; }
  async getCart(): Promise<CartItemRecord[]> { return []; }
  async setCartItem(): Promise<void> { /* noop */ }
  async removeCartItem(): Promise<void> { /* noop */ }
  async clearCart(): Promise<void> { /* noop */ }
  async getFavorites(): Promise<FavoriteRecord[]> { return []; }
  async addFavorite(): Promise<void> { /* noop */ }
  async removeFavorite(): Promise<void> { /* noop */ }
  async getCoupons(): Promise<CouponRecord[]> { return []; }
  async getCouponByCode(): Promise<CouponRecord | null> { return null; }
  async upsertCoupon(c: CouponRecord): Promise<CouponRecord> { return c; }
  async deleteCoupon(): Promise<void> { /* noop */ }
  async recordCouponUsage(): Promise<void> { /* noop */ }
  async countCouponUsageByUser(): Promise<number> { return 0; }
  async getPoints(): Promise<PointsRecord | null> { return null; }
  async appendPointsHistory(): Promise<void> { /* noop */ }
  async getPointsHistory(): Promise<PointsHistoryEntry[]> { return []; }
  async getIncidents(): Promise<IncidentRecord[]> { return []; }
  async createIncident(i: Omit<IncidentRecord, "id" | "createdAt" | "updatedAt">): Promise<IncidentRecord> {
    return { ...i, id: `inc-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  async updateIncident(): Promise<void> { /* noop */ }
  async getReturns(): Promise<ReturnRecord[]> { return []; }
  async getReturn(): Promise<ReturnRecord | null> { return null; }
  async createReturn(r: Omit<ReturnRecord, "createdAt" | "updatedAt">): Promise<ReturnRecord> {
    return { ...r, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  async updateReturn(): Promise<void> { /* noop */ }
  async getMessages(): Promise<MessageRecord[]> { return []; }
  async sendMessage(m: Omit<MessageRecord, "id" | "createdAt" | "isRead">): Promise<MessageRecord> {
    return { ...m, id: `msg-${Date.now()}`, createdAt: new Date().toISOString(), isRead: false };
  }
  async markMessageRead(): Promise<void> { /* noop */ }
  async getNotifications(): Promise<NotificationRecord[]> { return []; }
  async createNotification(n: Omit<NotificationRecord, "id" | "createdAt" | "isRead">): Promise<NotificationRecord> {
    return { ...n, id: `ntf-${Date.now()}`, createdAt: new Date().toISOString(), isRead: false };
  }
  async markNotificationRead(): Promise<void> { /* noop */ }
  async clearNotifications(): Promise<void> { /* noop */ }
  async getGroupByUser(): Promise<{ group: GroupRecord; members: GroupMemberRecord[] } | null> { return null; }
  async createGroup(g: Omit<GroupRecord, "createdAt" | "updatedAt">): Promise<GroupRecord> {
    return { ...g, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  async addGroupMember(): Promise<void> { /* noop */ }
  async removeGroupMember(): Promise<void> { /* noop */ }
  async createGroupInvite(i: Omit<GroupInviteRecord, "createdAt">): Promise<GroupInviteRecord> {
    return { ...i, createdAt: new Date().toISOString() };
  }
  async getGroupInviteByCode(): Promise<GroupInviteRecord | null> { return null; }
  async updateGroupInvite(): Promise<void> { /* noop */ }
  async getReviews(): Promise<ReviewRecord[]> { return []; }
  async createReview(r: Omit<ReviewRecord, "id" | "createdAt">): Promise<ReviewRecord> {
    return { ...r, id: `rv-${Date.now()}`, createdAt: new Date().toISOString() };
  }
  async approveReview(): Promise<void> { /* noop */ }
  async getComplaints(): Promise<ComplaintRecord[]> { return []; }
  async createComplaint(c: Omit<ComplaintRecord, "id" | "createdAt" | "updatedAt">): Promise<ComplaintRecord> {
    return { ...c, id: `cp-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  async updateComplaint(): Promise<void> { /* noop */ }
  async getSolicitudes(): Promise<SolicitudRecord[]> { return []; }
  async createSolicitud(s: Omit<SolicitudRecord, "id" | "createdAt" | "updatedAt">): Promise<SolicitudRecord> {
    return { ...s, id: `sl-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  async updateSolicitud(): Promise<void> { /* noop */ }
  async logEmail(): Promise<void> { /* noop */ }
  async logApp(): Promise<void> { /* noop */ }
  async getAddresses(): Promise<AddressRecord[]> { return []; }
  async upsertAddress(a: AddressRecord): Promise<AddressRecord> { return a; }
  async deleteAddress(): Promise<void> { /* noop */ }
  async getCompanyProfile(): Promise<CompanyProfileRecord | null> { return null; }
  async upsertCompanyProfile(p: CompanyProfileRecord): Promise<CompanyProfileRecord> { return p; }
}

// ─── Server adapter (Supabase) ─────────────────────────────────────────────

export class ServerDbAdapter implements DbAdapter {
  private get db() { return getSupabaseAdmin(); }

  // ── Orders ──────────────────────────────────────────────────────────────

  async getOrders(userId?: string): Promise<OrderRecord[]> {
    let query = this.db
      .from("orders")
      .select("*, order_items(*), coupons(code)")
      .order("created_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapOrderRow);
  }

  async getOrder(orderId: string): Promise<OrderRecord | null> {
    const { data, error } = await this.db
      .from("orders")
      .select("*, order_items(*), coupons(code)")
      .eq("id", orderId)
      .single();
    if (error || !data) return null;
    return mapOrderRow(data);
  }

  async createOrder(order: OrderRecord): Promise<OrderRecord> {
    const { items, ...orderData } = order;

    // Resolve coupon_code → coupon_id (FK normalizada).
    let couponId: string | null = null;
    if (orderData.couponCode) {
      const { data: cpn } = await this.db
        .from("coupons")
        .select("id")
        .ilike("code", orderData.couponCode)
        .single();
      couponId = (cpn as { id?: string } | null)?.id ?? null;
    }

    // Customer + shipping van como snapshots JSONB inmutables.
    const [firstName, ...restName] = (orderData.customerName || "").split(" ");
    const customerSnapshot = {
      userId: orderData.userId ?? null,
      firstName: firstName || "",
      lastName: restName.join(" "),
      email: orderData.customerEmail,
      phone: orderData.customerPhone ?? null,
      taxId: orderData.customerTaxId,
    };

    const { error: orderError } = await this.db.from("orders").insert({
      id: orderData.id,
      user_id: orderData.userId || null,
      status: orderData.status,
      customer_snapshot: customerSnapshot,
      shipping_snapshot: orderData.shippingAddress ?? null,
      shipping_method: orderData.shippingMethod,
      shipping_cost: orderData.shippingCost,
      payment_method: orderData.paymentMethod,
      payment_status: orderData.paymentStatus,
      payment_intent: orderData.paymentIntent || null,
      subtotal: orderData.subtotal || orderData.total,
      coupon_id: couponId,
      coupon_discount: orderData.couponDiscount || 0,
      points_discount: orderData.pointsDiscount || 0,
      total: orderData.total,
      tracking_number: orderData.trackingNumber || null,
      tracking_url: orderData.trackingUrl || null,
      notes: orderData.notes || null,
    });
    if (orderError) throw orderError;

    if (items.length > 0) {
      const { error: itemsError } = await this.db.from("order_items").insert(
        items.map((item) => ({
          order_id: order.id,
          product_id: item.productId,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          image_url: item.imageUrl || null,
        })),
      );
      if (itemsError) throw itemsError;
    }
    return order;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, data?: Partial<OrderRecord>): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (data?.trackingNumber) update.tracking_number = data.trackingNumber;
    if (data?.trackingUrl) update.tracking_url = data.trackingUrl;
    if (data?.notes) update.notes = data.notes;
    if (data?.paymentStatus) update.payment_status = data.paymentStatus;
    const { error } = await this.db.from("orders").update(update).eq("id", orderId);
    if (error) throw error;
  }

  // ── Users ───────────────────────────────────────────────────────────────

  async getUser(userId: string): Promise<UserRecord | null> {
    const { data, error } = await this.db.from("users").select("*").eq("id", userId).single();
    if (error || !data) return null;
    return mapUserRow(data);
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const { data, error } = await this.db.from("users").select("*").ilike("email", email).single();
    if (error || !data) return null;
    return mapUserRow(data);
  }

  async getUserByUsername(username: string): Promise<UserRecord | null> {
    const { data, error } = await this.db.from("users").select("*").ilike("username", username).single();
    if (error || !data) return null;
    return mapUserRow(data);
  }

  async createUser(user: Omit<UserRecord, "createdAt" | "updatedAt">): Promise<UserRecord> {
    const { data, error } = await this.db.from("users").insert({
      id: user.id,
      email: user.email.toLowerCase(),
      username: user.username || null,
      password_hash: user.passwordHash,
      first_name: user.name,
      last_name: user.lastName,
      phone: user.phone || "",
      role: user.role,
      referral_code: user.referralCode || null,
      referred_by: user.referredBy || null,
      birth_date: user.birthDate || null,
    }).select().single();
    if (error) throw error;
    return mapUserRow(data);
  }

  async updateUser(userId: string, data: Partial<UserRecord>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.first_name = data.name;
    if (data.lastName !== undefined) update.last_name = data.lastName;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.passwordHash !== undefined) update.password_hash = data.passwordHash;
    if (data.role !== undefined) update.role = data.role;
    if (Object.keys(update).length === 0) return;
    const { error } = await this.db.from("users").update(update).eq("id", userId);
    if (error) throw error;
  }

  async deleteUser(userId: string): Promise<void> {
    const { error } = await this.db.from("users").delete().eq("id", userId);
    if (error) throw error;
  }

  // ── Invoices ────────────────────────────────────────────────────────────

  async getInvoices(userId?: string): Promise<InvoiceRecord[]> {
    let query = this.db.from("invoices").select("*").order("created_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapInvoiceRow);
  }

  async createInvoice(invoice: Omit<InvoiceRecord, "id">): Promise<InvoiceRecord> {
    const [firstName, ...restName] = (invoice.customerName || "").split(" ");
    const customerSnapshot = {
      firstName: firstName || "",
      lastName: restName.join(" "),
      email: invoice.customerEmail,
      taxId: invoice.customerNif ?? null,
    };
    const { data, error } = await this.db.from("invoices").insert({
      invoice_number: invoice.invoiceNumber,
      order_id: invoice.orderId || null,
      user_id: invoice.userId || null,
      customer_snapshot: customerSnapshot,
      status: invoice.status,
      subtotal: invoice.subtotal,
      vat_rate: invoice.vatRate,
      vat_amount: invoice.vatAmount,
      total: invoice.total,
      hash: invoice.hash || null,
      prev_hash: invoice.prevHash || null,
      data: invoice.data ?? {},
    }).select().single();
    if (error) throw error;
    return mapInvoiceRow(data);
  }

  // ── Settings ────────────────────────────────────────────────────────────

  async getSetting(key: string): Promise<string | null> {
    const { data, error } = await this.db.from("settings").select("value").eq("key", key).single();
    if (error || !data) return null;
    return data.value;
  }

  async getSettings(): Promise<SettingsRecord[]> {
    const { data, error } = await this.db.from("settings").select("*");
    if (error) throw error;
    return (data ?? []).map((r: Record<string, string>) => ({ key: r.key, value: r.value, updatedAt: r.updated_at }));
  }

  async updateSettings(key: string, value: string): Promise<void> {
    const { error } = await this.db.from("settings").upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  // ── Reset Tokens ────────────────────────────────────────────────────────

  async createResetToken(token: ResetTokenRecord): Promise<void> {
    // Invalidate existing tokens first
    await this.db.from("reset_tokens").delete().eq("user_id", token.userId).is("used_at", null);
    const { error } = await this.db.from("reset_tokens").insert({
      user_id: token.userId,
      token_hash: token.tokenHash,
      expires_at: token.expiresAt,
    });
    if (error) throw error;
  }

  async getResetToken(userId: string): Promise<ResetTokenRecord | null> {
    const { data, error } = await this.db
      .from("reset_tokens")
      .select("*")
      .eq("user_id", userId)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return null;
    return { userId: data.user_id, tokenHash: data.token_hash, expiresAt: data.expires_at };
  }

  async deleteResetToken(userId: string): Promise<void> {
    // Mark as used rather than deleting (audit trail)
    const { error } = await this.db.from("reset_tokens").update({ used_at: new Date().toISOString() }).eq("user_id", userId).is("used_at", null);
    if (error) throw error;
  }

  // ── Email Verification Tokens ──────────────────────────────────────────

  async createEmailVerificationToken(token: EmailVerificationTokenRecord): Promise<void> {
    // Invalidar tokens activos previos para este email (reenvíos).
    await this.db
      .from("email_verification_tokens")
      .update({ used_at: new Date().toISOString() })
      .ilike("email", token.email)
      .is("used_at", null);
    const { error } = await this.db.from("email_verification_tokens").insert({
      user_id: token.userId,
      email: token.email.toLowerCase(),
      token_hash: token.tokenHash,
      expires_at: token.expiresAt,
    });
    if (error) throw error;
  }

  async getActiveEmailVerificationToken(email: string): Promise<EmailVerificationTokenRecord | null> {
    const { data, error } = await this.db
      .from("email_verification_tokens")
      .select("*")
      .ilike("email", email)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return null;
    return {
      userId: data.user_id,
      email: data.email,
      tokenHash: data.token_hash,
      expiresAt: data.expires_at,
    };
  }

  async markEmailVerificationTokenUsed(email: string): Promise<void> {
    const { error } = await this.db
      .from("email_verification_tokens")
      .update({ used_at: new Date().toISOString() })
      .ilike("email", email)
      .is("used_at", null);
    if (error) throw error;
  }

  async markEmailVerified(userId: string): Promise<void> {
    const { error } = await this.db
      .from("users")
      .update({ email_verified: true, email_verified_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw error;
  }

  // ── Consents ────────────────────────────────────────────────────────────

  async createConsent(consent: ConsentRecord): Promise<void> {
    const { error } = await this.db.from("consents").insert({
      user_id: consent.userId,
      type: consent.type,
      status: consent.status,
      method: consent.method,
      version: consent.version,
      ip_address: consent.ipAddress || null,
      user_agent: consent.userAgent || null,
    });
    if (error) throw error;
  }

  async getConsents(userId: string): Promise<ConsentRecord[]> {
    const { data, error } = await this.db.from("consents").select("*").eq("user_id", userId).order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r: Record<string, string>) => ({
      userId: r.user_id,
      type: r.type,
      status: r.status as "granted" | "revoked",
      method: r.method,
      version: r.version,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
    }));
  }

  // ── Audit ───────────────────────────────────────────────────────────────

  async logAudit(entry: {
    entityType: string;
    entityId: string;
    action: string;
    field?: string;
    oldValue?: string;
    newValue?: string;
    performedBy?: string;
    ipAddress?: string;
  }): Promise<void> {
    const { error } = await this.db.from("audit_log").insert({
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      action: entry.action,
      field: entry.field || null,
      old_value: entry.oldValue || null,
      new_value: entry.newValue || null,
      performed_by: entry.performedBy || null,
      ip_address: entry.ipAddress || null,
    });
    if (error) throw error;
  }

  // ── Extended entities ──────────────────────────────────────────────────────
  // NOTE: Implementaciones Supabase pendientes. Los servicios de negocio todavía
  // leen/escriben a localStorage incluso en modo server. Los stubs siguientes
  // existen para satisfacer el contrato de DbAdapter y mantener el build.
  // Cuando se migre cada servicio, reemplazar el stub por la query real.

  async getProducts(): Promise<ProductRecord[]> { return []; }
  async getProduct(): Promise<ProductRecord | null> { return null; }
  async upsertProduct(p: ProductRecord): Promise<ProductRecord> { return p; }
  async softDeleteProduct(): Promise<void> { /* stub */ }
  async getCategories(): Promise<CategoryRecord[]> { return []; }
  async upsertCategory(c: CategoryRecord): Promise<CategoryRecord> { return c; }
  async getCart(): Promise<CartItemRecord[]> { return []; }
  async setCartItem(): Promise<void> { /* stub */ }
  async removeCartItem(): Promise<void> { /* stub */ }
  async clearCart(): Promise<void> { /* stub */ }
  async getFavorites(): Promise<FavoriteRecord[]> { return []; }
  async addFavorite(): Promise<void> { /* stub */ }
  async removeFavorite(): Promise<void> { /* stub */ }
  async getCoupons(): Promise<CouponRecord[]> { return []; }
  async getCouponByCode(): Promise<CouponRecord | null> { return null; }
  async upsertCoupon(c: CouponRecord): Promise<CouponRecord> { return c; }
  async deleteCoupon(): Promise<void> { /* stub */ }
  async recordCouponUsage(): Promise<void> { /* stub */ }
  async countCouponUsageByUser(): Promise<number> { return 0; }
  async getPoints(): Promise<PointsRecord | null> { return null; }
  async appendPointsHistory(): Promise<void> { /* stub */ }
  async getPointsHistory(): Promise<PointsHistoryEntry[]> { return []; }
  async getIncidents(): Promise<IncidentRecord[]> { return []; }
  async createIncident(i: Omit<IncidentRecord, "id" | "createdAt" | "updatedAt">): Promise<IncidentRecord> {
    const now = new Date().toISOString();
    return { ...i, id: `INC-${Date.now()}`, createdAt: now, updatedAt: now };
  }
  async updateIncident(): Promise<void> { /* stub */ }
  async getReturns(): Promise<ReturnRecord[]> { return []; }
  async getReturn(): Promise<ReturnRecord | null> { return null; }
  async createReturn(r: Omit<ReturnRecord, "createdAt" | "updatedAt">): Promise<ReturnRecord> {
    const now = new Date().toISOString();
    return { ...r, createdAt: now, updatedAt: now };
  }
  async updateReturn(): Promise<void> { /* stub */ }
  async getMessages(): Promise<MessageRecord[]> { return []; }
  async sendMessage(m: Omit<MessageRecord, "id" | "createdAt" | "isRead">): Promise<MessageRecord> {
    return { ...m, id: `MSG-${Date.now()}`, createdAt: new Date().toISOString(), isRead: false };
  }
  async markMessageRead(): Promise<void> { /* stub */ }
  async getNotifications(): Promise<NotificationRecord[]> { return []; }
  async createNotification(n: Omit<NotificationRecord, "id" | "createdAt" | "isRead">): Promise<NotificationRecord> {
    return { ...n, id: `NOT-${Date.now()}`, createdAt: new Date().toISOString(), isRead: false };
  }
  async markNotificationRead(): Promise<void> { /* stub */ }
  async clearNotifications(): Promise<void> { /* stub */ }
  async getGroupByUser(): Promise<{ group: GroupRecord; members: GroupMemberRecord[] } | null> { return null; }
  async createGroup(g: Omit<GroupRecord, "createdAt" | "updatedAt">): Promise<GroupRecord> {
    const now = new Date().toISOString();
    return { ...g, createdAt: now, updatedAt: now };
  }
  async addGroupMember(): Promise<void> { /* stub */ }
  async removeGroupMember(): Promise<void> { /* stub */ }
  async createGroupInvite(i: Omit<GroupInviteRecord, "createdAt">): Promise<GroupInviteRecord> {
    return { ...i, createdAt: new Date().toISOString() };
  }
  async getGroupInviteByCode(): Promise<GroupInviteRecord | null> { return null; }
  async updateGroupInvite(): Promise<void> { /* stub */ }
  async getReviews(): Promise<ReviewRecord[]> { return []; }
  async createReview(r: Omit<ReviewRecord, "id" | "createdAt">): Promise<ReviewRecord> {
    return { ...r, id: `REV-${Date.now()}`, createdAt: new Date().toISOString() };
  }
  async approveReview(): Promise<void> { /* stub */ }
  async getComplaints(): Promise<ComplaintRecord[]> { return []; }
  async createComplaint(c: Omit<ComplaintRecord, "id" | "createdAt" | "updatedAt">): Promise<ComplaintRecord> {
    const now = new Date().toISOString();
    return { ...c, id: `CMP-${Date.now()}`, createdAt: now, updatedAt: now };
  }
  async updateComplaint(): Promise<void> { /* stub */ }
  async getSolicitudes(): Promise<SolicitudRecord[]> { return []; }
  async createSolicitud(s: Omit<SolicitudRecord, "id" | "createdAt" | "updatedAt">): Promise<SolicitudRecord> {
    const now = new Date().toISOString();
    return { ...s, id: `SOL-${Date.now()}`, createdAt: now, updatedAt: now };
  }
  async updateSolicitud(): Promise<void> { /* stub */ }
  async logEmail(): Promise<void> { /* stub */ }
  async logApp(): Promise<void> { /* stub */ }
  async getAddresses(): Promise<AddressRecord[]> { return []; }
  async upsertAddress(a: AddressRecord): Promise<AddressRecord> { return a; }
  async deleteAddress(): Promise<void> { /* stub */ }
  async getCompanyProfile(): Promise<CompanyProfileRecord | null> { return null; }
  async upsertCompanyProfile(p: CompanyProfileRecord): Promise<CompanyProfileRecord> { return p; }
}

// ─── Row mappers ────────────────────────────────────────────────────────────

type DbRow = Record<string, unknown>;

function asNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v);
  return 0;
}

function asStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asOpt<T>(v: unknown): T | undefined {
  return v === null || v === undefined ? undefined : (v as T);
}

function mapOrderRow(row: DbRow): OrderRecord {
  const items = Array.isArray(row.order_items) ? (row.order_items as DbRow[]) : [];
  const snap = (row.customer_snapshot ?? {}) as Record<string, unknown>;
  const shipSnap = (row.shipping_snapshot ?? null) as OrderRecord["shippingAddress"] | null;
  const joinedCoupon = row.coupons as { code?: string } | null | undefined;
  const firstName = asStr(snap.firstName);
  const lastName = asStr(snap.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return {
    id: asStr(row.id),
    userId: asOpt<string>(row.user_id),
    customerEmail: asStr(snap.email),
    customerName: fullName,
    customerTaxId: asStr(snap.taxId),
    customerPhone: asOpt<string>(snap.phone),
    items: items.map((i) => ({
      productId: Number(i.product_id),
      name: asStr(i.name),
      quantity: Number(i.quantity),
      unitPrice: asNum(i.unit_price),
      imageUrl: asStr(i.image_url),
    })),
    subtotal: asNum(row.subtotal),
    shippingCost: asNum(row.shipping_cost),
    couponCode: joinedCoupon?.code ?? undefined,
    couponDiscount: row.coupon_discount ? asNum(row.coupon_discount) : 0,
    pointsDiscount: row.points_discount ? asNum(row.points_discount) : 0,
    total: asNum(row.total),
    status: row.status as OrderRecord["status"],
    shippingMethod: asStr(row.shipping_method),
    paymentMethod: asStr(row.payment_method),
    paymentStatus: asStr(row.payment_status),
    paymentIntent: asOpt<string>(row.payment_intent),
    trackingNumber: asOpt<string>(row.tracking_number),
    trackingUrl: asOpt<string>(row.tracking_url),
    notes: asOpt<string>(row.notes),
    shippingAddress: (shipSnap ?? ({} as OrderRecord["shippingAddress"])),
    tiendaRecogida: undefined,
    createdAt: asStr(row.created_at),
    updatedAt: asStr(row.updated_at),
  };
}

function mapUserRow(row: DbRow): UserRecord {
  return {
    id: asStr(row.id),
    email: asStr(row.email),
    username: asOpt<string>(row.username),
    passwordHash: asStr(row.password_hash),
    name: asStr(row.first_name),
    lastName: asStr(row.last_name),
    phone: asOpt<string>(row.phone),
    role: row.role as UserRecord["role"],
    referralCode: asOpt<string>(row.referral_code),
    referredBy: asOpt<string>(row.referred_by),
    birthDate: asOpt<string>(row.birth_date),
    createdAt: asStr(row.created_at),
    updatedAt: asStr(row.updated_at),
  };
}

function mapInvoiceRow(row: DbRow): InvoiceRecord {
  const snap = (row.customer_snapshot ?? {}) as Record<string, unknown>;
  const firstName = asStr(snap.firstName);
  const lastName = asStr(snap.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return {
    id: asStr(row.id),
    invoiceNumber: asStr(row.invoice_number),
    orderId: asOpt<string>(row.order_id),
    userId: asOpt<string>(row.user_id),
    customerEmail: asStr(snap.email),
    customerName: fullName,
    customerNif: asOpt<string>(snap.taxId),
    status: row.status as InvoiceRecord["status"],
    subtotal: asNum(row.subtotal),
    vatRate: asNum(row.vat_rate),
    vatAmount: asNum(row.vat_amount),
    total: asNum(row.total),
    hash: asOpt<string>(row.hash),
    prevHash: asOpt<string>(row.prev_hash),
    verifactuId: asOpt<string>(row.verifactu_id),
    data: row.data as InvoiceRecord["data"],
    createdAt: asStr(row.created_at),
  };
}

// ─── Factory ────────────────────────────────────────────────────────────────

let _instance: DbAdapter | null = null;

export function getDb(): DbAdapter {
  if (_instance) return _instance;
  const mode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";
  _instance = mode === "server" ? new ServerDbAdapter() : new LocalDbAdapter();
  return _instance;
}
