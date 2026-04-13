import { ADMIN_ORDERS } from "@/data/mockData";
import PedidoDetailClient from "./PedidoDetailClient";

export function generateStaticParams() {
  return ADMIN_ORDERS.map((o) => ({ id: o.id }));
}

export default function PedidoDetailPage() {
  return <PedidoDetailClient />;
}
