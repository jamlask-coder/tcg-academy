"use client";
import {
  ProductForm,
  type ProductFormValues,
} from "@/components/admin/ProductForm";

export default function NuevoProductoPage() {
  const save = (data: ProductFormValues, tags: string[], images: string[]) => {
    const createdAt = new Date().toISOString().slice(0, 10);
    const product = { ...data, id: Date.now(), tags, images, createdAt };
    const stored = JSON.parse(
      localStorage.getItem("tcgacademy_new_products") ?? "[]",
    );
    localStorage.setItem(
      "tcgacademy_new_products",
      JSON.stringify([...stored, product]),
    );
    window.dispatchEvent(new Event("tcga:products:updated"));
    // Navigation is handled by the ConfirmationModal inside ProductForm
  };

  const saveAndNew = (
    data: ProductFormValues,
    tags: string[],
    images: string[],
  ) => {
    const createdAt = new Date().toISOString().slice(0, 10);
    const product = { ...data, id: Date.now(), tags, images, createdAt };
    const stored = JSON.parse(
      localStorage.getItem("tcgacademy_new_products") ?? "[]",
    );
    localStorage.setItem(
      "tcgacademy_new_products",
      JSON.stringify([...stored, product]),
    );
    window.dispatchEvent(new Event("tcga:products:updated"));
    // Navigation handled by modal "Añadir otro" button
  };

  return (
    <ProductForm
      title="Añadir nuevo producto"
      subtitle="Completa todos los campos obligatorios (*)"
      resetCategoryOnGame
      submitLabel="Guardar producto"
      onSubmit={save}
      onSubmitAndNew={saveAndNew}
    />
  );
}
