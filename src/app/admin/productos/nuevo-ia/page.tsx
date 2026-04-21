"use client";
// /admin/productos/nuevo-ia — Nuevo flujo: subo imágenes, la IA rellena el form,
// yo sólo valido.
//
// El guardado sigue exactamente las mismas reglas que /admin/productos/nuevo
// (localStorage → tcgacademy_new_products + evento tcga:products:updated),
// para que el producto salga idéntico al del flujo manual en /admin/stock.

import { useRouter } from "next/navigation";
import { SmartProductCreator } from "@/components/admin/SmartProductCreator";
import type { ProductFormValues } from "@/components/admin/ProductForm";
import { logger } from "@/lib/logger";

const STORAGE_KEY = "tcgacademy_new_products";

function persist(
  data: ProductFormValues,
  tags: string[],
  images: string[],
): void {
  const product = {
    ...data,
    id: Date.now(),
    tags,
    images,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...stored, product]));
    window.dispatchEvent(new Event("tcga:products:updated"));
  } catch (e) {
    logger.error("no se pudo guardar el producto", "nuevo-ia", { err: String(e) });
  }
}

export default function NuevoProductoIAPage() {
  const router = useRouter();

  const handleSave = (
    data: ProductFormValues,
    tags: string[],
    images: string[],
  ) => {
    persist(data, tags, images);
    router.push("/admin/stock");
  };

  const handleSaveAndNew = (
    data: ProductFormValues,
    tags: string[],
    images: string[],
  ) => {
    persist(data, tags, images);
    window.location.reload();
  };

  return (
    <SmartProductCreator
      onSubmit={handleSave}
      onSubmitAndNew={handleSaveAndNew}
    />
  );
}
