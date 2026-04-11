"use client";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import {
  Users,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  TrendingUp,
  Eye,
  Clock,
  MapPin,
  Database,
  ShoppingBag,
  AlertCircle,
  BarChart2,
} from "lucide-react";
import {
  MOCK_PROVINCE_VISITS,
  MOCK_TRAFFIC_SOURCES_DETAIL,
  MOCK_DEVICES,
  MOCK_TOP_PAGES,
  MOCK_HOURLY_TRAFFIC,
  MOCK_AGE_DISTRIBUTION,
  MOCK_COUNTRY_VISITS,
  MOCK_USERS,
  ALL_ORDERS,
} from "@/data/mockData";
import { getMergedProducts } from "@/lib/productStore";
import type { LocalProduct } from "@/data/products";

const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const Cell = dynamic(() => import("recharts").then((m) => m.Cell), { ssr: false });

const DEVICE_ICON: Record<string, React.ElementType> = {
  Móvil: Smartphone,
  Escritorio: Monitor,
  Tablet: Tablet,
};

type LocationTab = "provincias" | "comunidades" | "paises";
type LocationSort = "visits" | "orders" | "revenue";
type TrafficChannel = "all" | "search" | "social" | "email" | "direct" | "referral" | "other";

const totalVisits = MOCK_PROVINCE_VISITS.reduce((s, p) => s + p.visits, 0);
const totalOrders = MOCK_PROVINCE_VISITS.reduce((s, p) => s + p.orders, 0);
const totalRevenue = MOCK_PROVINCE_VISITS.reduce((s, p) => s + p.revenue, 0);
const totalTrafficVisits = MOCK_TRAFFIC_SOURCES_DETAIL.reduce((s, t) => s + t.visits, 0);

const CHANNEL_LABELS: Record<TrafficChannel, string> = {
  all: "Todos",
  search: "Buscadores",
  social: "Redes sociales",
  email: "Email",
  direct: "Directo",
  referral: "Referidos",
  other: "Otros",
};

const CHANNEL_COLORS: Record<TrafficChannel, string> = {
  all: "#2563eb",
  search: "#4285f4",
  social: "#e1306c",
  email: "#f59e0b",
  direct: "#6b7280",
  referral: "#10b981",
  other: "#94a3b8",
};

