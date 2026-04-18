/**
 * Analytics service — business intelligence from localStorage data.
 *
 * All functions read from localStorage and handle missing/empty data gracefully.
 */

import { getMergedProducts } from "@/lib/productStore";
import { readAdminOrdersMerged } from "@/lib/orderAdapter";

// ─── Storage keys ───────────────────────────────────────────────────────────

const ORDERS_KEY = "tcgacademy_orders";
const ADMIN_ORDERS_KEY = "tcgacademy_admin_orders";
const REGISTERED_KEY = "tcgacademy_registered";

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrderRecord {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  date: string;
  status?: string;
  adminStatus?: string;
  items: Array<{
    id: number;
    name: string;
    qty: number;
    price: number;
    game?: string;
  }>;
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod?: string;
  address?: string;
  incident?: Record<string, unknown>;
}

export interface RevenueSummary {
  total: number;
  byGame: Record<string, number>;
  byCategory: Record<string, number>;
  byRole: Record<string, number>;
  byPaymentMethod: Record<string, number>;
}

export interface OrderMetrics {
  totalOrders: number;
  avgOrderValue: number;
  avgItemsPerOrder: number;
  returnRate: number;
  incidentRate: number;
  conversionRate: number;
}

export interface TopProduct {
  id: number;
  name: string;
  totalQty: number;
  totalRevenue: number;
}

export interface TopCustomer {
  userId: string;
  name: string;
  totalSpent: number;
  orderCount: number;
}

export interface StockReportItem {
  id: number;
  name: string;
  game: string;
  stock: number;
  status: "ok" | "low" | "out";
}

