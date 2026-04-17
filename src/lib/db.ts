/**
 * Database abstraction layer with adapter pattern.
 *
 * Local mode: localStorage (demo / static export).
 * Server mode: Supabase (PostgreSQL).
 */

import { getSupabaseAdmin } from "@/lib/supabase";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OrderRecord {
  id: string;
  userId?: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  couponCode?: string;
  couponDiscount?: number;
  pointsDiscount?: number;
  total: number;
  status: OrderStatus;
  shippingMethod: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentIntent?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  notes?: string;
  shippingAddress: ShippingAddress;
  tiendaRecogida?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
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

export interface ConsentRecord {
  userId: string;
  type: string;
  status: "granted" | "revoked";
  method: string;
  version: string;
  ipAddress?: string;
  userAgent?: string;
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
  async createConsent(_consent: ConsentRecord): Promise<void> { /* handled client-side */ }
  async getConsents(_userId: string): Promise<ConsentRecord[]> { return []; }
  async logAudit(_entry: { entityType: string; entityId: string; action: string }): Promise<void> { /* handled client-side */ }
}

// ─── Server adapter (Supabase) ─────────────────────────────────────────────

export class ServerDbAdapter implements DbAdapter {
  private get db() { return getSupabaseAdmin(); }

  // ── Orders ──────────────────────────────────────────────────────────────

  async getOrders(userId?: string): Promise<OrderRecord[]> {
    let query = this.db.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapOrderRow);
  }

  async getOrder(orderId: string): Promise<OrderRecord | null> {
    const { data, error } = await this.db.from("orders").select("*, order_items(*)").eq("id", orderId).single();
    if (error || !data) return null;
    return mapOrderRow(data);
  }

  async createOrder(order: OrderRecord): Promise<OrderRecord> {
    const { items, ...orderData } = order;
    const { error: orderError } = await this.db.from("orders").insert({
      id: orderData.id,
      user_id: orderData.userId || null,
      customer_email: orderData.customerEmail,
      customer_name: orderData.customerName,
      customer_phone: orderData.customerPhone || null,
      status: orderData.status,
      shipping_method: orderData.shippingMethod,
      shipping_cost: orderData.shippingCost,
      payment_method: orderData.paymentMethod,
      payment_status: orderData.paymentStatus,
      payment_intent: orderData.paymentIntent || null,
      subtotal: orderData.subtotal || orderData.total,
      coupon_code: orderData.couponCode || null,
      coupon_discount: orderData.couponDiscount || 0,
      points_discount: orderData.pointsDiscount || 0,
      total: orderData.total,
      shipping_address: orderData.shippingAddress,
      tienda_recogida: orderData.tiendaRecogida || null,
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
      name: user.name,
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
    if (data.name !== undefined) update.name = data.name;
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
    const { data, error } = await this.db.from("invoices").insert({
      invoice_number: invoice.invoiceNumber,
      order_id: invoice.orderId || null,
      user_id: invoice.userId || null,
      customer_email: invoice.customerEmail,
      customer_name: invoice.customerName,
      customer_nif: invoice.customerNif || null,
      status: invoice.status,
      subtotal: invoice.subtotal,
      vat_rate: invoice.vatRate,
      vat_amount: invoice.vatAmount,
      total: invoice.total,
      hash: invoice.hash || null,
      prev_hash: invoice.prevHash || null,
      data: invoice.data || null,
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
}

// ─── Row mappers ────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapOrderRow(row: any): OrderRecord {
  return {
    id: row.id,
    userId: row.user_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    items: (row.order_items ?? []).map((i: any) => ({
      productId: i.product_id,
      name: i.name,
      quantity: i.quantity,
      unitPrice: parseFloat(i.unit_price),
      imageUrl: i.image_url,
    })),
    subtotal: parseFloat(row.subtotal),
    shippingCost: parseFloat(row.shipping_cost),
    couponCode: row.coupon_code,
    couponDiscount: row.coupon_discount ? parseFloat(row.coupon_discount) : 0,
    pointsDiscount: row.points_discount ? parseFloat(row.points_discount) : 0,
    total: parseFloat(row.total),
    status: row.status,
    shippingMethod: row.shipping_method,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    paymentIntent: row.payment_intent,
    trackingNumber: row.tracking_number,
    trackingUrl: row.tracking_url,
    notes: row.notes,
    shippingAddress: row.shipping_address,
    tiendaRecogida: row.tienda_recogida,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUserRow(row: any): UserRecord {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.password_hash,
    name: row.name,
    lastName: row.last_name,
    phone: row.phone,
    role: row.role,
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    birthDate: row.birth_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInvoiceRow(row: any): InvoiceRecord {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    orderId: row.order_id,
    userId: row.user_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    customerNif: row.customer_nif,
    status: row.status,
    subtotal: parseFloat(row.subtotal),
    vatRate: parseFloat(row.vat_rate),
    vatAmount: parseFloat(row.vat_amount),
    total: parseFloat(row.total),
    hash: row.hash,
    prevHash: row.prev_hash,
    verifactuId: row.verifactu_id,
    data: row.data,
    createdAt: row.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Factory ────────────────────────────────────────────────────────────────

let _instance: DbAdapter | null = null;

export function getDb(): DbAdapter {
  if (_instance) return _instance;
  const mode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";
  _instance = mode === "server" ? new ServerDbAdapter() : new LocalDbAdapter();
  return _instance;
}
