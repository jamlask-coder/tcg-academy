import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Buscar | TCG Academy",
  description:
    "Busca productos de Pokémon, Magic, Yu-Gi-Oh!, One Piece, Dragon Ball Super, Lorcana y Riftbound en el catálogo completo de TCG Academy.",
  alternates: { canonical: `${SITE_URL}/busqueda` },
  robots: { index: false, follow: true },
  openGraph: {
    title: "Buscar productos | TCG Academy",
    description: "Encuentra cartas, sobres, displays y accesorios de TCG.",
    url: `${SITE_URL}/busqueda`,
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
