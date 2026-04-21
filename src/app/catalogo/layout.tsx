import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Catálogo TCG | TCG Academy",
  description:
    "Catálogo completo de juegos de cartas coleccionables: Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece, Dragon Ball Super, Lorcana y Riftbound. Sobres, displays, cartas sueltas y accesorios oficiales.",
  alternates: { canonical: `${SITE_URL}/catalogo` },
  openGraph: {
    title: "Catálogo TCG | TCG Academy",
    description:
      "Todos los productos de TCG disponibles con envío a toda España. IVA incluido y envío gratuito desde 149 €.",
    url: `${SITE_URL}/catalogo`,
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
