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
import { MOCK_SALES_7D, MOCK_SALES_30D, MOCK_SALES_3M } from "@/data/mockData";

const PERIODS = [
  { key: "7d", label: "7 días", data: MOCK_SALES_7D, prevSales: 5890 },
  { key: "30d", label: "30 días", data: MOCK_SALES_30D, prevSales: 22400 },
  { key: "3m", label: "3 meses", data: MOCK_SALES_3M, prevSales: 68200 },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-lg">
      <p className="mb-2 text-xs font-bold text-gray-500">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-gray-500">
            {p.name === "sales" ? "Ventas" : "Pedidos"}:
          </span>
          <span className="font-bold text-gray-900">
            {p.name === "sales"
              ? `${Number(p.value).toLocaleString("es-ES")}€`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SalesChart({ height = 220 }: { height?: number }) {
  const [period, setPeriod] = useState<PeriodKey>("7d");
  const current = PERIODS.find((p) => p.key === period)!;
  const totalSales = current.data.reduce((s, d) => s + d.sales, 0);
  const totalOrders = current.data.reduce((s, d) => s + d.orders, 0);
  const trend = (
    ((totalSales - current.prevSales) / current.prevSales) *
    100
  ).toFixed(1);
  const trendUp = totalSales >= current.prevSales;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {totalSales.toLocaleString("es-ES")}€
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
          <p className="text-xs text-gray-400">
            {totalOrders} pedidos · ticket medio{" "}
            {(totalSales / totalOrders).toFixed(0)}€
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                period === p.key
                  ? "bg-white text-[#2563eb] shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={current.data}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
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
            yAxisId="sales"
            orientation="left"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`
            }
            width={44}
          />
          <YAxis
            yAxisId="orders"
            orientation="right"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            yAxisId="sales"
            type="monotone"
            dataKey="sales"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#gradSales)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            yAxisId="orders"
            type="monotone"
            dataKey="orders"
            stroke="#7c3aed"
            strokeWidth={2}
            fill="url(#gradOrders)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            strokeDasharray="4 4"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-[#2563eb]" /> Ventas (€)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-4"
            style={{
              background:
                "repeating-linear-gradient(90deg,#7c3aed 0,#7c3aed 4px,transparent 4px,transparent 8px)",
            }}
          />{" "}
          Pedidos
        </span>
      </div>
    </div>
  );
}
