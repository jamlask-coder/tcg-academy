import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Mayoristas | TCG Academy",
  description:
    "Programa mayorista de TCG Academy: condiciones para tiendas especializadas, distribuidores y organizadores de torneos de Pokémon, Magic, Yu-Gi-Oh! y otros TCG.",
  alternates: { canonical: `${SITE_URL}/mayoristas` },
  openGraph: {
    title: "Mayoristas | TCG Academy",
    description:
      "Acceso mayorista a catálogo completo de TCG: precios especiales para tiendas y distribuidores profesionales en España.",
    url: `${SITE_URL}/mayoristas`,
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
