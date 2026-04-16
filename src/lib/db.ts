/**
 * Database abstraction layer with adapter pattern.
 *
 * Local mode: localStorage (demo / static export).
 * Server mode: stub ready for Supabase integration.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OrderRecord {
  id: string;
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  shippingMethod: string;
  paymentMethod: string;
  shippingAddress: ShippingAddress;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface ShippingAddress {
  direccion: string;
  cp: string;
  ciudad: string;
  provincia?: string;
}

export type OrderStatus =
  | "pendiente"
  | "procesando"
  | "enviado"
  | "entregado"
  | "cancelado"
  | "devuelto";

export interface UserRecord {
  id: string;
  name: string;
  lastName: string;
  email: string;
  role: "user" | "admin" | "wholesale";
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  orderId: string;
  customerEmail: string;
  total: number;
  vatAmount: number;
  status: string;
  createdAt: string;
}

export interface SettingsRecord {
  key: string;
  value: string;
  updatedAt: string;
}

// ─── Adapter interface ──────────────────────────────────────────────────────

export interface DbAdapter {
  getOrders(): Promise<OrderRecord[]>;
  createOrder(order: OrderRecord): Promise<OrderRecord>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>;

  getUser(userId: string): Promise<UserRecord | null>;
  getUserByEmail(email: string): Promise<UserRecord | null>;
  createUser(user: UserRecord): Promise<UserRecord>;
  updateUser(userId: string, data: Partial<UserRecord>): Promise<void>;

  getInvoices(): Promise<InvoiceRecord[]>;
  createInvoice(invoice: InvoiceRecord): Promise<InvoiceRecord>;

  getSettings(): Promise<SettingsRecord[]>;
  updateSettings(key: string, value: string): Promise<void>;
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
  user: { id: string; name: string; lastName: string; email: string };
}

export class LocalDbAdapter implements DbAdapter {
  async getOrders(): Promise<OrderRecord[]> {
    return readStorage<OrderRecord[]>(KEYS.orders, []);
  }

  async createOrder(order: OrderRecord): Promise<OrderRecord> {
    const orders = readStorage<OrderRecord[]>(KEYS.orders, []);
    orders.push(order);
    writeStorage(KEYS.orders, orders);
    return order;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const orders = readStorage<OrderRecord[]>(KEYS.orders, []);
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      orders[idx].status = status;
      orders[idx].updatedAt = new Date().toISOString();
      writeStorage(KEYS.orders, orders);
    }
  }

  async getUser(userId: string): Promise<UserRecord | null> {
    const registered = readStorage<Record<string, RegisteredEntry>>(KEYS.users, {});
    for (const [email, entry] of Object.entries(registered)) {
      if (entry.user.id === userId) {
        return {
          id: entry.user.id,
          name: entry.user.name,
          lastName: entry.user.lastName,
          email,
          role: "user",
          createdAt: "",
          updatedAt: "",
        };
      }
    }
    return null;
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const registered = readStorage<Record<string, RegisteredEntry>>(KEYS.users, {});
    const entry = registered[email];
    if (!entry) return null;
    return {
      id: entry.user.id,
      name: entry.user.name,
      lastName: entry.user.lastName,
      email,
      role: "user",
      createdAt: "",
      updatedAt: "",
    };
  }

  async createUser(user: UserRecord): Promise<UserRecord> {
    const registered = readStorage<Record<string, RegisteredEntry>>(KEYS.users, {});
    registered[user.email] = {
      password: "",
      user: { id: user.id, name: user.name, lastName: user.lastName, email: user.email },
    };
    writeStorage(KEYS.users, registered);
    return user;
  }

  async updateUser(userId: string, data: Partial<UserRecord>): Promise<void> {
    const registered = readStorage<Record<string, RegisteredEntry>>(KEYS.users, {});
    for (const [email, entry] of Object.entries(registered)) {
      if (entry.user.id === userId) {
        if (data.name) entry.user.name = data.name;
        if (data.lastName) entry.user.lastName = data.lastName;
        if (data.email) entry.user.email = data.email;
        registered[email] = entry;
        writeStorage(KEYS.users, registered);
        return;
      }
    }
  }

  async getInvoices(): Promise<InvoiceRecord[]> {
    return readStorage<InvoiceRecord[]>(KEYS.invoices, []);
  }

  async createInvoice(invoice: InvoiceRecord): Promise<InvoiceRecord> {
    const invoices = readStorage<InvoiceRecord[]>(KEYS.invoices, []);
    invoices.push(invoice);
    writeStorage(KEYS.invoices, invoices);
    return invoice;
  }

  async getSettings(): Promise<SettingsRecord[]> {
    return readStorage<SettingsRecord[]>(KEYS.settings, []);
  }

  async updateSettings(key: string, value: string): Promise<void> {
    const settings = readStorage<SettingsRecord[]>(KEYS.settings, []);
    const idx = settings.findIndex((s) => s.key === key);
    const record: SettingsRecord = { key, value, updatedAt: new Date().toISOString() };
    if (idx !== -1) {
      settings[idx] = record;
    } else {
      settings.push(record);
    }
    writeStorage(KEYS.settings, settings);
  }
}

// ─── Server adapter (stub for Supabase) ────────────────────────────────────

function serverWarning(method: string): void {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.warn(`[ServerDbAdapter] ${method}: Server mode not configured`);
  }
}

export class ServerDbAdapter implements DbAdapter {
  // TODO: Replace with Supabase client calls
  // import { createClient } from '@supabase/supabase-js'
  // const supabase = createClient(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  // )

  async getOrders(): Promise<OrderRecord[]> {
    serverWarning("getOrders");
    return [];
  }

  async createOrder(order: OrderRecord): Promise<OrderRecord> {
    serverWarning("createOrder");
    return order;
  }

  async updateOrderStatus(_orderId: string, _status: OrderStatus): Promise<void> {
    serverWarning("updateOrderStatus");
  }

  async getUser(_userId: string): Promise<UserRecord | null> {
    serverWarning("getUser");
    return null;
  }

  async getUserByEmail(_email: string): Promise<UserRecord | null> {
    serverWarning("getUserByEmail");
    return null;
  }

  async createUser(user: UserRecord): Promise<UserRecord> {
    serverWarning("createUser");
    return user;
  }

  async updateUser(_userId: string, _data: Partial<UserRecord>): Promise<void> {
    serverWarning("updateUser");
  }

  async getInvoices(): Promise<InvoiceRecord[]> {
    serverWarning("getInvoices");
    return [];
  }

  async createInvoice(invoice: InvoiceRecord): Promise<InvoiceRecord> {
    serverWarning("createInvoice");
    return invoice;
  }

  async getSettings(): Promise<SettingsRecord[]> {
    serverWarning("getSettings");
    return [];
  }

  async updateSettings(_key: string, _value: string): Promise<void> {
    serverWarning("updateSettings");
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

let _instance: DbAdapter | null = null;

export function getDb(): DbAdapter {
  if (_instance) return _instance;

  const mode = process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local";
  _instance = mode === "server" ? new ServerDbAdapter() : new LocalDbAdapter();
  return _instance;
}
