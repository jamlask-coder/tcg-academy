import type { Metadata } from "next"
import { STORES } from "@/data/stores"
import { StorePageContent } from "@/components/tiendas/StorePageContent"

export const metadata: Metadata = {
  title: "TCG Academy Calpe — Tienda TCG en Alicante",
  description: "Visita nuestra tienda flagship en Calpe, Alicante. Más de 10.000 referencias, zona de juego y torneos oficiales.",
}

export default function CalpePage() {
  return <StorePageContent store={STORES.calpe} />
}
