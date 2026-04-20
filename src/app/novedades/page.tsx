"use client";
import { useMemo, useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import type { LocalProduct } from "@/data/products";
import { LocalProductCard } from "@/components/product/LocalProductCard";
import { getMergedProducts } from "@/lib/productStore";

const PAGE_SIZE = 24;

function byDateDesc(a: LocalProduct, b: LocalProduct): number {
  const getTime = (p: LocalProduct) =>
    p.createdAt
      ? new Date(p.createdAt).getTime()
      : p.id > 1_700_000_000_000
        ? p.id
        : 0;
  return getTime(b) - getTime(a);
}

export default function NovedadesPage() {
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<LocalProduct[]>([]);

  useEffect(() => {
    const all = getMergedProducts();
    setProducts([...all].sort(byDateDesc));
  }, []);

  // Filter to products from last 60 days
  // eslint-disable-next-line react-hooks/purity
  const cutoff = useMemo(() => Date.now() - 60 * 24 * 60 * 60 * 1000, []);
  const novedades = useMemo(() => {
    return products.filter((p) => {
      if (!p.createdAt) return false;
      return new Date(p.createdAt).getTime() >= cutoff;
    });
  }, [products, cutoff]);

  const visible = novedades.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < novedades.length;

  return (
    <div className="bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 py-8 text-center text-white">
        <div className="mx-auto max-w-[1400px] px-4">
          <div className="flex items-center justify-center gap-3">
            <Sparkles size={28} />
            <h1 className="text-3xl font-black tracking-tight">Novedades</h1>
            <Sparkles size={28} />
          </div>
          <p className="mt-2 text-sm font-medium text-white/80">
            Los últimos productos añadidos a nuestra tienda
          </p>
        </div>
      </div>

      {/* Products */}
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        {novedades.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-24 text-center">
            <Sparkles size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="font-medium text-gray-400">
              No hay novedades recientes
            </p>
            <p className="mt-1 text-sm text-gray-300">
              Vuelve pronto para ver los nuevos productos
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-500">
              {novedades.length} producto{novedades.length !== 1 ? "s" : ""} añadido{novedades.length !== 1 ? "s" : ""} en los últimos 60 días
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visible.map((p) => (
                <LocalProductCard key={p.id} product={p} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setPage((prev) => prev + 1)}
                  className="rounded-xl border-2 border-amber-400 px-10 py-3 font-bold text-amber-600 transition hover:bg-amber-400 hover:text-white"
                >
                  Ver más novedades
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
