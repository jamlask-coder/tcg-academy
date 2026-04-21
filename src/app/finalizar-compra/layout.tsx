import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Finalizar compra | TCG Academy",
  description: "Completa tu pedido de forma segura.",
  alternates: { canonical: `${SITE_URL}/finalizar-compra` },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