export interface DailyRevenueEntry {
  date: string;
  revenue: number;
  orders: number;
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function loadOrders(): OrderRecord[] {
  if (typeof window === "undefined") return [];
  try {
    // Fuente unificada: merge admin + orphan recovery desde checkout.
    // Así todos los paneles leen lo mismo — no hay contadores aislados.
    const merged = readAdminOrdersMerged([]);
    if (merged.length > 0) return merged as unknown as OrderRecord[];
    // Fallback adicional (ambos vacíos)
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OrderRecord[];
  } catch {
    return [];
  }
}

// Silencia warnings de imports no usados tras refactor (se dejan por si otros
// callers leen directo las claves en el futuro).
void ADMIN_ORDERS_KEY;

function isInRange(
  dateStr: string,
  from?: string,
  to?: string,
): boolean {
  if (!from && !to) return true;
  const d = dateStr.slice(0, 10); // YYYY-MM-DD
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function extractProvincia(address: string): string {
  if (!address) return "Desconocida";
  // Common format: "Calle X, 28001 Madrid" or "..., Ciudad, Provincia"
  const parts = address.split(",").map((s) => s.trim());
  // Try to find a part that looks like a city/province (last or second-to-last)
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    // Remove postal code if present
    const cleaned = last.replace(/\d{5}\s*/, "").trim();
    return cleaned || "Desconocida";
  }
  return "Desconocida";
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Revenue breakdown by game, category, role, and payment method.
 */
export function getRevenueSummary(
  dateFrom?: string,
  dateTo?: string,
): RevenueSummary {
  const orders = loadOrders();
  const filtered = orders.filter((o) => isInRange(o.date, dateFrom, dateTo));

  const byGame: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byRole: Record<string, number> = {};
  const byPaymentMethod: Record<string, number> = {};
  let total = 0;

  for (const order of filtered) {
    total += order.total;

    // By role
    const role = order.userRole ?? "cliente";
    byRole[role] = (byRole[role] ?? 0) + order.total;

    // By payment method
    const pm = order.paymentMethod ?? "Desconocido";
    byPaymentMethod[pm] = (byPaymentMethod[pm] ?? 0) + order.total;

    // By game (from items)
    for (const item of order.items) {
      const game = item.game ?? "otros";
      const itemTotal = item.price * item.qty;
      byGame[game] = (byGame[game] ?? 0) + itemTotal;
    }
  }

  // Categories — match products by ID to get category
  const products = getMergedProducts();
  const productCategoryMap = new Map<number, string>();
  for (const p of products) {
    productCategoryMap.set(p.id, p.category);
  }
  for (const order of filtered) {
    for (const item of order.items) {
      const cat = productCategoryMap.get(item.id) ?? "otros";
      const itemTotal = item.price * item.qty;
      byCategory[cat] = (byCategory[cat] ?? 0) + itemTotal;
    }
  }

  return {
    total: Math.round(total * 100) / 100,
    byGame,
    byCategory,
    byRole,
    byPaymentMethod,
  };
}

/**
 * Key order metrics: totals, averages, rates.
 */
export function getOrderMetrics(): OrderMetrics {
  const orders = loadOrders();
  const totalOrders = orders.length;

  if (totalOrders === 0) {
    return {
      totalOrders: 0,
      avgOrderValue: 0,
      avgItemsPerOrder: 0,
      returnRate: 0,
      incidentRate: 0,
      conversionRate: 0,
    };
  }

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalItems = orders.reduce(
    (s, o) => s + o.items.reduce((si, item) => si + item.qty, 0),
    0,
  );

  const returns = orders.filter(
    (o) => o.adminStatus === "devolucion" || o.status === "devolucion",
  ).length;
  const incidents = orders.filter(
    (o) =>
      o.adminStatus === "incidencia" ||
      o.status === "incidencia" ||
      o.incident,
  ).length;

  return {
    totalOrders,
    avgOrderValue: Math.round((totalRevenue / totalOrders) * 100) / 100,
    avgItemsPerOrder: Math.round((totalItems / totalOrders) * 100) / 100,
    returnRate: Math.round((returns / totalOrders) * 10000) / 100,
    incidentRate: Math.round((incidents / totalOrders) * 10000) / 100,
    conversionRate: 0, // Requires session tracking — not available in localStorage
  };
}

/**
 * Top-selling products by quantity and revenue.
 */
export function getTopProducts(limit = 10): TopProduct[] {
  const orders = loadOrders();
  const productMap = new Map<number, TopProduct>();

  for (const order of orders) {
    for (const item of order.items) {
      const existing = productMap.get(item.id);
      if (existing) {
        existing.totalQty += item.qty;
        existing.totalRevenue += item.price * item.qty;
      } else {
        productMap.set(item.id, {
          id: item.id,
          name: item.name,
          totalQty: item.qty,
          totalRevenue: item.price * item.qty,
        });
      }
    }
  }

  return Array.from(productMap.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}

/**
 * Top customers by total spend.
 */
export function getTopCustomers(limit = 10): TopCustomer[] {
  const orders = loadOrders();
  const customerMap = new Map<string, TopCustomer>();

  for (const order of orders) {
    const uid = order.userId ?? order.userEmail ?? "unknown";
    const name = order.userName ?? order.userEmail ?? uid;

    const existing = customerMap.get(uid);
    if (existing) {
      existing.totalSpent += order.total;
      existing.orderCount += 1;
    } else {
      customerMap.set(uid, {
        userId: uid,
        name,
        totalSpent: order.total,
        orderCount: 1,
      });
    }
  }

  return Array.from(customerMap.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);
}

/**
 * Geographic distribution of orders by provincia.
 */
export function getGeographicDistribution(): Record<string, number> {
  const orders = loadOrders();
  const distribution: Record<string, number> = {};

  for (const order of orders) {
    const provincia = extractProvincia(order.address ?? "");
    distribution[provincia] = (distribution[provincia] ?? 0) + 1;
  }

  return distribution;
}

/**
 * Stock report for all products.
 */
export function getStockReport(): StockReportItem[] {
  const products = getMergedProducts();

  return products.map((p) => {
    const stockCount = p.stock ?? (p.inStock ? 999 : 0);
    let status: "ok" | "low" | "out" = "ok";
    if (stockCount === 0 || !p.inStock) {
      status = "out";
    } else if (stockCount <= 5) {
      status = "low";
    }

    return {
      id: p.id,
      name: p.name,
      game: p.game,
      stock: stockCount,
      status,
    };
  });
}

/**
 * Daily revenue and order count for the last N days.
 */
export function getDailyRevenue(days = 30): DailyRevenueEntry[] {
  const orders = loadOrders();
  const result: DailyRevenueEntry[] = [];

  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const dayOrders = orders.filter(
      (o) => o.date.slice(0, 10) === dateStr,
    );

    result.push({
      date: dateStr,
      revenue:
        Math.round(
          dayOrders.reduce((s, o) => s + o.total, 0) * 100,
        ) / 100,
      orders: dayOrders.length,
    });
  }

  return result;
}

// ─── Live user & alert counters (unificados con el resto del admin) ────────

export interface LiveUserStats {
  total: number;
  active: number;
  newInPeriod: (days: number) => number;
}

/**
 * Combina `tcgacademy_registered` (seed + registros reales) en un único conjunto
 * deduplicado por email. Es la MISMA fuente que usa /admin/usuarios.
 */
interface RegisteredUser {
  id?: string;
  email?: string;
  active?: boolean;
  createdAt?: string;
}

export function getLiveUsers(): RegisteredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REGISTERED_KEY);
    if (!raw) return [];
    const obj = JSON.parse(raw) as Record<string, { user?: RegisteredUser }>;
    return Object.values(obj)
      .map((entry) => entry.user)
      .filter((u): u is RegisteredUser => Boolean(u));
  } catch {
    return [];
  }
}

export function getLiveUserStats(): LiveUserStats {
  const users = getLiveUsers();
  return {
    total: users.length,
    active: users.filter((u) => u.active !== false).length,
    newInPeriod: (days: number) => {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      return users.filter((u) => {
        if (!u.createdAt) return false;
        const t = new Date(u.createdAt).getTime();
        return Number.isFinite(t) && t >= cutoff;
      }).length;
    },
  };
}

/**
 * Cuenta pedidos que requieren atención del admin.
 * MISMA definición que el badge de /admin/pedidos — evita contadores que no cuadran.
 */
export function countPendingAdminOrders(): number {
  const orders = loadOrders();
  return orders.filter(
    (o) => o.adminStatus === "pendiente_envio" || o.status === "pendiente_envio",
  ).length;
}

