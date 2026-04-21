import type { Metadata } from "next";
import CuentaShell from "./_CuentaShell";

// El área de cuenta contiene PII del cliente. Fuera del índice de buscadores
// e IAs aunque los contenidos requieren autenticación: evita listados URL-only
// en SERPs si alguien publica un enlace.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function CuentaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CuentaShell>{children}</CuentaShell>;
}
