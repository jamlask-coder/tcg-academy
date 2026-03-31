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

      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8">
        {/* Back link */}
        <Link
          href="/tiendas"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1a3a5c] transition mb-8 min-h-[44px]"
        >
          <ArrowLeft size={14} /> Todas las tiendas
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left column: map + info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map placeholder */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 h-64 bg-gray-100 flex flex-col items-center justify-center gap-3">
              <MapPin size={32} className="text-gray-300" />
              <p className="font-medium text-gray-600 text-center px-4">
                {store.address}
              </p>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(store.address)}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold hover:underline transition min-h-[44px] flex items-center px-4"
                style={{ color: store.color }}
              >
                Abrir en Google Maps →
              </a>
            </div>

            {/* Store info card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-start gap-4 mb-5">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0"
                  style={{ backgroundColor: store.color }}
                >
                  {initial}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {store.name}
                  </h1>
                  <p
                    className="text-sm font-semibold mt-0.5"
                    style={{ color: store.color }}
                  >
                    {store.city}
                  </p>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">{store.longDesc}</p>
            </div>
          </div>

          {/* Right sidebar: contact + hours + CTA */}
          <div className="space-y-4">
            {/* Contact info */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="font-bold text-gray-900 mb-4">
                Información de contacto
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin
                    size={16}
                    className="text-gray-400 mt-0.5 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">{store.address}</span>
                </div>
                <div className="flex items-center gap-3 min-h-[44px]">
                  <Phone size={16} className="text-gray-400 flex-shrink-0" />
                  <a
                    href={`tel:${store.phone}`}
                    className="text-sm text-gray-700 hover:text-[#1a3a5c] transition"
                  >
                    {store.phone}
                  </a>
                </div>
                <div className="flex items-center gap-3 min-h-[44px]">
                  <Mail size={16} className="text-gray-400 flex-shrink-0" />
                  <a
                    href={`mailto:${store.email}`}
                    className="text-sm text-gray-700 hover:text-[#1a3a5c] transition break-all"
                  >
                    {store.email}
                  </a>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock size={16} className="text-gray-400" /> Horario
              </h3>
              <div className="space-y-2">
                {store.hours.map(({ day, time }) => (
                  <div key={day} className="flex justify-between text-sm gap-2">
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
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-white transition hover:opacity-90 min-h-[48px]"
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
