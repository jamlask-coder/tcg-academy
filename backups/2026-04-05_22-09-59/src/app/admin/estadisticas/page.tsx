"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Users,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  TrendingUp,
  Eye,
  Clock,
} from "lucide-react";
import {
  MOCK_PROVINCE_VISITS,
  MOCK_TRAFFIC_SOURCES,
  MOCK_DEVICES,
  MOCK_TOP_PAGES,
  MOCK_HOURLY_TRAFFIC,
} from "@/data/mockData";

const BarChart = dynamic(
  () => import("recharts").then((m) => m.BarChart),
  { ssr: false },
);
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), {
  ssr: false,
});
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import("recharts").then((m) => m.Tooltip),
  { ssr: false },
);
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false },
);

const DEVICE_ICON: Record<string, React.ElementType> = {
  Móvil: Smartphone,
  Escritorio: Monitor,
  Tablet: Tablet,
};

type ProvinceSort = "visits" | "orders" | "revenue";

const totalVisits = MOCK_PROVINCE_VISITS.reduce((s, p) => s + p.visits, 0);
const totalOrders = MOCK_PROVINCE_VISITS.reduce((s, p) => s + p.orders, 0);
const totalRevenue = MOCK_PROVINCE_VISITS.reduce((s, p) => s + p.revenue, 0);
const totalTrafficVisits = MOCK_TRAFFIC_SOURCES.reduce(
  (s, t) => s + t.visits,
  0,
);

