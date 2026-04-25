"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ProductForm,
  type ProductFormValues,
} from "@/components/admin/ProductForm";
import {
  generateLocalProductId,
  findProductBySlugExcluding,
  getMergedById,
} from "@/lib/productStore";
import type { LocalProduct } from "@/data/products";
import {
  derivePackDefaults,
  deriveBoxDefaults,
  deriveLangDefaults,
  closeParentLink,
  type DerivationMode,
} from "@/lib/productDerivation";
import { persistNewProduct } from "@/lib/productPersist";

function NuevoProductoInner() {
  const router = useRouter();
  const params = useSearchParams();

  const derivedFrom = params.get("derivedFrom");
  const mode = params.get("mode") as DerivationMode | null;
  const lang = params.get("lang") ?? "";

  // Parent vive en localStorage (client-side). Flag de hidratación para
  // evitar hydration mismatch — resolvemos el parent con useMemo una vez
  // que sabemos que `window` está disponible.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación cliente (localStorage no disponible en SSR)
    setHydrated(true);
  }, []);

  const parent: LocalProduct | null | undefined = useMemo(() => {
    if (!derivedFrom) return null;
    if (!hydrated) return undefined;
    const id = Number(derivedFrom);
    if (!Number.isFinite(id)) return null;
    return getMergedById(id) ?? null;
  }, [derivedFrom, hydrated]);

  const derived = useMemo(() => {
    if (!parent || !mode) return null;
    if (mode === "pack") return derivePackDefaults(parent);
    if (mode === "box") return deriveBoxDefaults(parent);
    if (mode === "lang" && lang) return deriveLangDefaults(parent, lang);
    return null;
  }, [parent, mode, lang]);

  const buildProduct = (
    data: ProductFormValues,
    tags: string[],
    images: string[],
  ) => {
    const conflict = findProductBySlugExcluding(data.slug);
    if (conflict) {
      alert(
        `Ya existe un producto con el slug "${data.slug}" (${conflict.name}). Cámbialo antes de guardar.`,
      );
      return null;
    }
    const base = {
      ...data,
      id: generateLocalProductId(),
      tags,
      images,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    // Inyecta FKs de vinculación cuando derivamos desde otro producto.
    if (derived && parent && mode && mode !== "lang") {
      if (mode === "pack") {
        return { ...base, linkedBoxId: parent.id };
      }
      if (mode === "box") {
        return { ...base, linkedPackId: parent.id, packsPerBox: derived.extra.packsPerBox };
      }
    }
    return base;
  };

  const persist = (product: ReturnType<typeof buildProduct>) => {
    if (!product) return false;
    persistNewProduct(product as LocalProduct);
    // Cierra la vinculación bidireccional actualizando el override del padre.
    if (parent && mode) {
      closeParentLink(parent.id, mode, product.id, derived?.extra.packsPerBox);
    }
    return true;
  };

  const handleSave = (
    data: ProductFormValues,
    tags: string[],
    images: string[],
  ) => {
    const product = buildProduct(data, tags, images);
    if (persist(product)) router.push("/admin/stock");
  };

  const handleSaveAndNew = (
    data: ProductFormValues,
    tags: string[],
    images: string[],
  ) => {
    const product = buildProduct(data, tags, images);
    if (persist(product)) window.location.reload();
  };

  // Esperando a resolver parent
  if (derivedFrom && parent === undefined) {
    return (
      <div className="p-8 text-sm text-gray-500">Cargando producto origen…</div>
    );
  }
  if (derivedFrom && parent === null) {
    return (
      <div className="p-8 text-sm text-red-600">
        No se encontró el producto origen (id={derivedFrom}). Vuelve atrás e
        inténtalo de nuevo.
      </div>
    );
  }

  const title = derived
    ? mode === "pack"
      ? `Nuevo sobre derivado de "${parent?.name}"`
      : mode === "box"
        ? `Nueva caja desde sobre "${parent?.name}"`
        : `Duplicar "${parent?.name}" en ${lang.toUpperCase()}`
    : "Añadir nuevo producto";
  const subtitle = derived
    ? "Revisa los datos sugeridos y ajusta lo que haga falta. La vinculación con el producto origen se establecerá al guardar."
    : "Completa todos los campos obligatorios (*)";

  return (
    <ProductForm
      title={title}
      subtitle={subtitle}
      defaultValues={derived?.values}
      initialTags={derived?.tags ?? []}
      initialImages={derived?.images ?? []}
      resetCategoryOnGame={!derived}
      // En modo "lang" el nombre se hereda del origen — pasamos originalName
      // para que ProductForm NO sobrescriba el slug derivado (`-es`, `-en`…).
      originalName={mode === "lang" ? (parent?.name ?? undefined) : undefined}
      submitLabel="Guardar producto"
      onSubmit={handleSave}
      onSubmitAndNew={handleSaveAndNew}
    />
  );
}

export default function NuevoProductoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Cargando…</div>}>
      <NuevoProductoInner />
    </Suspense>
  );
}
