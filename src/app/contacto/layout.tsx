import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contacto | TCG Academy",
  description:
    "Contacta con TCG Academy: atención al cliente, consultas sobre pedidos, mayoristas y tiendas físicas en Calpe, Madrid, Barcelona y Béjar.",
  alternates: { canonical: `${SITE_URL}/contacto` },
  openGraph: {
    title: "Contacto | TCG Academy",
    description:
      "Escríbenos o llámanos para cualquier consulta sobre Pokémon, Magic, Yu-Gi-Oh! y el resto de nuestros TCG.",
    url: `${SITE_URL}/contacto`,
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
