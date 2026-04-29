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
  },
];
