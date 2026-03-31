import { PRODUCTS } from "@/data/products";
import EditProductClient from "./EditProductClient";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: String(p.id) }));
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = PRODUCTS.find((p) => p.id === Number(id));
  if (!product)
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Producto no encontrado.</p>
      </div>
    );
  return <EditProductClient product={product} />;
}
