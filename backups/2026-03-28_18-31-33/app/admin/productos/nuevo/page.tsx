"use client"
import { useRouter } from "next/navigation"
import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm"

export default function NuevoProductoPage() {
  const router = useRouter()

  const handleSave = (data: ProductFormValues, tags: string[], images: string[]) => {
    const product = { ...data, id: Date.now(), tags, images }
    const stored = JSON.parse(localStorage.getItem("tcgacademy_new_products") ?? "[]")
    localStorage.setItem("tcgacademy_new_products", JSON.stringify([...stored, product]))
    router.push("/admin/productos")
  }

  const handleSaveAndNew = (data: ProductFormValues, tags: string[], images: string[]) => {
    const product = { ...data, id: Date.now(), tags, images }
    const stored = JSON.parse(localStorage.getItem("tcgacademy_new_products") ?? "[]")
    localStorage.setItem("tcgacademy_new_products", JSON.stringify([...stored, product]))
    window.location.reload()
  }

  return (
    <ProductForm
      title="Añadir nuevo producto"
      subtitle="Completa todos los campos obligatorios (*)"
      resetCategoryOnGame
      showImageUpload
      submitLabel="Guardar producto"
      onSubmit={handleSave}
      onSubmitAndNew={handleSaveAndNew}
    />
  )
}
