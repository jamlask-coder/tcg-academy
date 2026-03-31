import {
  Calendar,
  MapPin,
  Trophy,
  Clock,
  Users,
  ArrowRight,
  Tag,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Eventos TCG — TCG Academy" };

const EVENTS = [
  {
    id: 1,
    game: "Pokemon",
    gameColor: "#f59e0b",
    gameBg: "#fef3c7",
    type: "Pre-Release",
    title: "Pre-Release Escarlata y Purpura: Mascaras del Crepusculo",
    date: "2026-04-05",
    time: "11:00",
    store: "Calpe",
    storeId: "calpe",
    slots: 32,
    slotsLeft: 8,
    price: 30,
    desc: "Participa en la pre-release oficial del nuevo set. Recibe tu kit exclusivo y compite por premios.",
    badge: "PROXIMAMENTE",
  },
  {
    id: 2,
    game: "Magic: The Gathering",
    gameColor: "#7c3aed",
    gameBg: "#f5f3ff",
    type: "Friday Night Magic",
    title: "FNM Draft — Universes Beyond: Assassin's Creed",
    date: "2026-04-04",
    time: "19:00",
    store: "Madrid",
    storeId: "madrid",
    slots: 16,
    slotsLeft: 4,
    price: 15,
    desc: "Draft semanal del viernes. Formato booster draft con 3 sobres por jugador. Premios en tienda.",
    badge: "PLAZAS LIMITADAS",
  },
  {
    id: 3,
    game: "Yu-Gi-Oh!",
    gameColor: "#dc2626",
    gameBg: "#fef2f2",
    type: "Torneo Regional",
    title: "Regional YCS-Style — Formato Advanced",
    date: "2026-04-12",
    time: "10:00",
    store: "Barcelona",
    storeId: "barcelona",
    slots: 64,
    slotsLeft: 22,
    price: 20,
    desc: "Torneo regional con formato Advanced oficial. Sistema suizo + top 8. Premios exclusivos para los mejores.",
    badge: "INSCRIPCION ABIERTA",
  },
  {
    id: 4,
    game: "Lorcana",
    gameColor: "#0891b2",
    gameBg: "#ecfeff",
    type: "Liga Semanal",
    title: "Liga Lorcana — Semana 12",
    date: "2026-04-06",
    time: "17:00",
    store: "Bejar",
    storeId: "bejar",
    slots: 24,
    slotsLeft: 12,
    price: 5,
    desc: "Liga semanal casual para jugadores de todos los niveles. Formato Constructed, cualquier set permitido.",
    badge: null,
  },
  {
    id: 5,
    game: "Dragon Ball Super CG",
    gameColor: "#d97706",
    gameBg: "#fef3c7",
    type: "Torneo Mensual",
    title: "Campeonato Mensual Dragon Ball — Abril 2026",
    date: "2026-04-19",
    time: "11:00",
    store: "Calpe",
    storeId: "calpe",
    slots: 32,
    slotsLeft: 18,
    price: 10,
    desc: "El torneo mensual de Dragon Ball Super CG. Sistema suizo, formato oficial. Premios para top 4.",
    badge: "INSCRIPCION ABIERTA",
  },
  {
    id: 6,
    game: "Pokemon",
    gameColor: "#f59e0b",
    gameBg: "#fef3c7",
    type: "Campeonato",
    title: "Pokemon Cup — Torneo City Championship",
    date: "2026-04-26",
    time: "10:00",
    store: "Madrid",
    storeId: "madrid",
    slots: 128,
    slotsLeft: 57,
    price: 25,
    desc: "City Championship oficial Pokemon. Sistema suizo + top 8. Clasificatorio para regionales. Premios en paquetes y trofeos.",
    badge: "CLASIFICATORIO",
  },
];

const PAST_EVENTS = [
  {
    title: "FNM Draft — Karlov Manor",
    game: "Magic: The Gathering",
    date: "2026-03-22",
    participants: 14,
    gameColor: "#7c3aed",
  },
  {
    title: "Pre-Release Temporal Forces",
    game: "Pokemon",
    date: "2026-03-16",
    participants: 28,
    gameColor: "#f59e0b",
  },
  {
    title: "Liga Semanal Lorcana #10",
    game: "Lorcana",
    date: "2026-03-15",
    participants: 18,
    gameColor: "#0891b2",
  },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function daysUntil(dateStr: string) {
  const today = new Date();
  const event = new Date(dateStr + "T00:00:00");
  const diff = Math.ceil(
    (event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff;
}

export default function EventosPage() {
  const upcoming = EVENTS.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a3a5c] via-[#1e4a73] to-[#2d6a9f] py-16 text-white">
        <div className="mx-auto max-w-[1400px] px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/20 px-4 py-1.5 text-sm font-semibold text-yellow-300">
            <Calendar size={14} /> Agenda TCG
          </div>
          <h1 className="mb-4 text-3xl font-bold md:text-5xl">
            Eventos y Torneos
          </h1>
          <p className="mx-auto max-w-xl text-lg text-blue-200">
            Participa en pre-releases, ligas semanales, torneos regionales y
            campeonatos oficiales en nuestras 4 tiendas.
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap justify-center gap-6 px-6 py-4">
          {[
            ["6", "Eventos proximos"],
            ["4", "Tiendas con torneos"],
            ["6", "Juegos representados"],
            ["Gratis", "Entrada ligas casuales"],
          ].map(([n, l]) => (
            <div key={l} className="text-center">
              <div className="text-xl font-bold text-[#1a3a5c]">{n}</div>
              <div className="text-xs text-gray-500">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Events */}
      <div className="mx-auto max-w-[1400px] px-6 py-12">
        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900">
          <Calendar size={20} className="text-[#1a3a5c]" /> Proximos eventos
        </h2>

        <div className="space-y-4">
          {upcoming.map((ev) => {
            const days = daysUntil(ev.date);
            const pctFull = ((ev.slots - ev.slotsLeft) / ev.slots) * 100;
            return (
              <div
                key={ev.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:shadow-md"
              >
                <div
                  className="h-1.5"
                  style={{ backgroundColor: ev.gameColor }}
                />
                <div className="p-5 md:p-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start">
                    {/* Date block */}
                    <div
                      className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-2xl font-bold text-white"
                      style={{ backgroundColor: ev.gameColor }}
                    >
                      <span className="text-2xl leading-none">
                        {new Date(ev.date + "T00:00:00").getDate()}
                      </span>
                      <span className="mt-0.5 text-xs tracking-wide uppercase">
                        {new Date(ev.date + "T00:00:00").toLocaleDateString(
                          "es-ES",
                          { month: "short" },
                        )}
                      </span>
                    </div>

                    {/* Main info */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                          style={{
                            backgroundColor: ev.gameBg,
                            color: ev.gameColor,
                          }}
                        >
                          {ev.game}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                          {ev.type}
                        </span>
                        {ev.badge && (
                          <span className="animate-pulse rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-600">
                            {ev.badge}
                          </span>
                        )}
                        {days <= 7 && days >= 0 && (
                          <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-600">
                            {days === 0 ? "HOY" : `En ${days} dias`}
                          </span>
                        )}
                      </div>
                      <h3 className="mb-1 text-lg leading-tight font-bold text-gray-900">
                        {ev.title}
                      </h3>
                      <p className="mb-3 text-sm text-gray-500">{ev.desc}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} className="text-gray-400" />{" "}
                          {formatDate(ev.date)} — {ev.time}h
                        </span>
                        <Link
                          href={`/tiendas/${ev.storeId}`}
                          className="flex items-center gap-1.5 transition hover:text-[#1a3a5c]"
                        >
                          <MapPin size={14} className="text-gray-400" />{" "}
                          {ev.store}
                        </Link>
                      </div>

                      {/* Capacity bar */}
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users size={11} /> {ev.slots - ev.slotsLeft}/
                            {ev.slots} inscritos
                          </span>
                          <span>{ev.slotsLeft} plazas libres</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pctFull}%`,
                              backgroundColor:
                                pctFull > 80 ? "#ef4444" : ev.gameColor,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Price + CTA */}
                    <div className="flex flex-shrink-0 items-center gap-3 md:flex-col md:items-end md:gap-2">
                      <div className="text-2xl font-bold text-gray-900">
                        {ev.price === 0 ? "Gratis" : `${ev.price}€`}
                      </div>
                      <button
                        className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.98]"
                        style={{ backgroundColor: ev.gameColor }}
                      >
                        Inscribirme <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Organize section */}
        <div className="mt-12 flex flex-col items-center justify-between gap-6 rounded-2xl bg-gradient-to-br from-[#1a3a5c] to-[#2d6a9f] p-8 text-white md:flex-row">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Trophy size={20} className="text-yellow-400" />
              <h3 className="text-xl font-bold">Organiza tu propio torneo</h3>
            </div>
            <p className="max-w-md text-sm text-blue-200">
              Tenemos espacio, mesas y todo lo necesario. Contactanos y montamos
              el evento perfecto para tu comunidad.
            </p>
          </div>
          <Link
            href="/contacto"
            className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-[#1a3a5c] transition hover:bg-yellow-300"
          >
            Contactar <ArrowRight size={16} />
          </Link>
        </div>

        {/* Past events */}
        <div className="mt-12">
          <h2 className="mb-6 text-xl font-bold text-gray-900">
            Eventos recientes
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {PAST_EVENTS.map((ev) => (
              <div
                key={ev.title}
                className="rounded-xl border border-gray-200 bg-white p-4 opacity-75"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Tag size={13} style={{ color: ev.gameColor }} />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: ev.gameColor }}
                  >
                    {ev.game}
                  </span>
                </div>
                <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-gray-700">
                  {ev.title}
                </h3>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                  <span>
                    {new Date(ev.date).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={10} /> {ev.participants} participantes
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
