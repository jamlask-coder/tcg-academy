import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Verificar factura VeriFactu | TCG Academy",
  description:
    "Comprueba la autenticidad de una factura emitida por TCG Academy mediante su hash VeriFactu encadenado (RD 1007/2023, Ley 11/2021 antifraude).",
  alternates: { canonical: `${SITE_URL}/verificar-factura` },
  openGraph: {
    title: "Verificar factura VeriFactu | TCG Academy",
    description:
      "Verifica la integridad de tu factura con el sistema VeriFactu de la Agencia Tributaria.",
    url: `${SITE_URL}/verificar-factura`,
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
