import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Phone,
  Clock,
  Mail,
  ArrowLeft,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import type { Store } from "@/data/stores";

interface Props {
  store: Store;
}

/**
 * Google Maps embed URL — usa coordenadas si las tenemos (más preciso,
 * no depende de geocoding de direcciones) y si no, la dirección literal.
 * El endpoint `output=embed` no requiere API key.
 */
function mapEmbedUrl(store: Store): string {
  // t=h → hybrid (satélite + etiquetas de calles/edificios) con pin rojo
  // automático en la posición q=. No requiere API key.
  if (store.geo) {
    return `https://www.google.com/maps?q=${store.geo.lat},${store.geo.lng}&z=17&t=h&hl=es&output=embed`;
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(store.address)}&z=17&t=h&hl=es&output=embed`;
}

export function StorePageContent({ store }: Props) {
  const initial = store.name.replace("TCG Academy ", "")[0];

  if (store.comingSoon) {
    return (
      <div>
        <div className="mx-auto max-w-[900px] px-6 py-10">
          <Link
            href="/tiendas"
            className="mb-8 inline-flex min-h-[44px] items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#2563eb]"
          >
            <ArrowLeft size={14} /> Todas las tiendas
          </Link>
          <div
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
            style={{ borderColor: `${store.color}33` }}
          >
            <div className="p-8 text-center sm:p-12">
              <div
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-bold text-white"
                style={{ backgroundColor: store.color }}
              >
                {initial}
              </div>
              <span
                className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase"
                style={{ backgroundColor: store.bg, color: store.color }}
              >
                <Sparkles size={12} /> Próximamente
              </span>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">
                {store.name}
              </h1>
              <p
                className="mb-6 text-sm font-semibold"
                style={{ color: store.color }}
              >
                {store.city}
              </p>
              <p className="mx-auto max-w-xl leading-relaxed text-gray-600">
                {store.longDesc}
              </p>
              <Link
                href="/tiendas"
                className="mt-8 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: store.color }}
              >
                Ver nuestras otras tiendas
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        {/* Back link */}
        <Link
          href="/tiendas"
          className="mb-8 inline-flex min-h-[44px] items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#2563eb]"
        >
          <ArrowLeft size={14} /> Todas las tiendas
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column: photos/map + info */}
          <div className="space-y-6 lg:col-span-2">
            {store.photos && store.photos.length > 0 ? (
              <div className="space-y-3">
                <div className="relative h-72 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 sm:h-96">
                  <Image
                    src={store.photos[0]}
                    alt={`${store.name} — fachada`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="object-cover"
                    priority
                  />
                </div>
                {store.photos.length > 1 && (
                  <div className="grid grid-cols-2 gap-3">
                    {store.photos.slice(1).map((src, i) => (
                      <div
                        key={src}
                        className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-gray-200 bg-gray-50"
                      >
                        <Image
                          src={src}
                          alt={`${store.name} — foto ${i + 2}`}
                          fill
                          sizes="(max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(store.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold transition hover:underline"
                  style={{ color: store.color }}
                >
                  <MapPin size={14} /> Abrir en Google Maps →
                </a>
              </div>
            ) : (
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
            )}

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
                <div className="flex min-h-[44px] items-center gap-3">
                  <MapPin size={16} className="flex-shrink-0 text-gray-400" />
                  <span className="text-sm text-gray-700">{store.address}</span>
                </div>
                <div className="flex min-h-[44px] items-center gap-3">
                  <Phone size={16} className="flex-shrink-0 text-gray-400" />
                  <a
                    href={`tel:${store.phone}`}
                    className="text-sm text-gray-700 transition hover:text-[#2563eb]"
                  >
                    {store.phone}
                  </a>
                </div>
                <div className="flex min-h-[44px] items-center gap-3">
                  <Mail size={16} className="flex-shrink-0 text-gray-400" />
                  <a
                    href={`mailto:${store.email}`}
                    className="text-sm break-all text-gray-700 transition hover:text-[#2563eb]"
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

            {/* Mini-mapa Google Maps — sustituye al antiguo botón "Cómo
                llegar". El iframe (output=embed, sin API key) permite pan/zoom
                y clickar el pin abre Google Maps en nueva pestaña. Debajo un
                enlace explícito "Abrir en Google Maps" para usuarios de
                teclado / lectores de pantalla. */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                <MapPin size={16} className="text-gray-400" />
                <h3 className="font-bold text-gray-900">Cómo llegar</h3>
              </div>
              <div className="relative h-56 w-full bg-gray-100">
                <iframe
                  src={mapEmbedUrl(store)}
                  title={`Mapa de ${store.name}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
                {/* Pin rojo overlay. El iframe se centra en `store.geo`,
                    así que un pin absolute en el centro del contenedor
                    apunta siempre a la ubicación real. pointer-events-none
                    preserva pan/zoom del iframe. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-full"
                >
                  <svg
                    width="36"
                    height="48"
                    viewBox="0 0 24 32"
                    className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
                  >
                    <path
                      d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z"
                      fill="#dc2626"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <circle cx="12" cy="12" r="4" fill="#ffffff" />
                  </svg>
                </div>
              </div>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(store.address)}`}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[44px] items-center justify-center gap-1.5 border-t border-gray-100 px-5 py-3 text-sm font-semibold transition hover:underline"
                style={{ color: store.color }}
              >
                Abrir en Google Maps <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
