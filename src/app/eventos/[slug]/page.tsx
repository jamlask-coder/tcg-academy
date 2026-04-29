/**
 * Página de detalle de evento — `/eventos/<slug>`.
 *
 * Composición por capas, tipográfica y editorial — sin póster horneado.
 * El antiguo PNG mezclaba arte+texto+logos en baja resolución (cutre).
 * Esta página rinde todo desde React → crisp en cualquier resolución.
 *
 * Estructura:
 *   1. Hero (gradiente acento + display Fraunces + 3 stats grandes + CTA)
 *   2. Sobre el evento (longDescription)
 *   3. Qué te llevas (highlights)
 *   4. Sesiones (cards grandes con fecha+hora)
 *   5. Cómo llegar (dirección + Google Maps)
 *   6. Otros próximos eventos (si los hay)
 *
 * SSG → `generateStaticParams` lista todos los slugs. `generateMetadata`
 * personaliza title/description/OG por evento.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Ticket,
  Trophy,
} from "lucide-react";
import { EVENTS } from "@/data/events";
import { STORES } from "@/data/stores";
import type { Event } from "@/types";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return EVENTS.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const event = EVENTS.find((e) => e.slug === slug);
  if (!event) {
    return { title: "Evento no encontrado" };
  }
  return {
    title: event.title,
    description: event.shortDescription,
    openGraph: {
      title: event.title,
      description: event.shortDescription,
      type: "article",
    },
  };
}

export default async function EventDetailPage({ params }: RouteParams) {
  const { slug } = await params;
  const event = EVENTS.find((e) => e.slug === slug);
  if (!event) notFound();

  const store = STORES[event.storeId];
  const storeName = store?.name ?? event.storeId;
  const accent = event.accentColor;

  const otherEvents = EVENTS.filter(
    (e) => e.slug !== event.slug && lastSessionDate(e) >= todayIso(),
  ).slice(0, 3);

  return (
    <article className="bg-white">
      {/* ── Breadcrumb / volver ─────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 pt-8">
        <Link
          href="/eventos"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={13} />
          Todos los eventos
        </Link>
      </div>

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Capa de fondo — gradiente del juego, muy sutil para no competir
            con la tipografía. El "wow" lo da el contenido, no el adorno. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 70% 60% at 50% 0%, ${accent}14 0%, transparent 60%)`,
          }}
        />
        {/* Línea de acento superior — fina, editorial */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: accent }}
        />

        <div className="relative mx-auto max-w-5xl px-4 pt-12 pb-16 sm:pt-16 sm:pb-20">
          {/* Eyebrow: tipo de evento + tienda */}
          <div className="mb-8 flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.16em] uppercase">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
              style={{ background: `${accent}18`, color: accent }}
            >
              <Sparkles size={11} /> Inscripciones abiertas
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">
              {event.subtitle ?? "Evento presencial"}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">{storeName}</span>
          </div>

          {/* Título display — Fraunces, grande, editorial */}
          <h1
            className="mb-5 max-w-3xl text-[44px] leading-[1.05] font-bold tracking-tight text-gray-900 sm:text-[60px]"
            style={{ fontFamily: "var(--font-fraunces), serif" }}
          >
            {event.title}
          </h1>

          <p className="mb-10 max-w-2xl text-[17px] leading-relaxed text-gray-600 sm:text-[18px]">
            {event.shortDescription}
          </p>

          {/* 3 stats clave — grandes y profesionales */}
          <div className="grid gap-4 sm:grid-cols-3">
            <BigStat
              icon={<Calendar size={16} />}
              label="Fechas"
              value={formatRange(event.sessions)}
              accent={accent}
            />
            <BigStat
              icon={<Ticket size={16} />}
              label="Inscripción"
              value={`${event.entryFee}€`}
              accent={accent}
            />
            <BigStat
              icon={<Trophy size={16} />}
              label="Premio"
              value={event.prizeText}
              accent={accent}
            />
          </div>

          {/* CTA principal */}
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href={`mailto:hola@tcgacademy.es?subject=${encodeURIComponent(`Inscripción: ${event.title}`)}`}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
                boxShadow: `0 10px 28px ${accent}40`,
              }}
            >
              <Ticket size={15} />
              Reservar plaza · {event.entryFee}€
            </a>
            <span className="text-[12px] text-gray-400">
              Plazas limitadas
            </span>
          </div>
        </div>
      </section>

      {/* ── Cuerpo: presentación + sesiones ──────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr,360px] lg:gap-16">
          {/* Izquierda: presentación + qué te llevas */}
          <div>
            <SectionTitle accent={accent}>La presentación</SectionTitle>
            <div className="mb-12 space-y-4 text-[16px] leading-[1.75] text-gray-700">
              {event.longDescription.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            <SectionTitle accent={accent}>Qué te llevas</SectionTitle>
            <ul className="space-y-3">
              {event.highlights.map((h, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-[15px] text-gray-700"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{ background: accent }}
                  />
                  {h}
                </li>
              ))}
            </ul>
          </div>

          {/* Derecha: sesiones + ubicación, sticky en desktop */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <SidePanel accent={accent} icon={<Clock size={13} />} title="Sesiones">
              <div className="space-y-2.5">
                {event.sessions.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl px-3.5 py-3"
                    style={{ background: `${accent}0d` }}
                  >
                    <div className="min-w-0">
                      <p
                        className="text-[10px] font-bold tracking-[0.14em] uppercase"
                        style={{ color: accent }}
                      >
                        {s.label}
                      </p>
                      <p className="truncate text-[15px] font-bold text-gray-900">
                        {formatLong(s.date)}
                      </p>
                    </div>
                    <span
                      className="rounded-lg px-2.5 py-1 font-mono text-[15px] font-black text-white"
                      style={{ background: accent }}
                    >
                      {s.time}
                    </span>
                  </div>
                ))}
              </div>
            </SidePanel>

            <SidePanel accent={accent} icon={<MapPin size={13} />} title="Dónde">
              <p className="text-[14px] font-bold text-gray-900">{storeName}</p>
              <p className="text-[13px] text-gray-600">{event.address}</p>
              <p className="text-[13px] text-gray-600">
                {event.postalCode ? `${event.postalCode} ` : ""}
                {event.city}
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${event.address}, ${event.postalCode ?? ""} ${event.city}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold transition hover:underline"
                style={{ color: accent }}
              >
                Abrir en Google Maps
                <ArrowRight size={11} />
              </a>
            </SidePanel>
          </aside>
        </div>
      </section>

      {/* ── Otros próximos eventos ────────────────────────────────── */}
      {otherEvents.length > 0 && (
        <section className="border-t border-gray-100 bg-gray-50/50">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <p className="mb-6 text-[10px] font-bold tracking-[0.16em] text-gray-400 uppercase">
              Otros próximos eventos
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {otherEvents.map((e) => (
                <OtherEventLink key={e.id} event={e} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}

// ─── Subcomponentes ────────────────────────────────────────────────────────

function BigStat({
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
    <div className="rounded-2xl border border-gray-200/80 bg-white px-5 py-4">
      <p
        className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase"
        style={{ color: accent }}
      >
        {icon} {label}
      </p>
      <p className="text-[20px] leading-tight font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function SectionTitle({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <h2 className="mb-5 flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] uppercase">
      <span
        aria-hidden="true"
        className="inline-block h-px w-6"
        style={{ background: accent }}
      />
      <span className="text-gray-700">{children}</span>
    </h2>
  );
}

function SidePanel({
  icon,
  title,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border bg-white p-4"
      style={{ borderColor: `${accent}26` }}
    >
      <h3
        className="mb-3 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] text-gray-500 uppercase"
      >
        <span style={{ color: accent }}>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function OtherEventLink({ event }: { event: Event }) {
  const accent = event.accentColor;
  return (
    <Link
      href={`/eventos/${event.slug}`}
      className="group flex flex-col rounded-xl border border-gray-200/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <span
        className="mb-2 inline-flex w-fit items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase"
        style={{ color: accent }}
      >
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: accent }}
        />
        {formatRange(event.sessions)}
      </span>
      <p
        className="line-clamp-2 text-[14px] leading-snug font-bold text-gray-900"
        style={{ fontFamily: "var(--font-fraunces), serif" }}
      >
        {event.title}
      </p>
      <span
        className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold transition-transform group-hover:translate-x-0.5"
        style={{ color: accent }}
      >
        Ver detalles <ArrowRight size={11} />
      </span>
    </Link>
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
const MONTHS_LONG = [
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

function formatShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

function formatLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} de ${MONTHS_LONG[m - 1]}`;
}

function formatRange(sessions: { date: string }[]): string {
  if (sessions.length === 0) return "";
  if (sessions.length === 1) return formatShort(sessions[0].date);
  return `${formatShort(sessions[0].date)} – ${formatShort(
    sessions[sessions.length - 1].date,
  )}`;
}

function lastSessionDate(e: Event): string {
  return e.sessions[e.sessions.length - 1]?.date ?? "";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
