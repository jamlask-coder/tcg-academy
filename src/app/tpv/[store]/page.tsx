import { notFound } from "next/navigation";
import { TPV_STORES, type TpvStoreSlug } from "@/config/tpvStores";
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
 * El gate de admin se aplica en `../layout.tsx`. Aquí solo resolvemos slug
 * → storeSlug y montamos el cliente.
 */
export default async function TpvStorePage({ params }: Props) {
  const { store } = await params;
  if (!(store in TPV_STORES)) {
    notFound();
  }
  return <TpvClient storeSlug={store as TpvStoreSlug} />;
}
