import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, History } from "lucide-react";
import { getUpcomingEvents, getPastEvents } from "@/data/events";
import { STORES } from "@/data/stores";
import { EventsClient } from "./EventsClient";

export const metadata: Metadata = {
  title: "Eventos — TCG Academy",
  description:
    "Presentaciones, prereleases y torneos en las tiendas físicas de TCG Academy. Inscríbete y juega con la comunidad.",
};

export default function EventosPage() {
  const upcoming = getUpcomingEvents().map((e) => {
    const store = STORES[e.storeId];
    return {
      event: e,
      storeName: store?.name ?? e.storeId,
    };
  });
  const pastCount = getPastEvents().length;

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

      {upcoming.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-20 text-center">
          <p className="text-sm text-gray-400">
            No hay eventos programados ahora mismo. ¡Vuelve pronto!
          </p>
        </div>
      ) : (
        <EventsClient events={upcoming} />
      )}

      {/* Enlace al historial — solo si hay eventos pasados */}
      {pastCount > 0 && (
        <div className="mt-12 flex justify-center sm:mt-16">
          <Link
            href="/eventos/historial"
            className="group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-[13px] font-semibold text-gray-700 transition-all hover:border-gray-300 hover:shadow-sm"
          >
            <History size={14} className="text-gray-400" />
            Ver historial de eventos
            <span className="text-gray-400">({pastCount})</span>
            <ArrowRight
              size={13}
              className="text-gray-400 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      )}
    </div>
  );
}
