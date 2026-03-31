"use client"
import { motion } from "framer-motion"
import Link from "next/link"
import { MapPin, ArrowRight } from "lucide-react"

const STORES = [
  {
    id: "calpe",
    name: "TCG Academy Calpe",
    city: "Calpe, Alicante",
    address: "Av. Gabriel Miro 42",
    color: "#1a3a5c",
  },
  {
    id: "bejar",
    name: "TCG Academy Béjar",
    city: "Béjar, Salamanca",
    address: "C/ Mayor 15",
    color: "#2d6a9f",
  },
  {
    id: "madrid",
    name: "TCG Academy Madrid",
    city: "Madrid",
    address: "C/ Gran Vía 28",
    color: "#dc2626",
  },
  {
    id: "barcelona",
    name: "TCG Academy Barcelona",
    city: "Barcelona",
    address: "C/ Pelai 12",
    color: "#7c3aed",
  },
]

interface Props {
  onClose: () => void
}

export function TiendasMenu({ onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="bg-white shadow-xl border-t-2 border-t-[#1a3a5c]"
    >
      <div className="max-w-[1400px] mx-auto px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Nuestras tiendas
          </p>
          <Link
            href="/tiendas"
            onClick={onClose}
            className="text-xs font-semibold text-[#1a3a5c] hover:underline flex items-center gap-1"
          >
            Ver todas <ArrowRight size={11} />
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {STORES.map((store) => (
            <Link
              key={store.id}
              href={`/tiendas/${store.id}`}
              onClick={onClose}
              className="group flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <div
                className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-white"
                style={{ backgroundColor: store.color }}
              >
                <MapPin size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900 leading-tight truncate">
                  {store.name.replace("TCG Academy ", "")}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">{store.city}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{store.address}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
