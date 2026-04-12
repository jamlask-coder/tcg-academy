import type { Metadata } from "next";
import { STORES } from "@/data/stores";
import { StorePageContent } from "@/components/tiendas/StorePageContent";

export const metadata: Metadata = {
  title: "TCG Academy Barcelona — La tienda TCG de Cataluña",
  description:
    "Visita nuestra tienda en Barcelona. Juego organizado oficial, campeonatos regionales y el mayor stock de Lorcana y Dragon Ball.",
};

export default function BarcelonaPage() {
  return <StorePageContent store={STORES.barcelona} />;
}
