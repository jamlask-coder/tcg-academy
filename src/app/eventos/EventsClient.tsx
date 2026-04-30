/**
 * Listado de eventos — grid de cards editoriales con cartel a la izquierda.
 *
 * Decisiones de diseño:
 * - Layout horizontal `[140px_1fr]` (en móvil colapsa a vertical) con el
 *   cartel oficial del evento a la izquierda — soporte visual del título y
 *   ancla mnemónica para usuarios recurrentes.
 * - Eventos pasados visibles en la misma rejilla, con grayscale + opacity
 *   reducida — invitan a explorarlos sin gritar; el badge "Finalizado"
 *   aclara el estado a primer vistazo.
 * - Card en reposo: barra de acento vertical + chips de datos. Hover: lift
 *   sutil (-2px), sombra crece, "Ver detalles →" se realza.
 * - Click → ruta dedicada `/eventos/[slug]` con presentación completa.
 *
 * No usa estado React → se renderiza en el server (no "use client").
 */
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Ticket,
  Trophy,
  MapPin,
} from "lucide-react";
import type { Event } from "@/types";

interface EventEntry {
  event: Event;
  storeName: string;
  past: boolean;
}

interface Props {
  events: EventEntry[];
}

export function EventsClient({ events }: Props) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {events.map(({ event, storeName, past }) => (
        <EventCard
          key={event.id}
          event={event}
          storeName={storeName}
          past={past}
        />
      ))}
    </div>
  );
}

function EventCard({
  event,
  storeName,
  past,
}: {
  event: Event;
  storeName: string;
  past: boolean;
}) {
  const accent = event.accentColor;
  const dateLabel = formatRange(event.sessions);
  const cleanStoreName = storeName.replace(/^TCG Academy\s+/i, "");

  return (
    <Link
      href={`/eventos/${event.slug}`}
      aria-label={
        past
          ? `Ver ficha del evento finalizado ${event.title}`
          : `Ver detalles de ${event.title}`
      }
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] sm:flex-row sm:items-stretch ${past ? "opacity-80 hover:opacity-100" : ""}`}
      style={
        {
          ["--accent" as string]: accent,
        } as React.CSSProperties
      }
    >
      {/* Borde superior con acento del juego — fino, editorial. En pasados
          mantiene el color pero atenuado (ya filtrado por el contenedor). */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-10 h-[3px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
        style={{ background: past ? "#9ca3af" : accent }}
      />

      {/* ── Cartel a la izquierda — tamaño compacto, ratio natural 2/3,
          object-contain para que NO se recorte ni se deforme. ────────── */}
      <div className="flex flex-shrink-0 items-center justify-center bg-gray-50 p-4 sm:w-[120px] sm:self-stretch">
        <div className="relative aspect-[2/3] w-[110px] overflow-hidden rounded-md ring-1 ring-black/5 sm:w-full">
          <Image
            src={event.posterImage}
            alt={`Cartel de ${event.title}`}
            fill
            sizes="120px"
            className={`object-contain transition-transform duration-500 group-hover:scale-[1.03] ${
              past ? "grayscale saturate-50" : ""
            }`}
          />
        </div>
      </div>

      {/* ── Contenido editorial ───────────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {/* Etiqueta superior: ESTADO · TIENDA */}
        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] uppercase">
          {past ? (
            <span className="inline-flex items-center gap-1 text-gray-400">
              <CheckCircle2 size={11} aria-hidden="true" />
              Finalizado
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: accent }}
                aria-hidden="true"
              />
              <span style={{ color: accent }}>Inscripciones abiertas</span>
            </span>
          )}
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">{cleanStoreName}</span>
        </div>

        {/* Título display — Fraunces da el toque editorial */}
        <h2
          className={`mb-1 text-[20px] leading-[1.1] font-bold tracking-tight sm:text-[22px] ${past ? "text-gray-700" : "text-gray-900"}`}
          style={{ fontFamily: "var(--font-fraunces), serif" }}
        >
          {event.title}
        </h2>
        {event.subtitle && (
          <p className="mb-4 text-[12px] font-medium text-gray-500">
            {event.subtitle}
          </p>
        )}

        {/* Resumen corto — 2 líneas */}
        <p
          className={`mb-4 line-clamp-2 text-[13px] leading-relaxed ${past ? "text-gray-500" : "text-gray-600"}`}
        >
          {event.shortDescription}
        </p>

        {/* Separador sutil */}
        <div className="mb-3 h-px w-full bg-gradient-to-r from-gray-100 via-gray-200 to-transparent" />

        {/* Datos clave — chips minimal */}
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] font-semibold text-gray-700">
          <DataInline
            icon={<Calendar size={12} />}
            text={dateLabel}
            accent={past ? "#9ca3af" : accent}
          />
          <DataInline
            icon={<Ticket size={12} />}
            text={`${event.entryFee}€`}
            accent={past ? "#9ca3af" : accent}
          />
          <DataInline
            icon={<Trophy size={12} />}
            text={event.prizeText}
            accent={past ? "#9ca3af" : accent}
          />
        </div>

        {/* Footer: ubicación + CTA */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-[10.5px] text-gray-400">
            <MapPin size={10} />
            <span className="truncate">
              {event.address}, {event.city}
            </span>
          </span>
          <span
            className="inline-flex flex-shrink-0 items-center gap-1 text-[11.5px] font-bold transition-transform group-hover:translate-x-0.5"
            style={{ color: past ? "#6b7280" : accent }}
          >
            {past ? "Ver ficha" : "Ver detalles"}
            <ArrowRight size={11} />
          </span>
        </div>
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
