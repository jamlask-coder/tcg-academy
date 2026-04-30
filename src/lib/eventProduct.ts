/**
 * Eventos como producto — puente para que las entradas a eventos viajen por
 * el mismo pipeline que los productos físicos: carrito, checkout, pedidos,
 * facturas, puntos, etc.
 *
 * Diseño:
 *  - Cada `Event` tiene N "virtual products" derivables on-the-fly, UNO POR
 *    SESIÓN. NO se persisten — la fuente única sigue siendo `EVENTS` en
 *    `@/data/events`. Cada sesión (sábado, domingo…) es un producto virtual
 *    distinto con su propio stock para que la disponibilidad de cada día
 *    sea independiente.
 *  - El ID virtual codifica `(eventId, sessionIdx)` en un rango reservado
 *    (>= EVENT_PRODUCT_ID_BASE) para no colisionar con IDs estáticos de
 *    PRODUCTS ni admin-creados.
 *
 *      virtualId = EVENT_PRODUCT_ID_BASE + eventId * SESSIONS_PER_EVENT + sessionIdx
 *
 *    Eso permite hasta 100 sesiones por evento — sobra.
 *  - `getMergedById` y `priceVerification.getMergedProduct` consultan
 *    también este puente, así toda la pila (carrito, checkout, server
 *    verification) resuelve los tickets sin ramas especiales.
 *  - El admin puede cerrar manualmente la venta online de una sesión
 *    específica (eventSessionStatusService) — eso se aplica al stock del
 *    LocalProduct virtual de esa sesión.
 *
 * No se modifican los listados de catálogo: los productos virtuales solo
 * aparecen al pedirlos por ID o slug — no contaminan /catalogo, /[game]
 * ni la home.
 */

import type { LocalProduct } from "@/data/products";
import type { Event, EventSession } from "@/types";
import { EVENTS } from "@/data/events";
import { isSessionMarkedFull } from "@/services/eventSessionStatusService";

/**
 * Base del rango reservado. Cualquier ID >= 90_000_000 y < 1_700_000_000_000
 * es un "evento como producto".
 */
export const EVENT_PRODUCT_ID_BASE = 90_000_000;
const EVENT_PRODUCT_ID_LIMIT = 1_700_000_000_000;

/** Máximo de sesiones por evento codificables en el ID (100 sobra). */
export const SESSIONS_PER_EVENT = 100;

/**
 * Aforo por defecto si la sesión no declara `capacity` propio (y el evento
 * tampoco un `capacity` global). 24 = mesas estándar de torneo TCG en una
 * tienda física.
 */
export const DEFAULT_EVENT_CAPACITY = 24;

export function eventVirtualId(eventId: number, sessionIdx: number): number {
  return EVENT_PRODUCT_ID_BASE + eventId * SESSIONS_PER_EVENT + sessionIdx;
}

export function isEventVirtualId(id: number): boolean {
  return id >= EVENT_PRODUCT_ID_BASE && id < EVENT_PRODUCT_ID_LIMIT;
}

/** Decodifica un virtualId en `(eventId, sessionIdx)`. */
export function decodeEventVirtualId(
  id: number,
): { eventId: number; sessionIdx: number } | undefined {
  if (!isEventVirtualId(id)) return undefined;
  const offset = id - EVENT_PRODUCT_ID_BASE;
  const eventId = Math.floor(offset / SESSIONS_PER_EVENT);
  const sessionIdx = offset % SESSIONS_PER_EVENT;
  return { eventId, sessionIdx };
}

export function eventVirtualSlug(eventSlug: string, sessionIdx: number): string {
  return sessionIdx === 0
    ? `evento-${eventSlug}`
    : `evento-${eventSlug}-s${sessionIdx}`;
}

/** Aforo efectivo de una sesión: capacity propio → del evento → DEFAULT. */
function sessionCapacity(e: Event, session: EventSession): number {
  return session.capacity ?? e.capacity ?? DEFAULT_EVENT_CAPACITY;
}

/**
 * Convierte una sesión concreta de un Event en un LocalProduct para que el
 * carrito y la facturación la traten igual que cualquier otro producto.
 * Si el admin marcó la sesión como llena, se devuelve `stock: 0` y
 * `inStock: false` para que el carrito ya no admita entradas.
 */
export function eventToVirtualProduct(
  e: Event,
  sessionIdx: number,
): LocalProduct {
  const session = e.sessions[sessionIdx];
  if (!session) {
    throw new Error(
      `eventToVirtualProduct: session ${sessionIdx} fuera de rango para evento ${e.id}`,
    );
  }
  const isMarkedFull = isSessionMarkedFull(e.id, sessionIdx);
  const capacity = isMarkedFull ? 0 : sessionCapacity(e, session);
  const sessionLabel =
    e.sessions.length > 1
      ? ` · ${session.label} ${session.date}`
      : "";
  const ticketName = `Entrada · ${e.title}${sessionLabel}`;
  return {
    id: eventVirtualId(e.id, sessionIdx),
    name: ticketName,
    slug: eventVirtualSlug(e.slug, sessionIdx),
    price: e.entryFee,
    wholesalePrice: e.entryFee,
    storePrice: e.entryFee,
    description: e.shortDescription,
    category: "evento",
    game: e.game,
    images: [e.posterImage],
    inStock: capacity > 0,
    stock: capacity,
    isNew: false,
    language: "ES",
    tags: ["evento", e.storeId, e.game],
    vatRate: 21,
  };
}

/** Busca un evento + índice de sesión a partir de un ID virtual. */
export function findEventByVirtualId(
  id: number,
): { event: Event; sessionIdx: number } | undefined {
  const decoded = decodeEventVirtualId(id);
  if (!decoded) return undefined;
  const event = EVENTS.find((e) => e.id === decoded.eventId);
  if (!event) return undefined;
  if (decoded.sessionIdx >= event.sessions.length) return undefined;
  return { event, sessionIdx: decoded.sessionIdx };
}

/** Resolver para `getMergedById` — devuelve el LocalProduct virtual o
 *  undefined si el ID no es de un evento conocido. */
export function resolveEventVirtualProduct(
  id: number,
): LocalProduct | undefined {
  const found = findEventByVirtualId(id);
  return found ? eventToVirtualProduct(found.event, found.sessionIdx) : undefined;
}

/** Resolver por slug, equivalente a `getMergedBySlug`. Acepta tanto el
 *  slug nuevo (`evento-<slug>-s<idx>`) como el legacy (`evento-<slug>` →
 *  resuelve a la sesión 0 por compatibilidad). */
export function resolveEventVirtualProductBySlug(
  slug: string,
): LocalProduct | undefined {
  if (!slug.startsWith("evento-")) return undefined;
  const tail = slug.slice("evento-".length);
  // ¿Tiene sufijo de sesión "-s<idx>"?
  const sessionMatch = tail.match(/^(.+)-s(\d+)$/);
  let eventSlug: string;
  let sessionIdx: number;
  if (sessionMatch) {
    eventSlug = sessionMatch[1];
    sessionIdx = parseInt(sessionMatch[2], 10);
  } else {
    eventSlug = tail;
    sessionIdx = 0;
  }
  const event = EVENTS.find((e) => e.slug === eventSlug);
  if (!event) return undefined;
  if (sessionIdx >= event.sessions.length) return undefined;
  return eventToVirtualProduct(event, sessionIdx);
}
