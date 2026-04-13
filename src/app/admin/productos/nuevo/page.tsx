"use client";
import { useRouter } from "next/navigation";
import {
  ProductForm,
  type ProductFormValues,
} from "@/components/admin/ProductForm";

export default function NuevoProductoPage() {
  const router = useRouter();

  const handleSave = (
    data: ProductFormValues,
    tags: string[],
    images: string[],
  ) => {
    const product = { ...data, id: Date.now(), tags, images, createdAt: new Date().toISOString().slice(0, 10) };
    const stored = JSON.parse(
      localStorage.getItem("tcgacademy_new_products") ?? "[]",
    );
    localStorage.setItem(
      "tcgacademy_new_products",
      JSON.stringify([...stored, product]),
    );
    window.dispatchEvent(new Event("tcga:products:updated"));
    router.push("/admin/preciosystock");
  };

  const handleSaveAndNew = (
    data: ProductFormValues,
    tags: string[],
    images: string[],
  ) => {
    const product = { ...data, id: Date.now(), tags, images, createdAt: new Date().toISOString().slice(0, 10) };
    const stored = JSON.parse(
      localStorage.getItem("tcgacademy_new_products") ?? "[]",
    );
    localStorage.setItem(
      "tcgacademy_new_products",
      JSON.stringify([...stored, product]),
    );
    window.dispatchEvent(new Event("tcga:products:updated"));
    window.location.reload();
  };

  return (
    <ProductForm
      title="Añadir nuevo producto"
      subtitle="Completa todos los campos obligatorios (*)"
      resetCategoryOnGame
      submitLabel="Guardar producto"
      onSubmit={handleSave}
      onSubmitAndNew={handleSaveAndNew}
    />
  );
}
