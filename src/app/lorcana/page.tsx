import { CatalogPage } from "@/components/product/CatalogPage"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Disney Lorcana — Cartas y Sets" }

export default function LorcanaPage() {
  return <CatalogPage gameSlug="lorcana" gameName="Lorcana" color="#0891b2" bg="#cffafe" description="Cartas, sobres, illumineers trove y colecciones de Disney Lorcana." />
}
