import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Carrito | TCG Academy",
  description: "Revisa los productos seleccionados antes de finalizar tu compra.",
  alternates: { canonical: `${SITE_URL}/carrito` },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
