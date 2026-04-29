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

/**
 * SSOT: "enviado" es estado terminal del pipeline admin. "entregado"/"finalizado"
 * se eliminaron 2026-04-18 (dependían del transportista, generaban ruido). Cualquier
 * orden legacy con ese valor se normaliza vía orderAdapter.normalizeLegacyOrder.
 */
export type OrderStatus =
  | "pendiente"
  | "confirmado"
  | "procesando"
  | "enviado"
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
  /** NIF/NIE/CIF normalizado — obligatorio desde el registro. */
  nif?: string;
  /** Tipo detectado del NIF, para mostrar en factura. */
  nifType?: "DNI" | "NIE" | "CIF";
  referralCode?: string;
  referredBy?: string;
  birthDate?: string;
  /** Estado de verificación de email — columna `email_verified` (bool). */
  emailVerified?: boolean;
  /** Timestamp ISO de verificación — columna `email_verified_at`. */
  emailVerifiedAt?: string;
  /** Heartbeat del cliente (cada 60s mientras está logueado). Se usa para
   * mostrar punto verde/rojo en /admin/usuarios/[id]. */
  lastSeenAt?: string;
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
  /** True si el mensaje se envió como parte de un broadcast a varios destinatarios. */
  isBroadcast?: boolean;
  /** Agrupa todos los mensajes derivados de un mismo broadcast (1 fila por destinatario). */
  broadcastId?: string;
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
  /**
   * Busca por NIF/NIE/CIF normalizado (MAYÚSCULAS, sin espacios).
   * Usado para impedir que dos usuarios se registren con el mismo
   * identificador fiscal — requisito de integridad legal.
   */
  getUserByNif(nif: string): Promise<UserRecord | null>;
  /**
   * Listado completo para vistas administrativas (`/admin/usuarios`).
   * Solo debe llamarse desde endpoints protegidos por `requireAdmin`.
   * Devuelve hasta `limit` usuarios ordenados por `createdAt` desc.
   */
  listAllUsers(opts?: { limit?: number; role?: UserRecord["role"] }): Promise<UserRecord[]>;
  createUser(user: Omit<UserRecord, "createdAt" | "updatedAt">): Promise<UserRecord>;
  updateUser(userId: string, data: Partial<UserRecord>): Promise<void>;
  /** Cambio de email — separado por validación de colisión y cascada de FKs. */
  updateUserEmail(userId: string, newEmail: string): Promise<void>;
  /** Heartbeat — actualiza last_seen_at sin tocar updated_at. */
  updateLastSeen(userId: string, isoTimestamp: string): Promise<void>;
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

  // Email logs (server-mode auditoría real, no localStorage). `logEmail` ya
  // está declarado más abajo dentro de "Extended entities" (interfaz original);
  // aquí sólo añadimos el read.
  getEmailLogs(opts?: { limit?: number; toEmail?: string }): Promise<EmailLogRecord[]>;

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
  deleteCompanyProfile(userId: string): Promise<void>;
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
  user: {
    id: string;
    name: string;
    lastName: string;
    email: string;
    username?: string;
    role?: string;
    /** NIF/NIE/CIF normalizado — obligatorio en el registro nuevo. */
    nif?: string;
    nifType?: "DNI" | "NIE" | "CIF";
    phone?: string;
  };
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

  async getUserByNif(nif: string): Promise<UserRecord | null> {
    const needle = nif.toUpperCase().replace(/\s/g, "").trim();
    if (!needle) return null;
    const registered = readStorage<Record<string, RegisteredEntry>>(KEYS.users, {});
    for (const [email, entry] of Object.entries(registered)) {
      if (entry.user.nif && entry.user.nif === needle) {
        return {
          id: entry.user.id,
          email,
          name: entry.user.name,
          lastName: entry.user.lastName,
          passwordHash: entry.password,
          role: (entry.user.role as UserRecord["role"]) ?? "cliente",
          nif: entry.user.nif,
          nifType: entry.user.nifType,
          createdAt: "",
          updatedAt: "",
        };
      }
    }
    return null;
  }

  async listAllUsers(opts?: { limit?: number; role?: UserRecord["role"] }): Promise<UserRecord[]> {
    // En modo local los usuarios reales viven en `tcgacademy_registered`.
    // El admin de la página fusiona estos con MOCK_USERS — esa fusión la
    // hacemos en el caller, no aquí, para mantener este adapter "ciego" a
    // datos seed.
    const registered = readStorage<Record<string, RegisteredEntry>>(KEYS.users, {});
    // RegisteredEntry no almacena `createdAt` en el shape interno — el
    // local-mode es para dev y no necesita timestamps fiables. Para no
    // romper el orden, devolvemos `""` y el caller puede decidir.
    const out: UserRecord[] = Object.entries(registered).map(([email, entry]) => ({
      id: entry.user.id,
      email,
      username: entry.user.username,
      name: entry.user.name,
      lastName: entry.user.lastName,
      phone: entry.user.phone,
      passwordHash: entry.password,
      role: (entry.user.role as UserRecord["role"]) ?? "cliente",
      nif: entry.user.nif,
      nifType: entry.user.nifType,
      createdAt: "",
      updatedAt: "",
    }));
    const filtered = opts?.role ? out.filter((u) => u.role === opts.role) : out;
    const sorted = filtered.sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || ""),
    );
    return opts?.limit ? sorted.slice(0, opts.limit) : sorted;
  }

  async createUser(user: Omit<UserRecord, "createdAt" | "updatedAt">): Promise<UserRecord> {
    const registered = readStorage<Record<string, RegisteredEntry>>(KEYS.users, {});
    registered[user.email] = {
      password: user.passwordHash,
      user: {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role,
        nif: user.nif,
        nifType: user.nifType,
      },
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
        if (data.phone !== undefined) entry.user.phone = data.phone;
        if (data.nif !== undefined) entry.user.nif = data.nif;
        if (data.nifType !== undefined) entry.user.nifType = data.nifType;
        if (data.passwordHash) entry.password = data.passwordHash;
        registered[email] = entry;
        writeStorage(KEYS.users, registered);
        return;
      }
    }
  }

  async updateUserEmail(userId: string, newEmail: string): Promise<void> {
    const registered = readStorage<Record<string, RegisteredEntry>>(KEYS.users, {});
    const lower = newEmail.toLowerCase();
    if (registered[lower]) throw new Error("Email ya registrado");
    for (const [email, entry] of Object.entries(registered)) {
      if (entry.user.id === userId) {
        entry.user.email = lower;
        registered[lower] = entry;
        delete registered[email];
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

  async updateLastSeen(): Promise<void> {
    // Local mode: no-op. La presencia "online" sólo tiene sentido en server
    // mode donde el admin consulta otra sesión distinta a la suya.
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
  async logEmail(_entry: EmailLogRecord): Promise<void> { /* en local-mode emailService.ts escribe a localStorage */ }
  async getEmailLogs(): Promise<EmailLogRecord[]> { return []; }
  async logApp(): Promise<void> { /* noop */ }
  async getAddresses(): Promise<AddressRecord[]> { return []; }
  async upsertAddress(a: AddressRecord): Promise<AddressRecord> { return a; }
  async deleteAddress(): Promise<void> { /* noop */ }
  async getCompanyProfile(): Promise<CompanyProfileRecord | null> { return null; }
  async upsertCompanyProfile(p: CompanyProfileRecord): Promise<CompanyProfileRecord> { return p; }
  async deleteCompanyProfile(): Promise<void> { /* noop */ }
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

  async getUserByNif(nif: string): Promise<UserRecord | null> {
    const needle = nif.toUpperCase().replace(/\s/g, "").trim();
    if (!needle) return null;
    const { data, error } = await this.db.from("users").select("*").eq("tax_id", needle).maybeSingle();
    if (error || !data) return null;
    return mapUserRow(data);
  }

  async listAllUsers(opts?: { limit?: number; role?: UserRecord["role"] }): Promise<UserRecord[]> {
    // Cap defensivo — `/admin/usuarios` paginará en el front; un admin con
    // millones de filas no debería tirar todo a memoria de un golpe. 5000 es
    // suficiente para el horizonte previsto (33 importados WP + crecimiento).
    const cap = Math.min(opts?.limit ?? 5000, 5000);
    let q = this.db.from("users").select("*").order("created_at", { ascending: false }).limit(cap);
    if (opts?.role) q = q.eq("role", opts.role);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapUserRow);
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
      tax_id: user.nif || null,
      tax_id_type: user.nifType || null,
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
    if (data.nif !== undefined) update.tax_id = data.nif;
    if (data.nifType !== undefined) update.tax_id_type = data.nifType;
    if (Object.keys(update).length === 0) return;
    update.updated_at = new Date().toISOString();
    const { error } = await this.db.from("users").update(update).eq("id", userId);
    if (error) throw error;
  }

  async deleteUser(userId: string): Promise<void> {
    const { error } = await this.db.from("users").delete().eq("id", userId);
    if (error) throw error;
  }

  async updateUserEmail(userId: string, newEmail: string): Promise<void> {
    const lower = newEmail.toLowerCase();
    const { data: existing } = await this.db
      .from("users")
      .select("id")
      .eq("email", lower)
      .neq("id", userId)
      .maybeSingle();
    if (existing) throw new Error("Email ya registrado");
    const { error } = await this.db
      .from("users")
      .update({ email: lower, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw error;
  }

  async updateLastSeen(userId: string, isoTimestamp: string): Promise<void> {
    // Heartbeat — actualiza last_seen_at SIN tocar updated_at, para que la
    // columna updated_at siga reflejando cambios reales del perfil del
    // usuario y no la mera presencia. Si la columna aún no existe (la
    // migración users_last_seen_at.sql no se aplicó), suprimimos el error
    // para no romper el heartbeat client-side.
    const { error } = await this.db
      .from("users")
      .update({ last_seen_at: isoTimestamp })
      .eq("id", userId);
    if (error && !/last_seen_at/i.test(error.message)) throw error;
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
  // Implementaciones Supabase reales. Cada método mapea el shape Record (camelCase
  // estable para servicios) a las columnas snake_case de la BD. La sintaxis y
  // convenciones siguen el mismo patrón que las secciones anteriores (Orders,
  // Users, Invoices) para que el adapter sea homogéneo.

  async getProducts(opts?: { categoryId?: string; includeDeleted?: boolean }): Promise<ProductRecord[]> {
    let query = this.db.from("products").select("*").order("created_at", { ascending: false });
    if (opts?.categoryId) query = query.eq("category_id", opts.categoryId);
    if (!opts?.includeDeleted) query = query.is("deleted_at", null);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapProductRow);
  }

  async getProduct(id: number): Promise<ProductRecord | null> {
    const { data, error } = await this.db.from("products").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return mapProductRow(data);
  }

  async upsertProduct(p: ProductRecord): Promise<ProductRecord> {
    const meta = (p.metadata ?? {}) as Record<string, unknown>;
    // Limites por rol viajan en metadata para no inflar el schema con columnas
    // que pueden cambiar (cliente/mayorista/tienda). max_per_user queda como
    // fallback genérico.
    if (p.maxPerClient !== undefined) meta.maxPerClient = p.maxPerClient;
    if (p.maxPerWholesaler !== undefined) meta.maxPerWholesaler = p.maxPerWholesaler;
    if (p.maxPerStore !== undefined) meta.maxPerStore = p.maxPerStore;
    const { data, error } = await this.db.from("products").upsert({
      id: p.id,
      slug: p.slug,
      category_id: p.categoryId,
      name: p.name,
      short_description: p.shortDescription ?? null,
      description: p.description ?? null,
      price: p.price,
      sale_price: p.salePrice ?? null,
      vat_rate: p.vatRate,
      stock: p.stock,
      max_per_user: p.maxPerUser ?? null,
      language: p.language ?? null,
      barcode: p.barcode ?? null,
      images: p.images,
      metadata: meta,
      updated_at: new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return mapProductRow(data);
  }

  async softDeleteProduct(id: number): Promise<void> {
    const { error } = await this.db
      .from("products")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }

  async getCategories(): Promise<CategoryRecord[]> {
    const { data, error } = await this.db
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapCategoryRow);
  }

  async upsertCategory(c: CategoryRecord): Promise<CategoryRecord> {
    const { data, error } = await this.db.from("categories").upsert({
      id: c.id,
      parent_id: c.parentId ?? null,
      slug: c.slug,
      name: c.name,
      description: c.description ?? null,
      emoji: c.emoji ?? null,
      color: c.color ?? null,
      bg_color: c.bgColor ?? null,
      sort_order: c.sortOrder,
      is_active: c.isActive,
      updated_at: new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return mapCategoryRow(data);
  }

  // ── Cart ──────────────────────────────────────────────────────────────
  // El carrito vive en `cart_items` con FK a `carts.user_id`. Antes de
  // insertar items hay que asegurar que la cabecera existe (idempotente).

  private async ensureCart(userId: string): Promise<void> {
    await this.db.from("carts").upsert({ user_id: userId }, { onConflict: "user_id" });
  }

  async getCart(userId: string): Promise<CartItemRecord[]> {
    const { data, error } = await this.db
      .from("cart_items")
      .select("*")
      .eq("cart_user_id", userId)
      .order("added_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: DbRow) => ({
      userId: asStr(r.cart_user_id),
      productId: Number(r.product_id),
      quantity: Number(r.quantity),
      addedAt: asStr(r.added_at),
    }));
  }

  async setCartItem(userId: string, productId: number, quantity: number): Promise<void> {
    await this.ensureCart(userId);
    if (quantity <= 0) {
      await this.removeCartItem(userId, productId);
      return;
    }
    const { error } = await this.db.from("cart_items").upsert({
      cart_user_id: userId,
      product_id: productId,
      quantity,
      added_at: new Date().toISOString(),
    }, { onConflict: "cart_user_id,product_id" });
    if (error) throw error;
  }

  async removeCartItem(userId: string, productId: number): Promise<void> {
    const { error } = await this.db
      .from("cart_items")
      .delete()
      .eq("cart_user_id", userId)
      .eq("product_id", productId);
    if (error) throw error;
  }

  async clearCart(userId: string): Promise<void> {
    const { error } = await this.db.from("cart_items").delete().eq("cart_user_id", userId);
    if (error) throw error;
  }

  // ── Favorites ─────────────────────────────────────────────────────────

  async getFavorites(userId: string): Promise<FavoriteRecord[]> {
    const { data, error } = await this.db
      .from("favorites")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: DbRow) => ({
      userId: asStr(r.user_id),
      productId: Number(r.product_id),
      createdAt: asStr(r.created_at),
    }));
  }

  async addFavorite(userId: string, productId: number): Promise<void> {
    const { error } = await this.db.from("favorites").upsert(
      { user_id: userId, product_id: productId },
      { onConflict: "user_id,product_id" },
    );
    if (error) throw error;
  }

  async removeFavorite(userId: string, productId: number): Promise<void> {
    const { error } = await this.db
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);
    if (error) throw error;
  }

  // ── Coupons ───────────────────────────────────────────────────────────

  async getCoupons(opts?: { activeOnly?: boolean }): Promise<CouponRecord[]> {
    let query = this.db.from("coupons").select("*").order("created_at", { ascending: false });
    if (opts?.activeOnly) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapCouponRow);
  }
  /**
   * SERVER-SIDE coupon lookup — fuente canónica para validar `coupon.discount`
   * en /api/orders. Implementación real (Supabase) — ya no es stub: el código
   * del cliente jamás se debe creer; se contrasta SIEMPRE contra esta fila.
   */
  async getCouponByCode(code: string): Promise<CouponRecord | null> {
    if (!code) return null;
    const { data, error } = await this.db
      .from("coupons")
      .select("*")
      .ilike("code", code)
      .maybeSingle();
    if (error || !data) return null;
    return mapCouponRow(data as DbRow);
  }
  async upsertCoupon(c: CouponRecord): Promise<CouponRecord> {
    const { data, error } = await this.db.from("coupons").upsert({
      id: c.id,
      code: c.code,
      discount_type: c.discountType,
      discount_value: c.discountValue,
      min_order: c.minOrder,
      max_uses: c.maxUses ?? null,
      max_per_user: c.maxPerUser,
      used_count: c.usedCount,
      valid_from: c.validFrom,
      valid_until: c.validUntil ?? null,
      is_active: c.isActive,
      updated_at: new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return mapCouponRow(data);
  }

  async deleteCoupon(id: string): Promise<void> {
    const { error } = await this.db.from("coupons").delete().eq("id", id);
    if (error) throw error;
  }

  async recordCouponUsage(usage: CouponUsageRecord): Promise<void> {
    const { error } = await this.db.from("coupon_usage").insert({
      coupon_id: usage.couponId,
      user_id: usage.userId,
      order_id: usage.orderId ?? null,
    });
    if (error) throw error;
    // Incrementa contador agregado used_count (lectura + update). Race-condition
    // tolerable: si dos pedidos casi simultáneos coinciden, el límite se aplica
    // sobre coupon_usage real (count exact) en `countCouponUsageByUser`.
    const { data: cur } = await this.db
      .from("coupons")
      .select("used_count")
      .eq("id", usage.couponId)
      .maybeSingle();
    const next = Number((cur as { used_count?: number } | null)?.used_count ?? 0) + 1;
    await this.db.from("coupons").update({ used_count: next }).eq("id", usage.couponId);
  }

  async countCouponUsageByUser(couponId: string, userId: string): Promise<number> {
    const { count, error } = await this.db
      .from("coupon_usage")
      .select("*", { count: "exact", head: true })
      .eq("coupon_id", couponId)
      .eq("user_id", userId);
    if (error) throw error;
    return count ?? 0;
  }
  /**
   * SERVER-SIDE points balance lookup — fuente canónica para validar
   * `pointsDiscount` en /api/orders. Implementación real (Supabase).
   */
  async getPoints(userId: string): Promise<PointsRecord | null> {
    if (!userId) return null;
    const { data, error } = await this.db
      .from("points")
      .select("user_id, balance, total_earned, total_spent")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as DbRow;
    return {
      userId: asStr(row.user_id),
      balance: asNum(row.balance),
      totalEarned: asNum(row.total_earned),
      totalSpent: asNum(row.total_spent),
    };
  }
  // ── Points history ────────────────────────────────────────────────────

  async appendPointsHistory(entry: PointsHistoryEntry): Promise<void> {
    const { error } = await this.db.from("points_history").insert({
      user_id: entry.userId,
      amount: entry.amount,
      reason: entry.reason,
      ref_order: entry.refOrder ?? null,
      ref_other: entry.refOther ?? null,
    });
    if (error) throw error;
    // Recalcula balance/totales en `points` (upsert idempotente).
    const { data: cur } = await this.db
      .from("points")
      .select("balance, total_earned, total_spent")
      .eq("user_id", entry.userId)
      .maybeSingle();
    const row = (cur ?? {}) as { balance?: number; total_earned?: number; total_spent?: number };
    const balance = Number(row.balance ?? 0) + entry.amount;
    const totalEarned = Number(row.total_earned ?? 0) + (entry.amount > 0 ? entry.amount : 0);
    const totalSpent = Number(row.total_spent ?? 0) + (entry.amount < 0 ? -entry.amount : 0);
    await this.db.from("points").upsert({
      user_id: entry.userId,
      balance,
      total_earned: totalEarned,
      total_spent: totalSpent,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  }

  async getPointsHistory(userId: string): Promise<PointsHistoryEntry[]> {
    const { data, error } = await this.db
      .from("points_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: DbRow) => ({
      id: asStr(r.id),
      userId: asStr(r.user_id),
      amount: Number(r.amount),
      reason: asStr(r.reason),
      refOrder: asOpt<string>(r.ref_order),
      refOther: asOpt<string>(r.ref_other),
      createdAt: asStr(r.created_at),
    }));
  }

  // ── Incidents ─────────────────────────────────────────────────────────

  async getIncidents(opts?: { userId?: string; orderId?: string }): Promise<IncidentRecord[]> {
    let query = this.db.from("incidents").select("*").order("created_at", { ascending: false });
    if (opts?.userId) query = query.eq("user_id", opts.userId);
    if (opts?.orderId) query = query.eq("order_id", opts.orderId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapIncidentRow);
  }

  async createIncident(i: Omit<IncidentRecord, "id" | "createdAt" | "updatedAt">): Promise<IncidentRecord> {
    const { data, error } = await this.db.from("incidents").insert({
      order_id: i.orderId,
      user_id: i.userId ?? null,
      status: i.status,
      category: i.category,
      title: i.title,
      body: i.body,
      admin_note: i.adminNote ?? null,
    }).select().single();
    if (error) throw error;
    return mapIncidentRow(data);
  }

  async updateIncident(id: string, data: Partial<IncidentRecord>): Promise<void> {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.status !== undefined) update.status = data.status;
    if (data.category !== undefined) update.category = data.category;
    if (data.title !== undefined) update.title = data.title;
    if (data.body !== undefined) update.body = data.body;
    if (data.adminNote !== undefined) update.admin_note = data.adminNote;
    const { error } = await this.db.from("incidents").update(update).eq("id", id);
    if (error) throw error;
  }

  // ── Returns (RMA) ─────────────────────────────────────────────────────

  async getReturns(userId?: string): Promise<ReturnRecord[]> {
    let query = this.db
      .from("returns")
      .select("*, return_items(*)")
      .order("created_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapReturnRow);
  }

  async getReturn(id: string): Promise<ReturnRecord | null> {
    const { data, error } = await this.db
      .from("returns")
      .select("*, return_items(*)")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return mapReturnRow(data);
  }

  async createReturn(r: Omit<ReturnRecord, "createdAt" | "updatedAt">): Promise<ReturnRecord> {
    const { data: head, error } = await this.db.from("returns").insert({
      id: r.id,
      rma_number: r.rmaNumber,
      order_id: r.orderId,
      user_id: r.userId ?? null,
      status: r.status,
      customer_note: r.customerNote ?? null,
      admin_note: r.adminNote ?? null,
      refund_amount: r.refundAmount ?? null,
      tracking_number: r.trackingNumber ?? null,
      rectificative_id: r.rectificativeId ?? null,
    }).select().single();
    if (error) throw error;
    if (r.items.length > 0) {
      const { error: itemsErr } = await this.db.from("return_items").insert(
        r.items.map((it) => ({
          return_id: (head as { id: string }).id,
          product_id: it.productId,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          reason: it.reason,
          reason_detail: it.reasonDetail ?? null,
        })),
      );
      if (itemsErr) throw itemsErr;
    }
    return mapReturnRow({ ...(head as DbRow), return_items: r.items });
  }

  async updateReturn(id: string, data: Partial<ReturnRecord>): Promise<void> {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.status !== undefined) update.status = data.status;
    if (data.customerNote !== undefined) update.customer_note = data.customerNote;
    if (data.adminNote !== undefined) update.admin_note = data.adminNote;
    if (data.refundAmount !== undefined) update.refund_amount = data.refundAmount;
    if (data.trackingNumber !== undefined) update.tracking_number = data.trackingNumber;
    if (data.rectificativeId !== undefined) update.rectificative_id = data.rectificativeId;
    const { error } = await this.db.from("returns").update(update).eq("id", id);
    if (error) throw error;
  }

  // ── Messages ──────────────────────────────────────────────────────────

  async getMessages(userId: string): Promise<MessageRecord[]> {
    const { data, error } = await this.db
      .from("messages")
      .select("*")
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapMessageRow);
  }

  async sendMessage(m: Omit<MessageRecord, "id" | "createdAt" | "isRead">): Promise<MessageRecord> {
    const { data, error } = await this.db.from("messages").insert({
      from_user_id: m.fromUserId ?? null,
      to_user_id: m.toUserId ?? null,
      order_id: m.orderId ?? null,
      subject: m.subject,
      body: m.body,
      parent_id: m.parentId ?? null,
      is_broadcast: m.isBroadcast ?? false,
      broadcast_id: m.broadcastId ?? null,
    }).select().single();
    if (error) throw error;
    return mapMessageRow(data);
  }

  async markMessageRead(id: string): Promise<void> {
    const { error } = await this.db.from("messages").update({ is_read: true }).eq("id", id);
    if (error) throw error;
  }

  // ── Notifications ─────────────────────────────────────────────────────

  async getNotifications(opts: { userId?: string; scope?: "user" | "broadcast" | "fiscal" }): Promise<NotificationRecord[]> {
    let query = this.db.from("notifications").select("*").order("created_at", { ascending: false });
    if (opts.userId) query = query.eq("user_id", opts.userId);
    if (opts.scope) query = query.eq("scope", opts.scope);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapNotificationRow);
  }

  async createNotification(n: Omit<NotificationRecord, "id" | "createdAt" | "isRead">): Promise<NotificationRecord> {
    const { data, error } = await this.db.from("notifications").insert({
      scope: n.scope,
      user_id: n.userId ?? null,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link ?? null,
    }).select().single();
    if (error) throw error;
    return mapNotificationRow(data);
  }

  async markNotificationRead(id: string): Promise<void> {
    const { error } = await this.db.from("notifications").update({ is_read: true }).eq("id", id);
    if (error) throw error;
  }

  async clearNotifications(userId: string): Promise<void> {
    const { error } = await this.db.from("notifications").delete().eq("user_id", userId);
    if (error) throw error;
  }

  // ── Groups (associations) ─────────────────────────────────────────────

  async getGroupByUser(userId: string): Promise<{ group: GroupRecord; members: GroupMemberRecord[] } | null> {
    // Buscar membership activa (left_at IS NULL).
    const { data: mem } = await this.db
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId)
      .is("left_at", null)
      .maybeSingle();
    const groupId = (mem as { group_id?: string } | null)?.group_id;
    if (!groupId) return null;
    const { data: g } = await this.db.from("groups").select("*").eq("id", groupId).maybeSingle();
    if (!g) return null;
    const { data: members } = await this.db
      .from("group_members")
      .select("*")
      .eq("group_id", groupId);
    return {
      group: mapGroupRow(g),
      members: (members ?? []).map(mapGroupMemberRow),
    };
  }

  async createGroup(g: Omit<GroupRecord, "createdAt" | "updatedAt">): Promise<GroupRecord> {
    const { data, error } = await this.db.from("groups").insert({
      id: g.id,
      owner_id: g.ownerId,
      name: g.name,
    }).select().single();
    if (error) throw error;
    return mapGroupRow(data);
  }

  async addGroupMember(member: GroupMemberRecord): Promise<void> {
    const { error } = await this.db.from("group_members").upsert({
      group_id: member.groupId,
      user_id: member.userId,
      role: member.role,
      joined_at: member.joinedAt,
      left_at: member.leftAt ?? null,
      cooldown_until: member.cooldownUntil ?? null,
    }, { onConflict: "group_id,user_id" });
    if (error) throw error;
  }

  async removeGroupMember(groupId: string, userId: string, cooldownUntil?: string): Promise<void> {
    const { error } = await this.db.from("group_members").update({
      left_at: new Date().toISOString(),
      cooldown_until: cooldownUntil ?? null,
    }).eq("group_id", groupId).eq("user_id", userId);
    if (error) throw error;
  }

  async createGroupInvite(invite: Omit<GroupInviteRecord, "createdAt">): Promise<GroupInviteRecord> {
    const { data, error } = await this.db.from("group_invites").insert({
      id: invite.id,
      group_id: invite.groupId,
      invited_by: invite.invitedBy ?? null,
      invited_email: invite.invitedEmail.toLowerCase(),
      invite_code: invite.inviteCode,
      status: invite.status,
      expires_at: invite.expiresAt,
      responded_at: invite.respondedAt ?? null,
    }).select().single();
    if (error) throw error;
    return mapGroupInviteRow(data);
  }

  async getGroupInviteByCode(code: string): Promise<GroupInviteRecord | null> {
    const { data, error } = await this.db
      .from("group_invites")
      .select("*")
      .eq("invite_code", code)
      .maybeSingle();
    if (error || !data) return null;
    return mapGroupInviteRow(data);
  }

  async updateGroupInvite(id: string, data: Partial<GroupInviteRecord>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (data.status !== undefined) update.status = data.status;
    if (data.respondedAt !== undefined) update.responded_at = data.respondedAt;
    if (data.expiresAt !== undefined) update.expires_at = data.expiresAt;
    if (Object.keys(update).length === 0) return;
    const { error } = await this.db.from("group_invites").update(update).eq("id", id);
    if (error) throw error;
  }

  // ── Reviews ───────────────────────────────────────────────────────────

  async getReviews(productId?: number): Promise<ReviewRecord[]> {
    let query = this.db.from("reviews").select("*").order("created_at", { ascending: false });
    if (productId !== undefined) query = query.eq("product_id", productId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapReviewRow);
  }

  async createReview(r: Omit<ReviewRecord, "id" | "createdAt">): Promise<ReviewRecord> {
    const { data, error } = await this.db.from("reviews").insert({
      user_id: r.userId,
      product_id: r.productId,
      order_id: r.orderId ?? null,
      rating: r.rating ?? null,
      title: r.title ?? null,
      body: r.body ?? null,
      is_approved: r.isApproved,
    }).select().single();
    if (error) throw error;
    return mapReviewRow(data);
  }

  async approveReview(id: string): Promise<void> {
    const { error } = await this.db.from("reviews").update({ is_approved: true }).eq("id", id);
    if (error) throw error;
  }

  // ── Complaints ────────────────────────────────────────────────────────

  async getComplaints(userId?: string): Promise<ComplaintRecord[]> {
    let query = this.db.from("complaints").select("*").order("created_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapComplaintRow);
  }

  async createComplaint(c: Omit<ComplaintRecord, "id" | "createdAt" | "updatedAt">): Promise<ComplaintRecord> {
    const { data, error } = await this.db.from("complaints").insert({
      user_id: c.userId ?? null,
      order_id: c.orderId ?? null,
      claimant_name: c.claimantName,
      claimant_email: c.claimantEmail.toLowerCase(),
      claimant_tax_id: c.claimantTaxId ?? null,
      claimant_address: c.claimantAddress ?? null,
      status: c.status,
      facts: c.facts,
      claim: c.claim,
      resolution: c.resolution ?? null,
      pdf_url: c.pdfUrl ?? null,
    }).select().single();
    if (error) throw error;
    return mapComplaintRow(data);
  }

  async updateComplaint(id: string, data: Partial<ComplaintRecord>): Promise<void> {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.status !== undefined) update.status = data.status;
    if (data.resolution !== undefined) update.resolution = data.resolution;
    if (data.pdfUrl !== undefined) update.pdf_url = data.pdfUrl;
    const { error } = await this.db.from("complaints").update(update).eq("id", id);
    if (error) throw error;
  }

  // ── Solicitudes (B2B / franquicia / vending) ──────────────────────────

  async getSolicitudes(type?: SolicitudRecord["type"]): Promise<SolicitudRecord[]> {
    let query = this.db.from("solicitudes").select("*").order("created_at", { ascending: false });
    if (type) query = query.eq("type", type);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapSolicitudRow);
  }

  async createSolicitud(s: Omit<SolicitudRecord, "id" | "createdAt" | "updatedAt">): Promise<SolicitudRecord> {
    const { data, error } = await this.db.from("solicitudes").insert({
      type: s.type,
      company_name: s.companyName,
      cif: s.cif ?? null,
      contact_name: s.contactName,
      contact_email: s.contactEmail.toLowerCase(),
      contact_phone: s.contactPhone ?? null,
      volume: s.volume ?? null,
      games: s.games,
      message: s.message ?? null,
      status: s.status,
      admin_note: s.adminNote ?? null,
    }).select().single();
    if (error) throw error;
    return mapSolicitudRow(data);
  }

  async updateSolicitud(id: string, data: Partial<SolicitudRecord>): Promise<void> {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.status !== undefined) update.status = data.status;
    if (data.adminNote !== undefined) update.admin_note = data.adminNote;
    const { error } = await this.db.from("solicitudes").update(update).eq("id", id);
    if (error) throw error;
  }

  // ── Email + app logs ──────────────────────────────────────────────────

  async logEmail(entry: EmailLogRecord): Promise<void> {
    const { error } = await this.db.from("email_log").insert({
      to_email: entry.toEmail.toLowerCase(),
      to_name: entry.toName ?? null,
      subject: entry.subject,
      template_id: entry.templateId ?? null,
      provider_id: entry.providerId ?? null,
      status: entry.status,
      error_detail: entry.errorDetail ?? null,
      user_id: entry.userId ?? null,
    });
    if (error) throw error;
  }

  async getEmailLogs(opts?: { limit?: number; toEmail?: string }): Promise<EmailLogRecord[]> {
    const limit = Math.min(Math.max(opts?.limit ?? 200, 1), 1000);
    let q = this.db
      .from("email_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (opts?.toEmail) q = q.eq("to_email", opts.toEmail.toLowerCase());
    const { data, error } = await q;
    if (error) throw error;
    type Row = {
      id: string;
      to_email: string;
      to_name: string | null;
      subject: string;
      template_id: string | null;
      provider_id: string | null;
      status: string;
      error_detail: string | null;
      user_id: string | null;
      created_at: string;
    };
    return ((data ?? []) as Row[]).map((r) => ({
      id: r.id,
      toEmail: r.to_email,
      toName: r.to_name ?? undefined,
      subject: r.subject,
      templateId: r.template_id ?? undefined,
      providerId: r.provider_id ?? undefined,
      status: r.status,
      errorDetail: r.error_detail ?? undefined,
      userId: r.user_id ?? undefined,
      createdAt: r.created_at,
    }));
  }

  async logApp(entry: AppLogEntry): Promise<void> {
    const { error } = await this.db.from("app_logs").insert({
      level: entry.level,
      source: entry.source ?? null,
      message: entry.message,
      context: entry.context ?? {},
      user_id: entry.userId ?? null,
    });
    if (error) throw error;
  }

  // ── Addresses ─────────────────────────────────────────────────────────

  async getAddresses(userId: string): Promise<AddressRecord[]> {
    const { data, error } = await this.db
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapAddressRow);
  }

  async upsertAddress(a: AddressRecord): Promise<AddressRecord> {
    // Si esta dirección se marca como default, desmarcamos las demás del usuario.
    if (a.isDefault) {
      await this.db
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", a.userId)
        .neq("id", a.id);
    }
    const { data, error } = await this.db.from("addresses").upsert({
      id: a.id,
      user_id: a.userId,
      label: a.label,
      recipient: a.recipient,
      street: a.street,
      floor: a.floor ?? null,
      postal_code: a.postalCode,
      city: a.city,
      province: a.province,
      country: a.country,
      phone: a.phone ?? null,
      is_default: a.isDefault,
      updated_at: new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return mapAddressRow(data);
  }

  async deleteAddress(id: string): Promise<void> {
    const { error } = await this.db.from("addresses").delete().eq("id", id);
    if (error) throw error;
  }

  // ── Company profile ───────────────────────────────────────────────────

  async getCompanyProfile(userId: string): Promise<CompanyProfileRecord | null> {
    const { data, error } = await this.db
      .from("company_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return mapCompanyProfileRow(data);
  }

  async upsertCompanyProfile(p: CompanyProfileRecord): Promise<CompanyProfileRecord> {
    const { data, error } = await this.db.from("company_profiles").upsert({
      id: p.id,
      user_id: p.userId,
      cif: p.cif,
      legal_name: p.legalName,
      fiscal_address: p.fiscalAddress,
      contact_person: p.contactPerson,
      company_phone: p.companyPhone ?? null,
      billing_email: p.billingEmail ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }).select().single();
    if (error) throw error;
    return mapCompanyProfileRow(data);
  }

  async deleteCompanyProfile(userId: string): Promise<void> {
    const { error } = await this.db
      .from("company_profiles")
      .delete()
      .eq("user_id", userId);
    if (error) throw error;
  }
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
    nif: asOpt<string>(row.tax_id),
    nifType: ((): UserRecord["nifType"] => {
      const t = asOpt<string>(row.tax_id_type);
      return t === "DNI" || t === "NIE" || t === "CIF" ? t : undefined;
    })(),
    referralCode: asOpt<string>(row.referral_code),
    referredBy: asOpt<string>(row.referred_by),
    birthDate: asOpt<string>(row.birth_date),
    emailVerified: row.email_verified === true || row.email_verified === "true"
      ? true
      : row.email_verified === false || row.email_verified === "false"
        ? false
        : undefined,
    emailVerifiedAt: asOpt<string>(row.email_verified_at),
    lastSeenAt: asOpt<string>(row.last_seen_at),
    createdAt: asStr(row.created_at),
    updatedAt: asStr(row.updated_at),
  };
}

function mapCouponRow(row: DbRow): CouponRecord {
  return {
    id: asStr(row.id),
    code: asStr(row.code),
    discountType: row.discount_type as CouponRecord["discountType"],
    discountValue: asNum(row.discount_value),
    minOrder: asNum(row.min_order),
    maxUses: row.max_uses === null || row.max_uses === undefined
      ? undefined
      : Number(row.max_uses),
    maxPerUser: Number(row.max_per_user ?? 1),
    usedCount: Number(row.used_count ?? 0),
    validFrom: asStr(row.valid_from),
    validUntil: asOpt<string>(row.valid_until),
    isActive: Boolean(row.is_active),
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

function mapProductRow(row: DbRow): ProductRecord {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const images = Array.isArray(row.images) ? (row.images as string[]) : [];
  return {
    id: Number(row.id),
    slug: asStr(row.slug),
    categoryId: asStr(row.category_id),
    name: asStr(row.name),
    shortDescription: asOpt<string>(row.short_description),
    description: asOpt<string>(row.description),
    price: asNum(row.price),
    salePrice: row.sale_price === null || row.sale_price === undefined ? undefined : asNum(row.sale_price),
    vatRate: asNum(row.vat_rate),
    stock: Number(row.stock ?? 0),
    maxPerUser: row.max_per_user === null || row.max_per_user === undefined ? undefined : Number(row.max_per_user),
    maxPerClient: typeof meta.maxPerClient === "number" ? meta.maxPerClient : undefined,
    maxPerWholesaler: typeof meta.maxPerWholesaler === "number" ? meta.maxPerWholesaler : undefined,
    maxPerStore: typeof meta.maxPerStore === "number" ? meta.maxPerStore : undefined,
    language: asOpt<string>(row.language),
    barcode: asOpt<string>(row.barcode),
    images,
    metadata: meta,
    createdAt: asStr(row.created_at),
    updatedAt: asStr(row.updated_at),
    deletedAt: asOpt<string>(row.deleted_at),
  };
}

function mapCategoryRow(row: DbRow): CategoryRecord {
  return {
    id: asStr(row.id),
    parentId: asOpt<string>(row.parent_id),
    slug: asStr(row.slug),
    name: asStr(row.name),
    description: asOpt<string>(row.description),
    emoji: asOpt<string>(row.emoji),
    color: asOpt<string>(row.color),
    bgColor: asOpt<string>(row.bg_color),
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active),
  };
}

function mapIncidentRow(row: DbRow): IncidentRecord {
  return {
    id: asStr(row.id),
    orderId: asStr(row.order_id),
    userId: asOpt<string>(row.user_id),
    status: row.status as IncidentRecord["status"],
    category: asStr(row.category),
    title: asStr(row.title),
    body: asStr(row.body),
    adminNote: asOpt<string>(row.admin_note),
    createdAt: asStr(row.created_at),
    updatedAt: asStr(row.updated_at),
  };
}

function mapReturnRow(row: DbRow): ReturnRecord {
  const items = Array.isArray(row.return_items) ? (row.return_items as DbRow[]) : [];
  return {
    id: asStr(row.id),
    rmaNumber: asStr(row.rma_number),
    orderId: asStr(row.order_id),
    userId: asOpt<string>(row.user_id),
    status: asStr(row.status),
    customerNote: asOpt<string>(row.customer_note),
    adminNote: asOpt<string>(row.admin_note),
    refundAmount: row.refund_amount === null || row.refund_amount === undefined ? undefined : asNum(row.refund_amount),
    trackingNumber: asOpt<string>(row.tracking_number),
    rectificativeId: asOpt<string>(row.rectificative_id),
    items: items.map((it) => ({
      productId: Number(it.product_id),
      quantity: Number(it.quantity),
      unitPrice: asNum(it.unit_price),
      reason: asStr(it.reason),
      reasonDetail: asOpt<string>(it.reason_detail),
    })),
    createdAt: asStr(row.created_at),
    updatedAt: asStr(row.updated_at),
  };
}

function mapMessageRow(row: DbRow): MessageRecord {
  return {
    id: asStr(row.id),
    fromUserId: asOpt<string>(row.from_user_id),
    toUserId: asOpt<string>(row.to_user_id),
    orderId: asOpt<string>(row.order_id),
    subject: asStr(row.subject),
    body: asStr(row.body),
    isRead: Boolean(row.is_read),
    parentId: asOpt<string>(row.parent_id),
    isBroadcast: Boolean(row.is_broadcast),
    broadcastId: asOpt<string>(row.broadcast_id),
    createdAt: asStr(row.created_at),
  };
}

function mapNotificationRow(row: DbRow): NotificationRecord {
  return {
    id: asStr(row.id),
    scope: row.scope as NotificationRecord["scope"],
    userId: asOpt<string>(row.user_id),
    type: asStr(row.type),
    title: asStr(row.title),
    message: asStr(row.message),
    link: asOpt<string>(row.link),
    isRead: Boolean(row.is_read),
    createdAt: asStr(row.created_at),
  };
}

function mapGroupRow(row: DbRow): GroupRecord {
  return {
    id: asStr(row.id),
    ownerId: asStr(row.owner_id),
    name: asStr(row.name),
    createdAt: asStr(row.created_at),
    updatedAt: asStr(row.updated_at),
  };
}

function mapGroupMemberRow(row: DbRow): GroupMemberRecord {
  return {
    groupId: asStr(row.group_id),
    userId: asStr(row.user_id),
    role: row.role as GroupMemberRecord["role"],
    joinedAt: asStr(row.joined_at),
    leftAt: asOpt<string>(row.left_at),
    cooldownUntil: asOpt<string>(row.cooldown_until),
  };
}

function mapGroupInviteRow(row: DbRow): GroupInviteRecord {
  return {
    id: asStr(row.id),
    groupId: asStr(row.group_id),
    invitedBy: asOpt<string>(row.invited_by),
    invitedEmail: asStr(row.invited_email),
    inviteCode: asStr(row.invite_code),
    status: row.status as GroupInviteRecord["status"],
    expiresAt: asStr(row.expires_at),
    respondedAt: asOpt<string>(row.responded_at),
    createdAt: asStr(row.created_at),
  };
}

function mapReviewRow(row: DbRow): ReviewRecord {
  return {
    id: asStr(row.id),
    userId: asStr(row.user_id),
    productId: Number(row.product_id),
    orderId: asOpt<string>(row.order_id),
    rating: row.rating === null || row.rating === undefined ? undefined : Number(row.rating),
    title: asOpt<string>(row.title),
    body: asOpt<string>(row.body),
    isApproved: Boolean(row.is_approved),
    createdAt: asStr(row.created_at),
  };
}

function mapComplaintRow(row: DbRow): ComplaintRecord {
  return {
    id: asStr(row.id),
    userId: asOpt<string>(row.user_id),
    orderId: asOpt<string>(row.order_id),
    claimantName: asStr(row.claimant_name),
    claimantEmail: asStr(row.claimant_email),
    claimantTaxId: asOpt<string>(row.claimant_tax_id),
    claimantAddress: asOpt<string>(row.claimant_address),
    status: row.status as ComplaintRecord["status"],
    facts: asStr(row.facts),
    claim: asStr(row.claim),
    resolution: asOpt<string>(row.resolution),
    pdfUrl: asOpt<string>(row.pdf_url),
    createdAt: asStr(row.created_at),
    updatedAt: asStr(row.updated_at),
  };
}

function mapSolicitudRow(row: DbRow): SolicitudRecord {
  return {
    id: asStr(row.id),
    type: row.type as SolicitudRecord["type"],
    companyName: asStr(row.company_name),
    cif: asOpt<string>(row.cif),
    contactName: asStr(row.contact_name),
    contactEmail: asStr(row.contact_email),
    contactPhone: asOpt<string>(row.contact_phone),
    volume: asOpt<string>(row.volume),
    games: Array.isArray(row.games) ? (row.games as string[]) : [],
    message: asOpt<string>(row.message),
    status: asStr(row.status),
    adminNote: asOpt<string>(row.admin_note),
    createdAt: asStr(row.created_at),
    updatedAt: asStr(row.updated_at),
  };
}

function mapAddressRow(row: DbRow): AddressRecord {
  return {
    id: asStr(row.id),
    userId: asStr(row.user_id),
    label: asStr(row.label),
    recipient: asStr(row.recipient),
    street: asStr(row.street),
    floor: asOpt<string>(row.floor),
    postalCode: asStr(row.postal_code),
    city: asStr(row.city),
    province: asStr(row.province),
    country: asStr(row.country),
    phone: asOpt<string>(row.phone),
    isDefault: Boolean(row.is_default),
  };
}

function mapCompanyProfileRow(row: DbRow): CompanyProfileRecord {
  return {
    id: asStr(row.id),
    userId: asStr(row.user_id),
    cif: asStr(row.cif),
    legalName: asStr(row.legal_name),
    fiscalAddress: asStr(row.fiscal_address),
    contactPerson: asStr(row.contact_person),
    companyPhone: asOpt<string>(row.company_phone),
    billingEmail: asOpt<string>(row.billing_email),
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
