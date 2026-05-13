import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { isIpAllowedForTpv } from "@/lib/tpvIpAllowlist";
import { timingSafeEqualStr } from "@/lib/timingSafe";
import TpvBodyChrome from "./TpvBodyChrome";

// El TPV es uso interno operativo — nunca debe aparecer en buscadores ni
// en LLMs. Mismo tratamiento que /admin.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "TPV — TCG Academy",
};

/** Roles autorizados a entrar al TPV. Cualquier otro rol → redirect login. */
const TPV_ALLOWED_ROLES = new Set(["admin", "tienda"]);

function getClientIpFromHeaders(h: Headers): string {
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Defensa en profundidad: aunque el proxy edge bloquee /tpv en producción,
 * revalidamos server-side antes de renderizar HTML. Doble capa intencionada
 * — si el matcher del proxy falla o se rebooké, el layout sigue protegiendo.
 *
 * Reglas:
 *   - Development (NODE_ENV !== production): permite (DX), sin auth.
 *   - Production + server mode: cookie JWT firmada con role ∈ {admin, tienda}.
 *   - Production + local mode: cookie compartida `tcga_admin_panel` =
 *     env `ADMIN_PANEL_TOKEN`. En local mode no hay JWT real así que el TPV
 *     queda operativamente reservado al admin (el operador físico) — las
 *     tiendas entran solo en server mode con su sesión.
 *   - IP allowlist `TPV_ALLOWED_IPS` (opcional) aplica en ambos modos prod.
 */
async function assertTpvAccessOrRedirect(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  const h = await headers();
  const ip = getClientIpFromHeaders(h);

  // 1. IP allowlist (si está configurada).
  if (!isIpAllowedForTpv(ip)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[tpv-guard] DENY ip=${ip} reason=ip-not-allowed ua="${h.get("user-agent") ?? ""}"`,
    );
    redirect("/login?from=/tpv&reason=tpv");
  }

  const isServerMode =
    (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";
  const cookieStore = await cookies();

  if (isServerMode) {
    const token = cookieStore.get("tcga_session")?.value;
    if (!token) {
      // eslint-disable-next-line no-console
      console.warn(`[tpv-guard] DENY ip=${ip} reason=no-session`);
      redirect("/login?from=/tpv&reason=tpv");
    }
    const session = await verifySessionToken(token);
    if (!session) {
      // eslint-disable-next-line no-console
      console.warn(`[tpv-guard] DENY ip=${ip} reason=invalid-session`);
      redirect("/login?from=/tpv&reason=tpv");
    }
    if (!TPV_ALLOWED_ROLES.has(session.role)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[tpv-guard] DENY ip=${ip} sub=${session.sub} role=${session.role} reason=role-not-allowed`,
      );
      redirect("/login?from=/tpv&reason=tpv");
    }
    // eslint-disable-next-line no-console
    console.info(
      `[tpv-guard] ALLOW ip=${ip} sub=${session.sub} role=${session.role}`,
    );
    return;
  }

  // Local mode + production: gate por cookie compartida con el admin.
  const required = process.env.ADMIN_PANEL_TOKEN;
  if (!required || required.length < 32) {
    // Fail-secure: sin token configurado (o demasiado corto) → cerrado.
    // eslint-disable-next-line no-console
    console.warn(
      `[tpv-guard] DENY ip=${ip} reason=no-admin-panel-token-configured-or-too-short`,
    );
    redirect("/login?from=/tpv&reason=tpv");
  }
  const cookie = cookieStore.get("tcga_admin_panel")?.value;
  if (!cookie || !timingSafeEqualStr(cookie, required)) {
    // eslint-disable-next-line no-console
    console.warn(`[tpv-guard] DENY ip=${ip} reason=missing-admin-panel-cookie`);
    redirect("/login?from=/tpv&reason=tpv");
  }
  // eslint-disable-next-line no-console
  console.info(`[tpv-guard] ALLOW ip=${ip} mode=local-token`);
}

export default async function TpvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertTpvAccessOrRedirect();
  return (
    <>
      {/* Cliente que pone `body.tpv-mode` para esconder header/nav/footer
          de la web pública — el TPV ocupa toda la pantalla. */}
      <TpvBodyChrome />
      {children}
    </>
  );
}
