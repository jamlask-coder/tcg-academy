import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Novedades | TCG Academy",
  description:
    "Últimos lanzamientos de Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece, Dragon Ball Super, Lorcana y Riftbound. Reservas y preventas abiertas.",
  alternates: { canonical: `${SITE_URL}/novedades` },
  openGraph: {
    title: "Novedades TCG | TCG Academy",
    description:
      "Lanzamientos recientes y preventas oficiales de los principales juegos de cartas coleccionables.",
    url: `${SITE_URL}/novedades`,
    type: "website",
  },
};

// La página consume `useSearchParams`; al añadir este layout server para
// exportar metadata, Next.js exige un Suspense boundary explícito para que
// pueda prerenderizar estáticamente el resto mientras se bailout al cliente.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
