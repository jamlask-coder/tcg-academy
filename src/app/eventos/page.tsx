import type { Metadata } from "next";
import { EVENTS } from "@/data/events";
import { STORES } from "@/data/stores";
import { EventsClient } from "./EventsClient";

export const metadata: Metadata = {
  title: "Eventos — TCG Academy",
  description:
    "Presentaciones, prereleases y torneos en las tiendas físicas de TCG Academy. Inscríbete y juega con la comunidad.",
};

/**
 * Ordena por la primera sesión de cada evento (asc). Eventos pasados se
 * relegan al final pero no se ocultan — útil para que el equipo recuerde
 * qué se ha hecho. Si quisiéramos archivarlos, basta con un filtro `>= now`.
 */
function sortedEvents() {
  return [...EVENTS].sort((a, b) => {
    const da = a.sessions[0]?.date ?? "";
    const db = b.sessions[0]?.date ?? "";
    return da.localeCompare(db);
  });
}

export default function EventosPage() {
  const events = sortedEvents().map((e) => {
    const store = STORES[e.storeId];
    return {
      event: e,
      storeName: store?.name ?? e.storeId,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <header className="mb-10 text-center sm:mb-14">
        <span className="mb-3 inline-block rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold tracking-wider text-amber-600 uppercase">
          Eventos presenciales
        </span>
        <h1 className="mb-3 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
          Vive el TCG en directo
        </h1>
        <p className="mx-auto max-w-2xl text-base text-gray-500">
          Presentaciones, prereleases y torneos en nuestras tiendas. Plazas
          limitadas — reserva la tuya con tiempo.
        </p>
      </header>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-20 text-center">
          <p className="text-sm text-gray-400">
            No hay eventos programados. ¡Vuelve pronto!
          </p>
        </div>
      ) : (
        <EventsClient events={events} />
      )}
    </div>
  );
}