export default function EstadisticasPage() {
  const [locationTab, setLocationTab] = useState<LocationTab>("provincias");
  const [locationSort, setLocationSort] = useState<LocationSort>("visits");
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [trafficChannel, setTrafficChannel] = useState<TrafficChannel>("all");
  const [allProducts, setAllProducts] = useState<LocalProduct[]>(() => getMergedProducts());

  useEffect(() => {
    const reload = () => setAllProducts(getMergedProducts());
    window.addEventListener("tcga:products:updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("tcga:products:updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const totalRevenue = ALL_ORDERS.reduce((s, o) => s + o.total, 0);
  const avgOrderValue = totalRevenue / ALL_ORDERS.length;
  const inStockCount = allProducts.filter((p) => p.inStock).length;
  const outOfStockCount = allProducts.filter((p) => !p.inStock).length;
  const activeUsers = MOCK_USERS.filter((u) => u.active).length;
  const totalPointsIssued = MOCK_USERS.reduce((s, u) => s + u.points, 0);

  // ── Location data ───────────────────────────────────────────────────────────
  const locationRows = (() => {
    if (locationTab === "provincias") {
      return MOCK_PROVINCE_VISITS.map((p) => ({
        name: p.province,
        sub: p.comunidad,
        visits: p.visits,
        orders: p.orders,
        revenue: p.revenue,
      }));
    }
    if (locationTab === "comunidades") {
      const agg: Record<string, { visits: number; orders: number; revenue: number }> = {};
      for (const p of MOCK_PROVINCE_VISITS) {
        if (!agg[p.comunidad]) agg[p.comunidad] = { visits: 0, orders: 0, revenue: 0 };
        agg[p.comunidad].visits += p.visits;
        agg[p.comunidad].orders += p.orders;
        agg[p.comunidad].revenue += p.revenue;
      }
      return Object.entries(agg).map(([name, d]) => ({ name, sub: "", ...d }));
    }
    // paises
    return MOCK_COUNTRY_VISITS.map((c) => ({
      name: `${c.flag} ${c.country}`,
      sub: "",
      visits: c.visits,
      orders: c.orders,
      revenue: c.revenue,
    }));
  })();

  const sortedLocations = [...locationRows].sort((a, b) => b[locationSort] - a[locationSort]);
  const displayedLocations = showAllLocations ? sortedLocations : sortedLocations.slice(0, 12);
  const maxLocationValue = sortedLocations[0]?.[locationSort] ?? 1;

  // ── Traffic sources filtered ────────────────────────────────────────────────
  const filteredSources =
    trafficChannel === "all"
      ? MOCK_TRAFFIC_SOURCES_DETAIL
      : MOCK_TRAFFIC_SOURCES_DETAIL.filter((s) => s.channel === trafficChannel);
  const filteredTotal = filteredSources.reduce((s, t) => s + t.visits, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Análisis de tráfico y comportamiento de usuarios
        </p>
      </div>

      {/* Business stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Ingresos totales", value: `${totalRevenue.toFixed(2)}€`, icon: BarChart2, color: "#2563eb" },
          { label: "Ticket medio", value: `${avgOrderValue.toFixed(2)}€`, icon: ShoppingBag, color: "#7c3aed" },
          { label: "Productos en stock", value: `${inStockCount} / ${allProducts.length}`, icon: Database, color: "#059669" },
          { label: "Sin stock", value: String(outOfStockCount), icon: AlertCircle, color: "#dc2626" },
          { label: "Usuarios activos", value: `${activeUsers} / ${MOCK_USERS.length}`, icon: Users, color: "#0891b2" },
          { label: "Puntos emitidos", value: totalPointsIssued.toLocaleString("es-ES"), icon: BarChart2, color: "#d97706" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-gray-500">{label}</p>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}18` }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* KPI summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Visitas totales", value: totalVisits.toLocaleString("es-ES"), sub: "últimos 30 días", icon: Eye, color: "#2563eb" },
          { label: "Visitantes únicos", value: Math.round(totalVisits * 0.68).toLocaleString("es-ES"), sub: "68% de retorno", icon: Users, color: "#7c3aed" },
          { label: "Tiempo medio", value: "3m 42s", sub: "por sesión", icon: Clock, color: "#0891b2" },
          { label: "Tasa conversión", value: `${((totalOrders / totalVisits) * 100).toFixed(2)}%`, sub: `${totalOrders} pedidos`, icon: TrendingUp, color: "#059669" },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}18` }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl leading-none font-bold text-gray-900">{value}</p>
            <p className="mt-1 text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Hourly traffic */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-1 font-bold text-gray-900">Tráfico por hora del día</h2>
        <p className="mb-4 text-xs text-gray-400">Media de visitas por hora — últimos 30 días</p>
        <div className="h-[160px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MOCK_HOURLY_TRAFFIC} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={38} />
              <Tooltip
                labelStyle={{ fontWeight: 600, color: "#111827" }}
                contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Bar dataKey="visits" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-center text-xs text-gray-400">Pico de tráfico entre las 19h–21h</p>
      </div>

      {/* Location + Traffic sources */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Unified location box */}
        <div className="rounded-2xl border border-gray-200 bg-white lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-gray-900">Distribución geográfica</h2>
              <p className="text-xs text-gray-400">
                {totalVisits.toLocaleString("es-ES")} visitas · {totalRevenue.toLocaleString("es-ES")}€ en ingresos
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Tab: Provincias | Comunidades | Países */}
              <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                {(["provincias", "comunidades", "paises"] as LocationTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setLocationTab(tab); setShowAllLocations(false); }}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                      locationTab === tab ? "bg-white text-[#2563eb] shadow-sm" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {tab === "provincias" && <MapPin size={10} />}
                    {tab === "comunidades" && <Globe size={10} />}
                    {tab === "paises" && "🌍"}
                    {tab === "provincias" ? "Provincias" : tab === "comunidades" ? "Comunidades" : "Países"}
                  </button>
                ))}
              </div>
              {/* Sort */}
              <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                {(["visits", "orders", "revenue"] as LocationSort[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setLocationSort(s)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                      locationSort === s ? "bg-white text-[#2563eb] shadow-sm" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {s === "visits" ? "Visitas" : s === "orders" ? "Pedidos" : "Ingresos"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-50 px-5">
            {displayedLocations.map((row, i) => {
              const val = row[locationSort];
              const pct = Math.round((val / maxLocationValue) * 100);
              return (
                <div key={row.name} className="flex items-center gap-3 py-2.5">
                  <span className="w-5 flex-shrink-0 text-xs font-bold text-gray-300">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-gray-900">{row.name}</span>
                        {row.sub && (
                          <span className="ml-1.5 text-[10px] text-gray-400">{row.sub}</span>
                        )}
                      </div>
                      <div className="ml-3 flex flex-shrink-0 items-center gap-3 text-xs text-gray-500">
                        <span>{row.visits.toLocaleString("es-ES")}</span>
                        <span>{row.orders} ped.</span>
                        <span className="font-semibold text-gray-700">
                          {row.revenue.toLocaleString("es-ES")}€
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[#2563eb] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-8 flex-shrink-0 text-right text-xs text-gray-400">{pct}%</span>
                </div>
              );
            })}
          </div>
          {sortedLocations.length > 12 && (
            <div className="border-t border-gray-100 px-5 py-3">
              <button
                onClick={() => setShowAllLocations(!showAllLocations)}
                className="text-xs font-semibold text-[#2563eb] hover:underline"
              >
                {showAllLocations ? "Mostrar menos" : `Ver los ${sortedLocations.length - 12} restantes`}
              </button>
            </div>
          )}
        </div>

        {/* Right column: Devices */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-bold text-gray-900">Dispositivos</h2>
            <div className="space-y-3">
              {MOCK_DEVICES.map((d) => {
                const DevIcon = DEVICE_ICON[d.device] ?? Monitor;
                return (
                  <div key={d.device} className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${d.color}18` }}
                    >
                      <DevIcon size={16} style={{ color: d.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-semibold text-gray-700">{d.device}</span>
                        <span className="text-gray-500">{d.pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
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

          {/* Age distribution */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-1 font-bold text-gray-900">Edad de usuarios</h2>
            <p className="mb-4 text-xs text-gray-400">Distribución por grupo de edad</p>
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={MOCK_AGE_DISTRIBUTION}
                  margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="group" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip
                    formatter={(v) => [`${Number(v)} usuarios`, "Usuarios"]}
                    contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                  />
                  <Bar dataKey="users" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {MOCK_AGE_DISTRIBUTION.map((entry) => (
                      <Cell key={entry.group} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {MOCK_AGE_DISTRIBUTION.map((d) => (
                <span key={d.group} className="flex items-center gap-1 text-[10px] text-gray-500">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.group} · {d.pct}%
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Traffic sources — detailed */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900">Fuentes de tráfico</h2>
            <p className="text-xs text-gray-400">
              {totalTrafficVisits.toLocaleString("es-ES")} visitas totales
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(CHANNEL_LABELS) as TrafficChannel[]).map((ch) => (
              <button
                key={ch}
                onClick={() => setTrafficChannel(ch)}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
                style={{
                  background: trafficChannel === ch ? CHANNEL_COLORS[ch] : "#f3f4f6",
                  color: trafficChannel === ch ? "#fff" : "#6b7280",
                }}
              >
                {CHANNEL_LABELS[ch]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSources.map((source) => {
            const pctOfFiltered = filteredTotal > 0 ? (source.visits / filteredTotal) * 100 : 0;
            const pctOfTotal = totalTrafficVisits > 0 ? (source.visits / totalTrafficVisits) * 100 : 0;
            return (
              <div
                key={source.source}
                className="rounded-xl border border-gray-100 p-3.5"
                style={{ borderLeftWidth: 3, borderLeftColor: source.color }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base leading-none">{source.icon}</span>
                    <span className="text-sm font-semibold text-gray-800">{source.source}</span>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: `${source.color}15`, color: source.color }}
                  >
                    {pctOfTotal.toFixed(1)}%
                  </span>
                </div>
                <p className="mb-2 text-xl font-bold text-gray-900 tabular-nums">
                  {source.visits.toLocaleString("es-ES")}
                  <span className="ml-1 text-xs font-normal text-gray-400">visitas</span>
                </p>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pctOfFiltered}%`, backgroundColor: source.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top pages */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-900">Páginas más visitadas</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs tracking-wider text-gray-500 uppercase">
              <th className="px-5 py-3 text-left font-semibold">Página</th>
              <th className="px-4 py-3 text-right font-semibold">Visitas</th>
              <th className="hidden px-4 py-3 text-right font-semibold sm:table-cell">Rebote</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {MOCK_TOP_PAGES.map((page, i) => (
              <tr key={page.page} className="hover:bg-gray-50">
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-300">{i + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{page.label}</p>
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
                      page.bounce < 35 ? "text-green-600" : page.bounce < 50 ? "text-amber-600" : "text-red-500"
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

      {/* Insight banner */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <h3 className="mb-1 text-sm font-bold text-blue-900">💡 Insights principales</h3>
        <ul className="space-y-1 text-xs text-blue-700">
          <li>
            · Madrid y Barcelona concentran el{" "}
            <strong>
              {Math.round(
                ((MOCK_PROVINCE_VISITS.find((p) => p.province === "Madrid")!.visits +
                  MOCK_PROVINCE_VISITS.find((p) => p.province === "Barcelona")!.visits) /
                  totalVisits) * 100,
              )}%
            </strong>{" "}
            del tráfico total.
          </li>
          <li>
            · El grupo de edad más activo es <strong>25–34 años</strong> (32% de usuarios) — contenido y
            campañas orientadas a comprador adulto con poder adquisitivo.
          </li>
          <li>
            · <strong>Instagram (12%)</strong> supera a Google Ads (8%) como fuente de pago — invertir en
            contenido visual tiene mayor ROI.
          </li>
          <li>
            · El pico de actividad es entre las <strong>19h y 21h</strong> — ideal para lanzar
            notificaciones y campañas de email.
          </li>
          <li>
            · El <strong>49% del tráfico</strong> es desde móvil — asegura que las fichas de producto
            carguen en menos de 2s.
          </li>
        </ul>
      </div>
    </div>
  );
}
