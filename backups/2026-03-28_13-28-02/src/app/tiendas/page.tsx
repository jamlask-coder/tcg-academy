import Link from "next/link"
import { MapPin, Phone, Clock, ArrowRight } from "lucide-react"
import type { Metadata } from "next"
import { STORES } from "@/data/stores"

export const metadata: Metadata = { title: "Nuestras Tiendas — TCG Academy" }

const STORE_LIST = Object.values(STORES)

export default function StoresPage() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a3a5c] to-[#2d6a9f] text-white py-16">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Nuestras Tiendas</h1>
          <p className="text-blue-200 text-lg max-w-xl mx-auto">
            4 tiendas físicas en España. Visítanos, juega, participa en torneos y lleva tu pasión al siguiente nivel.
          </p>
        </div>
      </div>

      {/* Stores grid */}
      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-16">
        <div className="grid md:grid-cols-2 gap-6">
          {STORE_LIST.map((store) => (
            <div
              key={store.id}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition group"
            >
              <div className="h-3" style={{ backgroundColor: store.color }} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{store.name}</h2>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: store.color }}>
                      {store.city}
                    </p>
                  </div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ backgroundColor: store.color }}
                  >
                    {store.name.replace("TCG Academy ", "")[0]}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-5 leading-relaxed">{store.shortDesc}</p>
                <div className="space-y-2.5 mb-5">
                  <div className="flex items-start gap-2.5 text-sm">
                    <MapPin size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{store.address}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm min-h-[44px]">
                    <Phone size={15} className="text-gray-400 flex-shrink-0" />
                    <a
                      href={`tel:${store.phone}`}
                      className="text-gray-700 hover:text-[#1a3a5c] transition"
                    >
                      {store.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <Clock size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">{store.hours[0].day}: {store.hours[0].time}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/tiendas/${store.id}`}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition text-white hover:opacity-90 min-h-[44px]"
                    style={{ backgroundColor: store.color }}
                  >
                    Ver tienda <ArrowRight size={14} />
                  </Link>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(store.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 border-2 transition hover:bg-gray-50 min-h-[44px]"
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
  )
}
