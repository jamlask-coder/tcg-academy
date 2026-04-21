import type { Metadata } from "next";
import { STORES } from "@/data/stores";
import { StorePageContent } from "@/components/tiendas/StorePageContent";
import {
  breadcrumbJsonLd,
  jsonLdProps,
  localBusinessJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "TCG Academy Barcelona — La tienda TCG de Cataluña",
  description:
    "Visita nuestra tienda en Barcelona. Juego organizado oficial, campeonatos regionales y el mayor stock de Lorcana y Dragon Ball.",
  alternates: { canonical: "/tiendas/barcelona" },
  openGraph: {
    title: "TCG Academy Barcelona — La tienda TCG de Cataluña",
    description:
      "Juego organizado oficial, campeonatos regionales y el mayor stock de Lorcana y Dragon Ball.",
    url: "/tiendas/barcelona",
    type: "website",
  },
};

export default function BarcelonaPage() {
  const store = STORES.barcelona;
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
