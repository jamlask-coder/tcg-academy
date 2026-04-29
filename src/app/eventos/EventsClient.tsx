/**
 * Listado de eventos — grid de cards compactas y editoriales.
 *
 * Decisiones de diseño (rebuild 2026-04-29):
 * - Sin póster horneado: composición pura tipográfica + acento del juego.
 *   El antiguo PNG mezclaba arte+texto+logos en baja resolución y se veía
 *   pixelado a cualquier tamaño. Ahora la card escala perfecta a 4K.
 * - Card en reposo: barra de acento vertical + ESTRENO/JUEGO/FECHA, título
 *   display Fraunces, datos clave en línea inferior.
 * - Hover: lift sutil (-2px), sombra crece, borde adopta el accent del juego,
 *   aparece el resumen corto y el "Ver detalles →" se realza. Esto es el
 *   "algo pequeño" que el usuario pidió ver al pasar el ratón.
 * - Click → ruta dedicada `/eventos/[slug]` con presentación completa.
 *
 * No usa estado React → se renderiza en el server (no "use client").
 */
import Link from "next/link";
import { ArrowRight, Calendar, Ticket, Trophy, MapPin } from "lucide-react";
import type { Event } from "@/types";

interface Props {
  events: { event: Event; storeName: string }[];
}

export function EventsClient({ events }: Props) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {events.map(({ event, storeName }) => (
        <EventCard key={event.id} event={event} storeName={storeName} />
      ))}
    </div>
  );
}

function EventCard({
  event,
  storeName,
}: {
  event: Event;
  storeName: string;
}) {
  const accent = event.accentColor;
  const dateLabel = formatRange(event.sessions);
  const cleanStoreName = storeName.replace(/^TCG Academy\s+/i, "");

  return (
    <Link
      href={`/eventos/${event.slug}`}
      aria-label={`Ver detalles de ${event.title}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] sm:p-7"
      style={
        {
          ["--accent" as string]: accent,
        } as React.CSSProperties
      }
    >
      {/* Borde superior con acento del juego — fino, editorial */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
        style={{ background: accent }}
      />

      {/* Etiqueta superior: ESTADO · JUEGO · TIENDA */}
      <div className="mb-5 flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] uppercase">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: accent }}
          />
          <span style={{ color: accent }}>Inscripciones abiertas</span>
        </span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-500">{cleanStoreName}</span>
      </div>

      {/* Título display — Fraunces da el toque editorial */}
      <h2
        className="font-fraunces mb-1 text-[26px] leading-[1.1] font-bold tracking-tight text-gray-900 sm:text-[28px]"
        style={{ fontFamily: "var(--font-fraunces), serif" }}
      >
        {event.title}
      </h2>
      {event.subtitle && (
        <p className="mb-5 text-[13px] font-medium text-gray-500">
          {event.subtitle}
        </p>
      )}

      {/* Resumen corto — 2 líneas */}
      <p className="mb-6 line-clamp-2 text-[14px] leading-relaxed text-gray-600">
        {event.shortDescription}
      </p>

      {/* Separador sutil */}
      <div className="mb-5 h-px w-full bg-gradient-to-r from-gray-100 via-gray-200 to-transparent" />

      {/* Datos clave — chips minimal */}
      <div className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-semibold text-gray-700">
        <DataInline icon={<Calendar size={13} />} text={dateLabel} accent={accent} />
        <DataInline
          icon={<Ticket size={13} />}
          text={`${event.entryFee}€`}
          accent={accent}
        />
        <DataInline
          icon={<Trophy size={13} />}
          text={event.prizeText}
          accent={accent}
        />
      </div>

      {/* Footer: ubicación + CTA */}
      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-[11px] text-gray-400">
          <MapPin size={11} />
          <span className="truncate">
            {event.address}, {event.city}
          </span>
        </span>
        <span
          className="inline-flex flex-shrink-0 items-center gap-1 text-[12px] font-bold transition-transform group-hover:translate-x-0.5"
          style={{ color: accent }}
        >
          Ver detalles
          <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
}

function DataInline({
  icon,
  text,
  accent,
}: {
  icon: React.ReactNode;
  text: string;
  accent: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span style={{ color: accent }}>{icon}</span>
      <span>{text}</span>
    </span>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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
