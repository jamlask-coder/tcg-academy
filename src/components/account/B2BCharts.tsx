"use client";
import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Euro,
  ShoppingBag,
  Receipt,
  Package as PackageIcon,
  Trophy,
  Calendar,
} from "lucide-react";
import { GAME_CONFIG } from "@/data/products";

interface OrderData {
  date: string;
  total: number;
  items: { game: string; price: number; qty: number }[];
}

interface Props {
  monthlyData: { month: string; gasto: number }[];
  gameData: { game: string; gasto: number }[];
  roleColor: string;
  orders?: OrderData[];
}

type Period = "1m" | "3m" | "1y" | "all";

const PERIOD_LABELS: { value: Period; label: string }[] = [
  { value: "1m", label: "1 mes" },
  { value: "3m", label: "3 meses" },
  { value: "1y", label: "1 año" },
  { value: "all", label: "Todo" },
];

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function getGameName(slug: string): string {
  return GAME_CONFIG[slug]?.name ?? slug;
}

function getGameColor(slug: string, fallback: string): string {
  return GAME_CONFIG[slug]?.color ?? fallback;
}

function getCutoff(period: Period, now: Date): Date {
  switch (period) {
    case "1m": return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "3m": return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "1y": return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default:   return new Date(2000, 0, 1);
  }
}

function buildMonthlyData(orders: OrderData[], period: Period): { month: string; gasto: number }[] {
  const now = new Date();
  let monthsBack: number;
  switch (period) {
    case "1m": monthsBack = 1; break;
    case "3m": monthsBack = 3; break;
    case "1y": monthsBack = 12; break;
    default: monthsBack = 24; break;
  }

  const buckets: { month: string; key: string }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({ month: MONTH_NAMES[d.getMonth()], key });
  }

  const spend: Record<string, number> = {};
  for (const { key } of buckets) spend[key] = 0;
  for (const order of orders) {
    const key = order.date.slice(0, 7);
    if (key in spend) spend[key] += order.total;
  }

  return buckets.map(({ month, key }) => ({ month, gasto: Math.round(spend[key] * 100) / 100 }));
}

function buildGameData(orders: OrderData[]): { game: string; gasto: number }[] {
  const gameSpend: Record<string, number> = {};
  for (const order of orders) {
    for (const item of order.items) {
      if (item.game) {
        gameSpend[item.game] = (gameSpend[item.game] ?? 0) + item.price * item.qty;
      }
    }
  }

  return Object.entries(gameSpend)
    .map(([game, gasto]) => ({ game, gasto: Math.round(gasto * 100) / 100 }))
    .sort((a, b) => b.gasto - a.gasto)
    .slice(0, 6);
}

function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export function B2BCharts({ monthlyData, gameData, roleColor, orders }: Props) {
  const [period, setPeriod] = useState<Period>("all");
  const hasOrders = !!orders && orders.length > 0;

  // Orders filtered by the selected period
  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const cutoff = getCutoff(period, new Date());
    return orders.filter((o) => new Date(o.date) >= cutoff);
  }, [orders, period]);

  const chartMonthly = useMemo(() => {
    if (!hasOrders) return monthlyData;
    return buildMonthlyData(orders ?? [], period);
  }, [orders, hasOrders, period, monthlyData]);

  const chartGame = useMemo(() => {
    if (!hasOrders) return gameData;
    return buildGameData(filteredOrders);
  }, [filteredOrders, hasOrders, gameData]);

  // KPIs computed from period-filtered orders
  const kpis = useMemo(() => {
    if (!hasOrders) {
      return {
        totalSpent: 0,
        orderCount: 0,
        avgTicket: 0,
        totalUnits: 0,
        topGame: null as null | { slug: string; gasto: number },
        lastOrderDate: null as null | string,
      };
    }
    const totalSpent = filteredOrders.reduce((s, o) => s + o.total, 0);
    const orderCount = filteredOrders.length;
    const avgTicket = orderCount > 0 ? totalSpent / orderCount : 0;
    const totalUnits = filteredOrders.reduce(
      (s, o) => s + o.items.reduce((u, it) => u + (it.qty ?? 0), 0),
      0,
    );
    const games = buildGameData(filteredOrders);
    const topGame = games.length > 0 ? { slug: games[0].game, gasto: games[0].gasto } : null;
    const lastOrderDate =
      orderCount > 0
        ? filteredOrders
            .slice()
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
        : null;
    return { totalSpent, orderCount, avgTicket, totalUnits, topGame, lastOrderDate };
  }, [filteredOrders, hasOrders]);

  const total = chartGame.reduce((s, d) => s + d.gasto, 0);

  const kpiCards = [
    {
      label: "Total gastado",
      value: `${kpis.totalSpent.toFixed(2)} €`,
      icon: Euro,
      color: roleColor,
    },
    {
      label: "Nº pedidos",
      value: String(kpis.orderCount),
      icon: ShoppingBag,
      color: "#7c3aed",
    },
    {
      label: "Ticket medio",
      value: `${kpis.avgTicket.toFixed(2)} €`,
      icon: Receipt,
      color: "#0891b2",
    },
    {
      label: "Unidades compradas",
      value: String(kpis.totalUnits),
      icon: PackageIcon,
      color: "#16a34a",
    },
    {
      label: "Juego favorito",
      value: kpis.topGame ? getGameName(kpis.topGame.slug) : "—",
      icon: Trophy,
      color: kpis.topGame ? getGameColor(kpis.topGame.slug, roleColor) : "#f59e0b",
    },
    {
      label: "Último pedido",
      value: kpis.lastOrderDate ? formatShortDate(kpis.lastOrderDate) : "—",
      icon: Calendar,
      color: "#dc2626",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Period selector */}
      {hasOrders && (
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
          {PERIOD_LABELS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              aria-pressed={period === value}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                period === value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* KPI grid */}
      {hasOrders && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {kpiCards.map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <div
                className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${color}18` }}
              >
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                {label}
              </p>
              <p className="mt-0.5 truncate text-lg font-bold text-gray-900">
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly spend chart */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="mb-4 text-xs font-bold tracking-wider text-gray-500 uppercase">
            Gasto mensual
          </p>
          {chartMonthly.some((d) => d.gasto > 0) ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart
                data={chartMonthly}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gastoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={roleColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={roleColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}€`}
                />
                <Tooltip
                  formatter={(v) => [`${Number(v).toFixed(2)}€`, "Gasto"]}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="gasto"
                  stroke={roleColor}
                  strokeWidth={2}
                  fill="url(#gastoGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              Sin datos en este periodo
            </div>
          )}
        </div>

        {/* Game breakdown */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">
              Gasto por juego
            </p>
            {total > 0 && (
              <span className="text-xs font-bold text-gray-900">
                {total.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            )}
          </div>

          {chartGame.length > 0 ? (
            <div className="space-y-3">
              {chartGame.map((item) => {
                const color = getGameColor(item.game, roleColor);
                const pct = total > 0 ? (item.gasto / total) * 100 : 0;
                return (
                  <div key={item.game}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-gray-800 min-w-0">
                        {getGameName(item.game)}
                      </span>
                      <div className="flex flex-shrink-0 items-center gap-2 text-xs">
                        <span className="font-bold text-gray-900 tabular-nums">
                          {item.gasto.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                        </span>
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                          style={{ backgroundColor: `${color}18`, color }}
                        >
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.85 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              Sin datos en este periodo
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
