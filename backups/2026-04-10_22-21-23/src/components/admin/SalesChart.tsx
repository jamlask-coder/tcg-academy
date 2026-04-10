"use client";
import { useState } from "react";
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
  MOCK_SALES_7D,
  MOCK_SALES_30D,
  MOCK_SALES_3M,
  MOCK_USERS_7D,
  MOCK_USERS_30D,
  MOCK_USERS_3M,
  MOCK_PRODUCTS_7D,
  MOCK_PRODUCTS_30D,
  MOCK_PRODUCTS_3M,
  MOCK_DISCOUNTS_7D,
  MOCK_DISCOUNTS_30D,
  MOCK_DISCOUNTS_3M,
} from "@/data/mockData";

export type KpiMode = "ventas" | "usuarios" | "productos" | "descuentos";

const PERIODS = ["7d", "30d", "3m"] as const;
type PeriodKey = (typeof PERIODS)[number];

interface ModeConfig {
  periods: Record<PeriodKey, { data: object[]; prev: number }>;
  keys: { primary: string; secondary: string };
  colors: { primary: string; secondary: string };
  labels: { primary: string; secondary: string };
  format: { primary: (v: number) => string; secondary: (v: number) => string };
  summary: (data: object[], period: PeriodKey) => string;
}

const MODE_CONFIG: Record<KpiMode, ModeConfig> = {
  ventas: {
    periods: {
      "7d": { data: MOCK_SALES_7D, prev: 5890 },
      "30d": { data: MOCK_SALES_30D, prev: 22400 },
      "3m": { data: MOCK_SALES_3M, prev: 68200 },
    },
    keys: { primary: "sales", secondary: "orders" },
    colors: { primary: "#2563eb", secondary: "#7c3aed" },
    labels: { primary: "Ventas (€)", secondary: "Pedidos" },
    format: {
      primary: (v) => `${v.toLocaleString("es-ES")}€`,
      secondary: (v) => String(v),
    },
    summary: (data) => {
      const d = data as { sales: number; orders: number }[];
      const s = d.reduce((a, x) => a + x.sales, 0);
      const o = d.reduce((a, x) => a + x.orders, 0);
      return `${s.toLocaleString("es-ES")}€ · ${o} pedidos · ticket medio ${(s / o).toFixed(0)}€`;
    },
  },
  usuarios: {
    periods: {
      "7d": { data: MOCK_USERS_7D, prev: 12 },
      "30d": { data: MOCK_USERS_30D, prev: 38 },
      "3m": { data: MOCK_USERS_3M, prev: 110 },
    },
    keys: { primary: "totalUsers", secondary: "newUsers" },
    colors: { primary: "#0891b2", secondary: "#06b6d4" },
    labels: { primary: "Usuarios totales", secondary: "Nuevos" },
    format: {
      primary: (v) => String(v),
      secondary: (v) => `+${v}`,
    },
    summary: (data) => {
      const d = data as { newUsers: number; totalUsers: number }[];
      const total = d[d.length - 1]?.totalUsers ?? 0;
      const news = d.reduce((a, x) => a + x.newUsers, 0);
      return `${total} usuarios activos · +${news} nuevos en el periodo`;
    },
  },
  productos: {
    periods: {
      "7d": { data: MOCK_PRODUCTS_7D, prev: 5 },
      "30d": { data: MOCK_PRODUCTS_30D, prev: 28 },
      "3m": { data: MOCK_PRODUCTS_3M, prev: 65 },
    },
    keys: { primary: "totalProducts", secondary: "newProducts" },
    colors: { primary: "#7c3aed", secondary: "#a855f7" },
    labels: { primary: "Catálogo total", secondary: "Añadidos" },
    format: {
      primary: (v) => String(v),
      secondary: (v) => `+${v}`,
    },
    summary: (data) => {
      const d = data as { newProducts: number; totalProducts: number }[];
      const total = d[d.length - 1]?.totalProducts ?? 0;
      const news = d.reduce((a, x) => a + x.newProducts, 0);
      return `${total} productos en catálogo · +${news} añadidos en el periodo`;
    },
  },
  descuentos: {
    periods: {
      "7d": { data: MOCK_DISCOUNTS_7D, prev: 42 },
      "30d": { data: MOCK_DISCOUNTS_30D, prev: 165 },
      "3m": { data: MOCK_DISCOUNTS_3M, prev: 480 },
    },
    keys: { primary: "used", secondary: "redeemed" },
    colors: { primary: "#dc2626", secondary: "#f97316" },
    labels: { primary: "Usos totales", secondary: "Canjes" },
    format: {
      primary: (v) => String(v),
      secondary: (v) => String(v),
    },
    summary: (data) => {
      const d = data as { used: number; redeemed: number }[];
      const u = d.reduce((a, x) => a + x.used, 0);
      const r = d.reduce((a, x) => a + x.redeemed, 0);
      return `${u} usos de descuento · ${r} canjes de puntos en el periodo`;
    },
  },
};