// ─── Time-series builders (sustituyen a MOCK_SALES_*, MOCK_USERS_*, MOCK_PRODUCTS_*) ─

export type PeriodKey = "7d" | "30d" | "3m" | "1a" | "todo";

const PERIOD_DAYS: Record<PeriodKey, number> = {
  "7d": 7,
  "30d": 30,
  "3m": 90,
  "1a": 365,
  "todo": 365 * 3, // cap "todo" a 3 años para UI sensata
};

const DOW_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatDayLabel(d: Date, period: PeriodKey): string {
  if (period === "7d") return DOW_SHORT[d.getDay()];
  if (period === "30d") {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
  }
  if (period === "3m" || period === "1a") {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(2);
    return `${mm}/${yy}`;
  }
  return String(d.getFullYear());
}

function bucketize<T>(
  dates: Date[],
  period: PeriodKey,
  aggregator: (bucketStart: Date, bucketEnd: Date) => T,
): Array<T & { day: string }> {
  const result: Array<T & { day: string }> = [];
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  void dates;

  if (period === "7d") {
    for (let i = 6; i >= 0; i--) {
      const day = new Date(end);
      day.setDate(end.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      const agg = aggregator(day, next);
      result.push({ ...agg, day: formatDayLabel(day, period) });
    }
  } else if (period === "30d") {
    for (let i = 29; i >= 0; i--) {
      const day = new Date(end);
      day.setDate(end.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      const agg = aggregator(day, next);
      result.push({ ...agg, day: formatDayLabel(day, period) });
    }
  } else if (period === "3m") {
    // 12 buckets semanales
    for (let i = 11; i >= 0; i--) {
      const day = new Date(end);
      day.setDate(end.getDate() - i * 7);
      day.setHours(0, 0, 0, 0);
      const next = new Date(day);
      next.setDate(day.getDate() + 7);
      const agg = aggregator(day, next);
      result.push({ ...agg, day: formatDayLabel(day, period) });
    }
  } else if (period === "1a") {
    // 12 buckets mensuales
    for (let i = 11; i >= 0; i--) {
      const day = new Date(end.getFullYear(), end.getMonth() - i, 1);
      const next = new Date(day.getFullYear(), day.getMonth() + 1, 1);
      const agg = aggregator(day, next);
      result.push({ ...agg, day: formatDayLabel(day, period) });
    }
  } else {
    // "todo": 1 bucket por año, máx 3 años
    const startYear = end.getFullYear() - 2;
    for (let y = startYear; y <= end.getFullYear(); y++) {
      const day = new Date(y, 0, 1);
      const next = new Date(y + 1, 0, 1);
      const agg = aggregator(day, next);
      result.push({ ...agg, day: formatDayLabel(day, period) });
    }
  }
  return result;
}

export interface SalesPoint { day: string; sales: number; orders: number }
export interface UsersPoint { day: string; newUsers: number; totalUsers: number }
export interface ProductsPoint { day: string; newProducts: number; totalProducts: number }

/** Serie de ventas real (€ + nº de pedidos) agregada por bucket del periodo. */
export function buildSalesSeries(period: PeriodKey): SalesPoint[] {
  const orders = loadOrders();
  return bucketize([], period, (start, end) => {
    const sales = orders
      .filter((o) => {
        const t = new Date(o.date).getTime();
        return t >= start.getTime() && t < end.getTime();
      })
      .reduce((s, o) => s + (Number(o.total) || 0), 0);
    const count = orders.filter((o) => {
      const t = new Date(o.date).getTime();
      return t >= start.getTime() && t < end.getTime();
    }).length;
    return { sales: Math.round(sales * 100) / 100, orders: count };
  });
}

/** Serie de usuarios real — totales acumulados + altas nuevas por bucket. */
export function buildUsersSeries(period: PeriodKey): UsersPoint[] {
  const users = getLiveUsers();
  const parsed = users
    .map((u) => (u.createdAt ? new Date(u.createdAt).getTime() : NaN))
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);

  return bucketize([], period, (start, end) => {
    const newUsers = parsed.filter((t) => t >= start.getTime() && t < end.getTime()).length;
    const totalUsers = parsed.filter((t) => t < end.getTime()).length;
    return { newUsers, totalUsers };
  });
}

/** Serie de productos — total catálogo + altas nuevas (usa createdAt). */
export function buildProductsSeries(period: PeriodKey): ProductsPoint[] {
  const products = getMergedProducts();
  const created = products
    .map((p) => (p.createdAt ? new Date(p.createdAt).getTime() : NaN))
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  const totalNow = products.length;

  return bucketize([], period, (start, end) => {
    const newProducts = created.filter(
      (t) => t >= start.getTime() && t < end.getTime(),
    ).length;
    const countedUpToEnd = created.filter((t) => t < end.getTime()).length;
    // Si no hay createdAt fiable para todos, usamos catálogo total como tope.
    const totalProducts = Math.max(countedUpToEnd, Math.min(totalNow, countedUpToEnd || totalNow));
    return { newProducts, totalProducts };
  });
}
