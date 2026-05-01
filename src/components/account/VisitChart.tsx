"use client";
import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Eye, TrendingUp, MousePointer, Clock } from "lucide-react";

type Period = "1m" | "3m" | "1y" | "all";

const PERIOD_OPTS: { value: Period; label: string; months: number }[] = [
  { value: "1m", label: "1 mes", months: 1 },
  { value: "3m", label: "3 meses", months: 3 },
  { value: "1y", label: "1 año", months: 12 },
  { value: "all", label: "Todo", months: 24 },
];

interface Props {
  visitData: { month: string; visitas: number }[];
  totalVisits: number;
  avgVisits: number;
  pageViews: number;
  roleColor: string;
  /**
   * Cuando es true, los datos provienen del endpoint real
   * `/api/admin/users/[id]/activity` y la nota al pie indica fuente real.
   * Si es false (default), se mantiene el aviso "datos simulados".
   */
  isRealData?: boolean;
  /** ISO de la primera y última visita registradas — solo se muestran si isRealData. */
  firstVisit?: string | null;
  lastVisit?: string | null;
}

export function VisitChart({
  visitData,
  totalVisits,
  pageViews,
  roleColor,
  isRealData = false,
  firstVisit = null,
  lastVisit = null,
}: Props) {
  const [period, setPeriod] = useState<Period>("all");

  const filtered = useMemo(() => {
    const months = PERIOD_OPTS.find((p) => p.value === period)?.months ?? 12;
    return visitData.slice(-months);
  }, [visitData, period]);

  const periodTotal = filtered.reduce((s, d) => s + d.visitas, 0);
  const periodAvg = filtered.length > 0 ? Math.round(periodTotal / filtered.length) : 0;
  const periodPages = Math.round(periodTotal * (pageViews / Math.max(totalVisits, 1)));
  const hasAnyData = isRealData ? totalVisits > 0 : true;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-bold text-gray-900">
          <Eye size={16} className="text-[#2563eb]" /> Actividad en la tienda
        </h3>
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
          {PERIOD_OPTS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                period === value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { icon: Eye, label: "Visitas", value: periodTotal, color: "#2563eb" },
          { icon: MousePointer, label: "Páginas vistas", value: periodPages, color: "#7c3aed" },
          { icon: TrendingUp, label: "Media/mes", value: periodAvg, color: "#16a34a" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-xl bg-gray-50 px-3 py-2.5 text-center">
            <Icon size={14} className="mx-auto mb-1" style={{ color }} />
            <p className="text-lg font-bold text-gray-900">{value}</p>
            <p className="text-[10px] text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Area chart */}
        <div>
          <p className="mb-2 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
            Visitas por mes
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={filtered} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={roleColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={roleColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => [v, "Visitas"]}
                contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 11 }}
              />
              <Area type="monotone" dataKey="visitas" stroke={roleColor} strokeWidth={2} fill="url(#visitGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div>
          <p className="mb-2 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
            Comparativa mensual
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={filtered} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => [v, "Visitas"]}
                contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 11 }}
              />
              <Bar dataKey="visitas" fill={roleColor} radius={[4, 4, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {!hasAnyData && (
        <div className="mt-3 rounded-lg bg-blue-50 p-4 text-center text-xs text-blue-800">
          Aún no hay visitas registradas para este usuario. El tracking se
          activa la próxima vez que el usuario navegue por la web autenticado.
        </div>
      )}

      <p className="mt-3 text-center text-[10px] text-gray-400">
        <Clock size={9} className="mr-0.5 inline" />{" "}
        {isRealData ? (
          <>
            Datos reales del tracker autenticado
            {firstVisit && <> · Desde {firstVisit.slice(0, 10)}</>}
            {lastVisit && <> · Última: {lastVisit.slice(0, 10)}</>}
          </>
        ) : (
          <>Datos simulados para demo — se conectarán con analytics real</>
        )}
      </p>
    </div>
  );
}
