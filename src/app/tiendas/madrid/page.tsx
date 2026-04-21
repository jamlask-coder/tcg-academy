import type { Metadata } from "next";
import { STORES } from "@/data/stores";
import { StorePageContent } from "@/components/tiendas/StorePageContent";
import {
  breadcrumbJsonLd,
  jsonLdProps,
  localBusinessJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "TCG Academy Madrid — Tienda TCG en Gran Vía",
  description:
    "Visita nuestra tienda en el centro de Madrid. La mayor selección de singles de la capital. Torneos Premier cada fin de semana.",
  alternates: { canonical: "/tiendas/madrid" },
  openGraph: {
    title: "TCG Academy Madrid — Tienda TCG en Gran Vía",
    description:
      "La mayor selección de singles de la capital. Torneos Premier cada fin de semana.",
    url: "/tiendas/madrid",
    type: "website",
  },
};

export default function MadridPage() {
  const store = STORES.madrid;
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
