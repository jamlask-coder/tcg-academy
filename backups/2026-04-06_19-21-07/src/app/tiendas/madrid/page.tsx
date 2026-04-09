import type { Metadata } from "next";
import { STORES } from "@/data/stores";
import { StorePageContent } from "@/components/tiendas/StorePageContent";

export const metadata: Metadata = {
  title: "TCG Academy Madrid — Tienda TCG en Gran Vía",
  description:
    "Visita nuestra tienda en el centro de Madrid. La mayor selección de singles de la capital. Torneos Premier cada fin de semana.",
};

export default function MadridPage() {
  return <StorePageContent store={STORES.madrid} />;
}
