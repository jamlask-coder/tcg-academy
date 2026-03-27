import { CatalogPage } from "@/components/product/CatalogPage"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Pokemon TCG — Cartas, Sobres y Colecciones" }

export default function PokemonPage() {
  return <CatalogPage gameSlug="pokemon" gameName="Pokemon" color="#f59e0b" bg="#fef3c7" description="Cartas, sobres, ETBs, colecciones y accesorios Pokemon TCG. Las ultimas expansiones y singles mas buscados." />
}
