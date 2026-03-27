import { CatalogPage } from "@/components/product/CatalogPage"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Dragon Ball Super Card Game — Sets y Colecciones" }

export default function DragonBallPage() {
  return <CatalogPage gameSlug="dragon-ball" gameName="Dragon Ball Super CG" color="#d97706" bg="#fef3c7" description="Sets, booster packs, starter decks y colecciones del Dragon Ball Super Card Game." />
}
