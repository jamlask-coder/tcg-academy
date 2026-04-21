import type { Metadata } from "next";
import AdminShell from "./_AdminShell";

// El panel admin nunca debe aparecer en buscadores ni IAs. robots disallow ya
// cubre el caso, pero añadir `noindex,nofollow` en metadata evita que Google
// muestre el listado URL-only cuando le llega un backlink externo.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
