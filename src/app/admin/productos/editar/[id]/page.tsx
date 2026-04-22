import { PRODUCTS } from "@/data/products";
import EditProductClient from "./EditProductClient";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: String(p.id) }));
}

// Este SC sólo valida el formato numérico y delega la carga al CC. El CC usa
// getMergedById, que cubre PRODUCTS + productos creados por admin
// (tcgacademy_new_products) + overrides. Antes leíamos PRODUCTS.find() aquí y
// los productos creados por admin devolvían "no encontrado" aunque existían
// en el store del cliente (incidente 2026-04-22).
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500">ID de producto inválido.</p>
      </div>
    );
  }
  return <EditProductClient productId={numericId} />;
}
