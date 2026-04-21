import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Vending TCG | TCG Academy",
  description:
    "Máquinas vending de sobres de TCG para tu local: instalación llave en mano, reposición periódica y stock garantizado de los juegos más vendidos.",
  alternates: { canonical: `${SITE_URL}/mayoristas/vending` },
  openGraph: {
    title: "Vending TCG | TCG Academy",
    description:
      "Instala una máquina vending de sobres TCG en tu local y diversifica ingresos.",
    url: `${SITE_URL}/mayoristas/vending`,
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
