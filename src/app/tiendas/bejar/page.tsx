import type { Metadata } from "next";
import { STORES } from "@/data/stores";
import { StorePageContent } from "@/components/tiendas/StorePageContent";
import {
  breadcrumbJsonLd,
  jsonLdProps,
  localBusinessJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "TCG Academy Béjar — Tienda TCG en Salamanca",
  description:
    "Visita nuestra tienda en Béjar, Salamanca. Especializada en Magic y Pokémon competitivo con juego organizado semanal.",
  alternates: { canonical: "/tiendas/bejar" },
  openGraph: {
    title: "TCG Academy Béjar — Tienda TCG en Salamanca",
    description:
      "Especializada en Magic y Pokémon competitivo con juego organizado semanal.",
    url: "/tiendas/bejar",
    type: "website",
  },
};

export default function BejarPage() {
  const store = STORES.bejar;
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
