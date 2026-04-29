"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Calendar,
  MapPin,
  Trophy,
  ChevronDown,
  Sparkles,
  Clock,
  Ticket,
} from "lucide-react";
import type { Event } from "@/types";

interface Props {
  events: { event: Event; storeName: string }[];
}

/**
 * Listado de eventos con cards expandibles. Cada card cerrada es una
 * "tarjeta-resumen" con cartel + datos clave. Al hacer click, se despliega
 * un panel con la presentación completa, sesiones y CTA.
 *
 * Decisiones de diseño:
 * - Cartel vertical a la izquierda en desktop (aspect 2/3 como el original).
 * - En móvil, el cartel ocupa el ancho completo y los datos van debajo.
 * - El gradiente del panel desplegado usa `accentColor` del evento — así
 *   cada juego mantiene su identidad visual.
 * - La animación de despliegue es CSS-only (max-height + opacity); evita
 *   pasar por React state-driven height calculations.
 */
export function EventsClient({ events }: Props) {
  const [openId, setOpenId] = useState<number | null>(events[0]?.event.id ?? null);

  return (
    <div className="space-y-6">
      {events.map(({ event, storeName }) => {
        const isOpen = openId === event.id;
        return (
          <EventCard
            key={event.id}
            event={event}
            storeName={storeName}
            isOpen={isOpen}
            onToggle={() => setOpenId(isOpen ? null : event.id)}
          />
        );
      })}
    </div>
  );
}

function EventCard({
  event,
  storeName,
  isOpen,
  onToggle,
}: {
  event: Event;
  storeName: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const firstSession = event.sessions[0];
  const dateLabel = firstSession ? formatDateRange(event.sessions) : "";

  return (
    <article
      className="group overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
      style={{
        borderColor: isOpen ? `${event.accentColor}33` : undefined,
      }}
    >
      {/* ── Card header (siempre visible) ─────────────────────────── */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full flex-col gap-0 text-left sm:flex-row"
      >
        {/* Cartel — vertical en desktop, horizontal con altura limitada en móvil */}
        <div
          className="relative flex-shrink-0 overflow-hidden sm:w-[220px]"
          style={{ background: `linear-gradient(135deg, ${event.accentColor}10, ${event.accentColor}25)` }}
        >
          <div className="relative aspect-[3/4] sm:aspect-[2/3] sm:h-full">
            <Image
              src={event.posterImage}
              alt={event.title}
              fill
              sizes="(max-width: 640px) 100vw, 220px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              priority
            />
            {/* Overlay sutil para legibilidad si quisiéramos texto encima */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

            {/* Badge "Próximamente" / "Inscripciones abiertas" en esquina */}
            <span
              className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase shadow-md backdrop-blur-sm"
              style={{ color: event.accentColor }}
            >
              <Sparkles size={10} /> Inscripciones abiertas
            </span>
          </div>
        </div>

        {/* Resumen */}
        <div className="flex flex-1 flex-col justify-between gap-4 p-5 sm:p-6">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase"
                style={{
                  background: `${event.accentColor}15`,
                  color: event.accentColor,
                }}
              >
                {event.subtitle ?? "Evento"}
              </span>
              <span className="text-[11px] font-semibold text-gray-400">
                · {storeName}
              </span>
            </div>
            <h2 className="mb-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
              {event.title}
            </h2>
            <p className="line-clamp-2 text-sm leading-relaxed text-gray-500">
              {event.shortDescription}
            </p>
          </div>

          {/* Datos clave — chips */}
          <div className="flex flex-wrap items-center gap-2">
            <Chip icon={<Calendar size={13} />} label={dateLabel} />
            <Chip
              icon={<Ticket size={13} />}
              label={`${event.entryFee}€`}
              accent={event.accentColor}
            />
            <Chip icon={<Trophy size={13} />} label={event.prizeText} />
            <span
              className="ml-auto inline-flex items-center gap-1 text-[12px] font-bold transition"
              style={{ color: event.accentColor }}
            >
              {isOpen ? "Cerrar" : "Ver detalles"}
              <ChevronDown
                size={14}
                className="transition-transform"
                style={{ transform: isOpen ? "rotate(180deg)" : undefined }}
              />
            </span>
          </div>
        </div>
      </button>

      {/* ── Panel desplegable ─────────────────────────────────────── */}
      <div
        className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div
            className="border-t px-5 py-6 sm:px-6 sm:py-8"
            style={{
              borderColor: `${event.accentColor}1a`,
              background: `linear-gradient(180deg, ${event.accentColor}06 0%, transparent 60%)`,
            }}
          >
            <div className="grid gap-8 lg:grid-cols-[1fr,360px]">
              {/* Columna izquierda — descripción y bullets */}
              <div>
                <h3 className="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
                  La presentación
                </h3>
                <div className="mb-6 space-y-3 text-[15px] leading-relaxed text-gray-700">
                  {event.longDescription.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>

                <h3 className="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
                  Qué te llevas
                </h3>
                <ul className="space-y-2">
                  {event.highlights.map((h, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-gray-700"
                    >
                      <span
                        className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ background: event.accentColor }}
                      />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Columna derecha — sesiones + ubicación + CTA */}
              <div className="space-y-4">
                <div
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: `${event.accentColor}33`,
                    background: "white",
                  }}
                >
                  <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase">
                    <Clock size={12} /> Sesiones
                  </h3>
                  <div className="space-y-2.5">
                    {event.sessions.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl px-3 py-2.5"
                        style={{ background: `${event.accentColor}0d` }}
                      >
                        <div>
                          <p
                            className="text-[10px] font-bold tracking-wider uppercase"
                            style={{ color: event.accentColor }}
                          >
                            {s.label}
                          </p>
                          <p className="text-base font-bold text-gray-900">
                            {formatLongDate(s.date)}
                          </p>
                        </div>
                        <span
                          className="rounded-lg px-2.5 py-1 font-mono text-base font-black"
                          style={{
                            background: event.accentColor,
                            color: "white",
                          }}
                        >
                          {s.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: `${event.accentColor}33`,
                    background: "white",
                  }}
                >
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase">
                    <MapPin size={12} /> Dónde
                  </h3>
                  <p className="text-sm font-bold text-gray-900">{storeName}</p>
                  <p className="text-sm text-gray-600">{event.address}</p>
                  <p className="text-sm text-gray-600">
                    {event.postalCode ? `${event.postalCode} ` : ""}
                    {event.city}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${event.address}, ${event.postalCode ?? ""} ${event.city}`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold transition hover:underline"
                    style={{ color: event.accentColor }}
                  >
                    Abrir en Maps →
                  </a>
                </div>

                <a
                  href={`mailto:hola@tcgacademy.es?subject=${encodeURIComponent(
                    `Inscripción: ${event.title}`,
                  )}`}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(135deg, ${event.accentColor}, ${event.accentColor}dd)`,
                    boxShadow: `0 8px 24px ${event.accentColor}40`,
                  }}
                >
                  <Ticket size={15} />
                  Reservar plaza · {event.entryFee}€
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function Chip({
  icon,
  label,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  accent?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{
        background: accent ? `${accent}15` : "#f3f4f6",
        color: accent ?? "#374151",
      }}
    >
      {icon}
      {label}
    </span>
  );
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

function formatDateRange(
  sessions: { date: string }[],
): string {
  if (sessions.length === 0) return "";
  if (sessions.length === 1) return formatLongDate(sessions[0].date);
  const first = formatLongDate(sessions[0].date);
  const last = formatLongDate(sessions[sessions.length - 1].date);
  return `${first} – ${last}`;
}
