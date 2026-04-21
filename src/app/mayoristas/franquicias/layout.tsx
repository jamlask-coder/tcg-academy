import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Franquicias | TCG Academy",
  description:
    "Abre tu propia tienda TCG Academy en España. Información sobre el modelo de franquicia, inversión estimada y proceso de solicitud.",
  alternates: { canonical: `${SITE_URL}/mayoristas/franquicias` },
  openGraph: {
    title: "Franquicias | TCG Academy",
    description:
      "Únete a la red de tiendas TCG Academy con un modelo de franquicia probado.",
    url: `${SITE_URL}/mayoristas/franquicias`,
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
