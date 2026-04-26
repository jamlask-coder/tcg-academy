import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "./_AdminShell";
import { verifySessionToken } from "@/lib/auth";

// El panel admin nunca debe aparecer en buscadores ni IAs. robots disallow ya
// cubre el caso, pero añadir `noindex,nofollow` en metadata evita que Google
// muestre el listado URL-only cuando le llega un backlink externo.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

// Defensa en profundidad: incluso si el proxy falla, el Server Component
// re-valida server-side antes de renderizar HTML del panel. En desarrollo
// se permite el paso para no romper DX (el guard del proxy también).
async function assertAdminOrRedirect(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  const isServerMode =
    (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";
  const cookieStore = await cookies();

  if (isServerMode) {
    const token = cookieStore.get("tcga_session")?.value;
    if (!token) redirect("/login?from=/admin&reason=admin");
    const session = await verifySessionToken(token);
    if (!session || session.role !== "admin") {
      redirect("/login?from=/admin&reason=admin");
    }
    return;
  }

  // Local mode + production: requiere cookie compartida con el admin.
  const required = process.env.ADMIN_PANEL_TOKEN;
  if (!required) redirect("/login?from=/admin&reason=admin");
  const cookie = cookieStore.get("tcga_admin_panel")?.value;
  if (!cookie || cookie !== required) {
    redirect("/login?from=/admin&reason=admin");
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertAdminOrRedirect();
  return <AdminShell>{children}</AdminShell>;
}
