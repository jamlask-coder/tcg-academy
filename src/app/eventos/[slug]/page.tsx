/**
 * Página de detalle de evento — `/eventos/<slug>`.
 *
 * Composición por capas, tipográfica y editorial. El cartel oficial del
 * evento (`posterImage`) se integra como apoyo visual en el hero (no como
 * fondo gigante pixelado: framed, contenido a su tamaño natural).
 *
 * Renderiza tanto eventos próximos como pasados:
 *  - Próximo  → eyebrow "Inscripciones abiertas" + CTA reservar
 *  - Pasado   → eyebrow "Evento finalizado" + nota cerrada (sin CTA)
 *
 * SSG → `generateStaticParams` lista todos los slugs (incluidos pasados,
 * porque el historial enlaza a sus fichas).
 */

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  Ticket,
  Trophy,
} from "lucide-react";
import { EVENTS, getUpcomingEvents, isEventPast } from "@/data/events";
import { STORES } from "@/data/stores";
import type { Event } from "@/types";
import {
  breadcrumbJsonLd,
  eventJsonLd,
  jsonLdProps,
} from "@/lib/seo";
import { AddEventTicketButton } from "@/components/events/AddEventTicketButton";
import { SessionFullControl } from "@/components/events/SessionFullControl";

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
    alternates: { canonical: `/eventos/${event.slug}` },
    openGraph: {
      title: event.title,
      description: event.shortDescription,
      type: "article",
      url: `/eventos/${event.slug}`,
      images: event.posterImage ? [{ url: event.posterImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: event.shortDescription,
      images: event.posterImage ? [event.posterImage] : undefined,
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
  const past = isEventPast(event);

  // Otros próximos eventos (excluyendo el actual). Solo se sugieren
  // próximos, nunca pasados — pasados están en /eventos/historial.
  const otherEvents = getUpcomingEvents()
    .filter((e) => e.slug !== event.slug)
    .slice(0, 3);

  // JSON-LD: Event + BreadcrumbList — invisibles para el usuario, oro para
  // los carruseles de eventos de Google y los crawlers de IA.
  const eventLd = eventJsonLd(event, store);
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Inicio", url: "/" },
    { name: "Eventos", url: "/eventos" },
    { name: event.title, url: `/eventos/${event.slug}` },
  ]);

  return (
    <article className="bg-white">
      <script {...jsonLdProps(eventLd)} />
      <script {...jsonLdProps(breadcrumbLd)} />

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Capa de fondo — gradiente del juego, muy sutil */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 70% 60% at 50% 0%, ${accent}14 0%, transparent 60%)`,
          }}
        />
        {/* Línea de acento superior */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: past ? "#9ca3af" : accent }}
        />

        {/* Volver — anclado en la esquina, no roba alto al hero */}
        <Link
          href={past ? "/eventos/historial" : "/eventos"}
          className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 transition hover:text-gray-900 sm:top-5 sm:left-6"
        >
          <ArrowLeft size={12} />
          {past ? "Volver al historial" : "Todos los eventos"}
        </Link>

        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-10 sm:pt-12 sm:pb-12">
          {/* Layout tipo ficha de producto:
              - Cartel (foto principal) a la izquierda, ratio 2/3 real.
              - Bloque editorial a la derecha: eyebrow, título, descripción,
                stats y CTA en un único plano.
              - En mobile colapsa a una columna (poster primero, luego texto). */}
          <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-start lg:gap-12">
            {/* Columna izquierda — cartel oficial */}
            <aside className="lg:sticky lg:top-24">
              <PosterFrame event={event} accent={accent} past={past} />
            </aside>

            {/* Columna derecha — info ordenada como una ficha de producto */}
            <div className="flex flex-col">
              {/* Eyebrow: estado + tienda */}
              <div className="mb-5 flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.16em] uppercase">
                {past ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-gray-500">
                    <CheckCircle2 size={11} /> Evento finalizado
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
                    style={{ background: `${accent}18`, color: accent }}
                  >
                    <Sparkles size={11} /> Inscripciones abiertas
                  </span>
                )}
                <span className="text-gray-300">·</span>
                <span className="text-gray-500">
                  {event.subtitle ?? "Evento presencial"}
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-gray-500">{storeName}</span>
              </div>

              {/* Título display */}
              <h1
                className="mb-4 text-[32px] leading-[1.05] font-bold tracking-tight text-gray-900 sm:text-[40px] lg:text-[44px]"
                style={{ fontFamily: "var(--font-fraunces), serif" }}
              >
                {event.title}
              </h1>

              <p className="mb-8 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
                {event.shortDescription}
              </p>

              {/* 3 stats clave */}
              <div className="mb-8 grid gap-3 sm:grid-cols-3">
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

              {/* CTA principal alineado al final del bloque (bottom-right en
                  desktop, full-width arriba en mobile como cualquier ficha
                  de producto). El ticket entra al carrito como producto. */}
              {past ? (
                <p className="text-[13px] text-gray-400">
                  Este evento ya finalizó.{" "}
                  <Link
                    href="/eventos"
                    className="font-semibold text-[#2563eb] hover:underline"
                  >
                    Ver próximos eventos →
                  </Link>
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
                  <span className="text-[12px] text-gray-400">
                    Plazas limitadas
                  </span>
                  <AddEventTicketButton event={event} />
                </div>
              )}
            </div>
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

          {/* Derecha: sesiones + ubicación */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <SidePanel accent={accent} icon={<Clock size={13} />} title="Sesiones">
              <div className="space-y-2.5">
                {event.sessions.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-xl px-3.5 py-3"
                    style={{ background: `${accent}0d` }}
                  >
                    <div className="flex items-center justify-between">
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
                    {!past && (
                      <SessionFullControl
                        eventId={event.id}
                        sessionIdx={i}
                        accent={accent}
                      />
                    )}
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

function PosterFrame({
  event,
  accent,
  past,
}: {
  event: Event;
  accent: string;
  past: boolean;
}) {
  // Altura limitada por viewport (min con 560px) → en pantallas cortas el
  // cartel se reduce y deja sitio al texto; en pantallas grandes no crece
  // más allá de su tamaño natural. El ancho se deriva del aspect-ratio
  // 2/3 → así nunca se deforma.
  return (
    <div className="flex w-full justify-center lg:justify-start">
      <div
        className="relative aspect-[2/3] h-[min(72vh,560px)] overflow-hidden rounded-2xl ring-1 ring-black/5"
        style={{
          boxShadow: `0 24px 60px -20px ${accent}55, 0 4px 16px rgba(0,0,0,0.12)`,
        }}
      >
        <Image
          src={event.posterImage}
          alt={`Cartel oficial: ${event.title}`}
          fill
          sizes="(max-width: 1024px) 60vh, 380px"
          className={`object-cover ${past ? "opacity-70 saturate-50" : ""}`}
          priority
        />
        {past && (
          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent p-4">
            <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold tracking-[0.14em] text-gray-700 uppercase backdrop-blur-sm">
              Finalizado
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

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
      <h3 className="mb-3 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] text-gray-500 uppercase">
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
