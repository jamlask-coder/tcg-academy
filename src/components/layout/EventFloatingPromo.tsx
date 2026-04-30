"use client";

/**
 * Widget flotante (esquina inferior derecha) que promociona el evento
 * destacado de la home. Se inspira en los chats de soporte (Intercom,
 * Crisp) — aparece tras un delay, es minimizable y recuerda el estado
 * de cierre vía localStorage.
 *
 * Estados:
 *   - hidden       → el usuario lo cerró ya en esta sesión/dispositivo
 *   - collapsed    → solo el avatar circular con badge (no molesta)
 *   - expanded     → mini-tarjeta con cartel + datos clave + CTA
 *
 * Reglas:
 *   - No aparece en /eventos (redundante), ni en /admin, ni en /finalizar-compra.
 *   - Aparece tras 3 s para no entorpecer la primera impresión.
 *   - El cierre con la X persiste 7 días por evento (`event:<id>` en LS).
 *   - "Recordármelo" minimiza pero no oculta (vuelve a la ronda al recargar).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  X,
  Calendar,
  Trophy,
  Ticket,
  Sparkles,
  ChevronUp,
} from "lucide-react";
import { getUpcomingEvents } from "@/data/events";
import { STORES } from "@/data/stores";
import type { Event } from "@/types";

const STORAGE_PREFIX = "tcga_event_promo_dismissed:";
const DISMISSAL_TTL_DAYS = 7;
const SHOW_AFTER_MS = 3000;

// Navy de la marca — pinta el header del widget para que case con el resto
// del site. El color del juego sigue presente como acento (stripe + halo).
const BRAND_NAVY = "#132B5F";

const MONTHS = [
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

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]}`;
}

function formatRange(sessions: Event["sessions"]): string {
  if (sessions.length === 0) return "";
  if (sessions.length === 1) return formatShortDate(sessions[0].date);
  return `${formatShortDate(sessions[0].date)} – ${formatShortDate(
    sessions[sessions.length - 1].date,
  )}`;
}

function isDismissed(eventId: number): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${eventId}`);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    const ageDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return ageDays < DISMISSAL_TTL_DAYS;
  } catch {
    return false;
  }
}

function markDismissed(eventId: number): void {
  try {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}${eventId}`,
      String(Date.now()),
    );
  } catch {
    /* noop */
  }
}

function pickFeaturedEvent(): Event | null {
  // Helper canónico filtra y ordena. Si todos están pasados, no muestra nada.
  return getUpcomingEvents()[0] ?? null;
}

export function EventFloatingPromo() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [closed, setClosed] = useState(false);

  const event = pickFeaturedEvent();

  // Diferimos a useEffect porque depende de localStorage (cliente only).
  // Caso canónico de "syncing with an external system" → React docs lo
  // permiten aunque el lint set-state-in-effect avise.
  useEffect(() => {
    if (!event) return;
    if (isDismissed(event.id)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClosed(true);
      return;
    }
    const t = setTimeout(() => {
      setVisible(true);
    }, SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [event]);

  if (!event || closed) return null;

  // Rutas donde el widget molesta o duplica info
  const hiddenOn =
    pathname.startsWith("/eventos") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/finalizar-compra") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/registro");
  if (hiddenOn) return null;

  const store = STORES[event.storeId];
  const storeName = store?.name?.replace("TCG Academy ", "") ?? event.storeId;
  const accent = event.accentColor;

  const handleClose = () => {
    markDismissed(event.id);
    setClosed(true);
  };

  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:right-5 sm:bottom-5"
      style={{
        transform: visible ? "translateY(0)" : "translateY(40px)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease",
      }}
    >
      {expanded ? (
        <ExpandedCard
          event={event}
          storeName={storeName}
          accent={accent}
          onMinimize={() => setExpanded(false)}
          onClose={handleClose}
        />
      ) : (
        <CollapsedBubble
          event={event}
          accent={accent}
          onExpand={() => setExpanded(true)}
        />
      )}
    </div>
  );
}

// ─── Estado expandido ───────────────────────────────────────────────────────

