"use client";
import { useRouter } from "next/navigation";
import { type LocalProduct } from "@/data/products";
import {
  ProductForm,
  type ProductFormValues,
} from "@/components/admin/ProductForm";

export default function EditProductClient({
  product,
}: {
  product: LocalProduct;
}) {
  const router = useRouter();

  const handleDelete = () => {
    const deleted = JSON.parse(
      localStorage.getItem("tcgacademy_deleted_products") ?? "[]",
    ) as number[];
    if (!deleted.includes(product.id)) {
      deleted.push(product.id);
    }
    localStorage.setItem(
      "tcgacademy_deleted_products",
      JSON.stringify(deleted),
    );
    router.push("/admin/preciosystock");
  };

  const handleSave = (
    data: ProductFormValues,
    tags: string[],
    images: string[],
  ) => {
    const overrides = JSON.parse(
      localStorage.getItem("tcgacademy_product_overrides") ?? "{}",
    );
    overrides[product.id] = { ...data, tags, images };
    localStorage.setItem(
      "tcgacademy_product_overrides",
      JSON.stringify(overrides),
    );
    setTimeout(() => router.push("/admin/preciosystock"), 1200);
  };

  return (
    <ProductForm
      title="Editar producto"
      subtitle={product.name}
      originalName={product.name}
      defaultValues={{
        name: product.name,
        slug: product.slug,
        description: product.description,
        game: product.game,
        category: product.category,
        language: product.language ?? "",
        price: product.price,
        wholesalePrice: product.wholesalePrice,
        storePrice: product.storePrice,
        costPrice: product.costPrice,
        comparePrice: product.comparePrice ?? 0,
        inStock: product.inStock,
        isNew: product.isNew,
      }}
      initialTags={product.tags ?? []}
      initialImages={product.images}
      submitLabel="Actualizar producto"
      onSubmit={handleSave}
      onDelete={handleDelete}
    />
  );
}
