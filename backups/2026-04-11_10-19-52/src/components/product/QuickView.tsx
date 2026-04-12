"use client";
import { useEffect } from "react";
import Link from "next/link";
import { X, ShoppingCart, ExternalLink } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { usePrice } from "@/hooks/usePrice";
import { GAME_CONFIG } from "@/data/products";
import type { LocalProduct } from "@/data/products";
import { isLocalProduct } from "@/lib/productStore";

interface Props {
  product: LocalProduct;
  onClose: () => void;
}

export function QuickView({ product, onClose }: Props) {
  const { addItem } = useCart();
  const { displayPrice } = usePrice(product);
  const config = GAME_CONFIG[product.game];
  const color = config?.color ?? "#2563eb";
  const image = product.images[0];

  const productHref = isLocalProduct(product.id)
    ? `/producto/${product.id}`
    : `/${product.game}/${product.category}/${product.slug}`;

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleAddToCart = () => {
    if (!product.inStock) return;
    addItem(product.id, product.name, displayPrice, image ?? "");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Vista rápida: ${product.name}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Cerrar vista rápida"
          className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col overflow-y-auto sm:flex-row">
          {/* Image */}
          <div
            className="flex h-56 flex-shrink-0 items-center justify-center sm:h-auto sm:w-48"
            style={{
              background: `linear-gradient(135deg, ${color}18, ${color}30)`,
            }}
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={product.name}
                className="h-full w-full object-contain p-4"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 p-6 text-center">
                <span className="text-5xl">{config?.emoji ?? "🃏"}</span>
                <span
                  className="text-xs font-bold leading-tight"
                  style={{ color }}
                >
                  {product.name}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-1 flex-col gap-4 p-5">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color }}
              >
                {config?.name ?? product.game}
              </p>
              <h2 className="mt-1 text-lg font-bold leading-tight text-gray-900">
                {product.name}
              </h2>
            </div>

            {/* Price */}
            <div>
              <span className="text-2xl font-bold" style={{ color }}>
                {displayPrice.toFixed(2)}€
              </span>
              <span className="ml-2 text-xs text-gray-400">IVA incl.</span>
              {product.comparePrice !== undefined &&
                product.comparePrice > displayPrice && (
                  <span className="ml-2 text-sm text-gray-400 line-through">
                    {product.comparePrice.toFixed(2)}€
                  </span>
                )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="line-clamp-3 text-sm text-gray-600">
                {product.description}
              </p>
            )}

            {/* Stock */}
            <div
              className={`flex items-center gap-2 text-sm font-semibold ${
                product.inStock ? "text-green-600" : "text-red-500"
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  product.inStock ? "bg-green-500" : "bg-red-400"
                }`}
              />
              {product.inStock ? "En stock" : "Sin stock"}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl font-bold text-sm transition ${
                  product.inStock
                    ? "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                    : "cursor-not-allowed bg-gray-100 text-gray-400"
                }`}
              >
                <ShoppingCart size={16} />
                {product.inStock ? "Añadir al carrito" : "Sin stock"}
              </button>
              <Link
                href={productHref}
                onClick={onClose}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
              >
                <ExternalLink size={14} />
                Ver producto completo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