export default function EstadisticasPage() {
  const [provinceSort, setProvinceSort] = useState<ProvinceSort>("visits");
  const [showAllProvinces, setShowAllProvinces] = useState(false);

  const sortedProvinces = [...MOCK_PROVINCE_VISITS].sort(
    (a, b) => b[provinceSort] - a[provinceSort],
  );
  const displayedProvinces = showAllProvinces
    ? sortedProvinces
    : sortedProvinces.slice(0, 15);
  const maxValue = sortedProvinces[0]?.[provinceSort] ?? 1;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Análisis de tráfico y comportamiento de usuarios
        </p>
      </div>

      {/* KPI summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Visitas totales",
            value: totalVisits.toLocaleString("es-ES"),
            sub: "últimos 30 días",
            icon: Eye,
            color: "#2563eb",
          },
          {
            label: "Visitantes únicos",
            value: Math.round(totalVisits * 0.68).toLocaleString("es-ES"),
            sub: "68% de retorno",
            icon: Users,
            color: "#7c3aed",
          },
          {
            label: "Tiempo medio",
            value: "3m 42s",
            sub: "por sesión",
            icon: Clock,
            color: "#0891b2",
          },
          {
            label: "Tasa conversión",
            value: `${((totalOrders / totalVisits) * 100).toFixed(2)}%`,
            sub: `${totalOrders} pedidos`,
            icon: TrendingUp,
            color: "#059669",
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-200 bg-white p-5"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${color}18` }}
              >
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl leading-none font-bold text-gray-900">
              {value}
            </p>
            <p className="mt-1 text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Hourly traffic */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-1 font-bold text-gray-900">
          Tráfico por hora del día
        </h2>
        <p className="mb-4 text-xs text-gray-400">
          Media de visitas por hora — últimos 30 días
        </p>
        <div className="h-[160px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={MOCK_HOURLY_TRAFFIC}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f0f0f0"
              />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={38}
              />
              <Tooltip
                labelStyle={{ fontWeight: 600, color: "#111827" }}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="visits"
                fill="#2563eb"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-center text-xs text-gray-400">
          Pico de tráfico entre las 19h–21h
        </p>
      </div>

      {/* Provinces + Sources */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Provinces */}
        <div className="rounded-2xl border border-gray-200 bg-white lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-gray-900">
                Visitas por provincia
              </h2>
              <p className="text-xs text-gray-400">
                {totalVisits.toLocaleString("es-ES")} visitas ·{" "}
                {totalRevenue.toLocaleString("es-ES")}€ en ingresos
              </p>
            </div>
            <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
              {(["visits", "orders", "revenue"] as ProvinceSort[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setProvinceSort(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    provinceSort === s
                      ? "bg-white text-[#2563eb] shadow-sm"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {s === "visits"
                    ? "Visitas"
                    : s === "orders"
                      ? "Pedidos"
                      : "Ingresos"}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-50 px-5">
            {displayedProvinces.map((p, i) => {
              const val = p[provinceSort];
              const pct = Math.round((val / maxValue) * 100);
              return (
                <div key={p.province} className="flex items-center gap-3 py-2.5">
                  <span className="w-5 flex-shrink-0 text-xs font-bold text-gray-300">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">
                        {p.province}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>
                          <Globe
                            size={10}
                            className="mr-0.5 inline text-gray-300"
                          />
                          {p.visits.toLocaleString("es-ES")}
                        </span>
                        <span>
                          {p.orders} ped.
                        </span>
                        <span className="font-semibold text-gray-700">
                          {p.revenue.toLocaleString("es-ES")}€
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[#2563eb] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-8 flex-shrink-0 text-right text-xs text-gray-400">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
          {sortedProvinces.length > 15 && (
            <div className="border-t border-gray-100 px-5 py-3">
              <button
                onClick={() => setShowAllProvinces(!showAllProvinces)}
                className="text-xs font-semibold text-[#2563eb] hover:underline"
              >
                {showAllProvinces
                  ? "Mostrar menos"
                  : `Ver las ${sortedProvinces.length - 15} provincias restantes`}
              </button>
            </div>
          )}
        </div>

        {/* Right column: Sources + Devices */}
        <div className="space-y-6">
          {/* Traffic sources */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-bold text-gray-900">
              Fuentes de tráfico
            </h2>
            <div className="space-y-3">
              {MOCK_TRAFFIC_SOURCES.map((source) => (
                <div key={source.source}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700">
                      {source.source}
                    </span>
                    <span className="text-gray-500">
                      {source.visits.toLocaleString("es-ES")}{" "}
                      <span className="text-gray-400">({source.pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${source.pct}%`,
                        backgroundColor: source.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-400">
              Total: {totalTrafficVisits.toLocaleString("es-ES")} visitas
            </div>
          </div>

          {/* Devices */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-bold text-gray-900">
              Dispositivos
            </h2>
            <div className="space-y-3">
              {MOCK_DEVICES.map((d) => {
                const DevIcon = DEVICE_ICON[d.device] ?? Monitor;
                return (
                  <div
                    key={d.device}
                    className="flex items-center gap-3"
                  >
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${d.color}18` }}
                    >
                      <DevIcon
                        size={16}
                        style={{ color: d.color }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-semibold text-gray-700">
                          {d.device}
                        </span>
                        <span className="text-gray-500">
                          {d.pct}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${d.pct}%`,
                            backgroundColor: d.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 border-t border-gray-100 pt-3 text-center text-xs text-gray-400">
              El 49% del tráfico es móvil — diseño mobile-first prioritario
            </div>
          </div>
        </div>
      </div>

      {/* Top pages + Comunidades */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Top pages */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-bold text-gray-900">Páginas más visitadas</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs tracking-wider text-gray-500 uppercase">
                <th className="px-5 py-3 text-left font-semibold">Página</th>
                <th className="px-4 py-3 text-right font-semibold">Visitas</th>
                <th className="hidden px-4 py-3 text-right font-semibold sm:table-cell">
                  Rebote
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_TOP_PAGES.map((page, i) => (
                <tr key={page.page} className="hover:bg-gray-50">
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-300">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {page.label}
                        </p>
                        <p className="text-xs text-gray-400">{page.page}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-gray-900">
                    {page.visits.toLocaleString("es-ES")}
                  </td>
                  <td className="hidden px-4 py-2.5 text-right sm:table-cell">
                    <span
                      className={`text-xs font-semibold ${
                        page.bounce < 35
                          ? "text-green-600"
                          : page.bounce < 50
                            ? "text-amber-600"
                            : "text-red-500"
                      }`}
                    >
                      {page.bounce}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top comunidades */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-bold text-gray-900">
              Comunidades autónomas
            </h2>
            <p className="text-xs text-gray-400">
              Agrupado por comunidad
            </p>
          </div>
          <div className="p-5">
            {(() => {
              const byComunidad = MOCK_PROVINCE_VISITS.reduce(
                (acc, p) => {
                  if (!acc[p.comunidad]) {
                    acc[p.comunidad] = { visits: 0, orders: 0, revenue: 0 };
                  }
                  acc[p.comunidad].visits += p.visits;
                  acc[p.comunidad].orders += p.orders;
                  acc[p.comunidad].revenue += p.revenue;
                  return acc;
                },
                {} as Record<
                  string,
                  { visits: number; orders: number; revenue: number }
                >,
              );

              const sorted = Object.entries(byComunidad).sort(
                (a, b) => b[1].visits - a[1].visits,
              );
              const maxV = sorted[0]?.[1]?.visits ?? 1;

              return (
                <div className="space-y-2.5">
                  {sorted.slice(0, 12).map(([name, data], i) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className="w-5 flex-shrink-0 text-xs font-bold text-gray-300">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="font-semibold text-gray-800">
                            {name}
                          </span>
                          <span className="text-gray-500">
                            {data.visits.toLocaleString("es-ES")}{" "}
                            <span className="text-gray-400">
                              · {data.revenue.toLocaleString("es-ES")}€
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-[#2563eb]"
                            style={{
                              width: `${Math.round((data.visits / maxV) * 100)}%`,
                              opacity: 0.6 + (0.4 * (12 - i)) / 12,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Insight banner */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <h3 className="mb-1 text-sm font-bold text-blue-900">
          💡 Insights principales
        </h3>
        <ul className="space-y-1 text-xs text-blue-700">
          <li>
            · Madrid y Barcelona concentran el{" "}
            <strong>
              {Math.round(
                ((MOCK_PROVINCE_VISITS.find((p) => p.province === "Madrid")!
                  .visits +
                  MOCK_PROVINCE_VISITS.find((p) => p.province === "Barcelona")!
                    .visits) /
                  totalVisits) *
                  100,
              )}
              %
            </strong>{" "}
            del tráfico total.
          </li>
          <li>
            · El pico de actividad es entre las <strong>19h y 21h</strong> —
            ideal para lanzar notificaciones y campañas de email.
          </li>
          <li>
            · El <strong>49% del tráfico</strong> es desde móvil — asegura que
            las fichas de producto carguen en menos de 2s.
          </li>
          <li>
            · La tasa de rebote en <strong>/registro (58%)</strong> sugiere
            oportunidad de optimizar el formulario de alta.
          </li>
        </ul>
      </div>
    </div>
  );
}
