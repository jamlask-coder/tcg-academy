import Link from "next/link";
import { TPV_STORES } from "@/config/tpvStores";

/**
 * `/tpv` — Selector de tienda.
 *
 * En lugar de cargar el TPV de una tienda por defecto, mostramos una pantalla
 * de elección. Cada operador entra a la tienda donde físicamente está
 * trabajando. Esto evita que alguien venda accidentalmente "desde Madrid"
 * cuando está en Calpe.
 *
 * El gate de admin lo aplica `layout.tsx`.
 */
export default function TpvSelectorPage() {
  const stores = Object.values(TPV_STORES);
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
