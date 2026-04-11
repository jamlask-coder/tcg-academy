"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  monthlyData: { month: string; gasto: number }[];
  gameData: { game: string; gasto: number }[];
  roleColor: string;
}

// Per-game accent colors
const GAME_COLORS: Record<string, string> = {
  Pokemon: "#f59e0b",
  Magic: "#2563eb",
  Yugioh: "#7c3aed",
  "One-piece": "#dc2626",
  Lorcana: "#0891b2",
  Riftbound: "#059669",
  "Dragon-ball": "#d97706",
  Naruto: "#ea580c",
  Digimon: "#2563eb",
  Panini: "#16a34a",
};

function getGameColor(name: string, fallback: string): string {
  const key = Object.keys(GAME_COLORS).find(
    (k) => name.toLowerCase().includes(k.toLowerCase()),
  );
  return key ? GAME_COLORS[key] : fallback;
}

export function B2BCharts({ monthlyData, gameData, roleColor }: Props) {
  const total = gameData.reduce((s, d) => s + d.gasto, 0);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Monthly spend chart */}
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
            Sin datos de pedidos aún
          </div>
        )}
      </div>

      {/* Game breakdown — redesigned */}
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

        {gameData.length > 0 ? (
          <div className="space-y-3">
            {gameData.map((item, i) => {
              const color = getGameColor(item.game, roleColor);
              const pct = total > 0 ? (item.gasto / total) * 100 : 0;
              return (
                <div key={item.game}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white"
                        style={{ backgroundColor: color }}
                      >
                        {i + 1}
                      </span>
                      <span className="truncate text-sm font-semibold text-gray-800">
                        {item.game}
                      </span>
                    </div>
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
            Sin datos de pedidos aún
          </div>
        )}
      </div>
    </div>
  );
}
