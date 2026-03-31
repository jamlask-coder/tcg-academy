"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { MapPin, ArrowRight, Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";

const STORES = [
  {
    id: "calpe",
    name: "TCG Academy Calpe",
    city: "Calpe, Alicante",
    address: "Av. Gabriel Miro 42",
    phone: "+34 965 83 00 01",
    instagram: "@tcgacademy_calpe",
    color: "#2563eb",
  },
  {
    id: "bejar",
    name: "TCG Academy Béjar",
    city: "Béjar, Salamanca",
    address: "C/ Mayor 15",
    phone: "+34 923 40 00 02",
    instagram: "@tcgacademy_bejar",
    color: "#3b82f6",
  },
  {
    id: "madrid",
    name: "TCG Academy Madrid",
    city: "Madrid",
    address: "C/ Gran Vía 28",
    phone: "+34 910 00 00 03",
    instagram: "@tcgacademy_madrid",
    color: "#dc2626",
  },
  {
    id: "barcelona",
    name: "TCG Academy Barcelona",
    city: "Barcelona",
    address: "C/ Pelai 12",
    phone: "+34 932 00 00 04",
    instagram: "@tcgacademy_bcn",
    color: "#7c3aed",
  },
];

interface Props {
  onClose: () => void;
}

export function TiendasMenu({ onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="border-t-2 border-t-[#2563eb] bg-white shadow-xl"
    >
      <Container className="py-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
            Nuestras tiendas
          </p>
          <Link
            href="/tiendas"
            onClick={onClose}
            className="flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:underline"
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
              className="group flex items-start gap-3 rounded-xl border border-gray-100 p-3 transition-all hover:border-gray-200 hover:shadow-sm"
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: store.color }}
              >
                <MapPin size={16} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm leading-tight font-semibold text-gray-800 group-hover:text-gray-900">
                  {store.name.replace("TCG Academy ", "")}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-gray-500">
                  {store.city}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-gray-400">
                  {store.address}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                    <Phone size={9} />
                    {store.phone}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {store.instagram}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </motion.div>
  );
}