function CustomTooltip({
  active,
  payload,
  label,
  config,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string; color: string }[];
  label?: string;
  config: ModeConfig;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-lg">
      <p className="mb-2 text-xs font-bold text-gray-500">{label}</p>
      {payload.map((p) => {
        const isPrimary = p.dataKey === config.keys.primary;
        const lbl = isPrimary ? config.labels.primary : config.labels.secondary;
        const fmt = isPrimary ? config.format.primary : config.format.secondary;
        return (
          <div key={p.dataKey} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-gray-500">{lbl}:</span>
            <span className="font-bold text-gray-900">{fmt(p.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function SalesChart({
  height = 220,
  mode = "ventas",
}: {
  height?: number;
  mode?: KpiMode;
}) {
  const [period, setPeriod] = useState<PeriodKey>("7d");
  const cfg = MODE_CONFIG[mode];
  const { data, prev } = cfg.periods[period];
  const primaryKey = cfg.keys.primary;
  const totalPrimary = (data as Record<string, number>[]).reduce(
    (s, d) => s + (d[primaryKey] ?? 0),
    0,
  );
  const lastPrimary =
    (data as Record<string, number>[])[data.length - 1]?.[primaryKey] ??
    totalPrimary;
  const compare = mode === "ventas" ? totalPrimary : lastPrimary;
  const trend = (((compare - prev) / prev) * 100).toFixed(1);
  const trendUp = compare >= prev;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {mode === "ventas"
                ? `${totalPrimary.toLocaleString("es-ES")}€`
                : String(lastPrimary)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                trendUp
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {trendUp ? "▲" : "▼"} {Math.abs(Number(trend))}%
            </span>
          </div>
          <p className="text-xs text-gray-400">{cfg.summary(data, period)}</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                period === p
                  ? "bg-white shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              style={period === p ? { color: cfg.colors.primary } : undefined}
            >
              {p === "7d" ? "7 días" : p === "30d" ? "30 días" : "3 meses"}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="gradPrimary" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={cfg.colors.primary}
                stopOpacity={0.15}
              />
              <stop
                offset="95%"
                stopColor={cfg.colors.primary}
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient id="gradSecondary" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={cfg.colors.secondary}
                stopOpacity={0.1}
              />
              <stop
                offset="95%"
                stopColor={cfg.colors.secondary}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f0f0f0"
          />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            interval={period === "30d" ? 4 : 0}
          />
          <YAxis
            yAxisId="primary"
            orientation="left"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              mode === "ventas" && v >= 1000
                ? `${(v / 1000).toFixed(0)}k€`
                : mode === "ventas"
                  ? `${v}€`
                  : String(v)
            }
            width={44}
          />
          <YAxis
            yAxisId="secondary"
            orientation="right"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            content={<CustomTooltip config={cfg} />}
          />
          <Area
            yAxisId="primary"
            type="monotone"
            dataKey={cfg.keys.primary}
            stroke={cfg.colors.primary}
            strokeWidth={2}
            fill="url(#gradPrimary)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            yAxisId="secondary"
            type="monotone"
            dataKey={cfg.keys.secondary}
            stroke={cfg.colors.secondary}
            strokeWidth={2}
            fill="url(#gradSecondary)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            strokeDasharray="4 4"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-4 rounded-full"
            style={{ backgroundColor: cfg.colors.primary }}
          />
          {cfg.labels.primary}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-4"
            style={{
              background: `repeating-linear-gradient(90deg,${cfg.colors.secondary} 0,${cfg.colors.secondary} 4px,transparent 4px,transparent 8px)`,
            }}
          />
          {cfg.labels.secondary}
        </span>
      </div>
    </div>
  );
}
