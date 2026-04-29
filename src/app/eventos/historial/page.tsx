/**
 * Historial de eventos — `/eventos/historial`.
 *
 * Lista cronológica inversa de eventos ya finalizados. Card simple, sin CTA
 * de reserva (el evento ya pasó). Click → ficha de detalle (que renderiza
 * en modo "evento finalizado", no en modo "inscripciones abiertas").
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calendar, MapPin } from "lucide-react";
import { getPastEvents } from "@/data/events";
import { STORES } from "@/data/stores";
import type { Event } from "@/types";

export const metadata: Metadata = {
  title: "Historial de eventos — TCG Academy",
  description:
    "Repaso de presentaciones, torneos y prereleases que hemos celebrado en las tiendas TCG Academy.",
  // No tiene sentido indexar el historial — es contenido cronológico
  // que aporta poco SEO frente a las páginas individuales de cada evento.
  robots: { index: false, follow: true },
};

export default function HistorialEventosPage() {
  const past = getPastEvents();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <Link
        href="/eventos"
        className="mb-8 inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 transition hover:text-gray-900"
      >
        <ArrowLeft size={13} />
        Volver a próximos eventos
      </Link>

      <header className="mb-10 sm:mb-14">
        <span className="mb-3 inline-block rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
          Historial
        </span>
        <h1 className="mb-3 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
          Lo que hemos jugado
        </h1>
        <p className="max-w-2xl text-base text-gray-500">
          Un repaso a presentaciones, torneos y prereleases pasados. Si te
          interesa que repitamos alguno o quieres organizar otro,{" "}
          <a
            href="mailto:hola@tcgacademy.es"
            className="font-semibold text-[#2563eb] hover:underline"
          >
            escríbenos
          </a>
          .
        </p>
      </header>

      {past.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-20 text-center">
          <p className="text-sm text-gray-400">
            Aún no hay eventos finalizados.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {past.map((event) => (
            <PastEventRow key={event.id} event={event} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PastEventRow({ event }: { event: Event }) {
  const store = STORES[event.storeId];
  const storeName = (store?.name ?? event.storeId).replace(
    /^TCG Academy\s+/i,
    "",
  );

  return (
    <li>
      <Link
        href={`/eventos/${event.slug}`}
        className="group flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-5 transition-all hover:border-gray-200 hover:shadow-sm sm:flex-row sm:items-center sm:gap-5"
      >
        {/* Fecha — bloque compacto a la izquierda */}
        <div
          className="flex min-w-[88px] flex-shrink-0 flex-col items-center justify-center rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-center"
          style={{ background: `${event.accentColor}08` }}
        >
          <span
            className="text-[9px] font-bold tracking-[0.16em] uppercase"
            style={{ color: event.accentColor }}
          >
            <Calendar size={10} className="mr-1 inline" />
            Pasado
          </span>
          <span className="mt-0.5 text-[13px] font-bold text-gray-700">
            {formatRange(event.sessions)}
          </span>
        </div>

        {/* Contenido principal */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold tracking-[0.14em] text-gray-400 uppercase">
            {event.subtitle ?? "Evento"}
          </p>
          <h2
            className="truncate text-[18px] font-bold leading-tight text-gray-900"
            style={{ fontFamily: "var(--font-fraunces), serif" }}
          >
            {event.title}
          </h2>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-gray-500">
            <MapPin size={11} />
            {storeName} · {event.city}
          </p>
        </div>

        <span className="hidden flex-shrink-0 items-center gap-1 text-[12px] font-semibold text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-600 sm:inline-flex">
          Ver ficha <ArrowRight size={11} />
        </span>
      </Link>
    </li>
  );
}

const MONTHS_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function formatShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

function formatRange(sessions: { date: string }[]): string {
  if (sessions.length === 0) return "";
  if (sessions.length === 1) return formatShort(sessions[0].date);
  return `${formatShort(sessions[0].date)} – ${formatShort(
    sessions[sessions.length - 1].date,
  )}`;
}
