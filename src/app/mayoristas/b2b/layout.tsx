import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Mayoristas B2B | TCG Academy",
  description:
    "Programa B2B para tiendas y distribuidores: precios mayoristas, condiciones de volumen y acceso prioritario a lanzamientos oficiales de TCG.",
  alternates: { canonical: `${SITE_URL}/mayoristas/b2b` },
  openGraph: {
    title: "Mayoristas B2B | TCG Academy",
    description:
      "Solicita acceso al catálogo mayorista profesional de TCG Academy.",
    url: `${SITE_URL}/mayoristas/b2b`,
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
