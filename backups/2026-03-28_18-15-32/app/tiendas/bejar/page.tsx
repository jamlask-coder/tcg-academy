import type { Metadata } from "next"
import { STORES } from "@/data/stores"
import { StorePageContent } from "@/components/tiendas/StorePageContent"

export const metadata: Metadata = {
  title: "TCG Academy Béjar — Tienda TCG en Salamanca",
  description: "Visita nuestra tienda en Béjar, Salamanca. Especializada en Magic y Pokémon competitivo con juego organizado semanal.",
}

export default function BejarPage() {
  return <StorePageContent store={STORES.bejar} />
}
