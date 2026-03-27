import { CatalogPage } from "@/components/product/CatalogPage"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Magic: The Gathering — Singles, Mazos y Sets" }

export default function MagicPage() {
  return <CatalogPage gameSlug="magic" gameName="Magic: The Gathering" color="#7c3aed" bg="#ede9fe" description="Singles, mazos Commander, sets completos y accesorios para Magic: The Gathering." />
}
