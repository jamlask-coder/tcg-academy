"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface Props {
  monthlyData: { month: string; gasto: number }[];
  gameData: { game: string; gasto: number }[];
  roleColor: string;
}

export function B2BCharts({ monthlyData, gameData, roleColor }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="mb-4 text-xs font-bold tracking-wider text-gray-500 uppercase">
          Gasto mensual (6 meses)
        </p>
        {monthlyData.some((d) => d.gasto > 0) ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart
              data={monthlyData}
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
            Sin datos de pedidos aún
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="mb-4 text-xs font-bold tracking-wider text-gray-500 uppercase">
          Gasto por juego
        </p>
        {gameData.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              layout="vertical"
              data={gameData}
              margin={{ top: 0, right: 10, left: 48, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#f3f4f6"
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={(v) => `${v}€`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="game"
                tick={{ fontSize: 11, fill: "#374151" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v) => [`${Number(v).toFixed(2)}€`, "Gasto"]}
              />
              <Bar dataKey="gasto" fill={roleColor} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">
            Sin datos de pedidos aún
          </div>
        )}
      </div>
    </div>
  );
}
