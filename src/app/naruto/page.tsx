import { CatalogPage } from "@/components/product/CatalogPage"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Naruto TCG — Cartas y Colecciones" }

export default function NarutoPage() {
  return <CatalogPage gameSlug="naruto" gameName="Naruto" color="#ea580c" bg="#ffedd5" description="Cartas, sobres y colecciones del juego de cartas de Naruto." />
}