function ExpandedCard({
  event,
  storeName,
  accent,
  onMinimize,
  onClose,
}: {
  event: Event;
  storeName: string;
  accent: string;
  onMinimize: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="pointer-events-auto relative w-[320px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:w-[360px]"
      style={{
        boxShadow: `0 20px 50px -12px ${accent}30, 0 8px 24px rgba(10,22,40,0.18)`,
      }}
    >
      {/* Cabecera navy de marca — el color del juego entra como stripe + halo
          para no romper la identidad del site al cambiar de evento. */}
      <div
        className="relative px-4 pt-4 pb-3"
        style={{
          background: `linear-gradient(135deg, ${BRAND_NAVY} 0%, #0a1628 100%)`,
        }}
      >
        {/* Stripe vertical con el color del juego — sutil pero presente */}
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 h-full w-1"
          style={{ background: accent }}
        />
        {/* Halo del color del juego difuminado en la esquina */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle at 85% 0%, ${accent}55, transparent 55%)`,
          }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm"
              style={{ background: `${accent}40` }}
            >
              <Sparkles size={14} style={{ color: accent }} />
            </span>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-white/70 uppercase">
                Evento destacado
              </p>
              <p className="text-[11px] font-semibold text-white">
                {storeName}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onMinimize}
              aria-label="Minimizar"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
            >
              <ChevronUp size={13} className="rotate-180" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar y no mostrar más"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Cuerpo: cartel + texto */}
      <Link
        href={`/eventos/${event.slug}`}
        className="group flex gap-3 p-3 transition hover:bg-gray-50"
      >
        <div className="relative h-[120px] w-[80px] flex-shrink-0 overflow-hidden rounded-lg shadow-md ring-1 ring-black/5">
          <Image
            src={event.posterImage}
            alt={event.title}
            fill
            sizes="80px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="line-clamp-2 text-sm leading-tight font-black tracking-tight text-gray-900">
            {event.title}
          </h3>
          <p className="line-clamp-2 text-[11px] leading-snug text-gray-500">
            {event.shortDescription}
          </p>

          <div className="space-y-1 pt-0.5">
            <Row
              icon={<Calendar size={11} />}
              text={formatRange(event.sessions)}
              accent={accent}
            />
            <Row
              icon={<Ticket size={11} />}
              text={`${event.entryFee}€ · inscripción`}
              accent={accent}
            />
            <Row
              icon={<Trophy size={11} />}
              text={event.prizeText}
              accent={accent}
            />
          </div>
        </div>
      </Link>

      {/* CTA — la entrada se compra como un producto: va al detalle del
          evento donde el botón "Comprar entrada" mete el ticket al carrito.
          Mismo lenguaje dorado que "Añadir al carrito" en producto. */}
      <Link href={`/eventos/${event.slug}`} className="block px-3 pb-3">
        <span className="gold-sweep flex items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-amber-500 bg-gradient-to-r from-white to-amber-50 py-2.5 text-xs font-bold text-amber-800 shadow-[0_2px_12px_rgba(217,119,6,0.28)] transition hover:from-amber-50 hover:to-amber-100 hover:shadow-[0_6px_22px_rgba(217,119,6,0.4)] active:scale-[0.98]">
          <Ticket size={13} />
          Comprar entrada · {event.entryFee}€
        </span>
      </Link>
    </div>
  );
}

function Row({
  icon,
  text,
  accent,
}: {
  icon: React.ReactNode;
  text: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700">
      <span style={{ color: accent }}>{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

// ─── Estado colapsado (burbuja) ─────────────────────────────────────────────

function CollapsedBubble({
  event,
  accent,
  onExpand,
}: {
  event: Event;
  accent: string;
  onExpand: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={`Ver evento: ${event.title}`}
      className="pointer-events-auto group relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full shadow-2xl ring-2 ring-white transition-transform hover:scale-110 active:scale-95"
      style={{
        boxShadow: `0 12px 32px -8px ${accent}80, 0 4px 12px rgba(0,0,0,0.15)`,
      }}
    >
      <Image
        src={event.posterImage}
        alt={event.title}
        fill
        sizes="56px"
        className="object-cover"
      />
      {/* Badge pulsante */}
      <span
        className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
        style={{ background: accent }}
      >
        <span
          className="absolute inset-0 animate-ping rounded-full opacity-60"
          style={{ background: accent }}
        />
        <Sparkles size={9} className="relative" />
      </span>
    </button>
  );
}
