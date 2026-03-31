import Link from "next/link";
import { MapPin, Phone, Clock, Mail, ArrowLeft } from "lucide-react";
import type { Store } from "@/data/stores";

interface Props {
  store: Store;
}

export function StorePageContent({ store }: Props) {
  const initial = store.name.replace("TCG Academy ", "")[0];

  return (
    <div>
      {/* Color accent bar */}
      <div className="h-2" style={{ backgroundColor: store.color }} />

      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6">
        {/* Back link */}
        <Link
          href="/tiendas"
          className="mb-8 inline-flex min-h-[44px] items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#1a3a5c]"
        >
          <ArrowLeft size={14} /> Todas las tiendas
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column: map + info */}
          <div className="space-y-6 lg:col-span-2">
            {/* Map placeholder */}
            <div className="flex h-64 flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
              <MapPin size={32} className="text-gray-300" />
              <p className="px-4 text-center font-medium text-gray-600">
                {store.address}
              </p>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(store.address)}`}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[44px] items-center px-4 text-sm font-semibold transition hover:underline"
                style={{ color: store.color }}
              >
                Abrir en Google Maps →
              </a>
            </div>

            {/* Store info card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="mb-5 flex items-start gap-4">
                <div
                  className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white"
                  style={{ backgroundColor: store.color }}
                >
                  {initial}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {store.name}
                  </h1>
                  <p
                    className="mt-0.5 text-sm font-semibold"
                    style={{ color: store.color }}
                  >
                    {store.city}
                  </p>
                </div>
              </div>
              <p className="leading-relaxed text-gray-600">{store.longDesc}</p>
            </div>
          </div>

          {/* Right sidebar: contact + hours + CTA */}
          <div className="space-y-4">
            {/* Contact info */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="mb-4 font-bold text-gray-900">
                Información de contacto
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin
                    size={16}
                    className="mt-0.5 flex-shrink-0 text-gray-400"
                  />
                  <span className="text-sm text-gray-700">{store.address}</span>
                </div>
                <div className="flex min-h-[44px] items-center gap-3">
                  <Phone size={16} className="flex-shrink-0 text-gray-400" />
                  <a
                    href={`tel:${store.phone}`}
                    className="text-sm text-gray-700 transition hover:text-[#1a3a5c]"
                  >
                    {store.phone}
                  </a>
                </div>
                <div className="flex min-h-[44px] items-center gap-3">
                  <Mail size={16} className="flex-shrink-0 text-gray-400" />
                  <a
                    href={`mailto:${store.email}`}
                    className="text-sm break-all text-gray-700 transition hover:text-[#1a3a5c]"
                  >
                    {store.email}
                  </a>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
                <Clock size={16} className="text-gray-400" /> Horario
              </h3>
              <div className="space-y-2">
                {store.hours.map(({ day, time }) => (
                  <div key={day} className="flex justify-between gap-2 text-sm">
                    <span className="text-gray-600">{day}</span>
                    <span
                      className={`font-semibold whitespace-nowrap ${
                        time === "Cerrado" ? "text-red-400" : "text-gray-900"
                      }`}
                    >
                      {time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(store.address)}`}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: store.color }}
            >
              <MapPin size={16} /> Cómo llegar
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
