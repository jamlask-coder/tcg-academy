"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { type LocalProduct } from "@/data/products";
import {
  ProductForm,
  type ProductFormValues,
} from "@/components/admin/ProductForm";
import { findProductBySlugExcluding, getMergedById } from "@/lib/productStore";
import { persistProductPatch } from "@/lib/productPersist";

export default function EditProductClient({
  productId,
}: {
  productId: number;
}) {
  const router = useRouter();

  // Fix 2026-04-22: antes recibíamos el producto ya resuelto desde un Server
  // Component que hacía PRODUCTS.find(). Eso bloqueaba la edición de productos
  // creados por admin (sólo viven en tcgacademy_new_products). Ahora el CC
  // carga vía getMergedById que cubre PRODUCTS + new_products + overrides.
  // react-hook-form aplica defaultValues UNA sola vez, por eso gate con spinner
  // hasta tener `merged` resuelto.
  const [merged, setMerged] = useState<LocalProduct | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const resolved = getMergedById(productId);
    if (!resolved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación post-SSR obligatoria
      setNotFound(true);
      return;
    }
    setMerged(resolved);
  }, [productId]);

  const handleDelete = () => {
    const deleted = JSON.parse(
      localStorage.getItem("tcgacademy_deleted_products") ?? "[]",
    ) as number[];
    if (!deleted.includes(productId)) {
      deleted.push(productId);
    }
    localStorage.setItem(
      "tcgacademy_deleted_products",
      JSON.stringify(deleted),
    );
    window.dispatchEvent(new Event("tcga:products:updated"));
    router.push("/admin/stock");
  };

  const handleSave = (
    data: ProductFormValues,
    tags: string[],
    images: string[],
  ) => {
    // Bloquea si otro producto ya usa este slug. Excluye el producto actual
    // para permitir guardar sin cambiar el slug.
    const conflict = findProductBySlugExcluding(data.slug, productId);
    if (conflict) {
      alert(
        `Ya existe otro producto con el slug "${data.slug}" (${conflict.name}). Cámbialo antes de guardar.`,
      );
      return;
    }
    // SSOT: delegamos en `persistProductPatch` — distingue admin-created vs
    // estático y escribe en la colección correcta.
    try {
      persistProductPatch(productId, {
        ...data,
        tags,
        images,
      } as Partial<LocalProduct>);
      window.dispatchEvent(new Event("tcga:products:updated"));
    } catch {
      /* empty */
    }
    setTimeout(() => router.push("/admin/stock"), 1200);
  };

  if (notFound) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500">Producto no encontrado.</p>
      </div>
    );
  }

  if (!merged) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <ProductForm
      title="Editar producto"
      subtitle={merged.name}
      originalName={merged.name}
      defaultValues={{
        name: merged.name,
        slug: merged.slug,
        description: merged.description,
        game: merged.game,
        category: merged.category,
        language: merged.language ?? "",
        price: merged.price,
        wholesalePrice: merged.wholesalePrice,
        storePrice: merged.storePrice,
        costPrice: merged.costPrice,
        comparePrice: merged.comparePrice ?? 0,
        inStock: merged.inStock,
        isNew: merged.isNew,
      }}
      initialTags={merged.tags ?? []}
      initialImages={merged.images}
      submitLabel="Actualizar producto"
      onSubmit={handleSave}
      onDelete={handleDelete}
    />
  );
}
