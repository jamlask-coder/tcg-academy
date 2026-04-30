import type { Metadata } from "next";
import { getUpcomingEvents, getPastEvents } from "@/data/events";
import { STORES } from "@/data/stores";
import { EventsClient } from "./EventsClient";

export const metadata: Metadata = {
  title: "Eventos — TCG Academy",
  description:
    "Presentaciones, prereleases y torneos en las tiendas físicas de TCG Academy. Inscríbete y juega con la comunidad.",
};

export default function EventosPage() {
  // Próximos primero (orden cronológico ascendente). Pasados al final, en
  // gris, con el más reciente arriba — el histórico vive en la misma página
  // para que el usuario perciba continuidad: "antes hicimos esto, ahora
  // viene esto otro".
  const upcoming = getUpcomingEvents().map((e) => ({
    event: e,
    storeName: STORES[e.storeId]?.name ?? e.storeId,
    past: false,
  }));
  const past = getPastEvents().map((e) => ({
    event: e,
    storeName: STORES[e.storeId]?.name ?? e.storeId,
    past: true,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* SEO: H1 oculto para indexación, sin ocupar espacio visual. */}
      <h1 className="sr-only">Eventos presenciales TCG Academy</h1>

      {upcoming.length === 0 && past.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-20 text-center">
          <p className="text-sm text-gray-400">
            No hay eventos programados ahora mismo. ¡Vuelve pronto!
          </p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && <EventsClient events={upcoming} />}

          {past.length > 0 && (
            <>
              {upcoming.length > 0 && (
                <div
                  className="my-12 flex items-center gap-4"
                  aria-hidden="true"
                >
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                  <span className="text-[10px] font-bold tracking-[0.16em] text-gray-400 uppercase">
                    Eventos finalizados
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                </div>
              )}
              <EventsClient events={past} />
            </>
          )}
        </>
      )}
    </div>
  );
}
