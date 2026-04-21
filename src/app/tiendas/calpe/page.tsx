import type { Metadata } from "next";
import { STORES } from "@/data/stores";
import { StorePageContent } from "@/components/tiendas/StorePageContent";
import {
  breadcrumbJsonLd,
  jsonLdProps,
  localBusinessJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "TCG Academy Calpe — Tienda TCG en Alicante",
  description:
    "Visita nuestra tienda flagship en Calpe, Alicante. Más de 10.000 referencias, zona de juego y torneos oficiales.",
  alternates: { canonical: "/tiendas/calpe" },
  openGraph: {
    title: "TCG Academy Calpe — Tienda TCG en Alicante",
    description:
      "Más de 10.000 referencias, zona de juego y torneos oficiales en Calpe.",
    url: "/tiendas/calpe",
    type: "website",
  },
};

export default function CalpePage() {
  const store = STORES.calpe;
  const ld = localBusinessJsonLd(store);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Inicio", url: "/" },
    { name: "Tiendas", url: "/tiendas" },
    { name: store.name, url: `/tiendas/${store.id}` },
  ]);
  return (
    <>
      <script {...jsonLdProps(ld)} />
      <script {...jsonLdProps(breadcrumb)} />
      <StorePageContent store={store} />
    </>
  );
}
