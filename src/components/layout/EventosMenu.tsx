"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Calendar,
  MapPin,
  Trophy,
  Sparkles,
  Ticket,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EVENTS } from "@/data/events";
import { STORES } from "@/data/stores";
import type { Event } from "@/types";

interface Props {
  onClose: () => void;
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]}`;
}

function formatRange(sessions: Event["sessions"]): string {
  if (sessions.length === 0) return "";
  if (sessions.length === 1) return formatLongDate(sessions[0].date);
  return `${formatLongDate(sessions[0].date)} – ${formatLongDate(
    sessions[sessions.length - 1].date,
  )}`;
}

/**
 * Dropdown del menú "Eventos". Si solo hay un evento, lo muestra en formato
 * hero con cartel + presentación chula. Si hay varios, los lista en grid.
 *
 * Pensado para que el visitante "se enamore del evento" en 3 segundos sin
 * salir del header — cartel a la izquierda, datos clave a la derecha,
 * CTA directo a la página de eventos para inscribirse.
 */
export function EventosMenu({ onClose }: Props) {
  const events = EVENTS;
  const featured = events[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="border-t-2 bg-white shadow-xl"
      style={{ borderTopColor: featured?.accentColor ?? "#2563eb" }}
    >
      <Container className="py-6">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
            Próximos eventos
          </p>
          <Link
            href="/eventos"
            onClick={onClose}
            className="flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:underline"
          >
            Ver todos <ArrowRight size={11} />
          </Link>
        </div>

        {featured ? (
          <FeaturedEventHero event={featured} onClose={onClose} />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center">
            <p className="text-sm text-gray-400">
              Aún no hay eventos programados.
            </p>
          </div>
        )}

        {/* Si hay más de uno, listado debajo del destacado. */}
        {events.length > 1 && (
          <div className="mt-5 grid grid-cols-3 gap-3">
            {events.slice(1).map((e) => (
              <SecondaryEventCard key={e.id} event={e} onClose={onClose} />
            ))}
          </div>
        )}
      </Container>
    </motion.div>
  );
}

// ─── Hero (evento destacado) ────────────────────────────────────────────────

function FeaturedEventHero({
  event,
  onClose,
}: {
  event: Event;
  onClose: () => void;
}) {
  const store = STORES[event.storeId];
  const storeName = store?.name ?? event.storeId;
  const accent = event.accentColor;

  return (
    <Link
      href="/eventos"
      onClick={onClose}
      className="group grid overflow-hidden rounded-2xl border transition-all hover:shadow-xl sm:grid-cols-[200px,1fr]"
      style={{
        borderColor: `${accent}33`,
        background: `linear-gradient(135deg, ${accent}08 0%, transparent 60%)`,
      }}
    >
      {/* Cartel */}
      <div
        className="relative aspect-[2/3] overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${accent}10, ${accent}25)` }}
      >
        <Image
          src={event.posterImage}
          alt={event.title}
          fill
          sizes="200px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span
          className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase shadow-md backdrop-blur-sm"
          style={{ color: accent }}
        >
          <Sparkles size={9} /> Inscripciones abiertas
        </span>
      </div>

      {/* Mini-presentación */}
      <div className="flex flex-col justify-between gap-4 p-5">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase"
              style={{ background: `${accent}15`, color: accent }}
            >
              {event.subtitle ?? "Evento"}
            </span>
            <span className="text-[10px] font-semibold text-gray-400">
              · {storeName}
            </span>
          </div>
          <h3
            className="mb-2 text-xl font-black tracking-tight text-gray-900 transition group-hover:text-gray-700"
            style={{ color: undefined }}
          >
            {event.title}
          </h3>
          <p className="line-clamp-2 text-[13px] leading-relaxed text-gray-500">
            {event.shortDescription}
          </p>
        </div>

        {/* Datos clave */}
        <div className="grid grid-cols-3 gap-2">
          <Fact
            icon={<Calendar size={12} />}
            label="Fechas"
            value={formatRange(event.sessions)}
            accent={accent}
          />
          <Fact
            icon={<Ticket size={12} />}
            label="Inscripción"
            value={`${event.entryFee}€`}
            accent={accent}
          />
          <Fact
            icon={<Trophy size={12} />}
            label="Premio"
            value={event.prizeText}
            accent={accent}
          />
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <MapPin size={11} style={{ color: accent }} />
            {event.address}, {event.city}
          </span>
          <span
            className="flex items-center gap-1 text-xs font-bold"
            style={{ color: accent }}
          >
            Ver detalles <ArrowRight size={11} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function Fact({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-lg bg-white px-2.5 py-2 shadow-sm ring-1 ring-gray-100">
      <p
        className="mb-0.5 flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase"
        style={{ color: accent }}
      >
        {icon} {label}
      </p>
      <p className="truncate text-xs font-bold text-gray-900">{value}</p>
    </div>
  );
}

// ─── Secundario (eventos no destacados) ─────────────────────────────────────

function SecondaryEventCard({
  event,
  onClose,
}: {
  event: Event;
  onClose: () => void;
}) {
  const accent = event.accentColor;
  return (
    <Link
      href="/eventos"
      onClick={onClose}
      className="group flex items-start gap-3 rounded-xl border border-gray-100 p-3 transition-all hover:border-gray-200 hover:shadow-sm"
    >
      <div className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded-md">
        <Image
          src={event.posterImage}
          alt={event.title}
          fill
          sizes="40px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm leading-tight font-semibold text-gray-800 group-hover:text-gray-900">
          {event.title}
        </p>
        <p
          className="mt-0.5 truncate text-[10px] font-bold tracking-wider uppercase"
          style={{ color: accent }}
        >
          {formatRange(event.sessions)}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-gray-400">
          {event.entryFee}€ · {event.prizeText}
        </p>
      </div>
    </Link>
  );
}
