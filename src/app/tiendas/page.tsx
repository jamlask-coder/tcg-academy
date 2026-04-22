import Link from "next/link";
import { MapPin, Phone, Clock, ArrowRight, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { STORES } from "@/data/stores";

export const metadata: Metadata = { title: "Nuestras Tiendas — TCG Academy" };

const STORE_LIST = Object.values(STORES);
const OPEN_COUNT = STORE_LIST.filter((s) => !s.comingSoon).length;

export default function StoresPage() {
  return (
    <div>
      {/* Hero */}
      <div className="border-b border-gray-100 bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-[1400px] px-6 text-center">
          <h1 className="mb-3 text-3xl font-bold text-gray-900 md:text-5xl">
            Nuestras Tiendas
          </h1>
          <p className="mx-auto max-w-xl text-base text-gray-600 sm:text-lg">
            {OPEN_COUNT} tiendas físicas en España. Visítanos, juega, participa
            en torneos y lleva tu pasión al siguiente nivel.
          </p>
        </div>
      </div>

      {/* Stores grid */}
      <div className="mx-auto max-w-[1400px] px-6 py-16">
        <div className="grid gap-6 md:grid-cols-2">
          {STORE_LIST.map((store) => (
            <div
              key={store.id}
              className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:shadow-lg"
            >
              <div className="h-3" style={{ backgroundColor: store.color }} />
              <div className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900">
                        {store.name}
                      </h2>
                      {store.comingSoon && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase"
                          style={{
                            backgroundColor: store.bg,
                            color: store.color,
                          }}
                        >
                          <Sparkles size={10} /> Próximamente
                        </span>
                      )}
                    </div>
                    <p
                      className="mt-0.5 text-sm font-semibold"
                      style={{ color: store.color }}
                    >
                      {store.city}
                    </p>
                  </div>
                  <div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
                    style={{ backgroundColor: store.color }}
                  >
                    {store.name.replace("TCG Academy ", "")[0]}
                  </div>
                </div>
                <p className="mb-5 text-sm leading-relaxed text-gray-600">
                  {store.shortDesc}
                </p>
                {store.comingSoon ? (
                  <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                    <Sparkles
                      size={15}
                      className="mt-0.5 flex-shrink-0 text-gray-400"
                    />
                    <span>
                      Anunciaremos dirección, horario y fecha de apertura muy
                      pronto.
                    </span>
                  </div>
                ) : (
                  <div className="mb-5 space-y-2.5">
                    <div className="flex items-start gap-2.5 text-sm">
                      <MapPin
                        size={15}
                        className="mt-0.5 flex-shrink-0 text-gray-400"
                      />
                      <span className="text-gray-700">{store.address}</span>
                    </div>
                    <div className="flex min-h-[44px] items-center gap-2.5 text-sm">
                      <Phone
                        size={15}
                        className="flex-shrink-0 text-gray-400"
                      />
                      <a
                        href={`tel:${store.phone}`}
                        className="text-gray-700 transition hover:text-[#2563eb]"
                      >
                        {store.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm">
                      <Clock
                        size={15}
                        className="flex-shrink-0 text-gray-400"
                      />
                      <span className="text-gray-700">
                        {store.hours[0].day}: {store.hours[0].time}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Link
                    href={`/tiendas/${store.id}`}
                    className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: store.color }}
                  >
                    {store.comingSoon ? "Más información" : "Ver tienda"}{" "}
                    <ArrowRight size={14} />
                  </Link>
                  {!store.comingSoon && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(store.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border-2 py-3 text-sm font-semibold transition hover:bg-gray-50"
                      style={{ borderColor: store.color, color: store.color }}
                    >
                      <MapPin size={14} /> Cómo llegar
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
