"use client";
// Legacy redirect: `/producto?id=NNNN` era la URL fallback con ID numérico
// (pre-migración a slugs). Se mantiene SOLO para redirigir URLs cacheadas
// externamente (Google, marcadores, emails antiguos). Si encuentra el producto
// por id, hace redirect 301-like a la URL canónica (`/producto/{slug}` o
// `/game/cat/slug`). Si no, redirige al catálogo.
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getMergedById, getProductUrl } from "@/lib/productStore";

export function ProductoDetail() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const idStr = params.get("id");
    if (!idStr) {
      router.replace("/catalogo");
      return;
    }
    const id = Number(idStr);
    if (isNaN(id)) {
      router.replace("/catalogo");
      return;
    }
    const found = getMergedById(id);
    if (found) {
      router.replace(getProductUrl(found));
      return;
    }
    // Reintento por si localStorage todavía no está listo
    const t = setTimeout(() => {
      const retry = getMergedById(id);
      router.replace(retry ? getProductUrl(retry) : "/catalogo");
    }, 150);
    return () => clearTimeout(t);
  }, [params, router]);

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}
