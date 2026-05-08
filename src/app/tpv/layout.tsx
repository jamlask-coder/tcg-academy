import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import TpvBodyChrome from "./TpvBodyChrome";

// El TPV es uso interno operativo — nunca debe aparecer en buscadores ni
// en LLMs. Mismo tratamiento que /admin.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "TPV — TCG Academy",
};

/**
 * Defensa en profundidad: aunque el proxy edge bloquee /tpv en producción
 * a no-admins, revalidamos server-side antes de renderizar HTML. En desarrollo
 * dejamos pasar para no romper DX (se puede probar el TPV sin auth real).
 */
async function assertAdminOrRedirect(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  const isServerMode =
    (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";
  const cookieStore = await cookies();

  if (isServerMode) {
    const token = cookieStore.get("tcga_session")?.value;
    if (!token) redirect("/login?from=/tpv&reason=admin");
    const session = await verifySessionToken(token);
    if (!session || session.role !== "admin") {
      redirect("/login?from=/tpv&reason=admin");
    }
    return;
  }

  // Local mode + production: requiere cookie compartida con el admin.
  const required = process.env.ADMIN_PANEL_TOKEN;
  if (!required) redirect("/login?from=/tpv&reason=admin");
  const cookie = cookieStore.get("tcga_admin_panel")?.value;
  if (!cookie || cookie !== required) {
    redirect("/login?from=/tpv&reason=admin");
  }
}

export default async function TpvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertAdminOrRedirect();
  return (
    <>
      {/* Cliente que pone `body.tpv-mode` para esconder header/nav/footer
          de la web pública — el TPV ocupa toda la pantalla. */}
      <TpvBodyChrome />
      {children}
    </>
  );
}
