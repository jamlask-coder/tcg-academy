/**
 * Analytics service — business intelligence from localStorage data.
 *
 * All functions read from localStorage and handle missing/empty data gracefully.
 */

import { getMergedProducts } from "@/lib/productStore";

// ─── Storage keys ───────────────────────────────────────────────────────────

const ORDERS_KEY = "tcgacademy_orders";
const ADMIN_ORDERS_KEY = "tcgacademy_admin_orders";

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
    // Prefer admin orders (more complete data)
    const adminRaw = localStorage.getItem(ADMIN_ORDERS_KEY);
    if (adminRaw) {
      const parsed = JSON.parse(adminRaw) as OrderRecord[];
      if (parsed.length > 0) return parsed;
    }
    // Fall back to client orders
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OrderRecord[];
  } catch {
    return [];
  }
}

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
