import Link from "next/link";
import { MapPin, Phone, Clock, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { STORES } from "@/data/stores";

export const metadata: Metadata = { title: "Nuestras Tiendas — TCG Academy" };

const STORE_LIST = Object.values(STORES);

export default function StoresPage() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#2563eb] to-[#3b82f6] py-16 text-white">
        <div className="mx-auto max-w-[1400px] px-6 text-center">
          <h1 className="mb-4 text-3xl font-bold md:text-5xl">
            Nuestras Tiendas
          </h1>
          <p className="mx-auto max-w-xl text-lg text-blue-200">
            4 tiendas físicas en España. Visítanos, juega, participa en torneos
            y lleva tu pasión al siguiente nivel.
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
                    <h2 className="text-xl font-bold text-gray-900">
                      {store.name}
                    </h2>
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
                <div className="mb-5 space-y-2.5">
                  <div className="flex items-start gap-2.5 text-sm">
                    <MapPin
                      size={15}
                      className="mt-0.5 flex-shrink-0 text-gray-400"
                    />
                    <span className="text-gray-700">{store.address}</span>
                  </div>
                  <div className="flex min-h-[44px] items-center gap-2.5 text-sm">
                    <Phone size={15} className="flex-shrink-0 text-gray-400" />
                    <a
                      href={`tel:${store.phone}`}
                      className="text-gray-700 transition hover:text-[#2563eb]"
                    >
                      {store.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <Clock size={15} className="flex-shrink-0 text-gray-400" />
                    <span className="text-gray-700">
                      {store.hours[0].day}: {store.hours[0].time}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/tiendas/${store.id}`}
                    className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: store.color }}
                  >
                    Ver tienda <ArrowRight size={14} />
                  </Link>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(store.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border-2 py-3 text-sm font-semibold transition hover:bg-gray-50"
                    style={{ borderColor: store.color, color: store.color }}
                  >
                    <MapPin size={14} /> Cómo llegar
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
