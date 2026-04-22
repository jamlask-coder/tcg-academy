import type { Metadata } from "next";
import { STORES } from "@/data/stores";
import { StorePageContent } from "@/components/tiendas/StorePageContent";
import {
  breadcrumbJsonLd,
  jsonLdProps,
  localBusinessJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "TCG Academy Barcelona — Próximamente",
  description:
    "Estamos preparando nuestra llegada a Barcelona. Pronto anunciaremos dirección, horario y fecha de apertura.",
  alternates: { canonical: "/tiendas/barcelona" },
  openGraph: {
    title: "TCG Academy Barcelona — Próximamente",
    description:
      "Estamos preparando nuestra llegada a Barcelona. Pronto anunciaremos dirección, horario y fecha de apertura.",
    url: "/tiendas/barcelona",
    type: "website",
  },
};

export default function BarcelonaPage() {
  const store = STORES.barcelona;
  const breadcrumb = breadcrumbJsonLd([
    { name: "Inicio", url: "/" },
    { name: "Tiendas", url: "/tiendas" },
    { name: store.name, url: `/tiendas/${store.id}` },
  ]);
  return (
    <>
      {/* Sin LocalBusiness JSON-LD hasta que la tienda exista físicamente —
          no queremos que Google indexe una dirección/teléfono que no existen. */}
      {!store.comingSoon && (
        <script {...jsonLdProps(localBusinessJsonLd(store))} />
      )}
      <script {...jsonLdProps(breadcrumb)} />
      <StorePageContent store={store} />
    </>
  );
}
