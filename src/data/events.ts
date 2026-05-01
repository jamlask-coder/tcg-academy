/**
 * Eventos presenciales en las tiendas TCG Academy.
 *
 * Convenciones:
 * - `slug` se usa en URLs (`/eventos/<slug>`).
 * - `storeId` apunta a `STORES` (`@/data/stores`).
 * - `posterImage` vive en `public/images/events/`.
 * - `accentColor` debe casar con la paleta del juego (ver GAME_CONFIG).
 * - El orden del array NO importa: la página los reordena por fecha.
 */

import type { Event } from "@/types";

export const EVENTS: Event[] = [
  {
    id: 1,
    slug: "riftbound-unleashed-presentacion-calpe",
    title: "Presentación Riftbound: Unleashed",
    subtitle: "League of Legends Trading Card Game",
    game: "riftbound",
    storeId: "calpe",
    address: "Calle Goleta 2 bajo 3",
    city: "Calpe (Alicante)",
    postalCode: "03710",
    sessions: [
      { label: "Sábado", date: "2026-05-09", time: "10:30" },
      { label: "Domingo", date: "2026-05-10", time: "16:30" },
    ],
    entryFee: 30,
    prizeText: "Sobre por victoria",
    posterImage: "/images/events/riftbound-unleashed-calpe.png",
    accentColor: "#3b82f6",
    shortDescription:
      "Estreno oficial de Riftbound — el TCG de League of Legends — en TCG Academy Calpe. Dos jornadas, formato sealed Unleashed y un sobre por cada partida ganada.",
    longDescription:
      "El sábado 9 y el domingo 10 de mayo abrimos las puertas para presentar Riftbound, el nuevo Trading Card Game oficial de League of Legends. Dos sesiones independientes: ven al horario que mejor te venga.\n\nFormato sealed con la edición Unleashed: cada jugador recibe sobres en mano, construye su mazo en la tienda y compite en una liguilla suiza con premios. Te enseñamos las reglas si nunca has jugado — solo tienes que traer ganas. Plazas limitadas.",
    highlights: [
      "Sobres Unleashed sellados al inicio",
      "Sobre extra por cada victoria en la liguilla",
      "Tutorial de reglas para principiantes",
      "Mesas, fundas y dados a tu disposición",
    ],
    registrationUrl:
      "https://locator.riftbound.uvsgames.com/stores/0b1693d0-d803-4824-a1a9-bca5a75349fd",
  },

  // ── Liga semanal Riftbound: Saturday Afternoon Summoner Skirmish ─────
  // Eventos sábado por la tarde, formato Construido, plaza limitada a 24.
  // Cada edición usa un poster propio para que en el listado se vea cuál
  // es cuál (distintos meses, mismas reglas).
  {
    id: 2,
    slug: "summoner-skirmish-junio-2026-calpe",
    title: "Saturday Afternoon Summoner Skirmish – Junio",
    subtitle: "Riftbound · Liga semanal",
    game: "riftbound",
    storeId: "calpe",
    address: "Calle Goleta 2 bajo 3",
    city: "Calpe (Alicante)",
    postalCode: "03710",
    sessions: [{ label: "Sábado", date: "2026-06-06", time: "17:00" }],
    entryFee: 8,
    prizeText: "Sobre por victoria",
    posterImage: "/images/events/summoner-skirmish-junio-2026-calpe.svg",
    accentColor: "#3b82f6",
    capacity: 24,
    shortDescription:
      "Sábado por la tarde de Riftbound en TCG Academy Calpe. Formato Construido, 24 plazas y un sobre por cada victoria. Trae tu mazo y juega en una liga relajada con la comunidad local.",
    longDescription:
      "Una tarde fija de cada mes para que la comunidad Riftbound de Calpe se siente a la mesa con su mazo Construido y dispute una liga suiza corta. Acreditación a las 16:30, comienzo a las 17:00.\n\nEl formato es Construido legal estándar: trae tu mazo de 50 cartas siguiendo las reglas oficiales de Riftbound. Si todavía no tienes mazo o eres nuevo, avísanos al inscribirte y te montamos uno con préstamos para que puedas jugar igualmente. La idea es liga relajada, no clasificación oficial — premio en sobres por victoria y una mesa para tomar algo entre rondas.",
    highlights: [
      "Formato Construido (mazo 50 cartas)",
      "Liguilla suiza, 3-4 rondas según asistencia",
      "Sobre Riftbound por cada partida ganada",
      "Mesas, fundas y dados a tu disposición",
      "Préstamo de mazo para nuevos jugadores",
    ],
  },
  {
    id: 3,
    slug: "summoner-skirmish-julio-2026-calpe",
    title: "Saturday Afternoon Summoner Skirmish – Julio",
    subtitle: "Riftbound · Liga semanal",
    game: "riftbound",
    storeId: "calpe",
    address: "Calle Goleta 2 bajo 3",
    city: "Calpe (Alicante)",
    postalCode: "03710",
    sessions: [{ label: "Sábado", date: "2026-06-27", time: "17:00" }],
    entryFee: 8,
    prizeText: "Sobre por victoria",
    posterImage: "/images/events/summoner-skirmish-julio-2026-calpe.svg",
    accentColor: "#a855f7",
    capacity: 24,
    shortDescription:
      "Edición de julio del Skirmish semanal de Riftbound en TCG Academy Calpe. Misma fórmula: Construido, 24 plazas y un sobre por victoria. Sábado por la tarde, ven con tu mazo.",
    longDescription:
      "Segunda parada de la liga Summoner Skirmish — edición julio. Sábado 27 de junio, acreditación 16:30 y comienzo 17:00. Formato Construido y liguilla suiza con premio en sobres.\n\nMismas reglas y mismo ambiente que la edición de junio: liga relajada, mazo de 50 cartas, préstamo de mazo si vienes a probar el juego por primera vez. Si participaste en junio puedes traer un mazo distinto — así calibramos la diversidad del meta antes del torneo grande de septiembre.",
    highlights: [
      "Formato Construido (mazo 50 cartas)",
      "Liguilla suiza, 3-4 rondas según asistencia",
      "Sobre Riftbound por cada partida ganada",
      "Mesas, fundas y dados a tu disposición",
      "Préstamo de mazo para nuevos jugadores",
    ],
  },
];

// ─── Helpers de filtrado por fecha ─────────────────────────────────────────
//
// Usados por todas las superficies (listado, detalle, widget, dropdown)
// para que la regla "los eventos pasados desaparecen" sea consistente.
// El ISO `YYYY-MM-DD` se compara como string — funciona perfectamente.

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function lastSessionDate(e: Event): string {
  return e.sessions[e.sessions.length - 1]?.date ?? "";
}

/** True si todas las sesiones del evento ya han ocurrido. */
export function isEventPast(e: Event): boolean {
  const last = lastSessionDate(e);
  return last !== "" && last < todayIso();
}

/** Eventos cuya última sesión es hoy o futura. Ordenados por primera sesión. */
export function getUpcomingEvents(): Event[] {
  return EVENTS.filter((e) => !isEventPast(e)).sort((a, b) => {
    const da = a.sessions[0]?.date ?? "";
    const db = b.sessions[0]?.date ?? "";
    return da.localeCompare(db);
  });
}

/** Eventos ya finalizados. Más recientes primero (historial cronológico inverso). */
export function getPastEvents(): Event[] {
  return EVENTS.filter(isEventPast).sort((a, b) => {
    const da = lastSessionDate(a);
    const db = lastSessionDate(b);
    return db.localeCompare(da);
  });
}
