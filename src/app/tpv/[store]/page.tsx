import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { TPV_STORES, type TpvStoreSlug } from "@/config/tpvStores";
import { verifySessionToken } from "@/lib/auth";
import { canAccessTpvStore } from "@/lib/tpvAccess";
import TpvClient from "../TpvClient";

interface Props {
  params: Promise<{ store: string }>;
}

/**
 * `/tpv/[store]` — Pantalla operativa de TPV para una tienda concreta.
 *
 * `[store]` es el slug de la tienda (calpe / bejar / madrid / barcelona).
 * Si el slug no existe en `TPV_STORES`, devolvemos 404 — evita que un slug
 * inventado caiga al TPV de Calpe por error.
 *
 * El gate global (rol admin|tienda + IP allowlist) se aplica en
 * `../layout.tsx`. AQUÍ aplicamos restricción POR-TIENDA: un usuario con
 * rol `tienda` solo puede entrar a su tienda asignada. `admin` y los
 * super-usuarios (`TPV_SUPER_USER_EMAILS`) entran a todas.
 */
export default async function TpvStorePage({ params }: Props) {
  const { store } = await params;
  if (!(store in TPV_STORES)) {
    notFound();
  }
  const storeSlug = store as TpvStoreSlug;

  // Filtro por tienda solo aplica en server mode + production (en local mode
  // no hay JWT — el gate del layout ya garantiza que solo entran admins).
  const isServerMode =
    (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";
  const isProd = process.env.NODE_ENV === "production";

  if (isServerMode && isProd) {
    const cookieStore = await cookies();
    const token = cookieStore.get("tcga_session")?.value;
    // Sin token o token inválido el layout ya habría redirigido — defensivo.
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      redirect("/login?from=/tpv&reason=tpv");
    }
    if (
      !canAccessTpvStore(
        {
          role: session.role,
          email: session.email,
          tpvStoreSlug: session.tpvStoreSlug,
        },
        storeSlug,
      )
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `[tpv-store-guard] DENY sub=${session.sub} role=${session.role} assigned=${session.tpvStoreSlug ?? "-"} target=${storeSlug}`,
      );
      // Si tiene una tienda asignada, lo mandamos a la suya — UX más amable
      // que un 404. Si no, al selector (que le mostrará "Sin tienda asignada").
      if (
        session.role === "tienda" &&
        session.tpvStoreSlug &&
        session.tpvStoreSlug in TPV_STORES
      ) {
        redirect(`/tpv/${session.tpvStoreSlug}`);
      }
      redirect("/tpv");
    }
  }

  return <TpvClient storeSlug={storeSlug} />;
}
