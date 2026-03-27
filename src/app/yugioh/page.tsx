import { CatalogPage } from "@/components/product/CatalogPage"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Yu-Gi-Oh! — Cartas, Estructuras y Colecciones" }

export default function YugiohPage() {
  return <CatalogPage gameSlug="yugioh" gameName="Yu-Gi-Oh!" color="#dc2626" bg="#fee2e2" description="Cartas singles, structure decks, booster packs y colecciones de Yu-Gi-Oh!." />
}
