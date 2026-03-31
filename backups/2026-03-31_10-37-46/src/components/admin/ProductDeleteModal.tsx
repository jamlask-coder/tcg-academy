"use client";
import { X } from "lucide-react";
import { type LocalProduct } from "@/data/products";

interface ProductDeleteModalProps {
  product: LocalProduct;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ProductDeleteModal({
  product,
  onConfirm,
  onCancel,
}: ProductDeleteModalProps) {
  const img = product.images?.[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">
            ¿Eliminar producto?
          </h2>
          <button
            onClick={onCancel}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Product preview */}
        <div className="mb-5 flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          {img ? (
            <img
              src={img}
              alt={product.name}
              className="h-14 w-14 rounded-lg bg-white object-contain"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white text-2xl">
              📦
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-snug text-gray-900">
              {product.name}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {product.price.toFixed(2)} €
            </p>
          </div>
        </div>

        <p className="mb-6 text-sm text-gray-600">
          Esta acción no se puede deshacer. El producto desaparecerá del
          catálogo inmediatamente.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-600"
          >
            Eliminar definitivamente
          </button>
        </div>
      </div>
    </div>
  );
}
