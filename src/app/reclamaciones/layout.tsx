import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Hoja de reclamaciones | TCG Academy",
  description:
    "Formulario oficial de hoja de reclamaciones de TCG Academy conforme a la normativa de consumo vigente en España.",
  alternates: { canonical: `${SITE_URL}/reclamaciones` },
  openGraph: {
    title: "Hoja de reclamaciones | TCG Academy",
    description:
      "Presenta una reclamación formal. Proceso conforme a la normativa española de consumo.",
    url: `${SITE_URL}/reclamaciones`,
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
