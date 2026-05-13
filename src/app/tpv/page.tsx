import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { TPV_STORES, type TpvStoreSlug } from "@/config/tpvStores";
import { verifySessionToken } from "@/lib/auth";
import { getAllowedTpvStores } from "@/lib/tpvAccess";

/**
 * `/tpv` — Selector de tienda.
 *
 * En lugar de cargar el TPV de una tienda por defecto, mostramos una pantalla
 * de elección. Cada operador entra a la tienda donde físicamente está
 * trabajando. Esto evita que alguien venda accidentalmente "desde Madrid"
 * cuando está en Calpe.
 *
 * El gate de acceso global (rol admin|tienda + IP allowlist) lo aplica
 * `layout.tsx`. AQUÍ filtramos POR-TIENDA: un usuario `tienda` solo ve
 * el TPV que tiene asignado. Si solo tiene una opción, le redirigimos
 * directamente para evitar el clic extra.
 */
export default async function TpvSelectorPage() {
  const allStores = Object.values(TPV_STORES);

  // En server mode + production aplicamos filtrado por sesión.
  const isServerMode =
    (process.env.NEXT_PUBLIC_BACKEND_MODE ?? "local") === "server";
  const isProd = process.env.NODE_ENV === "production";

  let allowedSlugs: readonly TpvStoreSlug[] | null = null;

  if (isServerMode && isProd) {
    const cookieStore = await cookies();
    const token = cookieStore.get("tcga_session")?.value;
    if (token) {
      const session = await verifySessionToken(token);
      if (session) {
        allowedSlugs = getAllowedTpvStores({
          role: session.role,
          email: session.email,
          tpvStoreSlug: session.tpvStoreSlug,
        });
      }
    }
  }

  const stores =
    allowedSlugs === null
      ? allStores
      : allStores.filter((s) => allowedSlugs!.includes(s.slug));

  // Si el usuario solo tiene una tienda accesible, saltamos el selector.
  if (allowedSlugs !== null && stores.length === 1) {
    redirect(`/tpv/${stores[0].slug}`);
  }

  // Si no tiene ninguna, mostrar mensaje (no debería ocurrir — el layout
  // ya habría redirigido — pero defensa adicional).
  if (allowedSlugs !== null && stores.length === 0) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900 p-6 text-white">
        <div className="max-w-md rounded-2xl border border-red-700 bg-red-950 p-8 text-center">
          <h1 className="mb-2 text-xl font-black">Sin tienda asignada</h1>
          <p className="text-sm text-slate-300">
            Tu cuenta no tiene una tienda física asociada. Contacta con un
            administrador para que te asigne una.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900 p-6 text-white">
      <div className="w-full max-w-2xl">
        <h1 className="mb-2 text-center text-2xl font-black">Selecciona tienda</h1>
        <p className="mb-8 text-center text-sm text-slate-400">
          Cada tienda lleva su propio histórico de ventas. Calpe y la web
          comparten stock y libro fiscal — el resto van por separado.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stores.map((s) => (
            <Link
              key={s.slug}
              href={`/tpv/${s.slug}`}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-800 p-6 text-center transition hover:border-blue-500 hover:bg-slate-700"
            >
              <span className="text-3xl font-black uppercase tracking-wide">
                {s.invoiceSeriesPrefix}
              </span>
              <span className="mt-2 text-base font-bold">{s.name}</span>
              <span className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
                {s.sharesWebInvoicing ? "Comparte web" : "Independiente"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
